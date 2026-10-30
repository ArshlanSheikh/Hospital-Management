import hashlib
import time
from datetime import datetime, timezone
from bson import ObjectId
from flask import current_app
from app.appointments.repository import AppointmentRepository
from app.common.errors import NotFoundError, ForbiddenError, ConflictError, ValidationError
from app.common.constants import ConsultationStatus
from app.extensions import mongo


class ConsultationService:
    """Service managing secure video consultation rooms, WebRTC signaling, and session lifecycles."""

    @classmethod
    def _authorize_participant(cls, appointment_id, user):
        """Helper to verify participant access and return appointment and participant role."""
        appointment = AppointmentRepository.find_by_id(appointment_id)
        if not appointment:
            raise NotFoundError("Appointment not found")

        db = mongo.get_database()
        user_id = str(user["_id"])
        user_role = user.get("role")

        is_patient = str(appointment["patient_id"]) == user_id
        is_doctor = False

        doc_profile = db.doctor_profiles.find_one({
            "_id": ObjectId(appointment["doctor_id"]) if ObjectId.is_valid(appointment["doctor_id"]) else appointment["doctor_id"]
        })
        if doc_profile and str(doc_profile.get("user_id")) == user_id:
            is_doctor = True

        if not is_patient and not is_doctor and user_role != "admin":
            raise ForbiddenError("You are not an authorized participant in this medical consultation.")

        patient_profile = db.patient_profiles.find_one({"user_id": str(appointment["patient_id"])})
        participant_role = "doctor" if is_doctor else ("patient" if is_patient else "admin")

        if is_doctor:
            display_name = f"Dr. {doc_profile.get('full_name', 'Doctor')}"
        elif is_patient:
            display_name = patient_profile.get("full_name", "Patient") if patient_profile else "Patient"
        else:
            display_name = "Platform Administrator"

        return appointment, participant_role, display_name, doc_profile, patient_profile

    @classmethod
    def get_or_create_session(cls, appointment_id, user):
        """Authorize participant and prepare secure video consultation session credentials."""
        appointment, participant_role, display_name, doc_profile, patient_profile = cls._authorize_participant(appointment_id, user)

        # Type validation
        consult_type = appointment.get("consultation_type")
        if consult_type not in ["video", "online"]:
            raise ValidationError("This appointment is scheduled for in-person consultation, not online video.")

        # Status validation
        status = appointment.get("appointment_status")
        if status in ["cancelled", "rejected"]:
            raise ConflictError(f"Cannot enter video room for a {status} appointment.")

        db = mongo.get_database()

        # Generate deterministic, cryptographically secure room name
        secret = current_app.config.get("SECRET_KEY", "medipulse_secret")
        room_token = hashlib.sha256(f"{appointment['appointment_number']}_{secret}".encode()).hexdigest()[:12]
        clean_num = appointment["appointment_number"].lower().replace("-", "")
        room_name = f"medipulse_{clean_num}_{room_token}"

        # Public STUN servers for WebRTC peer connection
        ice_servers = [
            {"urls": "stun:stun.l.google.com:19302"},
            {"urls": "stun:stun1.l.google.com:19302"},
            {"urls": "stun:stun2.l.google.com:19302"},
            {"urls": "stun:stun3.l.google.com:19302"},
            {"urls": "stun:stun4.l.google.com:19302"},
        ]
        turn_url = current_app.config.get("TURN_URL")
        if turn_url:
            turn_cfg = {"urls": turn_url}
            if current_app.config.get("TURN_USERNAME"):
                turn_cfg["username"] = current_app.config.get("TURN_USERNAME")
            if current_app.config.get("TURN_CREDENTIAL"):
                turn_cfg["credential"] = current_app.config.get("TURN_CREDENTIAL")
            ice_servers.append(turn_cfg)

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
            "provider": "webrtc",
            "ice_servers": ice_servers,
            "user_role": participant_role,
            "display_name": display_name,
            "consultation_status": current_consult_status,
            "call_status": appointment.get("call_status", "idle"),
            "call_initiated_by": appointment.get("call_initiated_by"),
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
    def initiate_call(cls, appointment_id, user):
        """Only the consulting doctor can initiate the video call to the patient."""
        appointment, participant_role, display_name, doc_profile, patient_profile = cls._authorize_participant(appointment_id, user)
        if participant_role != "doctor" and user.get("role") != "admin":
            raise ForbiddenError("Only the consulting doctor can initiate a video call. Patients must wait to accept the call.")

        # Type validation
        if appointment.get("consultation_type") not in ["video", "online"]:
            raise ValidationError("This appointment is not scheduled for online video consultation.")

        db = mongo.get_database()
        now = datetime.now(timezone.utc)
        appt_oid = ObjectId(appointment["id"]) if ObjectId.is_valid(appointment["id"]) else appointment["id"]

        # Reset signaling buffer for clean call handshake
        db.consultation_signals.delete_many({"appointment_id": str(appointment["id"])})

        # Set appointment call state to calling
        db.appointments.update_one(
            {"_id": appt_oid},
            {
                "$set": {
                    "call_status": "calling",
                    "consultation_status": ConsultationStatus.IN_PROGRESS.value,
                    "appointment_status": "confirmed",
                    "call_initiated_at": now,
                    "call_initiated_by": "doctor",
                    "call_doctor_name": doc_profile.get("full_name", "Doctor") if doc_profile else "Doctor",
                    "call_doctor_specialization": doc_profile.get("specialization", "") if doc_profile else ""
                }
            }
        )

        # Send in-app notification to patient
        try:
            from app.notifications.service import NotificationService
            from app.common.constants import NotificationType
            doc_name = doc_profile.get("full_name", "Doctor") if doc_profile else "Doctor"
            NotificationService.create_notification(
                user_id=str(appointment["patient_id"]),
                title="Incoming Video Call",
                message=f"Dr. {doc_name} is calling you for appointment #{appointment.get('appointment_number')}.",
                notification_type=NotificationType.CONSULTATION.value,
                data={"appointment_id": str(appointment["id"])}
            )
        except Exception:
            pass

        return {
            "appointment_id": str(appointment["id"]),
            "call_status": "calling",
            "initiated_at": now.isoformat()
        }

    @classmethod
    def get_active_incoming_call(cls, user):
        """Check if there is an active incoming call from a doctor for this patient."""
        db = mongo.get_database()
        user_id = str(user["_id"])

        now = datetime.now(timezone.utc)

        # Look for calling appointment for this patient
        query = {
            "patient_id": {"$in": [ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id, user_id]},
            "consultation_type": {"$in": ["video", "online"]},
            "call_status": "calling"
        }

        appt = db.appointments.find_one(query, sort=[("call_initiated_at", -1)])
        if not appt:
            return {"incoming_call": None}

        # Check call initiation age (expire after 10 minutes)
        init_time = appt.get("call_initiated_at")
        if init_time:
            if init_time.tzinfo is None:
                init_time = init_time.replace(tzinfo=timezone.utc)
            if (now - init_time).total_seconds() > 600:
                # Expired ringing
                db.appointments.update_one({"_id": appt["_id"]}, {"$set": {"call_status": "idle"}})
                return {"incoming_call": None}

        doc_profile = db.doctor_profiles.find_one({
            "_id": ObjectId(appt["doctor_id"]) if ObjectId.is_valid(appt["doctor_id"]) else appt["doctor_id"]
        })
        raw_doc_name = doc_profile.get("full_name") if doc_profile else appt.get("call_doctor_name", "Doctor")
        formatted_name = raw_doc_name if raw_doc_name.startswith("Dr.") else f"Dr. {raw_doc_name}"
        doc_spec = doc_profile.get("specialization") if doc_profile else appt.get("call_doctor_specialization", "")

        return {
            "incoming_call": {
                "appointment_id": str(appt["_id"]),
                "appointment_number": appt.get("appointment_number", "N/A"),
                "doctor_name": formatted_name,
                "doctor_specialization": doc_spec,
                "call_status": "calling",
                "initiated_at": init_time.isoformat() if init_time else now.isoformat()
            }
        }

    @classmethod
    def accept_call(cls, appointment_id, user):
        """Patient accepts the incoming video call."""
        appointment, participant_role, _, _, _ = cls._authorize_participant(appointment_id, user)
        db = mongo.get_database()
        appt_oid = ObjectId(appointment["id"]) if ObjectId.is_valid(appointment["id"]) else appointment["id"]

        db.appointments.update_one(
            {"_id": appt_oid},
            {"$set": {"call_status": "connected"}}
        )
        return cls.get_or_create_session(appointment_id, user)

    @classmethod
    def decline_call(cls, appointment_id, user):
        """Patient declines or doctor cancels incoming video call."""
        appointment, participant_role, _, _, _ = cls._authorize_participant(appointment_id, user)
        db = mongo.get_database()
        appt_oid = ObjectId(appointment["id"]) if ObjectId.is_valid(appointment["id"]) else appointment["id"]

        db.appointments.update_one(
            {"_id": appt_oid},
            {"$set": {"call_status": "idle"}}
        )
        # Notify remote peer that call was declined
        cls.send_signal(appointment_id, user, {"type": "leave", "payload": {"reason": "declined"}})
        return {"status": "declined", "appointment_id": str(appointment["id"])}

    @classmethod
    def send_signal(cls, appointment_id, user, signal_data):
        """Send a WebRTC signaling message (offer, answer, candidate, join, leave)."""
        appointment, participant_role, _, _, _ = cls._authorize_participant(appointment_id, user)
        db = mongo.get_database()
        user_id = str(user["_id"])

        signal_type = signal_data.get("type")
        if not signal_type:
            raise ValidationError("Signal type is required (e.g. offer, answer, ice-candidate, join, leave)")

        payload = signal_data.get("payload")

        # Sanitize empty ICE candidates to prevent browser RTCPeerConnection parse errors
        if signal_type == "ice-candidate":
            if not payload or not isinstance(payload, dict) or not payload.get("candidate"):
                return {"status": "ignored", "type": signal_type}

        signal_doc = {
            "appointment_id": str(appointment["id"]),
            "sender_id": user_id,
            "sender_role": participant_role,
            "type": signal_type,
            "payload": payload,
            "created_at": datetime.now(timezone.utc),
            "timestamp_ms": int(time.time() * 1000)
        }
        db.consultation_signals.insert_one(signal_doc)
        return {"status": "sent", "type": signal_type}

    @classmethod
    def get_signals(cls, appointment_id, user, since_ms=0):
        """Poll new WebRTC signaling messages from the remote peer."""
        appointment, participant_role, _, _, _ = cls._authorize_participant(appointment_id, user)
        db = mongo.get_database()
        user_id = str(user["_id"])

        query = {
            "appointment_id": str(appointment["id"]),
            "sender_id": {"$ne": user_id},
            "timestamp_ms": {"$gt": int(since_ms)}
        }
        cursor = db.consultation_signals.find(query).sort("timestamp_ms", 1)

        signals = []
        latest_ms = int(since_ms)
        for s in cursor:
            signals.append({
                "id": str(s["_id"]),
                "type": s["type"],
                "payload": s.get("payload"),
                "sender_role": s.get("sender_role"),
                "timestamp_ms": s.get("timestamp_ms")
            })
            if s.get("timestamp_ms", 0) > latest_ms:
                latest_ms = s["timestamp_ms"]

        return {"signals": signals, "latest_timestamp_ms": latest_ms}

    @classmethod
    def reset_signals(cls, appointment_id, user):
        """Clear signals for an appointment session."""
        appointment, _, _, _, _ = cls._authorize_participant(appointment_id, user)
        db = mongo.get_database()
        db.consultation_signals.delete_many({"appointment_id": str(appointment["id"])})
        return {"status": "reset"}

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
            "call_status": "ended",
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
