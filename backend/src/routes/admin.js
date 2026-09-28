const express = require('express');
const User = require('../models/User');
const MedicalRecord = require('../models/MedicalRecord');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

// All admin routes require: valid JWT + ADMIN role
const adminGuard = [protect, requireRole('ADMIN')];

// ─── POST /api/admin/doctors ──────────────────────────────────────────────────
/**
 * Admin registers a new doctor account directly (pre-approved).
 */
router.post('/doctors', ...adminGuard, async (req, res) => {
  try {
    const { name, email, password, licenseNumber, hospitalName, specialization } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: 'name, email, and password are required.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    const doctor = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'DOCTOR',
      isApproved: true,
      licenseNumber: licenseNumber ? String(licenseNumber).trim() : undefined,
      hospitalName: hospitalName ? String(hospitalName).trim() : undefined,
      specialization: specialization ? String(specialization).trim() : undefined,
    });

    return res.status(201).json({ message: 'Doctor registered successfully.', doctor });
  } catch (err) {
    console.error('[POST /admin/doctors]', err);
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email already registered.' });
    }
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─── GET /api/admin/doctors ───────────────────────────────────────────────────
/**
 * Returns all doctors (approved and pending), excluding password hashes.
 */
router.get('/doctors', ...adminGuard, async (req, res) => {
  try {
    const doctors = await User.find({ role: 'DOCTOR' }).select('-password').sort({ createdAt: -1 });
    return res.status(200).json({ doctors });
  } catch (err) {
    console.error('[GET /admin/doctors]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─── PATCH /api/admin/doctors/:id/toggle-approval ────────────────────────────
/**
 * Toggles a doctor's isApproved flag.
 */
router.patch('/doctors/:id/toggle-approval', ...adminGuard, async (req, res) => {
  try {
    const doctor = await User.findOne({ _id: req.params.id, role: 'DOCTOR' });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    doctor.isApproved = !doctor.isApproved;
    await doctor.save();

    return res.status(200).json({
      message: `Doctor ${doctor.isApproved ? 'approved' : 'suspended'} successfully.`,
      doctor: { _id: doctor._id, name: doctor.name, email: doctor.email, isApproved: doctor.isApproved },
    });
  } catch (err) {
    console.error('[PATCH /admin/doctors/:id/toggle-approval]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─── GET /api/admin/analytics/heatmap ────────────────────────────────────────
/**
 * Geographic disease heatmap with k-anonymity (min cluster size = 5).
 * Coordinates are rounded to 3 decimal places for spatial clustering.
 * MongoDB stores [lng, lat]; output swaps to { lat, lng }.
 */
router.get('/analytics/heatmap', ...adminGuard, async (req, res) => {
  try {
    const pipeline = [
      // Only include records that have a valid location
      {
        $match: {
          'patientLocation.coordinates': { $exists: true, $ne: null },
          'patientLocation.coordinates.0': { $exists: true },
        },
      },
      // Round coordinates to 3dp for spatial bucketing / cluster grouping
      {
        $group: {
          _id: {
            lng: {
              $round: [{ $arrayElemAt: ['$patientLocation.coordinates', 0] }, 3],
            },
            lat: {
              $round: [{ $arrayElemAt: ['$patientLocation.coordinates', 1] }, 3],
            },
            pincode: '$pincode',
          },
          count: { $sum: 1 },
          // Track which disease category is most common in this cluster
          diseases: { $push: '$diseaseCategory' },
        },
      },
      // Enforce k-anonymity: suppress clusters with fewer than 5 records
      { $match: { count: { $gte: 5 } } },
      // Determine dominant disease category in the cluster
      {
        $project: {
          _id: 0,
          lat: '$_id.lat',
          lng: '$_id.lng',
          pincode: '$_id.pincode',
          intensity: '$count',
          diseases: 1,
        },
      },
      { $sort: { intensity: -1 } },
    ];

    const rawResults = await MedicalRecord.aggregate(pipeline);

    // Compute dominant disease client-side (simpler than $reduce in Mongo)
    const results = rawResults.map((item) => {
      const freq = {};
      item.diseases.forEach((d) => {
        freq[d] = (freq[d] || 0) + 1;
      });
      const dominantDisease = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      return {
        lat: item.lat,
        lng: item.lng,
        intensity: item.intensity,
        dominantDisease,
        pincode: item.pincode || null,
      };
    });

    return res.status(200).json({ heatmap: results });
  } catch (err) {
    console.error('[GET /admin/analytics/heatmap]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─── GET /api/admin/analytics/outbreak-alerts ────────────────────────────────
/**
 * Detects potential disease outbreaks in the last 14 days.
 * Groups by diseaseCategory + pincode, applies k-anonymity (>=5).
 * Returns top 10 sorted by count desc.
 */
router.get('/analytics/outbreak-alerts', ...adminGuard, async (req, res) => {
  try {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const pipeline = [
      { $match: { visitDate: { $gte: fourteenDaysAgo } } },
      {
        $group: {
          _id: { diseaseCategory: '$diseaseCategory', pincode: '$pincode' },
          count: { $sum: 1 },
          lastSeen: { $max: '$visitDate' },
        },
      },
      // k-anonymity: suppress groups with fewer than 5 records
      { $match: { count: { $gte: 5 } } },
      {
        $project: {
          _id: 0,
          diseaseCategory: '$_id.diseaseCategory',
          pincode: '$_id.pincode',
          count: 1,
          lastSeen: 1,
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ];

    const alerts = await MedicalRecord.aggregate(pipeline);

    return res.status(200).json({ alerts });
  } catch (err) {
    console.error('[GET /admin/analytics/outbreak-alerts]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─── GET /api/admin/analytics/pharmacy-demand ────────────────────────────────
/**
 * Aggregates medicine prescriptions across all records.
 * Returns top 20 medicines by total quantity (k-anonymity: >=5 prescriptions).
 */
router.get('/analytics/pharmacy-demand', ...adminGuard, async (req, res) => {
  try {
    const pipeline = [
      // Expand each medicines array entry into its own document
      { $unwind: '$medicines' },
      {
        $group: {
          _id: '$medicines.name',
          totalQuantity: { $sum: '$medicines.quantity' },
          prescriptions: { $sum: 1 },
          avgPrice: { $avg: '$medicines.price' },
        },
      },
      // k-anonymity: suppress drugs prescribed fewer than 5 times
      { $match: { prescriptions: { $gte: 5 } } },
      {
        $project: {
          _id: 0,
          medicine: '$_id',
          totalQuantity: 1,
          prescriptions: 1,
          avgPrice: { $round: ['$avgPrice', 2] },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 20 },
    ];

    const demand = await MedicalRecord.aggregate(pipeline);

    return res.status(200).json({ pharmacyDemand: demand });
  } catch (err) {
    console.error('[GET /admin/analytics/pharmacy-demand]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─── GET /api/admin/analytics/demographic-risk ───────────────────────────────
/**
 * Aggregates disease risk by category.
 * Returns riskLevel based on total case count.
 * Suppresses pincode lists where fewer than 5 distinct pincodes are seen
 * (k-anonymity applied to the pincode dimension).
 */
router.get('/analytics/demographic-risk', ...adminGuard, async (req, res) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: '$diseaseCategory',
          totalCases: { $sum: 1 },
          avgFee: { $avg: '$consultationFee' },
          pincodes: { $addToSet: '$pincode' },
        },
      },
      {
        $project: {
          _id: 0,
          diseaseCategory: '$_id',
          totalCases: 1,
          avgFee: { $round: ['$avgFee', 2] },
          // k-anonymity: expose pincode list only when >=5 distinct pincodes
          affectedPincodes: {
            $cond: {
              if: { $gte: [{ $size: '$pincodes' }, 5] },
              then: '$pincodes',
              else: ['SUPPRESSED'],
            },
          },
          distinctPincodeCount: { $size: '$pincodes' },
        },
      },
      { $sort: { totalCases: -1 } },
    ];

    const raw = await MedicalRecord.aggregate(pipeline);

    // Attach riskLevel classification
    const risk = raw.map((item) => ({
      diseaseCategory: item.diseaseCategory,
      totalCases: item.totalCases,
      avgFee: item.avgFee,
      affectedPincodes: item.affectedPincodes,
      riskLevel:
        item.totalCases > 20 ? 'HIGH' : item.totalCases > 10 ? 'MEDIUM' : 'LOW',
    }));

    return res.status(200).json({ demographicRisk: risk });
  } catch (err) {
    console.error('[GET /admin/analytics/demographic-risk]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
