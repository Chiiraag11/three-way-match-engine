const express = require('express');
const cors = require('cors');

const { requireAuth } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const documentsRoutes = require('./routes/documents');
const matchRoutes = require('./routes/match');
const summaryRoutes = require('./routes/summary');
const mastersRoutes = require('./routes/masters');

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/auth', authRoutes);
app.use('/documents', requireAuth, documentsRoutes);
app.use('/match', requireAuth, matchRoutes);
app.use('/summary', requireAuth, summaryRoutes);
app.use('/masters/sku', requireAuth, mastersRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Central error handler - never leak stack traces
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[error]', err);
  const status = err.status || 500;
  res.status(status).json({ error: err.publicMessage || 'Internal server error' });
});

module.exports = app;
