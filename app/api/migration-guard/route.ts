import { NextRequest, NextResponse } from "next/server";
import { evaluateMigrationSafety } from "@/lib/typesafe";

export interface MigrationGuardRequest {
  sqlCommand: string;
  environment: string;
  migrationName?: string;
  triggeredBy?: string;
}

export interface MigrationGuardResponse {
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

/**
 * POST /api/migration-guard
 *
 * Automated safety reviewer intercepting database migrations.
 * Uses TypeSafe AI SDK (Jev model) to classify operations and block destructive DDL
 * with HTTP 403 when environment is 'production'.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as MigrationGuardRequest;
    const { sqlCommand, environment } = body;

    // Validate request payload
    if (!sqlCommand || typeof sqlCommand !== "string" || !sqlCommand.trim()) {
      return NextResponse.json(
        {
          error: "Invalid payload: 'sqlCommand' is required and must be a non-empty string.",
        },
        { status: 400 }
      );
    }

    if (!environment || typeof environment !== "string" || !environment.trim()) {
      return NextResponse.json(
        {
          error: "Invalid payload: 'environment' is required (e.g., 'production', 'staging', 'development').",
        },
        { status: 400 }
      );
    }

    const normalizedEnv = environment.trim().toLowerCase();
    const isProduction = normalizedEnv === "production";

    // Evaluate migration safety using the TypeSafe Jev model
    const assessment = await evaluateMigrationSafety(sqlCommand);
    const { verdict, latencyMs, confidence, probabilities, model } = assessment;

    const timestamp = new Date().toISOString();

    // Guard Logic: Block with HTTP 403 if destructive in production
    if (isProduction && verdict === "DANGER") {
      const responseBody: MigrationGuardResponse = {
        status: "BLOCKED",
        verdict: "DANGER",
        environment: normalizedEnv,
        blocked: true,
        latencyMs,
        model,
        confidence,
        probabilities,
        message: "CRITICAL: Destructive migration blocked by TypeSafe Migration Guard in production environment.",
        sqlCommand: sqlCommand.trim(),
        timestamp,
      };

      return NextResponse.json(responseBody, {
        status: 403,
        headers: {
          "X-Migration-Verdict": "DANGER",
          "X-Migration-Status": "BLOCKED",
          "X-Migration-Latency-Ms": latencyMs.toString(),
        },
      });
    }

    // Allow safe operations (or non-production warnings)
    const isDestructiveNonProd = !isProduction && verdict === "DANGER";
    const status: "ALLOWED" | "ALLOWED_WITH_WARNING" = isDestructiveNonProd
      ? "ALLOWED_WITH_WARNING"
      : "ALLOWED";

    const message = isDestructiveNonProd
      ? `WARNING: Destructive operation detected in non-production (${normalizedEnv}) environment. Allowed per deployment policy.`
      : `SUCCESS: Migration verified safe by TypeSafe Migration Guard for ${normalizedEnv} execution.`;

    const responseBody: MigrationGuardResponse = {
      status,
      verdict,
      environment: normalizedEnv,
      blocked: false,
      latencyMs,
      model,
      confidence,
      probabilities,
      message,
      sqlCommand: sqlCommand.trim(),
      timestamp,
    };

    return NextResponse.json(responseBody, {
      status: 200,
      headers: {
        "X-Migration-Verdict": verdict,
        "X-Migration-Status": status,
        "X-Migration-Latency-Ms": latencyMs.toString(),
      },
    });
  } catch (error: unknown) {
    console.error("[MigrationGuard] Error evaluating migration safety:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error during migration evaluation";

    return NextResponse.json(
      {
        error: errorMessage,
        status: "ERROR",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/migration-guard
 *
 * Health check & status endpoint for pipeline monitoring.
 */
export async function GET() {
  return NextResponse.json({
    service: "Typesafe Migration Guard",
    status: "HEALTHY",
    guardianModel: process.env.TYPESAFE_MODEL || "jev-latest",
    engine: "TypeSafe AI System One",
    activeRules: [
      "Reject DROP TABLE, DROP COLUMN, TRUNCATE in production (HTTP 403)",
      "Allow CREATE TABLE, ADD COLUMN, CREATE INDEX (HTTP 200)",
      "Measure & enforce sub-second CI evaluation latency",
    ],
    timestamp: new Date().toISOString(),
  });
}
