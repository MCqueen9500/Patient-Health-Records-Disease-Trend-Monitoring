const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ─── Helper: sign & set auth cookie ──────────────────────────────────────────
const signAndSetCookie = (res, user) => {
  const payload = {
    userId: user._id.toString(),
    role: user.role,
    email: user.email,
    isApproved: user.isApproved,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

  res.cookie('token', token, {
    httpOnly: true,
    secure: false, // set true in production behind HTTPS
    sameSite: 'lax',
    maxAge: 8 * 3600 * 1000, // 8 hours in ms
  });

  return token;
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────
/**
 * Public endpoint – registers a new PATIENT account (role is hardcoded).
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Basic validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ message: 'Name is required.' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ message: 'A valid email is required.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    // Check duplicate email
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    // Create patient (isApproved: true – patients are auto-approved)
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'PATIENT',
      isApproved: true,
    });

    return res.status(201).json({
      message: 'Registration successful.',
      user, // password stripped via toJSON transform
    });
  } catch (err) {
    console.error('[POST /auth/register]', err);
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email already registered.' });
    }
    return res.status(500).json({ message: 'Server error during registration.' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Fetch user including hashed password (select: false not used, so it's always present)
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Doctors must be approved by admin before they can log in
    if (user.role === 'DOCTOR' && !user.isApproved) {
      return res.status(403).json({ message: 'Account pending admin approval.' });
    }

    signAndSetCookie(res, user);

    return res.status(200).json({
      message: 'Login successful.',
      user, // password stripped via toJSON
    });
  } catch (err) {
    console.error('[POST /auth/login]', err);
    return res.status(500).json({ message: 'Server error during login.' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    return res.status(200).json({ user });
  } catch (err) {
    console.error('[GET /auth/me]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', (_req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
  });
  return res.status(200).json({ message: 'Logged out successfully.' });
});

module.exports = router;
