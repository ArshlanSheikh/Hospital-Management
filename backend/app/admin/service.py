from datetime import datetime, timezone
from bson import ObjectId
from bson.errors import InvalidId
from app.extensions import get_db
from app.auth.service import serialize_doc
from app.appointments.repository import AppointmentRepository
from app.common.constants import (
    UserRole,
    DoctorVerificationStatus,
    AccountStatus,
    AppointmentStatus
)
from app.common.errors import NotFoundError, ValidationError


class AdminService:
    @staticmethod
    def get_stats() -> dict:
        db = get_db()
        total_patients = db.users.count_documents({"role": UserRole.PATIENT.value})
        total_doctors = db.doctor_profiles.count_documents({})
        verified_doctors = db.doctor_profiles.count_documents({
            "verification_status": DoctorVerificationStatus.VERIFIED.value
        })
        pending_doctors = db.doctor_profiles.count_documents({
            "verification_status": DoctorVerificationStatus.PENDING.value
        })
        total_appointments = db.appointments.count_documents({})
        active_appointments = db.appointments.count_documents({
            "appointment_status": {"$in": [AppointmentStatus.PENDING.value, AppointmentStatus.CONFIRMED.value]}
        })

        return {
            "total_patients": total_patients,
            "total_doctors": total_doctors,
            "verified_doctors": verified_doctors,
            "pending_doctors": pending_doctors,
            "total_appointments": total_appointments,
            "active_appointments": active_appointments,
        }

    @staticmethod
    def list_doctors(verification_status: str = None, page: int = 1, limit: int = 10) -> dict:
        db = get_db()
        query = {}
        if verification_status:
            query["verification_status"] = verification_status.lower()

        skip = (page - 1) * limit
        total = db.doctor_profiles.count_documents(query)
        cursor = db.doctor_profiles.find(query).sort("created_at", -1).skip(skip).limit(limit)

        doctors = []
        for d in cursor:
            item = serialize_doc(d)
            if "user_id" in d:
                u = db.users.find_one({"_id": d["user_id"]})
                if u:
                    item["email"] = u.get("email")
                    item["account_status"] = u.get("account_status", AccountStatus.ACTIVE.value)
            doctors.append(item)

        pages = (total + limit - 1) // limit if total > 0 else 1
        return {"doctors": doctors, "total": total, "page": page, "pages": pages, "limit": limit}

    @staticmethod
    def verify_doctor(doctor_id: str, new_status: str) -> dict:
        if new_status not in DoctorVerificationStatus.list():
            raise ValidationError(f"Invalid verification status: {new_status}")

        db = get_db()
        try:
            did = ObjectId(doctor_id)
        except (InvalidId, TypeError):
            raise NotFoundError("Doctor not found")

        doctor = db.doctor_profiles.find_one({"_id": did})
        if not doctor:
            raise NotFoundError("Doctor profile not found")

        db.doctor_profiles.update_one(
            {"_id": did},
            {"$set": {
                "verification_status": new_status,
                "verified_at": datetime.now(timezone.utc) if new_status == DoctorVerificationStatus.VERIFIED.value else None,
                "updated_at": datetime.now(timezone.utc),
            }}
        )
        updated = db.doctor_profiles.find_one({"_id": did})
        return serialize_doc(updated)

    @staticmethod
    def list_patients(page: int = 1, limit: int = 10) -> dict:
        db = get_db()
        query = {"role": UserRole.PATIENT.value}
        skip = (page - 1) * limit
        total = db.users.count_documents(query)
        cursor = db.users.find(query).sort("created_at", -1).skip(skip).limit(limit)

        patients = []
        for u in cursor:
            item = serialize_doc(u)
            item.pop("password_hash", None)
            profile = db.patient_profiles.find_one({"user_id": u["_id"]})
            item["profile"] = serialize_doc(profile) if profile else {}
            patients.append(item)

        pages = (total + limit - 1) // limit if total > 0 else 1
        return {"patients": patients, "total": total, "page": page, "pages": pages, "limit": limit}

    @staticmethod
    def update_user_status(user_id: str, new_status: str) -> dict:
        if new_status not in AccountStatus.list():
            raise ValidationError(f"Invalid account status: {new_status}")

        db = get_db()
        try:
            uid = ObjectId(user_id)
        except (InvalidId, TypeError):
            raise NotFoundError("User not found")

        user = db.users.find_one({"_id": uid})
        if not user:
            raise NotFoundError("User not found")

        is_active = (new_status == AccountStatus.ACTIVE.value)
        db.users.update_one(
            {"_id": uid},
            {"$set": {
                "account_status": new_status,
                "is_active": is_active,
                "updated_at": datetime.now(timezone.utc),
            }}
        )
        updated = db.users.find_one({"_id": uid})
        data = serialize_doc(updated)
        data.pop("password_hash", None)
        return data
