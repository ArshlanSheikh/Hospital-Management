from datetime import datetime, timezone
from bson import ObjectId
from app.extensions import get_db
from app.patients.repository import PatientRepository
from app.common.errors import NotFoundError


class PatientService:
    @staticmethod
    def get_profile(user_id: str) -> dict:
        profile = PatientRepository.get_by_user_id(user_id)
        if not profile:
            raise NotFoundError("Patient profile not found")
        return profile

    @staticmethod
    def update_profile(user_id: str, data: dict) -> dict:
        db = get_db()
        updates = {}
        if "full_name" in data:
            updates["full_name"] = data["full_name"].strip()
            db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"name": data["full_name"].strip()}})
        if "phone" in data:
            updates["phone"] = data["phone"]
            db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"phone": data["phone"]}})
        if "date_of_birth" in data:
            updates["date_of_birth"] = data["date_of_birth"]
        if "gender" in data:
            updates["gender"] = data["gender"]
        if "blood_group" in data:
            updates["blood_group"] = data["blood_group"]
        if "emergency_contact" in data:
            updates["emergency_contact"] = data["emergency_contact"]
        if "allergies" in data:
            updates["allergies"] = data["allergies"]

        updates["updated_at"] = datetime.now(timezone.utc)
        result = PatientRepository.update_by_user_id(user_id, updates)
        if not result:
            raise NotFoundError("Patient profile not found")
        return result
