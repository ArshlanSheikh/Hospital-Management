from datetime import datetime, timezone
from app.extensions import get_db
from app.auth.service import hash_password
from app.common.constants import UserRole, AccountStatus, DoctorVerificationStatus


def seed_database():
    """Seed verified doctors, demo patient, and admin accounts into MongoDB for testing."""
    db = get_db()
    now = datetime.now(timezone.utc)

    # 1. Platform Admin
    if not db.users.find_one({"email": "admin@medicare.com"}):
        admin_doc = {
            "email": "admin@medicare.com",
            "name": "System Administrator",
            "password_hash": hash_password("Admin@123456"),
            "role": UserRole.ADMIN.value,
            "phone": "+1 555-0100",
            "account_status": AccountStatus.ACTIVE.value,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        db.users.insert_one(admin_doc)

    # 2. Demo Patient
    if not db.users.find_one({"email": "patient@example.com"}):
        patient_user = {
            "email": "patient@example.com",
            "name": "John Doe",
            "password_hash": hash_password("Patient@123456"),
            "role": UserRole.PATIENT.value,
            "phone": "+1 555-0199",
            "account_status": AccountStatus.ACTIVE.value,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        res = db.users.insert_one(patient_user)
        db.patient_profiles.insert_one({
            "user_id": res.inserted_id,
            "full_name": "John Doe",
            "phone": "+1 555-0199",
            "date_of_birth": "1990-05-15",
            "gender": "Male",
            "blood_group": "O+",
            "emergency_contact": "+1 555-0198",
            "allergies": ["Penicillin"],
            "created_at": now,
            "updated_at": now,
        })

    # 3. Doctors List
    doctors_seed_data = [
        {
            "email": "sarah.jenkins@medicare.com",
            "name": "Dr. Sarah Jenkins",
            "specialization": "Cardiology",
            "qualifications": ["MD - Harvard Medical School", "FACC Fellowship in Cardiology"],
            "experience_years": 14,
            "consultation_fee": 750.0,
            "bio": "Senior Interventional Cardiologist specializing in preventive cardiology, coronary artery disease, and heart rhythm management.",
            "phone": "+1 555-0101",
            "verification_status": DoctorVerificationStatus.VERIFIED.value,
            "availability": {
                "days_of_week": [1, 2, 3, 4, 5],
                "start_time": "09:00",
                "end_time": "17:00",
                "slot_duration_minutes": 30,
                "break_start_time": "13:00",
                "break_end_time": "14:00",
                "unavailable_dates": [],
            }
        },
        {
            "email": "marcus.reed@medicare.com",
            "name": "Dr. Marcus Reed",
            "specialization": "Pediatrics",
            "qualifications": ["MBBS", "MD (Pediatrics) - Johns Hopkins University"],
            "experience_years": 9,
            "consultation_fee": 500.0,
            "bio": "Compassionate pediatrician dedicated to childhood growth milestones, pediatric immunology, and preventive healthcare.",
            "phone": "+1 555-0102",
            "verification_status": DoctorVerificationStatus.VERIFIED.value,
            "availability": {
                "days_of_week": [1, 2, 3, 4, 5, 6],
                "start_time": "10:00",
                "end_time": "16:00",
                "slot_duration_minutes": 30,
                "break_start_time": "13:00",
                "break_end_time": "13:30",
                "unavailable_dates": [],
            }
        },
        {
            "email": "emily.chen@medicare.com",
            "name": "Dr. Emily Chen",
            "specialization": "Dermatology",
            "qualifications": ["MD - Stanford University", "Board Certified Dermatologist"],
            "experience_years": 11,
            "consultation_fee": 600.0,
            "bio": "Specialist in clinical and cosmetic dermatology, acne treatment, eczema, and skin cancer screenings.",
            "phone": "+1 555-0103",
            "verification_status": DoctorVerificationStatus.VERIFIED.value,
            "availability": {
                "days_of_week": [1, 2, 3, 4, 5],
                "start_time": "09:00",
                "end_time": "17:00",
                "slot_duration_minutes": 30,
                "break_start_time": "12:30",
                "break_end_time": "13:30",
                "unavailable_dates": [],
            }
        },
        {
            "email": "david.patel@medicare.com",
            "name": "Dr. David Patel",
            "specialization": "Neurology",
            "qualifications": ["MD - Columbia University", "DM (Neurology)"],
            "experience_years": 16,
            "consultation_fee": 900.0,
            "bio": "Consultant Neurologist specializing in neurodegenerative conditions, migraines, and movement disorders.",
            "phone": "+1 555-0104",
            "verification_status": DoctorVerificationStatus.VERIFIED.value,
            "availability": {
                "days_of_week": [2, 3, 4, 5, 6],
                "start_time": "09:30",
                "end_time": "16:30",
                "slot_duration_minutes": 45,
                "break_start_time": "13:00",
                "break_end_time": "14:00",
                "unavailable_dates": [],
            }
        },
        {
            "email": "robert.hayes@medicare.com",
            "name": "Dr. Robert Hayes",
            "specialization": "Orthopedics",
            "qualifications": ["MS (Orthopedics) - Mayo Clinic"],
            "experience_years": 8,
            "consultation_fee": 650.0,
            "bio": "Orthopedic surgeon specializing in sports injuries, knee arthroscopy, and joint preservation.",
            "phone": "+1 555-0105",
            "verification_status": DoctorVerificationStatus.PENDING.value,
            "availability": {
                "days_of_week": [1, 2, 3, 4, 5],
                "start_time": "09:00",
                "end_time": "17:00",
                "slot_duration_minutes": 30,
                "break_start_time": "13:00",
                "break_end_time": "14:00",
                "unavailable_dates": [],
            }
        }
    ]

    for d in doctors_seed_data:
        if not db.users.find_one({"email": d["email"]}):
            user_res = db.users.insert_one({
                "email": d["email"],
                "name": d["name"],
                "password_hash": hash_password("Doctor@123456"),
                "role": UserRole.DOCTOR.value,
                "phone": d["phone"],
                "account_status": AccountStatus.ACTIVE.value,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            })
            db.doctor_profiles.insert_one({
                "user_id": user_res.inserted_id,
                "full_name": d["name"],
                "specialization": d["specialization"],
                "qualifications": d["qualifications"],
                "experience_years": d["experience_years"],
                "consultation_fee": d["consultation_fee"],
                "bio": d["bio"],
                "phone": d["phone"],
                "profile_image": "",
                "verification_status": d["verification_status"],
                "availability_settings": d["availability"],
                "created_at": now,
                "updated_at": now,
            })
