from app.notifications.service import NotificationService


def test_notification_creation_and_list(client, sample_patient, patient_headers):
    # Direct notification creation
    NotificationService.send(
        user_id=sample_patient["id"],
        title="Welcome",
        message="Welcome to MediPulse!",
        notification_type="system"
    )

    res = client.get("/api/v1/notifications", headers=patient_headers)
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert len(data["notifications"]) == 1
    assert data["unread_count"] == 1
    assert data["notifications"][0]["title"] == "Welcome"
    assert data["notifications"][0]["is_read"] is False


def test_mark_notification_as_read(client, sample_patient, patient_headers):
    notif = NotificationService.send(
        user_id=sample_patient["id"],
        title="Appointment Alert",
        message="Your appointment is scheduled",
        notification_type="booking"
    )
    notif_id = notif["id"]

    res = client.patch(f"/api/v1/notifications/{notif_id}/read", headers=patient_headers)
    assert res.status_code == 200
    assert res.get_json()["data"]["is_read"] is True

    # Check unread count is now 0
    list_res = client.get("/api/v1/notifications", headers=patient_headers)
    assert list_res.get_json()["data"]["unread_count"] == 0


def test_mark_all_read(client, sample_patient, patient_headers):
    NotificationService.send(sample_patient["id"], "Note 1", "Message 1")
    NotificationService.send(sample_patient["id"], "Note 2", "Message 2")

    res = client.patch("/api/v1/notifications/mark-all-read", headers=patient_headers)
    assert res.status_code == 200
    assert res.get_json()["data"]["marked_read_count"] == 2

    list_res = client.get("/api/v1/notifications", headers=patient_headers)
    assert list_res.get_json()["data"]["unread_count"] == 0
