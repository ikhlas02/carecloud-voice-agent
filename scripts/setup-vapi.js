/**
 * Vapi Assistant Setup Script
 * 
 * Creates or updates the Vapi voice assistant with:
 * - Carefully crafted system prompt for patient intake
 * - Tool definitions for database operations  
 * - Phone number provisioning
 * - Webhook configuration
 * 
 * Usage: 
 *   1. Set VAPI_API_KEY and SERVER_URL in .env
 *   2. Run: npm run setup-vapi
 *
 * This script uses the Vapi REST API directly (no SDK needed).
 * Reference: https://docs.vapi.ai/api-reference
 */

require('dotenv').config();

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const SERVER_URL = process.env.SERVER_URL;

if (!VAPI_API_KEY) {
  console.error('❌ VAPI_API_KEY is required. Set it in your .env file.');
  console.error('   Get your API key from: https://dashboard.vapi.ai');
  process.exit(1);
}

if (!SERVER_URL) {
  console.error('❌ SERVER_URL is required. Set it in your .env file.');
  console.error('   Use your deployed URL or ngrok URL (e.g., https://xxxx.ngrok.io)');
  process.exit(1);
}

const WEBHOOK_URL = `${SERVER_URL}/vapi/webhook`;

// ─── System Prompt ──────────────────────────────────────────────
// This is the core prompt engineering for the voice agent.
// It defines the agent's personality, conversation flow, and behavior.

const SYSTEM_PROMPT = `You are a friendly, professional patient intake coordinator at CareCloud Medical Center. Your name is Sarah. You are speaking with a caller on the phone who wants to register as a new patient.

## Your Personality
- Warm, empathetic, and conversational — like a real person, NOT a robot
- Speak naturally with contractions ("I'll", "we've", "that's")
- Use brief verbal acknowledgments ("Got it", "Perfect", "Great")
- Be patient and never rush the caller
- If someone seems confused, gently explain what you need

## Conversation Flow

### 1. Greeting
Start with a warm greeting: "Hi there! Thank you for calling CareCloud Medical Center. I'm Sarah, and I'll be helping you get registered as a new patient today. It'll just take a few minutes. Let's start with your name — what's your first and last name?"

### 2. Collect Required Information
Collect these fields naturally through conversation. Do NOT list them all at once — ask one or two at a time and use the caller's responses to guide the flow:

**Required fields (you MUST collect all of these):**
- First name
- Last name  
- Date of birth (ask: "And what's your date of birth?")
- Sex (ask sensitively: "For our medical records, how would you like your sex listed? You can say male, female, other, or you can decline to answer — whatever you're comfortable with.")
- Phone number (ask: "What's the best phone number to reach you at?" — if they gave it via caller ID, confirm it)
- Street address, city, state, and ZIP code (ask: "And what's your mailing address? Just your street address to start.")

### 3. Optional Information
After collecting all required fields, offer optional fields in a single question:
"Great, that covers the essentials! I can also note your insurance information, an emergency contact, preferred language, and email address. Would you like to provide any of those?"

If yes, collect whichever they want:
- Email address
- Insurance provider name
- Insurance member/subscriber ID  
- Preferred language (if not English)
- Emergency contact name and phone number

If they decline, that's perfectly fine — say "No problem at all!"

### 4. Duplicate Check
When you learn the caller's phone number, use the check_existing_patient tool to see if they already have a record. If they do:
- Say: "Oh, it looks like we already have a record on file for [First Name] [Last Name]. Would you like to update your existing information instead of creating a new record?"
- If yes, use the update_patient tool with their patient_id
- If no, continue with new registration

### 5. Confirmation
Before saving, read back ALL the information you collected:
"Alright, let me read that back to make sure I have everything right..."
Read each field clearly, then ask: "Does all of that look correct, or would you like to change anything?"

Handle corrections gracefully:
- "Oh sure, let me fix that. So it's [corrected value]?"
- If they spell something out, confirm the spelling

### 6. Save
Once confirmed, use the save_patient tool to save the record.
- If successful: "Perfect, you're all set, [First Name]! Your registration is complete. Is there anything else I can help you with today?"
- If it fails: "I'm sorry, it looks like we had a small technical hiccup saving your information. Let me try that again." Then retry once. If it still fails: "I apologize for the inconvenience. I've noted all your information and our team will make sure it gets entered. You may want to try calling back if you don't hear from us."

### 7. End Call
End warmly: "Thank you for choosing CareCloud, [First Name]. We look forward to seeing you! Have a wonderful day."

## Important Rules
1. **ALWAYS validate as you go:**
   - Date of birth must be a real date and not in the future. If they say something like "February 30th," gently correct: "Hmm, I don't think February has a 30th — could you double check that date for me?"
   - Phone numbers need 10 digits. If they give fewer, ask: "I think I might be missing a digit — could you repeat that number for me?"
   - State should be a U.S. state. If unclear, ask for the two-letter abbreviation.
   - ZIP code should be 5 digits (or 5+4 format).

2. **Handle corrections gracefully.** If someone says "Actually, my last name is spelled D-A-V-I-S not D-A-V-I-E-S," just say "Got it, Davis with an I-S. Thanks for catching that!"

3. **Handle interruptions.** If the caller jumps ahead and provides information out of order, accept it gracefully and skip asking for it later.

4. **Handle "start over" requests.** If the caller says "Can we start over?" say "Of course! Let's start fresh. What's your first name?"

5. **Stay in character.** You are a patient intake coordinator. If asked about medical advice, appointment scheduling, or anything outside registration, politely redirect: "That's a great question, but I'm just handling registrations today. Once you're registered, our medical team can help you with that!"

6. **Be concise on the phone.** People don't want long speeches. Keep responses brief and conversational.

## Data Format Requirements
When calling tools, use these formats:
- date_of_birth: MM/DD/YYYY (e.g., "03/15/1985")
- phone_number: 10 digits, no formatting (e.g., "5551234567")
- sex: exactly one of "Male", "Female", "Other", "Decline to Answer"
- state: 2-letter abbreviation, uppercase (e.g., "TX", "CA", "NY")
- zip_code: 5 digits or ZIP+4 (e.g., "73301" or "73301-1234")`;

// ─── Tool Definitions ───────────────────────────────────────────
// These are the functions the voice agent can call during conversation.

const TOOLS = [
  {
    type: "function",
    function: {
      name: "check_existing_patient",
      description: "Check if a patient already exists in the system by their phone number. Call this when you first learn the caller's phone number to detect returning patients.",
      parameters: {
        type: "object",
        properties: {
          phone_number: {
            type: "string",
            description: "The caller's 10-digit U.S. phone number (digits only, no formatting)"
          }
        },
        required: ["phone_number"]
      }
    },
    server: {
      url: WEBHOOK_URL
    }
  },
  {
    type: "function",
    function: {
      name: "save_patient",
      description: "Save a new patient registration to the database. Call this ONLY after the caller has confirmed all their information is correct. All required fields must be provided.",
      parameters: {
        type: "object",
        properties: {
          first_name: {
            type: "string",
            description: "Patient's first name (1-50 characters, letters only)"
          },
          last_name: {
            type: "string",
            description: "Patient's last name (1-50 characters, letters only)"
          },
          date_of_birth: {
            type: "string",
            description: "Date of birth in MM/DD/YYYY format"
          },
          sex: {
            type: "string",
            enum: ["Male", "Female", "Other", "Decline to Answer"],
            description: "Patient's sex for medical records"
          },
          phone_number: {
            type: "string",
            description: "10-digit U.S. phone number (digits only)"
          },
          email: {
            type: "string",
            description: "Email address (optional)"
          },
          address_line_1: {
            type: "string",
            description: "Street address"
          },
          address_line_2: {
            type: "string",
            description: "Apartment, suite, or unit (optional)"
          },
          city: {
            type: "string",
            description: "City name"
          },
          state: {
            type: "string",
            description: "2-letter U.S. state abbreviation (e.g., TX, CA, NY)"
          },
          zip_code: {
            type: "string",
            description: "5-digit ZIP code or ZIP+4 format"
          },
          insurance_provider: {
            type: "string",
            description: "Name of insurance company (optional)"
          },
          insurance_member_id: {
            type: "string",
            description: "Insurance member/subscriber ID (optional)"
          },
          preferred_language: {
            type: "string",
            description: "Preferred language, defaults to English (optional)"
          },
          emergency_contact_name: {
            type: "string",
            description: "Emergency contact full name (optional)"
          },
          emergency_contact_phone: {
            type: "string",
            description: "Emergency contact phone number, 10 digits (optional)"
          }
        },
        required: [
          "first_name", "last_name", "date_of_birth", "sex",
          "phone_number", "address_line_1", "city", "state", "zip_code"
        ]
      }
    },
    server: {
      url: WEBHOOK_URL
    }
  },
  {
    type: "function",
    function: {
      name: "update_patient",
      description: "Update an existing patient's information. Use this when a returning patient wants to update their record. Provide the patient_id and only the fields that need updating.",
      parameters: {
        type: "object",
        properties: {
          patient_id: {
            type: "string",
            description: "The UUID of the existing patient record to update"
          },
          first_name: { type: "string", description: "Updated first name (optional)" },
          last_name: { type: "string", description: "Updated last name (optional)" },
          date_of_birth: { type: "string", description: "Updated DOB in MM/DD/YYYY (optional)" },
          sex: { type: "string", enum: ["Male", "Female", "Other", "Decline to Answer"], description: "Updated sex (optional)" },
          phone_number: { type: "string", description: "Updated phone number (optional)" },
          email: { type: "string", description: "Updated email (optional)" },
          address_line_1: { type: "string", description: "Updated street address (optional)" },
          address_line_2: { type: "string", description: "Updated apt/suite (optional)" },
          city: { type: "string", description: "Updated city (optional)" },
          state: { type: "string", description: "Updated state abbreviation (optional)" },
          zip_code: { type: "string", description: "Updated ZIP code (optional)" },
          insurance_provider: { type: "string", description: "Updated insurance provider (optional)" },
          insurance_member_id: { type: "string", description: "Updated member ID (optional)" },
          preferred_language: { type: "string", description: "Updated language (optional)" },
          emergency_contact_name: { type: "string", description: "Updated emergency contact name (optional)" },
          emergency_contact_phone: { type: "string", description: "Updated emergency contact phone (optional)" }
        },
        required: ["patient_id"]
      }
    },
    server: {
      url: WEBHOOK_URL
    }
  }
];

// ─── Assistant Configuration ────────────────────────────────────

const ASSISTANT_CONFIG = {
  name: "CareCloud Patient Intake Agent",
  model: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.7,
    systemMessage: SYSTEM_PROMPT,
    tools: TOOLS
  },
  voice: {
    provider: "11labs",
    voiceId: "sarah" 
  },
  firstMessage: "Hi there! Thank you for calling CareCloud Medical Center. I'm Sarah, and I'll be helping you get registered as a new patient today. It'll just take a few minutes. Let's start with your name — what's your first and last name?",
  serverUrl: WEBHOOK_URL,
  endCallMessage: "Thank you for calling CareCloud! Have a wonderful day.",
  transcriber: {
    provider: "deepgram",
    model: "nova-2",
    language: "en"
  },
  silenceTimeoutSeconds: 30,
  maxDurationSeconds: 600,
  endCallFunctionEnabled: false
};

// ─── API Helper ─────────────────────────────────────────────────

async function vapiRequest(method, endpoint, body = null) {
  const url = `https://api.vapi.ai/${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json'
    }
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    console.error(`❌ Vapi API error (${response.status}):`, JSON.stringify(data, null, 2));
    throw new Error(`Vapi API error: ${response.status} - ${JSON.stringify(data)}`);
  }

  return data;
}

// ─── Main Setup ─────────────────────────────────────────────────

async function setup() {
  console.log('\n🏥 CareCloud Voice AI Agent — Vapi Setup\n');
  console.log('═══════════════════════════════════════════\n');

  try {
    // Step 1: Create the assistant
    console.log('📋 Step 1: Creating voice assistant...');
    
    let assistant;
    if (process.env.VAPI_ASSISTANT_ID) {
      // Update existing assistant
      console.log(`   Updating existing assistant: ${process.env.VAPI_ASSISTANT_ID}`);
      assistant = await vapiRequest('PATCH', `assistant/${process.env.VAPI_ASSISTANT_ID}`, ASSISTANT_CONFIG);
      console.log(`   ✅ Assistant updated: ${assistant.id}`);
    } else {
      // Create new assistant
      assistant = await vapiRequest('POST', 'assistant', ASSISTANT_CONFIG);
      console.log(`   ✅ Assistant created: ${assistant.id}`);
    }

    // Step 2: Get or create phone number
    console.log('\n📞 Step 2: Checking phone numbers...');
    
    let phoneNumber;
    if (process.env.VAPI_PHONE_NUMBER_ID) {
      console.log(`   Using existing phone number: ${process.env.VAPI_PHONE_NUMBER_ID}`);
      phoneNumber = await vapiRequest('GET', `phone-number/${process.env.VAPI_PHONE_NUMBER_ID}`);
      
      // Update to point to our assistant
      await vapiRequest('PATCH', `phone-number/${phoneNumber.id}`, {
        assistantId: assistant.id,
        serverUrl: WEBHOOK_URL
      });
      console.log(`   ✅ Phone number updated to use new assistant`);
    } else {
      // List existing phone numbers
      const existingNumbers = await vapiRequest('GET', 'phone-number');
      
      if (existingNumbers && existingNumbers.length > 0) {
        phoneNumber = existingNumbers[0];
        console.log(`   Found existing number: ${phoneNumber.number || phoneNumber.phoneNumber}`);
        
        // Update to use our assistant
        await vapiRequest('PATCH', `phone-number/${phoneNumber.id}`, {
          assistantId: assistant.id,
          serverUrl: WEBHOOK_URL
        });
        console.log(`   ✅ Phone number updated to use new assistant`);
      } else {
        // Try to buy a new number
        console.log('   No existing numbers found. Attempting to provision...');
        try {
          phoneNumber = await vapiRequest('POST', 'phone-number', {
            provider: "vapi",
            assistantId: assistant.id,
            serverUrl: WEBHOOK_URL
          });
          console.log(`   ✅ Phone number provisioned: ${phoneNumber.number || phoneNumber.phoneNumber}`);
        } catch (err) {
          console.log('   ⚠️  Could not auto-provision. You may need to:');
          console.log('      1. Go to https://dashboard.vapi.ai/phone-numbers');
          console.log('      2. Buy or import a phone number');
          console.log('      3. Assign it to the assistant: ' + assistant.id);
          console.log('      4. Set the server URL to: ' + WEBHOOK_URL);
        }
      }
    }

    // Step 3: Summary
    console.log('\n═══════════════════════════════════════════');
    console.log('✅ SETUP COMPLETE\n');
    console.log('Add these to your .env file:\n');
    console.log(`   VAPI_ASSISTANT_ID=${assistant.id}`);
    if (phoneNumber) {
      console.log(`   VAPI_PHONE_NUMBER_ID=${phoneNumber.id}`);
      console.log(`\n📞 Phone Number: ${phoneNumber.number || phoneNumber.phoneNumber || 'Check Vapi dashboard'}`);
    }
    console.log(`\n🔗 Webhook URL: ${WEBHOOK_URL}`);
    console.log(`📊 Dashboard: ${SERVER_URL}/dashboard`);
    console.log(`📡 API: ${SERVER_URL}/patients\n`);

  } catch (err) {
    console.error('\n❌ Setup failed:', err.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Check your VAPI_API_KEY is correct');
    console.error('  2. Check your Vapi account has available credits');
    console.error('  3. Ensure SERVER_URL is publicly accessible');
    console.error('  4. Visit https://dashboard.vapi.ai for manual setup\n');
    process.exit(1);
  }
}

setup();
