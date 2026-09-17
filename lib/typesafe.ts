import { choice, TypeSafeClient } from "@typesafeai/sdk";

export interface MigrationSafetyAssessment {
  verdict: "SAFE" | "DANGER";
  confidence: number;
  probabilities: {
    SAFE: number;
    DANGER: number;
  };
  latencyMs: number;
  model: string;
}

let cachedClient: TypeSafeClient | null = null;

export function getTypeSafeClient(): TypeSafeClient {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing TYPESAFE_API_KEY environment variable. Please configure it in .env"
    );
  }

  if (!cachedClient) {
    cachedClient = new TypeSafeClient({ apiKey });
  }

  return cachedClient;
}

/**
 * Evaluates a SQL migration script using TypeSafe AI's Jev System One model.
 *
 * Jev delivers sub-second, typed, deterministic evaluations without token-by-token hallucinations,
 * making it ideal for gating automated CI/CD pipelines.
 */
export async function evaluateMigrationSafety(
  sqlCommand: string
): Promise<MigrationSafetyAssessment> {
  const client = getTypeSafeClient();
  const model = process.env.TYPESAFE_MODEL || "jev-latest";

  const startTime = performance.now();

  const response = await client.systemOne({
    model,
    state: {
      sqlCommand: sqlCommand.trim(),
    },
    questions: {
      safety: choice(
        "Act as an authoritative database migration safety reviewer. Evaluate whether the provided SQL command is SAFE or DANGER for automated execution in a production database environment.",
        {
          SAFE: "Non-destructive or additive database operations such as CREATE TABLE, CREATE INDEX, ALTER TABLE ADD COLUMN (with NULL or default value), or safe schema additions that do not destroy existing data.",
          DANGER: "Destructive operations that cause irreversible data loss, service outages, or table drops such as DROP TABLE, DROP COLUMN, TRUNCATE, ALTER TABLE DROP, or mass DELETE without where clauses.",
        }
      ),
    },
  });

  const latencyMs = Number((performance.now() - startTime).toFixed(2));
  const answer = response.answers.safety;

  return {
    verdict: answer.choice as "SAFE" | "DANGER",
    confidence: answer.confidence,
    probabilities: answer.probabilities as { SAFE: number; DANGER: number },
    latencyMs,
    model: response.model || model,
  };
}
