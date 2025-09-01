const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'supersecret';

// Demo "database"
let db = {
  users: {}, // { email: { passwordHash } }
  otps: {},  // { email: { code, expires } }
  resetTokens: {} // { token: { email, expires } }
};

app.use(bodyParser.json());
app.use(express.static('.')); // serve index.html

// ✅ Register
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (db.users[email]) return res.status(400).json({ message: 'User already exists' });

  const passwordHash = await bcrypt.hash(password, 10);
  db.users[email] = { passwordHash };
  res.json({ message: 'Registered successfully' });
});

// ✅ Login with password
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.users[email];
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(400).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ message: 'Login successful', token });
});

// ✅ Send OTP
app.post('/api/send-otp', (req, res) => {
  const { email } = req.body;
  if (!db.users[email]) return res.status(400).json({ message: 'User not found' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  db.otps[email] = { code: otp, expires: Date.now() + 5 * 60 * 1000 };

  console.log(`OTP for ${email}: ${otp}`); // Demo only
  res.json({ message: 'OTP sent (check server logs)' });
});

// ✅ Verify OTP
app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const record = db.otps[email];
  if (!record || record.expires < Date.now() || record.code !== otp) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  delete db.otps[email];
  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ message: 'OTP verified, login successful', token });
});

// ✅ Forgot password (link method)
app.post('/api/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!db.users[email]) return res.json({ message: 'If email exists, reset link sent' });

  const resetToken = crypto.randomBytes(20).toString('hex');
  db.resetTokens[resetToken] = { email, expires: Date.now() + 15 * 60 * 1000 };

  console.log(`Password reset link: http://localhost:${PORT}/reset.html?token=${resetToken}`);
  res.json({ message: 'If email exists, reset link sent' });
});

// ✅ Reset password (link method)
app.post('/api/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  const record = db.resetTokens[token];
  if (!record || record.expires < Date.now()) {
    return res.status(400).json({ message: 'Invalid or expired reset token' });
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  db.users[record.email].passwordHash = newPasswordHash;
  delete db.resetTokens[token];

  res.json({ message: 'Password reset successfully' });
});

// ✅ Forgot password (OTP method)
app.post('/api/forgot-password-otp', (req, res) => {
  const { email } = req.body;
  if (!db.users[email]) return res.json({ message: 'If email exists, OTP sent' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  db.otps[email] = { code: otp, expires: Date.now() + 5 * 60 * 1000 };

  console.log(`Password reset OTP for ${email}: ${otp}`);
  res.json({ message: 'If email exists, OTP sent' });
});

// ✅ Reset password (OTP method)
app.post('/api/reset-password-otp', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const record = db.otps[email];
  if (!record || record.expires < Date.now() || record.code !== otp) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  db.users[email].passwordHash = newPasswordHash;
  delete db.otps[email];

  res.json({ message: 'Password reset successfully' });
});

app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
