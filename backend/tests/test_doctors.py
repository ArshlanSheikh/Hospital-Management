def test_list_doctors_public(client, sample_doctor):
    res = client.get("/api/v1/doctors")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert len(data["data"]["doctors"]) >= 1
    assert data["data"]["doctors"][0]["specialization"] == "Cardiology"


def test_doctor_search_filter(client, sample_doctor):
    # Match search
    res = client.get("/api/v1/doctors?specialization=Cardiology")
    assert res.status_code == 200
    assert len(res.get_json()["data"]["doctors"]) == 1

    # Non-match search
    res2 = client.get("/api/v1/doctors?specialization=Neurology")
    assert res2.status_code == 200
    assert len(res2.get_json()["data"]["doctors"]) == 0


def test_doctor_update_own_profile(client, doctor_headers):
    res = client.patch(
        "/api/v1/doctors/me",
        headers=doctor_headers,
        json={
            "bio": "Updated specialized clinical cardiology bio.",
            "consultation_fee": 650.0
        }
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["data"]["consultation_fee"] == 650.0
    assert data["data"]["bio"] == "Updated specialized clinical cardiology bio."


def test_admin_verifies_doctor(client, admin_headers):
    # Register pending doctor
    reg_res = client.post("/api/v1/auth/register/doctor", json={
        "email": "dr.pending@test.com",
        "password": "Password123",
        "full_name": "Dr. Pending Review",
        "specialization": "Dermatology",
        "qualifications": "MD Dermatology",
        "consultation_fee": 400.0
    })
    doctor_id = reg_res.get_json()["data"]["user"]["profile"]["id"]

    # Verify doctor via admin endpoint
    res = client.patch(
        f"/api/v1/admin/doctors/{doctor_id}/verification",
        headers=admin_headers,
        json={"status": "verified"}
    )
    assert res.status_code == 200
    assert res.get_json()["data"]["verification_status"] == "verified"

    # Now verify doctor appears in public search
    pub_res = client.get("/api/v1/doctors?specialization=Dermatology")
    assert pub_res.status_code == 200
    assert len(pub_res.get_json()["data"]["doctors"]) == 1
