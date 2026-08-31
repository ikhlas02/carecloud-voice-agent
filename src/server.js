/**
 * Main Express Server — CareCloud Voice AI Agent
 * 
 * Entry point that configures middleware, mounts routes,
 * seeds demo data, and starts listening.
 * 
 * Architecture:
 *   /patients     → REST API (CRUD for patient records)
 *   /vapi         → Vapi webhook handler (voice agent ↔ database)
 *   /dashboard    → Web dashboard (patient viewer)
 *   /health       → Health check endpoint
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const patientRoutes = require('./routes/patients');
const vapiRoutes = require('./routes/vapi');
const dashboardRoutes = require('./routes/dashboard');
const { seedData } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────────

// Security headers (relaxed CSP for dashboard inline scripts)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));

// CORS — allow all origins for API access during assessment
app.use(cors());

// Request logging
app.use(morgan(':method :url :status :response-time ms - :remote-addr'));

// JSON body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes ─────────────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'CareCloud Voice AI Agent',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root redirect to dashboard
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Patient REST API
app.use('/patients', patientRoutes);

// Vapi webhook
app.use('/vapi', vapiRoutes);

// Dashboard
app.use('/dashboard', dashboardRoutes);

// ─── Error Handling ─────────────────────────────────────────────

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    data: null,
    error: `Route ${req.method} ${req.path} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({
    data: null,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

// ─── Start Server ───────────────────────────────────────────────

if (require.main === module) {
  // Seed demonstration data
  seedData();

  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║   🏥  CareCloud Voice AI Agent                      ║');
    console.log('║   Patient Registration System                       ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log(`║   🌐 Server:     http://localhost:${PORT}               ║`);
    console.log(`║   📊 Dashboard:  http://localhost:${PORT}/dashboard     ║`);
    console.log(`║   📡 API:        http://localhost:${PORT}/patients      ║`);
    console.log(`║   🔗 Vapi Hook:  http://localhost:${PORT}/vapi/webhook  ║`);
    console.log(`║   ❤️  Health:     http://localhost:${PORT}/health        ║`);
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('\n');
  });
}

module.exports = app;

