#!/usr/bin/env python3
"""Build typed-graph/v1 (with hyperedges) of the whole DM2 metamodel from onto-canon6's dm2_complete pack.
Each relation type (predicate) is one hub; each role is a spoke to the entity type the role expects.
Usage: build_dm2_hubs.py <pack dir> <out.json>"""
import json, sys
from pathlib import Path
pack, out = Path(sys.argv[1]), Path(sys.argv[2])
rows = lambda n: [json.loads(l) for l in (pack / f"{n}.jsonl").read_text().splitlines() if l.strip()]
ents = {e["entity_id"] if "entity_id" in e else e.get("type_id") or e.get("id"): e for e in rows("entity_types")}
preds = {p["predicate_id"]: p for p in rows("predicate_types")}
roles = {r["role_id"]: r for r in rows("role_types")}
expected = {c["role_id"]: c["expected_type"] for c in rows("constraints") if c["constraint_type"] == "role_expected_entity_type"}
edges_pr = rows("predicate_role_edges")
label = lambda t: (ents.get(t) or {}).get("preferred_label") or t.split(":", 1)[-1]
node_ids = set()
hyper = []
for pid, p in preds.items():
    r = {}
    for e in (x for x in edges_pr if x["predicate_id"] == pid):
        t = expected.get(e["role_id"])
        if not t: continue
        name = roles[e["role_id"]]["source_role"]
        r.setdefault(name, []).append(t); node_ids.add(t)
    if r: hyper.append({"id": pid, "label": p["preferred_label"], "kind": "relation", "roles": r,
                        "explain": (p.get("description") or "")[:300]})
sub = [h for h in rows("hierarchy_edges") if h["edge_type"] == "subtype_of"]
graph = {"schema": "typed-graph/v1",
         "nodes": [{"id": t, "label": label(t), "kind": "dm2" if t.startswith("dm2:") else "ideas"} for t in sorted(node_ids)],
         "edges": [], "hyperedges": hyper}
def pieces(links):
    p = {}
    def f(x):
        p.setdefault(x, x)
        while p[x] != x: p[x] = p[p[x]]; x = p[x]
        return x
    for a, b in links: p[f(a)] = f(b)
    return len({f(x) for x in list(p)}), p
spokes = [(h["id"], m) for h in hyper for ms in h["roles"].values() for m in ms]
n_hub, _ = pieces(spokes)
in_scope = [(s["child_id"], s["parent_id"]) for s in sub if s["child_id"] in node_ids and s["parent_id"] in node_ids]
n_hub_sub, _ = pieces(spokes + in_scope)
out.write_text(json.dumps(graph, indent=1))
print(json.dumps({"relation_hubs": len(hyper), "types_in_roles": len(node_ids), "spokes": len(spokes),
                  "pieces_hubs_only": n_hub, "subtype_edges_between_role_types": len(in_scope),
                  "pieces_with_subtypes": n_hub_sub, "entity_types_in_pack": len(ents)}))
