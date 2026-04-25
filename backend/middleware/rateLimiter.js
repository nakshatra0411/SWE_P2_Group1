const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

const authLimiter = rateLimit({
  windowMs: isDev ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 min dev / 15 min prod
  max: isDev ? 100 : 15,                              // 100 attempts dev / 15 prod
  message: { error: 'Too many login attempts. Please wait a moment and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Successful logins don't count against the limit
});

// Baseline limiter for the whole API. Generous in dev so day-to-day testing
// isn't disrupted; tighter in prod to absorb spam / abuse.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 600 : 120,
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Tighter limiter for expensive endpoints (PDF generation, bulk import).
const heavyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 30 : 5,
  message: { error: 'Rate limit exceeded for this operation. Please wait before retrying.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, apiLimiter, heavyLimiter };
