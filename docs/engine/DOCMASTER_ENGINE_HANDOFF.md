# DOCMASTER ENGINE V1 — MASTER HANDOFF

## Purpose

This document transfers the technical context accumulated during the long-running Engine architecture/review conversation into Codex and Antigravity.

It contains past decisions, current state, future intent, known debt and governance.

It is not a substitute for repository truth. Verify source, Git, tests and runtime before modifying code.

---

# 1. Product goal

The complete CNH edited through `/cnhcria` / Engine / Studio is the MASTER composition.

Target:

```text
CNH MASTER / PRINT
2481×3508
        |
        +-- FRONT section --> Wallet FRONT
        |
        +-- BACK section  --> Wallet BACK
        |
        +-- MRZ section   --> Wallet MRZ

Wallet QR
--> independent surface
```

The user must be able to adjust the master document once and have the corresponding APP regions follow automatically.

Do not solve this by cropping the final A4 raster.

The preferred architecture is logical element projection at native target resolution.

---

# 2. Governance

Primary Engine line:

`checkpoint/engine-3b3d-line`

Historical Engine worktree:

`c:\Users\ricky\Desktop\docmaster-engine-line`

The current machine/repo may use a different path. Git truth wins.

Never use destructive Git:
- `reset --hard`
- `clean -fd`
- `restore .`
- force push

Never stage whole-tree blindly:
- no `git add .`
- no `git add -A`

Before commit:
- audit exact files
- `git diff --check`
- focused tests
- Engine typecheck
- CNH typecheck
- preserve non-CNH baseline
- build
- cached diff audit
- stage exact files only

No push, deploy, merge, production default switch, schema migration or D1 mutation unless explicitly authorized.

Do not mix `/consultas`.

---

# 3. Current resume point

Latest committed checkpoint:

- HEAD: `490dac1`
- parent: `e741502`
- commit: `feat(engine): add master region projection primitives`
- tree was clean immediately after that commit
- no push
- no deploy

The conversation then continued with uncommitted Phase `3B.8B.3C` work.

The last completed review was:

`PHASE 3B.8B.3C.1 — CNH REGION / MEMBERSHIP / PARITY FINAL FACT CHECK`

Historical report at that point:
- HEAD still `490dac1`
- working tree: 4 modified + 4 untracked
- no commit
- no push
- no deploy

Do not assume those exact files still exist. Inspect the repository and preserve actual uncommitted work.

Immediate next gate:
- reconcile the current 3B.8B.3C diff
- resolve any BACK linkage/count discrepancy
- commit only if all facts/tests are clean
- suggested commit message:
  `feat(cnh): define master regions and wallet projection map`

---

# 4. Generic projection Core — committed at 490dac1

Core is generic and must remain document-agnostic.

Known primitives:

## LayoutRegion

Minimal contract:
- `id`
- optional `name`
- `sourceRect { x, y, width, height }`

No speculative generic metadata.

## DerivedElementLink

Discriminated semantics:
- `MASTER_DERIVED` requires `sourceElementId`
- `MASTER_DERIVED_WITH_OVERRIDE` requires `sourceElementId`
- `PROFILE_ONLY` forbids `sourceElementId`

## Projection math

Conceptual pure formula:

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

Rules:
- translation is target-space post-projection
- no Core rounding
- floating precision preserved
- immutable inputs
- non-uniform scale is supported generically
- no CNH IDs in Core

At committed HEAD `490dac1`, `LayoutDefinition.regions` was not yet integrated.

---

# 5. Current uncommitted 3B.8B.3C architecture

The uncommitted work was reported to introduce:

- optional `LayoutDefinition.regions?: readonly LayoutRegion[]`
- generic region validation
- `RelativeGeometryOverride`
- pure `applyRelativeOverride`
- CNH-specific master region definitions
- explicit section membership
- Wallet linkage/projection maps
- test-only legacy parity proof
- no Wallet runtime migration yet

Required relative-override semantics:

```text
effective.x      = projected.x + translateX
effective.y      = projected.y + translateY
effective.width  = projected.width  * scaleX
effective.height = projected.height * scaleY
```

This is intentionally relative.

Forbidden long-term model:

```text
MASTER_DERIVED_WITH_OVERRIDE
but effective geometry comes from independent absolute Wallet x/y/w/h
```

That would recreate the second authority.

---

# 6. Reported section regions — verify before freezing

The last fact-check reported:

## FRONT

`region_cnh_front`

`{ x: 180, y: 380, width: 1050, height: 650 }`

Reported structural explanation:
- left 180: upper lateral mirror margin
- top 380: start of identification block
- right 1230: right boundary near first-license/category fields
- bottom 1030: filiation/signature lower boundary

## BACK

`region_cnh_back`

`{ x: 180, y: 1050, width: 1050, height: 700 }`

Reported explanation:
- left 180: lower lateral mirror margin
- top 1050: fold/separation line
- right 1230: observations/emission block boundary
- bottom 1750: issuer signature/state-name baseline

## MRZ

`region_cnh_mrz`

`{ x: 250, y: 2180, width: 1900, height: 260 }`

Reported explanation:
- ICAO TD1 zone around the three OCR-B lines

Important:
These values must be verified against actual definition/asset structure before becoming production SSOT.
Do not derive master regions by minimizing legacy Wallet residuals.

The legacy Wallet is not the master authority.

---

# 7. Reported explicit master membership

## FRONT — 16

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

## BACK — 19 concrete elements

- `elem_cnh_espelho_lateral_bottom`
- `elem_cnh_nome_estado_extenso`
- `elem_cnh_observacoes`
- `elem_cnh_local_emissao`
- `elem_cnh_ass_digital_1`
- `elem_cnh_ass_digital_2`
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

## MRZ — 1

- `elem_cnh_mrz`

`elem_cnh_linha_divisoria` was fact-checked as NOT a dynamic master element; it is background artwork and should not appear in dynamic membership.

---

# 8. BACK linkage discrepancy to verify immediately

The last report had a possible accounting inconsistency.

It reported Wallet BACK count = 10 and:
- 4 `MASTER_DERIVED_WITH_OVERRIDE`
- 6 `PROFILE_ONLY`

It appeared to mention `back.espelho` among derived elements and also a possible “back.espelho base” among PROFILE_ONLY.

Before commit:
- enumerate exact Wallet BACK IDs from source
- ensure every concrete element has exactly one linkage classification
- determine whether there are actually two separate espelho-related elements or whether this was reporting/double-counting error

Do not commit ambiguous ownership.

---

# 9. PRINT canonical space

The coordinate-space audit reconciled PRINT to a single canonical space:

- CNHLayout: 2481×3508 @ 300 DPI
- Studio/D1: 2481×3508
- LayoutDefinition canvas: 2481×3508
- resolved page output: 2481×3508
- renderer canvas: 2481×3508
- PDF/JPEG export: 2481×3508

`1800×2550` is legacy/intermediate context, not canonical Engine PRINT output.

---

# 10. PHOTO / SIGNATURE SSOT

Checkpoint:
`e741502`
parent:
`4b4b35b`

Commit:
`feat(cnh): synchronize media framing with print layout`

Canonical master frames:

PHOTO:
`{ x: 314, y: 558, width: 263, height: 322 }`
- source: `cnhLayout.foto`
- fit: `cover`

SIGNATURE:
`{ x: 333, y: 893, width: 236, height: 68 }`
- source: `cnhLayout.assinatura`
- fit: `contain`

Media placement SSOT:
- `computePhotoPlacement`
- `computeSignaturePlacement`
- owner: `client/src/lib/cnh/rendering/mediaPlacement.ts`

Reported constraints:
- PHOTO scale 0.4..3.5
- PHOTO position bounds dynamic and source-aspect-aware
- SIGNATURE scale 0.5..3.0
- signature X approximately ±frameWidth*0.5
- signature Y approximately ±frameHeight*0.8
- signature clipping intentional

---

# 11. Cross-profile media is NOT finished

This must not be lost.

PRINT and Wallet use the same original photo/signature sources, but historically Wallet did not consume the same presentation adjustments.

PRINT adjustment state includes:
- `fotoScale`
- `fotoOffsetX`
- `fotoOffsetY`
- `assScale`
- `assOffsetX`
- `assOffsetY`

The frames have different aspect ratios across PRINT and Wallet.

Therefore simple pixel-offset multiplication is not guaranteed to preserve the same human framing intent.

Future goal:

```text
user adjusts media in /cnhcria
        ↓
same canonical adjustment intent
        ↓
PRINT
        +
Wallet FRONT
```

Preferred investigation:
- normalized focal point
- normalized zoom intent
- pure compatibility conversion from current persisted state

Constraints:
- same original media source
- no independent Wallet media state
- avoid D1/persistence migration initially if a pure mapping is possible
- PHOTO `cover` math and SIGNATURE `contain` math must be handled separately
- no double-cropping
- no crop of final PRINT bitmap

---

# 12. Wallet current reality

The audit confirmed Wallet is currently a second manually maintained composition.

Current authoritative manual geometry historically lives in:
`client/src/lib/cnh/walletGeometry.ts`

Studio/D1 master changes currently propagate to PRINT, not Wallet.

This is the duplication being removed.

Wallet page characteristics:
- FRONT source 963×680 -> output 680×963
- BACK source 963×680 -> output 680×963
- MRZ source 963×680 -> output 680×963
- QR 680×680 independent

Optimized Wallet backgrounds may remain profile-specific:
- `parte_superior.jpg`
- `parte_inferior.jpg`
- `codigo_mrz.jpg`

No runtime crop of the A4 PNG is required for the target architecture.

---

# 13. Legitimate profile-specific differences

Do not force every current Wallet detail to become a literal master projection.

## FRONT
Potentially legitimate:
- output canvas/orientation
- responsive wrapper
- `front.photoFrame` visual decoration
- typography/style differences
- relative legacy layout offsets

## BACK
Categories:
- PRINT = 13-cell category grid
- Wallet = A/B/C/D semantic rows
- Wallet category rows are profile-specific semantic presentation

Observations:
- shared data
- Wallet historical single-line presentation may remain a presentation override

assDigital:
- known legacy composite/fallback debt
- do not silently “clean up” during geometry migration

## MRZ
- semantic content remains canonical/shared
- Wallet centered layout and 70px line spacing may remain profile-specific raster/presentation override
- renderer must not recompute MRZ semantics

## QR
- Wallet QR page is explicitly outside master-region projection
- keep independent geometry/presentation
- semantic identity/content remains shared through canonical resolution

---

# 14. Wallet presentation/orientation

Commit:
`4b4b35b`

APP intended display:
- FRONT/BACK/MRZ content appears -90° CCW
- QR remains square/centered

Do not conflate raw source canvas geometry with presentation wrapper rotation.

External `cnh-digital.pages.dev` was only a visual/behavioral reference.
It is not project infrastructure, staging, allowlist target or owned environment.

Production-facing CNH domain direction:
`https://carteira-digital-transito-vio.digital/`

Production must remain denied for experimental remote Engine preview until safe staging exists.

---

# 15. Trusted identity / security semantics

Frozen runtime context concept:

```ts
type ResolveDocumentRuntimeContext =
  | { readonly mode: 'preview'; readonly identity?: EmissionIdentity }
  | { readonly mode: 'emitted'; readonly identity: EmissionIdentity };
```

Semantics:
- `documents.id` = emissionId
- `codigo_validacao` = validationId
- `codigo_qr` = legacy alias, not trusted identity
- no Engine validationId/emissionId fallback
- renderer must not recompute QR/MRZ

---

# 16. Engine architecture principles

- CanonicalData is SSOT for business data.
- legacy adapters must not own geometry/presentation
- emission identity comes from context
- resolvers are pure
- geometry belongs to definitions/layouts/profiles
- renderers consume resolved output
- renderers should not recompute business/security semantics
- multipage definitions use stable IDs
- specialization remains explicit/minimal, not an uncontrolled registry

Element families established:
- TEXT
- IMAGE
- SHAPE
- LINE
- PHOTO
- SIGNATURE
- QR
- MRZ

---

# 17. Historical commit line

Useful checkpoints:

- `5fe1b3c` baseline
- `eed95d4` Studio editor geometry V1/V2 loading
- `3811621` include template background in admin reads
- `238204f` Geometry Bridge Phase 1
- `6368f8e` canonical render input/profile model
- `c3ffb7d` centralize MRZ/validation URL
- `1bee492` externalize Wallet front/back geometry
- `c4db93f` Wallet renderer canonical
- `372d2b8` PRINT canonical data/runtime identity
- `8a86d34` PRINT asset fallback
- `0c5113b` validation nested data fix
- `6df4feb` PRINT renderer checkpoint
- `d3dc365` validation public DTO hardening
- `c4de30a` Engine V1 core contracts/invariants
- `c90d997` generic legacy adapter contracts
- `ce764e4` CNH legacy adapter
- `15aa22f` multipage contracts
- `49c79d0` pure document/text resolver
- `93e87a5` static image resolver
- `559c048` shape resolver
- `3ad8624` line resolver
- `7b9def9` PHOTO/SIGNATURE resolvers
- `ed80270` generic media presentation specialization
- `58b5d12` CNH media presentation specialization
- `61a2bc1` trusted runtime specialization
- `9528c30` QR resolver
- `7634f83` MRZ resolver
- `f2175cd` CNH QR/MRZ specialization
- `ce8c5f8` specialized text resolution
- `21c78d5` stale QR/MRZ test reconciliation
- `90a5085` CNH derived text specialization
- `8f64d5b` harden text fallbacks
- `826ab88` materialize PRINT definitions
- `93b33fc` resolved PRINT renderer bridge
- `bb2e36f` PRINT raster parity
- `10de0ce` safe Engine preview selection
- `5f010bf` safe Engine PRINT preview integration
- `b212f37` Wallet definitions
- `399f556` resolved Wallet renderer
- `340dee3` Wallet browser parity
- `007a49c` safe Wallet preview integration
- `4b4b35b` APP Wallet orientation
- `e741502` media framing SSOT
- `490dac1` master-region projection primitives

Use this for context, not as a substitute for current Git/source.

---

# 18. PRINT definitions/history

PRINT definitions checkpoint:
`826ab88`

Known IDs:
- document `doc_cnh_v1`
- form `form_cnh_v1`
- assetSet `assetset_cnh_v1`
- render profile `profile_cnh_print`
- page `page_cnh_print`
- layout `layout_cnh_print`

Base asset:
`/assets/cnh_base_template.png`
2481×3508

Resolved PRINT renderer checkpoint:
`93b33fc`

Preserve PRINT parity and export behavior.

---

# 19. Wallet history

Wallet definitions:
`b212f37`

Resolved Wallet renderer:
`399f556`

Wallet raster/browser parity:
`340dee3`

Real caller integration:
`007a49c`

Caller:
`/habilitacao?cpf=...`
via `CNHHabilitacao.tsx`

Safety:
- legacy default
- Engine opt-in under local/dev preview path
- no production default switch

---

# 20. Local/full-stack and Cloudflare

Known proven local command:

```bash
npx wrangler pages dev dist --port 8788 --ip 127.0.0.1
```

Cloudflare audit conclusions:
- ordinary preview against production D1 is unsafe
- production project historically `docmaster`
- D1 binding historically `env.DB` -> `docmaster-db`
- write-capable endpoints exist
- safe future remote preview requires separate staging project + separate staging D1
- synthetic staging data is sufficient
- no staging infrastructure had been created at the time of audit

Known production-related domains:
- `docmaster.store`
- `validaratestado.digital`
- `carteira-digital-transito-vio.digital`

No remote staging/deploy without explicit authorization and isolation review.

---

# 21. Separate workstreams

Do not mix:
- `/consultas`
- separate `validacao-cnh` repository

Known unrelated non-CNH TypeScript baseline:
122 errors

Do not expand Engine scope to repair unrelated debt.

---

# 22. Health baselines

At committed `490dac1`:
- full repo: 1409 PASS / 0 FAIL
- Engine TS: 0
- CNH TS: 0
- non-CNH TS: 122 baseline
- build: PASS

After historically reported uncommitted 3B.8B.3C:
- full repo: 1417 PASS / 0 FAIL
- Engine TS: 0
- CNH TS: 0
- non-CNH TS: 122
- build: PASS

Rerun current health. Counts are historical expectations only.

---

# 23. Near-term roadmap

## A. Finish 3B.8B.3C and checkpoint

Verify:
- exact working tree
- region structural evidence
- master membership IDs
- BACK linkage accounting
- zero independent absolute replacement geometry
- propagation tests
- all health gates

Then exact-file stage and checkpoint if safe.

## B. Wallet FRONT master-derived migration

Only FRONT first.

Target:
```text
master element
→ region_cnh_front
→ projection
→ relative override
→ Engine Wallet FRONT geometry
```

Do not migrate BACK/MRZ/QR simultaneously.

Preserve:
- legacy/public behavior
- preview gating
- browser/raster parity

## C. PHOTO/SIGNATURE cross-profile framing

Solve normalized adjustment intent so `/cnhcria` adjustment propagates to Wallet.

No independent Wallet adjustment state.

## D. BACK migration

Derive shared fields.
Keep categories/observations/assDigital profile-specific behavior where genuinely required.

## E. MRZ migration

Derive shared semantic/geometry relationship.
Keep profile-specific raster layout where required.

## F. Full-stack/browser proof

Validate real `/habilitacao` behavior:
- orientation
- text
- photo/signature
- responsive wrapper
- compatibility

## G. Safe staging design

Only after local proof:
- separate staging project
- separate staging D1
- synthetic data
- production hard-denied

## H. Authorized push/staging/manual fine-tuning

The user wants explicit notice when the Engine line is ready for:
- branch push
- staging/preview deployment
- manual visual fine-tuning

Do not perform those actions without authorization.

---

# 24. Long-term product direction

- Studio becomes a real document authoring surface.
- raw visual asset is background; Engine owns field/layout definitions.
- normal document view stays clean; handles/bounding boxes appear only during selection/editing.
- multiple render profiles share CanonicalData.
- shared data does not require identical presentation.
- when APP parts logically correspond to master document sections, duplicated authoritative geometry should be eliminated.
- region projection should be derive-by-default.
- profile differences should be explicit exceptions.
- media should preserve original source + canonical framing intent rather than raster-to-raster cropping.
- no final-A4-bitmap crop shortcut.

---

# 25. Known debt — do not accidentally “fix”

- Wallet assDigital legacy fallback/composite
- historical SP mojibake compatibility
- Wallet observations single-line behavior
- non-CNH TS 122 baseline
- cross-profile media focal/zoom transport incomplete
- staging isolation not yet implemented
- parallel `/consultas` work
- separate validator repo

---

# 26. Autonomous stop conditions

Codex should stop for user decision if:
- destructive Git would be required
- push/deploy/merge is required
- production behavior/default must change
- schema/D1/persistence migration is required
- user data could be affected
- a product choice has multiple materially different valid outcomes
- exact region truth contradicts repository evidence
- media intent cannot be preserved without changing persisted semantics
- a test regression cannot be conservatively resolved
- Core would need CNH-specific branching or a large redesign

Otherwise:
inspect → implement → test → review → checkpoint → continue.

---

# 27. Source-of-truth priority

1. current source
2. Git/diff/history
3. tests/runtime
4. committed contracts
5. this handoff
6. old reports

---

# 28. Target end state

This Engine line is ready for staging when:

- master CNH authoring is authoritative
- Wallet FRONT derives from master + relative explicit exceptions
- Wallet BACK derives from master where semantically applicable
- Wallet MRZ derives from master semantics/geometry
- Wallet QR remains independent
- photo/signature adjustment intent propagates without a second manual state
- local full-stack behavior is proven
- browser/raster parity is protected
- staging is isolated from production
- branch is ready for authorized push/deploy
- user can perform manual fine-tuning
- production default remains unchanged until separately approved
