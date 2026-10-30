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
    assert p_data["provider"] == "webrtc"
    assert "ice_servers" in p_data
    assert len(p_data["ice_servers"]) > 0

    # Doctor accesses session
    d_res = client.get(f"/api/v1/consultations/{appt['id']}/session", headers=doctor_headers)
    assert d_res.status_code == 200
    d_data = d_res.get_json()["data"]
    assert d_data["room_name"] == p_data["room_name"]  # Both join same secure room
    assert d_data["user_role"] == "doctor"
    assert d_data["provider"] == "webrtc"


def test_consultation_webrtc_signaling_exchange(client, sample_doctor, doctor_headers, patient_headers):
    appt = _create_online_appointment(client, sample_doctor["id"], patient_headers)
    appt_id = appt["id"]

    # 1. Patient announces join
    p_join = client.post(f"/api/v1/consultations/{appt_id}/signal", headers=patient_headers, json={
        "type": "join",
        "payload": {"role": "patient"}
    })
    assert p_join.status_code == 200
    assert p_join.get_json()["data"]["type"] == "join"

    # 2. Doctor polls and receives patient join signal
    d_signals = client.get(f"/api/v1/consultations/{appt_id}/signals?since=0", headers=doctor_headers)
    assert d_signals.status_code == 200
    signals = d_signals.get_json()["data"]["signals"]
    assert len(signals) == 1
    assert signals[0]["type"] == "join"
    assert signals[0]["sender_role"] == "patient"

    # 3. Doctor dispatches WebRTC SDP offer
    d_offer = client.post(f"/api/v1/consultations/{appt_id}/signal", headers=doctor_headers, json={
        "type": "offer",
        "payload": {"sdp": "v=0\r\no=doctor 123 456 IN IP4 127.0.0.1\r\ns=-\r\n", "type": "offer"}
    })
    assert d_offer.status_code == 200

    # 4. Patient polls and receives offer
    p_signals = client.get(f"/api/v1/consultations/{appt_id}/signals?since=0", headers=patient_headers)
    assert p_signals.status_code == 200
    p_sigs = p_signals.get_json()["data"]["signals"]
    assert any(s["type"] == "offer" for s in p_sigs)

    # 5. Patient sends SDP answer and ICE candidate
    p_answer = client.post(f"/api/v1/consultations/{appt_id}/signal", headers=patient_headers, json={
        "type": "answer",
        "payload": {"sdp": "v=0\r\no=patient 789 012 IN IP4 127.0.0.1\r\ns=-\r\n", "type": "answer"}
    })
    assert p_answer.status_code == 200

    p_cand = client.post(f"/api/v1/consultations/{appt_id}/signal", headers=patient_headers, json={
        "type": "ice-candidate",
        "payload": {"candidate": "candidate:1 1 UDP 2130706431 192.168.1.1 50000 typ host"}
    })
    assert p_cand.status_code == 200

    # 6. Doctor retrieves answer and ICE candidate
    d_poll2 = client.get(f"/api/v1/consultations/{appt_id}/signals?since={d_signals.get_json()['data']['latest_timestamp_ms']}", headers=doctor_headers)
    assert d_poll2.status_code == 200
    new_sigs = d_poll2.get_json()["data"]["signals"]
    types = [s["type"] for s in new_sigs]
    assert "answer" in types
    assert "ice-candidate" in types

    # 7. Reset signal buffer
    reset_res = client.post(f"/api/v1/consultations/{appt_id}/signal/reset", headers=doctor_headers)
    assert reset_res.status_code == 200
    fresh_poll = client.get(f"/api/v1/consultations/{appt_id}/signals?since=0", headers=doctor_headers)
    assert len(fresh_poll.get_json()["data"]["signals"]) == 0


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

    # Stranger cannot send signal
    sig_res = client.post(f"/api/v1/consultations/{appt['id']}/signal", headers=p2_headers, json={
        "type": "join"
    })
    assert sig_res.status_code == 403


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


def test_doctor_initiates_call_patient_cannot_initiate(client, sample_doctor, doctor_headers, patient_headers):
    appt = _create_online_appointment(client, sample_doctor["id"], patient_headers)
    appt_id = appt["id"]

    # 1. Patient tries to initiate call -> Blocked with 403
    p_init = client.post(f"/api/v1/consultations/{appt_id}/initiate-call", headers=patient_headers)
    assert p_init.status_code == 403

    # 2. Doctor initiates call -> Succeeded
    d_init = client.post(f"/api/v1/consultations/{appt_id}/initiate-call", headers=doctor_headers)
    assert d_init.status_code == 200
    assert d_init.get_json()["data"]["call_status"] == "calling"


def test_patient_detects_incoming_call_and_accepts(client, sample_doctor, doctor_headers, patient_headers):
    appt = _create_online_appointment(client, sample_doctor["id"], patient_headers)
    appt_id = appt["id"]

    # Before doctor calls, no incoming call
    before_poll = client.get("/api/v1/consultations/incoming", headers=patient_headers)
    assert before_poll.status_code == 200
    assert before_poll.get_json()["data"]["incoming_call"] is None

    # Doctor initiates call
    d_init = client.post(f"/api/v1/consultations/{appt_id}/initiate-call", headers=doctor_headers)
    assert d_init.status_code == 200

    # Patient polls incoming call -> finds active incoming call
    p_poll = client.get("/api/v1/consultations/incoming", headers=patient_headers)
    assert p_poll.status_code == 200
    incoming = p_poll.get_json()["data"]["incoming_call"]
    assert incoming is not None
    assert incoming["appointment_id"] == appt_id
    assert "Dr." in incoming["doctor_name"]

    # Patient accepts call
    p_accept = client.post(f"/api/v1/consultations/{appt_id}/accept-call", headers=patient_headers)
    assert p_accept.status_code == 200
    session_data = p_accept.get_json()["data"]
    assert session_data["provider"] == "webrtc"

    # Patient polls incoming call again -> ringing has ceased
    after_poll = client.get("/api/v1/consultations/incoming", headers=patient_headers)
    assert after_poll.status_code == 200
    assert after_poll.get_json()["data"]["incoming_call"] is None

