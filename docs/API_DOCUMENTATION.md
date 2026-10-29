# API Documentation (Phase V1)

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

### `POST /auth/register/patient`
Register a new patient account and medical profile.
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password@123",
    "full_name": "John Doe",
    "phone": "+91 98765 43210",
    "date_of_birth": "1992-05-14",
    "gender": "male",
    "blood_group": "A+",
    "address": "12 Main St, Mumbai"
  }
  ```
- **Response**: `201 Created` with access token and profile.

### `POST /auth/register/doctor`
Register a doctor account and credential profile (requires admin verification).
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "doctor@example.com",
    "password": "Doctor@123",
    "full_name": "Dr. Sarah Jenkins",
    "phone": "+91 98765 43211",
    "specialization": "Cardiology",
    "qualification": "MD, DM (Cardiology)",
    "experience_years": 12,
    "license_number": "MCI-2014-9988",
    "consultation_fee": 800.0,
    "bio": "Consultant Cardiologist"
  }
  ```
- **Response**: `201 Created` with `verification_status: "pending"`.

### `POST /auth/login`
Authenticate with email and password.
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "patient@example.com",
    "password": "Patient@123456"
  }
  ```
- **Response**: `200 OK` with `access_token` and user object.

### `GET /auth/me`
Retrieve the currently authenticated user's profile and role.
- **Access**: Authenticated (`Bearer <token>`)
- **Response**: `200 OK` with user and profile data.

### `POST /auth/logout`
Invalidate the current session.
- **Access**: Authenticated

---

## 2. Doctor Endpoints (`/api/v1/doctors`)

### `GET /doctors`
Search and filter verified doctors.
- **Access**: Public
- **Query Parameters**:
  - `search`: Name or bio substring
  - `specialization`: Clinical discipline (e.g., `Cardiology`)
  - `min_fee`: Minimum fee in INR
  - `max_fee`: Maximum fee in INR
  - `min_experience`: Minimum years of experience
  - `page`: Page index (default: `1`)
  - `limit`: Items per page (default: `12`)
- **Response**: `200 OK` with paginated doctor list.

### `GET /doctors/specializations`
List distinct available specializations among verified doctors.
- **Access**: Public
- **Response**: `200 OK` with array of string specializations.

### `GET /doctors/<doctor_id>`
Get detailed public profile of a verified doctor.
- **Access**: Public
- **Response**: `200 OK` with full doctor profile and weekly schedule.

### `GET /doctors/<doctor_id>/availability?date=YYYY-MM-DD`
Compute live time slots for a given date based on doctor's schedule, breaks, and existing bookings.
- **Access**: Public
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "doctor_id": "...",
      "date": "2026-11-05",
      "is_available_day": true,
      "slots": [
        {"start_time": "09:00", "end_time": "09:30", "is_available": true},
        {"start_time": "09:30", "end_time": "10:00", "is_available": false}
      ]
    }
  }
  ```

### `GET /doctors/profile`
Retrieve the authenticated doctor's full profile.
- **Access**: Doctor (`role: "doctor"`)

### `PUT /doctors/profile`
Update own profile information (qualifications, fee, bio, phone).
- **Access**: Doctor

### `PUT /doctors/schedule`
Update weekly consultation schedule (working hours, lunch break, slot duration).
- **Access**: Doctor

---

## 3. Patient Endpoints (`/api/v1/patients`)

### `GET /patients/profile`
Retrieve authenticated patient's profile and emergency contacts.
- **Access**: Patient (`role: "patient"`)

### `PUT /patients/profile`
Update own profile information (address, emergency contact, phone).
- **Access**: Patient

---

## 4. Appointment Endpoints (`/api/v1/appointments`)

### `POST /appointments`
Book an appointment slot with atomic conflict check.
- **Access**: Patient (`role: "patient"`)
- **Request Body**:
  ```json
  {
    "doctor_id": "6720fae99214...",
    "appointment_date": "2026-11-05",
    "start_time": "10:00",
    "consultation_type": "in_person",
    "reason": "Routine cardiac checkup"
  }
  ```
- **Response**: `201 Created` with appointment document and `appointment_number`.
- **Conflict**: `409 Conflict` if the slot is already reserved.

### `GET /appointments`
List appointments scoped by user role:
- **Patient**: Returns patient's own bookings.
- **Doctor**: Returns appointments booked with this doctor.
- **Admin**: Returns all appointments across platform.
- **Access**: Authenticated

### `GET /appointments/<appointment_id>`
Get detailed appointment information.
- **Access**: Authenticated (Owner patient, assigned doctor, or admin)

### `POST /appointments/<appointment_id>/cancel`
Cancel an appointment.
- **Access**: Authorized (Owner patient, assigned doctor, or admin)
- **Request Body**:
  ```json
  {
    "reason": "Family emergency"
  }
  ```
- **Response**: `200 OK` with updated appointment (`appointment_status: "cancelled"`).

### `PATCH /appointments/<appointment_id>/status`
Update status to `confirmed` or `completed`.
- **Access**: Doctor or Admin
- **Request Body**:
  ```json
  {
    "status": "completed"
  }
  ```

---

## 5. Administration Endpoints (`/api/v1/admin`)

### `GET /admin/stats`
Summary platform statistics (total doctors, pending verifications, total patients, appointments, gross volume).
- **Access**: Admin (`role: "admin"`)

### `GET /admin/doctors`
List doctors with optional filter `?status=pending|verified|rejected`.
- **Access**: Admin

### `POST /admin/doctors/<doctor_id>/verify`
Approve or reject a doctor's credentials.
- **Access**: Admin
- **Request Body**:
  ```json
  {
    "status": "verified",
    "reason": "License verified with Medical Council"
  }
  ```

### `GET /admin/patients`
List all registered patients on the platform.
- **Access**: Admin

### `POST /admin/patients/<user_id>/status`
Toggle patient account status (`active` / `suspended`).
- **Access**: Admin
- **Request Body**:
  ```json
  {
    "status": "suspended"
  }
  ```

### `GET /admin/appointments`
Audit registry of all platform appointments with optional query filters (`status`, `date`).
- **Access**: Admin
