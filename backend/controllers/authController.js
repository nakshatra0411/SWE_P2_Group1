const crypto = require('crypto');
const User = require('../models/User');
const BlacklistToken = require('../models/BlacklistToken');
const PasswordResetToken = require('../models/PasswordResetToken');
const { generateToken } = require('../utils/jwt');
const { validatePassword } = require('../utils/passwordPolicy');

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

exports.login = async (req, res) => {
  try {
    const { userId, password, role } = req.body;
    const user = await User.findOne({ userId });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    if (role && user.role !== role) {
      return res.status(403).json({ error: `Access denied. You are a ${user.role}, not a ${role}.` });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(user._id, user.role);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 
    });

    res.json({ message: 'Logged in successfully', role: user.role, name: user.name });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (token) {
      await BlacklistToken.create({ token });
    }
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    // Convert the in-memory buffer to a Base64 data URL and store in MongoDB
    const base64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { avatar: dataUrl },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
};

// Step 1: user submits userId + email. We always respond 200 with a generic
// message so this endpoint can't be used to enumerate accounts. If the user is
// found AND the email matches, we mint a single-use token and (in production)
// would email it. In dev we return it in `devToken` so the flow is testable.
exports.forgotPassword = async (req, res) => {
  try {
    const { userId, email } = req.body;
    if (!userId || !email) {
      return res.status(400).json({ error: 'userId and email are required' });
    }
    const user = await User.findOne({ userId });
    const message = 'If the account exists, a password reset link has been sent to the registered email address.';

    if (!user || user.email.toLowerCase() !== String(email).toLowerCase()) {
      return res.json({ message });
    }

    // Invalidate previous outstanding tokens for this user
    await PasswordResetToken.deleteMany({ user: user._id, usedAt: { $exists: false } });

    const rawToken = crypto.randomBytes(32).toString('hex');
    await PasswordResetToken.create({
      user: user._id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS)
    });

    // TODO(production): email the link `https://.../reset-password?token=${rawToken}`
    const payload = { message };
    if (process.env.NODE_ENV !== 'production') payload.devToken = rawToken;
    res.json(payload);
  } catch (err) {
    console.error('forgotPassword:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Step 2: user submits the token + new password. Token must exist, be unused,
// not expired, and the new password must satisfy the password policy.
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'token and newPassword are required' });
    }

    const record = await PasswordResetToken.findOne({ tokenHash: hashToken(token) });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Reset link is invalid or has expired. Please request a new one.' });
    }

    const user = await User.findById(record.user);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const check = validatePassword(newPassword, user.userId);
    if (!check.ok) return res.status(400).json({ error: check.error });

    user.password = newPassword;
    await user.save();

    record.usedAt = new Date();
    await record.save();

    res.json({ message: 'Password has been successfully reset.' });
  } catch (err) {
    console.error('resetPassword:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(401).json({ error: 'Current password is incorrect' });

    const check = validatePassword(newPassword, user.userId);
    if (!check.ok) return res.status(400).json({ error: check.error });

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
