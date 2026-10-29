from datetime import datetime, timezone
from bson import ObjectId
from app.extensions import mongo


class PaymentRepository:
    """Repository managing payment order creation, verification, and receipts in MongoDB."""

    @staticmethod
    def _collection():
        return mongo.get_database().payments

    @classmethod
    def create_order(cls, order_id, appointment_id, appointment_number, patient_id, doctor_id, amount, currency="INR", receipt=None):
        now = datetime.now(timezone.utc)
        doc = {
            "order_id": order_id,
            "payment_id": None,
            "appointment_id": str(appointment_id),
            "appointment_number": appointment_number,
            "patient_id": str(patient_id),
            "doctor_id": str(doctor_id),
            "amount": float(amount),
            "amount_paise": int(round(float(amount) * 100)),
            "currency": currency,
            "status": "created",  # created | completed | failed
            "method": None,
            "receipt": receipt or f"rcpt_{appointment_number}",
            "signature": None,
            "error_reason": None,
            "created_at": now,
            "updated_at": now
        }
        res = cls._collection().insert_one(doc)
        doc["_id"] = res.inserted_id
        return cls._serialize(doc)

    @classmethod
    def get_by_order_id(cls, order_id):
        doc = cls._collection().find_one({"order_id": order_id})
        return cls._serialize(doc)

    @classmethod
    def get_by_payment_id(cls, payment_id):
        doc = cls._collection().find_one({"payment_id": payment_id})
        return cls._serialize(doc)

    @classmethod
    def get_by_appointment_id(cls, appointment_id):
        doc = cls._collection().find_one({"appointment_id": str(appointment_id)})
        return cls._serialize(doc)

    @classmethod
    def get_by_id(cls, payment_doc_id):
        if not ObjectId.is_valid(payment_doc_id):
            return None
        doc = cls._collection().find_one({"_id": ObjectId(payment_doc_id)})
        return cls._serialize(doc)

    @classmethod
    def update_to_completed(cls, order_id, payment_id, signature, method="razorpay"):
        now = datetime.now(timezone.utc)
        res = cls._collection().find_one_and_update(
            {"order_id": order_id, "status": {"$ne": "completed"}},
            {
                "$set": {
                    "payment_id": payment_id,
                    "signature": signature,
                    "status": "completed",
                    "method": method,
                    "updated_at": now
                }
            },
            return_document=True
        )
        return cls._serialize(res)

    @classmethod
    def update_to_failed(cls, order_id, reason="Payment failed"):
        now = datetime.now(timezone.utc)
        res = cls._collection().find_one_and_update(
            {"order_id": order_id},
            {
                "$set": {
                    "status": "failed",
                    "error_reason": reason,
                    "updated_at": now
                }
            },
            return_document=True
        )
        return cls._serialize(res)

    @classmethod
    def get_patient_history(cls, patient_id, limit=50, skip=0):
        cursor = cls._collection().find({"patient_id": str(patient_id)}).sort("created_at", -1).skip(skip).limit(limit)
        return [cls._serialize(doc) for doc in cursor]

    @classmethod
    def get_doctor_history(cls, doctor_id, limit=50, skip=0):
        cursor = cls._collection().find({"doctor_id": str(doctor_id)}).sort("created_at", -1).skip(skip).limit(limit)
        return [cls._serialize(doc) for doc in cursor]

    @classmethod
    def get_all_payments(cls, limit=50, skip=0):
        cursor = cls._collection().find().sort("created_at", -1).skip(skip).limit(limit)
        return [cls._serialize(doc) for doc in cursor]

    @staticmethod
    def _serialize(doc):
        if not doc:
            return None
        return {
            "id": str(doc["_id"]),
            "order_id": doc.get("order_id"),
            "payment_id": doc.get("payment_id"),
            "appointment_id": str(doc.get("appointment_id")),
            "appointment_number": doc.get("appointment_number"),
            "patient_id": str(doc.get("patient_id")),
            "doctor_id": str(doc.get("doctor_id")),
            "amount": doc.get("amount"),
            "amount_paise": doc.get("amount_paise"),
            "currency": doc.get("currency", "INR"),
            "status": doc.get("status"),
            "method": doc.get("method"),
            "receipt": doc.get("receipt"),
            "signature": doc.get("signature"),
            "error_reason": doc.get("error_reason"),
            "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
            "updated_at": doc.get("updated_at").isoformat() if doc.get("updated_at") else None,
        }
