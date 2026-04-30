#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

const REQUIRED = {
  NEXT_PUBLIC_SUPABASE_URL: "Supabase connection (auth, all data)",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "Supabase client access",
  SUPABASE_SERVICE_ROLE_KEY: "Server-side DB writes, webhooks, drain job",
  REVGUARD_ENCRYPTION_KEY: "Encrypts customer Stripe keys at rest",
  NEXT_PUBLIC_APP_URL: "Links in dunning emails and alerts",
};

const RECOMMENDED = {
  STRIPE_SECRET_KEY: "Stripe overview, recovery, dunning, retry",
  STRIPE_WEBHOOK_SECRET: "Verifies inbound Stripe webhooks",
  RESEND_API_KEY: "Sends alert and dunning emails",
  BETTERSTACK_WEBHOOK_SECRET: "Verifies BetterStack incident webhooks",
  CRON_SECRET: "Authorizes scheduled drain-emails job",
  SENTRY_DSN: "Server-side error reporting",
  LOG_WEBHOOK_URL: "Log forwarding",
};

const OPTIONAL = {
  OPENAI_API_KEY: "AI assistant feature",
  RELEASE_VERSION: "Sentry release tagging",
};

function loadEnv() {
  const path = resolve(process.cwd(), ".env");
  const env = { ...process.env };
  if (!existsSync(path)) return env;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!env[key]) env[key] = value;
  }
  return env;
}

function check(group, label, color) {
  const set = [];
  const missing = [];
  for (const [key, desc] of Object.entries(group)) {
    const value = env[key];
    if (value && value.length > 0) {
      set.push(key);
    } else {
      missing.push({ key, desc });
    }
  }
  console.log(`\n${BOLD}${color}${label}${RESET}`);
  if (set.length) {
    for (const k of set) console.log(`  ${GREEN}OK${RESET}      ${k}`);
  }
  if (missing.length) {
    for (const { key, desc } of missing) {
      console.log(`  ${color}MISSING${RESET} ${key}  ${RESET}${desc}`);
    }
  }
  return missing.length;
}

const env = loadEnv();

console.log(`${BOLD}${BLUE}Deploy readiness check${RESET}`);
console.log(`Reading from .env and process environment.`);

const missingRequired = check(REQUIRED, "Required", RED);
const missingRecommended = check(RECOMMENDED, "Recommended", YELLOW);
check(OPTIONAL, "Optional", BLUE);

console.log(`\n${BOLD}Build${RESET}`);
const result = spawnSync("npm", ["run", "build"], {
  stdio: "inherit",
  env: { ...process.env, ...env },
});

console.log(`\n${BOLD}Summary${RESET}`);
if (missingRequired > 0) {
  console.log(`  ${RED}${missingRequired} required env var(s) missing${RESET}`);
}
if (missingRecommended > 0) {
  console.log(`  ${YELLOW}${missingRecommended} recommended env var(s) missing (some features will be disabled)${RESET}`);
}
if (result.status !== 0) {
  console.log(`  ${RED}Build failed${RESET}`);
  process.exit(1);
}
if (missingRequired > 0) {
  console.log(`  ${RED}Not safe to deploy${RESET}`);
  process.exit(1);
}
console.log(`  ${GREEN}Ready to deploy${RESET}`);
console.log(`\nNext: click Deploy in the Bolt toolbar, or push to your main branch.`);
