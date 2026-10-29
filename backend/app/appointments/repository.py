from datetime import datetime, timezone
from bson import ObjectId
from bson.errors import InvalidId
from pymongo.errors import DuplicateKeyError
from app.extensions import get_db
from app.auth.service import serialize_doc
from app.common.errors import ConflictError


class AppointmentRepository:
    @staticmethod
    def enrich_appointment(doc: dict, db=None) -> dict:
        if not doc:
            return None
        if db is None:
            db = get_db()
        res = serialize_doc(doc)

        # Enrich patient info
        if "patient_id" in doc:
            p_user = db.users.find_one({"_id": doc["patient_id"]})
            if p_user:
                res["patient_name"] = p_user.get("name", "")
                res["patient_email"] = p_user.get("email", "")
                res["patient_phone"] = p_user.get("phone", "")

        # Enrich doctor info
        if "doctor_id" in doc:
            d_profile = db.doctor_profiles.find_one({"_id": doc["doctor_id"]})
            if d_profile:
                res["doctor_name"] = d_profile.get("full_name", "")
                res["doctor_specialization"] = d_profile.get("specialization", "")
                res["doctor_fee"] = d_profile.get("consultation_fee", 0.0)

        return res

    @staticmethod
    def insert(appointment_data: dict) -> dict:
        db = get_db()
        if "appointment_number" not in appointment_data:
            import uuid
            today_str = datetime.now(timezone.utc).strftime("%Y%m%d")
            appointment_data["appointment_number"] = f"APT-{today_str}-{uuid.uuid4().hex[:6].upper()}"

        try:
            result = db.appointments.insert_one(appointment_data)
            appointment_data["_id"] = result.inserted_id
            return AppointmentRepository.enrich_appointment(appointment_data, db)
        except DuplicateKeyError:
            raise ConflictError("This time slot has already been booked. Please choose another slot.")

    @classmethod
    def get_by_id(cls, appointment_id: str) -> dict:
        db = get_db()
        try:
            app_id = ObjectId(appointment_id)
        except (InvalidId, TypeError):
            return None
        doc = db.appointments.find_one({"_id": app_id})
        return cls.enrich_appointment(doc, db) if doc else None

    @classmethod
    def find_by_id(cls, appointment_id: str) -> dict:
        return cls.get_by_id(appointment_id)

    @classmethod
    def _serialize(cls, doc, db=None) -> dict:
        return cls.enrich_appointment(doc, db)

    @staticmethod
    def find_by_patient(patient_id: str, status: str = None, page: int = 1, limit: int = 10) -> tuple[list, int]:
        db = get_db()
        pid = ObjectId(patient_id)
        query = {"patient_id": pid}
        if status:
            query["appointment_status"] = status.lower()

        skip = (page - 1) * limit
        total = db.appointments.count_documents(query)
        cursor = db.appointments.find(query).sort("appointment_date", -1).skip(skip).limit(limit)
        items = [AppointmentRepository.enrich_appointment(d, db) for d in cursor]
        return items, total

    @staticmethod
    def find_by_doctor(doctor_profile_id: str, status: str = None, date_str: str = None, page: int = 1, limit: int = 10) -> tuple[list, int]:
        db = get_db()
        did = ObjectId(doctor_profile_id)
        query = {"doctor_id": did}
        if status:
            query["appointment_status"] = status.lower()
        if date_str:
            query["appointment_date"] = date_str

        skip = (page - 1) * limit
        total = db.appointments.count_documents(query)
        cursor = db.appointments.find(query).sort([("appointment_date", -1), ("start_time", 1)]).skip(skip).limit(limit)
        items = [AppointmentRepository.enrich_appointment(d, db) for d in cursor]
        return items, total

    @staticmethod
    def find_all(status: str = None, date_str: str = None, page: int = 1, limit: int = 20) -> tuple[list, int]:
        db = get_db()
        query = {}
        if status:
            query["appointment_status"] = status.lower()
        if date_str:
            query["appointment_date"] = date_str

        skip = (page - 1) * limit
        total = db.appointments.count_documents(query)
        cursor = db.appointments.find(query).sort([("appointment_date", -1), ("start_time", 1)]).skip(skip).limit(limit)
        items = [AppointmentRepository.enrich_appointment(d, db) for d in cursor]
        return items, total

    @staticmethod
    def update_status(appointment_id: str, new_status: str, extra_fields: dict = None) -> dict:
        db = get_db()
        aid = ObjectId(appointment_id)
        update_doc = {
            "appointment_status": new_status.lower(),
            "updated_at": datetime.now(timezone.utc)
        }
        if extra_fields:
            update_doc.update(extra_fields)

        db.appointments.update_one({"_id": aid}, {"$set": update_doc})
        updated = db.appointments.find_one({"_id": aid})
        return AppointmentRepository.enrich_appointment(updated, db) if updated else None
