from datetime import date, timedelta


def _create_consultation_appointment(client, doctor_id, patient_headers):
    future_date = (date.today() + timedelta(days=2)).strftime("%Y-%m-%d")
    res = client.post("/api/v1/appointments", headers=patient_headers, json={
        "doctor_id": doctor_id,
        "appointment_date": future_date,
        "start_time": "11:00",
        "consultation_type": "video",
        "reason": "General Health Check"
    })
    assert res.status_code == 201
    return res.get_json()["data"]


def test_doctor_issues_prescription_success(client, sample_doctor, doctor_headers, patient_headers):
    appt = _create_consultation_appointment(client, sample_doctor["id"], patient_headers)

    rx_payload = {
        "appointment_id": appt["id"],
        "diagnosis": "Hypertension Stage 1",
        "vital_signs": {"blood_pressure": "135/85", "pulse": "74 bpm"},
        "medicines": [
            {
                "name": "Amlodipine",
                "dosage": "5 mg",
                "frequency": "Once daily",
                "duration": "30 days",
                "instructions": "Take in the morning with water"
            }
        ],
        "advice_notes": "Reduce sodium intake, monitor BP weekly.",
        "follow_up_date": (date.today() + timedelta(days=30)).strftime("%Y-%m-%d")
    }

    res = client.post("/api/v1/prescriptions", headers=doctor_headers, json=rx_payload)
    assert res.status_code == 201
    data = res.get_json()["data"]
    assert "prescription_number" in data
    assert data["prescription_number"].startswith("RX-")
    assert len(data["medicines"]) == 1
    assert data["doctor_name"] == "Dr. John Smith"


def test_patient_views_own_prescription(client, sample_doctor, doctor_headers, patient_headers):
    appt = _create_consultation_appointment(client, sample_doctor["id"], patient_headers)

    client.post("/api/v1/prescriptions", headers=doctor_headers, json={
        "appointment_id": appt["id"],
        "diagnosis": "Seasonal Allergies",
        "medicines": [{"name": "Cetirizine", "dosage": "10 mg", "frequency": "Bedtime", "duration": "7 days"}]
    })

    # Patient lists prescriptions
    res = client.get("/api/v1/prescriptions/patient/me", headers=patient_headers)
    assert res.status_code == 200
    rxs = res.get_json()["data"]["prescriptions"]
    assert len(rxs) == 1
    assert rxs[0]["diagnosis"] == "Seasonal Allergies"


def test_patient_cannot_issue_prescription(client, sample_doctor, patient_headers):
    appt = _create_consultation_appointment(client, sample_doctor["id"], patient_headers)

    res = client.post("/api/v1/prescriptions", headers=patient_headers, json={
        "appointment_id": appt["id"],
        "diagnosis": "Self diagnosed",
        "medicines": [{"name": "Aspirin", "dosage": "100 mg"}]
    })
    # Patient role blocked
    assert res.status_code == 403
