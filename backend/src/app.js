require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const env = require('./config/env');
const { healthCheck } = require('./config/db');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.IS_PROD ? 'combined' : 'dev'));

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/health', async (req, res) => {
  let dbOk = false;
  try {
    dbOk = await healthCheck();
  } catch (err) {
    dbOk = false;
  }
  res.status(dbOk ? 200 : 503).json({
    success: dbOk,
    service: 'ai-incident-commander-backend',
    time: new Date().toISOString(),
    db: dbOk ? 'connected' : 'unavailable',
  });
});

app.get('/', (req, res) => {
  res.json({
    service: 'AI Incident Commander API',
    status: 'running',
    docs: 'See API_CONTRACT.md',
  });
});

// ---------------------------------------------------------------------------
// API routes (mounted incrementally as each stage is built)
// ---------------------------------------------------------------------------
app.use('/api/incidents', require('./routes/incidents.routes'));
app.use('/api/reports', require('./routes/reports.routes'));
app.use('/api/resources', require('./routes/resources.routes'));
app.use('/api/assignments', require('./routes/assignments.routes'));
// app.use('/api/alerts', require('./routes/alerts.routes'));
// app.use('/api/analytics', require('./routes/analytics.routes'));

// ---------------------------------------------------------------------------
// 404 + error handling (must be last)
// ---------------------------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
