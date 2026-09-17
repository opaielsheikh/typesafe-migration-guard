# Typesafe Migration Guard 🛡️

[![CI Pipeline](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF.svg)](.github/workflows/migration-guard-ci.yml)
[![AI Engine](https://img.shields.io/badge/AI%20Engine-TypeSafe%20System%20One%20(Jev)-38BDF8.svg)](https://typesafe.ai)
[![ORM](https://img.shields.io/badge/ORM-Prisma-2D3748.svg)](https://www.prisma.io)
[![Database](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E.svg)](https://supabase.com)
[![Latency](https://img.shields.io/badge/Latency-Sub--second%20(~250ms)-10B981.svg)](#low-latency-benchmark)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **"Built for production workflows, not just toy demos."**

**Typesafe Migration Guard** is an automated, deterministic safety gatekeeper that intercepts database migrations in continuous integration (CI/CD) pipelines and production deployment runners. Powered by the **TypeSafe AI SDK** and its machine-native **Jev System One model**, it evaluates DDL statements in real-time, blocking destructive operations (such as `DROP TABLE`, `DROP COLUMN`, and unindexed truncation) with an HTTP `403 Forbidden` status code before any migration touches your live Supabase PostgreSQL database.

---

## The Problem: Why Traditional Tooling Fails in Production

1. **Static Regex / AST Linters**: Prone to false negatives and brittle syntax edge cases. A subtle nested statement, transaction block, or multi-statement migration can easily bypass naive regex pattern matchers.
2. **Generative LLMs (GPT-4, Claude, Gemini)**: Traditional conversational LLMs suffer from high latency (2,000ms – 6,000ms), non-deterministic conversational text generation, and token streaming overhead. Gating a fast CI pipeline with a slow conversational LLM introduces unacceptable friction and flaky parses.
3. **TypeSafe Jev (The System One Solution)**: Jev is a machine-native, structured-decision model trained with **RLCD (Reinforcement Learning for Calibrated Decisions)**. It executes single-pass parallel classifications, outputting strictly typed decisions (`SAFE` vs `DANGER`) with calibrated probabilities in **sub-second latency (~150–400ms)**.

---

## Architecture & Interception Flow

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer / Git Push
    participant CI as GitHub Actions Pipeline
    participant MG as Migration Guard API (/api/migration-guard)
    participant Jev as TypeSafe AI (Jev System One)
    participant Supa as Supabase PostgreSQL

    Dev->>CI: Push Migration commit
    CI->>CI: Build & Run Pre-Flight Migration Scan
    CI->>MG: POST /api/migration-guard (sqlCommand, env: "production")
    MG->>Jev: client.systemOne(choice: SAFE | DANGER)
    Note over Jev: Machine-native decision pass (~250ms)
    Jev-->>MG: { choice: "DANGER", confidence: 1.0, probabilities: { ... } }
    
    alt Destructive DDL Detected in Production
        MG-->>CI: HTTP 403 Forbidden [BLOCKED]
        Note over CI: Pipeline HALTED. Deployment Aborted. Alert Sent.
    else Safe DDL Verified
        MG-->>CI: HTTP 200 OK [ALLOWED]
        CI->>Supa: prisma migrate deploy
        Note over Supa: Migration executed safely.
    end
```

---

## Key Features

- ⚡ **Sub-Second Real-Time Interception**: Average evaluation latency of **~250ms**, ensuring that CI/CD pipelines remain blazing fast.
- 🚫 **Strict HTTP 403 Production Gate**: Any destructive DDL targeting a `production` environment immediately fails the HTTP request with status `403 Forbidden`, halting automated deployment scripts.
- 🎯 **Calibrated Probabilistic Confidence**: Jev returns mathematical confidence scores (e.g. `100%`) and probability distributions for audit trails.
- 🗄️ **Supabase PostgreSQL Ready**: Configured with dual connection strings (`DATABASE_URL` for pooled queries via Supavisor, `DIRECT_URL` for schema migrations).
- 🖥️ **Interactive Operations Dashboard**: Next.js App Router visual console to inspect migrations, preview verdicts, and test deployment scenarios with one click.
- 🔄 **AWS EC2 Zero-Downtime Deployment**: Production bash script utilizing PM2 cluster reload, automated pre-flight checks, and rollback hooks.

---

## Installation & Setup

### Prerequisites
- **Node.js**: `v20.x` or `v22.x`
- **TypeSafe AI API Key**
- **Supabase PostgreSQL Database** (or local Postgres instance)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-org/typesafe-migration-guard.git
cd typesafe-migration-guard
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your credentials in `.env`:
```env
# TypeSafe AI Credentials
TYPESAFE_API_KEY="your-typesafe-api-key"
TYPESAFE_MODEL="jev-latest"

# Supabase PostgreSQL Configuration
DIRECT_URL="postgresql://postgres.your-project-ref:your-password@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
DATABASE_URL="postgresql://postgres.your-project-ref:your-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Server Configuration
PORT=3005
MIGRATION_GUARD_URL="http://localhost:3005/api/migration-guard"
```

### 3. Generate Prisma Artifacts
```bash
npm run prisma:generate
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3005](http://localhost:3005) in your browser to access the Interactive Guardian Dashboard.

---

## API Reference: The Guardian Endpoint

### `POST /api/migration-guard`

Evaluates a SQL statement against environment policy.

#### Request Headers
```http
Content-Type: application/json
```

#### Request Payload
```json
{
  "sqlCommand": "DROP TABLE IF EXISTS users CASCADE;",
  "environment": "production"
}
```

#### Response: Destructive in Production (`HTTP 403 Forbidden`)
```json
{
  "status": "BLOCKED",
  "verdict": "DANGER",
  "environment": "production",
  "blocked": true,
  "latencyMs": 261.03,
  "model": "jev-1.13.0",
  "confidence": 1.0,
  "probabilities": {
    "SAFE": 0.0,
    "DANGER": 1.0
  },
  "message": "CRITICAL: Destructive migration blocked by TypeSafe Migration Guard in production environment.",
  "sqlCommand": "DROP TABLE IF EXISTS users CASCADE;",
  "timestamp": "2026-09-17T05:25:28.993Z"
}
```

#### Response: Safe in Production (`HTTP 200 OK`)
```json
{
  "status": "ALLOWED",
  "verdict": "SAFE",
  "environment": "production",
  "blocked": false,
  "latencyMs": 265.57,
  "model": "jev-1.13.0",
  "confidence": 1.0,
  "probabilities": {
    "SAFE": 1.0,
    "DANGER": 0.0
  },
  "message": "SUCCESS: Migration verified safe by TypeSafe Migration Guard for production execution.",
  "sqlCommand": "CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT UNIQUE);",
  "timestamp": "2026-09-17T05:25:25.257Z"
}
```

---

## CI/CD Pipeline Integration

A complete GitHub Actions workflow is included at [`.github/workflows/migration-guard-ci.yml`](.github/workflows/migration-guard-ci.yml).

### Workflow Mechanics:
1. Every Pull Request and commit targeting `main` runs the `migration-safety-gate` job.
2. The gate spins up the Next.js service and runs `npm run guard:check`.
3. If any migration returns `HTTP 403 (DANGER)`, the CI step immediately terminates with exit code `1`.
4. The deployment step (`deploy-production`) is conditioned on `needs: migration-safety-gate`, making it impossible to deploy destructive DDL.

Run the CI migration verification locally anytime:
```bash
# Check all pending migrations in prisma/migrations
npm run guard:check

# Or check a specific migration
npm run guard:check prisma/migrations/20260917000001_create_users_table
```

---

## AWS EC2 PM2 Deployment Guide

The deployment script [`scripts/deploy-ec2.sh`](scripts/deploy-ec2.sh) implements zero-downtime cluster reloads with built-in safety rollback:

```bash
# Make script executable
chmod +x ./scripts/deploy-ec2.sh

# Run dry-run simulation mode (safe for testing)
./scripts/deploy-ec2.sh --simulate

# Run live production deployment
ENVIRONMENT=production ./scripts/deploy-ec2.sh
```

### Execution Lifecycle:
1. **Pre-flight Check**: Executes `npm run guard:check`. If destructive DDL is detected, aborts immediately before any database or file system changes occur.
2. **Git Sync & Dependency Update**: Pulls latest verified commit from `origin/main` and runs `npm ci --only=production`.
3. **Prisma Migrate**: Executes `npx prisma migrate deploy` only after Jev clearance.
4. **PM2 Cluster Reload**: Executes `pm2 reload typesafe-migration-guard --update-env` for seamless zero-downtime handover.
5. **Health Check & Auto-Rollback**: Polls `/api/migration-guard`. If unhealthy, rolls back to previous commit and reloads PM2.

---

## Mock Migration Test Suite

Included in [`prisma/migrations`](prisma/migrations):
- **`20260917000001_create_users_table/migration.sql`**: Additive schema definition (`CREATE TABLE "users"`). Verified: **SAFE (HTTP 200)**.
- **`20260917000002_drop_users_table/migration.sql`**: Destructive schema deprecation (`DROP TABLE "users" CASCADE`). Verified: **DANGER (HTTP 403)**.

---

## Low-Latency Benchmark

| Assessment Engine | Latency | Deterministic Schema | Hallucination Risk | CI-Gating Suitability |
|---|---|---|---|---|
| **TypeSafe Jev (System One)** | **~240ms – 300ms** | **Strict Typed Enum** | **0%** | **Production-Ready** |
| Regex Linters | ~10ms | Boolean | High (Bypassable) | Unreliable |
| Conversational LLMs (GPT-4 / Claude) | ~3,500ms – 6,000ms | Free-form Text / JSON | High | Flaky / Slows CI |

---

## Summary of Active Protection Against Human Error

| Human Mistake / Scenarios | Without Migration Guard | With Typesafe Migration Guard |
|---|---|---|
| Developer runs `prisma migrate dev` with accidental column drop | Deployed to production; customer records lost | Intercepted in CI; blocked with HTTP 403 |
| Merge conflict resolution includes duplicate or cascading `DROP` | Database lock / table deletion during deployment | Intercepted in pre-flight runner; pipeline halted |
| Staging test migration mistakenly pushed to production branch | Applied directly to production database | Environment check enforces strict 403 blocking |

---

## License

MIT © Typesafe Migration Guard Contributors.
