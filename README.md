# HLTH01 — Privacy-Preserving Healthcare Platform

> **Dual-sided architecture**: Individual clinical care with QR-gated access + k-Anonymized public health analytics for government officials.

---

## Architecture Overview

```
HLTH01/
├── backend/          # Node.js + Express + MongoDB
│   ├── src/
│   │   ├── models/   # Mongoose schemas (User, MedicalRecord, AuditLog)
│   │   ├── routes/   # auth, patient, doctor, admin API routes
│   │   ├── middleware/ # JWT auth + RBAC
│   │   └── index.js  # Express server entry
│   ├── seed.js       # Demo data seeder
│   └── .env.example
└── frontend/         # Next.js 14 App Router
    └── src/
        ├── app/      # Page routes
        │   ├── (auth)/login & register
        │   ├── patient/ (dashboard, profile)
        │   ├── doctor/ (dashboard, profile, patient/[id])
        │   └── admin/ (dashboard, doctors)
        ├── components/ # Shared UI + Leaflet maps
        ├── context/   # AuthContext
        └── lib/       # API utils, helpers
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS |
| UI Components | shadcn/ui patterns, Radix UI primitives, lucide-react |
| Maps | react-leaflet (SSR-safe via next/dynamic) |
| Charts | Recharts |
| QR Code | qrcode.react (generation), html5-qrcode (scanning) |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose (2dsphere indexes) |
| Auth | JWT in HTTP-only cookies |
| Privacy | k-Anonymity (k≥5) enforcement in aggregation pipelines |

---

## Quick Start

### Prerequisites
- Node.js ≥ 18
- MongoDB (local or Atlas)

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MONGO_URI and JWT_SECRET
npm run seed    # Seeds demo data (1 admin, 3 doctors, 15 patients, 50+ records)
npm run dev     # Starts on http://localhost:5000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm run dev     # Starts on http://localhost:3000
```

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@hlth01.gov | Admin@1234 |
| **Doctor** | arun.mehta@hospital.com | Doctor@1234 |
| **Doctor** | sunita.rao@hospital.com | Doctor@1234 |
| **Doctor** | vikram.singh@hospital.com | Doctor@1234 |
| **Patient** | rahul.verma@email.com | Patient@1234 |
| **Patient** | priya.patel@email.com | Patient@1234 |
| *(+ 13 more patients)* | *\*@email.com* | Patient@1234 |

---

## Role-Based Access Control

### PATIENT
- Self-registration at `/register`
- `/patient/dashboard` — QR token generator (2-min expiry), medical history timeline, audit log
- `/patient/profile` — Edit address, pincode, and GeoJSON coordinates

### DOCTOR (Admin-created only)
- `/doctor/dashboard` — Camera + file QR scanner
- `/doctor/patient/[id]` — 15-minute session access to patient records; submit new diagnosis/prescriptions

### ADMIN (Government Public Health Official)
- `/admin/doctors` — Register and manage doctor accounts
- `/admin/dashboard` — k-Anonymized epidemiological analytics:
  - **Heatmap** — Disease cluster density map (coordinates suppressed if k<5)
  - **Outbreak Alerts** — Recent disease surges by pincode
  - **Pharmacy Demand** — Top prescribed medicines (aggregated)
  - **Demographic Risk Matrix** — Risk levels by disease category

---

## Privacy Architecture

### QR Code Security
- QR payload = signed JWT with `{ patientId, nonce }`, **expires in 2 minutes**
- Doctor scans → backend verifies token → issues **15-minute session JWT**
- Session JWT scoped to specific `{ patientId, doctorId }` pair
- Every scan logged to `AuditLog` (patient can see who accessed their records)

### k-Anonymity (k≥5)
- Admin heatmap endpoint groups records by rounded coordinates
- Any cluster with fewer than 5 records is **suppressed** (not returned)
- Protects patient re-identification even in low-density areas
- Admin **cannot** access individual patient profiles or raw PII

### Snapshot Demographics
- When a doctor creates a record, current `residentialAddress`, `pincode`, and `location` are **snapshotted** into `MedicalRecord`
- Ensures historical heatmap accuracy even if patient relocates

---

## API Reference

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Patient self-registration |
| POST | `/api/auth/login` | Login (sets HTTP-only cookie) |
| GET | `/api/auth/me` | Current user profile |
| POST | `/api/auth/logout` | Clear auth cookie |

### Patient
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/patient/profile` | Get patient profile |
| PUT | `/api/patient/profile` | Update address/location |
| GET | `/api/patient/qr-token` | Generate 2-min QR JWT |
| GET | `/api/patient/history` | Medical history |
| GET | `/api/patient/audit-logs` | QR scan access log |

### Doctor
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/doctor/validate-qr` | Verify QR token → session JWT |
| GET | `/api/doctor/patient/:id` | Patient info (requires session) |
| POST | `/api/doctor/patient/:id/record` | Submit new medical record |
| GET/PUT | `/api/doctor/profile` | Doctor profile |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/admin/doctors` | List / register doctors |
| PATCH | `/api/admin/doctors/:id/toggle-approval` | Toggle doctor status |
| GET | `/api/admin/analytics/heatmap` | k-Anonymized geo clusters |
| GET | `/api/admin/analytics/outbreak-alerts` | Recent disease surges |
| GET | `/api/admin/analytics/pharmacy-demand` | Medicine demand stats |
| GET | `/api/admin/analytics/demographic-risk` | Risk matrix by category |

---

## Environment Variables

### Backend `.env`
```
MONGO_URI=mongodb://localhost:27017/hlth01
JWT_SECRET=your_super_secret_jwt_key_change_in_production
PORT=5000
```

### Frontend `.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_JWT_SECRET=your_super_secret_jwt_key_change_in_production
```
