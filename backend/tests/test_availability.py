from datetime import date, timedelta


def test_generate_slots_for_future_date(client, sample_doctor):
    future_date = (date.today() + timedelta(days=2)).isoformat()
    doctor_id = sample_doctor["id"]

    res = client.get(f"/api/v1/doctors/{doctor_id}/availability?date={future_date}")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    slots = data["data"]
    assert len(slots) > 0
    # Every slot has start_time, end_time, is_available
    assert "start_time" in slots[0]
    assert "is_available" in slots[0]
    assert slots[0]["is_available"] is True


def test_doctor_updates_availability_settings(client, doctor_headers, sample_doctor):
    res = client.post(
        "/api/v1/doctors/me/availability",
        headers=doctor_headers,
        json={
            "days_of_week": [1, 2, 3, 4],
            "start_time": "10:00",
            "end_time": "15:00",
            "slot_duration_minutes": 30,
            "break_start_time": "12:00",
            "break_end_time": "13:00"
        }
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    settings = data["data"]["availability_settings"]
    assert settings["start_time"] == "10:00"
    assert settings["end_time"] == "15:00"
    assert settings["days_of_week"] == [1, 2, 3, 4]


def test_doctor_unavailable_date(client, doctor_headers, sample_doctor):
    leave_date = (date.today() + timedelta(days=5)).isoformat()
    doctor_id = sample_doctor["id"]

    # Mark date as unavailable
    client.post(
        "/api/v1/doctors/me/availability",
        headers=doctor_headers,
        json={
            "days_of_week": [1, 2, 3, 4, 5, 6, 7],
            "start_time": "09:00",
            "end_time": "17:00",
            "slot_duration_minutes": 30,
            "unavailable_dates": [leave_date]
        }
    )

    # Slots query should now return empty
    res = client.get(f"/api/v1/doctors/{doctor_id}/availability?date={leave_date}")
    assert res.status_code == 200
    assert len(res.get_json()["data"]) == 0


def test_doctor_date_specific_override_slots_and_booking(client, doctor_headers, sample_doctor, patient_headers):
    override_date = (date.today() + timedelta(days=4)).isoformat()
    doctor_id = sample_doctor["id"]

    # Doctor sets a date-specific override with custom hours (10:00 to 12:00, 30 min duration, no break)
    res = client.post(
        "/api/v1/doctors/me/availability",
        headers=doctor_headers,
        json={
            "days_of_week": [1, 2, 3, 4, 5],
            "start_time": "09:00",
            "end_time": "17:00",
            "slot_duration_minutes": 30,
            "date_overrides": [
                {
                    "date": override_date,
                    "is_available": True,
                    "start_time": "10:00",
                    "end_time": "12:00",
                    "slot_duration_minutes": 30
                }
            ]
        }
    )
    assert res.status_code == 200

    # Query slots for this specific date -> Should yield exactly 4 slots: 10:00, 10:30, 11:00, 11:30
    slots_res = client.get(f"/api/v1/doctors/{doctor_id}/availability?date={override_date}")
    assert slots_res.status_code == 200
    slots = slots_res.get_json()["data"]
    assert len(slots) == 4
    times = [s["start_time"] for s in slots]
    assert times == ["10:00", "10:30", "11:00", "11:30"]

    # Patient books valid slot at 10:00 -> Success
    book_res = client.post("/api/v1/appointments", headers=patient_headers, json={
        "doctor_id": doctor_id,
        "appointment_date": override_date,
        "start_time": "10:00",
        "consultation_type": "in_person"
    })
    assert book_res.status_code == 201

    # Patient attempts to book outside the override consultation hours (e.g., 14:00) -> Rejected by backend
    invalid_res = client.post("/api/v1/appointments", headers=patient_headers, json={
        "doctor_id": doctor_id,
        "appointment_date": override_date,
        "start_time": "14:00",
        "consultation_type": "in_person"
    })
    assert invalid_res.status_code in [400, 422]


def test_doctor_date_specific_unavailable_override(client, doctor_headers, sample_doctor, patient_headers):
    # Find next Monday to ensure it is normally a working weekday
    today = date.today()
    days_ahead = (7 - today.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7
    monday_date = (today + timedelta(days=days_ahead)).isoformat()
    doctor_id = sample_doctor["id"]

    # Mark this Monday as unavailable via date_overrides
    res = client.post(
        "/api/v1/doctors/me/availability",
        headers=doctor_headers,
        json={
            "days_of_week": [1, 2, 3, 4, 5],
            "start_time": "09:00",
            "end_time": "17:00",
            "date_overrides": [
                {
                    "date": monday_date,
                    "is_available": False
                }
            ]
        }
    )
    assert res.status_code == 200

    # Availability query should return 0 slots
    slots_res = client.get(f"/api/v1/doctors/{doctor_id}/availability?date={monday_date}")
    assert slots_res.status_code == 200
    assert len(slots_res.get_json()["data"]) == 0

    # Booking attempt on this date must be rejected by backend
    book_res = client.post("/api/v1/appointments", headers=patient_headers, json={
        "doctor_id": doctor_id,
        "appointment_date": monday_date,
        "start_time": "10:00",
        "consultation_type": "in_person"
    })
    assert book_res.status_code in [400, 422]


def test_booking_conflict_interval_overlap_prevention(client, doctor_headers, sample_doctor, patient_headers):
    test_date = (date.today() + timedelta(days=6)).isoformat()
    doctor_id = sample_doctor["id"]

    # Ensure doctor available on all days
    client.post(
        "/api/v1/doctors/me/availability",
        headers=doctor_headers,
        json={
            "days_of_week": [1, 2, 3, 4, 5, 6, 7],
            "start_time": "09:00",
            "end_time": "17:00",
            "slot_duration_minutes": 30
        }
    )

    # 1. Book first appointment at 10:00
    res1 = client.post("/api/v1/appointments", headers=patient_headers, json={
        "doctor_id": doctor_id,
        "appointment_date": test_date,
        "start_time": "10:00",
        "consultation_type": "in_person"
    })
    assert res1.status_code == 201

    # 2. Duplicate booking attempt at 10:00 must fail with 409 Conflict
    res2 = client.post("/api/v1/appointments", headers=patient_headers, json={
        "doctor_id": doctor_id,
        "appointment_date": test_date,
        "start_time": "10:00",
        "consultation_type": "in_person"
    })
    assert res2.status_code == 409

    # 3. Adjacent non-overlapping booking at 10:30 succeeds
    res3 = client.post("/api/v1/appointments", headers=patient_headers, json={
        "doctor_id": doctor_id,
        "appointment_date": test_date,
        "start_time": "10:30",
        "consultation_type": "in_person"
    })
    assert res3.status_code == 201

    # 4. Check available slots with available_only=true -> 10:00 and 10:30 should not be returned
    avail_res = client.get(f"/api/v1/doctors/{doctor_id}/availability?date={test_date}&available_only=true")
    assert avail_res.status_code == 200
    avail_times = [s["start_time"] for s in avail_res.get_json()["data"]]
    assert "10:00" not in avail_times
    assert "10:30" not in avail_times
    assert "11:00" in avail_times
