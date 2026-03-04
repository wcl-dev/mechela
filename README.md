# Mechela

**Narrative Evidence Index & Change Progression Builder**

A local-first M&E assistant tool for NGO mid-to-senior executives. Mechela transforms narrative DOCX reports into structured, traceable Change Threads — so you can build evidence-based M&E narratives with citation-level anchoring, not just impressions.

---

## Why Mechela

M&E officers and programme managers spend significant time re-reading past reports to locate highlights, recall what changed, and justify their assessments to donors. Mechela automates the extraction step and structures the evidence into a progression you can cite directly.

**The core problem it solves:**
Quarterly donor reports rely heavily on subjective recall. You know something changed, but it takes hours to find the source — and the evidence often ends up thin.

**What Mechela does:**
Upload a narrative report → Mechela detects Change Signals → you review and assign them to threads → the dashboard shows a temporal progression of evidence, ready to export.

---

## Concepts

### Change Signal
A sentence or passage describing a **durable state change** — not an activity, not a plan, not a meeting held. Signals are classified into:

| Level | Meaning | Example |
|-------|---------|---------|
| **L1** | Confirmed / institutionalised change | *"The municipality formally adopted the policy"* |
| **L2** | Committed intent or trial | *"The team agreed to pilot the new approach in Q3"* |
| **L3** | Awareness / interest only | *"Participants expressed interest in the framework"* |
| **Pending** | Ambiguous — requires human judgment | — |

### Context Signal
Signals from **Background** sections that describe external changes (policy, law, political environment). Tagged separately — they are evidence of context, not of your organisation's results.

### Change Thread
A named progression that groups Signals on the same subject across multiple reports. Threads must belong to an Objective. Each Thread becomes a time-stamped evidence trail you can export and cite.

### ABC Review
The human review step after upload:
- **Confirm or modify** the level the system detected
- **Assign** the signal to an existing Thread or create a new one
- **Reject** if the signal is not a real change
- **Tag as Context Signal** if it belongs in the background layer

---

## Features (MVP)

- **DOCX parsing** — extracts paragraph text and table cell text, with a context window (paragraph before + target + paragraph after) passed to the detector
- **Dual-mode Signal detection**
  - **LLM mode** (OpenAI API key required): semantic understanding, outputs L1/L2/L3 + confidence score
  - **Rule-based mode** (no key needed): keyword matching with word-boundary protection; all output requires heavier human review
- **Only-Outputs Warning** — flags reports where signal density is below 15%, indicating the report may be activity-heavy rather than outcome-focused
- **ABC Review UI** — structured review flow with level editing, thread assignment, and inline new-thread creation
- **Thread matching** — suggests existing threads when assigning a signal (TF-IDF in rule-based mode, embeddings in LLM mode)
- **Temporal Dashboard** — per-project view of Objectives → Threads → Signals with confirmed signal count
- **Export to Markdown** — generates a citable Thread + Signal + Citation document
- **Custom Keywords** — add domain-specific terms to the L1/L2/L3 keyword lists in Settings
- **Reports list** — each uploaded report is accessible from the dashboard for re-review at any time

---

## Getting Started

Mechela runs entirely on your computer — no account, no subscription, no data sent to any server (except OpenAI if you choose to use it).

### What you need before installing

| Requirement | Why | Download |
|-------------|-----|----------|
| **Python 3.11 or newer** | Runs the backend | [python.org/downloads](https://www.python.org/downloads/) |
| **Node.js 18 or newer** | Runs the frontend | [nodejs.org](https://nodejs.org/) |
| **Git** | Downloads the code | [git-scm.com](https://git-scm.com/downloads) |

> **Not sure if you have these?** Open a terminal (Command Prompt on Windows, Terminal on Mac) and type `python --version`, `node --version`, and `git --version`. If each prints a version number, you're ready.

---

### Step 1 — Download Mechela

Open a terminal and run:

```bash
git clone https://github.com/your-org/mechela.git
cd mechela
```

This creates a `mechela` folder on your computer with all the code.

---

### Step 2 — Install dependencies (one time only)

**Backend:**
```bash
cd backend
py -m pip install -e ".[dev]"
```

**Frontend:**
```bash
cd frontend
npm install
```

This may take a few minutes the first time.

---

### Step 3 — Start Mechela

**Windows — double-click `start.bat`** in the `mechela` folder. Two terminal windows will open and your browser will navigate to `http://localhost:3000` automatically.

**Mac / Linux — run manually** (two separate terminal tabs):

```bash
# Tab 1 — backend
cd mechela/backend
python -m uvicorn app.main:app --reload

# Tab 2 — frontend
cd mechela/frontend
npm run dev
```

Then open `http://localhost:3000` in your browser.

---

### Step 4 — (Optional) Add your OpenAI API key

Go to **Settings** in the top-right nav and paste your OpenAI API key. This unlocks LLM mode — Mechela will use AI to detect and classify signals with much higher accuracy.

Without a key, Mechela runs in **rule-based mode**: signals are detected by keyword matching. This works but requires more careful human review, and may miss signals that don't use the exact keywords in its vocabulary.

> Your API key is stored only in `backend/user_settings.json` on your computer. It is never shared or uploaded anywhere.

---

### Troubleshooting

**"Port 8000 already in use"**
Another process is using port 8000. On Windows: open Task Manager → find the process using port 8000 and end it. Or run `netstat -ano | findstr :8000` to find the PID, then `taskkill /f /pid [PID]`.

**"py is not recognised"** (Windows)
Try `python` instead of `py`. If that also fails, reinstall Python and make sure to tick "Add Python to PATH" during installation.

**"npm is not recognised"**
Node.js is not installed or not added to PATH. Reinstall from [nodejs.org](https://nodejs.org/) and restart your terminal.

**Frontend shows a blank page**
Make sure the backend is running first (the `Mechela Backend` terminal window should show `Application startup complete`). Then refresh the browser.

---

## Usage

### Create a project
On the home page, click **+ New Project**, give it a name (e.g., "Brisbane Internet Governance 2023–24"), and optionally a description.

### Add objectives
Inside the project, click **+ Add Objective** to define what the project is working toward (e.g., "Encode human rights principles into regional AI governance frameworks").

### Upload a report
Click **+ Upload Report**, select a DOCX file and fill in the report name and date. Mechela will parse the document and detect Signal candidates.

### Review signals — ABC Review
After upload, click **Review Signals** next to the report (visible from the project dashboard under Reports). For each signal candidate:
1. Read the signal text and its source context
2. Adjust the level if needed (L1 / L2 / L3 / Pending)
3. Click **Confirm**, **Reject**, or **Context Signal**
4. Assign confirmed signals to an existing Thread, or create a new one inline

### View the dashboard
The project dashboard shows:
- Total Objectives, Threads, and Confirmed Signals
- Each Objective with its Threads and the Signals nested within

### Export
Click **Export MD** on the project dashboard to generate a Markdown document with all Threads, Signals, and source citations.

### Custom keywords
Go to **Settings** → **Custom Signal Keywords** to add domain-specific terms your organisation uses. Keywords are applied per level (L1/L2/L3) and merged with the built-in detection vocabulary.

---

## Project Structure

```
mechela/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers (projects, reports, signals, threads, dashboard, settings)
│   │   ├── models/       # SQLAlchemy ORM (Project, Objective, Report, Anchor, Signal, Thread)
│   │   ├── schemas/      # Pydantic request/response models
│   │   ├── services/
│   │   │   ├── parser.py     # DOCX → anchors with context windows
│   │   │   ├── detector.py   # Rule-based + LLM signal detection
│   │   │   └── matcher.py    # Thread suggestion (TF-IDF + embeddings)
│   │   └── core/         # Config, DB init, settings store (API key + keywords)
│   └── pyproject.toml
├── frontend/
│   └── app/
│       ├── page.tsx                          # Project list
│       ├── projects/[id]/page.tsx            # Project dashboard
│       ├── projects/[id]/upload/page.tsx     # Report upload
│       ├── projects/[id]/review/[reportId]/  # ABC Review
│       └── settings/page.tsx                # API key + custom keywords
├── CLAUDE.md             # Developer guide for Claude Code sessions
└── README.md
```

---

## Data Model

```
Project
└── Objective (one or more)
    └── Thread (one or more per Objective)
        └── Signal (one or more per Thread)
            └── Anchor — the source paragraph + context window from a Report
```

Signals start as **candidates** after upload. ABC Review moves them to **confirmed**, **rejected**, or **context**.

---

## Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 1** | Technical setup — Python, Node.js, project structure | ✅ Done |
| **Phase 2** | Backend core — DOCX parser, signal detector, thread matcher, API | ✅ Done |
| **Phase 3** | Frontend — all pages, ABC Review UI, dashboard, export | ✅ Done |
| **Phase 4** | Testing & quality — end-to-end tests, demo DOCX, edge case validation | ✅ Done |
| **Phase 5** | Deployment — GitHub release, startup scripts, distribution | 🔜 Next |

---

## Notes on LLM Usage

- Mechela uses **OpenAI only** in the current release
- Your API key is stored locally in `backend/user_settings.json` — it is never sent anywhere other than OpenAI's API
- Detection uses `gpt-4o-mini` (low cost per report)
- Thread matching uses `text-embedding-3-small`
- Rule-based mode is fully functional without any API key — suitable for sensitive environments where external API calls are not permitted

---

## License

MIT
