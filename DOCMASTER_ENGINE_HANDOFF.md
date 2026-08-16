# DOCMASTER ENGINE V1 — MASTER HANDOFF / CONTEXT TRANSFER

> Purpose: transfer the complete working context from the long-running ChatGPT architecture/review conversation into Codex + Antigravity so they can continue directly from the repository without the user acting as a relay.
>
> IMPORTANT: this document is a handoff, not a substitute for repository truth. Every agent must verify Git, source, tests and runtime before changing code. If this handoff conflicts with the repository, repository evidence wins and the discrepancy must be reported.

---

## 0. ONE-SENTENCE PRODUCT INTENT

The complete CNH edited in `/cnhcria` / Engine / Studio is the **MASTER composition**. Wallet APP surfaces `FRONT`, `BACK` and `MRZ` should eventually derive from the corresponding MASTER sections so a single master edit propagates automatically to PRINT and the relevant APP surface. The APP QR remains independent.

---

## 1. GOVERNANCE / OPERATING RULES

- Primary branch/worktree for this Engine line:
  - branch: `checkpoint/engine-3b3d-line`
  - historical worktree: `c:\Users\ricky\Desktop\docmaster-engine-line`
- Never use destructive Git:
  - `git reset --hard`
  - `git clean -fd`
  - `git restore .`
  - force push
- Never use `git add .` or `git add -A` for checkpoints. Stage exact intended files individually.
- Before commits:
  - `git status --short`
  - `git diff --name-only`
  - `git diff --stat`
  - `git diff --check`
  - relevant focused tests
  - Engine typecheck
  - CNH typecheck
  - preserve known non-CNH baseline
  - build
  - staged/cached diff audit
- No push / deploy / merge unless explicitly authorized.
- No production default switch unless explicitly authorized.
- Do not mix `/consultas` work into this Engine branch.
- Do not silently alter backend/D1/persistence to solve rendering architecture.
- If a product choice is genuinely ambiguous, stop and ask. If the work is mechanical, verified, local and safe, continue autonomously.
- Maintain a concise rolling state after each checkpoint:
  - branch
  - HEAD
  - parent
  - working tree
  - completed slice
  - current slice
  - tests
  - Engine TS
  - CNH TS
  - non-CNH baseline
  - build
  - blockers/debt

---

## 2. CURRENT RESUME POINT — AUTHORITATIVE HANDOFF TARGET

### Latest committed checkpoint

- branch: `checkpoint/engine-3b3d-line`
- HEAD: `490dac1`
- parent: `e741502`
- commit:
  - `feat(engine): add master region projection primitives`
- tree at that commit: CLEAN
- no push
- no deploy

### Current uncommitted state after HEAD `490dac1`

The conversation stopped after:

`PHASE 3B.8B.3C.1 — CNH REGION / MEMBERSHIP / PARITY FINAL FACT CHECK`

Reported working tree:
- 4 modified
- 4 untracked
- no commit
- no push
- no deploy

**Do not assume the exact 8 filenames from memory. Inspect the repository first and preserve the actual uncommitted work.**

### Reported 3B.8B.3C.1 facts that must be verified from source before commit

Proposed master regions:

- FRONT `region_cnh_front`
  - `{ x: 180, y: 380, width: 1050, height: 650 }`
- BACK `region_cnh_back`
  - `{ x: 180, y: 1050, width: 1050, height: 700 }`
- MRZ `region_cnh_mrz`
  - `{ x: 250, y: 2180, width: 1900, height: 260 }`

Reported master memberships:

FRONT = 16 concrete master elements:
- `elem_cnh_photo`
- `elem_cnh_assinatura`
- `elem_cnh_espelho_lateral_top`
- `elem_cnh_nome`
- `elem_cnh_primeira_habilitacao`
- `elem_cnh_nascimento`
- `elem_cnh_data_emissao`
- `elem_cnh_validade`
- `elem_cnh_acc`
- `elem_cnh_doc_identidade`
- `elem_cnh_cpf`
- `elem_cnh_registro`
- `elem_cnh_categoria`
- `elem_cnh_nacionalidade`
- `elem_cnh_nome_pai`
- `elem_cnh_nome_mae`

BACK = 19 concrete master elements:
- `elem_cnh_espelho_lateral_bottom`
- `elem_cnh_nome_estado_extenso`
- `elem_cnh_observacoes`
- `elem_cnh_local_emissao`
- `elem_cnh_ass_digital_1`
- `elem_cnh_ass_digital_2`
- 13 category cells:
  - `elem_cnh_cat_a`
  - `elem_cnh_cat_a1`
  - `elem_cnh_cat_b`
  - `elem_cnh_cat_b1`
  - `elem_cnh_cat_c`
  - `elem_cnh_cat_c1`
  - `elem_cnh_cat_d`
  - `elem_cnh_cat_d1`
  - `elem_cnh_cat_be`
  - `elem_cnh_cat_ce`
  - `elem_cnh_cat_c1e`
  - `elem_cnh_cat_de`
  - `elem_cnh_cat_d1e`

MRZ = 1 element:
- `elem_cnh_mrz`

Reported:
- `elem_cnh_linha_divisoria` does **not** exist as a dynamic master element; it is static background artwork and must not be counted as dynamic membership.

### Important discrepancy to resolve before commit

The last report says Wallet BACK count = 10 and classifies:
- 4 `MASTER_DERIVED_WITH_OVERRIDE`
- 6 `PROFILE_ONLY`

But it also appears to mention `back.espelho` as both a derived element and a “base” profile-only element. Verify whether these are truly two distinct Wallet elements or a reporting/double-count error.

Every Wallet BACK element must have exactly one linkage classification.

### Immediate next safe action

Perform the final pre-commit reconciliation, then — only if clean — checkpoint the 3B.8B.3C work.

Suggested commit message:
`feat(cnh): define master regions and wallet projection map`

After a clean commit:
- parent must be `490dac1`
- tree CLEAN
- no push/deploy
- continue to Wallet FRONT migration only.

---

## 3. FROZEN PRODUCT ARCHITECTURE

### 3.1 MASTER composition

The full CNH composition used by `/cnhcria` / Engine / Studio is the authoritative layout.

Target model:

```text
CNH MASTER / PRINT
2481×3508
        |
        +--> FRONT section --> Wallet FRONT
        |
        +--> BACK section  --> Wallet BACK
        |
        +--> MRZ section   --> Wallet MRZ

Wallet QR:
independent surface
not region-projected
```

### 3.2 The key invariant

A master edit must propagate:

```text
move/resize master element
        ↓
PRINT changes
        ↓
projected APP geometry changes automatically
```

The user must not have to edit the same field twice.

### 3.3 `MASTER_DERIVED_WITH_OVERRIDE` semantics

This is critical.

It must **not** mean:
- ignore the master-projected geometry
- replace it with an independent absolute Wallet `x/y/width/height`

It must mean:

```text
MASTER geometry
→ section projection
→ projected target geometry
→ relative target-space override
→ effective Wallet geometry
```

Typical relative override:
- `translateX`
- `translateY`
- `scaleX`
- `scaleY`

Therefore:
- master `x/y` changes propagate automatically
- master `width/height` changes propagate automatically
- the profile delta remains constant

Any future absolute replacement geometry for a master-derived element is a regression back to a second authority.

### 3.4 Explicit ownership categories

The current generic concept is:

- `MASTER_DERIVED`
  - requires `sourceElementId`
- `MASTER_DERIVED_WITH_OVERRIDE`
  - requires `sourceElementId`
- `PROFILE_ONLY`
  - must not have `sourceElementId`

Use explicit stable element IDs.
Do not link by array index, label text or visual position.

---

## 4. GENERIC PROJECTION CORE — COMMITTED AT `490dac1`

Commit:
`feat(engine): add master region projection primitives`

Generic Core primitives were introduced without CNH IDs.

Reported/frozen contract:

### `LayoutRegion`

Minimal:
- `id`
- optional `name`
- `sourceRect { x, y, width, height }`

No speculative `metadata`.

### `DerivedElementLink`

Discriminated union:
- `MASTER_DERIVED` + `sourceElementId`
- `MASTER_DERIVED_WITH_OVERRIDE` + `sourceElementId`
- `PROFILE_ONLY` + no `sourceElementId`

### Pure projection math

Region-local projection concept:

```text
localX = geometry.x - sourceRect.x
localY = geometry.y - sourceRect.y

scaleX = targetWidth / sourceWidth
scaleY = targetHeight / sourceHeight

projectedX = localX * scaleX + translateX
projectedY = localY * scaleY + translateY

projectedWidth  = geometry.width  * scaleX
projectedHeight = geometry.height * scaleY
```

- target translation is target-space only
- Core does not round
- float precision preserved
- source objects are not mutated
- non-uniform scale is supported generically
- visibility can be calculated without destructive clipping

At committed HEAD `490dac1`, `LayoutDefinition.regions` had **not yet** been integrated.

---

## 5. CURRENT UNCOMMITTED 3B.8B.3C DESIGN

The uncommitted work was reported to add:

- optional `LayoutDefinition.regions?: readonly LayoutRegion[]`
- generic region validation
- generic `RelativeGeometryOverride`
- `applyRelativeOverride`
- CNH-specific region definitions
- explicit CNH section membership
- Wallet projection/linkage maps
- test-only proof that master projection + relative override reproduces current Wallet geometry without becoming runtime authority yet

Reported relative override math:

```text
effective.x      = projected.x + translateX
effective.y      = projected.y + translateY
effective.width  = projected.width  * scaleX
effective.height = projected.height * scaleY
```

This must remain:
- projection first
- relative override second
- no rounding
- immutable
- no semantic data mutation

Current runtime authority remains legacy `walletGeometry.ts` until the actual Wallet migration phase.

---

## 6. PRINT CANONICAL SPACE / MEDIA SSOT

### Canonical PRINT output

The coordinate-space audit closed a prior ambiguity:

- CNHLayout source space: `2481×3508` @ 300 DPI
- Studio/D1 space: `2481×3508`
- Engine `LayoutDefinition.canvas`: `2481×3508`
- resolved output canvas: `2481×3508`
- canvas renderer: `2481×3508`
- PDF/JPEG export: `2481×3508`

`1800×2550` is not the canonical Engine PRINT output; it was classified as legacy/intermediate reference only.

### PHOTO master frame

Current authoritative frame:
- `{ x: 314, y: 558, width: 263, height: 322 }`
- owner: `cnhLayout.foto`
- fit: `cover`

### SIGNATURE master frame

Current authoritative frame:
- `{ x: 333, y: 893, width: 236, height: 68 }`
- owner: `cnhLayout.assinatura`
- fit: `contain`

### Media placement SSOT checkpoint

Commit:
`e741502`
parent:
`4b4b35b`

Commit message:
`feat(cnh): synchronize media framing with print layout`

Files:
- new `client/src/lib/cnh/rendering/mediaPlacement.ts`
- new `tests/cnh/engine/cnhMediaPlacement.test.ts`
- modified `client/src/lib/cnh/rendering/index.ts`
- modified `client/src/lib/cnh/index.ts`
- modified `client/src/pages/CNHCria.tsx`

Canonical helpers:
- `computePhotoPlacement`
- `computeSignaturePlacement`

Reported:
- PHOTO scale: 0.4..3.5
- PHOTO X/Y limits dynamic, source-aspect-aware
- SIGNATURE scale: 0.5..3.0
- SIGNATURE X: `[-frameWidth*0.5, frameWidth*0.5]`
- SIGNATURE Y: `[-frameHeight*0.8, frameHeight*0.8]`
- signature `clipToFrame: true`

---

## 7. CROSS-PROFILE MEDIA — IMPORTANT FUTURE WORK

The geometry problem and the media-framing problem are related but not identical.

Current truth:
- PRINT and Wallet use the same original photo/signature source URLs.
- PRINT consumes:
  - `fotoScale`
  - `fotoOffsetX`
  - `fotoOffsetY`
  - `assScale`
  - `assOffsetX`
  - `assOffsetY`
- Wallet historically used default/static media presentation and did not consume the same adjustment intent.

Critical issue:
- PRINT PHOTO frame aspect ratio differs from Wallet PHOTO frame aspect ratio.
- Simple multiplication of master pixel offsets by projection scale is not guaranteed to preserve the same human framing intent.
- PHOTO uses `cover`.
- SIGNATURE uses `contain`.
- Do not reuse PHOTO math blindly for SIGNATURE.

### Future target

The user adjusts media once in `/cnhcria` and the APP follows automatically.

Likely future compatibility model:
- derive normalized focal point / zoom intent from current persisted PRINT adjustment state
- map that intent into the projected Wallet frame
- keep the same original media source
- do not introduce independent Wallet adjustment state
- avoid persistence/D1 migration initially if a pure compatibility conversion can preserve semantics

Do not claim cross-profile media synchronization complete until this has been mathematically proven and tested.

---

## 8. WALLET CURRENT REALITY — SECOND COMPOSITION CONFIRMED

The audit confirmed:
- Wallet field geometry is **not** master-derived today.
- Wallet maintains a separate/manual authoritative geometry in `walletGeometry.ts`.
- Studio/D1 master layout changes affect PRINT but do not currently propagate to Wallet.
- This is the duplication being eliminated.

Wallet source/output:
- FRONT: source 963×680 → output 680×963 with -90° presentation
- BACK: source 963×680 → output 680×963
- MRZ: source 963×680 → output 680×963
- QR: 680×680 independent

Optimized/static Wallet background assets may remain profile-specific:
- `parte_superior.jpg`
- `parte_inferior.jpg`
- `codigo_mrz.jpg`

The target architecture does **not** require runtime cropping of the A4 raster.

Preferred:
- master dynamic geometry is authoritative
- Wallet background rasters remain optimized profile assets
- explicit profile-specific semantic/presentation overrides remain where legitimate

---

## 9. WALLET APP PRESENTATION / ORIENTATION HISTORY

Commit `4b4b35b` aligned APP presentation orientation.

Current intended APP display:
- FRONT/BACK/MRZ appear rotated -90° CCW
- QR remains square/centered
- raw renderer geometry and presentation wrapper are separate concerns

External reference:
- `cnh-digital.pages.dev` was used only as an external visual/behavioral reference.
- It is **not** project infrastructure.
- It is **not** staging.
- It is **not** a domain to allowlist or reuse.

Official production-facing CNH domain direction:
- `https://carteira-digital-transito-vio.digital/`

Production must remain hard-denied for remote Engine preview until an explicit safe staging architecture is approved.

---

## 10. LEGITIMATE WALLET-SPECIFIC DIFFERENCES

Do not force every Wallet behavior to become a literal master projection.

Known/profile-specific candidates:

### FRONT
- APP output canvas/orientation
- responsive/display wrapper
- visual `photoFrame` may remain `PROFILE_ONLY`
- some text typography/style may remain profile-specific
- large legacy layout deltas may remain as **relative** overrides while still preserving master propagation

### BACK
- categories:
  - PRINT = 13-cell grid
  - Wallet = A/B/C/D rows
  - this is a Wallet-specific semantic presentation
- observations:
  - shared data
  - Wallet historical single-line presentation
- assDigital:
  - known Wallet composite/fallback debt
  - do not “fix” casually during geometry migration
- state/local text may require relative geometry/style overrides

### MRZ
- semantic content remains shared/canonical
- Wallet alignment and 70px line spacing may remain profile-specific raster/presentation rules
- do not recompute MRZ semantics in renderer

### QR
- Wallet QR page is explicitly excluded from master region projection
- shared semantic identity/content remains canonical
- presentation stays profile-specific

---

## 11. TRUSTED IDENTITY / SECURITY SEMANTICS

Frozen identity model:

```ts
type ResolveDocumentRuntimeContext =
  | { readonly mode: 'preview'; readonly identity?: EmissionIdentity }
  | { readonly mode: 'emitted'; readonly identity: EmissionIdentity };
```

Semantics:
- `documents.id` = `emissionId`
- `codigo_validacao` = `validationId`
- `codigo_qr` = legacy alias, not trusted identity
- Engine must not introduce `validationId ↔ emissionId` fallbacks
- renderer must not recompute QR/MRZ
- preview/emitted identity rules must remain explicit

---

## 12. ENGINE RESOLUTION ARCHITECTURE — FROZEN PRINCIPLES

`resolveDocument()` produces a pure resolved document model.

Core principles:
- CanonicalData is SSOT for business data.
- Legacy adapter contains no geometry/presentation ownership.
- `emissionId` comes only from context.
- Resolvers are pure.
- Geometry belongs to definitions/layouts/profiles, not adapters.
- Multipage model uses stable IDs.
- Renderers consume resolved output; they should not recompute business/security semantics.

Element families already established:
- TEXT
- IMAGE
- SHAPE
- LINE
- PHOTO
- SIGNATURE
- QR
- MRZ

Specialization:
- one optional extension V1, not a registry
- specialized text marker supported
- generic hooks cannot rescue invalid definitions

---

## 13. HISTORICAL COMMIT LINE — ENGINE / CNH

Major known checkpoints in this line:

- `5fe1b3c` baseline
- `eed95d4` Studio editor geometry V1/V2 loading
- `3811621` include template background in admin template reads
- `238204f` Geometry Bridge Phase 1
- `6368f8e` Phase 2A canonical render input/profile model
- `c3ffb7d` Phase 2B centralize MRZ/validation URL
- `1bee492` Phase 2C externalize wallet front/back geometry
- `c4db93f` Phase 2D wallet renderer canonical
- `372d2b8` Phase 2E.1 print canonical data/runtime identity
- `8a86d34` Phase 2E.2 intermediate asset fallback
- `0c5113b` validation nested data fix
- `6df4feb` Phase 2E.2 final renderer checkpoint
- `d3dc365` validation query/public DTO hardening
- `c4de30a` Engine V1 Phase 1 core contracts/invariants
- `c90d997` generic legacy adapter contracts
- `ce764e4` CNH legacy adapter
- `15aa22f` multipage resolved render contracts
- `49c79d0` pure document/text resolver
- `93e87a5` static image resolver
- `559c048` shape resolver
- `3ad8624` line resolver
- `7b9def9` PHOTO/SIGNATURE generic pure resolvers
- `ed80270` generic media presentation specialization
- `58b5d12` CNH media presentation specialization
- `61a2bc1` trusted runtime specialization contracts
- `9528c30` generic QR resolver
- `7634f83` generic MRZ resolver
- `f2175cd` CNH QR + MRZ specialization
- `ce8c5f8` generic specialized text resolution
- `21c78d5` test-only stale QR/MRZ reconciliation
- `90a5085` CNH derived text specialization
- `8f64d5b` harden derived text fallbacks
- `826ab88` `feat(cnh): materialize print engine definitions`
- `93b33fc` `feat(cnh): add resolved print renderer bridge`
- `bb2e36f` `fix(cnh): align resolved print raster parity`
- `10de0ce` `feat(cnh): add safe engine preview selection`
- `5f010bf` `feat(cnh): integrate safe engine print preview`
- `b212f37` `feat(cnh): materialize wallet engine definitions`
- `399f556` `feat(cnh): add resolved wallet renderer bridge`
- `340dee3` `fix(cnh): align wallet browser parity`
- `007a49c` `feat(cnh): integrate safe engine wallet preview`
- `4b4b35b` APP Wallet display orientation checkpoint
- `e741502` `feat(cnh): synchronize media framing with print layout`
- `490dac1` `feat(engine): add master region projection primitives`

Do not assume every historical commit is the current authority; use this as context for why the code looks the way it does.

---

## 14. PRINT DEFINITION / RENDERER HISTORY

PRINT definitions checkpoint:
`826ab88`

Known IDs:
- document: `doc_cnh_v1`
- form: `form_cnh_v1`
- asset set: `assetset_cnh_v1`
- render profile: `profile_cnh_print`
- page: `page_cnh_print`
- layout: `layout_cnh_print`

Base asset:
- `/assets/cnh_base_template.png`
- 2481×3508

Resolved PRINT renderer checkpoint:
`93b33fc`

Principles:
- background comes from resolved page/base asset
- no renderer semantic recomputation
- export from resolved canvas
- QR exact content
- MRZ exact lines
- logical output 2481×3508

PRINT parity/raster behavior had been closed before the master-region work. Preserve it.

---

## 15. WALLET HISTORY / PARITY

Wallet definitions checkpoint:
`b212f37`

Resolved Wallet renderer:
`399f556`

Wallet browser/raster parity:
`340dee3`

Known historical parity:
- FRONT ~100%
- BACK had a small known SP mojibake difference historically
- MRZ 100%
- QR 100%
- stress cases 100%

Real caller integration:
`007a49c`

Caller:
- `/habilitacao?cpf=...`
- `CNHHabilitacao.tsx`

Behavior:
- legacy default
- Engine opt-in only under local/dev query path
- trusted identity strict
- no production-default switch

APP orientation wrapper:
`4b4b35b`

Preserve legacy/public behavior while migrating Engine internals.

---

## 16. LOCAL FULL-STACK / INFRA

Known proven local command:

```bash
npx wrangler pages dev dist --port 8788 --ip 127.0.0.1
```

Historical successful command also existed on port 5173.

Cloudflare audit conclusions:
- ordinary Pages preview against production D1 is unsafe
- production project: `docmaster`
- production D1 binding: `env.DB` → `docmaster-db`
- ordinary preview can share production data unless explicitly isolated
- app has write-capable endpoints
- therefore do **not** deploy a random branch preview against production D1
- safe future remote preview should use separate staging project + separate staging D1
- production personal data is not required; synthetic staging data is sufficient
- no staging infra had been created at the time of the audit
- branch push may be safe when authorized; remote deploy was not yet safe

Known production-related domains from audit:
- `docmaster.store`
- `validaratestado.digital`
- `carteira-digital-transito-vio.digital`

Do not treat any external reference domain as staging.

---

## 17. SEPARATE / PARALLEL WORK — DO NOT MIX

### `/consultas`
Completely separate workstream.
Do not integrate its dirty/uncommitted work into Engine checkpoints.

### `validacao-cnh`
Separate validator repo.
Historical commits exist there.
No push/deploy unless explicitly authorized.

### Non-CNH type errors
Historical baseline:
- non-CNH TS errors: 122

Do not “fix unrelated type debt” inside Engine slices unless explicitly requested.

---

## 18. CURRENT HEALTH BASELINES

At `490dac1`:
- full repo: `1409 PASS / 0 FAIL`
- Engine TS: `0`
- CNH TS: `0`
- non-CNH TS: `122` historical baseline
- build: PASS

After reported uncommitted 3B.8B.3C work:
- full repo: `1417 PASS / 0 FAIL`
- Engine TS: `0`
- CNH TS: `0`
- non-CNH TS: `122`
- build: PASS

These counts are historical expectations, not substitutes for rerunning current tests.

---

## 19. IMMEDIATE NEXT PHASES

### Phase A — finish 3B.8B.3C fact-check + commit checkpoint

Before commit:
1. inspect actual 8 uncommitted files
2. reconcile BACK count/linkage discrepancy
3. verify region boundaries are structurally supported
4. verify no stale/invented master IDs
5. verify `linha_divisoria` absent from dynamic membership
6. verify no independent absolute replacement geometry in derived maps
7. verify propagation tests
8. rerun health gates
9. stage exact files
10. commit if clean

Suggested checkpoint:
`feat(cnh): define master regions and wallet projection map`

### Phase B — Wallet FRONT master-derived runtime migration

Migrate only FRONT.

Target flow:

```text
master PRINT element
→ region_cnh_front
→ projectElementGeometry
→ relative override
→ effective Engine Wallet FRONT geometry
```

Rules:
- do not migrate BACK simultaneously
- do not migrate MRZ simultaneously
- do not touch QR
- legacy runtime geometry may remain as legacy path/parity oracle
- new Engine FRONT authority should become master-derived
- preserve current browser/pixel parity
- preserve local/dev opt-in gating
- no production default switch

### Phase C — PHOTO/SIGNATURE cross-profile framing

After frame geometry is derived, solve content framing intent:
- same source image
- same user adjustment intent
- no separate Wallet media state
- likely normalized focal/zoom compatibility layer
- PHOTO and SIGNATURE handled separately because cover vs contain
- avoid persistence migration unless a pure conversion is impossible

### Phase D — Wallet BACK master-derived migration

Derive truly shared/master fields.
Keep explicit semantic/presentation exceptions:
- categories
- observations presentation
- assDigital composite/debt

### Phase E — Wallet MRZ master-derived migration

Share master MRZ semantics/geometry relationship.
Keep Wallet-specific raster spacing/alignment as explicit presentation override.
Do not recompute MRZ semantics.

### Phase F — local full-stack/browser proof

Validate real `/habilitacao` behavior.
Preserve orientation, responsive wrapper, PDF/share compatibility if applicable.

### Phase G — staging design

Only after local proof:
- separate staging project
- separate staging D1
- synthetic data
- safe host allowlist/guard
- production remains denied

### Phase H — push / staging deploy / user manual fine-tuning

The user explicitly wants notice when the Engine milestone is ready for:
- branch push
- preview/staging deploy
- manual visual fine-tuning

Do not push/deploy without explicit authorization.

---

## 20. FUTURE IDEAS / PRODUCT DIRECTION FROM THE CONVERSATION

These are not all implemented, but they are intentional future direction and should not be lost.

### Master-first authoring
The user wants to edit the complete CNH once and have relevant APP sections follow automatically.

### Studio as the real document authoring surface
Long-term:
- Studio should create/edit documents
- layout is not just a preview skin
- fields/coordinates are Engine-owned
- bounding boxes/handles only when selected
- normal document view remains clean

### Multiple render profiles
Same CanonicalData can render:
- PRINT
- Wallet FRONT
- Wallet BACK
- Wallet MRZ
- QR
- future profiles

Shared data does not imply identical presentation, but duplicated authoritative geometry should be avoided where the APP is logically a projection of the master document.

### Region projection model
Preferred principle:
- derive by default
- override only for genuine profile differences
- profile override should be relative, not a second absolute authority

### Media intent
Preferred future representation:
- original source media
- canonical user framing intent
- profile frame geometry
- profile-specific fit semantics
- no double-cropping / no raster-to-raster crop pipeline

### No “crop the final A4 JPEG” shortcut
Do not implement Wallet as a bitmap crop of the final PRINT export.
Projection should remain logical/native so quality and semantics stay reusable.

---

## 21. KNOWN DEBTS / DO NOT ACCIDENTALLY “FIX”

- Wallet assDigital legacy fallback/composite behavior
- historical SP mojibake issue
- Wallet observations single-line compatibility
- non-CNH TS baseline 122
- `/consultas` parallel dirty work
- production preview/staging not yet safely isolated
- cross-profile media focal/zoom transport not yet complete

Treat these as explicit debt unless the active phase targets them.

---

## 22. STOP CONDITIONS FOR AUTONOMOUS CODEX WORK

Stop and ask the user only if:
- destructive Git would be required
- push/deploy/merge is required
- production default behavior must change
- schema/D1 migration is required
- user data could be affected
- a product choice has multiple materially different valid outcomes
- exact region truth contradicts current code/asset evidence
- media framing cannot be preserved without changing persisted semantics
- tests expose a regression that cannot be conservatively fixed
- Core would need CNH-specific branching or a large redesign

Otherwise:
- inspect
- implement
- test
- checkpoint
- continue

---

## 23. AGENT STARTUP CHECKLIST

On every new Codex/Antigravity session:

1. Read this document.
2. Inspect:
   - branch
   - HEAD
   - working tree
   - untracked files
   - last 3–5 commits
3. Verify the current rolling `ENGINE_STATE.md` if present.
4. Never discard uncommitted work from the previous session.
5. Compare repository truth against this handoff.
6. Continue from the last safe checkpoint / active slice.
7. Update rolling state after each checkpoint.

---

## 24. SOURCE-OF-TRUTH PRIORITY

When information conflicts, use this order:

1. current repository source
2. current Git history / diff
3. current executable tests and runtime
4. committed definition contracts
5. this handoff
6. old reports / historical assumptions

Do not preserve an old claim merely because it appears in this file.

---

## 25. TARGET END STATE FOR THIS ENGINE LINE

The target milestone is reached when:

- master CNH authoring is authoritative
- Wallet FRONT derives from master + explicit relative overrides
- Wallet BACK derives from master where semantically applicable
- Wallet MRZ derives from master semantics/geometry relationship
- Wallet QR remains independent
- photo/signature adjustment intent propagates from `/cnhcria` to Wallet without a second manual state
- current visual/browser parity is preserved
- local full-stack behavior is proven
- safe staging infra is explicitly isolated from production
- branch is ready for authorized push and staging deployment
- user can perform manual visual fine-tuning on staging
- production default remains unchanged until separately approved

---

END OF MASTER HANDOFF
