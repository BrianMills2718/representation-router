// Writing router (scripts/writing_record.py + catalog/writing-forms.json). Each case uses an input where
// the easy answer would be wrong.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCRIPT = new URL("../scripts/writing_record.py", import.meta.url).pathname;
const CATALOG = JSON.parse(readFileSync(new URL("../catalog/writing-forms.json", import.meta.url), "utf8"));

function run(args, env = {}) {
  return spawnSync("python3", [SCRIPT, ...args], { encoding: "utf8", env: { ...process.env, ...env } });
}

function factArgs(yes) {
  return Object.keys(CATALOG.facts).flatMap((f) => ["--fact", `${f}=${yes.includes(f) ? "yes" : "no"}:because`]);
}

function setup(text) {
  const dir = mkdtempSync(join(tmpdir(), "wr-"));
  const draft = join(dir, "draft.txt");
  writeFileSync(draft, text);
  return { dir, draft, env: { SITUATION_LOG_DIR: join(dir, "log"), SITUATION_GATE: "test" } };
}

test("an email that also asks for approval routes to email, not proposal (precedence)", () => {
  const { draft, env } = setup("Hello Dana,\n\nCan you approve the $4,200 order? The supplier is late.\n\nBest,\nBrian");
  const r = run(["declare", draft, "--medium", "email", "--rationale", "r", ...factArgs(["is_email", "asks_for_approval_or_resources"])], env);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /route email/);
  assert.match(r.stdout, /email-frame/);
  assert.match(r.stdout, /rep-considered \[nit\]/);
});

test("check fails until every email item is checked off, and logs each check", () => {
  const { dir, draft, env } = setup("Hello Dana,\n\nCan you approve the $4,200 order? The supplier is late.\n\nBest,\nBrian");
  run(["declare", draft, "--medium", "email", "--rationale", "r", ...factArgs(["is_email"])], env);
  const first = run(["check", draft], env);
  assert.equal(first.status, 1);
  const quotes = {
    "email-frame": "Hello Dana,", "email-lead-with-ask": "Can you approve the $4,200 order?",
    "email-subject": "Can you approve", "email-slack-rules": "The supplier is late.", "email-approved": "Best,"
  };
  for (const [item, quote] of Object.entries(quotes)) {
    assert.equal(run(["observe", draft, item, "pass", "--quote", quote], env).status, 0);
  }
  assert.equal(run(["observe", draft, "rep-considered", "not_applicable", "--note", "short text email"], env).status, 0);
  const second = run(["check", draft], env);
  assert.equal(second.status, 0, second.stdout);
  const rows = readFileSync(join(dir, "log", new Date().toISOString().slice(0, 10) + ".jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.deepEqual(rows.map((r) => r.ok), [false, true]);
  assert.equal(rows[1].form, "email");
});

test("a pass with words not in the draft is refused", () => {
  const { draft, env } = setup("Hello Dana,\n\nShort note.\n\nBest,\nBrian");
  run(["declare", draft, "--medium", "email", "--rationale", "r", ...factArgs(["is_email"])], env);
  assert.equal(run(["observe", draft, "email-frame", "pass", "--quote", "Hi Dana"], env).status, 2);
});

test("a web-page article gets the major representation item; a chat message only a nit", () => {
  const a = setup("TypeDB saved it, with no error.");
  const art = run(["declare", a.draft, "--medium", "web_page", "--rationale", "r", ...factArgs(["reports_transferable_failure"])], a.env);
  assert.match(art.stdout, /route finding/);
  assert.match(art.stdout, /rep-considered \[major\]/);
  const c = setup("can you approve the order?");
  const chat = run(["declare", c.draft, "--medium", "chat", "--rationale", "r", ...factArgs(["is_chat_message"])], c.env);
  assert.match(chat.stdout, /route chat_message/);
  assert.match(chat.stdout, /rep-considered \[nit\]/);
});

test("every route names the guidance that governs it, and precedence covers every route", () => {
  for (const [id, route] of Object.entries(CATALOG.routes)) {
    assert.ok(route.governed_by && route.governed_by.length > 5, id);
    assert.ok(CATALOG.facts[route.when], `${id} uses an undeclared fact`);
  }
  assert.deepEqual([...CATALOG.precedence].sort(), Object.keys(CATALOG.routes).sort());
});
