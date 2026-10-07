# Task-First Engineering Home v0

**Planning path:** durable single-contributor  
**Status:** complete — technical stop condition reached; human acceptance pending  
**Risk tier:** Tier 2 — task routing over existing verified engineering surfaces  
**Target:** PR #23 / `feature/review-workbench-v0`

## Outcome

Provide one honest entry point for Representation Router where a person begins with the software-engineering job rather than internal product vocabulary.

Human checkpoint:

> **Can a person start from an ordinary software-engineering job, understand what RR can actually help with today, and enter the right working surface without needing to know the internal product vocabulary?**

The user explicitly authorized continued progress without immediate artifact review. Human acceptance therefore remains pending even though the technical stop condition is complete.

## Implemented jobs and capability truth

### Understand the system — ready

Routes to the bundled task-first Review Workbench v1.2.

Current capability includes plain-language orientation, architecture views, interactive graph/edge inspection, and requirements/evidence/source drill-down.

### Review a change — ready for the current proving domain

Routes to the bundled Evidence Gap Focus runner artifact.

Current capability includes evidence-gap focus, exact source/evidence provenance, and separation of executed evidence from human acceptance. The surface remains read-only.

### Build something — partial

Routes to bundled Feature Studio v0 and the Saved Graph Layouts Implementation Runner.

Current capability includes one guided Feature Studio authoring family plus two verified implementation adapters/runtimes. Generic `implementation-brief/v1` authoring is the next gap.

### Fix something — partial

Routes first to Understand and then to the current Build workflow.

The home names the missing failure/bug intent contract, diagnostic runtime evidence surface, and fix-specific routing rather than pretending those capabilities already exist.

### Release something — unavailable end-to-end

No executable route is provided.

The home explicitly names missing deployment target/authority contracts, deployment execution receipts, runtime evidence, and rollback semantics.

## Task router contract

`src/engineering-task-router.mjs` defines stable task IDs and explicit availability:

- `build` — partial
- `fix` — partial
- `understand` — ready
- `review` — ready
- `release` — unavailable

Plain-language routing returns:

- `matched`
- `ambiguous`
- `unrecognized`

It does not guess a workflow when confidence is insufficient.

## Engineering Home surface

`src/engineering-home.mjs` renders:

- **What are you trying to do?** entry point;
- plain-language goal routing;
- five job cards with visible readiness;
- what can be done now;
- authority boundary;
- what is still missing;
- available workspace routes;
- lifecycle stages touched;
- lifecycle capability strip from Outcome through Operate.

There is no global completeness percentage.

Engineering Home has no network/Git/planning/product write path.

## Exact bundled workspaces

`scripts/build-engineering-home-v0.mjs` copies and hashes the exact CI-built prerequisite surfaces:

- Understand → Review Workbench v1.2
- Review → Evidence Gap Focus runner
- Build → Feature Studio v0
- Implementation → Saved Graph Layouts runner

The build fails if a copied entrypoint differs from its source artifact.

## Exact proving run

Exact implementation head:

`23aa8ed1f98f748954d674202099999fdd070db1`

GitHub Actions run `35071644519` completed successfully:

- `npm ci` — success
- `npm test` — success
- all existing Review Workbench / Feature Studio / Implementation Loop builds — success
- both implementation-runner feature builds — success
- `npm run build:engineering-home:v0` — success
- all configured artifact uploads — success

Engineering Home artifact:

- artifact id `10435864931`
- artifact digest `sha256:4342616d99a2a1866022a863bde305b59968b9e6179d414e33ee149a864f75f2`
- root `index.html`: 17,990 bytes
- root SHA-256: `f66313403bd6defb57a41def3b0f8fcd3123b990ac79d0b9e3c15cf7cc170827`
- `bundle-manifest.json`: 1,530 bytes, SHA-256 `d5fdf4ac3497909321450ac09e9b4ffb35e04d87042bfa0ba9aba867b31378c4`

Bundled entrypoint identities:

- Understand: 489,188 bytes, SHA-256 `bf9f22ffa918d814b3a985c4043a31ba2890d3a8d6c2cf4aa7a06cd3888b55be`
- Review: 9,773 bytes, SHA-256 `a20b6924aa4b3b88ee34687b968948f701b9acf0c011e966b66906f57f8da61b`
- Build: 254,545 bytes, SHA-256 `14bebd3877fa518ef461f95c65b8f0e88088f23157b775859c4526a3aa24a4f6`
- Implementation: 9,711 bytes, SHA-256 `5395cd28f14d8333fbd53d7a9be24e378e2b903d476d597a77e98597759cebc0`

The manifest proves each bundled entrypoint is byte-identical to the prerequisite artifact generated in the same CI workspace.

## Authority boundary

Engineering Home is navigation/orchestration only. It does not:

- change Git or planning state;
- create implementation authority;
- approve a review;
- release/deploy software;
- infer that a task is supported because a card exists;
- hide partial/unavailable states.

## Acceptance criteria result

1. Five stable task-first jobs — **met**.
2. Explicit/test-backed readiness — **met**.
3. Matched/ambiguous/unrecognized routing — **met**.
4. Understand routes to bundled comprehension workspace — **met**.
5. Review routes to bundled Evidence Gap Focus — **met**.
6. Build exposes current authoring + implementation path while marked partial — **met**.
7. Fix remains partial and names diagnostic/failure gaps — **met**.
8. Release remains unavailable with no deployment action — **met**.
9. Lifecycle strip distinguishes strengths/gaps — **met**.
10. Exact bundled workspace hashes recorded — **met**.
11. Home has no network/repository write path — **met**.
12. CI retains Engineering Home — **met**.
13. Human acceptance remains separate — **met**.

## Roadmap

### Checkpoint D — Generic Build + Fix Authoring — next

- generalize Feature Studio authoring to `implementation-brief/v1`;
- support both currently verified feature families from the authoring UI;
- add a typed problem/failure intent contract;
- add a diagnostic working surface;
- let Build and Fix enter a common intent → implementation → evidence loop.

### Checkpoint E — Release + Operate Loop — after Build/Fix

- revision-bound release/deployment/runtime evidence contracts;
- product-owned release authority boundary;
- deployment execution receipt;
- runtime evidence and rollback semantics.

## Stop condition

**Reached.** An exact CI-tested Engineering Home artifact routes honestly across Build/Fix/Understand/Review/Release and bundles exact verified workspaces for the supported/partial tasks.

Human acceptance remains pending. Per explicit user instruction, work may proceed to Generic Build + Fix Authoring.