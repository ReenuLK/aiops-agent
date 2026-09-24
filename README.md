# AIOps Agent — Autonomous Container Incident Response Platform

> **Portfolio project.** The Azure deployment is torn down between evaluation periods to control cloud cost. See the **[Demo Video](Demo%20Video.mp4)** for a full walkthrough, or follow the setup instructions below to run it locally.

An agentic AI system that monitors Dockerized services, diagnoses failures by reasoning over container logs with a locally-hosted LLM, and either suggests or safely auto-executes recovery actions — with a full observability dashboard, conversational chat interface, and persistent incident audit trail.

## Problem Statement

When a deployed application fails — a container crash, resource exhaustion, a bad config push — an engineer typically has to manually notice the failure, inspect logs, diagnose the root cause, decide on a fix, and execute it. This is slow, repetitive, and often follows recognizable patterns: the majority of container failures fall into a handful of categories (misconfiguration, OOM, missing dependencies, resource conflicts) that a system can learn to recognize and respond to faster than a human doing manual triage.

## What This Project Does

1. **Monitors** Dockerized containers for health/status changes in real time
2. **Diagnoses** failures by feeding container logs and exit metadata to a locally-hosted LLM (Llama 3.1 8B via Ollama)
3. **Reports** the diagnosis conversationally through a chat interface, alongside a live dashboard
4. **Acts** — suggesting a fix for human approval, or auto-executing it when the fix is genuinely low-risk (a plain restart), based on a risk-classification safety boundary that never relies on the LLM's self-reported risk label alone

This sits at the intersection of agentic AI, backend/API engineering, and DevOps/infrastructure — demonstrating system-level reasoning (containers, processes, logs, state) rather than a chatbot wrapper around an LLM API call.

---

## Architecture

```
                    User
                     │
             React Dashboard
                     │
             FastAPI Backend
                     │
        ┌────────────┼────────────┐
        │            │            │
   PostgreSQL      Redis      Orchestrator
   (incident       (stats      (intent routing +
    history)        cache)      auto-execute
                                 safety check)
                                     │
                        ┌────────────┴────────────┐
                        │                          │
                   Docker Agent               Log Agent
                (perceive + act)              (reason)
                        │                          │
                   Docker API                   Ollama
              (list/stats/logs/               (Llama 3.1 8B,
               start/stop/restart)              self-hosted)
```

**Flow**: requests come in through the dashboard → FastAPI → the Orchestrator, which resolves which container is involved, classifies user intent (status / fix / general), and calls the Docker Agent for state and the Log Agent for diagnosis. Diagnoses flow back up to the user and are logged to Postgres; container stats are cached in Redis to reduce polling load on the Docker daemon.

**3-layer agent design**, and why:

- **Docker Agent** (perceive + act) — wraps the Docker SDK. Knows nothing about AI or LLMs.
- **Log Agent** (reason) — sends logs + exit metadata to Ollama, returns a structured JSON diagnosis. Knows nothing about Docker internals.
- **Orchestrator** (decide) — the only layer that makes decisions, including the safety-bounded call on whether to auto-execute a fix.

This separation kept each layer independently testable, and kept all safety-critical logic in exactly one place rather than scattered across the codebase.

---

## Tech Stack & Rationale

| Layer               | Technology                  | Why chosen (vs. alternatives considered)                                                                                                                                                                                                                                                                                                               |
| ------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Backend framework   | **FastAPI**                 | Async-friendly for concurrent Docker/LLM/DB I/O; auto-generated Swagger docs. Chosen over Flask (more boilerplate) and Django (heavier than needed for an API-only service)                                                                                                                                                                            |
| Container control   | **Docker SDK for Python**   | Structured, typed objects and exceptions instead of parsing raw CLI output from subprocess calls                                                                                                                                                                                                                                                       |
| LLM runtime         | **Ollama + Llama 3.1 8B**   | Zero inference cost during heavy iterative prompt development; works offline. Chosen over a hosted API (OpenAI/Anthropic) to avoid per-call cost while making dozens of test calls daily — tradeoff is higher latency (documented below)                                                                                                               |
| Agent orchestration | **Plain Python**            | The logic is a fixed, short sequential decision flow, not a complex multi-agent graph. A framework like LangGraph/CrewAI would add real learning-curve cost without proportional benefit at this scale                                                                                                                                                 |
| Database            | **PostgreSQL**              | Relational structure fits incident-history queries (filter by container, time, risk) well; production-grade, widely recognized choice over MongoDB/SQLite for this use case                                                                                                                                                                            |
| Cache               | **Redis**                   | Purpose-built short-TTL caching to avoid hammering the Docker API on frequent (5s) dashboard polling; fails open if unavailable                                                                                                                                                                                                                        |
| Frontend            | **React + Vite + Tailwind** | React is the standard baseline expected in most engineering contexts; Vite has near-zero config overhead vs. Create React App; Tailwind avoids disproportionate time on custom CSS                                                                                                                                                                     |
| Charts              | **Recharts**                | Simplest API for a standard live line chart with native React component syntax; D3 would be excess power for this need                                                                                                                                                                                                                                 |
| Deployment          | **Self-managed Azure VM**   | **Hard architectural requirement, not a preference** — this project needs direct Docker daemon socket access to monitor/control containers. Managed PaaS platforms (Railway, Render, Vercel, Azure App Service/Container Apps) isolate applications from the host's Docker daemon for tenant-isolation reasons and cannot run this project as designed |

---

## Safety Design — Auto-Execute Boundary

This is one of the more deliberate engineering decisions in the project:

- The LLM's own `risk_level` classification is **never trusted alone**. An independent, code-level check inspects the actual `suggested_fix` text for keywords implying a config/resource/environment change (e.g. "memory limit," "edit," "environment variable," "rebuild"). Only if **both** the LLM's risk label is `"low"` **and** the fix text doesn't imply any of those changes does the system auto-execute.
- This check was added after discovering, through testing, that the LLM sometimes labeled a fix as "low risk" even when the fix itself required a memory-limit change — a real, observed failure mode, not a hypothetical one.
- Auto-execution is scoped to **only ever call `restart()`** — never a rebuild, config edit, or environment change — so even a bug in the decision logic has a bounded, non-destructive worst case.
- Verified through testing: **0 risky actions were ever auto-executed** across all tested failure scenarios.

---

## Features

- Live container dashboard — status, CPU%, memory, with 5-second polling
- Manual container controls (start/stop/restart) from the UI
- Conversational chat interface for natural-language incident queries ("why is my service down?", "fix demo-oom")
- LLM-based root-cause diagnosis with confidence scoring and risk classification
- Risk-aware, safety-bounded auto-execution of low-risk fixes
- Honest abstention — recognizes when log evidence is insufficient and reports low confidence instead of fabricating a cause
- Persistent incident audit trail (PostgreSQL) with a browsable, expandable history table
- Redis-cached stats to reduce load under frequent polling
- Live CPU/RAM charts per container (Recharts)
- Dashboard buttons to trigger/reset 4 built-in failure scenarios for demo purposes

---

## What This Project Can Do

- Diagnose 4 distinct, verified failure categories: bad configuration, out-of-memory kills, missing environment variables, and port conflicts
- Distinguish between questions ("why is it down?") and action requests ("fix it"), only considering auto-execution for the latter
- Resolve which container a conversational query refers to, by name or by falling back to the first detected unhealthy container
- Maintain a full, queryable history of every diagnosis and action taken

## Known Limitations

- **Container name resolution is exact-ish, not fuzzy.** A precise reference (`"demo-oom"`) resolves correctly; a colloquial one (`"the oom one"` or `"port a"` instead of `"demo-port-a"`) may silently fall back to reporting on a different, unrelated unhealthy container.
- **Only one incident is diagnosed at a time.** A generic query like "why is my service down?" resolves to only the first unhealthy container found in Docker's own listing order; there's no aggregation or prioritization across multiple simultaneous incidents.
- **Evidence-free failures can't be fully diagnosed.** For failures whose cause lives outside the failed container's own log stream (e.g. a port-binding conflict, where the container never starts and produces no logs), the system correctly recognizes the evidence gap and returns a low-confidence "insufficient data" response rather than guessing — honest, but not a real root-cause diagnosis for that specific failure class.
- **Diagnosis latency is ~28 seconds on average**, a direct consequence of running an 8B-parameter model on CPU-only hardware to keep inference cost at zero.
- **LLM output has measurable non-determinism.** Identical inputs can occasionally produce different risk classifications between runs, even at temperature 0. Mitigated with an independent code-level safety check, not fully eliminated.
- **`/scenarios/*` endpoints are demo-only and not production-safe** — they execute a fixed, whitelisted set of local shell scripts via subprocess with no authentication, purely to enable triggering failure scenarios from the dashboard. Should be removed before any real deployment.
- **No authentication anywhere in the current build.** All endpoints are open — acceptable for a local/demo portfolio project, not for production.

---

## Setup Instructions

### Prerequisites

- Docker Desktop (or Docker Engine on Linux), installed and running
- Python 3.11+
- Node.js 20+
- [Ollama](https://ollama.com/download)

> **Important**: this project requires direct access to the Docker daemon socket. It must run on a machine (local or VM) where Docker is installed natively — it will not work if deployed to a typical PaaS platform such as Vercel, Railway, or Azure App Service.

### 1. Clone the repo

```bash
git clone https://github.com/ReenuLK/aiops-agent.git
cd aiops-agent
```

### 2. Pull the LLM model

```bash
ollama pull llama3.1:8b
```

### 3. Configure local services

Create a `.env` file in the repository root. Compose reads the PostgreSQL values from this file, and the backend loads the database and Redis URLs from it:

```
POSTGRES_USER=aiops
POSTGRES_PASSWORD=aiops_dev_password
POSTGRES_DB=aiops_db
DATABASE_URL=postgresql://aiops:aiops_dev_password@localhost:5432/aiops_db
REDIS_URL=redis://localhost:6379/0
```

Start Postgres and Redis:

```bash
docker compose up -d
```

### 4. Backend setup

```bash
python -m venv backend/venv
source backend/venv/bin/activate       # Linux/macOS
# Windows PowerShell: .\backend\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Run it:

```bash
uvicorn main:app --reload --port 8000
```

Confirm at `http://localhost:8000/docs`.

### 5. Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```
VITE_API_BASE_URL=http://localhost:8000
```

Run it:

```bash
npm run dev
```

Visit `http://localhost:5173`.

### 6. Try it out

```bash
bash backend/scenarios/memory_leak/trigger.sh
```

Then in the dashboard's chat panel, ask: _"why is my service down?"_

### 7. Reset between tests

```bash
bash backend/scenarios/reset_all.sh
```

---

## Testing Methodology & Results

Four reproducible failure scenarios are included under `backend/scenarios/`, each simulating a distinct real-world root cause with a known, verified ground truth:

| Scenario        | Simulated cause                            | Verified failure signature                  |
| --------------- | ------------------------------------------ | ------------------------------------------- |
| `bad_config`    | Malformed nginx config (missing semicolon) | Crash loop, nginx parse error in logs       |
| `memory_leak`   | Unbounded memory growth + low memory cap   | OOM kill, exit 137, `OOMKilled: true`       |
| `port_conflict` | Two containers bound to the same host port | Second container fails to start, empty logs |
| `missing_env`   | Required environment variable not set      | `KeyError` crash on startup                 |

Each scenario was triggered and diagnosed multiple times, via both direct terminal script execution and the dashboard's UI trigger buttons (to confirm both paths produce consistent results), across several rounds of testing on the deployed instance. Every diagnosis attempt was logged (scenario, trigger method, diagnosis given, correctness, risk level, confidence) and compared against the known, independently-verified ground truth for that scenario.

Notable bugs found and fixed during this process: a dict-key collision causing false 404s, risk-level miscalibration relative to the actual proposed fix, hallucination on evidence-free inputs, a keyword-collision misclassifying intent based on a container's name, and a Windows/Linux line-ending issue that broke deployment.

---

## Metrics

| Metric                    | Value       | How measured                                                                                                                                                                                                  |
| ------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Diagnosis accuracy        | 100% (9/9)  | Manual comparison of each diagnosis against the known injected fault, across all 4 scenarios and both trigger methods                                                                                         |
| Unsafe auto-executions    | 0           | Reviewed every test run's action log; no config/resource/env-changing fix was ever auto-executed without approval                                                                                             |
| Incidents logged          | 40+         | Direct count via `GET /history`                                                                                                                                                                               |
| Average diagnosis latency | ~28 seconds | Measured via `time curl` from inside the deployment VM (isolating server-side processing from network latency), confirmed as steady-state (not cold-start-inflated) by testing consecutive warmed-up requests |

---

## Deployment Notes

Deployed on a self-managed Azure VM (Ubuntu 22.04, Standard_B2ms — 2 vCPU / 8GB RAM) rather than a managed PaaS platform, for the architectural reasons described above. All long-running processes (backend, frontend, Ollama) run in separate `tmux` sessions so they survive SSH disconnects. Postgres and Redis run via the included `docker-compose.yml`.

The Azure instance is stopped/deallocated between active testing or demo periods to control cost, which is why the live URL above is not permanently available — see the demo video for a full working walkthrough instead.

---

## Future Work

- Fuzzy/LLM-assisted container name resolution instead of exact substring matching
- Aggregation and prioritization across multiple simultaneous incidents
- Capturing Docker daemon-level events (not just container logs) to properly diagnose evidence-free failures like port conflicts
- Kubernetes support (swap the Docker Agent for a Kubernetes-client equivalent operating on Pods)
- Authentication, rate limiting, and removal of the demo-only scenario-trigger endpoints before any real deployment
- A rollback/undo mechanism if auto-execution scope is ever expanded beyond plain restarts
- Larger-scale accuracy evaluation against real-world (not self-authored) failure logs
