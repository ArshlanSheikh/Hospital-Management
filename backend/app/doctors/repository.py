import re
from bson import ObjectId
from bson.errors import InvalidId
from app.extensions import get_db
from app.common.constants import DoctorVerificationStatus
from app.auth.service import serialize_doc


class DoctorRepository:
    @staticmethod
    def get_by_id(doctor_id: str) -> dict:
        db = get_db()
        try:
            doc_id = ObjectId(doctor_id)
        except (InvalidId, TypeError):
            return None
        doc = db.doctor_profiles.find_one({"_id": doc_id})
        return serialize_doc(doc) if doc else None

    @staticmethod
    def get_by_user_id(user_id: str) -> dict:
        db = get_db()
        try:
            uid = ObjectId(user_id)
        except (InvalidId, TypeError):
            uid = None
        conds = [{"user_id": str(user_id)}]
        if uid:
            conds.append({"user_id": uid})
        doc = db.doctor_profiles.find_one({"$or": conds})
        return serialize_doc(doc) if doc else None

    @staticmethod
    def find_verified(query_params: dict) -> tuple[list, int]:
        db = get_db()
        filt = {"verification_status": DoctorVerificationStatus.VERIFIED.value}

        # Specialization filter
        spec = query_params.get("specialization")
        if spec:
            filt["specialization"] = {"$regex": f"^{re.escape(spec.strip())}$", "$options": "i"}

        # Search term across doctor name or specialization or bio
        search = query_params.get("search")
        if search:
            escaped = re.escape(search.strip())
            filt["$or"] = [
                {"full_name": {"$regex": escaped, "$options": "i"}},
                {"specialization": {"$regex": escaped, "$options": "i"}},
                {"bio": {"$regex": escaped, "$options": "i"}},
            ]

        # Consultation fee range
        fee_cond = {}
        if query_params.get("min_fee") is not None:
            fee_cond["$gte"] = float(query_params["min_fee"])
        if query_params.get("max_fee") is not None:
            fee_cond["$lte"] = float(query_params["max_fee"])
        if fee_cond:
            filt["consultation_fee"] = fee_cond

        page = max(1, int(query_params.get("page", 1)))
        limit = min(100, max(1, int(query_params.get("limit", 10))))
        skip = (page - 1) * limit

        total = db.doctor_profiles.count_documents(filt)
        cursor = db.doctor_profiles.find(filt).sort("experience_years", -1).skip(skip).limit(limit)
        items = [serialize_doc(d) for d in cursor]
        return items, total

    @staticmethod
    def update_by_user_id(user_id: str, updates: dict) -> dict:
        db = get_db()
        uid = ObjectId(user_id)
        db.doctor_profiles.update_one({"user_id": uid}, {"$set": updates})
        updated = db.doctor_profiles.find_one({"user_id": uid})
        return serialize_doc(updated) if updated else None
