/**
 * seed.js – Populates the HLTH01 database with realistic demo data.
 *
 * Run: npm run seed
 *
 * Creates:
 *   • 1 Admin
 *   • 3 Doctors (all approved)
 *   • 15 Patients (all approved, spread across India)
 *   • 50 MedicalRecords (distributed for k-anonymity analytics to work)
 */

require('dotenv').config();

const mongoose = require('mongoose');
const User = require('./src/models/User');
const MedicalRecord = require('./src/models/MedicalRecord');
const AuditLog = require('./src/models/AuditLog');

// ─── Connection ───────────────────────────────────────────────────────────────

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hlth01';

// ─── Seed Data Definitions ────────────────────────────────────────────────────

const adminData = {
  name: 'Dr. Priya Sharma',
  email: 'admin@hlth01.gov',
  password: 'Admin@1234',
  role: 'ADMIN',
  isApproved: true,
};

const doctorsData = [
  {
    name: 'Dr. Arun Mehta',
    email: 'arun.mehta@hospital.com',
    password: 'Doctor@1234',
    role: 'DOCTOR',
    isApproved: true,
    licenseNumber: 'MH-2019-4521',
    hospitalName: 'Apollo Hospital Mumbai',
    specialization: 'General Physician',
  },
  {
    name: 'Dr. Sunita Rao',
    email: 'sunita.rao@hospital.com',
    password: 'Doctor@1234',
    role: 'DOCTOR',
    isApproved: true,
    licenseNumber: 'KA-2017-8834',
    hospitalName: 'Manipal Hospital Bangalore',
    specialization: 'Pulmonologist',
  },
  {
    name: 'Dr. Vikram Singh',
    email: 'vikram.singh@hospital.com',
    password: 'Doctor@1234',
    role: 'DOCTOR',
    isApproved: true,
    licenseNumber: 'DL-2020-2267',
    hospitalName: 'AIIMS Delhi',
    specialization: 'Infectious Disease Specialist',
  },
];

const patientsData = [
  {
    name: 'Rahul Verma',
    email: 'rahul.verma@email.com',
    password: 'Patient@1234',
    role: 'PATIENT',
    isApproved: true,
    residentialAddress: 'Flat 4B, Linking Road, Bandra West',
    pincode: '400050',
    location: { type: 'Point', coordinates: [72.8347, 19.0596] },
  },
  {
    name: 'Priya Patel',
    email: 'priya.patel@email.com',
    password: 'Patient@1234',
    role: 'PATIENT',
    isApproved: true,
    residentialAddress: '12 MG Road, Vile Parle East',
    pincode: '400057',
    location: { type: 'Point', coordinates: [72.8568, 19.0990] },
  },
  {
    name: 'Amit Kumar',
    email: 'amit.kumar@email.com',
    password: 'Patient@1234',
    role: 'PATIENT',
    isApproved: true,
    residentialAddress: '78 Andheri West, Versova Road',
    pincode: '400061',
    location: { type: 'Point', coordinates: [72.8296, 19.1197] },
  },
  {
    name: 'Kavitha Nair',
    email: 'kavitha.nair@email.com',
    password: 'Patient@1234',
    role: 'PATIENT',
    isApproved: true,
    residentialAddress: '23 Koregaon Park, Pune',
    pincode: '411001',
    location: { type: 'Point', coordinates: [73.8932, 18.5362] },
  },
  {
    name: 'Suresh Iyer',
    email: 'suresh.iyer@email.com',
    password: 'Patient@1234',
    role: 'PATIENT',
    isApproved: true,
    residentialAddress: '5 Brigade Road, Bangalore',
    pincode: '560001',
    location: { type: 'Point', coordinates: [77.6093, 12.9726] },
  },
  {
    name: 'Deepa Sharma',
    email: 'deepa.sharma@email.com',
    password: 'Patient@1234',
    role: 'PATIENT',
    isApproved: true,
    residentialAddress: '90 Connaught Place, New Delhi',
    pincode: '110001',
    location: { type: 'Point', coordinates: [77.2167, 28.6317] },
  },
  {
    name: 'Manoj Gupta',
    email: 'manoj.gupta@email.com',
    password: 'Patient@1234',
    role: 'PATIENT',
    isApproved: true,
    residentialAddress: '34 Lajpat Nagar, New Delhi',
    pincode: '110024',
    location: { type: 'Point', coordinates: [77.2431, 28.5694] },
  },
  {
    name: 'Anita Desai',
    email: 'anita.desai@email.com',
    password: 'Patient@1234',
    role: 'PATIENT',
    isApproved: true,
    residentialAddress: '56 Marine Drive, Mumbai',
    pincode: '400020',
    location: { type: 'Point', coordinates: [72.8237, 18.9437] },
  },
  {
    name: 'Rajesh Pillai',
    email: 'rajesh.pillai@email.com',
    password: 'Patient@1234',
    role: 'PATIENT',
    isApproved: true,
    residentialAddress: '19 Indiranagar, Bangalore',
    pincode: '560038',
    location: { type: 'Point', coordinates: [77.6410, 12.9784] },
  },
  {
    name: 'Meena Krishnan',
    email: 'meena.krishnan@email.com',
    password: 'Patient@1234',
    role: 'PATIENT',
    isApproved: true,
    residentialAddress: '7 Anna Salai, Chennai',
    pincode: '600002',
    location: { type: 'Point', coordinates: [80.2707, 13.0524] },
  },
  {
    name: 'Sanjay Bose',
    email: 'sanjay.bose@email.com',
    password: 'Patient@1234',
    role: 'PATIENT',
    isApproved: true,
    residentialAddress: '3 Park Street, Kolkata',
    pincode: '700016',
    location: { type: 'Point', coordinates: [88.3639, 22.5448] },
  },
  {
    name: 'Pooja Singh',
    email: 'pooja.singh@email.com',
    password: 'Patient@1234',
    role: 'PATIENT',
    isApproved: true,
    residentialAddress: '88 Deccan Gymkhana, Pune',
    pincode: '411004',
    location: { type: 'Point', coordinates: [73.8489, 18.5160] },
  },
  {
    name: 'Kiran Rao',
    email: 'kiran.rao@email.com',
    password: 'Patient@1234',
    role: 'PATIENT',
    isApproved: true,
    residentialAddress: '45 Whitefield, Bangalore',
    pincode: '560066',
    location: { type: 'Point', coordinates: [77.7480, 12.9698] },
  },
  {
    name: 'Nisha Malhotra',
    email: 'nisha.malhotra@email.com',
    password: 'Patient@1234',
    role: 'PATIENT',
    isApproved: true,
    residentialAddress: '12 Civil Lines, New Delhi',
    pincode: '110054',
    location: { type: 'Point', coordinates: [77.2090, 28.6747] },
  },
  {
    name: 'Arjun Mehta',
    email: 'arjun.mehta@email.com',
    password: 'Patient@1234',
    role: 'PATIENT',
    isApproved: true,
    residentialAddress: '67 Worli Sea Face, Mumbai',
    pincode: '400018',
    location: { type: 'Point', coordinates: [72.8173, 18.9975] },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns a Date object for N days before now, with optional hour offset.
 * @param {number} daysAgo
 * @param {number} [hoursOffset=0]
 */
const daysAgo = (daysAgo, hoursOffset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(d.getHours() - hoursOffset);
  return d;
};

/**
 * Picks a random element from an array.
 */
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ─── Medical Record Templates ─────────────────────────────────────────────────
// Each template maps to a diseaseCategory and carries realistic clinical data.

const recordTemplates = [
  {
    diagnosis: 'Pulmonary Tuberculosis',
    diseaseCategory: 'Infectious',
    symptoms: ['persistent cough', 'night sweats', 'weight loss', 'fever', 'fatigue', 'haemoptysis'],
    medicines: [
      { name: 'Rifampicin', dosage: '600mg', quantity: 60, frequency: 'Once daily', price: 12 },
      { name: 'Isoniazid', dosage: '300mg', quantity: 60, frequency: 'Once daily', price: 5 },
      { name: 'Pyrazinamide', dosage: '1500mg', quantity: 60, frequency: 'Once daily', price: 8 },
      { name: 'Ethambutol', dosage: '800mg', quantity: 60, frequency: 'Once daily', price: 10 },
    ],
    consultationFee: 1200,
  },
  {
    diagnosis: 'Dengue Fever',
    diseaseCategory: 'Vector-borne',
    symptoms: ['high fever', 'severe headache', 'joint pain', 'skin rash', 'nausea', 'eye pain'],
    medicines: [
      { name: 'Paracetamol', dosage: '500mg', quantity: 30, frequency: 'Every 6 hours', price: 3 },
      { name: 'ORS Sachet', dosage: '1 sachet', quantity: 10, frequency: 'Every 4 hours', price: 8 },
      { name: 'Ondansetron', dosage: '4mg', quantity: 15, frequency: 'Twice daily', price: 20 },
    ],
    consultationFee: 800,
  },
  {
    diagnosis: 'Hypertension Stage 2',
    diseaseCategory: 'Chronic',
    symptoms: ['severe headache', 'dizziness', 'blurred vision', 'chest pain', 'shortness of breath'],
    medicines: [
      { name: 'Amlodipine', dosage: '10mg', quantity: 30, frequency: 'Once daily', price: 15 },
      { name: 'Losartan', dosage: '50mg', quantity: 30, frequency: 'Once daily', price: 18 },
      { name: 'Hydrochlorothiazide', dosage: '25mg', quantity: 30, frequency: 'Once daily', price: 8 },
    ],
    consultationFee: 700,
  },
  {
    diagnosis: 'COVID-19 (Moderate)',
    diseaseCategory: 'Infectious',
    symptoms: ['fever', 'dry cough', 'fatigue', 'loss of taste', 'loss of smell', 'breathlessness'],
    medicines: [
      { name: 'Favipiravir', dosage: '800mg', quantity: 14, frequency: 'Twice daily (loading), then once daily', price: 45 },
      { name: 'Dexamethasone', dosage: '6mg', quantity: 10, frequency: 'Once daily', price: 12 },
      { name: 'Azithromycin', dosage: '500mg', quantity: 5, frequency: 'Once daily', price: 25 },
      { name: 'Zinc Supplement', dosage: '50mg', quantity: 30, frequency: 'Once daily', price: 6 },
    ],
    consultationFee: 1500,
  },
  {
    diagnosis: 'Plasmodium falciparum Malaria',
    diseaseCategory: 'Vector-borne',
    symptoms: ['cyclical fever', 'chills', 'rigors', 'headache', 'vomiting', 'muscle aches'],
    medicines: [
      { name: 'Artemether-Lumefantrine', dosage: '80/480mg', quantity: 24, frequency: 'Twice daily for 3 days', price: 65 },
      { name: 'Primaquine', dosage: '15mg', quantity: 14, frequency: 'Once daily', price: 8 },
      { name: 'Paracetamol', dosage: '650mg', quantity: 20, frequency: 'Every 6 hours as needed', price: 4 },
    ],
    consultationFee: 900,
  },
  {
    diagnosis: 'Community-Acquired Pneumonia',
    diseaseCategory: 'Respiratory',
    symptoms: ['productive cough', 'fever', 'chest pain', 'shortness of breath', 'fatigue', 'chills'],
    medicines: [
      { name: 'Amoxicillin-Clavulanate', dosage: '625mg', quantity: 14, frequency: 'Twice daily', price: 35 },
      { name: 'Azithromycin', dosage: '500mg', quantity: 5, frequency: 'Once daily', price: 25 },
      { name: 'Salbutamol Inhaler', dosage: '100mcg/puff', quantity: 1, frequency: '2 puffs every 4-6 hours', price: 120 },
    ],
    consultationFee: 1000,
  },
  {
    diagnosis: 'Cholera',
    diseaseCategory: 'Waterborne',
    symptoms: ['profuse watery diarrhoea', 'vomiting', 'severe dehydration', 'muscle cramps', 'weakness'],
    medicines: [
      { name: 'ORS Solution', dosage: '200ml per loose stool', quantity: 20, frequency: 'After every loose stool', price: 8 },
      { name: 'Doxycycline', dosage: '300mg', quantity: 1, frequency: 'Single dose', price: 15 },
      { name: 'Zinc Tablet', dosage: '20mg', quantity: 14, frequency: 'Once daily for 14 days', price: 6 },
    ],
    consultationFee: 600,
  },
  {
    diagnosis: 'Typhoid Fever',
    diseaseCategory: 'Waterborne',
    symptoms: ['sustained high fever', 'abdominal pain', 'headache', 'diarrhoea', 'rose spots on skin'],
    medicines: [
      { name: 'Ciprofloxacin', dosage: '500mg', quantity: 14, frequency: 'Twice daily', price: 20 },
      { name: 'Paracetamol', dosage: '500mg', quantity: 20, frequency: 'Every 6 hours as needed', price: 3 },
      { name: 'Metronidazole', dosage: '400mg', quantity: 21, frequency: 'Three times daily', price: 10 },
    ],
    consultationFee: 750,
  },
  {
    diagnosis: 'Bronchial Asthma (Acute Exacerbation)',
    diseaseCategory: 'Respiratory',
    symptoms: ['wheezing', 'chest tightness', 'breathlessness', 'nocturnal cough', 'use of accessory muscles'],
    medicines: [
      { name: 'Salbutamol Inhaler', dosage: '100mcg/puff', quantity: 2, frequency: '2 puffs every 4 hours', price: 120 },
      { name: 'Budesonide Inhaler', dosage: '200mcg/puff', quantity: 1, frequency: '2 puffs twice daily', price: 280 },
      { name: 'Prednisolone', dosage: '30mg', quantity: 5, frequency: 'Once daily for 5 days', price: 5 },
      { name: 'Montelukast', dosage: '10mg', quantity: 30, frequency: 'Once daily at night', price: 22 },
    ],
    consultationFee: 950,
  },
  {
    diagnosis: 'Type 2 Diabetes Mellitus (Uncontrolled)',
    diseaseCategory: 'Chronic',
    symptoms: ['polyuria', 'polydipsia', 'weight loss', 'blurred vision', 'fatigue', 'slow-healing wounds'],
    medicines: [
      { name: 'Metformin', dosage: '1000mg', quantity: 60, frequency: 'Twice daily with meals', price: 12 },
      { name: 'Glimepiride', dosage: '2mg', quantity: 30, frequency: 'Once daily before breakfast', price: 18 },
      { name: 'Sitagliptin', dosage: '100mg', quantity: 30, frequency: 'Once daily', price: 85 },
    ],
    consultationFee: 850,
  },
  {
    diagnosis: 'Leptospirosis',
    diseaseCategory: 'Waterborne',
    symptoms: ['sudden high fever', 'severe headache', 'muscle pain', 'conjunctival redness', 'jaundice'],
    medicines: [
      { name: 'Doxycycline', dosage: '100mg', quantity: 14, frequency: 'Twice daily', price: 15 },
      { name: 'Paracetamol', dosage: '500mg', quantity: 20, frequency: 'Every 6 hours as needed', price: 3 },
      { name: 'Pantoprazole', dosage: '40mg', quantity: 14, frequency: 'Once daily before meals', price: 12 },
    ],
    consultationFee: 800,
  },
  {
    diagnosis: 'Chikungunya Fever',
    diseaseCategory: 'Vector-borne',
    symptoms: ['acute polyarthritis', 'fever', 'skin rash', 'severe joint pain', 'myalgia', 'fatigue'],
    medicines: [
      { name: 'Paracetamol', dosage: '500mg', quantity: 30, frequency: 'Every 6 hours', price: 3 },
      { name: 'Ibuprofen', dosage: '400mg', quantity: 30, frequency: 'Three times daily with food', price: 8 },
      { name: 'Chloroquine', dosage: '150mg', quantity: 20, frequency: 'Twice daily', price: 15 },
    ],
    consultationFee: 700,
  },
  {
    diagnosis: 'Chronic Obstructive Pulmonary Disease (Exacerbation)',
    diseaseCategory: 'Respiratory',
    symptoms: ['increased breathlessness', 'purulent sputum', 'wheezing', 'cyanosis', 'use of accessory muscles'],
    medicines: [
      { name: 'Tiotropium Inhaler', dosage: '18mcg/capsule', quantity: 30, frequency: 'Once daily', price: 350 },
      { name: 'Salmeterol/Fluticasone Inhaler', dosage: '25/250mcg', quantity: 1, frequency: '2 puffs twice daily', price: 420 },
      { name: 'Amoxicillin-Clavulanate', dosage: '625mg', quantity: 10, frequency: 'Twice daily', price: 35 },
      { name: 'Prednisolone', dosage: '40mg', quantity: 5, frequency: 'Once daily', price: 5 },
    ],
    consultationFee: 1300,
  },
  {
    diagnosis: 'Hepatitis A',
    diseaseCategory: 'Waterborne',
    symptoms: ['jaundice', 'dark urine', 'fatigue', 'nausea', 'abdominal discomfort', 'clay-coloured stools'],
    medicines: [
      { name: 'Ursodeoxycholic Acid', dosage: '300mg', quantity: 60, frequency: 'Twice daily', price: 30 },
      { name: 'Silymarin', dosage: '140mg', quantity: 30, frequency: 'Three times daily', price: 25 },
      { name: 'Ondansetron', dosage: '4mg', quantity: 15, frequency: 'Twice daily as needed', price: 20 },
    ],
    consultationFee: 900,
  },
  {
    diagnosis: 'Coronary Artery Disease',
    diseaseCategory: 'Chronic',
    symptoms: ['chest pain on exertion', 'shortness of breath', 'palpitations', 'dizziness', 'excessive sweating'],
    medicines: [
      { name: 'Aspirin', dosage: '75mg', quantity: 30, frequency: 'Once daily after food', price: 5 },
      { name: 'Atorvastatin', dosage: '40mg', quantity: 30, frequency: 'Once daily at night', price: 22 },
      { name: 'Metoprolol', dosage: '50mg', quantity: 30, frequency: 'Twice daily', price: 12 },
      { name: 'Nitroglycerin Spray', dosage: '0.4mg/spray', quantity: 1, frequency: 'As needed for chest pain', price: 180 },
    ],
    consultationFee: 1800,
  },
];

// ─── Seeding Logic ────────────────────────────────────────────────────────────

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[Seed] Connected to MongoDB:', MONGO_URI);

    // ── Clear existing data ────────────────────────────────────────────────────
    await Promise.all([
      User.deleteMany({}),
      MedicalRecord.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);
    console.log('[Seed] Cleared existing collections.');

    // ── Create Admin ───────────────────────────────────────────────────────────
    const admin = new User(adminData);
    await admin.save(); // pre-save hook hashes password
    console.log(`[Seed] Admin created: ${admin.email}`);

    // ── Create Doctors ─────────────────────────────────────────────────────────
    const doctors = [];
    for (const data of doctorsData) {
      const doc = new User(data);
      await doc.save();
      doctors.push(doc);
    }
    console.log(`[Seed] ${doctors.length} doctors created.`);

    // ── Create Patients ────────────────────────────────────────────────────────
    const patients = [];
    for (const data of patientsData) {
      const patient = new User(data);
      await patient.save();
      patients.push(patient);
    }
    console.log(`[Seed] ${patients.length} patients created.`);

    // ── Create 50 Medical Records ──────────────────────────────────────────────
    // Distribution strategy: cycle through patients and templates ensuring that
    // enough records share the same pincode region for k-anonymity (>= 5) to
    // surface in analytics.
    //
    // Pincode distribution plan (to satisfy >= 5 per pincode in analytics):
    //   400050 (Bandra)      → patients[0] (Rahul)   – 5 records
    //   400057 (Vile Parle)  → patients[1] (Priya)   – 4 records + extra Mumbai
    //   400020 (Marine Dr)   → patients[7] (Anita)   – 4 records + extra Mumbai
    //   400018 (Worli)       → patients[14] (Arjun)  – 4 records + extra Mumbai
    //   110001 (CP Delhi)    → patients[5] (Deepa)   – 4 records
    //   110024 (Lajpat Nag) → patients[6] (Manoj)   – 4 records
    //   560001 (Bangalore)   → patients[4] (Suresh)  – 3 records
    //   560038 (Indiranagar) → patients[8] (Rajesh)  – 3 records
    //   411001 (KP Pune)     → patients[3] (Kavitha) – 3 records
    //   others spread evenly

    const recordsToInsert = [];

    // Helper: build a record document (no mongoose pre-save needed for records)
    const buildRecord = (patient, doctor, templateIdx, daysBack, hourBack = 0) => {
      const tpl = recordTemplates[templateIdx % recordTemplates.length];
      return {
        patientId: patient._id,
        doctorId: doctor._id,
        visitDate: daysAgo(daysBack, hourBack),
        diagnosis: tpl.diagnosis,
        diseaseCategory: tpl.diseaseCategory,
        symptoms: tpl.symptoms.slice(0, Math.floor(Math.random() * 3) + 3),
        consultationFee: tpl.consultationFee + (Math.floor(Math.random() * 400) - 200),
        medicines: tpl.medicines.map((m) => ({ ...m })),
        // Snapshot demographics
        residentialAddress: patient.residentialAddress,
        pincode: patient.pincode,
        patientLocation:
          patient.location && patient.location.coordinates
            ? { type: 'Point', coordinates: patient.location.coordinates }
            : undefined,
      };
    };

    // ── Rahul Verma (400050 – Bandra) – 5 records ─────────────────────────────
    recordsToInsert.push(buildRecord(patients[0], doctors[0], 0, 5));
    recordsToInsert.push(buildRecord(patients[0], doctors[0], 3, 15));
    recordsToInsert.push(buildRecord(patients[0], doctors[2], 6, 30));
    recordsToInsert.push(buildRecord(patients[0], doctors[1], 9, 45));
    recordsToInsert.push(buildRecord(patients[0], doctors[0], 12, 60));

    // ── Priya Patel (400057 – Vile Parle) – 4 records ────────────────────────
    recordsToInsert.push(buildRecord(patients[1], doctors[0], 1, 7));
    recordsToInsert.push(buildRecord(patients[1], doctors[2], 4, 20));
    recordsToInsert.push(buildRecord(patients[1], doctors[0], 7, 35));
    recordsToInsert.push(buildRecord(patients[1], doctors[1], 10, 50));

    // ── Amit Kumar (400061 – Andheri) – 3 records ────────────────────────────
    recordsToInsert.push(buildRecord(patients[2], doctors[0], 2, 10));
    recordsToInsert.push(buildRecord(patients[2], doctors[2], 5, 25));
    recordsToInsert.push(buildRecord(patients[2], doctors[0], 8, 40));

    // ── Kavitha Nair (411001 – Pune KP) – 3 records ───────────────────────────
    recordsToInsert.push(buildRecord(patients[3], doctors[1], 3, 12));
    recordsToInsert.push(buildRecord(patients[3], doctors[0], 6, 28));
    recordsToInsert.push(buildRecord(patients[3], doctors[2], 9, 42));

    // ── Suresh Iyer (560001 – Bangalore Brigade) – 3 records ─────────────────
    recordsToInsert.push(buildRecord(patients[4], doctors[1], 4, 8));
    recordsToInsert.push(buildRecord(patients[4], doctors[2], 7, 22));
    recordsToInsert.push(buildRecord(patients[4], doctors[1], 10, 55));

    // ── Deepa Sharma (110001 – CP Delhi) – 4 records ─────────────────────────
    recordsToInsert.push(buildRecord(patients[5], doctors[2], 5, 6));
    recordsToInsert.push(buildRecord(patients[5], doctors[2], 8, 18));
    recordsToInsert.push(buildRecord(patients[5], doctors[0], 11, 33));
    recordsToInsert.push(buildRecord(patients[5], doctors[2], 14, 48));

    // ── Manoj Gupta (110024 – Lajpat Nagar) – 4 records ─────────────────────
    recordsToInsert.push(buildRecord(patients[6], doctors[2], 6, 4));
    recordsToInsert.push(buildRecord(patients[6], doctors[2], 9, 17));
    recordsToInsert.push(buildRecord(patients[6], doctors[1], 12, 32));
    recordsToInsert.push(buildRecord(patients[6], doctors[2], 15, 65));

    // ── Anita Desai (400020 – Marine Drive) – 4 records ──────────────────────
    recordsToInsert.push(buildRecord(patients[7], doctors[0], 7, 3));
    recordsToInsert.push(buildRecord(patients[7], doctors[0], 10, 16));
    recordsToInsert.push(buildRecord(patients[7], doctors[2], 13, 29));
    recordsToInsert.push(buildRecord(patients[7], doctors[0], 0, 72));

    // ── Rajesh Pillai (560038 – Indiranagar) – 3 records ─────────────────────
    recordsToInsert.push(buildRecord(patients[8], doctors[1], 8, 11));
    recordsToInsert.push(buildRecord(patients[8], doctors[1], 11, 24));
    recordsToInsert.push(buildRecord(patients[8], doctors[2], 14, 38));

    // ── Meena Krishnan (600002 – Chennai) – 2 records ────────────────────────
    recordsToInsert.push(buildRecord(patients[9], doctors[2], 9, 13));
    recordsToInsert.push(buildRecord(patients[9], doctors[1], 12, 27));

    // ── Sanjay Bose (700016 – Kolkata) – 2 records ───────────────────────────
    recordsToInsert.push(buildRecord(patients[10], doctors[0], 10, 9));
    recordsToInsert.push(buildRecord(patients[10], doctors[2], 13, 23));

    // ── Pooja Singh (411004 – Deccan Pune) – 2 records ───────────────────────
    recordsToInsert.push(buildRecord(patients[11], doctors[1], 11, 14));
    recordsToInsert.push(buildRecord(patients[11], doctors[0], 14, 37));

    // ── Kiran Rao (560066 – Whitefield) – 2 records ───────────────────────────
    recordsToInsert.push(buildRecord(patients[12], doctors[1], 12, 19));
    recordsToInsert.push(buildRecord(patients[12], doctors[2], 0, 80));

    // ── Nisha Malhotra (110054 – Civil Lines Delhi) – 2 records ──────────────
    recordsToInsert.push(buildRecord(patients[13], doctors[2], 13, 21));
    recordsToInsert.push(buildRecord(patients[13], doctors[0], 0, 85));

    // ── Arjun Mehta (400018 – Worli) – 5 records ─────────────────────────────
    recordsToInsert.push(buildRecord(patients[14], doctors[0], 14, 2));
    recordsToInsert.push(buildRecord(patients[14], doctors[0], 1, 14));
    recordsToInsert.push(buildRecord(patients[14], doctors[2], 4, 26));
    recordsToInsert.push(buildRecord(patients[14], doctors[1], 7, 39));
    recordsToInsert.push(buildRecord(patients[14], doctors[0], 10, 52));

    // Insert all records at once (no password hook on MedicalRecord)
    const inserted = await MedicalRecord.insertMany(recordsToInsert);
    console.log(`[Seed] ${inserted.length} medical records created.`);

    // ── Create a few AuditLog entries ─────────────────────────────────────────
    const auditEntries = [
      { patientId: patients[0]._id, doctorId: doctors[0]._id, action: 'QR_SCAN_ACCESS', timestamp: daysAgo(3) },
      { patientId: patients[1]._id, doctorId: doctors[0]._id, action: 'QR_SCAN_ACCESS', timestamp: daysAgo(5) },
      { patientId: patients[4]._id, doctorId: doctors[1]._id, action: 'QR_SCAN_ACCESS', timestamp: daysAgo(2) },
      { patientId: patients[5]._id, doctorId: doctors[2]._id, action: 'QR_SCAN_ACCESS', timestamp: daysAgo(1) },
      { patientId: patients[7]._id, doctorId: doctors[0]._id, action: 'QR_SCAN_ACCESS', timestamp: daysAgo(4) },
      { patientId: patients[14]._id, doctorId: doctors[0]._id, action: 'QR_SCAN_ACCESS', timestamp: daysAgo(1) },
    ];

    await AuditLog.insertMany(auditEntries);
    console.log(`[Seed] ${auditEntries.length} audit log entries created.`);

    // ── Final counts ───────────────────────────────────────────────────────────
    const [userCount, recordCount, auditCount] = await Promise.all([
      User.countDocuments(),
      MedicalRecord.countDocuments(),
      AuditLog.countDocuments(),
    ]);

    console.log('\n╔══════════════════════════════╗');
    console.log('║       Seed Complete ✓        ║');
    console.log('╠══════════════════════════════╣');
    console.log(`║  Users         : ${String(userCount).padEnd(10)}║`);
    console.log(`║  MedicalRecords: ${String(recordCount).padEnd(10)}║`);
    console.log(`║  AuditLogs     : ${String(auditCount).padEnd(10)}║`);
    console.log('╚══════════════════════════════╝\n');

    console.log('Credentials:');
    console.log('  Admin  → admin@hlth01.gov       / Admin@1234');
    console.log('  Doctor → arun.mehta@hospital.com / Doctor@1234');
    console.log('  Patient→ rahul.verma@email.com  / Patient@1234');
  } catch (err) {
    console.error('[Seed] Fatal error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('[Seed] Disconnected from MongoDB.');
  }
}

seed();
