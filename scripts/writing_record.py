#!/usr/bin/env python3
"""Writing router: declare what a piece of writing is, check off its route's checklist, check the record.

Policy situation-declared-checklists (project-meta registry, Brian 2026-10-06). The catalog
(catalog/writing-forms.json) maps yes/no facts and a medium to one route, each route to the skill that
governs it, and each route plus medium to a checklist. Records are written only through this command,
never claimed in a reply. Stdlib only; works on any draft file (article, email, Slack message, report).

    writing_record.py declare DRAFT --medium MEDIUM --fact NAME=yes|no:EVIDENCE ... --rationale TEXT [--record PATH]
    writing_record.py observe DRAFT ITEM pass|fail|not_applicable|inconclusive [--quote TEXT] [--note TEXT] [--record PATH]
    writing_record.py show    DRAFT [--record PATH]
    writing_record.py check   DRAFT [--record PATH]     # exit 0 complete, 1 incomplete; logs one observation line

The record defaults to DRAFT + ".writing.json". A pass needs a quote that appears verbatim in the draft
(a lexical check, approved 2026-10-06); other statuses need a note; blocker items cannot be
not_applicable. "No route fits" is a valid answer: log it as friction instead of forcing one.
"""
import argparse
import datetime
import json
import os
import pathlib
import sys

CATALOG = json.loads((pathlib.Path(__file__).resolve().parent.parent / "catalog" / "writing-forms.json").read_text(encoding="utf-8"))
STATUSES = ("pass", "fail", "not_applicable", "inconclusive")


def fail(msg):
    print(f"writing_record: {msg}; exit 2")
    sys.exit(2)


def classify(facts):
    """The route follows from the declared facts by catalog precedence; prose is never read."""
    for rid in CATALOG["precedence"]:
        if facts.get(CATALOG["routes"][rid]["when"]):
            return rid
    return None


def items_for(route, medium):
    items = dict(CATALOG["routes"][route]["items"]) if route else {}
    items.update(CATALOG["representation_items"].get(medium, {}))
    return items


def flat(text):
    return " ".join(str(text).split())


def rec_path(args):
    return pathlib.Path(args.record) if args.record else pathlib.Path(args.draft + ".writing.json")


def load(args):
    p = rec_path(args)
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


def save(args, rec):
    rec_path(args).write_text(json.dumps(rec, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


def problems_of(draft, rec):
    sit = rec.get("situation")
    if not sit:
        return ["situation not declared"]
    out = []
    facts = {k: v.get("value") for k, v in sit.get("facts", {}).items()}
    missing = sorted(set(CATALOG["facts"]) - set(facts))
    if missing:
        out.append(f"facts not declared: {missing}")
    derived = classify(facts)
    if derived != sit.get("route"):
        out.append(f"declared route {sit.get('route')!r} does not follow from the facts (they give {derived!r})")
    if derived is None:
        return out + ["no route fits; log friction (Policy situation-declared-checklists) instead of forcing one"]
    text = flat(pathlib.Path(draft).read_text(encoding="utf-8"))
    for iid, item in items_for(derived, sit.get("medium")).items():
        obs = rec.get("items", {}).get(iid)
        if not obs:
            out.append(f"{iid} not checked off ({item['text']})")
        elif obs["status"] == "pass":
            if not obs.get("quote") or flat(obs["quote"]) not in text:  # prose-matching-exempt: lexical measurement (verbatim presence), approved 2026-10-06
                out.append(f"{iid} passes without a quote found verbatim in the draft")
        elif not (obs["status"] == "not_applicable" and item["severity"] != "blocker" and obs.get("note")):
            out.append(f"{iid} is {obs['status']}" + (f" ({obs['note']})" if obs.get("note") else ""))
    return out


def observe_line(draft, route, ok, problems):
    log_dir = pathlib.Path(os.environ.get("SITUATION_LOG_DIR", str(pathlib.Path.home() / "projects" / "data" / "logs" / "situation-checklists")))
    try:
        log_dir.mkdir(parents=True, exist_ok=True)
        now = datetime.datetime.now(datetime.timezone.utc)
        row = {"ts": now.isoformat(timespec="seconds"), "domain": "writing", "artifact": pathlib.Path(draft).name,
               "form": route, "ok": ok, "problems": problems, "gate": os.environ.get("SITUATION_GATE", "writing_record")}
        with open(log_dir / f"{now.date().isoformat()}.jsonl", "a", encoding="utf-8") as fh:
            fh.write(json.dumps(row) + "\n")
    except OSError as e:
        print(f"(observation not recorded: {e})")


def cmd_declare(args):
    if args.medium not in CATALOG["media"]:
        fail(f"unknown medium {args.medium!r}; one of {sorted(CATALOG['media'])}")
    facts, evidence = {}, {}
    for spec in args.fact:
        name, _, rest = spec.partition("=")
        value, _, ev = rest.partition(":")
        if name not in CATALOG["facts"]:
            fail(f"unknown fact {name!r}; known: {sorted(CATALOG['facts'])}")
        if value not in ("yes", "no") or not ev.strip():
            fail(f"--fact {name} needs yes|no and evidence after ':'")
        facts[name], evidence[name] = value == "yes", ev.strip()
    missing = sorted(set(CATALOG["facts"]) - set(facts))
    if missing:
        fail(f"declare every fact; missing {missing}")
    route = classify(facts)
    rec = load(args)
    rec["situation"] = {"schema": "writing-situation/v2", "medium": args.medium, "route": route, "rationale": args.rationale,
                        "facts": {k: {"value": facts[k], "evidence": evidence[k]} for k in sorted(facts)}}
    rec.setdefault("items", {})
    save(args, rec)
    if route is None:
        print("writing_record: no route fits these facts; log it as friction (project-meta/policy_friction.md, Policy situation-declared-checklists); exit 0")
        return
    r = CATALOG["routes"][route]
    print(f"writing_record: route {route} ({r['name']}); governed by {r['governed_by']}")
    for iid, it in items_for(route, args.medium).items():
        print(f"  {iid} [{it['severity']}] {it['text']}")
    print("writing_record: exit 0")


def cmd_observe(args):
    rec = load(args)
    sit = rec.get("situation") or fail("declare first")
    items = items_for(sit["route"], sit["medium"]) if sit.get("route") else fail("no route was derived")
    if args.item not in items:
        fail(f"{args.item!r} is not an item of route {sit['route']} on {sit['medium']}: {sorted(items)}")
    if args.status == "pass":
        if not args.quote or flat(args.quote) not in flat(pathlib.Path(args.draft).read_text(encoding="utf-8")):  # prose-matching-exempt: lexical measurement (verbatim presence), approved 2026-10-06
            fail("pass needs --quote with exact words from the draft")
    elif not (args.note or "").strip():
        fail(f"{args.status} needs --note")
    if args.status == "not_applicable" and items[args.item]["severity"] == "blocker":
        fail("a blocker item cannot be not_applicable")
    rec.setdefault("items", {})[args.item] = {"status": args.status, "quote": args.quote or "", "note": args.note or ""}
    save(args, rec)
    print(f"writing_record: {args.item} = {args.status}; exit 0")


def cmd_show(args):
    rec = load(args)
    sit = rec.get("situation")
    if not sit:
        print("writing_record: no situation declared; exit 0")
        return
    print(f"route {sit['route']} on {sit['medium']}: {sit['rationale']}")
    for iid in (items_for(sit["route"], sit["medium"]) if sit.get("route") else {}):
        print(f"  {iid}: {rec.get('items', {}).get(iid, {}).get('status', 'pending')}")
    print("writing_record: exit 0")


def cmd_check(args):
    rec = load(args)
    probs = problems_of(args.draft, rec)
    route = (rec.get("situation") or {}).get("route")
    observe_line(args.draft, route, not probs, len(probs))
    for p in probs:
        print(f"  - {p}")
    print(f"writing_record: check {'OK' if not probs else 'FAIL'} ({len(probs)} problems, route {route}); exit {1 if probs else 0}")
    sys.exit(1 if probs else 0)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name in ("declare", "observe", "show", "check"):
        p = sub.add_parser(name)
        p.add_argument("draft")
        p.add_argument("--record")
        if name == "declare":
            p.add_argument("--medium", required=True)
            p.add_argument("--fact", action="append", default=[])
            p.add_argument("--rationale", required=True)
        if name == "observe":
            p.add_argument("item")
            p.add_argument("status", choices=STATUSES)
            p.add_argument("--quote")
            p.add_argument("--note")
    args = ap.parse_args()
    {"declare": cmd_declare, "observe": cmd_observe, "show": cmd_show, "check": cmd_check}[args.cmd](args)


if __name__ == "__main__":
    main()
