const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const pointSchema = new mongoose.Schema(
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

// ─── User Schema ──────────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema(
  {
    // ── Common fields ──────────────────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['PATIENT', 'DOCTOR', 'ADMIN'],
      default: 'PATIENT',
    },
    isApproved: {
      type: Boolean,
      default: false,
    },

    // ── Patient-specific fields ────────────────────────────────────────────────
    residentialAddress: { type: String, trim: true },
    pincode: { type: String, trim: true },
    location: {
      type: pointSchema,
      default: undefined,
    },

    // ── Doctor-specific fields ─────────────────────────────────────────────────
    licenseNumber: { type: String, trim: true },
    hospitalName: { type: String, trim: true },
    specialization: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index({ location: '2dsphere' }, { sparse: true });
userSchema.index({ email: 1 }, { unique: true });

// ─── Pre-save Hook: Hash Password ─────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  // Only hash if password field was modified (new doc or explicit change)
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ─── Instance Method: comparePassword ────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── toJSON: Strip password from serialised output ───────────────────────────
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
