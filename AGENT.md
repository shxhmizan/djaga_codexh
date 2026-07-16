# DJAGA — Agent Spec

DJAGA (Deteksi Jaringan Gelagat Anomali) is a Malaysian scam-defense app. It detects
AI-powered scams — cloned voices on phone calls, fake voice notes, AI-generated images,
scam text messages — using a team of AI agents that investigate in parallel and produce
one evidence-cited risk verdict. It also shows a live map feed of scams happening in
Malaysia, and includes a voice-capable chat assistant.

This is a real product. Ship working software, not plans or placeholders. Run what you
build before moving on.

---

## Stack

- **Frontend:** Vite + React 18, React Router, react-i18next. Plain CSS with the design
  tokens below (no Tailwind). Leaflet for the map. No other frameworks.
- **Backend:** FastAPI (Python), LangGraph for the agent pipeline, SQLite for state.
- **Deployment:** one Databricks App. FastAPI serves `frontend/dist` as static files with
  an SPA fallback (any non-`/api` route → `index.html`). The app runtime runs Python only
  — it never runs `npm`; you build the frontend before deploying.
- **AI services:** Databricks Model Serving (fine-tuned scam classifier + chat LLM),
  Databricks Vector Search, ElevenLabs (Scribe STT, TTS), Exa (web search).

## Platform constraints (real, not stylistic)

- Databricks Apps sits behind a proxy that doesn't reliably support WebSockets. Use
  **Server-Sent Events (SSE)** for all live updates, with a 1-second polling fallback if
  the stream drops. `EventSource` can't send custom headers — auth via an httpOnly cookie.
- Databricks Apps has no system packages — **no ffmpeg**. Decode audio with pure-Python
  libraries (`soundfile`, `librosa`). ElevenLabs Scribe accepts iOS `.m4a` files directly,
  so most audio never needs decoding at all.
- Secrets go in a Databricks secret scope, exposed as env vars via `app.yaml`. Never
  hardcode a key.
- iOS Safari requires HTTPS and a user tap before it will grant microphone access.
  `MediaRecorder` on iOS produces `audio/mp4`.
- **SemakMule** (PDRM's scam-checking portal) has no public API and is CAPTCHA-protected.
  Do not try to call or scrape it. Build it as an honestly labeled mock adapter
  (`mock=True`, shown as a "MOCK" tag in the UI) with seeded fake data.
- **NSRC, NACSA, MyCERT** publish scam advisories but have no API. Use Exa to search their
  public content (e.g. `site:rmp.gov.my`) as harvester sources — that's the real,
  legitimate integration; don't pretend to have a direct feed from them.

## Resilience

An error in one agent must never kill a session or an SSE stream — catch it, mark that
agent unavailable, renormalize the verdict's weights, and continue. Every agent must also
run in a **mock mode** (`AGENT_MODE=mock` by default) that returns realistic fake results
with no API keys required — this is how the whole app runs and is tested without live
credentials, and it doubles as a fallback if a real service is down. Keep a scripted replay
endpoint, `GET /api/demo/stream`, that plays back a fixed sequence of events for the same
reason.

---

## The agents

Seven agents. Intake runs first; Forensics, Behavioral, Registry, and OSINT run in
parallel; Verdict runs last. Each agent emits events as it works (see Contracts) — these
drive both the live verdict screen and the trace view.

| Agent | Does | Produces |
|---|---|---|
| Intake | Validates the input (audio chunk, voice note, image, or text), manages the session, routes to the right agents | session state |
| Forensics | Scores an audio clip for AI voice-clone artifacts using an anti-spoofing model; averages across chunks, never verdicts on one chunk alone | `acoustic_score` (0–1) |
| ImageForensics | Scores an image for AI-generation/deepfake artifacts | `image_score` (0–1) |
| Transcribe | Converts audio to text via ElevenLabs Scribe (language hint `ms`) | transcript |
| Behavioral | Runs the transcript or a pasted message through the Databricks fine-tuned classifier | `scam_score` + patterns (e.g. urgency, secrecy, impersonation, payment pressure) |
| Registry | Checks the transcript against a Vector Search index of known scam scripts, and the phone number against the mocked SemakMule adapter | matches + report counts |
| OSINT | Pulls named entities out of the transcript (scheme names, claimed institutions), searches Exa for scam reports mentioning them | web evidence + sources |
| Verdict | Combines whichever signals ran into one risk score, and lists exactly which evidence produced it | risk score + cited evidence |

Verdict fusion weights (starting point, adjust as needed):
- Audio path (call/voice note): 0.25 acoustic, 0.35 behavioral, 0.20 registry, 0.20 osint
- Text path (message): 0.5 behavioral, 0.25 registry, 0.25 osint
- Image path: 0.7 image, 0.3 osint

If a signal is missing (agent unavailable), renormalize the remaining weights to sum to 1.
Escalate the UI to "danger" state at risk ≥ 0.65.

**Harvester** (not a request-time agent — a scheduled job): every hour, and on manual
trigger, run a fixed set of Exa queries for fresh Malaysian scam news and advisories,
extract structured fields from each result (scam type, entities, region, summary), geocode
the region against a small hardcoded dict of Malaysian cities, drop duplicates, and write
the results both to the feed table and into the Vector Search index — so the feed and the
Registry agent share the same growing set of known scams.

**Chat assistant** — a separate, simpler agent: a chat LLM (Databricks serving endpoint,
or a plain prompt in mock mode) with four tools it can call: search the feed, check an
entity against Registry+OSINT, list the user's past checks, explain a specific past
verdict. Replies stream over SSE. If `ELEVENLABS_API_KEY` isn't set, hide the speak/listen
buttons — don't break the text chat.

---

## Contracts

One `contracts.py` (Pydantic) on the backend, mirrored in `frontend/src/types.ts`. Keep
these stable; if you need to change them, do it deliberately and mention it when you're
done.

```python
class TraceEvent(BaseModel):
    type: str          # "trace" | "risk" | "transcript" | "chat"
    agent: str | None
    ts: float
    status: str        # "started" | "evidence" | "done" | "unavailable" | "error"
    message: str
    score: float | None = None
    evidence: dict | None = None

class Verdict(BaseModel):
    risk: float
    level: str          # "safe" | "caution" | "danger"
    kind: str            # "call" | "voice" | "image" | "message"
    evidence: list[dict] # [{agent, claim, weight_contribution}]
    excerpt: str | None = None
    flagged_phrases: list[str] = []

class FeedItem(BaseModel):
    scam_type: str
    title: str
    summary: str
    region: str
    lat: float
    lng: float
    source_name: str
    source_url: str
    date: str

class User(BaseModel):
    id: str
    email: str
    name: str
    language: str        # "ms" | "en" | "zh" | "ta"
    auth_method: str      # "password" | "mydigitalid_sim"
```

---

## API

Auth is cookie-based (httpOnly session cookie); everything except `/api/auth/*` requires
a valid session.

```
POST /api/auth/register          {email, password, name}
POST /api/auth/login              {email, password}
POST /api/auth/mydigitalid        simulated SSO — returns a session immediately, no real redirect needed
POST /api/auth/logout
GET  /api/auth/me

POST /api/checks                        {kind: call|voice|image|message} → {session_id}
POST /api/checks/{id}/chunk             multipart audio chunk (call only)
POST /api/checks/{id}/analyze           multipart file or {text} → runs the full pipeline once
GET  /api/checks/{id}/stream            SSE: TraceEvent stream
GET  /api/checks/{id}/verdict           → Verdict
GET  /api/checks                        → list of the user's past checks

GET  /api/feed?type=&limit=             → [FeedItem]
POST /api/feed/refresh                  triggers one harvester run now

POST /api/chat                          {message} → SSE streamed reply
POST /api/chat/speak                    {text} → audio (ElevenLabs TTS)
POST /api/chat/listen                   multipart audio → {text} (ElevenLabs Scribe)

POST /api/profile/language              {language}
GET  /api/demo/stream                   scripted replay, no auth required
GET  /healthz                           → {ok: true, agents: {name: mode}}
```

---

## Frontend

**Design — "night-watch":** dark and glassmorphic. Playfair Display for headings (18px+
only, use italics for emphasis), Plus Jakarta Sans for everything else. Colors:
background `#0A1411`, teal `#4FD1A5` (safe), amber `#F5B14C` (caution), coral `#FF6B5E`
(danger). Glass = a translucent panel with `backdrop-filter: blur()` and a 1px light
border. Use at most 3–4 blurred elements per screen — it's expensive on phones, and never
animate a blurred element's size. `docs/djaga_feed_mockup_v2.html` shows the intended feel
for the feed screen; match its spirit.

**One exception:** the Check screen (the live call / result screen) has no glass at all.
Solid full-screen colors, text at 24px or larger, one button at a time. This screen is
meant to be read at a glance by an elderly user mid-panic — that's a deliberate
accessibility choice, not a style gap.

**Pages:**
- `/splash` — logo, ~1.5s, auto-continues to `/login` or `/` depending on session
- `/login` — email/password + a "Continue with MyDigital ID" button, labeled
  "simulated for demo" underneath it
- `/` (Home) — greeting, a "Check a call" button, a 2×2 grid linking to the four
  scanners, the 3 latest feed items, bottom nav (Home / Feed / Chat / Profile)
- `/check` — live call check: mic button, full-screen state color, evidence sheet
- `/scan/voice`, `/scan/message`, `/scan/image` — same result UI as `/check`, different
  input widget (file upload / text box / image upload)
- `/feed` — Leaflet map with CARTO dark tiles, markers from `/api/feed`, filter chips,
  card list
- `/chat` — message list, text input, mic button (Scribe), speaker icon on each reply (TTS)
- `/trace/:sessionId` — 7 agent lanes with live events, transcript, animated risk gauge,
  final verdict with cited evidence — should also be readable projected on a big screen
- `/profile` — name, stats, language switcher (BM / EN / 中文 / தமிழ்), logout

All text goes through react-i18next from the start — no hardcoded strings. Locale files:
`ms.json`, `en.json`, `zh.json`, `ta.json`.

A shared `useEventStream` hook wraps `EventSource` with reconnect + polling fallback; use
it for Check, Trace, and Chat.

---

## Folder structure

```
djaga/
├── AGENTS.md
├── app.yaml
├── requirements.txt
├── .env.example
├── app.py                 # FastAPI app, routers, static mount, SPA fallback
├── auth.py                # password hashing, sessions, simulated MyDigital ID
├── config.py               # env vars, fusion weights, thresholds
├── contracts.py
├── db.py                    # SQLite: users, checks, verdicts, feed_items
├── pipeline.py             # LangGraph graph definition
├── mock_agents.py          # fake versions of every agent, used when AGENT_MODE=mock
├── agents/
│   ├── intake.py
│   ├── forensics.py
│   ├── image_forensics.py
│   ├── transcribe.py
│   ├── behavioral.py
│   ├── registry.py
│   ├── osint.py
│   └── verdict.py
├── assistant/
│   ├── chat.py
│   └── tools.py
├── integrations/
│   ├── elevenlabs_client.py
│   ├── exa_client.py
│   └── semakmule_mock.py
├── jobs/
│   └── harvester.py
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── types.ts
│   │   ├── theme.css
│   │   ├── api.ts
│   │   ├── i18n/
│   │   │   └── locales/{ms,en,zh,ta}.json
│   │   ├── hooks/useEventStream.ts
│   │   ├── pages/
│   │   │   ├── Splash.tsx  Login.tsx  Home.tsx  Check.tsx
│   │   │   ├── ScanVoice.tsx  ScanMessage.tsx  ScanImage.tsx
│   │   │   ├── Feed.tsx  Chat.tsx  Trace.tsx  Profile.tsx
│   │   └── components/
│   └── dist/               # built output, served by FastAPI in production
├── tests/
├── audio/demo/              # sample clips for testing
└── docs/
    ├── djaga_feed_mockup_v2.html
    └── ideas.md              # anything out of scope goes here, not into the codebase
```

Local dev: `uvicorn app:app --reload` (port 8000) + `npm run dev` in `frontend/` (Vite,
proxies `/api` to 8000). Production: `npm run build`, then uvicorn alone serves
`frontend/dist`.

---

## Env vars

```
SESSION_SECRET=
SERVING_ENDPOINT=          # Databricks Model Serving — behavioral classifier
CHAT_ENDPOINT=              # Databricks Model Serving — chat LLM
BEHAVIORAL_MODE=mock        # mock | fewshot | serving
VS_ENDPOINT=
VS_INDEX=
ELEVENLABS_API_KEY=
EL_VOICE_ID=
EXA_API_KEY=
AGENT_MODE=mock             # mock | real  (or a comma list like real:behavioral,osint)
```

---

## Build order

1. Auth + Home + Check (mock agents) + Trace + Feed (seed data) + Profile with BM/EN.
   Everything works with no API keys.
2. Voice, Message, and Image scanners — same verdict UI, new input paths.
3. Chat assistant, live harvester, ElevenLabs wired in, Chinese + Tamil locales.

Finish each stage before starting the next. When you're done with a stage, tell me how to
run it and anything you decided that this file didn't specify.