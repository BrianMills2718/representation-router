import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  buildDispositionRecord,
  collectChecklist,
  parseJsonAfterBanner,
  validateAcceptance,
  validateDisposition
} from "./disposition.mjs";
import { appendObservation, observationRow } from "./observation.mjs";

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error(
    "Usage: node src/disposition-cli.mjs <recommendation.json> <disposition.json> [--acceptance acceptance.json] [--actor NAME] [--out-dir DIR] [--strict]"
  );
  console.error(
    "\ndisposition.json maps every checklist item the recommendation named to { \"status\": \"satisfied\" | \"na\" | \"skipped\" | \"failed\", \"why\": \"...\" }.\nThe log is written either way; the exit code is 3 when any item is failed, so a build gate can stop on it.\nRequired: each shows:<part> the use case's mustShow named (satisfied needs \"evidence\": where it is visible), selection (a choice-justified:<representation> line naming what you built, which may be an alternative), hard checks, playbook avoid items, approved references. Advisory (answer what you checked; the rest are counted in the log): soft and usability checks, rejected representations. --strict requires every item."
  );
  console.error(
    "acceptance.json (optional) lists human-approved references — e.g. the one mockup chosen from a set of sketches — as { \"references\": [{ id, kind, path, sha256, approvedBy, approvedAt }] }. Each becomes a required checklist item matches-approved-reference:<id>; a satisfied line must also carry \"evidence\" (what it was compared against)."
  );
  process.exit(1);
}

function valueAfter(flag, fallback) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
}

const readJson = async (path) => parseJsonAfterBanner(await readFile(resolve(path), "utf8"));

const [recommendation, dispositions] = await Promise.all([readJson(args[0]), readJson(args[1])]);
const actor = valueAfter("--actor", process.env.USER || "unknown");
// Default: append one JSON line per record to a daily file outside any repository (one file per
// day, not per event). Sessions in other projects used to write per-event files into this
// repository's working tree. --out-dir writes a single record file there instead, for evidence
// that is meant to be committed next to the work it judges.
const outDir = valueAfter("--out-dir", null);
const dailyLogDir = process.env.DISPOSITION_LOG_DIR ?? join(homedir(), "projects", "data", "logs", "disposition");
const acceptancePath = valueAfter("--acceptance", null);

let acceptance = null;
if (acceptancePath) {
  acceptance = await readJson(acceptancePath);
  const check = validateAcceptance(acceptance);
  if (!check.ok) {
    console.error(`Acceptance file invalid (${acceptancePath}):`);
    for (const error of check.errors) console.error(`  ${error}`);
    process.exit(1);
  }
  // The one thing this CLI does verify itself: the approved file on disk is the
  // bytes that were approved. Anything else about parity is a human claim.
  for (const ref of check.references) {
    const refPath = resolve(dirname(resolve(acceptancePath)), ref.path);
    let digest;
    try {
      digest = createHash("sha256").update(await readFile(refPath)).digest("hex");
    } catch (error) {
      console.error(`Approved reference ${ref.id} is unreadable at ${refPath}: ${error.message}`);
      process.exit(1);
    }
    if (digest.toLowerCase() !== ref.sha256.toLowerCase()) {
      console.error(
        `Approved reference ${ref.id} at ${refPath} does not match its recorded sha256.\n  recorded ${ref.sha256}\n  actual   ${digest}\nThe file changed after approval; re-approve it or restore the approved bytes.`
      );
      process.exit(1);
    }
  }
}

const checklist = collectChecklist(recommendation, acceptance);
const result = validateDisposition(checklist, dispositions, { strict: args.includes("--strict") });

if (!result.ok) {
  console.error(`Disposition incomplete: ${result.missing.length} missing, ${result.invalid.length} invalid.\n`);
  for (const { category, id } of result.missing) {
    console.error(`  MISSING  [${category}] ${id}`);
  }
  for (const { category, id, reason } of result.invalid) {
    if (reason) {
      console.error(`  INVALID  [${category}] ${id} — ${reason}`);
      continue;
    }
    const extra = category === "acceptance-reference" || category === "must-show" ? ' (and "evidence" when satisfied)' : "";
    console.error(`  INVALID  [${category}] ${id} — needs status: satisfied|na|skipped|failed and a non-empty "why"${extra}`);
  }
  console.error(
    "\nThis does not verify any claim is true — it only refuses a silent gap. Every required item needs an explicit line, even \"skipped: ran out of time.\""
  );
  await appendObservation(observationRow({
    artifact: recommendation?.viewSpec?.id ?? null,
    situation: recommendation?.primary?.representation ?? null,
    ok: false,
    problems: result.missing.length + result.invalid.length,
    gate: process.env.SITUATION_GATE
  }));
  process.exit(1);
}

if (result.coveredExtra.length) {
  console.error(`Note: disposition file names items the recommendation didn't ask for: ${result.coveredExtra.join(", ")}`);
}

const record = buildDispositionRecord({
  recommendationId: recommendation?.viewSpec?.id ?? recommendation?.primary?.representation ?? null,
  primaryPattern: recommendation?.primary?.representation ?? null,
  chosenRepresentation: result.chosenRepresentation,
  failed: result.failed,
  actor,
  dispositions,
  checklist,
  acceptance
});

let filePath;
if (outDir) {
  await mkdir(resolve(outDir), { recursive: true });
  const safeId = String(record.recommendationId ?? "unnamed").replace(/[^a-z0-9._-]+/gi, "-");
  filePath = resolve(outDir, `${safeId}--${record.recordedAt.replace(/[:.]/g, "-")}.json`);
  await writeFile(filePath, JSON.stringify(record, null, 2) + "\n", "utf8");
} else {
  await mkdir(dailyLogDir, { recursive: true });
  filePath = join(dailyLogDir, `${record.recordedAt.slice(0, 10)}.jsonl`);
  await appendFile(filePath, JSON.stringify({ ...record, cwd: process.cwd() }) + "\n", "utf8");
}

await appendObservation(observationRow({
  artifact: record.recommendationId,
  situation: record.primaryPattern,
  ok: result.failed.length === 0,
  problems: result.failed.length,
  gate: process.env.SITUATION_GATE
}));
const requiredCount = record.requiredCount;
console.log(`Disposition recorded: ${requiredCount} required items all answered; ${checklist.length - requiredCount - result.advisoryUnanswered.length} of ${checklist.length - requiredCount} advisory items answered.`);
if (result.advisoryUnanswered.length) {
  console.log(`Advisory items left unanswered (${result.advisoryUnanswered.length}), kept in the log: ${result.advisoryUnanswered.map(({ id }) => id).join(", ")}`);
}
const primary = recommendation?.primary?.representation;
if (result.chosenRepresentation && primary && result.chosenRepresentation !== primary) {
  console.log(`Built ${result.chosenRepresentation} instead of the router's ${primary}. The hard checks and playbook items came from ${primary}'s plan: mark any that do not fit what you built as na, with why.`);
}
console.log(`Log: ${filePath}`);
if (result.failed.length) {
  console.log(`\n${result.failed.length} item(s) recorded as failed:`);
  for (const { category, id } of result.failed) console.log(`  FAILED  [${category}] ${id}`);
  process.exitCode = 3;
}
