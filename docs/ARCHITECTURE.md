# System Architecture & Design Document (Phase V1 & V2)

## 1. Architectural Style: Modular Monolith with MongoDB

MediPulse is built as a clean, decoupled client-server architecture consisting of a **React SPA frontend** communicating over JSON REST HTTPS endpoints with a **modular Flask API backend** backed by **MongoDB (PyMongo)**.

```
[React + Vite SPA]
       |
       |  (REST JSON / JWT Bearer)
       v
[Flask App Factory (create_app)]
       |
  +----+------------------------+-------------------+
  | Middleware: CORS, JWT       | Error Handlers    |
  +----+------------------------+-------------------+
       |
 [Feature Blueprints]
   ├── /api/v1/auth
   ├── /api/v1/doctors
   ├── /api/v1/patients
   ├── /api/v1/appointments (Booking & Rescheduling)
   ├── /api/v1/consultations (WebRTC / Video Sessions)
   ├── /api/v1/payments (Razorpay Gateway & Verification)
   ├── /api/v1/prescriptions (Digital Rx Management)
   ├── /api/v1/notifications (In-App Event Dispatcher)
   └── /api/v1/admin
       |
 [Service Layer]
   ├── AuthService
   ├── DoctorService
   ├── PatientService
   ├── AppointmentService
   ├── ConsultationService
   ├── PaymentService
   ├── PrescriptionService
   ├── NotificationService
   └── AdminService
       |
 [Repository & PyMongo Data Access Layer]
       |
 [MongoDB Database (hospital_consultation_dev)]
   ├── users
   ├── doctor_profiles
   ├── patient_profiles
   ├── appointments
   ├── payments
   ├── prescriptions
   └── notifications
```

---

## 2. Core Architectural Principles & Components

### 2.1 Strict 3-Role Access Model
The application enforces three distinct roles throughout the authentication, permission decorators, and database models:
- **`patient`**: Books consultations, pays via Razorpay, joins video rooms, views/prints prescriptions, manages profile.
- **`doctor`**: Configures weekly availability, joins video sessions, issues digital prescriptions (Rx), views appointments.
- **`admin`**: Verifies and credentials doctor accounts, monitors platform metrics, and oversees appointments and transactions.
*(Hospital entities, departments, and hospital admin accounts are strictly excluded.)*

### 2.2 Flask Application Factory (`create_app`)
- Located in [backend/app/__init__.py](file:///e:/office%20project/Hospital-Management/backend/app/__init__.py).
- Accepts configuration names (`development`, `testing`, `production`).
- Initializes extensions (`MongoManager`, `JWTManager`, `CORS`) and automatically creates collection indexes on startup.
- Registers modular blueprints and global error handlers (`AppError`, `DuplicateKeyError`, `ValidationError`).
- Provides clean isolation for automated Pytest tests against a separate testing database (`hospital_consultation_test`).

### 2.3 MongoDB Connection & Index Management (`MongoManager`)
- Located in [backend/app/extensions.py](file:///e:/office%20project/Hospital-Management/backend/app/extensions.py).
- Uses PyMongo's `MongoClient` with automatic connection pooling.
- Creates indexes on startup:
  - `users.email` (Unique)
  - `doctor_profiles.user_id` (Unique)
  - `patient_profiles.user_id` (Unique)
  - `appointments` Partial compound unique index on `(doctor_id, appointment_date, start_time)` for active bookings
  - `prescriptions.prescription_number` (Unique)
  - `payments.order_id` (Unique)
  - `notifications.(user_id, created_at)`

---

## 3. Phase V2 Subsystems Architecture

### 3.1 Online Video Consultation Architecture (WebRTC / Jitsi Meet)
- **Zero Placeholder Guarantee**: Provides real, working video and audio conferencing without simulated mock buttons.
- **Session Authorization**:
  - Endpoint `GET /api/v1/consultations/<appointment_id>/session` verifies:
    1. Caller is the assigned doctor or the booking patient.
    2. Consultation type is `video` or `online`.
    3. Status is active (not cancelled or rejected).
- **Deterministic Cryptographic Room IDs**:
  - Room names are generated using HMAC/SHA256 (`medipulse_consult_<appt_number>_<hash>`) ensuring that only authorized participants join the private consultation session.
- **Hardware Pre-Check Lobby**:
  - In-browser camera and microphone diagnostics using `navigator.mediaDevices.getUserMedia` before entering call.
- **Lifecycle Management**:
  - Tracks session state: `scheduled` -> `in_progress` -> `completed` / `missed`.
  - Doctor can issue digital prescriptions directly from the active call screen and conclude the consultation.

### 3.2 Online Payments Architecture (Razorpay)
- **Server-Side Order Generation**:
  - `POST /api/v1/payments/create-order` creates order via Razorpay API in INR (paise = fee * 100).
- **Cryptographic Signature Verification**:
  - Frontend never dictates payment confirmation.
  - `POST /api/v1/payments/verify` computes HMAC SHA256 of `order_id|payment_id` using server-side `RAZORPAY_KEY_SECRET`.
  - Prevents duplicate submission and ensures tamper-proof verification.
- **State Transition**:
  - Transitions appointment `payment_status` to `completed` and confirms booking.
  - Creates transaction receipt record in `payments` collection.

### 3.3 Digital Prescriptions (Rx) Architecture
- **Medical Compliance**:
  - Prescriptions can only be created by the verified doctor assigned to the consultation (`POST /api/v1/prescriptions`).
  - Generates immutable clinical identifier (`RX-YYYYMMDD-XXXXXX`).
  - Captures primary diagnosis, vitals (BP, pulse, temp, weight), structured medications (dosage, frequency, duration, instructions), diagnostic tests, and clinical advice.
- **Patient Privacy**:
  - Patients can only view their own prescriptions (`GET /api/v1/prescriptions/patient/me`).
  - Third-party patients are blocked with HTTP `403 Forbidden`.
- **Print Optimization**:
  - Dedicated `@media print` CSS layout rendering official clinic Rx slips suitable for pharmacy dispensing.

### 3.4 In-App Notifications System
- Polling-based notification engine (`GET /api/v1/notifications`).
- Unread counter badge displayed on Navbar bell icon.
- Event dispatchers for appointment bookings, confirmations, cancellations, rescheduling, payments, and prescription issuance.
- Duplicate suppression mechanism preventing spam on retries within 5 minutes.

### 3.5 Appointment Rescheduling Engine
- Endpoint `POST /api/v1/appointments/<id>/reschedule`.
- Atomically checks target doctor schedule (working hours, lunch breaks, unavailable dates) and ensures no slot collisions.
- Re-schedules appointment date and time, increments `reschedule_count`, and notifies both participants.
