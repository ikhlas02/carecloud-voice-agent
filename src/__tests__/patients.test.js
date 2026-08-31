/**
 * API Integration Tests — Patient CRUD Endpoints
 * 
 * Uses Node.js built-in test runner (no external test framework needed).
 * Tests all REST API endpoints with validation edge cases.
 * 
 * Run: npm test
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');

// Set test environment
process.env.DATABASE_PATH = './data/test_patients.db';
process.env.NODE_ENV = 'test';

const app = require('../server');

let server;
let BASE_URL;
let createdPatientId;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      BASE_URL = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});


// ─── Test Data ──────────────────────────────────────────────────

const validPatient = {
  first_name: 'Test',
  last_name: 'Patient',
  date_of_birth: '06/15/1990',
  sex: 'Female',
  phone_number: '2125551234',
  email: 'test@example.com',
  address_line_1: '100 Test Street',
  address_line_2: 'Suite 200',
  city: 'New York',
  state: 'NY',
  zip_code: '10001',
  insurance_provider: 'Test Insurance',
  insurance_member_id: 'TI-12345',
  preferred_language: 'English',
  emergency_contact_name: 'Emergency Person',
  emergency_contact_phone: '2125559999'
};

// ─── Helper ─────────────────────────────────────────────────────

async function apiRequest(method, path, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, options);
  const data = await res.json();
  return { status: res.status, body: data };
}

// ─── Tests ──────────────────────────────────────────────────────

describe('Health Check', () => {
  it('GET /health returns healthy status', async () => {
    const { status, body } = await apiRequest('GET', '/health');
    assert.strictEqual(status, 200);
    assert.strictEqual(body.status, 'healthy');
  });
});

describe('POST /patients', () => {
  it('creates a patient with valid data', async () => {
    const { status, body } = await apiRequest('POST', '/patients', validPatient);
    assert.strictEqual(status, 201);
    assert.ok(body.data);
    assert.ok(body.data.patient_id);
    assert.strictEqual(body.data.first_name, 'Test');
    assert.strictEqual(body.data.last_name, 'Patient');
    assert.strictEqual(body.error, null);
    createdPatientId = body.data.patient_id;
  });

  it('rejects missing required fields', async () => {
    const { status, body } = await apiRequest('POST', '/patients', {
      first_name: 'Incomplete'
    });
    assert.strictEqual(status, 422);
    assert.ok(body.error);
    assert.ok(body.error.length > 0);
  });

  it('rejects invalid date of birth (future date)', async () => {
    const { status, body } = await apiRequest('POST', '/patients', {
      ...validPatient,
      date_of_birth: '01/01/2099',
      phone_number: '2125550001'
    });
    assert.strictEqual(status, 422);
    assert.ok(body.error.some(e => e.includes('future')));
  });

  it('rejects invalid phone number (too short)', async () => {
    const { status, body } = await apiRequest('POST', '/patients', {
      ...validPatient,
      phone_number: '123',
    });
    assert.strictEqual(status, 422);
    assert.ok(body.error.some(e => e.includes('phone')));
  });

  it('rejects invalid sex value', async () => {
    const { status, body } = await apiRequest('POST', '/patients', {
      ...validPatient,
      sex: 'InvalidValue',
      phone_number: '2125550002'
    });
    assert.strictEqual(status, 422);
    assert.ok(body.error.some(e => e.includes('sex')));
  });

  it('rejects invalid state abbreviation', async () => {
    const { status, body } = await apiRequest('POST', '/patients', {
      ...validPatient,
      state: 'XX',
      phone_number: '2125550003'
    });
    assert.strictEqual(status, 422);
    assert.ok(body.error.some(e => e.includes('state')));
  });

  it('rejects invalid zip code', async () => {
    const { status, body } = await apiRequest('POST', '/patients', {
      ...validPatient,
      zip_code: '123',
      phone_number: '2125550004'
    });
    assert.strictEqual(status, 422);
    assert.ok(body.error.some(e => e.includes('zip')));
  });
});

describe('GET /patients', () => {
  it('lists all patients', async () => {
    const { status, body } = await apiRequest('GET', '/patients');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);
  });

  it('filters by last_name', async () => {
    const { status, body } = await apiRequest('GET', '/patients?last_name=Patient');
    assert.strictEqual(status, 200);
    assert.ok(body.data.every(p => p.last_name === 'Patient'));
  });

  it('filters by phone_number', async () => {
    const { status, body } = await apiRequest('GET', '/patients?phone_number=2125551234');
    assert.strictEqual(status, 200);
    assert.ok(body.data.length > 0);
  });
});

describe('GET /patients/:id', () => {
  it('returns a patient by ID', async () => {
    const { status, body } = await apiRequest('GET', `/patients/${createdPatientId}`);
    assert.strictEqual(status, 200);
    assert.strictEqual(body.data.patient_id, createdPatientId);
    assert.strictEqual(body.data.first_name, 'Test');
  });

  it('returns 404 for non-existent ID', async () => {
    const { status, body } = await apiRequest('GET', '/patients/00000000-0000-0000-0000-000000000000');
    assert.strictEqual(status, 404);
    assert.ok(body.error);
  });
});

describe('PUT /patients/:id', () => {
  it('updates patient fields', async () => {
    const { status, body } = await apiRequest('PUT', `/patients/${createdPatientId}`, {
      email: 'updated@example.com',
      city: 'Brooklyn'
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.data.email, 'updated@example.com');
    assert.strictEqual(body.data.city, 'Brooklyn');
    // Ensure other fields unchanged
    assert.strictEqual(body.data.first_name, 'Test');
  });

  it('returns 404 for non-existent ID', async () => {
    const { status } = await apiRequest('PUT', '/patients/00000000-0000-0000-0000-000000000000', {
      email: 'x@x.com'
    });
    assert.strictEqual(status, 404);
  });

  it('validates updated fields', async () => {
    const { status, body } = await apiRequest('PUT', `/patients/${createdPatientId}`, {
      state: 'INVALID'
    });
    assert.strictEqual(status, 422);
  });
});

describe('DELETE /patients/:id', () => {
  it('soft-deletes a patient', async () => {
    const { status, body } = await apiRequest('DELETE', `/patients/${createdPatientId}`);
    assert.strictEqual(status, 200);
    assert.ok(body.data.message);
  });

  it('patient no longer appears in list', async () => {
    const { body } = await apiRequest('GET', '/patients');
    const found = body.data.find(p => p.patient_id === createdPatientId);
    assert.strictEqual(found, undefined);
  });

  it('returns 404 for already-deleted patient', async () => {
    const { status } = await apiRequest('DELETE', `/patients/${createdPatientId}`);
    assert.strictEqual(status, 404);
  });
});

describe('GET /patients/:id after delete', () => {
  it('returns 404 for soft-deleted patient', async () => {
    const { status } = await apiRequest('GET', `/patients/${createdPatientId}`);
    assert.strictEqual(status, 404);
  });
});
