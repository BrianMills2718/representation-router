import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  buildDispositionRecord,
  collectChecklist,
  validateAcceptance,
  validateDisposition
} from "./disposition.mjs";
import { appendObservation, observationRow } from "./observation.mjs";

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error(
    "Usage: node src/disposition-cli.mjs <recommendation.json> <disposition.json> [--acceptance acceptance.json] [--actor NAME] [--out-dir disposition-logs]"
  );
  console.error(
    "\ndisposition.json maps every checklist item the recommendation named to { \"status\": \"satisfied\" | \"na\" | \"skipped\", \"why\": \"...\" }."
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

const readJson = async (path) => JSON.parse(await readFile(resolve(path), "utf8"));

const [recommendation, dispositions] = await Promise.all([readJson(args[0]), readJson(args[1])]);
const actor = valueAfter("--actor", process.env.USER || "unknown");
const outDir = valueAfter("--out-dir", "disposition-logs");
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
const result = validateDisposition(checklist, dispositions);

if (!result.ok) {
  console.error(`Disposition incomplete: ${result.missing.length} missing, ${result.invalid.length} invalid.\n`);
  for (const { category, id } of result.missing) {
    console.error(`  MISSING  [${category}] ${id}`);
  }
  for (const { category, id } of result.invalid) {
    const extra = category === "acceptance-reference" ? ' (and "evidence" when satisfied)' : "";
    console.error(`  INVALID  [${category}] ${id} — needs status: satisfied|na|skipped and a non-empty "why"${extra}`);
  }
  console.error(
    "\nThis does not verify any claim is true — it only refuses a silent gap. Every item the recommendation named needs an explicit line, even \"skipped: ran out of time.\""
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
  actor,
  dispositions,
  checklist,
  acceptance
});

await mkdir(resolve(outDir), { recursive: true });
const safeId = String(record.recommendationId ?? "unnamed").replace(/[^a-z0-9._-]+/gi, "-");
const filePath = resolve(outDir, `${safeId}--${record.recordedAt.replace(/[:.]/g, "-")}.json`);
await writeFile(filePath, JSON.stringify(record, null, 2) + "\n", "utf8");

await appendObservation(observationRow({
  artifact: record.recommendationId,
  situation: record.primaryPattern,
  ok: true,
  problems: 0,
  gate: process.env.SITUATION_GATE
}));
console.log(`Disposition recorded: ${checklist.length} checklist items, all accounted for.`);
console.log(`Log: ${filePath}`);
