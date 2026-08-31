/**
 * Database Layer — SQLite with better-sqlite3
 * 
 * Handles all patient data persistence with proper schema,
 * constraints, and CRUD operations. Uses WAL mode for
 * concurrent read performance.
 */

const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Ensure data directory exists
const DATA_DIR = path.resolve(process.env.DATABASE_PATH ? path.dirname(process.env.DATABASE_PATH) : './data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, 'patients.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema Creation ────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    patient_id        TEXT PRIMARY KEY,
    first_name        TEXT NOT NULL CHECK(length(first_name) BETWEEN 1 AND 50),
    last_name         TEXT NOT NULL CHECK(length(last_name) BETWEEN 1 AND 50),
    date_of_birth     TEXT NOT NULL,
    sex               TEXT NOT NULL CHECK(sex IN ('Male', 'Female', 'Other', 'Decline to Answer')),
    phone_number      TEXT NOT NULL,
    email             TEXT,
    address_line_1    TEXT NOT NULL,
    address_line_2    TEXT,
    city              TEXT NOT NULL CHECK(length(city) BETWEEN 1 AND 100),
    state             TEXT NOT NULL CHECK(length(state) = 2),
    zip_code          TEXT NOT NULL,
    insurance_provider    TEXT,
    insurance_member_id   TEXT,
    preferred_language    TEXT DEFAULT 'English',
    emergency_contact_name  TEXT,
    emergency_contact_phone TEXT,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at        TEXT DEFAULT NULL
  );
`);

// Index for common query filters
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_patients_last_name ON patients(last_name);
  CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone_number);
  CREATE INDEX IF NOT EXISTS idx_patients_dob ON patients(date_of_birth);
`);

// ─── CRUD Operations ────────────────────────────────────────────

/**
 * Create a new patient record
 * @param {Object} data - Patient data (validated before calling)
 * @returns {Object} The created patient record
 */
function createPatient(data) {
  const patientId = uuidv4();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO patients (
      patient_id, first_name, last_name, date_of_birth, sex,
      phone_number, email, address_line_1, address_line_2,
      city, state, zip_code, insurance_provider, insurance_member_id,
      preferred_language, emergency_contact_name, emergency_contact_phone,
      created_at, updated_at
    ) VALUES (
      @patient_id, @first_name, @last_name, @date_of_birth, @sex,
      @phone_number, @email, @address_line_1, @address_line_2,
      @city, @state, @zip_code, @insurance_provider, @insurance_member_id,
      @preferred_language, @emergency_contact_name, @emergency_contact_phone,
      @created_at, @updated_at
    )
  `);

  stmt.run({
    patient_id: patientId,
    first_name: data.first_name,
    last_name: data.last_name,
    date_of_birth: data.date_of_birth,
    sex: data.sex,
    phone_number: data.phone_number,
    email: data.email || null,
    address_line_1: data.address_line_1,
    address_line_2: data.address_line_2 || null,
    city: data.city,
    state: data.state,
    zip_code: data.zip_code,
    insurance_provider: data.insurance_provider || null,
    insurance_member_id: data.insurance_member_id || null,
    preferred_language: data.preferred_language || 'English',
    emergency_contact_name: data.emergency_contact_name || null,
    emergency_contact_phone: data.emergency_contact_phone || null,
    created_at: now,
    updated_at: now
  });

  return findById(patientId);
}

/**
 * Find all patients (excluding soft-deleted), with optional filters
 * @param {Object} filters - Optional: { last_name, date_of_birth, phone_number }
 * @returns {Array} List of patient records
 */
function findAll(filters = {}) {
  let query = 'SELECT * FROM patients WHERE deleted_at IS NULL';
  const params = {};

  if (filters.last_name) {
    query += ' AND LOWER(last_name) = LOWER(@last_name)';
    params.last_name = filters.last_name;
  }
  if (filters.date_of_birth) {
    query += ' AND date_of_birth = @date_of_birth';
    params.date_of_birth = filters.date_of_birth;
  }
  if (filters.phone_number) {
    // Normalize phone number for search (strip non-digits)
    const normalized = filters.phone_number.replace(/\D/g, '');
    query += " AND REPLACE(REPLACE(REPLACE(REPLACE(phone_number, '-', ''), '(', ''), ')', ''), ' ', '') = @phone_number";
    params.phone_number = normalized;
  }


  query += ' ORDER BY created_at DESC';
  return db.prepare(query).all(params);
}

/**
 * Find a patient by UUID
 * @param {string} id - Patient UUID
 * @returns {Object|undefined} Patient record or undefined
 */
function findById(id) {
  return db.prepare('SELECT * FROM patients WHERE patient_id = ? AND deleted_at IS NULL').get(id);
}

/**
 * Find a patient by phone number (for duplicate detection)
 * @param {string} phone - Phone number
 * @returns {Object|undefined} Patient record or undefined
 */
function findByPhone(phone) {
  const normalized = phone.replace(/\D/g, '');
  return db.prepare(`
    SELECT * FROM patients 
    WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone_number, '-', ''), '(', ''), ')', ''), ' ', '') = ? 
    AND deleted_at IS NULL
  `).get(normalized);
}


/**
 * Update a patient record (partial updates supported)
 * @param {string} id - Patient UUID
 * @param {Object} data - Fields to update
 * @returns {Object|null} Updated patient record or null if not found
 */
function updatePatient(id, data) {
  const existing = findById(id);
  if (!existing) return null;

  const allowedFields = [
    'first_name', 'last_name', 'date_of_birth', 'sex',
    'phone_number', 'email', 'address_line_1', 'address_line_2',
    'city', 'state', 'zip_code', 'insurance_provider', 'insurance_member_id',
    'preferred_language', 'emergency_contact_name', 'emergency_contact_phone'
  ];

  const updates = [];
  const params = { patient_id: id };

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = @${field}`);
      params[field] = data[field];
    }
  }

  if (updates.length === 0) return existing;

  updates.push("updated_at = datetime('now')");
  
  const query = `UPDATE patients SET ${updates.join(', ')} WHERE patient_id = @patient_id`;
  db.prepare(query).run(params);

  return findById(id);
}

/**
 * Soft-delete a patient (set deleted_at timestamp)
 * @param {string} id - Patient UUID
 * @returns {boolean} True if record was found and soft-deleted
 */
function softDelete(id) {
  const result = db.prepare(`
    UPDATE patients SET deleted_at = datetime('now'), updated_at = datetime('now')
    WHERE patient_id = ? AND deleted_at IS NULL
  `).run(id);
  return result.changes > 0;
}

/**
 * Seed demonstration data
 */
function seedData() {
  const count = db.prepare('SELECT COUNT(*) as count FROM patients WHERE deleted_at IS NULL').get();
  if (count.count > 0) return; // Don't seed if data already exists

  console.log('🌱 Seeding demonstration patient records...');
  
  createPatient({
    first_name: 'Jane',
    last_name: 'Doe',
    date_of_birth: '03/15/1985',
    sex: 'Female',
    phone_number: '5551234567',
    email: 'jane.doe@email.com',
    address_line_1: '123 Main Street',
    address_line_2: 'Apt 4B',
    city: 'Austin',
    state: 'TX',
    zip_code: '73301',
    insurance_provider: 'Blue Cross Blue Shield',
    insurance_member_id: 'BCBS-987654',
    preferred_language: 'English',
    emergency_contact_name: 'John Doe',
    emergency_contact_phone: '5559876543'
  });

  createPatient({
    first_name: 'Carlos',
    last_name: 'Rivera',
    date_of_birth: '07/22/1990',
    sex: 'Male',
    phone_number: '5552345678',
    email: 'carlos.rivera@email.com',
    address_line_1: '456 Oak Avenue',
    city: 'Miami',
    state: 'FL',
    zip_code: '33101',
    preferred_language: 'Spanish'
  });

  console.log('✅ Seeded 2 demonstration patient records');
}

module.exports = {
  db,
  createPatient,
  findAll,
  findById,
  findByPhone,
  updatePatient,
  softDelete,
  seedData
};
