// Observation record for the situation-declared checklists policy (project-meta registry, Brian 2026-10-06).
// One content-free line per disposition run, appended to the same daily log the writing gate uses, so a
// domain's pass/refuse history can be counted before it is promoted from Measured to Enforced.
import { appendFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export function observationRow({ artifact, situation, ok, problems, gate, now = new Date() }) {
  return {
    ts: now.toISOString().replace(/\.\d{3}Z$/, "+00:00"),
    domain: "representation",
    artifact: artifact ?? null,
    form: situation ?? null,
    ok: Boolean(ok),
    problems: problems ?? 0,
    gate: gate ?? "manual"
  };
}

export async function appendObservation(row, { dir = process.env.SITUATION_LOG_DIR ?? join(homedir(), "projects", "data", "logs", "situation-checklists") } = {}) {
  try {
    await mkdir(dir, { recursive: true });
    await appendFile(join(dir, `${row.ts.slice(0, 10)}.jsonl`), JSON.stringify(row) + "\n", "utf8");
    return true;
  } catch (error) {
    console.error(`(observation not recorded: ${error.message})`);
    return false;
  }
}
