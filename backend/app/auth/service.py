from datetime import datetime, timezone
from bson import ObjectId
import bcrypt
from flask_jwt_extended import create_access_token
from app.extensions import get_db
from app.common.constants import UserRole, AccountStatus, DoctorVerificationStatus
from app.common.errors import ConflictError, UnauthorizedError, NotFoundError


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def check_password(password: str, hashed: str) -> bool:
    if not hashed:
        return False
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def serialize_doc(doc: dict) -> dict:
    """Helper to convert Mongo document ObjectIds and datetimes to serializable dict."""
    if not doc:
        return {}
    res = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            res[k] = str(v)
        elif isinstance(v, datetime):
            res[k] = v.isoformat()
        elif isinstance(v, list):
            res[k] = [serialize_doc(i) if isinstance(i, dict) else (str(i) if isinstance(i, ObjectId) else i) for i in v]
        elif isinstance(v, dict):
            res[k] = serialize_doc(v)
        else:
            res[k] = v
    if "_id" in doc and "id" not in res:
        res["id"] = str(doc["_id"])
    return res


class AuthService:
    @staticmethod
    def register_patient(data: dict) -> dict:
        db = get_db()
        email = data["email"].strip().lower()

        if db.users.find_one({"email": email}):
            raise ConflictError("An account with this email already exists")

        now = datetime.now(timezone.utc)
        user_doc = {
            "email": email,
            "name": data["full_name"],
            "password_hash": hash_password(data["password"]),
            "role": UserRole.PATIENT.value,
            "phone": data.get("phone", ""),
            "account_status": AccountStatus.ACTIVE.value,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        user_result = db.users.insert_one(user_doc)
        user_id = user_result.inserted_id

        patient_profile_doc = {
            "user_id": user_id,
            "full_name": data["full_name"],
            "phone": data.get("phone", ""),
            "date_of_birth": data.get("date_of_birth"),
            "gender": data.get("gender"),
            "blood_group": data.get("blood_group"),
            "emergency_contact": data.get("emergency_contact"),
            "created_at": now,
            "updated_at": now,
        }
        db.patient_profiles.insert_one(patient_profile_doc)

        token = create_access_token(
            identity=str(user_id),
            additional_claims={"role": UserRole.PATIENT.value, "email": email}
        )

        user_doc["_id"] = user_id
        profile_data = serialize_doc(patient_profile_doc)
        user_data = serialize_doc(user_doc)
        user_data.pop("password_hash", None)
        user_data["profile"] = profile_data

        return {"user": user_data, "token": token}

    @staticmethod
    def register_doctor(data: dict) -> dict:
        db = get_db()
        email = data["email"].strip().lower()

        if db.users.find_one({"email": email}):
            raise ConflictError("An account with this email already exists")

        qualifications = data["qualifications"]
        if isinstance(qualifications, str):
            qualifications = [q.strip() for q in qualifications.split(",") if q.strip()]

        now = datetime.now(timezone.utc)
        user_doc = {
            "email": email,
            "name": data["full_name"],
            "password_hash": hash_password(data["password"]),
            "role": UserRole.DOCTOR.value,
            "phone": data.get("phone", ""),
            "account_status": AccountStatus.ACTIVE.value,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        user_result = db.users.insert_one(user_doc)
        user_id = user_result.inserted_id

        # Standard initial availability schedule: Mon-Fri 09:00-17:00 with 30m slots
        default_availability = {
            "days_of_week": [1, 2, 3, 4, 5],  # Monday=1 ... Sunday=7
            "start_time": "09:00",
            "end_time": "17:00",
            "slot_duration_minutes": 30,
            "break_start_time": "13:00",
            "break_end_time": "14:00",
            "unavailable_dates": [],  # ['YYYY-MM-DD']
        }

        doctor_profile_doc = {
            "user_id": user_id,
            "full_name": data["full_name"],
            "specialization": data["specialization"].strip(),
            "qualifications": qualifications,
            "experience_years": int(data.get("experience_years", 0)),
            "consultation_fee": float(data.get("consultation_fee", 500.0)),
            "bio": data.get("bio", ""),
            "phone": data.get("phone", ""),
            "profile_image": "",
            "verification_status": DoctorVerificationStatus.PENDING.value,
            "availability_settings": default_availability,
            "created_at": now,
            "updated_at": now,
        }
        db.doctor_profiles.insert_one(doctor_profile_doc)

        token = create_access_token(
            identity=str(user_id),
            additional_claims={"role": UserRole.DOCTOR.value, "email": email}
        )

        user_doc["_id"] = user_id
        profile_data = serialize_doc(doctor_profile_doc)
        user_data = serialize_doc(user_doc)
        user_data.pop("password_hash", None)
        user_data["profile"] = profile_data

        return {"user": user_data, "token": token}

    @staticmethod
    def authenticate(email: str, password: str) -> dict:
        db = get_db()
        email = email.strip().lower()
        user = db.users.find_one({"email": email})

        if not user or not check_password(password, user.get("password_hash", "")):
            raise UnauthorizedError("Invalid email or password")

        status = user.get("account_status", AccountStatus.ACTIVE.value)
        if status == AccountStatus.SUSPENDED.value or user.get("is_active") is False:
            raise UnauthorizedError("Account has been suspended. Please contact platform support.")

        user_role = UserRole.normalize(user.get("role"))
        token = create_access_token(
            identity=str(user["_id"]),
            additional_claims={"role": user_role, "email": email}
        )

        user_data = serialize_doc(user)
        user_data.pop("password_hash", None)

        if user_role == UserRole.PATIENT.value:
            patient_profile = db.patient_profiles.find_one({"user_id": user["_id"]})
            user_data["profile"] = serialize_doc(patient_profile) if patient_profile else {}
        elif user_role == UserRole.DOCTOR.value:
            doctor_profile = db.doctor_profiles.find_one({"user_id": user["_id"]})
            user_data["profile"] = serialize_doc(doctor_profile) if doctor_profile else {}

        return {"user": user_data, "token": token}

    @staticmethod
    def get_user_profile(user_doc: dict) -> dict:
        db = get_db()
        user_data = serialize_doc(user_doc)
        user_data.pop("password_hash", None)

        role = UserRole.normalize(user_doc.get("role"))
        if role == UserRole.PATIENT.value:
            patient_profile = db.patient_profiles.find_one({"user_id": user_doc["_id"]})
            user_data["profile"] = serialize_doc(patient_profile) if patient_profile else {}
        elif role == UserRole.DOCTOR.value:
            doctor_profile = db.doctor_profiles.find_one({"user_id": user_doc["_id"]})
            user_data["profile"] = serialize_doc(doctor_profile) if doctor_profile else {}

        return user_data
