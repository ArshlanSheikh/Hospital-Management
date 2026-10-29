from bson import ObjectId
from app.prescriptions.repository import PrescriptionRepository
from app.appointments.repository import AppointmentRepository
from app.doctors.repository import DoctorRepository
from app.notifications.service import NotificationService
from app.common.errors import NotFoundError, ForbiddenError, ConflictError, ValidationError
from app.extensions import mongo


class PrescriptionService:
    """Service governing digital prescription generation, verification, and amendments."""

    @classmethod
    def create_prescription(cls, data, user):
        """Issue a new digital prescription for an eligible consultation."""
        if user.get("role") != "doctor":
            raise ForbiddenError("Only authorized doctors can issue digital prescriptions")

        doc_profile = DoctorRepository.get_by_user_id(str(user["_id"]))
        if not doc_profile:
            raise NotFoundError("Doctor profile not found")

        if doc_profile.get("verification_status") != "verified":
            raise ForbiddenError("Only verified doctors can issue digital prescriptions")

        appointment_id = data.get("appointment_id")
        if not appointment_id:
            raise ValidationError("appointment_id is required")

        appointment = AppointmentRepository.find_by_id(appointment_id)
        if not appointment:
            raise NotFoundError("Consultation appointment not found")

        # Verify that this doctor is assigned to the appointment
        if str(appointment["doctor_id"]) != str(doc_profile["id"]):
            raise ForbiddenError("You are not the assigned doctor for this appointment")

        if appointment.get("appointment_status") == "cancelled":
            raise ConflictError("Cannot issue prescription for a cancelled appointment")

        # Check if already issued
        existing_rx = PrescriptionRepository.find_by_appointment(appointment_id)
        if existing_rx:
            raise ConflictError("A prescription has already been issued for this appointment. Please amend the existing one.")

        # Fetch patient profile
        db = mongo.get_database()
        patient_profile = db.patient_profiles.find_one({"$or": [{"user_id": ObjectId(appointment["patient_id"]) if ObjectId.is_valid(appointment["patient_id"]) else appointment["patient_id"]}, {"user_id": str(appointment["patient_id"])}]})
        patient_name = patient_profile.get("full_name") if patient_profile else "Patient"
        patient_gender = patient_profile.get("gender", "") if patient_profile else ""
        patient_dob = patient_profile.get("date_of_birth", "") if patient_profile else ""

        medicines = data.get("medicines") or []
        if not medicines:
            raise ValidationError("Prescription must include at least one prescribed medication")

        rx_payload = {
            "appointment_id": str(appointment["id"]),
            "appointment_number": appointment.get("appointment_number", ""),
            "doctor_id": str(doc_profile["id"]),
            "doctor_name": doc_profile.get("full_name", ""),
            "doctor_specialization": doc_profile.get("specialization", ""),
            "doctor_qualification": doc_profile.get("qualifications", ""),
            "doctor_license": doc_profile.get("license_number", ""),
            "patient_id": str(appointment["patient_id"]),
            "patient_name": patient_name,
            "patient_gender": patient_gender,
            "patient_dob": patient_dob,
            "diagnosis": data.get("diagnosis", "Clinical Evaluation"),
            "vital_signs": data.get("vital_signs") or {},
            "medicines": medicines,
            "tests_recommended": data.get("tests_recommended") or [],
            "advice_notes": data.get("advice_notes", ""),
            "follow_up_date": data.get("follow_up_date"),
        }

        rx = PrescriptionRepository.create(rx_payload)

        # Notify the patient in-app
        NotificationService.notify_prescription_issued(
            patient_user_id=appointment["patient_id"],
            doctor_name=doc_profile.get("full_name", "Your doctor"),
            prescription_id=rx["id"],
            appointment_number=appointment.get("appointment_number", "")
        )

        # Automatically mark the appointment as completed if the doctor wants
        if data.get("mark_appointment_completed", True):
            db.appointments.update_one(
                {"_id": ObjectId(appointment["id"]) if ObjectId.is_valid(appointment["id"]) else appointment["id"]},
                {"$set": {"appointment_status": "completed"}}
            )

        return rx

    @classmethod
    def get_by_id(cls, rx_id, user):
        """Retrieve prescription details verifying patient or doctor ownership."""
        rx = PrescriptionRepository.find_by_id(rx_id)
        if not rx:
            raise NotFoundError("Prescription not found")

        user_id = str(user["_id"])
        role = user.get("role")

        if role == "patient" and rx["patient_id"] != user_id:
            raise ForbiddenError("Unauthorized to access this medical prescription")

        if role == "doctor":
            doc_profile = DoctorRepository.get_by_user_id(user_id)
            if not doc_profile or str(doc_profile["id"]) != rx["doctor_id"]:
                raise ForbiddenError("Unauthorized to view prescriptions from other doctors")

        return rx

    @classmethod
    def get_by_appointment(cls, appointment_id, user):
        """Retrieve prescription linked to an appointment with RBAC check."""
        rx = PrescriptionRepository.find_by_appointment(appointment_id)
        if not rx:
            return None

        # Verify access
        user_id = str(user["_id"])
        role = user.get("role")
        if role == "patient" and rx["patient_id"] != user_id:
            raise ForbiddenError("Unauthorized to view this prescription")
        if role == "doctor":
            doc_profile = DoctorRepository.get_by_user_id(user_id)
            if not doc_profile or str(doc_profile["id"]) != rx["doctor_id"]:
                raise ForbiddenError("Unauthorized to view this prescription")

        return rx

    @classmethod
    def get_patient_prescriptions(cls, user, limit=50, skip=0):
        """Get all prescriptions for the currently logged-in patient."""
        return PrescriptionRepository.find_by_patient(str(user["_id"]), limit=limit, skip=skip)

    @classmethod
    def get_doctor_prescriptions(cls, user, limit=50, skip=0):
        """Get all prescriptions issued by the currently logged-in doctor."""
        doc_profile = DoctorRepository.get_by_user_id(str(user["_id"]))
        if not doc_profile:
            return []
        return PrescriptionRepository.find_by_doctor(str(doc_profile["id"]), limit=limit, skip=skip)

    @classmethod
    def update_prescription(cls, rx_id, update_data, user):
        """Allow issuing doctor to amend prescription instructions or medicines."""
        if user.get("role") != "doctor":
            raise ForbiddenError("Only doctors can amend medical prescriptions")

        rx = PrescriptionRepository.find_by_id(rx_id)
        if not rx:
            raise NotFoundError("Prescription not found")

        doc_profile = DoctorRepository.get_by_user_id(str(user["_id"]))
        if not doc_profile or str(doc_profile["id"]) != rx["doctor_id"]:
            raise ForbiddenError("You can only amend prescriptions you originally issued")

        return PrescriptionRepository.update(rx_id, update_data)
