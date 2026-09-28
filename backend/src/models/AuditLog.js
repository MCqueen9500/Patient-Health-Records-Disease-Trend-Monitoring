const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
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
    action: {
      type: String,
      default: 'QR_SCAN_ACCESS',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ patientId: 1, timestamp: -1 });
auditLogSchema.index({ doctorId: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
