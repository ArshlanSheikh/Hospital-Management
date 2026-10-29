# API Documentation (Phase V1 & V2)

Base URL: `/api/v1`

All responses follow a consistent JSON envelope format:

### Standard Success Envelope
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Standard Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable explanation",
    "details": null
  }
}
```

---

## 1. Authentication Endpoints (`/api/v1/auth`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/auth/register/patient` | `POST` | Public | Register patient account and medical profile |
| `/auth/register/doctor` | `POST` | Public | Register doctor credentials (pending admin verification) |
| `/auth/login` | `POST` | Public | Authenticate with email/password, return JWT token |
| `/auth/me` | `GET` | Authenticated | Retrieve current user profile and role |
| `/auth/logout` | `POST` | Authenticated | Invalidate local session |

---

## 2. Doctor Endpoints (`/api/v1/doctors`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/doctors` | `GET` | Public | Search verified doctors (`specialization`, `search`, `min_fee`, `max_fee`) |
| `/doctors/specializations` | `GET` | Public | List distinct medical categories |
| `/doctors/<id>` | `GET` | Public | Get detailed verified doctor profile and schedule |
| `/doctors/<id>/availability?date=YYYY-MM-DD` | `GET` | Public | Compute live available slots excluding lunch breaks & booked slots |
| `/doctors/profile` | `GET` | Doctor | Get own full profile |
| `/doctors/profile` | `PUT` | Doctor | Update own qualifications, consultation fee, bio, phone |
| `/doctors/schedule` | `PUT` | Doctor | Update weekly consulting schedule and lunch break |

---

## 3. Appointment Endpoints (`/api/v1/appointments`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/appointments` | `POST` | Patient | Book consultation slot with atomic double-booking lock |
| `/appointments` | `GET` | Authenticated | List appointments scoped by current user role |
| `/appointments/<id>` | `GET` | Authenticated | Get detailed appointment information |
| `/appointments/<id>/cancel` | `POST` | Authorized | Cancel appointment with mandatory reason |
| `/appointments/<id>/reschedule` | `POST` | Patient/Doctor | **(Phase V2)** Reschedule date and time slot with conflict check |
| `/appointments/<id>/status` | `PATCH` | Doctor/Admin | Update status (`confirmed`, `completed`, `rejected`) |

---

## 4. Online Payment Endpoints (`/api/v1/payments`) — Phase V2

### `POST /payments/create-order`
Create a server-side Razorpay order for an appointment.
- **Access**: Patient (owner of appointment) or Admin
- **Request**:
  ```json
  {
    "appointment_id": "6720fae99214..."
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "success": true,
    "data": {
      "order_id": "order_Mabc12345678",
      "amount": 750.0,
      "amount_paise": 75000,
      "currency": "INR",
      "key_id": "rzp_test_sample",
      "appointment_number": "APT-20261029-A4B92E"
    }
  }
  ```

### `POST /payments/verify`
Verify Razorpay HMAC SHA256 signature and update appointment confirmation.
- **Access**: Authenticated
- **Request**:
  ```json
  {
    "razorpay_order_id": "order_Mabc12345678",
    "razorpay_payment_id": "pay_Mdef98765432",
    "razorpay_signature": "cryptographic_hmac_sha256_hash"
  }
  ```
- **Response**: `200 OK` with updated payment record and confirmed appointment.

### `GET /payments/history`
Retrieve payment transaction ledger for the current user.
- **Access**: Authenticated

### `GET /payments/receipt/<receipt_id>`
Get print/download receipt data.
- **Access**: Authenticated

---

## 5. Digital Prescriptions (`/api/v1/prescriptions`) — Phase V2

### `POST /prescriptions`
Issue a new digital prescription for an eligible consultation.
- **Access**: Doctor (assigned to the appointment)
- **Request**:
  ```json
  {
    "appointment_id": "6720fae99214...",
    "diagnosis": "Essential Hypertension",
    "vital_signs": {
      "blood_pressure": "130/80",
      "pulse": "72 bpm"
    },
    "medicines": [
      {
        "name": "Telmisartan",
        "dosage": "40 mg",
        "frequency": "Once daily (Morning)",
        "duration": "30 days",
        "instructions": "After breakfast"
      }
    ],
    "tests_recommended": ["Lipid Profile"],
    "advice_notes": "Reduce salt, walk 30 mins daily",
    "follow_up_date": "2026-11-30",
    "mark_appointment_completed": true
  }
  ```
- **Response**: `201 Created` with generated `prescription_number` (`RX-YYYYMMDD-XXXXXX`).

### `GET /prescriptions/patient/me`
Retrieve all prescriptions issued to the authenticated patient.
- **Access**: Patient

### `GET /prescriptions/doctor/me`
Retrieve all prescriptions issued by the authenticated doctor.
- **Access**: Doctor

### `GET /prescriptions/appointment/<appointment_id>`
Get the prescription associated with a consultation appointment.
- **Access**: Assigned Doctor or Patient

### `GET /prescriptions/<rx_id>`
Get detailed prescription record by ID.
- **Access**: Assigned Doctor or Patient

---

## 6. Online Video Consultation (`/api/v1/consultations`) — Phase V2

### `GET /consultations/<appointment_id>/session`
Authorize caller and retrieve secure WebRTC / Jitsi room credentials.
- **Access**: Assigned Doctor or Booking Patient
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "appointment_id": "6720fae99214...",
      "appointment_number": "APT-20261029-A4B92E",
      "room_name": "medipulse_apt20261029a4b92e_a1b2c3d4e5f6",
      "provider": "jitsi",
      "domain": "meet.jit.si",
      "user_role": "patient",
      "display_name": "Jane Doe",
      "consultation_status": "in_progress"
    }
  }
  ```

### `POST /consultations/<appointment_id>/complete`
Officially conclude video session.
- **Access**: Doctor or Admin

### `POST /consultations/<appointment_id>/missed`
Mark consultation as missed if participant did not attend.
- **Access**: Doctor or Admin

---

## 7. In-App Notifications (`/api/v1/notifications`) — Phase V2

### `GET /notifications`
Retrieve user notifications and unread counter.
- **Access**: Authenticated
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "notifications": [ ... ],
      "unread_count": 2
    }
  }
  ```

### `PATCH /notifications/<id>/read`
Mark single notification as read.
- **Access**: Authenticated (Owner)

### `PATCH /notifications/mark-all-read`
Mark all unread notifications as read.
- **Access**: Authenticated

---

## 8. Administration (`/api/v1/admin`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/admin/stats` | `GET` | Admin | Total platform counts (doctors, patients, appointments, revenue) |
| `/admin/doctors` | `GET` | Admin | List doctors with `?status=pending\|verified\|rejected` |
| `/admin/doctors/<id>/verify` | `POST` | Admin | Verify or reject doctor credentials |
| `/admin/patients` | `GET` | Admin | List all registered patients |
| `/admin/patients/<id>/status` | `POST` | Admin | Toggle patient account status (`active` / `suspended`) |
| `/admin/appointments` | `GET` | Admin | Platform-wide consultation audit registry |
