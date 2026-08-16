# DOCMASTER ENGINE V1 — FULL CONTEXT HANDOFF

This is the consolidated technical memory of the Engine work.
It is intentionally broader than a normal handoff and includes:
- architecture already implemented
- architectural decisions
- current state
- known debt
- future ideas
- product intent
- infrastructure/staging decisions
- execution rules

It is not a verbatim copy of every chat message. Repository truth remains authoritative.

---

# A. Product intent

The user wants one master CNH composition.

The complete CNH authored/edited through `/cnhcria` / Engine / Studio is the MASTER.

Future target:

```text
MASTER CNH / PRINT
2481x3508
   |
   +-- FRONT region --> APP FRONT
   +-- BACK region  --> APP BACK
   +-- MRZ region   --> APP MRZ

APP QR
--> independent surface
```

The user explicitly wants to "adjust once" in the Engine/Studio and have the corresponding APP parts update automatically.

Do not solve this with:
- two manually synchronized absolute geometries
- raster cropping of the final A4 export
- independent Wallet media adjustment state

Preferred:
- logical master geometry
- region projection
- relative profile overrides
- original source media + canonical framing intent
- profile-specific semantics only where genuinely different

---

# B. Core architectural principles

- CanonicalData = SSOT for business data
- adapter legacy must not own geometry/presentation
- emission identity comes from runtime context
- resolvers are pure
- geometry belongs to definitions/layouts/profiles
- renderers consume resolved output and should not recompute semantics
- stable multipage IDs
- explicit specialization, not uncontrolled registry
- generic Core must contain zero CNH IDs
- shared data does not imply identical presentation
- duplicated authoritative geometry should be eliminated when Wallet logically represents master sections

Element families established:
TEXT, IMAGE, SHAPE, LINE, PHOTO, SIGNATURE, QR, MRZ.

---

# C. Trusted identity rules

Runtime context concept:

```ts
type ResolveDocumentRuntimeContext =
  | { readonly mode: 'preview'; readonly identity?: EmissionIdentity }
  | { readonly mode: 'emitted'; readonly identity: EmissionIdentity };
```

Frozen semantics:
- documents.id = emissionId
- codigo_validacao = validationId
- codigo_qr = legacy alias, not trusted identity
- no validationId <-> emissionId fallback in Engine
- renderer does not recompute QR/MRZ
- preview/emitted identity remains explicit

---

# D. Canonical PRINT state

Single canonical space:
- CNHLayout: 2481x3508 @ 300 DPI
- Studio/D1: 2481x3508
- LayoutDefinition canvas: 2481x3508
- resolved page: 2481x3508
- renderer: 2481x3508
- export: 2481x3508

1800x2550 was reconciled as legacy/intermediate context, not Engine canonical output.

Known PRINT IDs:
- doc_cnh_v1
- form_cnh_v1
- assetset_cnh_v1
- profile_cnh_print
- page_cnh_print
- layout_cnh_print

Base asset:
`/assets/cnh_base_template.png`

---

# E. PHOTO/SIGNATURE SSOT

Checkpoint:
`e741502`
parent:
`4b4b35b`
commit:
`feat(cnh): synchronize media framing with print layout`

PHOTO:
- frame `{x:314,y:558,width:263,height:322}`
- fit cover
- owner cnhLayout.foto
- state: fotoScale, fotoOffsetX, fotoOffsetY

SIGNATURE:
- frame `{x:333,y:893,width:236,height:68}`
- fit contain
- owner cnhLayout.assinatura
- state: assScale, assOffsetX, assOffsetY

Placement helpers:
- computePhotoPlacement
- computeSignaturePlacement
- owner: `client/src/lib/cnh/rendering/mediaPlacement.ts`

Reported constraints:
PHOTO scale 0.4..3.5; dynamic aspect-aware offsets.
SIGNATURE scale 0.5..3.0; X approx ±frameWidth*0.5; Y approx ±frameHeight*0.8; clipToFrame true.

---

# F. Cross-profile media future requirement

This remains unresolved and MUST NOT be forgotten.

Current issue:
PRINT and Wallet PHOTO frames have different aspect ratios.

Therefore:
`walletOffset = masterOffset * projectionScale`
is not automatically enough to preserve visual framing intent.

Future target:
- same original photo/signature source
- same user adjustment intent
- no independent Wallet media state
- pure compatibility conversion if possible
- likely normalized focal point + zoom representation derived from current persisted state
- no persistence/D1 migration initially unless unavoidable
- PHOTO and SIGNATURE math must differ appropriately because cover vs contain

Success criterion:
adjust in `/cnhcria` once -> PRINT + Wallet FRONT show the same intended human framing.

---

# G. Wallet current reality

Wallet is confirmed as a second manual composition today.

Historical runtime authority:
`client/src/lib/cnh/walletGeometry.ts`

Current Wallet surfaces:
- FRONT: source 963x680 -> output 680x963
- BACK: source 963x680 -> output 680x963
- MRZ: source 963x680 -> output 680x963
- QR: 680x680 independent

Current intended display:
- FRONT/BACK/MRZ appear -90° CCW
- QR remains square and centered

Optimized static Wallet backgrounds can remain:
- parte_superior.jpg
- parte_inferior.jpg
- codigo_mrz.jpg

No runtime crop of final PRINT bitmap is required.

---

# H. Legitimate profile differences

FRONT:
- output canvas/orientation
- responsive wrapper
- photoFrame visual decoration
- typography differences
- relative layout overrides if needed

BACK:
- PRINT categories = 13-cell grid
- Wallet categories = A/B/C/D semantic rows
- observations single-line presentation may remain profile override
- assDigital composite/fallback debt remains explicit
- local/state text can use relative override

MRZ:
- shared semantic content
- Wallet centered alignment and 70px line spacing may remain raster/presentation override

QR:
- independent Wallet page
- shared semantic identity/content only

---

# I. Generic master-region projection Core

Commit:
`490dac1`
parent:
`e741502`
message:
`feat(engine): add master region projection primitives`

Generic primitives:
- LayoutRegion
- LayoutRegionProjection
- ProjectionTransform
- DerivedElementLink
- deriveProjectionTransform
- projectElementGeometry

LayoutRegion minimal fields:
- id
- optional name
- sourceRect

No speculative metadata.

DerivedElementLink:
- MASTER_DERIVED + sourceElementId
- MASTER_DERIVED_WITH_OVERRIDE + sourceElementId
- PROFILE_ONLY with sourceElementId forbidden

Pure projection:
local = master - region origin
then scale to target canvas
then target-space translation

Float precision, no Core rounding, immutable behavior, no CNH IDs.

At committed 490dac1, LayoutDefinition.regions was not yet wired.

---

# J. Uncommitted 3B.8B.3C intent

Historically reported additions:
- LayoutDefinition.regions optional
- generic region validation
- RelativeGeometryOverride
- applyRelativeOverride
- CNH regions
- explicit membership
- Wallet linkage maps
- test-only parity proof
- no Wallet runtime migration

Relative override rule:

```text
effective.x = projected.x + translateX
effective.y = projected.y + translateY
effective.width = projected.width * scaleX
effective.height = projected.height * scaleY
```

Critical:
MASTER_DERIVED_WITH_OVERRIDE must never become independent absolute Wallet x/y/w/h.

---

# K. Cloudflare / staging / production

Known local full-stack command:
`npx wrangler pages dev dist --port 8788 --ip 127.0.0.1`

Cloudflare audit conclusions:
- ordinary preview using production D1 is unsafe
- production project historically `docmaster`
- D1 binding historically `env.DB` -> `docmaster-db`
- app has write-capable endpoints
- remote preview must use separate staging project + separate staging D1
- synthetic staging data is sufficient
- no staging infrastructure had been created at audit time

Production-related domains historically:
- docmaster.store
- validaratestado.digital
- carteira-digital-transito-vio.digital

`cnh-digital.pages.dev` was only an EXTERNAL visual reference:
- not owned project infra
- not staging
- not allowlist target
- do not reuse it

Production must remain hard-denied for experimental Engine preview.

---

# L. Parallel workstreams / scope guards

Do not mix:
- `/consultas`
- separate `validacao-cnh` repository

Known unrelated non-CNH TS baseline:
122 errors.

Do not expand Engine slices into unrelated cleanup.

---

# M. User workflow preferences / governance

The user prefers:
- conservative incremental slices
- explicit checkpoints
- exact fact-checks
- no destructive Git
- no production change before local proof
- explicit notice when ready for branch push/staging/manual fine-tuning
- copy-pastable directives when needed
- no speculative architectural rewrites without proof

---

# N. End-state definition

This line is ready for staging only when:
- master authoring is authoritative
- FRONT master-derived
- BACK master-derived where semantically applicable
- MRZ master-derived
- QR independent
- photo/signature adjustment intent cross-profile works
- local full-stack proof passes
- browser/raster parity protected
- staging isolated from production
- branch ready for authorized push
- user can manually fine-tune visually
- production default still unchanged
