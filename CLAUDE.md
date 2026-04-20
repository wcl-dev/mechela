# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product

**Mechela** — Narrative Evidence Index & Change Progression Builder

A local-first M&E assistant tool for NGO mid-to-senior executives. Transforms narrative reports (DOCX) into structured, traceable Change Threads with citation-level evidence anchoring.

**Core user flow:**
Upload DOCX → Parse anchors → Detect Change Signals → Match Threads → ABC Review → Temporal Dashboard → Export Markdown

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
# Install dependencies (run once)
cd backend
py -m pip install -e ".[dev]"

# Start backend (port 8000)
py -m uvicorn app.main:app --reload

# API docs
open http://localhost:8000/docs

# Run tests
py -m pytest
```

### Frontend
```bash
# Start frontend (port 3000)
cd frontend
npm run dev
```

## Key Design Decisions

**Signal detection — dual mode:**
- LLM mode (OpenAI API key required): semantic understanding, outputs L1/L2/L3 + confidence score
- Rule-based mode (no key): keyword-based candidate extraction, all output requires human review in ABC Review

**Signal levels:**
- L1: Confirmed/institutionalized change (past tense + institutional verb)
- L2: Committed intent or trial (agreement/plan + concrete action taken)
- L3: Awareness/interest only (no commitment)
- Pending: Ambiguous, flagged for human judgment

**Context Signal:** Paragraphs from Background sections describing external policy/law changes. Tagged separately, not counted as Thread evidence.

**Parser rules:**
- DOCX only (PDF is Phase 2)
- Extracts paragraph text + table cell text
- Each Signal carries a context window (target paragraph + one before/after)

**Thread rules:**
- Must belong to an Objective
- Required fields: objective_id + statement
- Delete: all Signals must be reassigned first; last Thread in project cannot be deleted
- Merge: user picks which statement to keep, all Signals consolidated

**ABC Review difference by mode:**
- LLM mode: confirm or modify machine output
- Rule-based mode: user decides Signal validity and Level (heavier workload, UI must show warning)

**Local storage:**
- SQLite DB at `backend/mechela.db`
- Uploaded files at `backend/uploads/`
- No cloud infrastructure

**API Key:** Stored in user Settings after login. Without key → rule-based fallback.

## MVP Scope

In: DOCX parsing (with tables + context window), dual-mode Signal detection, Context Signal tagging, Only-Outputs Warning, ABC Review UI, Thread CRUD (create/edit/delete/merge), Thread matching, Citation Markdown output, Export (Thread + Signals + Citations as MD), cross-report search (within Project), Temporal Dashboard, API Key settings, Demo DOCX file.

Out (Phase 2): PDF parsing, vector search, export JSON/CSV, audit log, executable packaging, cross-project search, multi-user collaboration.
