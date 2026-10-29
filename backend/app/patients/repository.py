from bson import ObjectId
from bson.errors import InvalidId
from app.extensions import get_db
from app.auth.service import serialize_doc


class PatientRepository:
    @staticmethod
    def get_by_user_id(user_id: str) -> dict:
        db = get_db()
        try:
            uid = ObjectId(user_id)
        except (InvalidId, TypeError):
            return None
        doc = db.patient_profiles.find_one({"user_id": uid})
        return serialize_doc(doc) if doc else None

    @staticmethod
    def update_by_user_id(user_id: str, updates: dict) -> dict:
        db = get_db()
        uid = ObjectId(user_id)
        db.patient_profiles.update_one({"user_id": uid}, {"$set": updates})
        updated = db.patient_profiles.find_one({"user_id": uid})
        return serialize_doc(updated) if updated else None
