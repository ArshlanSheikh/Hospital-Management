from datetime import date, timedelta


def _book_appointment(client, doctor_id, patient_headers):
    future_date = (date.today() + timedelta(days=2)).strftime("%Y-%m-%d")
    res = client.post("/api/v1/appointments", headers=patient_headers, json={
        "doctor_id": doctor_id,
        "appointment_date": future_date,
        "start_time": "10:00",
        "consultation_type": "video",
        "reason": "Cardiology consultation"
    })
    assert res.status_code == 201
    return res.get_json()["data"]


def test_create_payment_order_success(client, sample_doctor, patient_headers):
    appt = _book_appointment(client, sample_doctor["id"], patient_headers)

    res = client.post("/api/v1/payments/create-order", headers=patient_headers, json={
        "appointment_id": appt["id"]
    })
    assert res.status_code == 201
    data = res.get_json()["data"]
    assert "order_id" in data
    assert data["amount"] == 600.0
    assert data["amount_paise"] == 60000
    assert data["currency"] == "INR"


def test_cannot_pay_for_cancelled_appointment(client, sample_doctor, patient_headers):
    appt = _book_appointment(client, sample_doctor["id"], patient_headers)

    # Cancel appointment
    client.post(f"/api/v1/appointments/{appt['id']}/cancel", headers=patient_headers, json={
        "reason": "Change of plans"
    })

    # Try to create payment order
    res = client.post("/api/v1/payments/create-order", headers=patient_headers, json={
        "appointment_id": appt["id"]
    })
    assert res.status_code == 409


def test_verify_payment_success(client, sample_doctor, patient_headers):
    appt = _book_appointment(client, sample_doctor["id"], patient_headers)

    order_res = client.post("/api/v1/payments/create-order", headers=patient_headers, json={
        "appointment_id": appt["id"]
    })
    order_data = order_res.get_json()["data"]
    order_id = order_data["order_id"]

    # Verify using mock signature
    verify_res = client.post("/api/v1/payments/verify", headers=patient_headers, json={
        "razorpay_order_id": order_id,
        "razorpay_payment_id": "pay_mock_123456",
        "razorpay_signature": "mock_signature_test"
    })
    assert verify_res.status_code == 200
    payment_data = verify_res.get_json()["data"]
    assert payment_data["status"] == "completed"
    assert payment_data["payment_id"] == "pay_mock_123456"

    # Check appointment status updated to completed payment
    appt_res = client.get(f"/api/v1/appointments/{appt['id']}", headers=patient_headers)
    assert appt_res.get_json()["data"]["payment_status"] == "completed"


def test_verify_payment_invalid_signature(client, sample_doctor, patient_headers):
    appt = _book_appointment(client, sample_doctor["id"], patient_headers)

    order_res = client.post("/api/v1/payments/create-order", headers=patient_headers, json={
        "appointment_id": appt["id"]
    })
    order_id = order_res.get_json()["data"]["order_id"]

    # Invalid signature
    verify_res = client.post("/api/v1/payments/verify", headers=patient_headers, json={
        "razorpay_order_id": order_id,
        "razorpay_payment_id": "pay_mock_123456",
        "razorpay_signature": "invalid_forged_signature"
    })
    assert verify_res.status_code in [400, 422]


def test_idempotent_payment_verification(client, sample_doctor, patient_headers):
    appt = _book_appointment(client, sample_doctor["id"], patient_headers)

    order_res = client.post("/api/v1/payments/create-order", headers=patient_headers, json={
        "appointment_id": appt["id"]
    })
    order_id = order_res.get_json()["data"]["order_id"]

    # First verify
    res1 = client.post("/api/v1/payments/verify", headers=patient_headers, json={
        "razorpay_order_id": order_id,
        "razorpay_payment_id": "pay_mock_first",
        "razorpay_signature": "mock_signature_test"
    })
    assert res1.status_code == 200

    # Second verify (retry or duplicate submission)
    res2 = client.post("/api/v1/payments/verify", headers=patient_headers, json={
        "razorpay_order_id": order_id,
        "razorpay_payment_id": "pay_mock_first",
        "razorpay_signature": "mock_signature_test"
    })
    assert res2.status_code == 200
    assert res2.get_json()["data"]["status"] == "completed"
