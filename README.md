# 🏥 CareCloud Voice AI Agent — Patient Registration System

A voice-based AI agent accessible via a real phone number that collects U.S. patient demographic information through natural conversation, persists data to a database, and exposes it through a REST API and web dashboard.

> **Technical Assessment** — Voice AI / Conversational AI Engineer

## 📞 Quick Access

| Resource | URL |
|----------|-----|
| **Phone Number** | _[Set after Vapi setup]_ |
| **Dashboard** | `https://your-app.railway.app/dashboard` |
| **API Base** | `https://your-app.railway.app` |
| **Health Check** | `https://your-app.railway.app/health` |

---

## 🏗️ Architecture

```
Phone Call (Caller)
        │
        ▼
┌──────────────────┐
│   Vapi.ai        │  ← Telephony + STT + TTS
│   Voice Agent    │  ← LLM (GPT-4o-mini)
│   (hosted)       │  ← System Prompt + Tools
└────────┬─────────┘
         │ Webhook (tool calls)
         ▼
┌──────────────────┐
│   Express.js     │  ← REST API + Validation
│   Backend        │  ← Vapi Webhook Handler
│                  │  ← Dashboard (embedded HTML)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   SQLite         │  ← Persistent patient records
│   Database       │  ← WAL mode for concurrency
└──────────────────┘
```

### Separation of Concerns

| Layer | Responsibility | Files |
|-------|---------------|-------|
| **Telephony** | Phone number, STT, TTS, call management | Vapi.ai (external) |
| **LLM Logic** | Conversation flow, prompt engineering, tool invocation | `scripts/setup-vapi.js` (prompt) |
| **Data Layer** | Schema, CRUD operations, validation, persistence | `src/database.js`, `src/validators.js` |
| **API Layer** | REST endpoints, HTTP handling, error responses | `src/routes/patients.js` |
| **Integration** | Voice agent ↔ database via webhooks | `src/routes/vapi.js` |
| **Presentation** | Patient dashboard, stats, search | `src/routes/dashboard.js` |

---

## 🛠️ Tech Stack

| Component | Technology | Justification |
|-----------|-----------|---------------|
| **Telephony + Voice** | [Vapi.ai](https://vapi.ai) | Abstracts telephony/STT/TTS complexity; built-in tool calling; fastest path to production |
| **LLM** | GPT-4o-mini (via Vapi) | Fast, cost-effective, excellent at function calling and conversational tasks |
| **Backend** | Node.js + Express | Lightweight, excellent JSON handling, fastest development velocity |
| **Database** | SQLite (better-sqlite3) | Zero-config, file-based persistence, proper SQL constraints, WAL for concurrency |
| **Voice** | ElevenLabs (via Vapi) | Natural-sounding voice synthesis |
| **STT** | Deepgram Nova-2 (via Vapi) | Fast, accurate speech recognition |

### Trade-off: SQLite vs. PostgreSQL
SQLite was chosen for simplicity and zero-config deployment. For production:
- ✅ Perfect for single-server deployments (this assessment)
- ✅ ACID compliant with WAL mode
- ✅ No external service to manage
- ⚠️ Would switch to PostgreSQL for multi-server or high-concurrency production use

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+ installed
- A [Vapi.ai](https://dashboard.vapi.ai) account (free trial with credits)

### 1. Clone & Install

```bash
git clone <repository-url>
cd carecloud-voice-agent
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
PORT=3000
DATABASE_PATH=./data/patients.db
VAPI_API_KEY=your_vapi_api_key_here
SERVER_URL=https://your-deployed-url.railway.app
```

### 3. Start the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### 4. Set Up Vapi Voice Agent

```bash
# After server is deployed and publicly accessible:
npm run setup-vapi
```

This will:
1. Create the voice assistant with the patient intake prompt
2. Configure tool definitions for database operations
3. Provision or assign a phone number
4. Set up the webhook URL

### 5. Deploy

**Railway (recommended):**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

**Alternative: Docker**
```bash
docker build -t carecloud-agent .
docker run -p 3000:3000 --env-file .env carecloud-agent
```

**Alternative: ngrok (for local testing)**
```bash
ngrok http 3000
# Use the ngrok URL as SERVER_URL in .env
```

---

## 📡 API Reference

All responses follow the envelope format: `{ "data": {...}, "error": null }`

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/patients` | List all patients. Filters: `?last_name=`, `?date_of_birth=`, `?phone_number=` |
| `GET` | `/patients/:id` | Get patient by UUID |
| `POST` | `/patients` | Create new patient |
| `PUT` | `/patients/:id` | Update patient (partial updates) |
| `DELETE` | `/patients/:id` | Soft-delete patient |
| `GET` | `/health` | System health check |
| `GET` | `/dashboard` | Web dashboard |

### Example: Create Patient

```bash
curl -X POST https://your-app.railway.app/patients \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Smith",
    "date_of_birth": "03/15/1985",
    "sex": "Female",
    "phone_number": "5551234567",
    "address_line_1": "123 Main St",
    "city": "Austin",
    "state": "TX",
    "zip_code": "73301"
  }'
```

### Example: Search by Phone

```bash
curl https://your-app.railway.app/patients?phone_number=5551234567
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad request |
| `404` | Not found |
| `422` | Validation error |
| `500` | Server error |

---

## 🗃️ Data Model

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `patient_id` | UUID | Auto | Auto-generated |
| `first_name` | String | Yes | 1-50 chars, alphabetic + hyphens/apostrophes |
| `last_name` | String | Yes | 1-50 chars, alphabetic + hyphens/apostrophes |
| `date_of_birth` | Date | Yes | Valid date, MM/DD/YYYY, not future |
| `sex` | Enum | Yes | Male, Female, Other, Decline to Answer |
| `phone_number` | String | Yes | Valid U.S. 10-digit |
| `email` | String | No | Valid email format |
| `address_line_1` | String | Yes | Street address |
| `address_line_2` | String | No | Apt/Suite/Unit |
| `city` | String | Yes | 1-100 characters |
| `state` | String | Yes | Valid 2-letter U.S. state |
| `zip_code` | String | Yes | 5-digit or ZIP+4 |
| `insurance_provider` | String | No | Insurance company name |
| `insurance_member_id` | String | No | Alphanumeric member ID |
| `preferred_language` | String | No | Default: English |
| `emergency_contact_name` | String | No | Full name |
| `emergency_contact_phone` | String | No | Valid U.S. 10-digit |
| `created_at` | Timestamp | Auto | UTC, auto-generated |
| `updated_at` | Timestamp | Auto | UTC, auto-updated |
| `deleted_at` | Timestamp | Auto | Soft-delete timestamp |

---

## 🎙️ Voice Agent Design

### System Prompt Highlights

The voice agent ("Sarah") is designed to feel like a real human intake coordinator:

1. **Natural conversation flow** — collects info gradually, not as a rigid form
2. **Inline validation** — catches invalid dates, short phone numbers, etc. in real-time
3. **Graceful corrections** — handles spelling corrections and name changes smoothly
4. **Duplicate detection** — checks for existing patients by phone number before creating
5. **Optional field offering** — asks once about insurance/emergency contact/language
6. **Confirmation readback** — reads all info back before saving
7. **Error recovery** — retries on failure, provides graceful fallback messages

### Tool Definitions

| Tool | Purpose |
|------|---------|
| `check_existing_patient` | Duplicate detection by phone number |
| `save_patient` | Create new patient record |
| `update_patient` | Update existing patient record |

The full system prompt is in [`scripts/setup-vapi.js`](scripts/setup-vapi.js) — extensively documented with conversation flow, validation rules, and edge case handling.

---

## ✅ Bonus Features Implemented

| Feature | Status |
|---------|--------|
| Duplicate Detection | ✅ Recognizes returning callers by phone number |
| Dashboard | ✅ Beautiful web UI with search, stats, detail view |
| Automated Tests | ✅ API integration tests with Node.js test runner |
| Conversation Logging | ✅ All tool calls and call reports logged to stdout |
| Call Transcripts | ✅ End-of-call reports captured via Vapi webhook |

---

## 🧪 Running Tests

```bash
npm test
```

Tests cover:
- All CRUD endpoints (create, read, list, update, delete)
- Input validation (future DOB, invalid phone, bad state, etc.)
- Soft-delete behavior
- Query filters
- Edge cases

---

## ⚠️ Known Limitations & Trade-offs

1. **SQLite** — Single-server only. Would need PostgreSQL for horizontal scaling.
2. **No authentication** on the REST API — In production, would add JWT/API key auth.
3. **No HIPAA compliance** — This is a technical assessment, not production healthcare.
4. **Dashboard inline scripts** — For deployment simplicity. Would extract to separate frontend for production.
5. **Vapi dependency** — Telephony is coupled to Vapi. Could abstract behind an interface for provider switching.

## 🔮 Next Steps (If More Time)

1. **Appointment Scheduling** — Add appointment booking after registration
2. **Multi-language Support** — Detect "Hablo español" and switch to Spanish
3. **Authentication** — JWT tokens for API access
4. **Rate Limiting** — Prevent API abuse
5. **Separate Frontend** — React/Next.js dashboard with real-time WebSocket updates
6. **PostgreSQL Migration** — For production-grade persistence
7. **CI/CD Pipeline** — GitHub Actions for automated testing and deployment
8. **Call Recording Storage** — Save recordings linked to patient records

---

## 📁 Project Structure

```
carecloud-voice-agent/
├── src/
│   ├── server.js              # Express app entry point
│   ├── database.js            # SQLite schema, CRUD, seed data
│   ├── validators.js          # Input validation logic
│   ├── routes/
│   │   ├── patients.js        # REST API endpoints
│   │   ├── vapi.js            # Vapi webhook handler
│   │   └── dashboard.js       # Web dashboard
│   └── __tests__/
│       └── patients.test.js   # API integration tests
├── scripts/
│   └── setup-vapi.js          # Vapi assistant + phone setup
├── data/                      # SQLite database (auto-created)
├── .env.example               # Environment variable template
├── .gitignore
├── package.json
├── railway.json               # Railway deployment config
├── Dockerfile                 # Docker deployment config
└── README.md
```

---

## 📜 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3000) |
| `DATABASE_PATH` | No | SQLite DB path (default: ./data/patients.db) |
| `VAPI_API_KEY` | Yes | Vapi API key from dashboard.vapi.ai |
| `VAPI_ASSISTANT_ID` | No | Auto-set by setup script |
| `VAPI_PHONE_NUMBER_ID` | No | Auto-set by setup script |
| `SERVER_URL` | Yes | Public URL of deployed server |
| `NODE_ENV` | No | Environment (development/production) |

---

Built with ❤️ for the CareCloud Technical Assessment
