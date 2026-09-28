# RETRAX

<p align="center">
  <img src="https://img.shields.io/badge/RETRAX-Memory--Augmented%20Incident%20Intelligence-0f172a?style=for-the-badge" alt="RETRAX">
  <img src="https://img.shields.io/badge/Hindsight-Vectorize-111827?style=for-the-badge" alt="Hindsight">
  <img src="https://img.shields.io/badge/Ollama-Local%20AI-111827?style=for-the-badge" alt="Ollama">
</p>

<p align="center">
  <strong>AI Agents That Learn From Engineering Experience</strong>
</p>

<p align="center">
  RETRAX is a memory-augmented incident intelligence platform for engineering and DevOps teams that uses historical incident experience to investigate current production issues, surface what worked and what failed, compare incidents, and feed outcomes back into organizational memory.
</p>

<p align="center">
  <a href="https://github.com/abhinavreddy6342/RETRAX">GitHub Repository</a>
</p>

---

## Overview

Production incidents are rarely isolated events.

Engineering teams repeatedly encounter related problems such as database connection pressure, service degradation, retry amplification, downstream saturation, configuration mistakes, and deployment-related failures. The knowledge needed to solve these incidents often already exists in previous incidents, runbooks, actions, and post-mortems.

**RETRAX turns that historical engineering experience into reusable memory.**

Instead of reasoning only from the current incident, RETRAX combines:

- Current incident evidence
- Historical engineering experience
- AI-assisted reasoning
- Successful and failed investigation actions
- Runbook experience
- Post-mortem lessons
- Investigation outcomes

The result is an incident-response workflow designed around **learning from what happened before**.

---

# The Core Idea

Traditional incident assistance can look like:

```text
Current Incident
       ↓
      AI
       ↓
    Answer
```

RETRAX extends the workflow:

```text
Historical Incidents
        ↓
   Hindsight Memory
        ↓
  Current Incident
        ↓
Historical Comparison
        ↓
What Worked / What Failed
        ↓
Warnings & Lessons
        ↓
Recommended Investigation
        ↓
Engineer Action
        ↓
Outcome
        ↓
New Engineering Memory
        ↓
Better Future Investigations
```

The central question becomes:

> **What can we learn from previous engineering experience that is relevant to this incident?**

---

# Why RETRAX?

Incident-response systems often have access to current telemetry, logs, and incident details, but historical engineering experience can remain difficult to reuse.

RETRAX is designed to make that experience explicit.

It can remember:

- Previous incidents
- Historical root-cause records
- Successful actions
- Failed actions
- Verification steps
- Runbooks
- Lessons learned
- Preventive insights
- Investigation outcomes

This allows historical experience to become part of future incident investigations.

---

# Key Capabilities

## 🧠 Memory-Augmented Incident Investigation

RETRAX retrieves relevant historical experience and combines it with current incident information.

The agent can surface:

- Similar incidents
- Historical failure signatures
- Previous root-cause records
- Successful remediation patterns
- Failed remediation attempts
- Operational warnings
- Preventive lessons
- Relevant runbooks

Historical information is presented as experience and evidence rather than automatically being treated as confirmed truth about the current incident.

---

## 🔍 Incident Comparison

RETRAX compares the current incident against previous engineering experience.

The comparison is structured around:

### Why Similar

Examples of common signals can include:

- Same service
- Similar error signatures
- Similar infrastructure symptoms
- Database pressure
- Operational conditions
- Similar historical remediation patterns

### Why Different

The system also surfaces differences that may make a previous solution inappropriate for the current incident.

This helps engineers evaluate historical experience instead of blindly copying it.

---

## ✅ What Worked Before

RETRAX explicitly surfaces successful historical actions.

Examples from the demonstration data include:

- Inspecting active PostgreSQL connections
- Reducing application connection pressure
- Recycling affected application processes
- Reducing retry amplification
- Restoring downstream capacity

The objective is to make proven engineering experience easy to find during an incident.

---

## ⚠️ What Failed Before

RETRAX remembers unsuccessful actions as well as successful ones.

For incident response, knowing what **not** to repeat can be just as useful as knowing what worked.

Historical failed actions can therefore become reusable warnings for future investigations.

Example:

```text
Previously attempted:
Increase database max_connections

Historical outcome:
Failed

Historical reason:
Database capacity could not safely support the change without broader infrastructure validation.

Future guidance:
Do not repeat without validating the underlying capacity constraints.
```

---

## 🚫 Don't Repeat Warnings

Failed historical actions can be surfaced as explicit warnings.

This creates a memory loop where an unsuccessful investigation step becomes future engineering guidance rather than disappearing after the incident is closed.

---

## 📈 Investigation Decision Trajectory

RETRAX records investigation actions and their outcomes.

The trajectory can include:

- Action
- Actor
- Timestamp
- Reason
- Result
- Evidence
- Hypothesis
- Runbook association

This provides a visible record of how an investigation evolved.

---

## 📚 Runbook Experience Intelligence

RETRAX treats runbooks as operational experience rather than only static documentation.

The platform tracks information such as:

- Execution count
- Successful executions
- Failed executions
- Success rate
- Common success conditions
- Common failure conditions
- Warnings
- Last execution
- Incident context

This allows engineers to evaluate historical runbook experience when investigating a new incident.

---

## 🔄 Incident Memory Replay

Historical incidents can be viewed as reusable engineering experience:

```text
Historical Incident
        ↓
Signals
        ↓
Actions Taken
        ↓
Successful Actions
        ↓
Failed Actions
        ↓
Lessons Learned
        ↓
Current Incident
```

This creates a practical connection between previous incidents and present-day investigation.

---

# Learning Loop

RETRAX follows a continuous engineering learning cycle:

```text
┌──────────────────────────────┐
│     Historical Incidents     │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│       Hindsight Memory       │
│      Retain / Recall /       │
│          Reflect             │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│       Current Incident       │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│       AI Investigation       │
│ Current Evidence + History   │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│      Engineer Actions        │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│       Action Outcome         │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│      Post-Mortem / Lessons   │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│    New Engineering Memory    │
└──────────────┬───────────────┘
               │
               └──────────────→ Future Incidents
```

---

# Architecture

```mermaid
flowchart TB

    UI["RETRAX Web Interface<br/>React"]

    API["FastAPI Backend"]

    INCIDENT["Incident Management"]
    AGENT["Incident Intelligence Agent"]
    MEMORY["Memory Service"]
    RUNBOOK["Runbook Intelligence"]
    LEARN["Learning / Post-Mortem"]
    EVAL["Evaluation Engine"]

    DB[("PostgreSQL")]

    HINDSIGHT["Hindsight by Vectorize<br/>Engineering Memory"]

    OLLAMA["Ollama<br/>Local AI Reasoning"]

    UI --> API

    API --> INCIDENT
    API --> AGENT
    API --> MEMORY
    API --> RUNBOOK
    API --> LEARN
    API --> EVAL

    INCIDENT --> DB
    MEMORY --> DB
    RUNBOOK --> DB
    LEARN --> DB
    EVAL --> DB

    AGENT --> MEMORY
    AGENT --> OLLAMA
    AGENT --> HINDSIGHT

    MEMORY --> HINDSIGHT
    LEARN --> MEMORY
    RUNBOOK --> MEMORY
    EVAL --> AGENT
```

---

# Hindsight Memory

RETRAX is designed around **Hindsight by Vectorize** as its engineering-memory layer.

The memory workflow follows:

```text
RETAIN
  ↓
RECALL
  ↓
REFLECT
  ↓
INVESTIGATE
  ↓
LEARN
  ↓
RETAIN AGAIN
```

Conceptually:

```text
                    RETRAX
                       │
                       ▼
              ┌─────────────────┐
              │ Hindsight Memory │
              └────────┬────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   Historical      Successful      Failed
    Incidents       Actions        Actions
        │              │              │
        └──────────────┼──────────────┘
                       │
                       ▼
                 Lessons Learned
                       │
                       ▼
              Current Investigation
```

---

# Memory Types

RETRAX supports different forms of engineering experience.

| Memory Type | Purpose |
|---|---|
| Incident Experience | Captures reusable information about a historical incident |
| Root Cause | Stores recorded historical root-cause information |
| Successful Action | Remembers remediation approaches that worked |
| Failed Action | Remembers approaches that failed |
| Verification | Records evidence used to validate an operational condition |
| Lesson | Captures reusable engineering knowledge |
| Warning | Highlights previously unsuccessful approaches |

---

# Incident Intelligence

A typical RETRAX investigation can move through:

```text
Current Incident
       ↓
Historical Experience
       ↓
Similarities
       ↓
Differences
       ↓
Historical Successes
       ↓
Historical Failures
       ↓
Warnings
       ↓
Recommended Actions
       ↓
Preventive Insights
```

The system is designed to keep these concepts distinguishable:

```text
CURRENT INCIDENT EVIDENCE
          +
HISTORICAL EXPERIENCE
          +
AI REASONING
          +
RECOMMENDATIONS
```

Historical memory can inform an investigation, but it is not automatically treated as proof of the current incident's root cause.

---

# Evaluation

RETRAX includes an evaluation workflow that compares:

```text
Current-Evidence Investigation
              vs
Memory-Assisted Investigation
```

The evaluation layer can surface:

- Memories used
- Historical patterns
- Successful historical patterns
- Failed historical patterns
- Warnings
- Recommended actions
- Confidence
- Reasoning changes
- Memory provider
- Historical experience

The goal is to make the contribution of historical engineering experience observable rather than hiding it inside a single model response.

---

# Memory Provider Transparency

RETRAX records the source of historical experience used during an investigation.

Possible provider states include:

```text
HINDSIGHT
LOCAL DEMO MEMORY
RECORDED HISTORICAL MEMORY
MIXED
NONE
```

This distinction is intentional.

When live Hindsight is unavailable, RETRAX can use recorded local historical memory for demo continuity.

The system should clearly identify that fallback instead of representing it as live Hindsight usage.

---

# Local AI Reasoning

RETRAX also supports local AI reasoning through **Ollama**.

The current project configuration uses:

```text
llama3.2:latest
```

Ollama provides the local reasoning layer while Hindsight provides the historical engineering-memory layer.

The architecture therefore separates:

```text
Local AI Reasoning
        +
Long-Term Engineering Memory
```

---

# Technology Stack

## Frontend

- React
- JavaScript
- Framer Motion
- Axios
- Tailwind CSS
- Responsive dashboard interface

## Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy
- Alembic
- HTTPX
- Structlog
- Tenacity
- ORJSON

## AI and Memory

- Hindsight by Vectorize
- Ollama
- OpenAI SDK
- Groq SDK

## Database

- PostgreSQL

## Authentication and Utilities

- python-jose
- passlib
- python-multipart
- python-dotenv

## Testing

- Pytest
- pytest-asyncio

---

# Project Structure

```text
RETRAX/
│
├── backend/
│   │
│   ├── app/
│   │   ├── agent/
│   │   │   ├── orchestrator.py
│   │   │   ├── prompts.py
│   │   │   ├── schemas.py
│   │   │   ├── policies.py
│   │   │   └── tools/
│   │   │
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── auth.py
│   │   │       ├── incidents.py
│   │   │       ├── investigations.py
│   │   │       ├── memories.py
│   │   │       ├── runbooks.py
│   │   │       ├── deployments.py
│   │   │       ├── services.py
│   │   │       ├── postmortems.py
│   │   │       ├── learning.py
│   │   │       └── evaluations.py
│   │   │
│   │   ├── db/
│   │   │   └── models/
│   │   │
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── integrations/
│   │   ├── utils/
│   │   └── main.py
│   │
│   ├── seed/
│   ├── tests/
│   ├── requirements.txt
│   ├── alembic.ini
│   └── .env.example
│
├── frontend/
│   │
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── ...
│   │
│   ├── public/
│   ├── package.json
│   └── package-lock.json
│
├── .gitignore
└── README.md
```

---

# Backend Services

The backend is organized into domain-focused services.

### Incident Service

Handles incident creation, updates, retrieval, and incident lifecycle information.

### Investigation Service

Handles:

- Hypotheses
- Investigation actions
- Investigation timeline
- Incident intelligence
- Incident comparison

### Hindsight Service

Provides the Hindsight integration layer for:

- Retain
- Recall
- Reflect

### Memory Service

Provides a structured abstraction over historical engineering memories.

### Runbook Service

Handles:

- Runbook management
- Runbook recommendations
- Runbook execution records
- Runbook experience analysis

### Learning Service

Connects incident outcomes and post-mortems back into the engineering learning loop.

### Evaluation Service

Compares current-evidence reasoning with memory-assisted reasoning.

---

# API Overview

RETRAX exposes REST APIs for its major capabilities.

## Health

```text
GET /api/health
```

## Incidents

```text
POST /api/incidents
GET  /api/incidents
GET  /api/incidents/{incident_id}
```

## Investigations

```text
POST /api/incidents/{incident_id}/chat
POST /api/incidents/{incident_id}/comparison
POST /api/incidents/{incident_id}/actions
GET  /api/incidents/{incident_id}/trajectory
```

## Memories

```text
POST /api/memories
POST /api/memories/recall
POST /api/memories/reflect
```

## Runbooks

```text
GET  /api/runbooks
POST /api/runbooks/execute
GET  /api/runbooks/{runbook_id}/experience
GET  /api/runbooks/recommendations/{incident_id}
```

## Learning

```text
GET  /api/learning/incidents/{incident_id}/status
POST /api/learning/incidents/{incident_id}
```

## Evaluations

```text
POST /api/evaluations
POST /api/evaluations/compare
GET  /api/evaluations/summary
```

FastAPI provides interactive API documentation when the backend is running.

---

# Getting Started

## Prerequisites

Install:

- Python
- Node.js
- npm
- PostgreSQL
- Git
- Ollama

For live Hindsight memory, configure a valid Hindsight account and API key.

---

# 1. Clone the Repository

```bash
git clone https://github.com/abhinavreddy6342/RETRAX.git
cd RETRAX
```

---

# 2. Backend Setup

```bash
cd backend
```

Create a virtual environment.

### Windows

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

# 3. Environment Configuration

Create:

```text
backend/.env
```

Use:

```text
backend/.env.example
```

as the template.

Example configuration:

```env
ENVIRONMENT=development

DATABASE_URL=postgresql+psycopg://USER:PASSWORD@localhost:5432/retrax

HINDSIGHT_BASE_URL=https://api.hindsight.vectorize.io
HINDSIGHT_BANK_ID=retrax-engineering-memory
HINDSIGHT_API_KEY=your_hindsight_api_key_here

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:latest
```

Do not commit the real `.env` file or any secrets.

---

# 4. Database Setup

Make sure PostgreSQL is running and the `retrax` database exists.

From the backend directory:

```bash
alembic upgrade head
```

---

# 5. Ollama Setup

Install Ollama and make sure the configured model is available.

Example:

```bash
ollama pull llama3.2:latest
```

The application uses Ollama's local API for AI reasoning.

---

# 6. Start the Backend

From:

```text
backend/
```

run:

```bash
uvicorn app.main:app --reload --port 8000
```

Backend:

```text
http://127.0.0.1:8000
```

Health endpoint:

```text
http://127.0.0.1:8000/api/health
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

---

# 7. Frontend Setup

Open another terminal and run:

```bash
cd frontend
npm install
npm run dev
```

The frontend development URL will be displayed in the terminal.

---

# Running Tests

## Backend

```bash
cd backend
pytest -q
```

Compile check:

```bash
python -m compileall -q app
```

Dependency check:

```bash
pip check
```

Migration check:

```bash
alembic check
```

## Frontend

```bash
cd frontend
npm run lint
npm run build
```

---

# Demo Flow

A typical RETRAX demonstration can follow this sequence:

```text
1. Open the RETRAX Command Center
                 ↓
2. Select an active incident
                 ↓
3. Review current incident signals
                 ↓
4. Run the AI investigation
                 ↓
5. Retrieve historical engineering experience
                 ↓
6. Compare the current incident with previous incidents
                 ↓
7. Inspect:
      • What Worked
      • What Failed
      • Why Similar
      • Why Different
      • Warnings
                 ↓
8. Review investigation trajectory
                 ↓
9. Inspect runbook experience
                 ↓
10. Record an engineering action
                 ↓
11. Feed the outcome back into the learning flow
                 ↓
12. Evaluate current-evidence vs memory-assisted reasoning
```

---

# Example Incident Scenario

The demonstration environment includes an active payment-service incident involving elevated 5xx errors and database connection pressure.

Example error:

```text
psycopg.OperationalError:
remaining connection slots are reserved
```

Historical engineering experience can include successful actions such as:

```text
Inspect PostgreSQL active connections
Reduce application connection pressure
Recycle affected application processes
```

Historical failed experience can include:

```text
Increase database max_connections
```

The historical failure is surfaced as an experience and warning rather than automatically being interpreted as the confirmed root cause of the current incident.

---

# Investigation Experience

RETRAX makes several parts of the investigation visible.

## Current Evidence

Information directly associated with the active incident.

## Historical Experience

Previously recorded engineering information that may be relevant.

## Agent Reasoning

AI-generated reasoning based on available evidence and historical experience.

## Recommendations

Suggested investigation steps for the engineer to evaluate.

## Investigation Outcome

The result of actions taken during the investigation.

This separation helps maintain a clear distinction between evidence, historical memory, reasoning, and recommendations.

---

# Engineering Experience Graph

Conceptually, RETRAX connects engineering artifacts like this:

```text
Incident
   │
   ├── Service
   │
   ├── Symptoms
   │
   ├── Hypotheses
   │
   ├── Actions
   │     ├── Successful
   │     └── Failed
   │
   ├── Runbooks
   │
   ├── Root Cause
   │
   ├── Post-Mortem
   │
   └── Lessons
          │
          ▼
      Memory
          │
          ▼
   Future Incidents
```

This transforms individual incidents into reusable organizational experience.

---

# Design Principles

## 1. Learn From Experience

Past incidents should contribute to future investigations.

## 2. Remember Failures

Failed actions should remain useful as future warnings.

## 3. Separate Evidence From Inference

Current incident evidence should remain distinguishable from historical experience and AI-generated reasoning.

## 4. Make Memory Visible

Engineers should be able to see what historical experience influenced an investigation.

## 5. Learn From Outcomes

Investigation actions and post-mortem lessons can feed the future memory loop.

## 6. Preserve Provenance

The system should identify the actual source of historical information.

---

# Operational Boundaries

RETRAX is designed as an incident intelligence and engineering decision-support platform.

The system can record and evaluate runbook actions and investigation outcomes without blindly executing arbitrary production shell or infrastructure commands.

Recommended actions should be reviewed against the current production environment before execution.

---

# Demo Memory Fallback

For demo continuity, RETRAX supports a recorded local historical-memory fallback.

When the live Hindsight service is unavailable:

```text
Live Hindsight
      ↓
Unavailable
      ↓
Recorded Historical Memory
      ↓
Continue Investigation Demo
```

The UI distinguishes this source from live Hindsight memory.

This keeps the demo transparent about the actual source of historical experience.

---

# Hackathon Context

RETRAX is built around the theme:

> **AI Agents That Learn Using Hindsight**

Selected problem space:

> **Incident Response Agent**

Domain:

> **Engineering & DevOps**

Core concept:

```text
Incident Response
        +
Historical Engineering Memory
        +
AI Reasoning
        +
Learning From Outcomes
```

The platform is designed to demonstrate how long-term engineering experience can improve incident investigation workflows.

---

# What RETRAX Demonstrates

RETRAX brings together:

```text
                 ┌─────────────────────┐
                 │  Current Incident   │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ Historical Memory   │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ AI Investigation    │
                 └──────────┬──────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
         What Worked    What Failed   Differences
              │             │             │
              └─────────────┼─────────────┘
                            ▼
                    Recommendations
                            │
                            ▼
                     Engineer Action
                            │
                            ▼
                         Outcome
                            │
                            ▼
                    New Engineering
                         Memory
```

---

# Roadmap

Possible future extensions include:

- Richer incident similarity analysis
- Knowledge-gap detection
- Emerging incident-pattern detection
- Memory freshness visualization
- Memory conflict analysis
- Counterfactual incident replay
- Expanded evaluation datasets
- Deeper observability integrations
- Additional engineering-system integrations
- More advanced service-level experience analytics

---

# Security

Never commit:

```text
.env
API keys
Database passwords
Private credentials
Virtual environments
node_modules
Local database files
Generated build artifacts
```

Use:

```text
backend/.env.example
```

for safe configuration templates.

---

# Repository Structure at a Glance

```text
RETRAX
│
├── backend
│   ├── app
│   ├── seed
│   ├── tests
│   ├── requirements.txt
│   ├── alembic.ini
│   └── .env.example
│
├── frontend
│   ├── src
│   ├── public
│   ├── package.json
│   └── package-lock.json
│
├── .gitignore
└── README.md
```

---

# GitHub

Repository:

**https://github.com/abhinavreddy6342/RETRAX**

---

<p align="center">
  <strong>Remember the incident. Learn from the outcome. Respond better next time.</strong>
</p>

<p align="center">
  RETRAX — Memory-Augmented Incident Intelligence
</p>
