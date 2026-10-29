# MediPulse — Doctor Consultation & Appointment Booking Platform (Phase V1)

A full-stack Doctor Consultation and Appointment Booking Platform built with a modular **Python / Flask** backend (Application Factory, PyMongo / MongoDB, Flask-JWT-Extended, Marshmallow validation, bcrypt) and a responsive **React + Vite** frontend styled with a modern Healthcare SaaS design system.

---

## Phase V1 Core Architecture & Features

- **Strict 3-Role Access Model**: Dedicated authentication and authorization workflows for `patient`, `doctor`, and `admin` roles (Hospital entities strictly excluded).
- **MongoDB Data Layer (PyMongo)**: High-performance NoSQL document model with indexed queries and partial unique compound indexes for atomic double-booking prevention.
- **Doctor Discovery & Filtering**: Search verified doctors by name, specialty, consultation fee, and experience.
- **Dynamic Slot Availability Engine**: Slices doctor consultation schedules into configurable intervals (15–60 min), filters past time slots for current day, and excludes lunch breaks and leave dates.
- **Zero-Conflict Appointment Booking**: Database-level partial unique compound index on `(doctor_id, appointment_date, start_time)` for `pending`/`confirmed` appointments preventing concurrent collisions.
- **Role-Aware Dashboards**:
  - **Patient**: Overview stats, appointment history, interactive booking widget, profile management, and appointment cancellation.
  - **Doctor**: Upcoming consultations, weekly availability schedule builder (operating hours & lunch break), and profile management.
  - **Admin**: Platform metrics overview, doctor verification pipeline (review & approve/reject), patient account management (activate/suspend), and all-appointments audit registry.
- **Indian Rupee (₹) Pricing**: Native display of consultation fees in INR.

---

## Tech Stack

### Backend
- **Python 3.13** & **Flask 3.0.3** (Application Factory pattern)
- **PyMongo 4.19** & **MongoDB 8.0+**
- **Flask-JWT-Extended** (Stateless Bearer JWT tokens with custom role claims)
- **Flask-CORS** (Configured for frontend Vite dev server)
- **Marshmallow** (Strict request schema validation and serialization)
- **bcrypt** (Secure salted password hashing)
- **Pytest** (Automated unit and integration test suite — 18/18 passing)

### Frontend
- **React 18** & **Vite 5**
- **React Router DOM 6**
- **Lucide React** (Clean medical and navigation iconography)
- **Axios** (Configured with request/response JWT interceptors and error handling)
- **CSS Modules & Design Tokens** (Medical blue `#0A4D68`, cyan `#088395`, teal `#05BFDB`, crisp light backgrounds)

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
- [Changelog](docs/CHANGELOG.md): Phase V1 implementation notes and roadmap.
