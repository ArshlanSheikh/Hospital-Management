# Local Development & Environment Setup Guide (Phase V1)

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
If using a custom connection URI or MongoDB Atlas, configure it in `backend/.env`.

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
```

### Database Seeding & CLI Commands
```bash
# Seed initial Phase V1 data (1 admin, 1 patient, 4 verified doctors, 1 pending doctor)
python -m flask seed-v1

# Create an administrator account
python -m flask create-admin --email admin@medicare.com --password Admin@123456
```

### Run Automated Tests
```bash
pytest -v
```

### Start Development Server
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

The Vite development server is configured with a proxy (`/api` -> `http://127.0.0.1:5000/api`) in [vite.config.js](file:///e:/office%20project/Hospital-Management/frontend/vite.config.js).

---

## 4. Pre-Seeded Demo Logins

| Role | Email | Password |
|---|---|---|
| **Platform Admin** | `admin@medicare.com` | `Admin@123456` |
| **Patient** | `patient@example.com` | `Patient@123456` |
| **Doctor (Cardiology)** | `sarah.jenkins@medicare.com` | `Doctor@123456` |
| **Doctor (Pediatrics)** | `rajesh.sharma@medicare.com` | `Doctor@123456` |
| **Doctor (Dermatology)** | `emily.chen@medicare.com` | `Doctor@123456` |
| **Doctor (Neurology)** | `vikram.patel@medicare.com` | `Doctor@123456` |
| **Doctor (Pending)** | `anita.desai@medicare.com` | `Doctor@123456` |
