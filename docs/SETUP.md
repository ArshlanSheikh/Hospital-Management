# Local Development & Environment Setup Guide (Phase V1 & V2)

## Prerequisites
- **Python**: 3.10+ (tested on Python 3.13)
- **Node.js**: 18+ and npm (tested on Node v24)
- **MongoDB**: Server 6.0+ (tested on MongoDB Server 8.0.12 running locally on `localhost:27017`)
- **Git**

---

## 1. MongoDB Setup
Ensure MongoDB service is running locally:
```bash
# Verify connection
mongosh --eval "db.adminCommand('ping')"
```

---

## 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (cmd):
.\venv\Scripts\activate.bat
# macOS / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
```

### Environment Configuration (`backend/.env`)
```env
FLASK_ENV=development
SECRET_KEY=dev-secret-key-hospital-consultation-2026
JWT_SECRET_KEY=dev-jwt-secret-key-hospital-consultation-2026

# MongoDB Settings
MONGODB_URI=mongodb://localhost:27017/
MONGODB_DATABASE=hospital_consultation_dev
MONGODB_DATABASE_TEST=hospital_consultation_test

JWT_ACCESS_TOKEN_EXPIRES_MINUTES=120
FRONTEND_ORIGIN=http://localhost:5173
PORT=5000

# Razorpay Test Gateway (Phase V2)
RAZORPAY_KEY_ID=rzp_test_sample
RAZORPAY_KEY_SECRET=sample_secret_key
RAZORPAY_CURRENCY=INR
```

### Database Seeding & CLI Commands
```bash
# Seed initial Phase V1 & V2 data
python -m flask seed-v1

# Create custom platform administrator
python -m flask create-admin --email admin@medicare.com --password Admin@123456
```

### Run Automated Tests (35 Tests)
```bash
pytest -v
```

### Start Backend Development Server
```bash
python run.py
# Server runs on http://127.0.0.1:5000
```

---

## 3. Frontend Setup

```bash
cd frontend

# Install npm dependencies
npm install

# Test production build bundle
npm run build

# Start Vite development server
npm run dev
# Accessible at http://localhost:5173
```

The Vite dev server proxies `/api` to `http://127.0.0.1:5000/api`.

---

## 4. Phase V2 Testing Guide

### 1. Online Video Consultation
1. Log in as **Patient** (`patient@example.com` / `Patient@123456`).
2. Navigate to **My Appointments** and click **Join Video Room** on an active video appointment.
3. Allow camera/mic permissions in the lobby preview.
4. Click **Join Secure Consultation**. The WebRTC video room opens.
5. In another browser tab/window, log in as **Doctor** (`sarah.jenkins@medicare.com` / `Doctor@123456`) and click **Enter Consultation Room** on the same appointment to join the call simultaneously.

### 2. Razorpay Payments
1. On **My Appointments** as a patient, click **Pay ₹750 (Razorpay)** on an unpaid appointment.
2. Click **Instant Test Payment (Sandbox Simulation)** or use the test Razorpay checkout popup.
3. The appointment updates to `CONFIRMED` and `PAID` with an official digital receipt.

### 3. Digital Prescriptions
1. Inside the video call or on the doctor appointments screen, click **Issue Prescription (Rx)**.
2. Fill diagnosis, vitals, and add medications.
3. Click **Issue Digital Prescription**.
4. Patient immediately receives an in-app notification and can view/print the official Rx slip under **My Prescriptions**.

### 4. Appointment Rescheduling
1. On patient appointments, click **Reschedule**.
2. Pick a new date and an available slot.
3. Click **Save Changes**. The booking updates and notifications are dispatched.
