const mongoose = require('mongoose');

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const patientLocationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      default: 'Point',
      enum: ['Point'],
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: undefined,
    },
  },
  { _id: false }
);

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String },
    dosage: { type: String },
    quantity: { type: Number },
    frequency: { type: String },
    price: { type: Number },
  },
  { _id: false }
);

// ─── MedicalRecord Schema ─────────────────────────────────────────────────────

const medicalRecordSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient ID is required'],
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Doctor ID is required'],
    },
    visitDate: {
      type: Date,
      default: Date.now,
    },
    diagnosis: {
      type: String,
      required: [true, 'Diagnosis is required'],
      trim: true,
    },
    diseaseCategory: {
      type: String,
      required: [true, 'Disease category is required'],
      enum: ['Infectious', 'Respiratory', 'Vector-borne', 'Waterborne', 'Chronic'],
    },
    symptoms: {
      type: [String],
      default: [],
    },
    consultationFee: {
      type: Number,
    },
    medicines: {
      type: [medicineSchema],
      default: [],
    },

    // ── Snapshot demographics (copied at time of visit) ────────────────────────
    residentialAddress: { type: String },
    pincode: { type: String },
    patientLocation: {
      type: patientLocationSchema,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
medicalRecordSchema.index({ patientLocation: '2dsphere' }, { sparse: true });
medicalRecordSchema.index({ patientId: 1, visitDate: -1 });
medicalRecordSchema.index({ diseaseCategory: 1, pincode: 1 });
medicalRecordSchema.index({ visitDate: -1 });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
