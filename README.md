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
The structured human review step after upload:
- **A — Signal text**: review and optionally edit the extracted text for clarity
- **B — Classify**: confirm or modify the level (L1/L2/L3), then confirm, reject, or tag as context
- **C — Thread assignment**: assign the signal to an existing Thread or create a new one
- **Progression summary**: after review, write a narrative summary for each Thread on the dashboard

---

## Features (MVP)

- **DOCX parsing** — extracts paragraph text and table cell text, with a context window (paragraph before + target + paragraph after) passed to the detector
- **Three-mode Signal detection**
  - **Local AI mode** (Ollama): privacy-first, runs entirely on your machine, no data sent externally
  - **OpenAI mode** (API key required): highest accuracy, data sent to OpenAI servers
  - **Rule-based mode** (no setup needed): keyword matching with word-boundary protection; all output requires heavier human review
- **Only-Outputs Warning** — flags reports where signal density is below 15%, indicating the report may be activity-heavy rather than outcome-focused
- **ABC Review UI** — structured review flow with signal text editing, level classification, thread assignment, and inline new-thread creation
- **Report re-analysis** — re-run signal detection on existing reports after switching detection mode
- **Thread matching** — suggests existing threads when assigning a signal (TF-IDF in rule-based mode, embeddings in LLM mode)
- **Temporal Dashboard** — per-project view of Objectives → Threads → Signals with confirmed signal count
- **Export to Markdown** — renders a citable Thread + Signal + Citation block on the dashboard; click Copy to paste into any document
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

### Step 1 — Download and install (one time only)

Open **one** terminal window:
- **Windows**: press `Win` + `R`, type `cmd`, press Enter
- **Mac**: press `Cmd` + Space, type `Terminal`, press Enter
- **Linux**: open your distro's terminal app

Paste the following block **in one go** (select all lines together, then paste + Enter). It downloads the code and installs all dependencies:

```bash
git clone https://github.com/wcl-dev/mechela.git
cd mechela
cd backend
py -m pip install -e ".[dev]"
cd ../frontend
npm install
cd ..
```

This takes about 5 minutes the first time. When it finishes, your terminal will be sitting **inside the `mechela` folder** — exactly where Step 2 needs it.

> **Why paste everything together?** Each `cd` command is relative — it only works while you're in the right folder. Running the block as one avoids "No such directory" errors that happen if you paste commands one at a time into different terminals.

> **Closed the terminal or came back later?** Open a new terminal and navigate to the `mechela` folder first. For example, if you ran the install in `C:\Users\You\`, do `cd C:\Users\You\mechela` on Windows (or `cd ~/mechela` on Mac/Linux).

If you see errors, see [Troubleshooting](#troubleshooting).

---

### Step 2 — Start Mechela

**Windows — easiest way:** in File Explorer, open the `mechela` folder and **double-click `start.bat`**. Two black terminal windows will pop up (Backend + Frontend), and your browser will open `http://localhost:3000` automatically. Leave those two terminals running while you use Mechela — closing them stops the app.

**Mac / Linux — manual start:** open **two separate terminal tabs**. In each, navigate to the mechela folder first, then run the command. Replace `path/to/mechela` with wherever you cloned it (e.g. `~/mechela`):

```bash
# Tab 1 — backend (leave this running)
cd path/to/mechela/backend
python -m uvicorn app.main:app --reload
```

```bash
# Tab 2 — frontend (leave this running)
cd path/to/mechela/frontend
npm run dev
```

Then open `http://localhost:3000` in your browser.

---

### Step 3 — Choose a detection mode

Go to **Settings** and select one of three modes:

| Mode | Setup | Privacy |
|------|-------|---------|
| **Basic** (default) | None | All data stays local |
| **Local AI** | Run `setup_local_ai.bat` (Windows) or `./setup_local_ai.sh` (Mac/Linux) to install Ollama + models (~7.5 GB, one time) | All data stays local |
| **OpenAI** | Paste your OpenAI API key | Report text sent to OpenAI |

**Recommended: Local AI** — gives you AI-powered analysis with full privacy. After running the setup script, select "Local AI" in Settings, click Save, then Test Connection to confirm.

> All settings are stored locally in `backend/user_settings.json`. Nothing is shared or uploaded.

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
On the home page, click **+ New Project**, give it a name (e.g., "Digital Rights Advocacy 2024"), and optionally a description.

### Add objectives
Inside the project, click **+ Add Objective** to define what the project is working toward (e.g., "Encode human rights principles into regional AI governance frameworks").

### Upload a report
Click **+ Upload Report**, select a DOCX file and fill in the report name and date. Mechela will parse the document and detect Signal candidates.

### Review signals — ABC Review
After upload, click **Review** next to the report (visible from the project dashboard under Reports). For each signal candidate:
1. **A — Signal text**: read the extracted text. Click **Edit** to refine it if needed, then Save
2. **B — Classify**: adjust the level (L1/L2/L3/Pending), then click **Confirm**, **Reject**, or **Context Signal**
3. **C — Thread assignment**: assign the signal to an existing Thread or create a new one inline

### Re-analyse a report
If you switch detection modes after uploading (e.g., from Basic to Local AI), click **Re-analyse** next to the report on the project dashboard. This replaces all previously detected signals with fresh results using the current mode.

### Write progression summaries
On the project dashboard, each Thread shows **+ Add progression summary** below its statement. Click to open an editor where you can write a narrative summary of how this change thread has evolved across reports. The summary appears in the Markdown export between the thread title and its signals.

### View the dashboard
The project dashboard shows:
- Total Objectives, Threads, and Confirmed Signals at a glance
- Each Objective with its Threads, progression summaries, and nested Signals
- Click any existing progression summary text (shown in italics) to edit it

### Export
Click **Export MD** on the project dashboard. The export includes:
- Objectives and their Threads
- Progression summaries (if written)
- All signals with level, text, source report, and paragraph number

Click **Copy** to copy the full Markdown to your clipboard.

### Custom keywords
Go to **Settings** → **Custom Signal Keywords** to add domain-specific terms your organisation uses. Keywords are applied per level (L1/L2/L3) and merged with the built-in detection vocabulary.

### Organisation names
Go to **Settings** → **Organisation Names** to add your org's name and abbreviations. This helps the detector distinguish internal activities from external change signals.

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
| **Phase 5** | Deployment — GitHub release, startup scripts, distribution | ✅ Done |

---

## Notes on LLM Usage

- **Local AI** uses [Ollama](https://ollama.com/) with `gemma4:e2b` (chat) and `nomic-embed-text` (embeddings) — all inference runs on your machine
- **OpenAI** uses `gpt-4o-mini` (detection) and `text-embedding-3-small` (matching) — data is sent to OpenAI's API
- **Rule-based** mode requires no AI at all — suitable for sensitive environments where any external processing is not permitted
- All settings are stored locally in `backend/user_settings.json`
- See [docs/local-ai-evaluation.md](docs/local-ai-evaluation.md) for the full evaluation of local AI approaches

