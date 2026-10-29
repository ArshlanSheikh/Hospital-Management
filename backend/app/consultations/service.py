import hashlib
from datetime import datetime, timezone
from bson import ObjectId
from flask import current_app
from app.appointments.repository import AppointmentRepository
from app.common.errors import NotFoundError, ForbiddenError, ConflictError, ValidationError
from app.common.constants import ConsultationStatus
from app.extensions import mongo


class ConsultationService:
    """Service managing secure video consultation rooms and session lifecycles."""

    @classmethod
    def get_or_create_session(cls, appointment_id, user):
        """Authorize participant and prepare secure video consultation session credentials."""
        appointment = AppointmentRepository.find_by_id(appointment_id)
        if not appointment:
            raise NotFoundError("Appointment not found")

        # Type validation
        consult_type = appointment.get("consultation_type")
        if consult_type not in ["video", "online"]:
            raise ValidationError("This appointment is scheduled for in-person consultation, not online video.")

        # Status validation
        status = appointment.get("appointment_status")
        if status in ["cancelled", "rejected"]:
            raise ConflictError(f"Cannot enter video room for a {status} appointment.")

        db = mongo.get_database()
        user_id = str(user["_id"])
        user_role = user.get("role")

        is_patient = str(appointment["patient_id"]) == user_id
        is_doctor = False
        display_name = "Participant"

        # Check if doctor
        doc_profile = db.doctor_profiles.find_one({"_id": ObjectId(appointment["doctor_id"]) if ObjectId.is_valid(appointment["doctor_id"]) else appointment["doctor_id"]})
        if doc_profile and str(doc_profile.get("user_id")) == user_id:
            is_doctor = True

        if not is_patient and not is_doctor and user_role != "admin":
            raise ForbiddenError("You are not an authorized participant in this medical consultation.")

        patient_profile = db.patient_profiles.find_one({"user_id": str(appointment["patient_id"])})

        if is_doctor:
            display_name = f"Dr. {doc_profile.get('full_name', 'Doctor')}"
            participant_role = "doctor"
        elif is_patient:
            display_name = patient_profile.get("full_name", "Patient") if patient_profile else "Patient"
            participant_role = "patient"
        else:
            display_name = "Platform Administrator"
            participant_role = "admin"

        # Generate deterministic, cryptographically secure room name
        secret = current_app.config.get("SECRET_KEY", "medipulse_secret")
        room_token = hashlib.sha256(f"{appointment['appointment_number']}_{secret}".encode()).hexdigest()[:12]
        clean_num = appointment["appointment_number"].lower().replace("-", "")
        room_name = f"medipulse_{clean_num}_{room_token}"

        # Update consultation session state to in_progress if currently scheduled
        now = datetime.now(timezone.utc)
        current_consult_status = appointment.get("consultation_status", ConsultationStatus.SCHEDULED.value)

        if current_consult_status == ConsultationStatus.SCHEDULED.value:
            db.appointments.update_one(
                {"_id": ObjectId(appointment["id"]) if ObjectId.is_valid(appointment["id"]) else appointment["id"]},
                {
                    "$set": {
                        "consultation_status": ConsultationStatus.IN_PROGRESS.value,
                        "consultation_started_at": now
                    }
                }
            )
            current_consult_status = ConsultationStatus.IN_PROGRESS.value

        return {
            "appointment_id": str(appointment["id"]),
            "appointment_number": appointment.get("appointment_number"),
            "room_name": room_name,
            "provider": "jitsi",
            "domain": "meet.jit.si",
            "user_role": participant_role,
            "display_name": display_name,
            "consultation_status": current_consult_status,
            "doctor": {
                "id": str(doc_profile["_id"]) if doc_profile else str(appointment["doctor_id"]),
                "name": doc_profile.get("full_name") if doc_profile else "Doctor",
                "specialization": doc_profile.get("specialization") if doc_profile else "",
            },
            "patient": {
                "id": str(appointment["patient_id"]),
                "name": patient_profile.get("full_name") if patient_profile else "Patient",
            },
            "consultation_date": appointment.get("appointment_date"),
            "consultation_time": appointment.get("start_time"),
        }

    @classmethod
    def complete_consultation(cls, appointment_id, user, notes=None):
        """Mark video consultation session as completed."""
        appointment = AppointmentRepository.find_by_id(appointment_id)
        if not appointment:
            raise NotFoundError("Appointment not found")

        db = mongo.get_database()
        user_id = str(user["_id"])
        user_role = user.get("role")

        doc_profile = db.doctor_profiles.find_one({"_id": ObjectId(appointment["doctor_id"]) if ObjectId.is_valid(appointment["doctor_id"]) else appointment["doctor_id"]})
        is_assigned_doctor = doc_profile and str(doc_profile.get("user_id")) == user_id

        if not is_assigned_doctor and user_role != "admin":
            raise ForbiddenError("Only the assigned consulting doctor can officially conclude the session.")

        now = datetime.now(timezone.utc)
        update_doc = {
            "consultation_status": ConsultationStatus.COMPLETED.value,
            "appointment_status": "completed",
            "consultation_completed_at": now
        }
        if notes:
            update_doc["consultation_notes"] = notes

        db.appointments.update_one(
            {"_id": ObjectId(appointment["id"]) if ObjectId.is_valid(appointment["id"]) else appointment["id"]},
            {"$set": update_doc}
        )

        return {
            "appointment_id": str(appointment["id"]),
            "consultation_status": ConsultationStatus.COMPLETED.value,
            "completed_at": now.isoformat()
        }

    @classmethod
    def mark_missed(cls, appointment_id, user, reason=None):
        """Mark a scheduled consultation as missed if patient or doctor did not show up."""
        appointment = AppointmentRepository.find_by_id(appointment_id)
        if not appointment:
            raise NotFoundError("Appointment not found")

        db = mongo.get_database()
        user_id = str(user["_id"])
        user_role = user.get("role")

        doc_profile = db.doctor_profiles.find_one({"_id": ObjectId(appointment["doctor_id"]) if ObjectId.is_valid(appointment["doctor_id"]) else appointment["doctor_id"]})
        is_assigned_doctor = doc_profile and str(doc_profile.get("user_id")) == user_id

        if not is_assigned_doctor and user_role != "admin":
            raise ForbiddenError("Only the assigned doctor or admin can mark a consultation as missed.")

        now = datetime.now(timezone.utc)
        db.appointments.update_one(
            {"_id": ObjectId(appointment["id"]) if ObjectId.is_valid(appointment["id"]) else appointment["id"]},
            {
                "$set": {
                    "consultation_status": ConsultationStatus.MISSED.value,
                    "missed_reason": reason or "Participant did not attend scheduled call",
                    "missed_at": now
                }
            }
        )

        return {
            "appointment_id": str(appointment["id"]),
            "consultation_status": ConsultationStatus.MISSED.value
        }
