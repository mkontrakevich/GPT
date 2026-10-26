# HEALTH GAME CONSOLE × HROS — Integration Contract v1
Date: 2026-10-26. Status: **design + tested local read-only projection; not wired to public Cloudflare preview or HROS runtime**.

## Source systems
- **HROS** \`Kontrakevich/HROS-Web3D\` — canonical \`hros.snapshot.v1\` model, \`HROS_VERSION = 1.0.0\`, records with \`kind/status/visibility/source/version/perspectiveOwnerId\`. HROS controls people, relationships, memories, diary and confirmations.
- **Health Game Console** \`mkontrakevich/GPT\` branch \`feat/health-game-console-mvp\` — source of available physical measurements and user check-ins. The *public* Cloudflare demonstration is synthetic only; no real health data.
- Two systems stay separately owned and independently deployable. No snapshot overwrite, shared browser localStorage key, cross-origin access hack, or automatic sync.

## Proposed combined user journey
1. Main 3D Living World retains HROS six life areas, including Health.
2. Health node opens the clinical-data-independent Game Console Health module (resting HR, sleep, gait, recovery). Separate Mind/Diary panel is a user-reported check-in, not a clinical mental-health diagnosis.
3. User can selectively propose a context link from a *confirmed* HROS record to a chosen health check-in. They see the exact source, purpose and retention; default is off.
4. User edits/rejects the proposed connection. A projected context is a hypothesis, **not** a verified explanation of HR, sleep or emotional state.
5. Any HROS semantic/living memory update goes through its existing DiarySession -> ChangeSet -> UserConfirmation -> commit; the bridge never commits records.
6. Data may be revoked and subsequently excluded from future read models. Cross-system backend access must later enforce tenant isolation and versioned revocable consent.

## Read-only adapter in this branch
\`integrations/hros-context-bridge.mjs\` implements a *local explicit-review preview*:
- input: HROS v1 snapshot + time-scoped, purpose-scoped *local approval proposal* listing record IDs;
- accept only private, confirmed/finalized, explicitly selected record IDs with valid version and timestamp;
- strip all statement text, person IDs, relationships, source labels, emotions and message/transcript content;
- output: \`hgc.hros-context.v1\` marked \`state:'review_only'\`, \`requiresReview:true\`, \`transferAuthorized:false\`;
- never mutates HROS, sends a network request, or reads localStorage.
This adapter **does not verify a cryptographic consent token or make a transfer authorized**. It is for synthetic tests and a future private UX, NOT a data bridge from public HROS Pages into public Cloudflare.

## Governance / safety
- Never correlate medical measurements and partner interactions to assert partner blame, love score, diagnosis, mental-health status, or causation.
- Preserve HROS prohibition of global human ratings, partner/parent scores, punishment for gaps, FOMO, lootboxes, or rewards for exposing sensitive information.
- Keep third-party privacy; sharing a person's narrative with a health product needs a meaningful purpose and appropriate consent.
- Restrict all real data to private deployments and protected storage; audited origin+timestamps. None in public GitHub, Cloudflare Workers logs, or demo fixtures.
- Do not claim Apple Health/Zepp data can be automatically read from this website or ChatGPT connector. Authorized ingestion needs separate architecture.

## Acceptance gates for future production
- [x] Read existing HROS ontology, lifecycle, privacy, and source code for schema compatibility.
- [x] Create read-only projection adapter + synthetic no-leak/no-mutation tests in HGC source branch.
- [ ] Separate private production repository and protected deploy, per Health Game Console release gate.
- [ ] Write a versioned HROS approval UX + persistent revocation contract in HROS (with approval from user before changing HROS repo).
- [ ] Implement authenticated and authorized cross-system endpoint, not localStorage scraping.
- [ ] 3D navigation integration and cross-system deep linking with mobile QA.
- [ ] Independent end-to-end tests with synthetic data followed by explicit user acceptance.

### Engineering direction
Use existing GitHub actions → Cloudflare Workers/Static Assets, optionally D1 for private, authorized event records. HROS legacy FastAPI/PostgreSQL backend is not to be moved automatically or removed. Reuse its \`Source Inspector\`, \`Change Set\`, privacy policy, and 3D Living World, not its stored personal records.
