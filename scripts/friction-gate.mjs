#!/usr/bin/env node
/**
 * Friction gate: run before starting new router features (new representations, surfaces, or
 * catalog families). It fails while a complaint reported `threshold` or more times is still open
 * in docs/friction-ledger.json, and while skill ratings newer than the ledger's triagedThrough
 * have not been sorted into it. Sorting is an agent's reading-and-judging step, never text matching.
 *
 * Exit 0: clear. Exit 1: repeated complaints open. Exit 2: ratings not yet triaged (checked only when
 * nothing is open). Fixing an open entry and marking it fixed in the same change clears the gate.
 */
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export function evaluateLedger(ledger, ratings = []) {
  const threshold = ledger.threshold ?? 3;
  const blocking = ledger.entries.filter((entry) => entry.status === "open" && entry.reports.length >= threshold);
  const since = Date.parse(ledger.triagedThrough);
  const untriaged = ratings.filter((row) => (row.friction ?? "").trim() && Date.parse(row.ts) > since);
  return { threshold, blocking, untriaged, open: ledger.entries.filter((entry) => entry.status === "open").length, total: ledger.entries.length };
}

async function main() {
  const args = process.argv.slice(2);
  const valueAfter = (flag, fallback) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback);
  const ledgerPath = valueAfter("--ledger", new URL("../docs/friction-ledger.json", import.meta.url).pathname);
  const ratingsPath = valueAfter("--ratings", join(homedir(), ".claude", "skill-feedback", "representation-router.jsonl"));
  const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
  let ratings = [];
  try {
    ratings = (await readFile(ratingsPath, "utf8")).split("\n").filter(Boolean).flatMap((line) => {
      try { return [JSON.parse(line)]; } catch { return []; }
    });
  } catch {
    console.log(`Ratings file not found at ${ratingsPath}; checking the ledger only.`);
  }
  const result = evaluateLedger(ledger, ratings);
  console.log(`Friction ledger: ${result.total} entries, ${result.open} open, ${result.blocking.length} open with ${result.threshold}+ reports; ${result.untriaged.length} rating(s) newer than ${ledger.triagedThrough} not yet triaged.`);
  for (const entry of result.blocking) console.log(`  BLOCKING  ${entry.id} (${entry.reports.length} reports, last ${entry.reports.at(-1)}): ${entry.summary}`);
  for (const row of result.untriaged) console.log(`  UNTRIAGED ${row.ts}: ${(row.friction ?? "").slice(0, 160)}`);
  if (result.blocking.length) {
    console.log("\nFix these before adding new features, and mark each fixed in docs/friction-ledger.json in the same change. Exit 1.");
    process.exitCode = 1;
  } else if (result.untriaged.length) {
    console.log("\nSort the new ratings into docs/friction-ledger.json (add a report date to a matching entry or a new entry), then move triagedThrough. Exit 2.");
    process.exitCode = 2;
  } else {
    console.log("Clear. Exit 0.");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
