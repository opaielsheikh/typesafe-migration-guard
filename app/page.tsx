"use client";

import { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Terminal,
  Database,
  Server,
  Play,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Copy,
  Check,
} from "lucide-react";

interface InspectionResult {
  status: "ALLOWED" | "BLOCKED" | "ALLOWED_WITH_WARNING";
  verdict: "SAFE" | "DANGER";
  environment: string;
  blocked: boolean;
  latencyMs: number;
  model: string;
  confidence: number;
  probabilities: {
    SAFE: number;
    DANGER: number;
  };
  message: string;
  sqlCommand: string;
  timestamp: string;
}

const PRESETS = {
  safe: `-- Safe Migration: Additive Schema Creation
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users"("role");`,

  danger: `-- Destructive Migration: Dropping Production Tables
DROP TABLE IF EXISTS "users" CASCADE;`,

  truncate: `-- Destructive Migration: Data Wipe
TRUNCATE TABLE "users" RESTART IDENTITY CASCADE;`,

  alterDrop: `-- Destructive Migration: Dropping sensitive column
ALTER TABLE "users" DROP COLUMN "email";`,
};

export default function Home() {
  const [environment, setEnvironment] = useState<"production" | "staging" | "development">("production");
  const [sqlCommand, setSqlCommand] = useState(PRESETS.safe);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InspectionResult | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleInspect() {
    setLoading(true);
    setResult(null);
    setHttpStatus(null);

    try {
      const response = await fetch("/api/migration-guard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sqlCommand,
          environment,
        }),
      });

      const data = await response.json();
      setHttpStatus(response.status);
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleCopyCurl() {
    const curlCommand = `curl -i -X POST http://localhost:3000/api/migration-guard \\
  -H "Content-Type: application/json" \\
  -d '{
    "environment": "${environment}",
    "sqlCommand": "${sqlCommand.replace(/"/g, '\\"').replace(/\n/g, " ")}"
  }'`;
    navigator.clipboard.writeText(curlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Header Bar */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          paddingBottom: "1.5rem",
          marginBottom: "2.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
          <div
            style={{
              padding: "0.625rem",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Database size={24} color="#ffffff" />
          </div>
          <div>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                letterSpacing: "-0.025em",
                background: "linear-gradient(to right, #ffffff, #94a3b8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Typesafe Migration Guard
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#94a3b8" }}>
              Automated DDL Gatekeeper powered by TypeSafe AI (Jev System One Model)
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span
            style={{
              fontSize: "0.75rem",
              padding: "0.35rem 0.75rem",
              borderRadius: "9999px",
              background: "rgba(56, 189, 248, 0.12)",
              color: "#38bdf8",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
            }}
          >
            <Zap size={14} /> Jev Model Active (~100-700ms)
          </span>
          <span
            style={{
              fontSize: "0.75rem",
              padding: "0.35rem 0.75rem",
              borderRadius: "9999px",
              background: "rgba(16, 185, 129, 0.12)",
              color: "#34d399",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
            }}
          >
            <Server size={14} /> Supabase PostgreSQL
          </span>
        </div>
      </header>

      {/* Main Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "2rem",
          marginBottom: "3rem",
        }}
      >
        {/* Left Column: SQL Editor & Controls */}
        <section
          className="glass-card"
          style={{
            borderRadius: "16px",
            padding: "1.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2
              style={{
                fontSize: "1.125rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "#f8fafc",
              }}
            >
              <Terminal size={18} color="#38bdf8" /> Migration Payload
            </h2>

            {/* Environment Toggle */}
            <div
              style={{
                display: "flex",
                background: "#0f172a",
                borderRadius: "8px",
                padding: "3px",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {(["production", "staging", "development"] as const).map((env) => (
                <button
                  key={env}
                  onClick={() => setEnvironment(env)}
                  style={{
                    padding: "0.3rem 0.75rem",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    textTransform: "capitalize",
                    transition: "all 0.2s",
                    background:
                      environment === env
                        ? env === "production"
                          ? "#dc2626"
                          : "#2563eb"
                        : "transparent",
                    color: environment === env ? "#ffffff" : "#94a3b8",
                  }}
                >
                  {env}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <span
              style={{
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#64748b",
                fontWeight: 600,
                display: "block",
                marginBottom: "0.5rem",
              }}
            >
              Load Test Scenario:
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <button
                onClick={() => setSqlCommand(PRESETS.safe)}
                style={{
                  background: "rgba(16, 185, 129, 0.12)",
                  color: "#34d399",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  padding: "0.4rem 0.8rem",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <CheckCircle2 size={14} /> Safe (CREATE TABLE)
              </button>
              <button
                onClick={() => setSqlCommand(PRESETS.danger)}
                style={{
                  background: "rgba(239, 68, 68, 0.12)",
                  color: "#f87171",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  padding: "0.4rem 0.8rem",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <Flame size={14} /> Destructive (DROP TABLE)
              </button>
              <button
                onClick={() => setSqlCommand(PRESETS.truncate)}
                style={{
                  background: "rgba(245, 158, 11, 0.12)",
                  color: "#fbbf24",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  padding: "0.4rem 0.8rem",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                TRUNCATE TABLE
              </button>
              <button
                onClick={() => setSqlCommand(PRESETS.alterDrop)}
                style={{
                  background: "rgba(245, 158, 11, 0.12)",
                  color: "#fbbf24",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  padding: "0.4rem 0.8rem",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                DROP COLUMN
              </button>
            </div>
          </div>

          {/* SQL Code Textarea */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
              SQL Migration Statements (DDL):
            </label>
            <textarea
              value={sqlCommand}
              onChange={(e) => setSqlCommand(e.target.value)}
              rows={9}
              style={{
                width: "100%",
                background: "#090d16",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "10px",
                color: "#e2e8f0",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: "0.875rem",
                padding: "0.875rem",
                resize: "vertical",
                lineHeight: "1.5",
                outline: "none",
              }}
            />
          </div>

          {/* Action Bar */}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={handleInspect}
              disabled={loading}
              style={{
                flex: 1,
                background: loading
                  ? "#334155"
                  : "linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "0.75rem 1.25rem",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)",
                transition: "all 0.2s",
              }}
            >
              {loading ? (
                <>Evaluating with Jev Model...</>
              ) : (
                <>
                  <Play size={16} /> Intercept & Inspect Migration
                </>
              )}
            </button>

            <button
              onClick={handleCopyCurl}
              title="Copy cURL command"
              style={{
                background: "#1e293b",
                color: "#cbd5e1",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                padding: "0.75rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {copied ? <Check size={18} color="#34d399" /> : <Copy size={18} />}
            </button>
          </div>
        </section>

        {/* Right Column: Live Safety Assessment */}
        <section
          className="glass-card"
          style={{
            borderRadius: "16px",
            padding: "1.75rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: result ? "flex-start" : "center",
            alignItems: result ? "stretch" : "center",
            minHeight: "420px",
            textAlign: result ? "left" : "center",
            position: "relative",
          }}
        >
          {!result && !loading && (
            <div style={{ color: "#64748b", maxWidth: "320px" }}>
              <ShieldAlert size={48} style={{ margin: "0 auto 1rem", opacity: 0.4 }} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#94a3b8", marginBottom: "0.5rem" }}>
                Awaiting Inspection
              </h3>
              <p style={{ fontSize: "0.875rem" }}>
                Click &ldquo;Intercept & Inspect Migration&rdquo; to test how the Guardian evaluates your DDL
                against production policy.
              </p>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  border: "3px solid rgba(56, 189, 248, 0.2)",
                  borderTopColor: "#38bdf8",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 1rem",
                }}
              />
              <p style={{ color: "#38bdf8", fontWeight: 500 }}>
                Querying TypeSafe AI System One (Jev)...
              </p>
              <p style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.25rem" }}>
                Parallel classification without token generative overhead
              </p>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {result && !loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Verdict Header Badge */}
              <div
                style={{
                  padding: "1.25rem",
                  borderRadius: "12px",
                  background:
                    result.status === "BLOCKED"
                      ? "rgba(220, 38, 38, 0.15)"
                      : result.status === "ALLOWED_WITH_WARNING"
                      ? "rgba(245, 158, 11, 0.15)"
                      : "rgba(16, 185, 129, 0.15)",
                  border:
                    result.status === "BLOCKED"
                      ? "1px solid rgba(239, 68, 68, 0.4)"
                      : result.status === "ALLOWED_WITH_WARNING"
                      ? "1px solid rgba(245, 158, 11, 0.4)"
                      : "1px solid rgba(16, 185, 129, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  {result.status === "BLOCKED" ? (
                    <ShieldAlert size={32} color="#f87171" />
                  ) : result.status === "ALLOWED_WITH_WARNING" ? (
                    <AlertTriangle size={32} color="#fbbf24" />
                  ) : (
                    <ShieldCheck size={32} color="#34d399" />
                  )}

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span
                        style={{
                          fontSize: "1.25rem",
                          fontWeight: 800,
                          color:
                            result.status === "BLOCKED"
                              ? "#f87171"
                              : result.status === "ALLOWED_WITH_WARNING"
                              ? "#fbbf24"
                              : "#34d399",
                        }}
                      >
                        {result.status === "BLOCKED"
                          ? "HTTP 403 BLOCKED"
                          : result.status === "ALLOWED_WITH_WARNING"
                          ? "HTTP 200 ALLOWED WITH WARNING"
                          : "HTTP 200 ALLOWED"}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#cbd5e1", marginTop: "0.25rem" }}>
                      Verdict: <strong>{result.verdict}</strong> in{" "}
                      <span style={{ textTransform: "uppercase" }}>{result.environment}</span>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "1.2rem",
                      fontWeight: 700,
                      color: "#38bdf8",
                    }}
                  >
                    {result.latencyMs} ms
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>System One Latency</div>
                </div>
              </div>

              {/* Message Details */}
              <div
                style={{
                  background: "#090d16",
                  padding: "1rem",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "block",
                    marginBottom: "0.25rem",
                  }}
                >
                  Guardian Policy Assessment:
                </span>
                <p style={{ fontSize: "0.875rem", color: "#e2e8f0", lineHeight: "1.4" }}>
                  {result.message}
                </p>
              </div>

              {/* Telemetry Metrics */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    background: "#0f172a",
                    padding: "0.875rem",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Model</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#f1f5f9" }}>
                    {result.model}
                  </div>
                </div>

                <div
                  style={{
                    background: "#0f172a",
                    padding: "0.875rem",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Confidence</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#34d399" }}>
                    {(result.confidence * 100).toFixed(0)}%
                  </div>
                </div>

                <div
                  style={{
                    background: "#0f172a",
                    padding: "0.875rem",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Probability</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#38bdf8" }}>
                    DANGER: {(result.probabilities.DANGER * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Raw JSON Accordion */}
              <div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#64748b",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: "0.35rem",
                  }}
                >
                  Audit Payload (JSON):
                </span>
                <pre
                  style={{
                    background: "#090d16",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    color: "#94a3b8",
                    overflowX: "auto",
                    maxHeight: "130px",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Enterprise Architecture Feature Grid */}
      <section
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingTop: "2.5rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            marginBottom: "1.5rem",
            color: "#f1f5f9",
          }}
        >
          Production Workflows, Not Toy Demos
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "1.5rem",
          }}
        >
          <div
            className="glass-card"
            style={{ borderRadius: "12px", padding: "1.5rem" }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "rgba(56, 189, 248, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <Zap size={20} color="#38bdf8" />
            </div>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#f8fafc", marginBottom: "0.5rem" }}>
              System One Jev Engine
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: "1.5" }}>
              Unlike conversational LLMs that waste seconds streaming conversational tokens and hallucinatory prose,
              Jev acts as a machine-native decision classifier returning typed results with calibrated probabilities
              in under 500ms.
            </p>
          </div>

          <div
            className="glass-card"
            style={{ borderRadius: "12px", padding: "1.5rem" }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "rgba(244, 63, 94, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <ShieldAlert size={20} color="#f43f5e" />
            </div>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#f8fafc", marginBottom: "0.5rem" }}>
              Automated 403 CI/CD Gate
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: "1.5" }}>
              Directly integrates into your GitHub Actions workflow or deployment runners. A destructive
              DROP TABLE migration in production triggers an automatic HTTP 403, immediately halting deployment
              before Prisma touches your database.
            </p>
          </div>

          <div
            className="glass-card"
            style={{ borderRadius: "12px", padding: "1.5rem" }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "rgba(16, 185, 129, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <Database size={20} color="#10b981" />
            </div>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#f8fafc", marginBottom: "0.5rem" }}>
              Supabase PostgreSQL Hardened
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: "1.5" }}>
              Configured with dual connection strings: pooled connection via Supavisor/PgBouncer for high-throughput
              app queries, and direct TCP connection for safe, verified DDL migrations.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
