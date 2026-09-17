#!/usr/bin/env tsx
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const ENVIRONMENT = (process.env.ENVIRONMENT || process.env.NODE_ENV || "production").toLowerCase();
const API_URL = process.env.MIGRATION_GUARD_URL || "http://localhost:3005/api/migration-guard";
const TARGET_ARG = process.argv[2];
const MIGRATIONS_DIR = TARGET_ARG
  ? path.resolve(process.cwd(), TARGET_ARG)
  : path.join(process.cwd(), "prisma", "migrations");

interface GuardResponse {
  status: "ALLOWED" | "BLOCKED" | "ALLOWED_WITH_WARNING";
  verdict: "SAFE" | "DANGER";
  environment: string;
  blocked: boolean;
  latencyMs: number;
  model: string;
  confidence: number;
  message: string;
}

async function findSqlMigrationFiles(dirOrFile: string): Promise<string[]> {
  const results: string[] = [];
  if (!fs.existsSync(dirOrFile)) return results;

  const stat = fs.statSync(dirOrFile);
  if (stat.isFile()) {
    if (dirOrFile.endsWith(".sql")) {
      results.push(dirOrFile);
    }
    return results;
  }

  const entries = fs.readdirSync(dirOrFile, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirOrFile, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await findSqlMigrationFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".sql")) {
      results.push(fullPath);
    }
  }
  return results;
}

async function verifyMigration(filePath: string): Promise<boolean> {
  const relativePath = path.relative(process.cwd(), filePath);
  const sqlContent = fs.readFileSync(filePath, "utf-8").trim();

  console.log(`\n🔍 [Guardian] Inspecting migration: ${relativePath}`);
  console.log(`   Environment: ${ENVIRONMENT.toUpperCase()}`);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sqlCommand: sqlContent,
        environment: ENVIRONMENT,
        migrationName: path.basename(path.dirname(filePath)),
      }),
    });

    const data = (await response.json()) as GuardResponse;

    if (response.status === 403 || data.blocked) {
      console.error(
        `❌ [BLOCKED] Migration Guard intercepted destructive operation! (HTTP 403)`
      );
      console.error(`   Verdict: ${data.verdict}`);
      console.error(`   Confidence: ${(data.confidence * 100).toFixed(1)}%`);
      console.error(`   Latency: ${data.latencyMs}ms (Model: ${data.model})`);
      console.error(`   Reason: ${data.message}\n`);
      return false;
    }

    if (response.status === 200) {
      console.log(`✅ [PASSED] Migration verified safe. (HTTP 200)`);
      console.log(`   Verdict: ${data.verdict}`);
      console.log(`   Confidence: ${(data.confidence * 100).toFixed(1)}%`);
      console.log(`   Latency: ${data.latencyMs}ms (Model: ${data.model})\n`);
      return true;
    }

    console.error(`⚠️ [ERROR] Unexpected response status: ${response.status}`);
    return false;
  } catch (error) {
    console.error(`❌ [FAILED] Could not connect to Migration Guard at ${API_URL}`);
    console.error(error);
    return false;
  }
}

async function main() {
  console.log("=================================================");
  console.log("🛡️  TypeSafe Migration Guard - Pre-Flight CI Check");
  console.log("=================================================");

  const migrationFiles = await findSqlMigrationFiles(MIGRATIONS_DIR);

  if (migrationFiles.length === 0) {
    console.log("No SQL migration files discovered in prisma/migrations.");
    process.exit(0);
  }

  console.log(`Discovered ${migrationFiles.length} migration file(s) to verify.\n`);

  let allPassed = true;
  for (const file of migrationFiles) {
    const passed = await verifyMigration(file);
    if (!passed) {
      allPassed = false;
    }
  }

  if (!allPassed) {
    console.error(
      "🛑 Pipeline halted: Destructive migration detected for production deployment."
    );
    process.exit(1);
  }

  console.log("🚀 All migrations verified safe. Proceeding to deployment step.");
  process.exit(0);
}

main();
