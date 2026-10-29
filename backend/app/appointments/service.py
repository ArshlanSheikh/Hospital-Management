from datetime import datetime, date, timezone
from bson import ObjectId
from app.extensions import get_db
from app.doctors.repository import DoctorRepository
from app.doctors.service import time_to_minutes, minutes_to_time
from app.appointments.repository import AppointmentRepository
from app.common.constants import (
    DoctorVerificationStatus,
    AppointmentStatus,
    ConsultationType,
    UserRole
)
from app.common.errors import (
    NotFoundError,
    ValidationError,
    ConflictError,
    ForbiddenError
)


class AppointmentService:
    @staticmethod
    def book_appointment(patient_user_id: str, data: dict) -> dict:
        doctor_id = data["doctor_id"]
        date_str = data["appointment_date"]
        start_time_str = data["start_time"]

        # 1. Validate date
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            raise ValidationError("Invalid appointment date format. Expected YYYY-MM-DD.")

        today = date.today()
        if target_date < today:
            raise ValidationError("Appointments cannot be booked for past dates.")

        # 2. Check doctor existence and verification
        doctor = DoctorRepository.get_by_id(doctor_id)
        if not doctor:
            raise NotFoundError("Doctor profile not found")

        if doctor.get("verification_status") != DoctorVerificationStatus.VERIFIED.value:
            raise ForbiddenError("This doctor is not currently verified to accept bookings.")

        # 3. Check schedule settings
        settings = doctor.get("availability_settings") or {}
        active_days = settings.get("days_of_week", [1, 2, 3, 4, 5])
        if target_date.isoweekday() not in active_days:
            raise ValidationError("Doctor does not consult on the selected day of the week.")

        if date_str in settings.get("unavailable_dates", []):
            raise ValidationError("Doctor has marked this specific date as unavailable.")

        slot_duration = settings.get("slot_duration_minutes", 30)
        start_min = time_to_minutes(start_time_str)
        end_min = start_min + slot_duration
        end_time_str = minutes_to_time(end_min)

        doc_start_min = time_to_minutes(settings.get("start_time", "09:00"))
        doc_end_min = time_to_minutes(settings.get("end_time", "17:00"))

        if start_min < doc_start_min or end_min > doc_end_min:
            raise ValidationError("Selected slot is outside the doctor's consultation hours.")

        # Check break time
        if settings.get("break_start_time") and settings.get("break_end_time"):
            b_start = time_to_minutes(settings["break_start_time"])
            b_end = time_to_minutes(settings["break_end_time"])
            if not (end_min <= b_start or start_min >= b_end):
                raise ValidationError("Selected slot falls during doctor's break period.")

        # Check if booking for today and time already passed
        if target_date == today:
            now_dt = datetime.now()
            slot_h, slot_m = map(int, start_time_str.split(":"))
            if now_dt.hour > slot_h or (now_dt.hour == slot_h and now_dt.minute >= slot_m):
                raise ValidationError("Cannot book a time slot that has already passed today.")

        # 4. Check for existing active booking directly in database
        db = get_db()
        existing = db.appointments.find_one({
            "doctor_id": ObjectId(doctor_id),
            "appointment_date": date_str,
            "start_time": start_time_str,
            "appointment_status": {"$in": [AppointmentStatus.PENDING.value, AppointmentStatus.CONFIRMED.value]}
        })
        if existing:
            raise ConflictError("This time slot has already been booked. Please choose another time slot.")

        # 5. Atomic insert with partial unique index protection
        now = datetime.now(timezone.utc)
        appointment_doc = {
            "patient_id": ObjectId(patient_user_id),
            "doctor_id": ObjectId(doctor_id),
            "appointment_date": date_str,
            "start_time": start_time_str,
            "end_time": end_time_str,
            "duration_minutes": slot_duration,
            "consultation_type": data.get("consultation_type", ConsultationType.IN_PERSON.value),
            "appointment_status": AppointmentStatus.CONFIRMED.value,  # Confirmed on booking in V1
            "consultation_fee": float(doctor.get("consultation_fee", 500.0)),
            "reason": data.get("reason", ""),
            "created_at": now,
            "updated_at": now,
        }

        created = AppointmentRepository.insert(appointment_doc)

        # Trigger in-app notifications
        try:
            from app.notifications.service import NotificationService
            doctor_user_id = str(doctor.get("user_id"))
            NotificationService.notify_appointment_booked(
                doctor_user_id=doctor_user_id,
                patient_user_id=patient_user_id,
                appointment=created
            )
        except Exception:
            pass

        return created

    @staticmethod
    def cancel_appointment(appointment_id: str, user: dict, reason: str = "Cancelled by user") -> dict:
        appointment = AppointmentRepository.get_by_id(appointment_id)
        if not appointment:
            raise NotFoundError("Appointment not found")

        user_role = UserRole.normalize(user.get("role"))
        user_id = str(user["_id"])

        # Check authorization
        if user_role == UserRole.PATIENT.value:
            if appointment.get("patient_id") != user_id:
                raise ForbiddenError("You cannot cancel an appointment that belongs to another patient.")
        elif user_role == UserRole.DOCTOR.value:
            doctor_profile = DoctorRepository.get_by_user_id(user_id)
            if not doctor_profile or appointment.get("doctor_id") != doctor_profile.get("id"):
                raise ForbiddenError("You cannot cancel an appointment that belongs to another doctor.")
        elif user_role != UserRole.ADMIN.value:
            raise ForbiddenError("You do not have permission to cancel appointments.")

        # Status validation
        current_status = appointment.get("appointment_status")
        if current_status in [AppointmentStatus.CANCELLED.value, AppointmentStatus.COMPLETED.value, AppointmentStatus.REJECTED.value]:
            raise ValidationError(f"Cannot cancel an appointment that is already {current_status}.")

        updated = AppointmentRepository.update_status(
            appointment_id,
            AppointmentStatus.CANCELLED.value,
            extra_fields={"cancellation_reason": reason, "cancelled_by": user_role}
        )

        try:
            from app.notifications.service import NotificationService
            doc = DoctorRepository.get_by_id(appointment["doctor_id"])
            if doc:
                NotificationService.notify_appointment_cancelled(
                    doctor_user_id=str(doc.get("user_id")),
                    patient_user_id=str(appointment["patient_id"]),
                    appointment=appointment,
                    cancelled_by=user_role,
                    reason=reason
                )
        except Exception:
            pass

        return updated

    @staticmethod
    def reschedule_appointment(appointment_id: str, user: dict, new_date_str: str, new_start_time_str: str) -> dict:
        appointment = AppointmentRepository.get_by_id(appointment_id)
        if not appointment:
            raise NotFoundError("Appointment not found")

        user_role = UserRole.normalize(user.get("role"))
        user_id = str(user["_id"])

        # Check authorization
        if user_role == UserRole.PATIENT.value and appointment.get("patient_id") != user_id:
            raise ForbiddenError("You cannot reschedule an appointment that belongs to another patient.")
        elif user_role == UserRole.DOCTOR.value:
            doctor_profile = DoctorRepository.get_by_user_id(user_id)
            if not doctor_profile or appointment.get("doctor_id") != doctor_profile.get("id"):
                raise ForbiddenError("You cannot reschedule an appointment that belongs to another doctor.")
        elif user_role not in [UserRole.PATIENT.value, UserRole.DOCTOR.value, UserRole.ADMIN.value]:
            raise ForbiddenError("Permission denied.")

        current_status = appointment.get("appointment_status")
        if current_status in [AppointmentStatus.CANCELLED.value, AppointmentStatus.COMPLETED.value, AppointmentStatus.REJECTED.value]:
            raise ValidationError(f"Cannot reschedule an appointment that is already {current_status}.")

        # Validate new date
        try:
            target_date = datetime.strptime(new_date_str, "%Y-%m-%d").date()
        except ValueError:
            raise ValidationError("Invalid appointment date format. Expected YYYY-MM-DD.")

        today = date.today()
        if target_date < today:
            raise ValidationError("Appointments cannot be rescheduled to past dates.")

        doctor_id = appointment["doctor_id"]
        doctor = DoctorRepository.get_by_id(doctor_id)
        if not doctor:
            raise NotFoundError("Doctor profile not found")

        settings = doctor.get("availability_settings") or {}
        active_days = settings.get("days_of_week", [1, 2, 3, 4, 5])
        if target_date.isoweekday() not in active_days:
            raise ValidationError("Doctor does not consult on the selected day of the week.")

        if new_date_str in settings.get("unavailable_dates", []):
            raise ValidationError("Doctor has marked this specific date as unavailable.")

        slot_duration = settings.get("slot_duration_minutes", 30)
        start_min = time_to_minutes(new_start_time_str)
        end_min = start_min + slot_duration
        new_end_time_str = minutes_to_time(end_min)

        doc_start_min = time_to_minutes(settings.get("start_time", "09:00"))
        doc_end_min = time_to_minutes(settings.get("end_time", "17:00"))

        if start_min < doc_start_min or end_min > doc_end_min:
            raise ValidationError("Selected slot is outside doctor's consultation hours.")

        if settings.get("break_start_time") and settings.get("break_end_time"):
            b_start = time_to_minutes(settings["break_start_time"])
            b_end = time_to_minutes(settings["break_end_time"])
            if not (end_min <= b_start or start_min >= b_end):
                raise ValidationError("Selected slot falls during doctor's break period.")

        if target_date == today:
            now_dt = datetime.now()
            slot_h, slot_m = map(int, new_start_time_str.split(":"))
            if now_dt.hour > slot_h or (now_dt.hour == slot_h and now_dt.minute >= slot_m):
                raise ValidationError("Cannot book a time slot that has already passed today.")

        # Check collision with other active appointments
        db = get_db()
        existing = db.appointments.find_one({
            "_id": {"$ne": ObjectId(appointment_id) if ObjectId.is_valid(appointment_id) else appointment_id},
            "doctor_id": ObjectId(doctor_id) if ObjectId.is_valid(doctor_id) else doctor_id,
            "appointment_date": new_date_str,
            "start_time": new_start_time_str,
            "appointment_status": {"$in": [AppointmentStatus.PENDING.value, AppointmentStatus.CONFIRMED.value]}
        })
        if existing:
            raise ConflictError("This time slot has already been booked. Please choose another time slot.")

        old_date = appointment.get("appointment_date")
        old_time = appointment.get("start_time")

        now = datetime.now(timezone.utc)
        updated_doc = db.appointments.find_one_and_update(
            {"_id": ObjectId(appointment_id) if ObjectId.is_valid(appointment_id) else appointment_id},
            {
                "$set": {
                    "appointment_date": new_date_str,
                    "start_time": new_start_time_str,
                    "end_time": new_end_time_str,
                    "updated_at": now
                },
                "$inc": {"reschedule_count": 1}
            },
            return_document=True
        )

        serialized = AppointmentRepository._serialize(updated_doc)

        try:
            from app.notifications.service import NotificationService
            NotificationService.notify_appointment_rescheduled(
                doctor_user_id=str(doctor.get("user_id")),
                patient_user_id=str(appointment["patient_id"]),
                appointment=serialized,
                old_date=old_date,
                old_time=old_time
            )
        except Exception:
            pass

        return serialized

    @staticmethod
    def update_status(appointment_id: str, doctor_user: dict, new_status: str) -> dict:
        appointment = AppointmentRepository.get_by_id(appointment_id)
        if not appointment:
            raise NotFoundError("Appointment not found")

        user_role = UserRole.normalize(doctor_user.get("role"))
        if user_role == UserRole.DOCTOR.value:
            doctor_profile = DoctorRepository.get_by_user_id(str(doctor_user["_id"]))
            if not doctor_profile or appointment.get("doctor_id") != doctor_profile.get("id"):
                raise ForbiddenError("You cannot modify an appointment belonging to another doctor.")
        elif user_role != UserRole.ADMIN.value:
            raise ForbiddenError("Permission denied.")

        updated = AppointmentRepository.update_status(appointment_id, new_status)
        return updated

    @staticmethod
    def get_appointment(appointment_id: str, user: dict) -> dict:
        appointment = AppointmentRepository.get_by_id(appointment_id)
        if not appointment:
            raise NotFoundError("Appointment not found")

        user_role = UserRole.normalize(user.get("role"))
        user_id = str(user["_id"])

        if user_role == UserRole.PATIENT.value:
            if appointment.get("patient_id") != user_id:
                raise ForbiddenError("Access forbidden: Appointment belongs to another patient.")
        elif user_role == UserRole.DOCTOR.value:
            doctor_profile = DoctorRepository.get_by_user_id(user_id)
            if not doctor_profile or appointment.get("doctor_id") != doctor_profile.get("id"):
                raise ForbiddenError("Access forbidden: Appointment belongs to another doctor.")

        return appointment

    @staticmethod
    def list_patient_appointments(patient_user_id: str, status: str = None, page: int = 1, limit: int = 10) -> dict:
        items, total = AppointmentRepository.find_by_patient(patient_user_id, status=status, page=page, limit=limit)
        pages = (total + limit - 1) // limit if total > 0 else 1
        return {
            "appointments": items,
            "total": total,
            "page": page,
            "pages": pages,
            "limit": limit
        }

    @staticmethod
    def list_doctor_appointments(doctor_user_id: str, status: str = None, date_str: str = None, page: int = 1, limit: int = 10) -> dict:
        doctor_profile = DoctorRepository.get_by_user_id(doctor_user_id)
        if not doctor_profile:
            raise NotFoundError("Doctor profile not found")

        items, total = AppointmentRepository.find_by_doctor(
            doctor_profile["id"], status=status, date_str=date_str, page=page, limit=limit
        )
        pages = (total + limit - 1) // limit if total > 0 else 1
        return {
            "appointments": items,
            "total": total,
            "page": page,
            "pages": pages,
            "limit": limit
        }
