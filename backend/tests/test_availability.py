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
