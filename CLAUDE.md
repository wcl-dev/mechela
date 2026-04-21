# CLAUDE.md

Guidance for Claude Code (claude.ai/code) and other AI coding assistants when working in this repository.

**Canonical references** (read these first when the question is about the product rather than the code):
- [README.md](README.md) — product purpose, feature list, signal-level definitions, setup, usage
- [docs/local-ai-evaluation.md](docs/local-ai-evaluation.md) — model choice rationale and historical migrations
- [mechela使用說明_正體中文.md](mechela使用說明_正體中文.md) — end-user manual in Traditional Chinese

This file focuses on **architecture, conventions, and design decisions** — the things you need to write consistent code here, not things a user would read.

---

## Architecture

Monorepo with two services that run locally:

```
mechela/
├── backend/          # FastAPI + SQLite
│   ├── app/
│   │   ├── api/      # Route handlers
│   │   ├── models/   # SQLAlchemy ORM models
│   │   ├── schemas/  # Pydantic request/response
│   │   ├── services/ # Business logic (parser, detector, matcher)
│   │   └── core/     # Config, DB, settings
│   └── pyproject.toml
├── frontend/         # Next.js + custom CSS (OKLCH design tokens, bureau theme)
│   └── app/          # App Router pages
└── demo/             # Demo DOCX file for onboarding
```

**Data hierarchy:** `Project → Objective → Thread → Signal → Anchor (Citation)`

## Dev Commands

### Backend
```bash
cd backend
py -m pip install -e ".[dev]"          # install once
py -m uvicorn app.main:app --reload    # start on port 8000
py -m pytest                           # run tests
# API docs: http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm run dev                            # start on port 3000
```

## Key Design Decisions

**Signal detection — three modes:**
- Rule-based (no setup): keyword lists + semantic-group filtering
- Ollama local (gemma4:e2b + nomic-embed-text): on-device, no data leaves the machine
- OpenAI: highest accuracy, data sent to OpenAI

See [README.md](README.md#signal-detection) for signal-level definitions (L1/L2/L3/Context/Pending). Do not duplicate those definitions here.

**Signal level `context`:** Auto-assigned when a paragraph's section matches `background` / `context` keywords in the parser. Represents external policy/law environment — counted and displayed, but visually distinct (purple dots in swim-lane).

**Parser rules:**
- DOCX only (PDF is Phase 2)
- Extracts paragraph text + table cell text
- Each Anchor carries a context window (prev + current + next paragraph) stored as `Anchor.context_text`; used by Review's Context mode and as LLM input historically (now LLM gets just the current paragraph — see `detect_llm` for rationale)

**Thread rules:**
- Must belong to an Objective
- Required fields: `objective_id` + `statement`
- Delete: all Signals must be reassigned first; last Thread in project cannot be deleted
- Merge: user picks which statement to keep, all Signals consolidated

**ABC Review difference by mode:**
- LLM mode: confirm or modify machine output; "custom keyword second opinion" UI flags mismatches between LLM level and user-defined keywords
- Rule-based mode: user decides Signal validity and Level (heavier workload)

**Local storage:**
- SQLite DB at `backend/mechela.db`
- Uploaded files at `backend/uploads/`
- User-specific settings at `backend/user_settings.json` (gitignored)
- No cloud infrastructure

**Frontend i18n:**
- Custom provider at [frontend/lib/i18n.tsx](frontend/lib/i18n.tsx), English + Traditional Chinese
- Always route user-facing strings through `t.key` — no `lang === "en" ? "..." : "..."` ternaries (only exception: conditional CSS styling tied to active language)
- Parameterised strings use function-form keys: `(t.deletedReportT as (n: string) => string)(name)`

## Conventions worth preserving

- Git: never `git add -A` / `git add .` — always stage explicit files, verify against commit message (see memory)
- Python: no Pydantic `-Settings` import missing — `pydantic-settings` is a required dep
- Windows-first dev: paths use forward slashes in Python, commands use `py` (not `python`); `bash` available via Git Bash but do NOT use Windows CRLF expectations inside `.sh` scripts
- Frontend state patterns:
  - Track in-flight operations per-resource (e.g. `redetecting: Set<number>`) to allow parallel actions
  - Use `useRef` to break React stale-closure traps when a long-lived effect (like keyboard listener) needs the latest handler function

## MVP Scope

See [README.md](README.md#features-mvp) for the feature list. What's NOT in scope:
- PDF parsing, vector search, export JSON/CSV, audit log, executable packaging, cross-project search, multi-user collaboration (all Phase 2)
- Chinese signal detection (known gap — regex `\b` word-boundary doesn't work on Chinese; see memory `Chinese detection gap`)

## Related docs

- [docs/local-ai-evaluation.md](docs/local-ai-evaluation.md) — why Ollama, why gemma4:e2b
- Demo plan: `.claude/plans/joyful-drifting-shannon.md` (not in repo; user's local plan)
