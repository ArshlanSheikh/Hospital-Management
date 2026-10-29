from datetime import date, timedelta


def test_reschedule_appointment_success(client, sample_doctor, patient_headers):
    d1 = (date.today() + timedelta(days=2)).strftime("%Y-%m-%d")
    d2 = (date.today() + timedelta(days=3)).strftime("%Y-%m-%d")

    res = client.post("/api/v1/appointments", headers=patient_headers, json={
        "doctor_id": sample_doctor["id"],
        "appointment_date": d1,
        "start_time": "10:00",
        "consultation_type": "in_person",
        "reason": "Consultation"
    })
    appt = res.get_json()["data"]

    # Reschedule to d2 at 11:00
    reschedule_res = client.post(f"/api/v1/appointments/{appt['id']}/reschedule", headers=patient_headers, json={
        "appointment_date": d2,
        "start_time": "11:00"
    })
    assert reschedule_res.status_code == 200
    updated = reschedule_res.get_json()["data"]
    assert updated["appointment_date"] == d2
    assert updated["start_time"] == "11:00"
    assert updated["end_time"] == "11:30"


def test_reschedule_slot_conflict_rejected(client, sample_doctor, patient_headers):
    d = (date.today() + timedelta(days=2)).strftime("%Y-%m-%d")

    # Appt 1 at 10:00
    res1 = client.post("/api/v1/appointments", headers=patient_headers, json={
        "doctor_id": sample_doctor["id"],
        "appointment_date": d,
        "start_time": "10:00",
        "consultation_type": "in_person",
        "reason": "Checkup 1"
    })
    appt1 = res1.get_json()["data"]

    # Appt 2 at 11:00
    res2 = client.post("/api/v1/appointments", headers=patient_headers, json={
        "doctor_id": sample_doctor["id"],
        "appointment_date": d,
        "start_time": "11:00",
        "consultation_type": "in_person",
        "reason": "Checkup 2"
    })
    appt2 = res2.get_json()["data"]

    # Try to reschedule Appt 2 to 10:00 (which is already booked by Appt 1)
    conflict_res = client.post(f"/api/v1/appointments/{appt2['id']}/reschedule", headers=patient_headers, json={
        "appointment_date": d,
        "start_time": "10:00"
    })
    assert conflict_res.status_code == 409


def test_reschedule_to_past_date_rejected(client, sample_doctor, patient_headers):
    d = (date.today() + timedelta(days=2)).strftime("%Y-%m-%d")

    res = client.post("/api/v1/appointments", headers=patient_headers, json={
        "doctor_id": sample_doctor["id"],
        "appointment_date": d,
        "start_time": "10:00",
        "consultation_type": "in_person"
    })
    appt = res.get_json()["data"]

    past_date = (date.today() - timedelta(days=2)).strftime("%Y-%m-%d")
    fail_res = client.post(f"/api/v1/appointments/{appt['id']}/reschedule", headers=patient_headers, json={
        "appointment_date": past_date,
        "start_time": "10:00"
    })
    assert fail_res.status_code in [400, 422]
