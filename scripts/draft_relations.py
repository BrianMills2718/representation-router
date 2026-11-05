"""Draft substitute/complement labels for view pairs with two model families.

Usage (from ~/code2/llm_client):
  LLM_CLIENT_PROJECT=representation-router uv run --project ~/code2/llm_client \
    python <repo>/scripts/draft_relations.py <repo> gold|unreviewed <out_dir>

`gold` re-labels the reviewed pairs so agreement with review can be measured before trusting drafts.
`unreviewed` labels every pair that shares a structure and an intent and has no recorded relation.
Every call's messages, parsed output and llm_client result metadata are written to <out_dir>/calls.jsonl;
per-pair labels to <out_dir>/labels.json.
"""

import json
import sys
from datetime import date
from pathlib import Path
from typing import Literal

from pydantic import BaseModel

from llm_client import call_llm_structured_batch

MODELS = {
    "gpt": "openrouter/openai/gpt-5.6-luna",
    "gemini": "openrouter/google/gemini-3.1-pro-preview",
}
JUSTIFICATION = "Second model family so a pair's label is only recorded when two independent families agree."
BATCH = 20
FIELDS = ["family", "structures", "intents", "tasks", "capabilities", "representationRoles", "focusFit"]

# A single wording decides most labels: the first framing below made both models call 26 of 30 agreed
# reviewed pairs complements, the second 31 of 36 substitutes. So a label is kept only when it survives the
# framing that leans against it (substitute under LEANS_COMPLEMENT, complement under LEANS_SUBSTITUTE, both
# models agreeing); on the 46 reviewed pairs that labelled 9, all matching review, and left 37 unlabelled.
PROMPTS = {
    "leans_complement": """You label pairs of information views for a router that recommends one primary view and lists alternatives.
For each pair decide how view B relates to view A when both fit the same question:
- substitute: B answers the same question as A in a different form; a reader would pick one, and showing both adds little.
- complement: B answers a different question or task over the same information; showing B beside A adds something A cannot.
Judge from what each view lets a reader do, not from shared words. Give a one-sentence reason naming the task each view serves.
Return one item per pair, using the pair id exactly as given.""",
    "leans_substitute": """You label pairs of information views for a router that recommends one main view and lists alternatives.
Imagine a reader's question that both views fit, with A chosen as the main view. Decide what B is for:
- substitute: B could be the main view instead of A. It shows the same kind of information for the same question,
  in another form, and a designer would pick one of the two (e.g. bar chart vs dot plot; table vs card list).
- complement: B is not an alternative main view but a companion beside A, because it shows a different kind of
  information or slice that A cannot show at all (e.g. a map beside a timeline; a detail pane beside an overview).
Two views that differ only in emphasis, density, interactivity, level of detail or how the reader steps through the
same information are substitutes. Any pair of views supports somewhat different tasks; that alone does not make them
complements. Give a one-sentence reason.
Return one item per pair, using the pair id exactly as given.""",
}


class PairLabel(BaseModel):
    id: str
    relationship: Literal["substitute", "complement"]
    reason: str


class Labels(BaseModel):
    labels: list[PairLabel]


def load(repo):
    reps = json.loads((repo / "catalog/representations.json").read_text())
    reps = {r["id"]: r for r in (reps if isinstance(reps, list) else reps["representations"])}
    relations = json.loads((repo / "catalog/representation-relations.json").read_text())["relations"]
    return reps, relations


def unreviewed_pairs(reps, relations):
    known = {frozenset((r["a"], r["b"])) for r in relations}
    ids = sorted(reps)
    pairs = []
    for i, a in enumerate(ids):
        for b in ids[i + 1:]:
            ra, rb = reps[a], reps[b]
            if frozenset((a, b)) in known:
                continue
            if set(ra["structures"]) & set(rb["structures"]) and set(ra["intents"]) & set(rb["intents"]):
                pairs.append((a, b))
    return pairs


def describe(rep):
    return {"id": rep["id"], **{k: rep.get(k) for k in FIELDS if rep.get(k)}}


def messages_for(batch, reps, prompt):
    payload = [{"id": f"{a}--{b}", "A": describe(reps[a]), "B": describe(reps[b])} for a, b in batch]
    return [
        {"role": "system", "content": prompt},
        {"role": "user", "content": json.dumps(payload, indent=1)},
    ]


def run(model_key, prompt_key, pairs, reps, trace_id, calls_log):
    batches = [pairs[i:i + BATCH] for i in range(0, len(pairs), BATCH)]
    msgs = [messages_for(b, reps, PROMPTS[prompt_key]) for b in batches]
    extra = {"model_justification": JUSTIFICATION} if model_key == "gemini" else {}
    results = call_llm_structured_batch(
        MODELS[model_key], msgs, Labels, max_concurrent=4, return_exceptions=True,
        reasoning_effort="low", task="draft-representation-relations", trace_id=f"{trace_id}-{prompt_key}-{model_key}",
        max_budget=2.0, **extra,
    )
    labels = {}
    for batch, m, res in zip(batches, msgs, results):
        record = {"model": MODELS[model_key], "prompt": prompt_key, "pairs": [f"{a}--{b}" for a, b in batch], "messages": m}
        if isinstance(res, Exception):
            record["error"] = repr(res)
        else:
            parsed, meta = res
            record["output"] = parsed.model_dump()
            record["cost"] = getattr(meta, "cost", None)
            record["usage"] = getattr(meta, "usage", None)
            for item in parsed.labels:
                labels[item.id] = {"relationship": item.relationship, "reason": item.reason}
        calls_log.write(json.dumps(record, default=str) + "\n")
    return labels


def main():
    repo, mode, out = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
    out.mkdir(parents=True, exist_ok=True)
    reps, relations = load(repo)
    if mode == "gold":
        pairs = [(r["a"], r["b"]) for r in relations if not r.get("drafted")]
    else:
        pairs = unreviewed_pairs(reps, relations)
    trace_id = f"rr-relations-{mode}-{date.today().isoformat()}"
    with open(out / "calls.jsonl", "a") as calls_log:
        runs = {(p, m): run(m, p, pairs, reps, trace_id, calls_log) for p in PROMPTS for m in MODELS}
    rows = []
    for a, b in pairs:
        pid = f"{a}--{b}"
        row = {"id": pid, "a": a, "b": b, "runs": {f"{p}/{m}": runs[(p, m)].get(pid) for p, m in runs}}
        row["label"] = robust_label(row["runs"])
        if mode == "gold":
            row["reviewed"] = next(r["relationship"] for r in relations if r["a"] == a and r["b"] == b)
        rows.append(row)
    (out / "labels.json").write_text(json.dumps(rows, indent=1) + "\n")
    missing = sum(1 for r in rows for v in r["runs"].values() if not v)
    labelled = [r for r in rows if r["label"]]
    print(f"pairs={len(rows)} missing_answers={missing} labelled={len(labelled)} "
          f"substitute={sum(r['label'] == 'substitute' for r in labelled)} complement={sum(r['label'] == 'complement' for r in labelled)}")
    if mode == "gold":
        hit = sum(r["label"] == r["reviewed"] for r in labelled)
        print(f"labelled pairs matching review: {hit}/{len(labelled)}")
    sys.exit(1 if missing else 0)


def robust_label(runs):
    def both(prompt, value):
        return all((runs[f"{prompt}/{m}"] or {}).get("relationship") == value for m in MODELS)
    sub, comp = both("leans_complement", "substitute"), both("leans_substitute", "complement")
    if sub != comp:
        return "substitute" if sub else "complement"
    return None

if __name__ == "__main__":
    main()
