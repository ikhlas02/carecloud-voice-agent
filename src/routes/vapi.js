/**
 * Vapi Webhook Handler — Voice Agent ↔ Database Integration
 * 
 * Handles Vapi server messages (tool calls) for:
 * - save_patient: Creates a new patient record
 * - check_existing_patient: Duplicate detection by phone number
 * - update_patient: Updates an existing patient record
 * 
 * Vapi sends POST requests with tool call payloads when the voice
 * agent decides to invoke a function. We process the call, interact
 * with the database, and return the result to Vapi to relay to the caller.
 * 
 * Reference: https://docs.vapi.ai/server-url
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { validatePatient } = require('../validators');

/**
 * POST /vapi/webhook
 * Main webhook endpoint for all Vapi server events.
 * Handles: tool-calls, status-update, end-of-call-report, etc.
 */
router.post('/webhook', (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      console.log('📞 Vapi webhook received (no message body):', JSON.stringify(req.body).slice(0, 200));
      return res.status(200).json({});
    }

    const messageType = message.type;
    console.log(`📞 Vapi webhook: ${messageType}`);

    switch (messageType) {
      case 'tool-calls':
        return handleToolCalls(message, res);
      
      case 'status-update':
        return handleStatusUpdate(message, res);
      
      case 'end-of-call-report':
        return handleEndOfCallReport(message, res);

      case 'assistant-request':
        return handleAssistantRequest(message, res);

      case 'function-call':
        // Legacy function call format
        return handleLegacyFunctionCall(message, res);

      default:
        console.log(`📞 Unhandled Vapi event type: ${messageType}`);
        return res.status(200).json({});
    }
  } catch (err) {
    console.error('❌ Vapi webhook error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Handle Vapi tool-calls message
 * Processes one or more tool calls from the voice agent
 */
function handleToolCalls(message, res) {
  const toolCalls = message.toolCallList || message.toolCalls || [];
  const results = [];

  for (const toolCall of toolCalls) {
    const functionName = toolCall.function?.name;
    const args = toolCall.function?.arguments;
    const toolCallId = toolCall.id;

    console.log(`🔧 Tool call: ${functionName}`, JSON.stringify(args, null, 2));

    let result;
    switch (functionName) {
      case 'save_patient':
        result = handleSavePatient(args);
        break;
      case 'check_existing_patient':
        result = handleCheckExistingPatient(args);
        break;
      case 'update_patient':
        result = handleUpdatePatient(args);
        break;
      default:
        result = { success: false, message: `Unknown function: ${functionName}` };
    }

    results.push({
      toolCallId: toolCallId,
      result: JSON.stringify(result)
    });
  }

  return res.status(200).json({ results });
}

/**
 * Handle legacy function-call format (older Vapi versions)
 */
function handleLegacyFunctionCall(message, res) {
  const functionCall = message.functionCall || message;
  const functionName = functionCall.name;
  const args = functionCall.parameters || functionCall.arguments || {};

  console.log(`🔧 Legacy function call: ${functionName}`, JSON.stringify(args, null, 2));

  let result;
  switch (functionName) {
    case 'save_patient':
      result = handleSavePatient(args);
      break;
    case 'check_existing_patient':
      result = handleCheckExistingPatient(args);
      break;
    case 'update_patient':
      result = handleUpdatePatient(args);
      break;
    default:
      result = { success: false, message: `Unknown function: ${functionName}` };
  }

  return res.status(200).json({ result: JSON.stringify(result) });
}

/**
 * Save a new patient to the database
 * Called when the voice agent has collected and confirmed all patient info
 */
function handleSavePatient(args) {
  try {
    // Normalize phone number format
    if (args.phone_number) {
      args.phone_number = args.phone_number.replace(/[\s\-\(\)\+\.]/g, '');
      if (args.phone_number.startsWith('1') && args.phone_number.length === 11) {
        args.phone_number = args.phone_number.slice(1);
      }
    }

    // Normalize date format if needed
    if (args.date_of_birth) {
      args.date_of_birth = normalizeDateOfBirth(args.date_of_birth);
    }

    // Normalize state to uppercase
    if (args.state) {
      args.state = args.state.toUpperCase().trim();
    }

    // Validate
    const { valid, errors, sanitized } = validatePatient(args, false);
    if (!valid) {
      console.log('❌ Patient validation failed:', errors);
      return {
        success: false,
        message: `Validation failed: ${errors.join('. ')}. Please ask the caller to correct these fields.`
      };
    }

    // Check for duplicate
    const existing = db.findByPhone(sanitized.phone_number);
    if (existing) {
      return {
        success: false,
        is_duplicate: true,
        existing_patient: {
          patient_id: existing.patient_id,
          first_name: existing.first_name,
          last_name: existing.last_name
        },
        message: `A patient with phone number ${sanitized.phone_number} already exists: ${existing.first_name} ${existing.last_name}. Ask the caller if they would like to update their existing record instead.`
      };
    }

    // Create patient
    const patient = db.createPatient(sanitized);
    console.log(`✅ Patient saved via voice agent: ${patient.first_name} ${patient.last_name} (${patient.patient_id})`);

    return {
      success: true,
      patient_id: patient.patient_id,
      message: `Patient ${patient.first_name} ${patient.last_name} has been successfully registered with ID ${patient.patient_id}.`
    };
  } catch (err) {
    console.error('❌ Error saving patient:', err);
    return {
      success: false,
      message: 'There was a technical error saving the patient record. Please apologize to the caller and suggest they try again.'
    };
  }
}

/**
 * Check if a patient already exists by phone number (duplicate detection)
 */
function handleCheckExistingPatient(args) {
  try {
    const phone = args.phone_number;
    if (!phone) {
      return { exists: false, message: 'No phone number provided.' };
    }

    const normalized = phone.replace(/[\s\-\(\)\+\.]/g, '');
    const patient = db.findByPhone(normalized);

    if (patient) {
      console.log(`🔍 Existing patient found: ${patient.first_name} ${patient.last_name}`);
      return {
        exists: true,
        patient_id: patient.patient_id,
        first_name: patient.first_name,
        last_name: patient.last_name,
        message: `Found existing record for ${patient.first_name} ${patient.last_name}. Ask the caller if they would like to update their information instead of creating a new record.`
      };
    }

    return {
      exists: false,
      message: 'No existing patient found with this phone number. Proceed with new registration.'
    };
  } catch (err) {
    console.error('❌ Error checking existing patient:', err);
    return { exists: false, message: 'Error checking records, proceed with new registration.' };
  }
}

/**
 * Update an existing patient record
 * Used when a returning caller wants to update their information
 */
function handleUpdatePatient(args) {
  try {
    const patientId = args.patient_id;
    if (!patientId) {
      return { success: false, message: 'No patient_id provided for update.' };
    }

    // Remove patient_id from update data
    const updateData = { ...args };
    delete updateData.patient_id;

    // Normalize fields
    if (updateData.phone_number) {
      updateData.phone_number = updateData.phone_number.replace(/[\s\-\(\)\+\.]/g, '');
      if (updateData.phone_number.startsWith('1') && updateData.phone_number.length === 11) {
        updateData.phone_number = updateData.phone_number.slice(1);
      }
    }
    if (updateData.date_of_birth) {
      updateData.date_of_birth = normalizeDateOfBirth(updateData.date_of_birth);
    }
    if (updateData.state) {
      updateData.state = updateData.state.toUpperCase().trim();
    }

    // Validate partial update
    const { valid, errors, sanitized } = validatePatient(updateData, true);
    if (!valid) {
      return {
        success: false,
        message: `Validation failed: ${errors.join('. ')}`
      };
    }

    const patient = db.updatePatient(patientId, sanitized);
    if (!patient) {
      return { success: false, message: 'Patient record not found.' };
    }

    console.log(`✏️  Patient updated via voice agent: ${patient.first_name} ${patient.last_name}`);
    return {
      success: true,
      message: `Successfully updated the record for ${patient.first_name} ${patient.last_name}.`
    };
  } catch (err) {
    console.error('❌ Error updating patient:', err);
    return {
      success: false,
      message: 'There was a technical error updating the record. Please apologize and suggest trying again.'
    };
  }
}

/**
 * Handle status update events (call started, ringing, connected, ended)
 */
function handleStatusUpdate(message, res) {
  const status = message.status;
  const callId = message.call?.id;
  console.log(`📞 Call status: ${status} (Call ID: ${callId || 'N/A'})`);

  if (status === 'ended') {
    const endedReason = message.endedReason || 'unknown';
    const duration = message.call?.duration;
    console.log(`📞 Call ended — Reason: ${endedReason}, Duration: ${duration || 'N/A'}s`);
  }

  return res.status(200).json({});
}

/**
 * Handle end-of-call report (conversation summary and transcript)
 */
function handleEndOfCallReport(message, res) {
  console.log('\n📋 ═══════════════════════════════════════════');
  console.log('📋 END OF CALL REPORT');
  console.log('📋 ═══════════════════════════════════════════');
  
  if (message.summary) {
    console.log(`📋 Summary: ${message.summary}`);
  }
  
  if (message.transcript) {
    console.log(`📋 Transcript:\n${message.transcript}`);
  }
  
  if (message.recordingUrl) {
    console.log(`📋 Recording: ${message.recordingUrl}`);
  }

  const duration = message.call?.duration;
  if (duration) {
    console.log(`📋 Duration: ${duration}s`);
  }

  console.log('📋 ═══════════════════════════════════════════\n');
  
  return res.status(200).json({});
}

/**
 * Handle assistant-request (Vapi requesting assistant config dynamically)
 */
function handleAssistantRequest(message, res) {
  console.log('📞 Assistant request received');
  // Return empty to use the default assistant config
  return res.status(200).json({});
}

/**
 * Normalize date of birth from various formats to MM/DD/YYYY
 */
function normalizeDateOfBirth(dob) {
  if (!dob) return dob;
  
  // Already in MM/DD/YYYY format
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dob)) return dob;
  
  // ISO format: YYYY-MM-DD
  const isoMatch = dob.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[2].padStart(2, '0')}/${isoMatch[3].padStart(2, '0')}/${isoMatch[1]}`;
  }

  // Try other common formats
  // MM-DD-YYYY
  const dashMatch = dob.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    return `${dashMatch[1].padStart(2, '0')}/${dashMatch[2].padStart(2, '0')}/${dashMatch[3]}`;
  }

  // Month name format: "March 15, 1985" or "March 15 1985"
  const months = {
    'january': '01', 'february': '02', 'march': '03', 'april': '04',
    'may': '05', 'june': '06', 'july': '07', 'august': '08',
    'september': '09', 'october': '10', 'november': '11', 'december': '12'
  };
  
  const nameMatch = dob.match(/^([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (nameMatch) {
    const monthNum = months[nameMatch[1].toLowerCase()];
    if (monthNum) {
      return `${monthNum}/${nameMatch[2].padStart(2, '0')}/${nameMatch[3]}`;
    }
  }

  return dob; // Return as-is if no format matches, let validation catch it
}

module.exports = router;
