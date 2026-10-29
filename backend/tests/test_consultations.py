from datetime import date, timedelta


def _create_online_appointment(client, doctor_id, patient_headers):
    future_date = (date.today() + timedelta(days=2)).strftime("%Y-%m-%d")
    res = client.post("/api/v1/appointments", headers=patient_headers, json={
        "doctor_id": doctor_id,
        "appointment_date": future_date,
        "start_time": "14:00",
        "consultation_type": "video",
        "reason": "Telehealth review"
    })
    assert res.status_code == 201
    return res.get_json()["data"]


def test_get_consultation_session_authorized(client, sample_doctor, doctor_headers, patient_headers):
    appt = _create_online_appointment(client, sample_doctor["id"], patient_headers)

    # Patient accesses session
    p_res = client.get(f"/api/v1/consultations/{appt['id']}/session", headers=patient_headers)
    assert p_res.status_code == 200
    p_data = p_res.get_json()["data"]
    assert "room_name" in p_data
    assert p_data["user_role"] == "patient"
    assert p_data["provider"] == "jitsi"

    # Doctor accesses session
    d_res = client.get(f"/api/v1/consultations/{appt['id']}/session", headers=doctor_headers)
    assert d_res.status_code == 200
    d_data = d_res.get_json()["data"]
    assert d_data["room_name"] == p_data["room_name"]  # Both join same secure room
    assert d_data["user_role"] == "doctor"


def test_unauthorized_user_cannot_access_session(client, sample_doctor, patient_headers):
    appt = _create_online_appointment(client, sample_doctor["id"], patient_headers)

    # Register 2nd patient
    reg_res = client.post("/api/v1/auth/register/patient", json={
        "email": "stranger.patient@test.com",
        "password": "Password@123",
        "full_name": "Stranger Patient"
    })
    p2_token = reg_res.get_json()["data"]["token"]
    p2_headers = {"Authorization": f"Bearer {p2_token}"}

    # Stranger tries to join session
    res = client.get(f"/api/v1/consultations/{appt['id']}/session", headers=p2_headers)
    assert res.status_code == 403


def test_doctor_completes_consultation(client, sample_doctor, doctor_headers, patient_headers):
    appt = _create_online_appointment(client, sample_doctor["id"], patient_headers)

    # Doctor completes call
    res = client.post(f"/api/v1/consultations/{appt['id']}/complete", headers=doctor_headers, json={
        "notes": "Patient advised to continue present medications."
    })
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert data["consultation_status"] == "completed"

    # Verify appointment is now completed
    appt_res = client.get(f"/api/v1/appointments/{appt['id']}", headers=patient_headers)
    assert appt_res.get_json()["data"]["appointment_status"] == "completed"
