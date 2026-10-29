# MediPulse — Doctor Consultation & Appointment Booking Platform (Phase V2)

A full-stack Doctor Consultation and Appointment Booking Platform built with a modular **Python / Flask** backend (Application Factory, PyMongo / MongoDB, Flask-JWT-Extended, Marshmallow validation, bcrypt, Razorpay) and a responsive **React + Vite** frontend styled with a modern Healthcare SaaS design system.

---

## Phase V2 Core Architecture & Features

### 1. Online Video Consultation (WebRTC / Jitsi Meet)
- **Deterministic Cryptographic Rooms**: Generated per-appointment via SHA256 (`medipulse_<appt_number>_<token>`) preventing eavesdropping and room squatting.
- **Pre-Call Device Lobby**: Camera/microphone preview, hardware permission check, and mute toggles before entering the consultation.
- **Embedded WebRTC Jitsi Meet**: Crisp in-browser video/audio, screen sharing, meeting chat, and participant tile controls.
- **Session Lifecycle & In-Call Rx**: Real-time consultation status tracking (`scheduled` -> `in_progress` -> `completed`) with integrated modal for doctors to draft and issue prescriptions during the call.

### 2. Online Payment Gateway (Razorpay)
- **Indian Rupee (₹) Transactions**: Server-side order creation in paise with official `razorpay` integration.
- **Cryptographic Verification**: Server-side HMAC SHA256 signature verification (`razorpay_order_id|razorpay_payment_id`) against application secret.
- **Idempotency & Audit**: Immutable payment transactions linked to appointment records with printable receipts.
- **Instant Sandbox Simulator**: Direct gateway modal with one-click sandbox testing for rapid evaluation.

### 3. Digital Medical Prescriptions
- **Doctor-Only Authorization**: Strict RBAC ensuring only the assigned doctor can issue a prescription for their appointment.
- **Standardized Identification**: Sequential unique IDs formatted as `RX-YYYYMMDD-XXXXXX`.
- **Comprehensive Clinical Fields**: Vital signs (BP, heart rate, temperature, weight), primary diagnosis, structured medications (name, dosage, frequency, duration, instructions), diagnostic tests, advice notes, and follow-up date.
- **Print-Ready Formatting**: Dedicated `@media print` CSS layout for official paper prescription slips.
- **Dedicated Portals**: Patient prescription history (`/patient/prescriptions`) and doctor issuance archive (`/doctor/prescriptions`).

### 4. Real-Time In-App Notifications
- **Navbar Notification Dropdown**: Polling alert system with unread notification badge.
- **Automated Triggers**: Triggered across life-cycle events: booking confirmation, appointment rescheduling, appointment cancellation, prescription issuance, and payment receipts.
- **Deduplication Guard**: 5-minute suppression window preventing alert duplicates.

### 5. Appointment Rescheduling Engine
- **Slot Conflict Prevention**: Validates target date/time against doctor operating hours, break intervals, and existing reservations.
- **Interactive Calendar & Slot Picker**: Dynamic slot availability calculation for patient-driven rescheduling.

### 6. Phase V1 Foundation
- **Strict 3-Role Access Model**: Dedicated workflows for `patient`, `doctor`, and `admin` (zero hospital entities).
- **MongoDB Data Layer (PyMongo)**: High-performance NoSQL document model with partial unique compound indexes for atomic double-booking prevention.
- **Doctor Discovery & Availability Engine**: Specialty, fee, and experience filtering with dynamic 15–60 min slot generation.

---

## Tech Stack

### Backend
- **Python 3.13** & **Flask 3.0.3** (Application Factory pattern)
- **PyMongo 4.19** & **MongoDB 8.0+**
- **Razorpay 1.4.2** & **setuptools<70** (HMAC SHA256 payment signature verification)
- **Flask-JWT-Extended** (Stateless Bearer JWT tokens with custom role claims)
- **Flask-CORS** (Configured for frontend Vite dev server)
- **Marshmallow** (Strict request schema validation and serialization)
- **bcrypt** (Secure salted password hashing)
- **Pytest** (Automated unit and integration test suite — 35/35 passing, 100% pass rate)

### Frontend
- **React 18** & **Vite 5**
- **React Router DOM 6**
- **Lucide React** (Clean medical and navigation iconography)
- **Axios** (Configured with request/response JWT interceptors and error handling)
- **Jitsi Meet External API** (WebRTC video consultation integration)
- **CSS Modules & Design Tokens** (Medical blue `#0A4D68`, cyan `#088395`, teal `#05BFDB`, crisp light backgrounds, print styles)

---

## Quick Start

### 1. MongoDB Setup
Ensure MongoDB Server is installed and running locally on port 27017:
```bash
# Check MongoDB status or start MongoDB service
mongod --dbpath <data-directory>
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables (defaults connect to mongodb://localhost:27017/hospital_consultation_dev)
cp .env.example .env

# Seed initial V1 data (1 admin, 1 patient, 4 verified doctors, 1 pending doctor)
python -m flask seed-v1

# Run automated tests
pytest -v

# Start backend server (port 5000)
python run.py
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Validate bundle compilation
npm run build

# Start Vite dev server (port 5173 with proxy to backend)
npm run dev
```

---

## Demo Credentials (Pre-Seeded)

| Role | Email | Password | Details |
|---|---|---|---|
| **Platform Admin** | `admin@medicare.com` | `Admin@123456` | Full platform oversight & doctor verification |
| **Patient** | `patient@example.com` | `Patient@123456` | Verified patient with active appointments |
| **Doctor (Cardiology)** | `sarah.jenkins@medicare.com` | `Doctor@123456` | Verified, ₹800 fee, active schedule |
| **Doctor (Pediatrics)** | `rajesh.sharma@medicare.com` | `Doctor@123456` | Verified, ₹600 fee, active schedule |
| **Doctor (Dermatology)** | `emily.chen@medicare.com` | `Doctor@123456` | Verified, ₹750 fee, active schedule |
| **Doctor (Neurology)** | `vikram.patel@medicare.com` | `Doctor@123456` | Verified, ₹1200 fee, active schedule |
| **Doctor (Pending)** | `anita.desai@medicare.com` | `Doctor@123456` | Pending verification (Orthopedics) |

*The login page (`/login`) includes 1-click **Quick Demo Fill** buttons for immediate testing.*

---

## Documentation Index

- [Architecture Overview](docs/ARCHITECTURE.md): Modular design, PyMongo integration, and concurrency guarantees.
- [Database Schema](docs/DATABASE_SCHEMA.md): MongoDB document schemas, embedded structures, and indexes.
- [API Documentation](docs/API_DOCUMENTATION.md): All REST endpoints, payloads, and response envelopes.
- [Setup & Environment Guide](docs/SETUP.md): Step-by-step local setup and CLI utilities.
- [Testing Report](docs/TESTING.md): Pytest test suite coverage and test execution results.
- [Changelog](docs/CHANGELOG.md): Phase V1 & V2 implementation notes and roadmap.
