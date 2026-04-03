# Technical Specification (SPEC)

## Narrative Evidence Index & Change Progression Builder (MVP)

Generated: 2026-03-03 01:29 UTC

------------------------------------------------------------------------

# 1. Purpose

This document defines the technical specification for the MVP of:

> Narrative Evidence Index & Change Progression Builder

The system transforms narrative reports into structured, traceable
Change Threads with citation-level evidence anchoring.

This SPEC covers:

-   Product positioning
-   Functional requirements
-   UI specification
-   Data flow
-   System architecture
-   Data model
-   Matching logic
-   Recommended tech stack
-   MVP scope constraints

------------------------------------------------------------------------

# 2. Product Positioning

## 2.1 Out of Scope

The system SHALL NOT:

-   Automatically write evaluation reports
-   Perform impact quantification
-   Replace formal M&E frameworks
-   Require KPI definitions

## 2.2 In Scope

The system SHALL:

-   Extract Change Signals from narrative reports
-   Anchor each signal to verifiable citations
-   Build temporal Change Threads
-   Provide evidence retrieval
-   Visualize progression over time

------------------------------------------------------------------------

# 3. Core Definitions

## 3.1 Change Signal

A Change Signal MUST represent a state change rather than an activity.

Valid examples: - Adoption of policy - Institutionalization of process -
Behavioral shift - Capacity increase

Invalid examples: - Event held - Number of participants - Deliverable
published

### Signal Levels

-   L1: Confirmed change
-   L2: Intent or trial
-   L3: Weak signal

------------------------------------------------------------------------

## 3.2 Change Thread

A Change Thread represents:

> A temporal progression of signals concerning the same subject and
> direction of change.

------------------------------------------------------------------------

# 4. System Architecture Overview

``` mermaid
flowchart LR
  UI[Web UI] --> API[API Layer]
  API --> Worker[Background Worker]
  Worker --> DB[(PostgreSQL)]
  Worker --> Storage[(Object Storage)]
  DB --> Search[Full Text Search]
  API --> Search
```

------------------------------------------------------------------------

# 5. Functional Requirements

## 5.1 Project Management

-   Create / Edit / Archive Project
-   Create / Edit Objective (1--2 per report recommended)

## 5.2 Report Handling

-   Upload DOCX / PDF
-   Store file in object storage
-   Generate paragraph anchors

## 5.3 Signal Extraction

System SHALL:

-   Detect Change Signals (rule-based)
-   Extract Subject
-   Assign Level (L1/L2/L3)
-   Classify Type (Capability / Institutional / Relational)

## 5.4 Thread Management

-   Create Thread
-   Edit Thread main statement
-   Merge Threads
-   Assign Signals to Threads
-   Suggest matching Threads

## 5.5 ABC Review

For each signal:

A. Confirm assignment\
B. Refine signal text\
C. Synthesize progression summary

## 5.6 Evidence Retrieval

-   Jump to original paragraph
-   Copy citation in Markdown format
-   Search across signals and threads

## 5.7 Visualization

-   Temporal dashboard (Thread-level view)
-   Thread timeline view
-   Warning if only activities detected

------------------------------------------------------------------------

# 6. User Flow

``` mermaid
flowchart TD
  Upload --> Parse
  Parse --> Extract
  Extract --> Match
  Match --> Review
  Review --> Dashboard
```

------------------------------------------------------------------------

# 7. Thread Matching Logic

## 7.1 Candidate Selection

Filter by:

-   Same project
-   Same objective
-   Similar subject

## 7.2 Scoring Formula

``` text
Score =
  w1 * text_similarity
+ w2 * subject_match
+ w3 * type_match
+ w4 * time_continuity
```

If:

-   High score → Suggest existing thread
-   Medium → Show top 3 options
-   Low → Suggest new thread

------------------------------------------------------------------------

# 8. Data Model

``` mermaid
erDiagram
  PROJECT ||--o{ OBJECTIVE : contains
  OBJECTIVE ||--o{ THREAD : contains
  THREAD ||--o{ SIGNAL : includes
  SIGNAL ||--|| CITATION : references
  CITATION ||--|| ANCHOR : located_in
```

### Key Tables

-   projects
-   objectives
-   reports
-   anchors
-   signals
-   threads
-   thread_signals
-   citations
-   audit_logs

------------------------------------------------------------------------

# 9. Data Flow

1.  Upload report
2.  Store file
3.  Parse → Generate anchors
4.  Detect signals
5.  Match threads
6.  User review (ABC)
7.  Persist to DB
8.  Index for search
9.  Render dashboard

------------------------------------------------------------------------

# 10. UI Specification

## 10.1 Main Screens

### Project Dashboard

-   Thread cards
-   Duration
-   Signal count
-   Citation count

### Upload Screen

-   File input
-   Metadata fields

### Extraction Review Screen

-   Left: Original text
-   Center: Signals
-   Right: Thread suggestions

### Thread Timeline

-   Chronological signal display
-   Citation links

------------------------------------------------------------------------

# 11. Recommended Tech Stack (Free MVP)

## Backend

-   Python 3.11
-   FastAPI
-   SQLAlchemy
-   PostgreSQL
-   scikit-learn (TF-IDF)
-   python-docx
-   pdfplumber

## Frontend

-   Next.js
-   Tailwind CSS

## Infrastructure

-   Railway / Render (free tier)
-   PostgreSQL free tier
-   Cloudflare R2 free storage

Expected monthly cost: \$0 (within limits)

------------------------------------------------------------------------

# 12. MVP Scope

Included:

-   DOCX parsing
-   Rule-based signal detection
-   TF-IDF thread matching
-   ABC review
-   Temporal dashboard
-   Citation viewer

Excluded:

-   LLM-based summarization
-   Vector search
-   Impact modeling
-   Advanced PDF bounding boxes

------------------------------------------------------------------------

# 13. Non-Functional Requirements

-   Must support concurrent users \< 30
-   Must process \< 200 reports per month
-   Average extraction time \< 5 seconds per report
-   Citation must be traceable and reproducible

------------------------------------------------------------------------

# 14. Future Expansion

-   Enhanced subject extraction
-   Cross-project analytics
-   Institutional depth scoring
-   External API integration

------------------------------------------------------------------------

# End of Technical SPEC
