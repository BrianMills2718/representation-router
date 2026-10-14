#!/usr/bin/env python3
"""Writing router: declare what a piece of writing is, check off its route's checklist, check the record.

Policy situation-declared-checklists (project-meta registry, Brian 2026-10-06). The catalog
(catalog/writing-forms.json) maps yes/no facts and a medium to one route, each route to the skill that
governs it, and each route plus medium to a checklist. Records are written only through this command,
never claimed in a reply. Stdlib only; works on any draft file (article, email, Slack message, report).

    writing_record.py declare DRAFT --medium MEDIUM --fact NAME=yes|no:EVIDENCE ... --rationale TEXT [--record PATH]
                      [--no-fit-governed-by CONTRACT]   # only when the facts give no route
    writing_record.py observe DRAFT ITEM pass|fail|not_applicable|inconclusive [--quote TEXT] [--note TEXT] [--record PATH]
    writing_record.py show    DRAFT [--record PATH]
    writing_record.py check   DRAFT [--record PATH]     # exit 0 complete, 1 incomplete; logs one observation line
    writing_record.py gaps    [--days N]                # catalog gaps in the daily log, by path; exit 1 when any

The record defaults to DRAFT + ".writing.json". A pass needs a quote that appears verbatim in the draft
(a lexical check, approved 2026-10-06); other statuses need a note; blocker items cannot be
not_applicable. "No route fits" is a valid answer: log it as friction instead of forcing one. When the
writing is already governed by a supplied contract or an existing authority (a file path or URL), declare
it with --no-fit-governed-by: the record then carries an explicit no_fit disposition, check passes on the
medium's own items, and the daily log counts it as form "no_fit" so missing catalog routes stay visible.
Every no-route result without a governor, at declare or check, appends a row with "catalog_gap": true, the
draft's path and its facts to the same daily log; `gaps` summarizes those rows so an audit can fail on them.
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
    if derived is None and not (sit.get("no_fit") or {}).get("governed_by"):
        return out + ["no route fits; declare --no-fit-governed-by CONTRACT if a supplied contract or existing authority governs it, "
                      "otherwise log friction (Policy situation-declared-checklists) instead of forcing one"]
    if derived is not None and sit.get("no_fit"):
        out.append(f"no_fit disposition declared but the facts give route {derived!r}; follow the route")
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


def log_dir():
    return pathlib.Path(os.environ.get("SITUATION_LOG_DIR", str(pathlib.Path.home() / "projects" / "data" / "logs" / "situation-checklists")))


def observe_line(draft, route, ok, problems, gap_facts=None, stage="check"):
    """One row per check (and per no-route declare). gap_facts marks a catalog gap: no route and no governor."""
    try:
        log_dir().mkdir(parents=True, exist_ok=True)
        now = datetime.datetime.now(datetime.timezone.utc)
        row = {"ts": now.isoformat(timespec="seconds"), "domain": "writing", "artifact": pathlib.Path(draft).name,
               "form": route, "ok": ok, "problems": problems, "gate": os.environ.get("SITUATION_GATE", "writing_record")}
        if gap_facts is not None:
            row.update({"catalog_gap": True, "stage": stage, "path": str(pathlib.Path(draft).resolve()), "facts": gap_facts})
        with open(log_dir() / f"{now.date().isoformat()}.jsonl", "a", encoding="utf-8") as fh:
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
    governor = (args.no_fit_governed_by or "").strip()
    if governor and route is not None:
        fail(f"--no-fit-governed-by is only for facts that give no route; these give {route!r}")
    if governor and not governor.startswith(("http://", "https://")) and not pathlib.Path(governor).exists():
        fail(f"--no-fit-governed-by {governor!r} is neither a URL nor an existing file")
    rec = load(args)
    rec["situation"] = {"schema": "writing-situation/v2", "medium": args.medium, "route": route, "rationale": args.rationale,
                        "facts": {k: {"value": facts[k], "evidence": evidence[k]} for k in sorted(facts)}}
    if governor:
        rec["situation"]["no_fit"] = {"governed_by": governor}
    rec.setdefault("items", {})
    save(args, rec)
    if route is None and governor:
        print(f"writing_record: no route fits; disposition no_fit, governed by {governor}")
        for iid, it in items_for(None, args.medium).items():
            print(f"  {iid} [{it['severity']}] {it['text']}")
        print("writing_record: exit 0")
        return
    if route is None:
        observe_line(args.draft, None, False, 1, gap_facts=facts, stage="declare")
        print("writing_record: no route fits these facts; recorded as a catalog gap (see `gaps`); log it as friction (project-meta/policy_friction.md, Policy situation-declared-checklists); exit 0")
        return
    r = CATALOG["routes"][route]
    print(f"writing_record: route {route} ({r['name']}); governed by {r['governed_by']}")
    for iid, it in items_for(route, args.medium).items():
        print(f"  {iid} [{it['severity']}] {it['text']}")
    print("writing_record: exit 0")


def cmd_observe(args):
    rec = load(args)
    sit = rec.get("situation") or fail("declare first")
    if not sit.get("route") and not (sit.get("no_fit") or {}).get("governed_by"):
        fail("no route was derived; declare --no-fit-governed-by CONTRACT if one governs this writing")
    items = items_for(sit.get("route"), sit["medium"])
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
    governor = (sit.get("no_fit") or {}).get("governed_by")
    print(f"route {sit['route'] or ('no_fit, governed by ' + governor if governor else None)} on {sit['medium']}: {sit['rationale']}")
    for iid in (items_for(sit["route"], sit["medium"]) if sit.get("route") or governor else {}):
        print(f"  {iid}: {rec.get('items', {}).get(iid, {}).get('status', 'pending')}")
    print("writing_record: exit 0")


def cmd_check(args):
    rec = load(args)
    probs = problems_of(args.draft, rec)
    sit = rec.get("situation") or {}
    governed = bool((sit.get("no_fit") or {}).get("governed_by"))
    route = sit.get("route") or ("no_fit" if governed else None)
    facts = {k: v.get("value") for k, v in sit.get("facts", {}).items()}
    gap = bool(sit) and classify(facts) is None and not governed
    observe_line(args.draft, route, not probs, len(probs), gap_facts=facts if gap else None)
    for p in probs:
        print(f"  - {p}")
    print(f"writing_record: check {'OK' if not probs else 'FAIL'} ({len(probs)} problems, route {route}); exit {1 if probs else 0}")
    sys.exit(1 if probs else 0)


def cmd_gaps(args):
    """Catalog-gap rows from the last N days of the daily log, grouped by path; exit 1 when any exist."""
    if args.days < 1:
        fail("--days must be at least 1")
    since = datetime.datetime.now(datetime.timezone.utc).date() - datetime.timedelta(days=args.days - 1)
    by_path = {}
    for f in sorted(log_dir().glob("*.jsonl")) if log_dir().is_dir() else []:
        try:
            if datetime.date.fromisoformat(f.stem) < since:
                continue
        except ValueError:
            continue
        for line in f.read_text(encoding="utf-8").splitlines():
            try:
                row = json.loads(line)
            except ValueError:
                continue
            if row.get("domain") == "writing" and row.get("catalog_gap"):
                g = by_path.setdefault(row.get("path") or row.get("artifact"), {"rows": 0, "last": "", "yes": set()})
                g["rows"] += 1
                g["last"] = max(g["last"], row.get("ts", ""))
                g["yes"].update(k for k, v in (row.get("facts") or {}).items() if v)
    for path, g in sorted(by_path.items(), key=lambda kv: (-kv[1]["rows"], kv[0])):
        print(f"  {g['rows']:3d}  {path}  (last {g['last']}; yes facts: {sorted(g['yes']) or 'none'})")
    n = sum(g["rows"] for g in by_path.values())
    print(f"writing_record: {n} catalog-gap rows across {len(by_path)} paths in the last {args.days} days "
          f"({log_dir()}); exit {1 if n else 0}")
    sys.exit(1 if n else 0)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    g = sub.add_parser("gaps", help="summarize catalog-gap rows (no route, no governor) by path; exit 1 when any")
    g.add_argument("--days", type=int, default=7)
    for name in ("declare", "observe", "show", "check"):
        p = sub.add_parser(name)
        p.add_argument("draft")
        p.add_argument("--record")
        if name == "declare":
            p.add_argument("--medium", required=True)
            p.add_argument("--fact", action="append", default=[])
            p.add_argument("--rationale", required=True)
            p.add_argument("--no-fit-governed-by", help="file path or URL of the contract or authority that governs writing no route fits")
        if name == "observe":
            p.add_argument("item")
            p.add_argument("status", choices=STATUSES)
            p.add_argument("--quote")
            p.add_argument("--note")
    args = ap.parse_args()
    {"declare": cmd_declare, "observe": cmd_observe, "show": cmd_show, "check": cmd_check, "gaps": cmd_gaps}[args.cmd](args)


if __name__ == "__main__":
    main()
