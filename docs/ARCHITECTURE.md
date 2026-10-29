# System Architecture & Design Document (Phase V1)

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
   ├── /api/v1/appointments
   └── /api/v1/admin
       |
 [Service Layer]
   ├── AuthService
   ├── DoctorService
   ├── PatientService
   ├── AppointmentService
   └── AdminService
       |
 [Repository & PyMongo Data Access Layer]
       |
 [MongoDB Database (hospital_consultation_dev)]
   ├── users
   ├── doctor_profiles
   ├── patient_profiles
   └── appointments
```

---

## 2. Core Architectural Principles & Components

### 2.1 Strict 3-Role Access Model
The application enforces three distinct roles throughout the authentication, permission decorators, and database models:
- **`patient`**: Books appointments, views medical consultations, edits profile.
- **`doctor`**: Configures weekly consulting availability, views scheduled appointments, edits profile and consultation fee.
- **`admin`**: Verifies and credentials doctor accounts, monitors platform metrics, and oversees appointments.
*(Hospital entities, departments, and hospital admin accounts are strictly excluded.)*

### 2.2 Flask Application Factory (`create_app`)
- Located in [backend/app/__init__.py](file:///e:/office%20project/Hospital-Management/backend/app/__init__.py).
- Accepts configuration names (`development`, `testing`, `production`).
- Initializes extensions (`MongoManager`, `JWTManager`, `CORS`) and sets up database indexes automatically on startup.
- Registers modular blueprints and global error handlers (`AppError`, `DuplicateKeyError`, `ValidationError`).
- Provides clean isolation for automated Pytest tests against a separate testing database (`hospital_consultation_test`).

### 2.3 MongoDB Connection & Index Management (`MongoManager`)
- Located in [backend/app/extensions.py](file:///e:/office%20project/Hospital-Management/backend/app/extensions.py).
- Uses PyMongo's `MongoClient` with automatic connection pooling.
- Runs `init_db_indexes(db)` on application startup to ensure:
  - `users.email` (Unique)
  - `doctor_profiles.user_id` (Unique)
  - `patient_profiles.user_id` (Unique)
  - `appointments` Partial compound unique index on `(doctor_id, appointment_date, start_time)` for active bookings.

### 2.4 Service Layer Pattern
Business logic is strictly separated from HTTP controllers (routes):
- **Controllers** handle HTTP request parsing, header extraction, validation, and invoking service methods.
- **Services** encapsulate core domain rules (e.g., verifying doctor credentials before public listing, checking schedule bounds, deriving consultation fees).
- **Repositories** handle PyMongo query composition and document transformation.

---

## 3. Concurrency & Double-Booking Prevention

### 3.1 The Challenge
In a healthcare consultation platform, two patients concurrently attempting to book the exact same doctor at the same date and time slot must never result in an overlapping booking.

### 3.2 MongoDB Database-Level Guarantee
MediPulse prevents double booking at the database level using a **Partial Unique Compound Index**:

```python
db.appointments.create_index(
    [
        ("doctor_id", ASCENDING),
        ("appointment_date", ASCENDING),
        ("start_time", ASCENDING)
    ],
    unique=True,
    name="idx_unique_active_doctor_slot",
    partialFilterExpression={
        "appointment_status": {"$in": ["pending", "confirmed"]}
    }
)
```

### 3.3 Conflict Handling Flow
1. Patient A and Patient B concurrently request to book Doctor D on date `2026-11-05` at `10:00`.
2. The service performs an atomic insert into the `appointments` collection.
3. Whichever operation reaches MongoDB first succeeds, inserting the appointment document.
4. The second concurrent operation violates the unique partial index and MongoDB raises `pymongo.errors.DuplicateKeyError`.
5. The backend catches `DuplicateKeyError` and returns an HTTP `409 Conflict` response with an explanatory message: `"This slot has already been booked by another patient. Please select another slot."`
6. Cancelled or completed appointments do not match the partial filter expression, freeing the slot for future bookings if cancelled.

---

## 4. Frontend Architecture

### 4.1 Single Page Application (SPA)
- Developed using **React 18** and **Vite**.
- Client-side routing managed with **React Router v6**.
- Navigation and layout structure:
  - **Public routes**: `/`, `/doctors`, `/doctors/:id`, `/login`, `/register`.
  - **Protected patient routes**: `/patient/dashboard`, `/patient/appointments`, `/patient/profile`.
  - **Protected doctor routes**: `/doctor/dashboard`, `/doctor/appointments`, `/doctor/schedule`, `/doctor/profile`.
  - **Protected admin routes**: `/admin/dashboard`, `/admin/doctors`, `/admin/patients`, `/admin/appointments`.

### 4.2 State Management & Authentication
- **`AuthContext`**: Manages user authentication state, tokens, user profile, and persistent storage in `localStorage`.
- **Axios Interceptors**: Automatically injects `Authorization: Bearer <token>` into outgoing API calls and handles 401 token expirations gracefully.
