# CURRENT RESUME POINT - DO NOT SKIP

## Repository line

- Engine worktree: `C:\Users\ricky\Desktop\docmaster-engine-line`
- branch: `checkpoint/engine-3b3d-line`
- committed HEAD: `2833812c3c059801e0aa098d96f4d0b51e50d61a`
- parent: `f40b4481f8f1d0169c8f1942b655b783ea9ffffd`
- commit: `feat(cnh): propagate media framing to wallet front`
- Engine working tree after checkpoint: clean

Do not work from `C:\Users\ricky\Desktop\Gemini CLI` for Engine code. That separate worktree belongs to `/consultas` and must remain isolated.

## Last completed slices

- `3B.8B.4A - Wallet FRONT master-derived Engine runtime builder` at `95789ce`
- `3B.8B.4B - immutable master layout snapshot for Wallet FRONT caller` at `f40b448`
- `PHOTO/SIGNATURE cross-profile framing - focal/zoom propagation` at `2833812`

## Cross-profile media framing

- Existing `fotoScale`, `fotoOffsetX`, `fotoOffsetY`, `assScale`, `assOffsetX`, and `assOffsetY` remain the single authoring state.
- PHOTO is converted through pure normalized focal/zoom math using cover semantics and the historical PRINT `0.999` factor.
- SIGNATURE is converted separately through normalized center/zoom math using true contain semantics and the source image's natural dimensions.
- The historical MASTER photo/signature frames from `documents.data.layout` provide the source coordinate system; no Wallet-specific configuration is persisted.
- `/habilitacao` supplies that layout only to the already-migrated Wallet FRONT Engine path.
- Missing or invalid projection context preserves the previous safe Wallet raster fallback.
- The resolution extension specializes only PRINT media and the two exact production Wallet FRONT media element IDs.
- BACK, MRZ, and QR runtimes remain unchanged.

No D1/schema/persistence, endpoint, authentication, emission, or document payload contract changed in this slice.

## Gates at checkpoint

- 1454 PASS / 0 FAIL across 42 test files
- cross-profile math: 9 PASS / 0 FAIL
- resolved Wallet renderer: 18 PASS / 0 FAIL
- resolution extension: 113 PASS / 0 FAIL
- snapshot compatibility: 12 PASS / 0 FAIL
- Wallet FRONT derivation: 5 PASS / 0 FAIL
- resolved PRINT: 36 PASS / 0 FAIL
- PRINT parity: 54 PASS / 0 FAIL
- Engine TypeScript: 0 errors
- CNH TypeScript: 0 errors
- global TypeScript baseline: 122 historical errors
- build: PASS (2265 modules; existing warnings only)
- `git diff --check`: PASS
- Engine working tree: clean

## Review status

`ENGINE_REVIEW.md` is APPROVED for HEAD `f40b448` and formally closes 3B.8B.4B. It exactly matched that clean base checkpoint. It does not independently review checkpoint `2833812`; the new slice was accepted from repository truth and its full gates.

## STOP

Stop before Wallet BACK runtime migration, MRZ migration, QR migration, remote staging, push, deploy, production, schema/DDL, endpoint/auth changes, or old-data migration.

No push or deploy was performed.
