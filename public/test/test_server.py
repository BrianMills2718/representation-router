"""Offline tests for the public app: no network, no model calls (the model step is replaced by a fake).
The Node router (public/route.mjs) is real and runs for every test that routes.
Run: PYTHONPATH=public/app ROUTER_PUBLIC=1 python -m pytest public/test -p no:cacheprovider
"""
import json
import os
import sys
from pathlib import Path

os.environ["ROUTER_PUBLIC"] = "1"
ROOT = Path(__file__).resolve().parents[2]
os.environ["ROUTER_ROOT"] = str(ROOT)
sys.path.insert(0, str(ROOT / "public" / "app"))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import server  # noqa: E402


def _draft(answerable=True, **over):
    base = dict(answerable=answerable, missing=[] if answerable else ["who reads it"], refusal="" if answerable else "Say who reads it and what they decide.",
                concern="Which services depend on payments?", stakeholder="on-call engineer", intent=["inspect", "decide"],
                informationStructure=["network"], tasks=["inspect", "select"], explanatoryFocus=["structure"], items=40, density="medium",
                mode="exploratory", dynamics="interactive", expertise="expert", risk="high", reversibility="reversible", provenance=False,
                marks=[{"label": "payments"}, {"label": "checkout"}, {"label": "fraud"}], links=[{"source": 0, "target": 1, "label": "calls"}, {"source": 9, "target": 1, "label": "bad"}])
    base.update(over)
    return server.UseCaseDraft(**base)


@pytest.fixture()
def client(monkeypatch):
    calls = []

    def fake(messages, model_cls, task, job):
        calls.append(task)
        if model_cls is server.UseCaseDraft:
            text = messages[-1]["content"]
            return (_draft(answerable="nicer" not in text)), 0.0004, {"in": 10, "out": 5}
        return server.Pick(why="Because it fits.", tradeoff="Harder to read at scale."), 0.0003, {"in": 10, "out": 5}

    monkeypatch.setattr(server, "_llm", fake)
    server._sessions.clear()
    c = TestClient(server.app)
    c.calls = calls
    return c


def events(resp):
    return [json.loads(l) for l in resp.text.splitlines() if l.strip()]


TEXT = "I am the on-call engineer and need to see which of 40 services depend on payments."


def test_refuses_to_start_without_public_flag():
    import subprocess
    env = {k: v for k, v in os.environ.items() if k != "ROUTER_PUBLIC"}
    p = subprocess.run([sys.executable, "-c", "import server"], cwd=ROOT / "public" / "app", env=env, capture_output=True, text=True)
    assert p.returncode != 0 and "ROUTER_PUBLIC=1" in (p.stderr + p.stdout)


def test_default_deny_paths(client):
    for path in ["/docs", "/redoc", "/openapi.json", "/static/server.py", "/static/../server.py", "/etc/passwd", "/api/run/x", "/public/route.mjs", "/catalog/representations.json", "/.env"]:
        r = client.get(path)
        assert r.status_code == 404, path
        assert r.json() == {"detail": "Not found."}
    assert client.get("/api/run").status_code == 404  # GET on a POST-only route
    assert client.delete("/").status_code == 404


def test_index_and_static_and_cookie(client):
    r = client.get("/")
    assert r.status_code == 200 and "Representation Router" in r.text
    assert "httponly" in r.headers["set-cookie"].lower() and "rr_session" in r.headers["set-cookie"]
    assert client.get("/static/app.js").status_code == 200 and client.get("/static/sketches.js").status_code == 200
    assert "default-src 'self'" in r.headers["content-security-policy"]


def test_run_happy_path_uses_real_router(client):
    r = client.post("/api/run", json={"text": TEXT})
    assert r.status_code == 200
    ev = events(r)
    assert [e["stage"] for e in ev] == ["usecase", "routed", "done"]
    res = ev[-1]["result"]
    assert res["answerable"] and res["chosen"] == res["ranking"][0]["id"]
    assert res["catalogSize"] == 23 and len(res["ranking"]) + len(res["rejected"]) == 23
    assert res["recommendation"]["primary"]["representation"] == res["chosen"]
    assert res["recommendation"]["compositionPlan"]["readingOrder"]
    assert res["sketch"]["marks"] == ["payments", "checkout", "fraud"]
    assert res["sketch"]["links"] == [{"source": 0, "target": 1, "label": "calls"}]  # out-of-range link dropped
    assert res["usage"]["calls"] == 2 and res["usage"]["costUsd"] > 0 and res["why"] == "Because it fits."
    assert client.calls == ["draft_use_case", "explain_pick"]


def test_refusal_is_the_routers_own_decline(client):
    r = client.post("/api/run", json={"text": "Make our website look nicer please."})
    res = events(r)[-1]["result"]
    assert res["answerable"] is False and res["chosen"] is None
    assert res["ranking"] == [] and len(res["rejected"]) == 23
    assert res["recommendation"]["primary"] is None
    assert res["usage"]["calls"] == 1 and "Say who" in res["why"]


@pytest.mark.parametrize("body,status", [({"text": "short"}, 400), ({"text": "x" * 601}, 400), ({"text": 5}, 400), ({}, 400), ([1], 400)])
def test_input_validation_plain_sentences(client, body, status):
    r = client.post("/api/run", json=body)
    assert r.status_code == status and isinstance(r.json()["detail"], str) and len(r.json()["detail"]) > 10
    assert client.calls == []


def test_body_cap_and_bad_json(client):
    r = client.post("/api/run", content=b"x" * 10000, headers={"content-type": "application/json"})
    assert r.status_code == 413 and "too large" in r.json()["detail"]
    r = client.post("/api/run", content=b"{not json", headers={"content-type": "application/json"})
    assert r.status_code == 400
    assert client.calls == []


def test_one_running_job_per_session(client):
    client.get("/")
    (token,) = server._sessions.keys()
    server._sessions[token]["running"] = True
    r = client.post("/api/run", json={"text": TEXT})
    assert r.status_code == 409 and "still going" in r.json()["detail"]


def test_model_failure_is_one_plain_sentence(client, monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("secret internal trace sk-abc123")
    monkeypatch.setattr(server, "_llm", boom)
    ev = events(client.post("/api/run", json={"text": TEXT}))
    assert ev[-1]["stage"] == "error" and "sk-abc123" not in ev[-1]["detail"] and ev[-1]["detail"].endswith(".")
    assert server._sessions and not any(s["running"] for s in server._sessions.values())


def test_last_run_restored_per_session(client):
    client.post("/api/run", json={"text": TEXT})
    last = client.get("/api/last").json()["last"]
    assert last["text"] == TEXT and last["result"]["chosen"]
    other = TestClient(server.app)
    assert other.get("/api/last").json()["last"] is None


def test_every_catalog_id_has_a_sketch_and_name():
    js = (ROOT / "public" / "app" / "static" / "sketches.js").read_text()
    ids = [c["id"] for c in json.loads((ROOT / "catalog" / "representations.json").read_text())]
    assert len(ids) == 23
    for i in ids:
        assert f'R["{i}"]' in js and f'"{i}": [' in js, i
