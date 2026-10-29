def test_patient_registration_success(client):
    res = client.post("/api/v1/auth/register/patient", json={
        "email": "newpatient@test.com",
        "password": "SecurePassword123",
        "full_name": "Alice Wonderland",
        "phone": "+1 555-4321",
        "gender": "Female"
    })
    assert res.status_code == 201
    data = res.get_json()
    assert data["success"] is True
    assert data["data"]["user"]["email"] == "newpatient@test.com"
    assert data["data"]["user"]["role"] == "patient"
    assert "token" in data["data"]


def test_doctor_registration_success(client):
    res = client.post("/api/v1/auth/register/doctor", json={
        "email": "dr.watson@test.com",
        "password": "DoctorPassword123",
        "full_name": "Dr. John Watson",
        "specialization": "General Physician",
        "qualifications": "MBBS, MD",
        "experience_years": 12,
        "consultation_fee": 550.0
    })
    assert res.status_code == 201
    data = res.get_json()
    assert data["success"] is True
    assert data["data"]["user"]["role"] == "doctor"
    assert data["data"]["user"]["profile"]["verification_status"] == "pending"


def test_patient_registration_duplicate_email(client):
    payload = {
        "email": "dup@test.com",
        "password": "Password123",
        "full_name": "First User"
    }
    client.post("/api/v1/auth/register/patient", json=payload)
    res2 = client.post("/api/v1/auth/register/patient", json=payload)
    assert res2.status_code == 409
    assert res2.get_json()["success"] is False


def test_login_valid_credentials(client, sample_patient):
    res = client.post("/api/v1/auth/login", json={
        "email": "patient.jane@test.com",
        "password": "PatientPass123"
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "token" in data["data"]


def test_login_invalid_password(client, sample_patient):
    res = client.post("/api/v1/auth/login", json={
        "email": "patient.jane@test.com",
        "password": "WrongPassword!"
    })
    assert res.status_code == 401
    assert res.get_json()["success"] is False


def test_get_me_protected(client, patient_headers):
    # Authenticated
    res = client.get("/api/v1/auth/me", headers=patient_headers)
    assert res.status_code == 200
    assert res.get_json()["data"]["email"] == "patient.jane@test.com"

    # Unauthenticated
    res_unauth = client.get("/api/v1/auth/me")
    assert res_unauth.status_code == 401
