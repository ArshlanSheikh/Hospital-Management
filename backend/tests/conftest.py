import pytest
from datetime import datetime, timezone
from bson import ObjectId
from app import create_app
from app.extensions import get_db
from app.auth.service import hash_password
from app.common.constants import UserRole, AccountStatus, DoctorVerificationStatus


@pytest.fixture
def app():
    app = create_app("testing")
    with app.app_context():
        db = get_db()
        # Clean collections before test run
        db.users.delete_many({})
        db.doctor_profiles.delete_many({})
        db.patient_profiles.delete_many({})
        db.appointments.delete_many({})
        db.notifications.delete_many({})
        db.payments.delete_many({})
        db.prescriptions.delete_many({})
        yield app
        # Clean up after test run
        db.users.delete_many({})
        db.doctor_profiles.delete_many({})
        db.patient_profiles.delete_many({})
        db.appointments.delete_many({})
        db.notifications.delete_many({})
        db.payments.delete_many({})
        db.prescriptions.delete_many({})


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def runner(app):
    return app.test_cli_runner()


@pytest.fixture
def platform_admin(app):
    db = get_db()
    now = datetime.now(timezone.utc)
    admin_doc = {
        "email": "superadmin@medicare.com",
        "name": "Super Admin",
        "password_hash": hash_password("AdminPass123"),
        "role": UserRole.ADMIN.value,
        "account_status": AccountStatus.ACTIVE.value,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    res = db.users.insert_one(admin_doc)
    admin_doc["_id"] = res.inserted_id
    return admin_doc


@pytest.fixture
def admin_headers(client, platform_admin):
    res = client.post("/api/v1/auth/login", json={
        "email": "superadmin@medicare.com",
        "password": "AdminPass123"
    })
    token = res.get_json()["data"]["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_doctor(app):
    db = get_db()
    now = datetime.now(timezone.utc)
    user_doc = {
        "email": "dr.smith@test.com",
        "name": "Dr. John Smith",
        "password_hash": hash_password("DoctorPass123"),
        "role": UserRole.DOCTOR.value,
        "account_status": AccountStatus.ACTIVE.value,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    user_res = db.users.insert_one(user_doc)

    doctor_profile = {
        "user_id": user_res.inserted_id,
        "full_name": "Dr. John Smith",
        "specialization": "Cardiology",
        "qualifications": ["MD Cardiology"],
        "experience_years": 10,
        "consultation_fee": 600.0,
        "bio": "Experienced cardiologist.",
        "phone": "+1 555-0155",
        "verification_status": DoctorVerificationStatus.VERIFIED.value,
        "availability_settings": {
            "days_of_week": [1, 2, 3, 4, 5, 6, 7],  # Available all days for test flexibility
            "start_time": "09:00",
            "end_time": "17:00",
            "slot_duration_minutes": 30,
            "break_start_time": "13:00",
            "break_end_time": "14:00",
            "unavailable_dates": [],
        },
        "created_at": now,
        "updated_at": now,
    }
    doc_res = db.doctor_profiles.insert_one(doctor_profile)
    doctor_profile["_id"] = doc_res.inserted_id
    doctor_profile["id"] = str(doc_res.inserted_id)
    return doctor_profile


@pytest.fixture
def doctor_headers(client, sample_doctor):
    res = client.post("/api/v1/auth/login", json={
        "email": "dr.smith@test.com",
        "password": "DoctorPass123"
    })
    token = res.get_json()["data"]["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_patient(app):
    db = get_db()
    now = datetime.now(timezone.utc)
    user_doc = {
        "email": "patient.jane@test.com",
        "name": "Jane Doe",
        "password_hash": hash_password("PatientPass123"),
        "role": UserRole.PATIENT.value,
        "account_status": AccountStatus.ACTIVE.value,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    user_res = db.users.insert_one(user_doc)
    user_doc["_id"] = user_res.inserted_id
    user_doc["id"] = str(user_res.inserted_id)

    db.patient_profiles.insert_one({
        "user_id": user_res.inserted_id,
        "full_name": "Jane Doe",
        "phone": "555-0199",
        "gender": "Female",
        "created_at": now,
        "updated_at": now,
    })
    return user_doc


@pytest.fixture
def patient_headers(client, sample_patient):
    res = client.post("/api/v1/auth/login", json={
        "email": "patient.jane@test.com",
        "password": "PatientPass123"
    })
    token = res.get_json()["data"]["token"]
    return {"Authorization": f"Bearer {token}"}
