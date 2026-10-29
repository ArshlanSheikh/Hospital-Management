from datetime import datetime, date, timedelta, timezone
from bson import ObjectId
from app.extensions import get_db
from app.doctors.repository import DoctorRepository
from app.common.errors import NotFoundError, ValidationError, ForbiddenError
from app.common.constants import DoctorVerificationStatus, AppointmentStatus


def time_to_minutes(time_str: str) -> int:
    hours, minutes = map(int, time_str.split(":"))
    return hours * 60 + minutes


def minutes_to_time(minutes: int) -> str:
    hours = (minutes // 60) % 24
    mins = minutes % 60
    return f"{hours:02d}:{mins:02d}"


class DoctorService:
    @staticmethod
    def list_doctors(query_params: dict) -> dict:
        items, total = DoctorRepository.find_verified(query_params)
        limit = min(100, max(1, int(query_params.get("limit", 10))))
        page = max(1, int(query_params.get("page", 1)))
        pages = (total + limit - 1) // limit if total > 0 else 1
        return {
            "doctors": items,
            "total": total,
            "page": page,
            "pages": pages,
            "limit": limit
        }

    @staticmethod
    def get_doctor(doctor_id: str) -> dict:
        doc = DoctorRepository.get_by_id(doctor_id)
        if not doc:
            raise NotFoundError("Doctor profile not found")
        return doc

    @staticmethod
    def update_profile(user_id: str, data: dict) -> dict:
        db = get_db()
        updates = {}

        if "full_name" in data:
            updates["full_name"] = data["full_name"].strip()
            db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"name": data["full_name"].strip()}})
        if "specialization" in data:
            updates["specialization"] = data["specialization"].strip()
        if "qualifications" in data:
            q = data["qualifications"]
            if isinstance(q, str):
                q = [item.strip() for item in q.split(",") if item.strip()]
            updates["qualifications"] = q
        if "experience_years" in data:
            updates["experience_years"] = int(data["experience_years"])
        if "consultation_fee" in data:
            updates["consultation_fee"] = float(data["consultation_fee"])
        if "bio" in data:
            updates["bio"] = data["bio"]
        if "phone" in data:
            updates["phone"] = data["phone"]
            db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"phone": data["phone"]}})
        if "profile_image" in data:
            updates["profile_image"] = data["profile_image"]

        updates["updated_at"] = datetime.now(timezone.utc)
        result = DoctorRepository.update_by_user_id(user_id, updates)
        if not result:
            raise NotFoundError("Doctor profile not found")
        return result

    @staticmethod
    def update_availability(user_id: str, data: dict) -> dict:
        db = get_db()
        start_min = time_to_minutes(data["start_time"])
        end_min = time_to_minutes(data["end_time"])

        if start_min >= end_min:
            raise ValidationError("Availability start time must be before end time")

        if data.get("break_start_time") and data.get("break_end_time"):
            b_start = time_to_minutes(data["break_start_time"])
            b_end = time_to_minutes(data["break_end_time"])
            if b_start >= b_end:
                raise ValidationError("Break start time must be before break end time")
            if b_start < start_min or b_end > end_min:
                raise ValidationError("Break time must be within working hours")

        settings = {
            "days_of_week": data["days_of_week"],
            "start_time": data["start_time"],
            "end_time": data["end_time"],
            "slot_duration_minutes": int(data.get("slot_duration_minutes", 30)),
            "break_start_time": data.get("break_start_time"),
            "break_end_time": data.get("break_end_time"),
            "unavailable_dates": data.get("unavailable_dates", []),
        }

        updates = {
            "availability_settings": settings,
            "updated_at": datetime.now(timezone.utc),
        }

        result = DoctorRepository.update_by_user_id(user_id, updates)
        if not result:
            raise NotFoundError("Doctor profile not found")
        return result

    @staticmethod
    def get_available_slots(doctor_id: str, date_str: str) -> list:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            raise ValidationError("Invalid date format. Expected YYYY-MM-DD.")

        today = date.today()
        if target_date < today:
            return []

        doctor = DoctorRepository.get_by_id(doctor_id)
        if not doctor:
            raise NotFoundError("Doctor profile not found")

        if doctor.get("verification_status") != DoctorVerificationStatus.VERIFIED.value:
            raise ForbiddenError("This doctor is not currently verified to accept bookings")

        settings = doctor.get("availability_settings") or {
            "days_of_week": [1, 2, 3, 4, 5],
            "start_time": "09:00",
            "end_time": "17:00",
            "slot_duration_minutes": 30,
            "break_start_time": "13:00",
            "break_end_time": "14:00",
            "unavailable_dates": [],
        }

        # Check weekday availability (Monday=1, Sunday=7)
        if target_date.isoweekday() not in settings.get("days_of_week", []):
            return []

        # Check unavailable exception dates
        if date_str in settings.get("unavailable_dates", []):
            return []

        slot_duration = settings.get("slot_duration_minutes", 30)
        start_min = time_to_minutes(settings.get("start_time", "09:00"))
        end_min = time_to_minutes(settings.get("end_time", "17:00"))

        break_start = time_to_minutes(settings["break_start_time"]) if settings.get("break_start_time") else None
        break_end = time_to_minutes(settings["break_end_time"]) if settings.get("break_end_time") else None

        # Fetch all active booked appointments for this doctor on this date
        db = get_db()
        booked_cursor = db.appointments.find({
            "doctor_id": ObjectId(doctor_id),
            "appointment_date": date_str,
            "appointment_status": {"$in": [AppointmentStatus.PENDING.value, AppointmentStatus.CONFIRMED.value]}
        })
        booked_start_times = {a.get("start_time") for a in booked_cursor}

        slots = []
        current_min = start_min
        now_time = datetime.now()

        while current_min + slot_duration <= end_min:
            slot_end_min = current_min + slot_duration
            start_str = minutes_to_time(current_min)
            end_str = minutes_to_time(slot_end_min)

            # Skip break times
            is_in_break = False
            if break_start is not None and break_end is not None:
                if not (slot_end_min <= break_start or current_min >= break_end):
                    is_in_break = True

            if not is_in_break:
                is_available = True
                if start_str in booked_start_times:
                    is_available = False
                elif target_date == today:
                    slot_hour, slot_minute = map(int, start_str.split(":"))
                    if now_time.hour > slot_hour or (now_time.hour == slot_hour and now_time.minute >= slot_minute):
                        is_available = False

                slots.append({
                    "start_time": start_str,
                    "end_time": end_str,
                    "duration_minutes": slot_duration,
                    "is_available": is_available
                })

            current_min += slot_duration

        return slots
