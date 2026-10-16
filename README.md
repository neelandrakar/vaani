# Vaani - AI Calling ERP & Voice Agent Studio

A production-ready MVP of an **AI Calling ERP**: a modern real-estate business dashboard connected to an intelligent voice agent that qualifies leads in Hindi and English (with Bengali architecture readiness), answers verified business questions, schedules callback appointments, and records conversation transcripts, tool execution traces, and outcomes.

---

## 1. System Architecture

```
                    ┌────────────────────────────────────────┐
                    │      React Frontend (Vite, TS)         │
                    │   • Business Dashboard & Leads CRM     │
                    │   • Voice Agent Studio & Live Console  │
                    │   • Web Audio API 16kHz PCM Capture    │
                    └───────────────────┬────────────────────┘
                                        │ (HTTP API & WebSocket)
                                        ▼
                    ┌────────────────────────────────────────┐
                    │     Node.js Backend (Express, TS)      │
                    │   • Auth (JWT, RBAC: Admin/Operator)   │
                    │   • Server-Side Conversation State     │
                    │   • Tool Execution Engine (7 ERP Tools)│
                    │   • Interruption & Response Counters   │
                    │   • Telephony Abstraction & Simulator  │
                    └───────────┬────────────────┬───────────┘
                                │                │
              (Prisma ORM)      │                │ (HTTP REST)
                                ▼                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│        PostgreSQL Database           │  │     Python AI Service (FastAPI)      │
│  • Users, BusinessConfig, Leads      │  │  • ASR: IndicConformer / Mock ASR   │
│  • Requirements, Properties, FAQs    │  │  • LLM: Qwen3-8B Non-Thinking / Mock │
│  • Conversations, Callbacks, Audits  │  │  • TTS: IndicParler / Mock WAV Synth │
└──────────────────────────────────────┘  └──────────────────────────────────────┘
```

---

## 2. Key Features

- **Real-Estate Lead Qualification**:
  - Greet caller naturally as AI assistant for the configured business (*Vaani Skyline Realty*).
  - Collect transaction intent (Buy or Rent), property type, preferred location, bedrooms, budget, and purchase timeline one question at a time.
  - Answer approved business questions (RERA approvals, pricing ranges, amenities, site visit timings, maintenance charges) from the verified property and FAQ catalogue.
  - Offer a callback or appointment slot (with Asia/Kolkata timezone normalization and repetition).
  - Save structured qualification records, timestamped transcripts, latency metrics, and summary outcomes.
  - Offer human operator assistance when queries are unresolvable or upon request.
- **Microphone Voice Pipeline**:
  - Browser microphone capture via Web Audio API (16kHz PCM streaming).
  - Turn segmentation with speech energy detection.
  - Live conversational playback using standard AudioBuffer playback.
  - Text input fallback for environments without microphone access.
- **Strict Interruption Handling**:
  - Increments server-side `generation_id` when the user speaks or interrupts during agent playback.
  - Audio buffers and in-flight inference chunks tagged with prior generation IDs are instantly discarded.
  - Stops browser speaker playback immediately without playing stale audio.
- **Persistence & Idempotency**:
  - PostgreSQL schema with Prisma ORM migrations.
  - Mutation tools (`create_callback`, `update_lead_requirements`) are protected with idempotency keys. Retrying callback scheduling confirms the existing slot without creating duplicates.
  - Do Not Call (DNC) and contact consent compliance rules strictly enforced.
- **Explicit Real vs Mock Modes**:
  - **Mock Mode**: Deterministic development mode with synthetic playable WAV audio and structured tool proposing. Runs instantly on CPU without downloading large model weights.
  - **Real Mode**: Pluggable candidate adapters for `ai4bharat/indic-conformer-600m-multilingual` (ASR), `Qwen/Qwen3-8B` (LLM non-thinking mode), and `ai4bharat/indic-parler-tts` (TTS). Missing weights or GPU resources produce actionable diagnostic errors rather than silent fallbacks.
- **Telephony Adapter Interface**:
  - Provider-neutral telephony adapter abstraction (`TelephonyAdapter`, `TwilioAdapter`, `TelephonySimulatorAdapter`).
  - Webhook signature validation (Twilio HMAC-SHA1) and simulator test triggers.

---

## 3. Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React icons.
- **Backend**: Node.js v20+, TypeScript, Express 4, WebSocket (`ws`), Prisma ORM 6, Zod, bcryptjs, jsonwebtoken, date-fns-tz.
- **Database**: PostgreSQL (port 4200 or 5432).
- **AI Service**: Python 3.11+, FastAPI, Uvicorn, NumPy, Pydantic v2.
- **Testing**: Vitest test runner.

---

## 4. Setup & Quick Start

### Prerequisites
- Node.js v20+ and npm
- PostgreSQL database
- Python 3.11+ (for AI service)

### Step 1: Install Dependencies
```bash
# In the repository root
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `DATABASE_URL` points to your PostgreSQL instance:
```env
DATABASE_URL="postgresql://postgres@localhost:4200/vaanidb"
PORT=5001
JWT_SECRET="vaani_dev_jwt_secret_change_in_production_min32chars"
CORS_ORIGIN="http://localhost:3000"
DEFAULT_TIMEZONE="Asia/Kolkata"
AI_SERVICE_URL="http://localhost:8000"
AI_MODE="mock"
```

### Step 3: Database Push & Seed Demo Data
```bash
# Push schema tables to PostgreSQL
npm run db:push

# Seed realistic demo real-estate data
npm run db:seed
```

**Seeded Demo Credentials**:
- **Admin**: `admin@vaani.ai` / `Admin@12345`
- **Operator**: `operator@vaani.ai` / `Operator@12345`

### Step 4: Run the Python AI Service
```bash
cd packages/ai-service
pip install -r requirements.txt
python main.py
```
*(Runs on `http://localhost:8000` with `/health` and `/ready` endpoints)*

### Step 5: Start Backend and Frontend
In another terminal at the repository root:
```bash
npm run dev
```
- **Frontend Dashboard**: `http://localhost:3000`
- **Backend API & WebSocket**: `http://localhost:5001` (WebSocket at `ws://localhost:5001/ws/voice`)

---

## 5. Verification & Running Tests

Run the complete test suite (20 automated unit and E2E integration tests):
```bash
npm run test
```
The test suite validates:
1. Authentication & JWT role-based access control.
2. Lead persistence and requirement updates.
3. Tool schema validation, boundaries, and injection defense.
4. Idempotent callback creation & duplicate prevention.
5. Do Not Call (DNC) compliance.
6. Approved business knowledge and property catalogue search.
7. Interruption cancellation via response generation IDs.
8. Core ERP vs Voice readiness separation.
9. Complete 8-step end-to-end conversation flow.

To build production bundles:
```bash
npm run build
```

---

## 6. Docker Compose Deployment

To spin up the entire stack using Docker Compose:
```bash
docker compose up --build
```
This launches:
- `postgres`: PostgreSQL 16 container (`port 5432`).
- `backend`: Node.js Express & WebSocket server (`port 5001`).
- `frontend`: Nginx serving optimized React SPA (`port 3000`).
- `ai-service`: Python FastAPI container (`port 8000`).

---

## 7. Real Model Candidate Instructions

To switch from Mock mode to real model inference:

1. Update `.env`:
   ```env
   AI_MODE=real
   ```
2. Hardware Requirements:
   - Dedicated NVIDIA GPU with at least **16GB VRAM** (e.g., RTX 3090, RTX 4090, A10G, or A100).
   - CUDA 12.1+ toolkit.
3. Install PyTorch and Transformers in the AI service:
   ```bash
   cd packages/ai-service
   pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
   pip install transformers soundfile accelerate parler-tts
   ```
4. Download Model Weights:
   ```bash
   python -m huggingface_hub download Qwen/Qwen3-8B --local-dir ./models/qwen3-8b
   python -m huggingface_hub download ai4bharat/indic-conformer-600m-multilingual --local-dir ./models/indic-conformer
   python -m huggingface_hub download ai4bharat/indic-parler-tts --local-dir ./models/indic-parler
   ```
5. Export model paths:
   ```bash
   export QWEN_MODEL_PATH="./models/qwen3-8b"
   export INDIC_CONFORMER_PATH="./models/indic-conformer"
   export INDIC_PARLER_PATH="./models/indic-parler"
   ```

---

## 8. Verified Features & Limitations

### Verified Working Features
- Complete multi-view ERP: Dashboard, Leads CRM, Voice Studio, Conversations, Callbacks, Settings.
- Database persistence with PostgreSQL and Prisma ORM.
- Web Audio API microphone capture, turn segmentation, and audio playback.
- Interruption handling with response counters (`generation_id`).
- All 7 approved ERP tools schema-validated with idempotency and isolation.
- Multi-language preparation (Hindi, English, Bengali).
- Text turn fallback.
- Masked secret indicators without exposing credentials.
- Separated Core ERP vs Voice readiness.

### Known MVP Limitations
- Outbound telephony campaigns are disabled by default until compliance rules and carrier numbers are configured.
- Speech recognition in real mode requires NVIDIA CUDA hardware. In development/CPU environments, deterministic mock adapters provide full end-to-end pipeline verification.
