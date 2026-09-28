const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const MedicalRecord = require('../models/MedicalRecord');
const AuditLog = require('../models/AuditLog');
const { protect, requireRole, requireApproved } = require('../middleware/auth');

const router = express.Router();

// All patient routes require: valid JWT cookie + PATIENT role + approved account
const patientGuard = [protect, requireRole('PATIENT'), requireApproved];

// ─── GET /api/patient/profile ─────────────────────────────────────────────────
router.get('/profile', ...patientGuard, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Patient profile not found.' });
    }
    return res.status(200).json({ user });
  } catch (err) {
    console.error('[GET /patient/profile]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─── PUT /api/patient/profile ─────────────────────────────────────────────────
/**
 * Allows patients to update their residential address, pincode, and GPS
 * coordinates.  Coordinates must be in [longitude, latitude] order (GeoJSON).
 */
router.put('/profile', ...patientGuard, async (req, res) => {
  try {
    const { residentialAddress, pincode, coordinates } = req.body;

    const updateFields = {};

    if (residentialAddress !== undefined) {
      updateFields.residentialAddress = String(residentialAddress).trim();
    }

    if (pincode !== undefined) {
      updateFields.pincode = String(pincode).trim();
    }

    if (coordinates !== undefined) {
      if (
        !Array.isArray(coordinates) ||
        coordinates.length !== 2 ||
        typeof coordinates[0] !== 'number' ||
        typeof coordinates[1] !== 'number'
      ) {
        return res
          .status(400)
          .json({ message: 'coordinates must be a [longitude, latitude] number array.' });
      }
      updateFields.location = {
        type: 'Point',
        coordinates, // [lng, lat]
      };
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: 'No updatable fields provided.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updateFields },
      { new: true, runValidators: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    return res.status(200).json({ message: 'Profile updated.', user });
  } catch (err) {
    console.error('[PUT /patient/profile]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─── GET /api/patient/qr-token ───────────────────────────────────────────────
/**
 * Generates a short-lived (2 min) QR token containing the patient's ID and a
 * one-time nonce.  The frontend encodes this into a QR code that the doctor
 * scans to initiate an access session.
 */
router.get('/qr-token', ...patientGuard, async (req, res) => {
  try {
    const qrPayload = {
      patientId: req.user.userId,
      nonce: crypto.randomUUID(),
    };

    const qrJwt = jwt.sign(qrPayload, process.env.JWT_SECRET, { expiresIn: '2m' });

    return res.status(200).json({ token: qrJwt });
  } catch (err) {
    console.error('[GET /patient/qr-token]', err);
    return res.status(500).json({ message: 'Server error generating QR token.' });
  }
});

// ─── GET /api/patient/history ─────────────────────────────────────────────────
/**
 * Returns all medical records for the authenticated patient, sorted by visit
 * date descending.  Doctor info is populated.
 */
router.get('/history', ...patientGuard, async (req, res) => {
  try {
    const records = await MedicalRecord.find({ patientId: req.user.userId })
      .populate('doctorId', 'name hospitalName specialization')
      .sort({ visitDate: -1 });

    return res.status(200).json({ records });
  } catch (err) {
    console.error('[GET /patient/history]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─── GET /api/patient/audit-logs ─────────────────────────────────────────────
/**
 * Returns all audit log entries showing which doctors have accessed this
 * patient's records via QR scan.
 */
router.get('/audit-logs', ...patientGuard, async (req, res) => {
  try {
    const logs = await AuditLog.find({ patientId: req.user.userId })
      .populate('doctorId', 'name hospitalName')
      .sort({ timestamp: -1 });

    return res.status(200).json({ logs });
  } catch (err) {
    console.error('[GET /patient/audit-logs]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
