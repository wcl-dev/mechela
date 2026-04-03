# Narrative Evidence Index & Change Progression Builder

## Technical Development Guide (MVP)

Generated: 2026-03-01 04:08 UTC

------------------------------------------------------------------------

# 1. Product Positioning

## Core Definition

This product is NOT: - An M&E evaluation engine - An impact
quantification tool - An automated report writer

It IS:

> A **Narrative Evidence Index & Change Progression Builder**

Its purpose is to transform dispersed narrative change descriptions into
structured, traceable temporal change threads.

------------------------------------------------------------------------

# 2. Core Value Proposition

The system addresses:

-   Fragmented narrative memory
-   Difficulty reconstructing change trajectories
-   Slow evidence retrieval during reporting

It builds:

-   Change Progression Map
-   Evidence Retrieval Layer
-   Organizational Memory Infrastructure

------------------------------------------------------------------------

# 3. Core Concepts

## 3.1 Change Signal

A Change Signal must describe a **state change**, not an activity.

Valid: - Adoption of practice - Institutionalization - Behavioral
shift - Capacity increase

Invalid: - Pure activity record - Headcount statistics - Deliverables
publication

### Signal Strength Levels

-   L1: Confirmed change (adopted / institutionalized)
-   L2: Behavioral tendency (planned / trial phase)
-   L3: Weak signal (interest / discussion)

------------------------------------------------------------------------

## 3.2 Change Thread

A Change Thread is:

> A temporal progression of change signals describing evolution of the
> same subject in the same direction.

Example:

Q1: Expressed adoption intent\
Q2: Trial implementation\
Q3: Institutionalized

------------------------------------------------------------------------

# 4. System Architecture (High-Level)

    Web UI
       │
    API Layer
       │
    Worker (Parsing / Extraction / Matching)
       │
    Database (PostgreSQL)
       │
    Search Layer (Full Text)

------------------------------------------------------------------------

# 5. User Flow

    Upload Report
          ↓
    System Parsing
          ↓
    Extract Change Signals
          ↓
    Thread Matching
          ↓
    ABC Review (Confirm / Refine / Synthesize)
          ↓
    Temporal Dashboard

------------------------------------------------------------------------

# 6. Thread Matching Logic

    New Change Signal
            ↓
    Filter Candidate Threads
            ↓
    Compute Similarity Score
            ↓
    Score Evaluation
            ↓
    User Confirmation

### Matching Formula

    Final Score =
      w1 * text_similarity
    + w2 * subject_match
    + w3 * type_match
    + w4 * time_continuity

------------------------------------------------------------------------

# 7. Data Model Overview

    Project
      └── Objective
            └── Thread
                  └── Signals
                        └── Citation
                              └── Anchor

------------------------------------------------------------------------

# 8. Functional Modules

## Core Modules

1.  Project & Objective CRUD
2.  Report Upload & Metadata
3.  Parsing & Anchor Generation
4.  Change Signal Detector
5.  Subject Extractor
6.  Strength Scoring
7.  Thread CRUD
8.  Thread Matcher
9.  ABC Review Interface
10. Citation Builder
11. Temporal Dashboard
12. Thread Timeline View
13. Only-Outputs Warning
14. Export (JSON / CSV / Markdown)

------------------------------------------------------------------------

# 9. UI Structure

## Main Screens

### 1. Project Selector

-   Project list
-   Objective overview

### 2. Upload Interface

-   File upload
-   Metadata input

### 3. Extraction Review

-   Original text panel
-   Signal candidates
-   Thread suggestions

### 4. Dashboard (Temporal View)

-   Thread cards
-   Duration
-   Depth
-   Citation count

### 5. Thread Timeline

-   Chronological signal progression
-   Citation jump links

------------------------------------------------------------------------

# 10. Data Flow

1.  Upload file → Object Storage
2.  Parse → Generate Anchors
3.  Detect Change Signals
4.  Match to Threads
5.  User ABC Review
6.  Persist to DB
7.  Index for Search
8.  Display Dashboard

------------------------------------------------------------------------

# 11. Recommended Tech Stack (Free MVP)

## Backend

-   Python 3.11
-   FastAPI
-   SQLAlchemy
-   PostgreSQL
-   scikit-learn (TF-IDF)
-   python-docx / pdfplumber
-   spaCy (optional, small model)

## Frontend

-   Next.js
-   Tailwind CSS
-   JWT authentication

## Infrastructure (Free Tier)

-   Railway / Render (Web + DB)
-   Cloudflare R2 (Storage)
-   PostgreSQL Full Text Search

Estimated cost: \$0 (within free tier limits)

------------------------------------------------------------------------

# 12. Deployment Architecture (Free MVP)

    Next.js (Vercel Free)
            │
    FastAPI (Railway Free)
            │
    PostgreSQL (Railway Free)
            │
    Cloudflare R2 (Free Storage)

------------------------------------------------------------------------

# 13. MVP Scope

Included:

-   DOCX parsing
-   Change Signal extraction (rule-based)
-   Thread matching (TF-IDF)
-   ABC review
-   Temporal dashboard
-   Citation retrieval

Excluded:

-   LLM-based summarization
-   Impact quantification
-   Vector search
-   Advanced PDF bounding box mapping

------------------------------------------------------------------------

# 14. Future Expansion (Phase 2+)

-   Better subject extraction
-   Multi-project analytics
-   Institutional depth indicators
-   Advanced export templates
-   API integration with external M&E systems

------------------------------------------------------------------------

# End of Document
