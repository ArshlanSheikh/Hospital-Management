# Automated Testing Report & Test Plan (Phase V1)

- **Test Runner**: `pytest 8.2.2`
- **Platform**: Windows 11 / Python 3.13.5
- **Database**: MongoDB Server 8.0.12 (`hospital_consultation_test`)
- **Total Test Cases**: **18**
- **Pass Rate**: **100% (18 passed in ~19s)**

---

## 1. Test Isolation Architecture

- Automated tests execute against an isolated test database (`hospital_consultation_test`) declared in `TestingConfig`.
- A Pytest fixture (`clean_db` in `backend/tests/conftest.py`) automatically drops all collections (`users`, `doctor_profiles`, `patient_profiles`, `appointments`) before each test execution, ensuring zero side-effects between test cases.
- Database indexes are verified and rebuilt per test session.

---

## 2. Test Suites Breakdown

### 2.1 `tests/test_auth.py` (Authentication & Identity)
1. **`test_patient_registration_success`**:
   - Registers a new patient.
   - Asserts password hashing with bcrypt, patient profile creation, and JWT access token issuance.
2. **`test_patient_registration_duplicate_email`**:
   - Verifies that attempting to register an existing email returns HTTP `409 Conflict`.
3. **`test_login_valid_credentials`**:
   - Tests authentication against valid credentials and asserts JWT token and user envelope response.
4. **`test_login_invalid_password`**:
   - Verifies that incorrect passwords return HTTP `401 Unauthorized`.
5. **`test_get_me_protected`**:
   - Asserts that protected route `/api/v1/auth/me` rejects unauthenticated requests with HTTP `401 Unauthorized`.

### 2.2 `tests/test_doctors.py` (Doctor Management & Public Discovery)
6. **`test_list_doctors_public`**:
   - Asserts that only `verified` doctors are returned in public listings; `pending` doctors are excluded.
7. **`test_doctor_search_filter`**:
   - Tests search queries by name, bio, and specialization filters.
8. **`test_get_doctor_detail`**:
   - Validates retrieving full public doctor profile and weekly consulting schedule.
9. **`test_doctor_update_own_profile`**:
   - Tests authenticated doctor updating their consultation fee, phone number, and bio.
10. **`test_admin_verifies_doctor`**:
    - Tests admin verification workflow (`/api/v1/admin/doctors/<id>/verify`), transitioning doctor status from `pending` to `verified`.

### 2.3 `tests/test_availability.py` (Dynamic Slot Calculation Engine)
11. **`test_generate_slots_for_weekday`**:
    - Asserts that availability engine accurately generates 30-minute intervals between start time (`09:00`) and end time (`17:00`).
12. **`test_generate_slots_unavailable_day`**:
    - Verifies that days marked as `is_available: false` return `is_available_day: false` and an empty slot array.
13. **`test_slots_reflect_lunch_break`**:
    - Confirms that slots falling within doctor lunch break hours (`13:00` - `14:00`) are excluded from generated availability.

### 2.4 `tests/test_appointments.py` (Appointments & Concurrency)
14. **`test_book_appointment_success`**:
    - Verifies booking an available slot, generating a unique appointment code (`APT-YYYYMMDD-XXXXXX`), and locking in the server-derived consultation fee.
15. **`test_double_booking_prevention`**:
    - **Critical Concurrency Test**: Simulates two patients attempting to book the exact same doctor, date, and slot simultaneously.
    - Confirms the first booking succeeds (HTTP `201 Created`) and the second is rejected by the database unique partial index with HTTP `409 Conflict`.
16. **`test_slot_becomes_unavailable_after_booking`**:
    - Asserts that after booking a slot, subsequent availability requests dynamically mark that slot as `is_available: false`.
17. **`test_unauthorized_appointment_access`**:
    - Verifies role-based data isolation: a third-party patient cannot view another patient's appointment details (HTTP `403 Forbidden`).
18. **`test_cancel_appointment`**:
    - Tests appointment cancellation workflow with mandatory cancellation reason and status transition to `cancelled`.

---

## 3. How to Run the Tests

```bash
cd backend
.\venv\Scripts\activate
pytest -v
```
