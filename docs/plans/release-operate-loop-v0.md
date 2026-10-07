# Release + Operate Loop v0

**Planning path:** durable single-contributor  
**Status:** complete — technical stop condition reached; human acceptance pending  
**Risk tier:** Tier 2 — repository-owned staging deployment + runtime evidence + rollback proof  
**Target:** PR #23 / `feature/review-workbench-v0`

## Outcome

Representation Router now has a revision/evidence-aware release path through a real repository-owned staging effect:

```text
Build / Fix / Review evidence
        ↓
Engineering Home bundle
        ↓
release-intent/v0
        ↓
release-plan/v0
        ↓
repository CI staging authority
        ↓
exact-byte deployment
        ↓
deployment-receipt/v0
        ↓
HTTP runtime observations
        ↓
actual rollback to retained previous bytes
        ↓
rollback-receipt/v0
        ↓
re-apply intended release
        ↓
refreshed Engineering Home
        ↓
second exact-byte staging proof
        ↓
human review
```

Human checkpoint:

> **Can a person see exactly what artifact is being released, to which environment, under whose authority, what actually deployed, what runtime checks observed, and how rollback behaved — without confusing a CI staging proof with production release authority?**

Human acceptance remains pending. The user explicitly authorized continued implementation without immediate artifact review.

## Proving environment

Target: `rr-ci-staging`

Owner: `brianmills-spec/representation-router GitHub Actions workflow`

Environment class: `ci-staging-sandbox`

Repository CI may copy generated artifacts into its own ephemeral staging directory and serve them over a local HTTP server during the job.

It may not:

- deploy to a production/product-owned environment;
- use product/cloud credentials;
- merge the PR;
- publish a GitHub Release;
- grant browser deployment authority;
- claim that staging success proves production reliability or human acceptance.

Production remains explicitly `not-connected-or-authorized`.

## Contracts implemented

`src/release-operate.mjs` defines:

- `release-intent/v0`
- `release-plan/v0`
- `deployment-receipt/v0`
- `runtime-observation/v0`
- `rollback-receipt/v0`

Key invariants:

- this tranche accepts only `ci-staging-sandbox` targets;
- authority must explicitly name GitHub Actions / repository CI staging scope;
- rollback is mandatory;
- deployment evidence requires exact source/deployed bundle hash equality;
- runtime success requires recorded HTTP 200 checks;
- rollback evidence requires exact equality with the retained previous snapshot;
- human review remains pending.

Production-like release intents are rejected.

## Real staging executor

`scripts/build-release-operate-v0.mjs` performs actual workspace effects:

1. hash the exact release subject and previous artifact;
2. retain a previous rollback snapshot;
3. initialize staging from the previous version;
4. replace staging with the release subject;
5. verify exact deployed bytes;
6. serve **the staged directory** over a local HTTP server;
7. record route observations;
8. actually replace staging with the rollback snapshot;
9. verify rollback bytes + observe the restored entrypoint;
10. re-apply the intended release;
11. observe it again;
12. retain all receipts and final staging bytes.

No external deployment API or credentials are used.

## Release + Operate surface

`src/release-operate-surface.mjs` leads with human questions:

1. **What are we releasing?**
2. **Where is it going?**
3. **Who is allowed to do this?**
4. **What actually deployed?**
5. **What did we observe after deployment?**
6. **Did rollback work?**
7. **What is true now?**
8. **What this does not prove**
9. **Technical details**

The primary language names **CI staging sandbox** and states that production is not connected.

## Static artifact self-reference boundary

A static Engineering Home cannot contain a receipt that hashes the complete Home including that receipt without creating a circular identity.

The tranche therefore records two separate facts:

1. **Release workflow proof** — built from a prerelease Home, then bundled into the refreshed Home as operational evidence.
2. **Refreshed-Home staging proof** — a sibling retained artifact that deploys/verifies the exact refreshed Home bytes, including its bundled Release route/evidence.

The Home does not pretend the first receipt proves its own complete byte hash.

## Exact final implementation run

Exact implementation head:

`817c3c6b22587e2047d94930f13f95afac71f4d2`

GitHub Actions run:

`35105986941`

The job completed successfully with:

- `npm ci` — success
- full repository test suite — success
- all Review Workbench builds — success
- Feature Studio v0 — success
- Engineering Studio v1 — success
- both Implementation Runner feature builds — success
- Fix proving build — success
- prerelease Engineering Home build — success
- first Release + Operate deploy/observe/rollback/reapply — success
- refreshed Engineering Home with Release evidence bundled — success
- exact refreshed-Home deploy/observe/rollback/reapply — success
- all configured artifact uploads — success

## First staging proof — release workflow evidence

Artifact:

- id `10450576097`
- name `release-operate-v0`
- GitHub artifact digest `sha256:6c20ff2313016fc1a893f2be63486cac73d6bd14e31afe8baf7f66a5ac4e0923`
- surface `index.html`: 11,275 bytes
- surface SHA-256 `5a6568288ccb65c0d6d36f5ace5a40da20808d8f55c7e62829a6d353966c2b32`

Release subject bundle:

`7660bf07167715a6f07631d351175a6fc35f4cabc418adad10d524a56d2251a4`

Previous staging bundle:

`9db44d8b5e26acb8c76d593860e59e0c7d55e6dd7df1260520f89fba5f8858bb`

The proof recorded:

- source/deployed hash match — `true`;
- six staged routes returned HTTP 200 after deployment;
- rollback restored the exact previous bundle — `true`;
- the intended release was re-applied;
- the same six routes returned HTTP 200 after re-apply;
- production remained `not-connected-or-authorized`;
- human review remained `pending`.

## Refreshed Engineering Home

Artifact:

- id `10449564995`
- name `engineering-home-v0`
- GitHub artifact digest `sha256:d8cefa99db7493dc8e8214a3978959f4b21d9f50f5919626d743a5c7098f1b3d`

Home root:

- 19,241 bytes
- SHA-256 `c69c784aefacd19b075f3323c9410ab4c2b321dd943d7aaf25806d6bed2dce2d`

Bundle manifest:

- SHA-256 `8e62c84110bd293aa8386ca6e8262f75f4044d6b86838b7064639ed31575f9d7`
- `releaseEvidenceBundled = true`

The Home bundles exact current entrypoints for:

- Understand — Review Workbench v1.2
- Review — Evidence Gap Focus
- Build/Fix — Engineering Studio v1
- Implementation — Saved Graph Layouts runner
- Fix proof — problem → diagnosis → implementation loop
- Release — first Release + Operate staging proof

Bundled Release entrypoint SHA-256:

`5a6568288ccb65c0d6d36f5ace5a40da20808d8f55c7e62829a6d353966c2b32`

This exactly matches the retained first Release + Operate surface.

Engineering Home capability truth now records:

- Release — `partial`
- Operate — `partial`
- production deployment — unavailable/not connected
- external telemetry/incidents — unavailable/not connected.

## Exact refreshed-Home staging proof

Artifact:

- id `10450292552`
- name `release-operate-final-home-v0`
- GitHub artifact digest `sha256:b1917f6312068f587a8e7f93ba66aa3ce28ff166b0ef1505f361a83fb590471f`
- surface SHA-256 `d3cec98aa20ee448c9e5dd97a496fb64ab98332a3562800d7028448c4c5f6c94`

Exact refreshed Home bundle deployed:

`3b519c360207e878395371b76ad80bdb2d206797c9725865aad3043d39fed056`

Previous prerelease Home bundle:

`7660bf07167715a6f07631d351175a6fc35f4cabc418adad10d524a56d2251a4`

The proof recorded:

- exact source/deployed bundle match — `true`;
- rollback to prerelease Home bundle — `true`;
- re-apply of exact refreshed Home bundle — `true`;
- `/` — HTTP 200;
- `/workflows/understand/index.html` — HTTP 200;
- `/workflows/review/index.html` — HTTP 200;
- `/workflows/studio/index.html` — HTTP 200;
- `/workflows/implementation/index.html` — HTTP 200;
- `/workflows/fix-proof/index.html` — HTTP 200;
- `/workflows/release/index.html` — HTTP 200 and contained the Release + Operate marker;
- production — `not-connected-or-authorized`;
- human review — `pending`.

## Acceptance criteria result

1. Release intent validates staging authority/rejects production-like targets — **met**.
2. Plan pins exact source + previous bytes — **met**.
3. CI staging deployment copies/verifies exact Home bytes — **met**.
4. Deployment receipt exists only after hash verification — **met**.
5. Runtime checks execute against the staged directory — **met**.
6. Required routes return HTTP 200 — **met**.
7. Observation proof limits are explicit — **met**.
8. Rollback actually restores retained previous bytes — **met**.
9. Rollback observation executes — **met**.
10. Intended release is re-applied/observed — **met**.
11. Release artifact retains intent/plan/deployment/runtime/rollback receipts — **met**.
12. Production stays disconnected/unavailable — **met**.
13. Home Release moves from unavailable to partial only after proof — **met**.
14. Browser surfaces gain no deployment credentials/write APIs — **met**.
15. CI retains Release + Operate, refreshed Home, and exact refreshed-Home proof — **met**.
16. Human acceptance remains pending — **met**.

## Authority boundary

Release + Operate v0 proves only repository-owned CI staging authority.

It does **not** create:

- production deployment authority;
- product/cloud credentials;
- release approval authority;
- production rollback authority;
- production telemetry provenance;
- production incident response capability.

## Roadmap after this tranche

### Checkpoint F — External Product/Environment Connector

Connect a real product-owned deployment/observability target with explicit:

- target identity;
- connection/credential permission boundary;
- approval policy;
- exact revision/stale behavior;
- deployment execution receipt;
- telemetry provenance;
- rollback authority.

This checkpoint requires an actual authorized product/environment connection. Do not substitute another local sandbox and call it production.

### Checkpoint G — General incident/operate workflows

Use product-owned logs, traces, metrics, incidents, and runtime evidence to extend Fix/Operate beyond static proving cases, while keeping ambiguity and authority explicit.

## Stop condition

**Reached.** CI actually deployed Engineering Home in the repository-owned staging sandbox, observed it over HTTP, proved rollback, re-applied the release, bundled the staging proof into a refreshed Home, and separately proved the exact refreshed Home bytes including the Release route.

Human acceptance remains pending. The next implementation checkpoint requires a real authorized external product/environment target.
