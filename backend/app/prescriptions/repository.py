import uuid
from datetime import datetime, timezone
from bson import ObjectId
from app.extensions import mongo


class PrescriptionRepository:
    """MongoDB repository for storing and querying digital medical prescriptions."""

    @staticmethod
    def _collection():
        return mongo.get_database().prescriptions

    @classmethod
    def create(cls, data):
        now = datetime.now(timezone.utc)
        today_str = now.strftime("%Y%m%d")
        rand_suffix = uuid.uuid4().hex[:6].upper()
        rx_number = data.get("prescription_number") or f"RX-{today_str}-{rand_suffix}"

        doc = {
            "prescription_number": rx_number,
            "appointment_id": str(data["appointment_id"]),
            "appointment_number": data.get("appointment_number", ""),
            "doctor_id": str(data["doctor_id"]),
            "doctor_name": data.get("doctor_name", ""),
            "doctor_specialization": data.get("doctor_specialization", ""),
            "doctor_qualification": data.get("doctor_qualification", ""),
            "doctor_license": data.get("doctor_license", ""),
            "patient_id": str(data["patient_id"]),
            "patient_name": data.get("patient_name", ""),
            "patient_gender": data.get("patient_gender", ""),
            "patient_dob": data.get("patient_dob", ""),
            "diagnosis": data.get("diagnosis", ""),
            "vital_signs": data.get("vital_signs") or {},
            "medicines": data.get("medicines") or [],
            "tests_recommended": data.get("tests_recommended") or [],
            "advice_notes": data.get("advice_notes", ""),
            "follow_up_date": data.get("follow_up_date"),
            "created_at": now,
            "updated_at": now
        }
        res = cls._collection().insert_one(doc)
        doc["_id"] = res.inserted_id
        return cls._serialize(doc)

    @classmethod
    def find_by_id(cls, rx_id):
        if not ObjectId.is_valid(rx_id):
            return None
        doc = cls._collection().find_one({"_id": ObjectId(rx_id)})
        return cls._serialize(doc)

    @classmethod
    def find_by_number(cls, rx_number):
        doc = cls._collection().find_one({"prescription_number": rx_number})
        return cls._serialize(doc)

    @classmethod
    def find_by_appointment(cls, appointment_id):
        doc = cls._collection().find_one({"appointment_id": str(appointment_id)})
        return cls._serialize(doc)

    @classmethod
    def find_by_patient(cls, patient_id, limit=50, skip=0):
        cursor = cls._collection().find({"patient_id": str(patient_id)}).sort("created_at", -1).skip(skip).limit(limit)
        return [cls._serialize(doc) for doc in cursor]

    @classmethod
    def find_by_doctor(cls, doctor_id, limit=50, skip=0):
        cursor = cls._collection().find({"doctor_id": str(doctor_id)}).sort("created_at", -1).skip(skip).limit(limit)
        return [cls._serialize(doc) for doc in cursor]

    @classmethod
    def update(cls, rx_id, update_fields):
        if not ObjectId.is_valid(rx_id):
            return None
        now = datetime.now(timezone.utc)
        fields = {k: v for k, v in update_fields.items() if k not in ["_id", "id", "prescription_number", "appointment_id", "doctor_id", "patient_id", "created_at"]}
        fields["updated_at"] = now

        res = cls._collection().find_one_and_update(
            {"_id": ObjectId(rx_id)},
            {"$set": fields},
            return_document=True
        )
        return cls._serialize(res)

    @staticmethod
    def _serialize(doc):
        if not doc:
            return None
        return {
            "id": str(doc["_id"]),
            "prescription_number": doc.get("prescription_number"),
            "appointment_id": str(doc.get("appointment_id")),
            "appointment_number": doc.get("appointment_number"),
            "doctor_id": str(doc.get("doctor_id")),
            "doctor_name": doc.get("doctor_name"),
            "doctor_specialization": doc.get("doctor_specialization"),
            "doctor_qualification": doc.get("doctor_qualification"),
            "doctor_license": doc.get("doctor_license"),
            "patient_id": str(doc.get("patient_id")),
            "patient_name": doc.get("patient_name"),
            "patient_gender": doc.get("patient_gender"),
            "patient_dob": doc.get("patient_dob"),
            "diagnosis": doc.get("diagnosis"),
            "vital_signs": doc.get("vital_signs", {}),
            "medicines": doc.get("medicines", []),
            "tests_recommended": doc.get("tests_recommended", []),
            "advice_notes": doc.get("advice_notes"),
            "follow_up_date": doc.get("follow_up_date"),
            "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
            "updated_at": doc.get("updated_at").isoformat() if doc.get("updated_at") else None,
        }
