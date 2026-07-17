# 🛡️ DJAGA

<p align="center">
  <strong>Deteksi Jaringan Gelagat Anomali</strong><br />
  Malaysia’s AI scam-defence companion
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-active-4FD1A5?style=for-the-badge" alt="Project status: active" />
  <img src="https://img.shields.io/badge/AI-LangGraph%20%2B%20OpenRouter-8B5CF6?style=for-the-badge" alt="AI: LangGraph and OpenRouter" />
  <img src="https://img.shields.io/badge/data-Supabase-3ECF8E?style=for-the-badge" alt="Database: Supabase" />
  <img src="https://img.shields.io/badge/deploy-Render-46E3B7?style=for-the-badge" alt="Deployment: Render" />
</p>

> [!IMPORTANT]
> **DJAGA helps you pause, verify, and act safely.** It is decision support—not proof that a person or account committed a crime.

DJAGA helps people investigate suspicious voice notes, images, messages, phone numbers, links, and bank accounts before they act. It combines specialised AI agents, evidence-cited verdicts, a Malaysia-wide intelligence map, community reporting, and a grounded assistant designed for practical scam-safety guidance.

Built for the OpenAI Codex hackathon with a mobile-first, night-watch interface for a high-stress moment: *“Is this real, and what should I do next?”*

<p align="center">
  <a href="#-run-locally">Quick start</a> ·
  <a href="#-configure-real-services">Configuration</a> ·
  <a href="#-deploy-to-render">Deploy</a> ·
  <a href="#-how-gpt-56-and-codex-accelerated-this-project">Built with Codex</a>
</p>

---

## ✨ What DJAGA does

- **Scam Check** — inspect a number, bank account, URL, pasted text, or uploaded conversation screenshot.
- **Voice Scanner** — analyse a voice note for scam-pressure language, transcription evidence, and voice-authenticity signals.
- **Image Scanner** — analyse uploaded imagery for likely AI generation or manipulation using Gemini through OpenRouter, with a local Hugging Face fallback.
- **Live intelligence map** — browse recent Malaysian scam reports by location and type, with report details and source references.
- **Community reports** — submit a report; an AI classifier categorises it before eligible reports enter the intelligence feed.
- **Ask DJAGA** — a safety-focused assistant that searches the latest feed, registry records, and the signed-in user’s saved check history.
- **Evidence, not black boxes** — every completed scan records the agent signals that contributed to its verdict.

## 🧭 Product flow

```text
Upload / paste / check identifier
          │
          ▼
      Intake agent
          │
          ├── Voice: Forensics + Transcribe → Behavioral
          ├── Message: Behavioral + Registry + OSINT
          └── Image: Gemini Image Forensics + OSINT
                         │
                         ▼
                   Verdict agent
                         │
                         ▼
         Evidence-cited risk result + saved history
```

The app streams investigation activity to the UI with Server-Sent Events (SSE), so users can see the work progressing instead of waiting on an unexplained spinner.

## 🧱 Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, React Router, Leaflet, plain CSS/Tailwind utilities |
| Backend | FastAPI, Pydantic, LangGraph |
| Database | Supabase Postgres; SQLite automatic local/offline fallback |
| AI reasoning | OpenRouter models, including `google/gemini-2.5-pro` for Image Scanner |
| Voice | ElevenLabs Scribe, TTS, and optional ElevenLabs Conversational AI |
| Intelligence | Exa search/harvester; local and Supabase-backed registry data |
| Vision fallback | Hugging Face Transformers image-authenticity classifier |
| Deployment | Render (one FastAPI service serving the built React SPA) |

## 🚀 Run locally

### ✅ Prerequisites

- Python 3.11+
- Node.js 20+
- npm

### 1️⃣ Clone and create a virtual environment

```bash
git clone https://github.com/<your-github-user>/<your-repo>.git
cd <your-repo>

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2️⃣ Configure environment variables

```bash
cp .env.example .env
```

For a fully working local demo, keep `AGENT_MODE=mock`. No API keys are needed: mock mode executes the same LangGraph pipeline with deterministic local evidence.

### 3️⃣ Build the frontend and start DJAGA

```bash
cd frontend
npm install
npm run build
cd ..

uvicorn app:app --reload
```

Open [http://localhost:8000](http://localhost:8000).

For frontend hot reload, run this in a second terminal:

```bash
cd frontend
npm run dev
```

### 4️⃣ Run tests

```bash
pytest -q
```

## 🧪 Sample data and demo mode

The project starts with safe sample intelligence data so the map, registry, dashboard, assistant, and scanner flows can be explored immediately.

| Need | Command / setting |
| --- | --- |
| Full keyless demo | `AGENT_MODE=mock` |
| Seed/reset local demo intelligence | `python3 scripts/seed_mock_data.py` |
| Rebuild frontend intelligence migration | `python3 scripts/migrate_frontend_intelligence.py` |
| Scripted SSE replay | `GET /api/demo/stream` |
| Health and active agent modes | `GET /healthz` |

Mock results are explicitly development scaffolding. When a real provider is configured, each agent can be enabled independently; one failed integration is marked unavailable and the Verdict agent renormalises the remaining evidence instead of failing the whole check.

## 🔐 Configure real services

All secrets belong in `.env` locally or your platform’s environment settings in production. Never commit `.env`.

| Variable | Unlocks |
| --- | --- |
| `SUPABASE_DB_URL` | Persistent users, sessions, checks, reports, feed, and assistant history in Supabase Postgres |
| `OPENROUTER_API_KEY` | LLM-backed scam classification, assistant explanations, and Gemini Image Scanner |
| `IMAGE_FORENSICS_MODEL=google/gemini-2.5-pro` | Preferred OpenRouter image-analysis model |
| `EXA_API_KEY` | Live public-web OSINT and feed harvesting |
| `ELEVENLABS_API_KEY` | Scribe transcription and text-to-speech |
| `EL_VOICE_ID` | ElevenLabs voice used for DJAGA replies |
| `ELEVENLABS_AGENT_ID` | Optional ElevenLabs conversational voice assistant |
| `HF_TOKEN` | Access to Hugging Face gated models, if needed |
| `VOICE_FORENSICS_MODEL=google/gemini-3.1-flash-lite` | Gemini audio analysis for Voice Scanner |
| `IMAGE_MODEL_ID` | Local Hugging Face fallback override for Image Scanner only |

### 🗄️ Supabase

Use the Supabase pooled Postgres connection string, including `?sslmode=require`:

```env
SUPABASE_DB_URL=postgresql://postgres.<project-ref>:<encoded-password>@aws-<region>.pooler.supabase.com:6543/postgres?sslmode=require
```

DJAGA applies [the initial schema migration](migrations/001_initial.sql) at startup. To migrate an existing local SQLite database once:

```bash
SUPABASE_DB_URL='your-connection-string' python3 scripts/migrate_sqlite_to_supabase.py
python3 scripts/test_supabase_connection.py
```

### 🎙️ ElevenLabs knowledge-base option (no webhook)

For a voice agent grounded in DJAGA’s current public intelligence without custom tools, add this URL as an ElevenLabs Knowledge Base document:

```text
https://<your-render-service>.onrender.com/api/elevenlabs/knowledge-base.txt
```

It generates a readable, public, seven-day feed snapshot from the app database. Refresh the document after new reports arrive, or enable URL auto-sync where your ElevenLabs plan supports it. This approach is intentionally feed-only: it never exposes private user scans or account data.

## 🤖 Agent pipeline

| Agent | Role |
| --- | --- |
| Intake | Validates input and selects the correct investigation route |
| Forensics | Uses Gemini audio analysis for cautious synthetic-voice and scam-conversation signals |
| Image Forensics | Uses Gemini image analysis, then a local HF fallback if necessary |
| Transcribe | Converts audio to text with ElevenLabs Scribe or Gemini audio input |
| Behavioral | Finds urgency, secrecy, impersonation, payment pressure, and similar scam patterns |
| Registry | Searches stored scam reports, seed intelligence, and optional Vector Search |
| OSINT | Searches configured live public sources for named entities and scam context |
| Verdict | Fuses available scores, cites evidence, and returns safe / caution / danger |

The Verdict agent uses path-specific weights. For example, image checks begin with **70% image evidence + 30% OSINT**, and unavailable signals are excluded before the remaining weights are normalised.

## 🗂️ Project structure

```text
.
├── frontend/                 # React SPA and UI components
├── agents/                   # Intake, forensics, behavioral, registry, OSINT, verdict
├── assistant/                # Grounded chat assistant and database tools
├── integrations/             # OpenRouter, ElevenLabs, Exa, Hugging Face, Vector Search adapters
├── jobs/harvester.py         # Feed intelligence harvester entrypoint
├── migrations/               # Supabase/Postgres schema
├── scripts/                  # Seed, migration, and connection verification utilities
├── tests/                    # FastAPI / pipeline smoke and resilience tests
├── app.py                    # FastAPI routes, SSE streams, SPA serving
├── pipeline.py               # LangGraph orchestration
└── db.py                     # Database repositories and SQLite fallback
```

## ☁️ Deploy to Render

This repo includes [render.yaml](render.yaml).

1. Push the project to GitHub.
2. In Render, choose **New → Blueprint** and select the repository.
3. Add the production environment variables you want to enable—at minimum `SUPABASE_DB_URL` and a secure `SESSION_SECRET`.
4. Render runs:

   ```bash
   pip install -r requirements.txt
   cd frontend && npm ci && npm run build
   ```

5. Render starts the app with:

   ```bash
   uvicorn app:app --host 0.0.0.0 --port $PORT
   ```

The health-check path is `/healthz`.

## 🔒 Safety and privacy

- Uploaded media is analysed in-session; DJAGA stores derived evidence rather than raw audio/image blobs.
- Public community reports require consent before being eligible for the shared intelligence feed.
- A high risk score is a decision-support signal, not proof that a person or number committed a crime.
- In an urgent scam situation: stop the transfer, contact your bank through an independently found official number, and call Malaysia’s NSRC at **997**.

## ⚡ How GPT-5.6 and Codex accelerated this project

DJAGA was built with **GPT-5.6 and Codex as hands-on engineering collaborators**, not just as a code generator.

- **System design:** Codex helped turn the product idea into a deployable React + FastAPI + LangGraph architecture, including clear real/mock boundaries so the product remains demonstrable with zero keys.
- **Agent reasoning design:** Codex helped define the multi-agent routing, per-path fusion weights, graceful-degradation rules, and evidence payloads that make risk decisions inspectable.
- **Integration acceleration:** Codex implemented and tested adapters for Supabase, OpenRouter/Gemini, ElevenLabs, Exa, Hugging Face, and Render while keeping secrets environment-only.
- **Product iteration:** Codex accelerated repeated UI and accessibility improvements to the map, scanners, reports, profile, and assistant—while preserving a consistent night-watch visual system.
- **Quality guardrails:** Codex ran the frontend production build, FastAPI tests, health checks, migration checks, and failure-path tests after changes instead of treating a feature as complete on code alone.

The important human decisions remained human-led: the Malaysian safety context, product priorities, what evidence should be shown, how results should be worded, and the choice to be explicit about uncertainty rather than overclaim detection accuracy.

## 📄 License

Built for a hackathon. Add a license before using this project in production.
