const jwt = require('jsonwebtoken');

/**
 * protect – Reads a JWT from the `token` HTTP-only cookie, verifies it, and
 * attaches the decoded payload to `req.user`.  Returns 401 on any failure.
 */
const protect = (req, res, next) => {
  const token = req.cookies && req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, role, email, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
  }
};

/**
 * requireRole – Factory that returns middleware enforcing the caller has one of
 * the allowed roles.  Must come AFTER `protect`.
 *
 * @param {...string} roles  One or more role strings, e.g. 'ADMIN', 'DOCTOR'
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Requires one of: ${roles.join(', ')}.`,
      });
    }
    next();
  };
};

/**
 * requireApproved – Ensures the authenticated user's account has been approved
 * by an admin.  Must come AFTER `protect`.
 */
const requireApproved = (req, res, next) => {
  if (!req.user || req.user.isApproved !== true) {
    return res.status(403).json({
      message: 'Account pending admin approval.',
    });
  }
  next();
};

module.exports = { protect, requireRole, requireApproved };
