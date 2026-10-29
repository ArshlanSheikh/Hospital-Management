# Automated Testing Report & Test Plan (Phase V1 & V2)

- **Test Runner**: `pytest 8.2.2`
- **Platform**: Windows 11 / Python 3.13.5
- **Database**: MongoDB Server 8.0.12 (`hospital_consultation_test`)
- **Total Test Cases**: **35**
- **Pass Rate**: **100% (35 passed in ~26s)**

---

## 1. Test Suite Coverage Breakdown

### 1.1 `tests/test_appointments.py` (5 Tests)
- `test_book_appointment_success`: Verifies appointment creation with unique number, duration, and fee derivation.
- `test_double_booking_prevention`: **Critical Concurrency Test** asserting that two concurrent bookings for the same doctor, date, and slot reject the second with HTTP `409 Conflict`.
- `test_slot_status_updates_after_booking`: Verifies booked slot transitions to unavailable.
- `test_unauthorized_appointment_access`: Asserts 403 Forbidden when patient attempts to view another patient's appointment.
- `test_cancel_appointment`: Tests cancellation workflow with mandatory cancellation reason.

### 1.2 `tests/test_auth.py` (6 Tests)
- `test_patient_registration_success`: Patient signup with bcrypt password hashing and JWT token.
- `test_doctor_registration_success`: Doctor signup with pending verification status.
- `test_patient_registration_duplicate_email`: Rejection of duplicate email with 409 Conflict.
- `test_login_valid_credentials`: Successful authentication and JWT claim generation.
- `test_login_invalid_password`: 401 Unauthorized on invalid passwords.
- `test_get_me_protected`: Validates token requirement on `/api/v1/auth/me`.

### 1.3 `tests/test_availability.py` (3 Tests)
- `test_generate_slots_for_future_date`: Slot generator calculating 30-min intervals.
- `test_doctor_updates_availability_settings`: Doctor updating working hours and lunch break.
- `test_doctor_unavailable_date`: Single-day leave exception blocking slots.

### 1.4 `tests/test_consultations.py` (3 Tests) — Phase V2
- `test_get_consultation_session_authorized`: Verifies authorized doctor and patient receive identical deterministic room token for video consultation.
- `test_unauthorized_user_cannot_access_session`: Verifies third-party user cannot join another consultation session (403 Forbidden).
- `test_doctor_completes_consultation`: Doctor concludes consultation call, updating status to `completed`.

### 1.5 `tests/test_doctors.py` (4 Tests)
- `test_list_doctors_public`: Asserts only verified doctors appear in public directory.
- `test_doctor_search_filter`: Search by doctor name, specialty, and bio.
- `test_doctor_update_own_profile`: Doctor updating consultation fee, phone, and bio.
- `test_admin_verifies_doctor`: Admin verification workflow (`pending` -> `verified`).

### 1.6 `tests/test_notifications.py` (3 Tests) — Phase V2
- `test_notification_creation_and_list`: Verifies in-app notification creation and unread count retrieval.
- `test_mark_notification_as_read`: Marks single notification as read, decreasing unread count.
- `test_mark_all_read`: Marks all unread notifications as read.

### 1.7 `tests/test_payments.py` (5 Tests) — Phase V2
- `test_create_payment_order_success`: Server-side order creation via Razorpay in INR paise.
- `test_cannot_pay_for_cancelled_appointment`: Prevents payment initiation for cancelled bookings (409 Conflict).
- `test_verify_payment_success`: Cryptographic signature verification updating appointment to `confirmed` and `payment_status: completed`.
- `test_verify_payment_invalid_signature`: Rejects forged signatures with HTTP `422/400 Validation Error`.
- `test_idempotent_payment_verification`: Prevents double-processing when payment verification is retried.

### 1.8 `tests/test_prescriptions.py` (3 Tests) — Phase V2
- `test_doctor_issues_prescription_success`: Doctor creates official Rx with medications, vitals, diagnosis, and advice.
- `test_patient_views_own_prescription`: Patient views their own prescription list.
- `test_patient_cannot_issue_prescription`: Asserts patients cannot issue prescriptions (403 Forbidden).

### 1.9 `tests/test_reschedule.py` (3 Tests) — Phase V2
- `test_reschedule_appointment_success`: Reschedules appointment date and time slot with reschedule counter increment.
- `test_reschedule_slot_conflict_rejected`: Rejects rescheduling to an already booked slot (409 Conflict).
- `test_reschedule_to_past_date_rejected`: Rejects rescheduling to past dates (422/400 Validation Error).

---

## 2. Running Automated Tests

```bash
cd backend
.\venv\Scripts\activate
pytest -v
```
