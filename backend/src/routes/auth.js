const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const expectedUser = process.env.AUTH_USERNAME || 'admin';
  const expectedPass = process.env.AUTH_PASSWORD || 'admin123';

  if (username !== expectedUser || password !== expectedPass) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = process.env.AUTH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Server auth token is not configured' });
  }

  res.json({ token });
});

module.exports = router;
