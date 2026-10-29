# Changelog

All notable changes to the Doctor Consultation and Appointment Booking Platform are documented in this file.

---

## [Phase V2: Online Consultation and Essential Advanced Features] - 2026-10-29

### Added
- **Online Video Consultation (WebRTC / Jitsi Meet Integration)**:
  - Secure, deterministic cryptographic room generation: `medipulse_<appointment_number>_<token>`.
  - Real-time pre-call lobby with local camera/microphone media preview and device check.
  - Interactive Jitsi Meet embedded frame with video, audio, screen share, and chat controls.
  - Real-time consultation session tracking (`scheduled` -> `in_progress` -> `completed`).
  - Integrated in-call prescription builder for doctors during active consultations.
- **Razorpay Online Payments Integration**:
  - Server-side Razorpay order generation in Indian Paise (`INR`).
  - Cryptographic server-side HMAC SHA256 signature verification (`order_id|payment_id`).
  - Idempotent payment recording and appointment confirmation.
  - Interactive modal with direct Razorpay checkout and Instant Sandbox payment simulation.
  - Printable payment receipt with transaction ID and payment breakdown.
- **Digital Medical Prescriptions**:
  - Strict doctor-only authorization for prescription issuance on valid appointments.
  - Unique prescription identification numbering: `RX-YYYYMMDD-XXXXXX`.
  - Comprehensive clinical data: Vitals (BP, pulse, temp, weight), diagnosis, structured medications (dosage, frequency, duration, instructions), lab tests, advice, and follow-up date.
  - Official print-ready prescription cards with CSS `@media print` formatting.
  - Dedicated prescription archives for patients (`/patient/prescriptions`) and doctors (`/doctor/prescriptions`).
- **Real-Time In-App Notifications**:
  - Unread notification counter badge in navigation header with interactive dropdown.
  - Automated notification triggers for booking, cancellation, rescheduling, prescription issuance, and payment receipt.
  - 5-minute deduplication guard preventing redundant alerts.
  - Mark-as-read and mark-all-read capabilities.
- **Appointment Rescheduling**:
  - Slot conflict detection and doctor availability schedule boundary validation.
  - Interactive Reschedule Modal with real-time slot generation for selected dates.
  - Automated notification dispatch to doctor and patient upon rescheduling.
- **Testing & Verification**:
  - Added 17 automated tests across `test_notifications.py`, `test_payments.py`, `test_prescriptions.py`, `test_consultations.py`, and `test_reschedule.py`.
  - Total test suite expanded to 35 tests, running at 100% pass rate.

---

## [Phase V1: Core Application and Appointment Booking] - 2026-10-29

### Added
- **Backend Architecture & Database Migration**:
  - Migrated completely from SQLAlchemy/SQL to official **PyMongo** (`pymongo==4.19.0`) and **MongoDB**.
  - Implemented `MongoManager` in `backend/app/extensions.py` with automatic connection pooling and startup index initialization.
  - Removed all hospital-related models, blueprints, controllers, and routes (strictly scoped to `patient`, `doctor`, `admin`).
  - Implemented application factory `create_app` in `backend/app/__init__.py`.
  - Registered modular blueprints: `auth`, `doctors`, `patients`, `appointments`, and `admin`.
  - Configured global error handlers returning standardized JSON error envelopes.
- **Atomic Double-Booking Prevention**:
  - Implemented database-level partial unique compound index on `appointments` collection: `(doctor_id, appointment_date, start_time)` with partial filter `{"appointment_status": {"$in": ["pending", "confirmed"]}}`.
  - Handled `DuplicateKeyError` in `AppointmentService` returning `409 Conflict`.
- **Identity & Access Control**:
  - Standardized on 3 roles: `patient`, `doctor`, `admin`.
  - Implemented bcrypt password hashing and stateless JWT authentication with custom claims via `Flask-JWT-Extended`.
  - Implemented `@role_required` and `@verified_doctor_required` authorization decorators.
- **Doctor Consultation & Availability Engine**:
  - Public search and filtering by doctor name, specialty, fee range, and experience.
  - Dynamic slot generator slicing consultation hours into 15–60 minute intervals, omitting lunch breaks and past time slots.
  - Weekly schedule management for doctors.
- **Administrative Portal**:
  - Doctor verification workflow (`verified`, `rejected`, `pending`).
  - Patient account status toggle (`active`, `suspended`).
  - Platform audit registry for all bookings and aggregate statistics.
- **Frontend Overhaul (React + Vite)**:
  - Eliminated legacy hospital routes, directories, and pages.
  - Standardized UI on modern Healthcare SaaS design tokens (`#0A4D68`, `#088395`, `#05BFDB`) and INR currency (`₹`).
  - Implemented responsive navigation navbar and role-specific sidebars.
  - Created dedicated portals:
    - **Public**: Home, Doctor Directory, Doctor Detail with interactive slot picker, Login, Register.
    - **Patient**: Overview stats, upcoming bookings, appointment cancellation modal, profile editor.
    - **Doctor**: Upcoming consultations, weekly availability editor with lunch break configuration, profile editor.
    - **Admin**: Platform KPIs, Doctor verification queue, patient account manager, appointment audit registry.
- **CLI Commands**:
  - `flask seed-v1`: Seeds realistic demo data (1 admin, 1 patient, 4 verified doctors, 1 pending doctor).
  - `flask create-admin`: Creates custom platform administrators.
- **Testing & Quality Assurance**:
  - Built comprehensive Pytest test suite with isolated test database (`hospital_consultation_test`).
  - 18 unit and integration tests passing at 100%.
