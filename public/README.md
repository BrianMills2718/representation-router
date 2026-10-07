# Public hosted UI

A one-page web app that runs the real Representation Router for a visitor: two model calls (through `llm_client`) wrap the
router's own deterministic code (`src/router.mjs` ranking, `src/agent-recommendation.mjs` page plan), run by `public/route.mjs`.
A visitor describes who reads a page and what they must decide; the page shows a sketch of the recommended view labelled with
their words, all 23 catalog views as score bars, and (Advanced) the use case, page plan and checks. A vague request is declined
by the router itself (`semanticAvailability: unavailable`), not by the page.

| Path | What |
| --- | --- |
| `public/app/server.py` | FastAPI app. Refuses to start unless `ROUTER_PUBLIC=1`. Default-deny route table, session cookie, body/size caps, one job per session, per-job spend ceiling, plain-sentence errors, no docs endpoints. |
| `public/app/static/` | `index.html`, `app.js`, `sketches.js` (one wireframe per catalog view, 23). |
| `public/route.mjs` | stdin `{useCase}` -> ranking + recommendation JSON. Reads only the repo's fixed catalog files. |
| `public/test/` | Offline tests (real Node router, fake model). `public/test/e2e.mjs` drives the real page with Playwright. |
| `public/DISPOSITION.md` | The Representation Router's own design recommendation for this page and what was built against it. |

Environment: `ROUTER_PUBLIC=1` (required), `ROUTER_ROOT`, `ROUTER_MODEL` (default `openrouter/openai/gpt-5.6-luna`),
`ROUTER_REASONING_EFFORT` (default `none`), `ROUTER_JOB_BUDGET_USD` (default `0.05`), `ROUTER_MAX_SESSIONS`.
Hosting (Dockerfile, gateway limits, deploy): `personal-vps/apps/router`.

Tests: `PYTHONPATH=public/app ROUTER_PUBLIC=1 python -m pytest public/test -p no:cacheprovider` (needs `llm_client`'s Python deps: fastapi, pydantic, httpx).
