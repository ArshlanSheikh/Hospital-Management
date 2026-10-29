from datetime import date, timedelta


def test_book_appointment_success(client, patient_headers, sample_doctor):
    target_date = (date.today() + timedelta(days=3)).isoformat()
    doctor_id = sample_doctor["id"]

    res = client.post(
        "/api/v1/appointments",
        headers=patient_headers,
        json={
            "doctor_id": doctor_id,
            "appointment_date": target_date,
            "start_time": "10:00",
            "consultation_type": "in_person",
            "reason": "Chest pain follow-up"
        }
    )
    assert res.status_code == 201
    data = res.get_json()
    assert data["success"] is True
    appt = data["data"]
    assert appt["appointment_date"] == target_date
    assert appt["start_time"] == "10:00"
    assert appt["appointment_status"] == "confirmed"
    assert appt["consultation_fee"] == 600.0


def test_double_booking_prevention(client, patient_headers, sample_doctor):
    target_date = (date.today() + timedelta(days=4)).isoformat()
    doctor_id = sample_doctor["id"]

    payload = {
        "doctor_id": doctor_id,
        "appointment_date": target_date,
        "start_time": "11:00",
        "consultation_type": "in_person"
    }

    # First booking succeeds
    res1 = client.post("/api/v1/appointments", headers=patient_headers, json=payload)
    assert res1.status_code == 201

    # Second booking for identical slot must be blocked (409 Conflict)
    res2 = client.post("/api/v1/appointments", headers=patient_headers, json=payload)
    assert res2.status_code == 409
    data2 = res2.get_json()
    assert data2["success"] is False
    assert "already been booked" in data2["message"]


def test_slot_status_updates_after_booking(client, patient_headers, sample_doctor):
    target_date = (date.today() + timedelta(days=2)).isoformat()
    doctor_id = sample_doctor["id"]

    # Book 10:30 slot
    client.post(
        "/api/v1/appointments",
        headers=patient_headers,
        json={
            "doctor_id": doctor_id,
            "appointment_date": target_date,
            "start_time": "10:30",
            "consultation_type": "in_person"
        }
    )

    # Check slots
    res = client.get(f"/api/v1/doctors/{doctor_id}/availability?date={target_date}")
    slots = res.get_json()["data"]
    slot_1030 = next((s for s in slots if s["start_time"] == "10:30"), None)
    assert slot_1030 is not None
    assert slot_1030["is_available"] is False


def test_unauthorized_appointment_access(client, sample_doctor, patient_headers):
    target_date = (date.today() + timedelta(days=2)).isoformat()
    doctor_id = sample_doctor["id"]

    # Patient 1 books
    res = client.post(
        "/api/v1/appointments",
        headers=patient_headers,
        json={
            "doctor_id": doctor_id,
            "appointment_date": target_date,
            "start_time": "09:30"
        }
    )
    appt_id = res.get_json()["data"]["id"]

    # Register Patient 2
    p2_res = client.post("/api/v1/auth/register/patient", json={
        "email": "other.patient@test.com",
        "password": "Password123",
        "full_name": "Other Patient"
    })
    p2_token = p2_res.get_json()["data"]["token"]
    p2_headers = {"Authorization": f"Bearer {p2_token}"}

    # Patient 2 tries to access Patient 1's appointment
    access_res = client.get(f"/api/v1/appointments/{appt_id}", headers=p2_headers)
    assert access_res.status_code == 403

    # Patient 2 tries to cancel Patient 1's appointment
    cancel_res = client.post(f"/api/v1/appointments/{appt_id}/cancel", headers=p2_headers, json={})
    assert cancel_res.status_code == 403


def test_cancel_appointment(client, patient_headers, sample_doctor):
    target_date = (date.today() + timedelta(days=3)).isoformat()
    doctor_id = sample_doctor["id"]

    # Book
    res = client.post(
        "/api/v1/appointments",
        headers=patient_headers,
        json={
            "doctor_id": doctor_id,
            "appointment_date": target_date,
            "start_time": "14:30"
        }
    )
    appt_id = res.get_json()["data"]["id"]

    # Cancel
    cancel_res = client.post(
        f"/api/v1/appointments/{appt_id}/cancel",
        headers=patient_headers,
        json={"reason": "Patient cannot attend"}
    )
    assert cancel_res.status_code == 200
    assert cancel_res.get_json()["data"]["appointment_status"] == "cancelled"

    # Cancelling again fails with 422
    cancel_again = client.post(
        f"/api/v1/appointments/{appt_id}/cancel",
        headers=patient_headers,
        json={"reason": "Try again"}
    )
    assert cancel_again.status_code == 422
