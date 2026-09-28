const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const MedicalRecord = require('../models/MedicalRecord');
const AuditLog = require('../models/AuditLog');
const { protect, requireRole, requireApproved } = require('../middleware/auth');

const router = express.Router();

// Reusable guard chain for doctor-only approved routes
const doctorGuard = [protect, requireRole('DOCTOR'), requireApproved];

// ─── Helper: verify session token ─────────────────────────────────────────────
/**
 * Verifies the session token passed via ?session= query param.
 * Returns decoded payload or throws.
 */
const verifySessionToken = (sessionToken) => {
  if (!sessionToken) {
    const err = new Error('Session token is required. Please scan patient QR first.');
    err.status = 401;
    throw err;
  }

  let decoded;
  try {
    decoded = jwt.verify(sessionToken, process.env.JWT_SECRET);
  } catch {
    const err = new Error('Invalid or expired session token. Please re-scan patient QR.');
    err.status = 401;
    throw err;
  }

  if (decoded.type !== 'SESSION') {
    const err = new Error('Invalid session token type.');
    err.status = 401;
    throw err;
  }

  return decoded;
};

// ─── GET /api/doctor/profile ──────────────────────────────────────────────────
router.get('/profile', ...doctorGuard, async (req, res) => {
  try {
    const doctor = await User.findById(req.user.userId).select('-password');
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found.' });
    }
    return res.status(200).json({ user: doctor });
  } catch (err) {
    console.error('[GET /doctor/profile]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─── PUT /api/doctor/profile ──────────────────────────────────────────────────
router.put('/profile', ...doctorGuard, async (req, res) => {
  try {
    const { licenseNumber, hospitalName, specialization } = req.body;

    const updateFields = {};
    if (licenseNumber !== undefined) updateFields.licenseNumber = String(licenseNumber).trim();
    if (hospitalName !== undefined) updateFields.hospitalName = String(hospitalName).trim();
    if (specialization !== undefined) updateFields.specialization = String(specialization).trim();

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: 'No updatable fields provided.' });
    }

    const doctor = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updateFields },
      { new: true, runValidators: true, select: '-password' }
    );

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    return res.status(200).json({ message: 'Profile updated.', user: doctor });
  } catch (err) {
    console.error('[PUT /doctor/profile]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─── POST /api/doctor/validate-qr ────────────────────────────────────────────
/**
 * Doctor submits a QR token scanned from patient device.
 * On success:
 *   1. Verifies the short-lived QR JWT.
 *   2. Confirms patientId references a real PATIENT user.
 *   3. Creates an AuditLog entry.
 *   4. Issues a 15-minute SESSION token for subsequent patient data access.
 */
router.post('/validate-qr', ...doctorGuard, async (req, res) => {
  try {
    const { qrToken } = req.body;

    if (!qrToken) {
      return res.status(400).json({ message: 'qrToken is required.' });
    }

    // Verify QR JWT
    let qrPayload;
    try {
      qrPayload = jwt.verify(qrToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'QR code is invalid or has expired.' });
    }

    const { patientId, nonce } = qrPayload;

    if (!patientId || !nonce) {
      return res.status(400).json({ message: 'Malformed QR token payload.' });
    }

    // Confirm patient exists and has PATIENT role
    const patient = await User.findById(patientId).select('-password');
    if (!patient || patient.role !== 'PATIENT') {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    // Write audit log entry
    await AuditLog.create({
      patientId: patient._id,
      doctorId: req.user.userId,
      action: 'QR_SCAN_ACCESS',
    });

    // Issue 15-minute session token
    const sessionPayload = {
      patientId: patient._id.toString(),
      doctorId: req.user.userId,
      type: 'SESSION',
    };

    const sessionToken = jwt.sign(sessionPayload, process.env.JWT_SECRET, { expiresIn: '15m' });

    return res.status(200).json({
      message: 'QR validated. Session started.',
      sessionToken,
      patientId: patient._id.toString(),
      patientName: patient.name,
    });
  } catch (err) {
    console.error('[POST /doctor/validate-qr]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─── GET /api/doctor/patient/:id ─────────────────────────────────────────────
/**
 * Returns patient profile + full medical history.
 * Requires a valid SESSION token passed as ?session=<token>.
 * The session token must reference the same patientId as :id.
 */
router.get('/patient/:id', ...doctorGuard, async (req, res) => {
  try {
    const sessionToken = req.query.session;
    let decoded;
    try {
      decoded = verifySessionToken(sessionToken);
    } catch (err) {
      return res.status(err.status || 401).json({ message: err.message });
    }

    // Ensure the session is for the requested patient
    if (decoded.patientId !== req.params.id) {
      return res.status(403).json({ message: 'Session token does not match requested patient.' });
    }

    // Ensure the session belongs to the requesting doctor
    if (decoded.doctorId !== req.user.userId) {
      return res.status(403).json({ message: 'Session token was issued to a different doctor.' });
    }

    const patient = await User.findById(req.params.id).select(
      'name residentialAddress pincode location role'
    );
    if (!patient || patient.role !== 'PATIENT') {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const records = await MedicalRecord.find({ patientId: patient._id })
      .populate('doctorId', 'name hospitalName specialization')
      .sort({ visitDate: -1 });

    return res.status(200).json({ patient, records });
  } catch (err) {
    console.error('[GET /doctor/patient/:id]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─── POST /api/doctor/patient/:id/record ─────────────────────────────────────
/**
 * Creates a new MedicalRecord for the patient.
 * Requires a valid SESSION token passed as ?session=<token>.
 * Snapshots the patient's current demographics at time of record creation.
 */
router.post('/patient/:id/record', ...doctorGuard, async (req, res) => {
  try {
    const sessionToken = req.query.session;
    let decoded;
    try {
      decoded = verifySessionToken(sessionToken);
    } catch (err) {
      return res.status(err.status || 401).json({ message: err.message });
    }

    if (decoded.patientId !== req.params.id) {
      return res.status(403).json({ message: 'Session token does not match requested patient.' });
    }

    if (decoded.doctorId !== req.user.userId) {
      return res.status(403).json({ message: 'Session token was issued to a different doctor.' });
    }

    const { diagnosis, diseaseCategory, symptoms, consultationFee, medicines } = req.body;

    if (!diagnosis || !diseaseCategory) {
      return res
        .status(400)
        .json({ message: 'diagnosis and diseaseCategory are required.' });
    }

    // Fetch patient for demographic snapshot
    const patient = await User.findById(req.params.id);
    if (!patient || patient.role !== 'PATIENT') {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const record = await MedicalRecord.create({
      patientId: patient._id,
      doctorId: req.user.userId,
      diagnosis: String(diagnosis).trim(),
      diseaseCategory,
      symptoms: Array.isArray(symptoms) ? symptoms : [],
      consultationFee: consultationFee !== undefined ? Number(consultationFee) : undefined,
      medicines: Array.isArray(medicines) ? medicines : [],
      // Snapshot demographics
      residentialAddress: patient.residentialAddress || '',
      pincode: patient.pincode || '',
      patientLocation:
        patient.location && patient.location.coordinates
          ? { type: 'Point', coordinates: patient.location.coordinates }
          : undefined,
    });

    await record.populate('doctorId', 'name hospitalName specialization');

    return res.status(201).json({ message: 'Medical record created.', record });
  } catch (err) {
    console.error('[POST /doctor/patient/:id/record]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
