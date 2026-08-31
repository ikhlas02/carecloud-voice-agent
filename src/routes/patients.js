/**
 * REST API Routes — Patient CRUD Endpoints
 * 
 * All endpoints return consistent JSON envelope: { data, error }
 * Proper HTTP status codes: 200, 201, 400, 404, 422, 500
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { validatePatient } = require('../validators');

/**
 * GET /patients
 * List all patients. Supports optional query filters:
 *   ?last_name=Smith
 *   ?date_of_birth=03/15/1985
 *   ?phone_number=5551234567
 */
router.get('/', (req, res) => {
  try {
    const filters = {};
    if (req.query.last_name) filters.last_name = req.query.last_name;
    if (req.query.date_of_birth) filters.date_of_birth = req.query.date_of_birth;
    if (req.query.phone_number) filters.phone_number = req.query.phone_number;

    const patients = db.findAll(filters);
    res.json({ data: patients, error: null });
  } catch (err) {
    console.error('GET /patients error:', err);
    res.status(500).json({ data: null, error: 'Internal server error' });
  }
});

/**
 * GET /patients/:id
 * Retrieve a single patient by UUID
 */
router.get('/:id', (req, res) => {
  try {
    const patient = db.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ data: null, error: 'Patient not found' });
    }
    res.json({ data: patient, error: null });
  } catch (err) {
    console.error('GET /patients/:id error:', err);
    res.status(500).json({ data: null, error: 'Internal server error' });
  }
});

/**
 * POST /patients
 * Create a new patient. Validates all inputs server-side.
 * Returns 201 with the created record including patient_id.
 */
router.post('/', (req, res) => {
  try {
    const { valid, errors, sanitized } = validatePatient(req.body, false);
    
    if (!valid) {
      return res.status(422).json({ data: null, error: errors });
    }

    const patient = db.createPatient(sanitized);
    console.log(`✅ Patient created: ${patient.first_name} ${patient.last_name} (${patient.patient_id})`);
    res.status(201).json({ data: patient, error: null });
  } catch (err) {
    console.error('POST /patients error:', err);
    if (err.message && err.message.includes('CONSTRAINT')) {
      return res.status(422).json({ data: null, error: 'Data constraint violation: ' + err.message });
    }
    res.status(500).json({ data: null, error: 'Internal server error' });
  }
});

/**
 * PUT /patients/:id
 * Update an existing patient record. Partial updates allowed.
 */
router.put('/:id', (req, res) => {
  try {
    const existing = db.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ data: null, error: 'Patient not found' });
    }

    // Only validate fields that are being updated
    const { valid, errors, sanitized } = validatePatient(req.body, true);
    
    if (!valid) {
      return res.status(422).json({ data: null, error: errors });
    }

    if (Object.keys(sanitized).length === 0) {
      return res.status(400).json({ data: null, error: 'No valid fields provided for update' });
    }

    const patient = db.updatePatient(req.params.id, sanitized);
    console.log(`✏️  Patient updated: ${patient.first_name} ${patient.last_name} (${patient.patient_id})`);
    res.json({ data: patient, error: null });
  } catch (err) {
    console.error('PUT /patients/:id error:', err);
    res.status(500).json({ data: null, error: 'Internal server error' });
  }
});

/**
 * DELETE /patients/:id
 * Soft-delete a patient record (sets deleted_at timestamp, does NOT hard-delete)
 */
router.delete('/:id', (req, res) => {
  try {
    const deleted = db.softDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ data: null, error: 'Patient not found' });
    }
    console.log(`🗑️  Patient soft-deleted: ${req.params.id}`);
    res.json({ data: { message: 'Patient record deleted successfully' }, error: null });
  } catch (err) {
    console.error('DELETE /patients/:id error:', err);
    res.status(500).json({ data: null, error: 'Internal server error' });
  }
});

module.exports = router;
