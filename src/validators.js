/**
 * Validation Layer — Patient Data Validation
 * 
 * Server-side validation for all patient fields per the spec:
 * - Names: 1-50 chars, alphabetic + hyphens/apostrophes
 * - DOB: Valid date, not in future, MM/DD/YYYY
 * - Sex: Enum values only
 * - Phone: Valid U.S. 10-digit
 * - Email: Valid format (optional)
 * - State: 2-letter abbreviation
 * - Zip: 5-digit or ZIP+4
 */

const VALID_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
  'DC','PR','GU','VI','AS','MP'
]);

const VALID_SEX_VALUES = ['Male', 'Female', 'Other', 'Decline to Answer'];

/**
 * Validate a name field (first_name or last_name)
 */
function validateName(value, fieldName) {
  if (!value || typeof value !== 'string') {
    return `${fieldName} is required`;
  }
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 50) {
    return `${fieldName} must be between 1 and 50 characters`;
  }
  // Allow letters, hyphens, apostrophes, and spaces (for compound names)
  if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
    return `${fieldName} must contain only letters, hyphens, apostrophes, and spaces`;
  }
  return null;
}

/**
 * Validate date of birth (MM/DD/YYYY, not in the future)
 */
function validateDateOfBirth(value) {
  if (!value || typeof value !== 'string') {
    return 'date_of_birth is required';
  }

  // Accept MM/DD/YYYY format
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    return 'date_of_birth must be in MM/DD/YYYY format';
  }

  const [, month, day, year] = match;
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  const y = parseInt(year, 10);

  if (m < 1 || m > 12) return 'date_of_birth has an invalid month';
  if (d < 1 || d > 31) return 'date_of_birth has an invalid day';
  if (y < 1900) return 'date_of_birth year must be 1900 or later';

  const date = new Date(y, m - 1, d);
  if (date.getMonth() !== m - 1 || date.getDate() !== d) {
    return 'date_of_birth is not a valid calendar date';
  }

  if (date > new Date()) {
    return 'date_of_birth cannot be in the future';
  }

  return null;

}

/**
 * Validate sex field
 */
function validateSex(value) {
  if (!value || typeof value !== 'string') {
    return 'sex is required';
  }
  if (!VALID_SEX_VALUES.includes(value)) {
    return `sex must be one of: ${VALID_SEX_VALUES.join(', ')}`;
  }
  return null;
}

/**
 * Validate U.S. phone number (10 digits)
 */
function validatePhoneNumber(value, fieldName = 'phone_number') {
  if (!value || typeof value !== 'string') {
    return `${fieldName} is required`;
  }
  // Strip formatting characters
  const digits = value.replace(/[\s\-\(\)\+\.]/g, '');
  // Remove leading 1 (country code)
  const normalized = digits.startsWith('1') && digits.length === 11 ? digits.slice(1) : digits;
  
  if (normalized.length !== 10 || !/^\d{10}$/.test(normalized)) {
    return `${fieldName} must be a valid U.S. 10-digit phone number`;
  }
  return null;
}

/**
 * Validate email format (optional field)
 */
function validateEmail(value) {
  if (!value || value.trim() === '') return null; // Optional
  // Basic email regex
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'email must be a valid email address';
  }
  return null;
}

/**
 * Validate U.S. state abbreviation
 */
function validateState(value) {
  if (!value || typeof value !== 'string') {
    return 'state is required';
  }
  const upper = value.toUpperCase().trim();
  if (!VALID_STATES.has(upper)) {
    return 'state must be a valid 2-letter U.S. state abbreviation';
  }
  return null;
}

/**
 * Validate ZIP code (5-digit or ZIP+4)
 */
function validateZipCode(value) {
  if (!value || typeof value !== 'string') {
    return 'zip_code is required';
  }
  if (!/^\d{5}(-\d{4})?$/.test(value.trim())) {
    return 'zip_code must be a 5-digit or ZIP+4 format (e.g., 12345 or 12345-6789)';
  }
  return null;
}

/**
 * Validate all patient fields
 * @param {Object} data - Patient data to validate
 * @param {boolean} isUpdate - If true, only validate provided fields
 * @returns {{ valid: boolean, errors: string[], sanitized: Object }}
 */
function validatePatient(data, isUpdate = false) {
  const errors = [];
  const sanitized = {};

  // Required fields (only required on create, optional on update)
  const requiredChecks = [
    { field: 'first_name', validator: (v) => validateName(v, 'first_name'), sanitize: (v) => v.trim() },
    { field: 'last_name', validator: (v) => validateName(v, 'last_name'), sanitize: (v) => v.trim() },
    { field: 'date_of_birth', validator: validateDateOfBirth, sanitize: (v) => v.trim() },
    { field: 'sex', validator: validateSex, sanitize: (v) => v.trim() },
    { field: 'phone_number', validator: (v) => validatePhoneNumber(v, 'phone_number'), sanitize: (v) => v.replace(/[\s\-\(\)\+\.]/g, '').replace(/^1(\d{10})$/, '$1') },
    { field: 'address_line_1', validator: (v) => (!v || !v.trim()) ? 'address_line_1 is required' : (v.trim().length > 200 ? 'address_line_1 is too long' : null), sanitize: (v) => v.trim() },
    { field: 'city', validator: (v) => (!v || !v.trim()) ? 'city is required' : (v.trim().length > 100 ? 'city must be under 100 characters' : null), sanitize: (v) => v.trim() },
    { field: 'state', validator: validateState, sanitize: (v) => v.toUpperCase().trim() },
    { field: 'zip_code', validator: validateZipCode, sanitize: (v) => v.trim() }
  ];

  for (const { field, validator, sanitize } of requiredChecks) {
    if (data[field] !== undefined) {
      const error = validator(data[field]);
      if (error) {
        errors.push(error);
      } else {
        sanitized[field] = sanitize(data[field]);
      }
    } else if (!isUpdate) {
      errors.push(`${field} is required`);
    }
  }

  // Optional fields
  const optionalChecks = [
    { field: 'email', validator: validateEmail, sanitize: (v) => v ? v.trim().toLowerCase() : null },
    { field: 'address_line_2', validator: () => null, sanitize: (v) => v ? v.trim() : null },
    { field: 'insurance_provider', validator: () => null, sanitize: (v) => v ? v.trim() : null },
    { field: 'insurance_member_id', validator: () => null, sanitize: (v) => v ? v.trim() : null },
    { field: 'preferred_language', validator: () => null, sanitize: (v) => v ? v.trim() : 'English' },
    { field: 'emergency_contact_name', validator: () => null, sanitize: (v) => v ? v.trim() : null },
    { field: 'emergency_contact_phone', validator: (v) => v ? validatePhoneNumber(v, 'emergency_contact_phone') : null, sanitize: (v) => v ? v.replace(/[\s\-\(\)\+\.]/g, '').replace(/^1(\d{10})$/, '$1') : null }
  ];

  for (const { field, validator, sanitize } of optionalChecks) {
    if (data[field] !== undefined) {
      const error = validator(data[field]);
      if (error) {
        errors.push(error);
      } else {
        sanitized[field] = sanitize(data[field]);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized
  };
}

module.exports = {
  validatePatient,
  validateName,
  validateDateOfBirth,
  validateSex,
  validatePhoneNumber,
  validateEmail,
  validateState,
  validateZipCode,
  VALID_STATES,
  VALID_SEX_VALUES
};
