# ENGINE STATE - ROLLING

Repository truth wins.

Current Engine worktree:
- path: `C:\Users\ricky\Desktop\docmaster-engine-line`
- branch: `checkpoint/engine-3b3d-line`
- HEAD: `2833812c3c059801e0aa098d96f4d0b51e50d61a`
- parent: `f40b4481f8f1d0169c8f1942b655b783ea9ffffd`
- working tree after checkpoint: clean

Recent checkpoints:
- `2833812 feat(cnh): propagate media framing to wallet front`
- `f40b448 feat(cnh): snapshot master layout for wallet front`
- `95789ce feat(cnh): derive wallet front geometry from master`
- `c9acbc0 feat(cnh): define master regions and wallet projection map`

Completed slices:
- `3B.8B.3C / 3B.8B.3C.1 / 3B.8B.3D`
- `3B.8B.4A - Wallet FRONT master-derived Engine runtime builder`
- `3B.8B.4B - immutable master layout snapshot for Wallet FRONT caller`
- `PHOTO/SIGNATURE cross-profile framing - focal/zoom propagation`

Cross-profile framing facts:
- The existing six authoring values are the only focal/zoom configuration; there is no Wallet-specific state.
- `crossProfileMediaFraming.ts` contains pure derivation/projection functions and no I/O, persistence, DOM, Canvas, or Engine Core document validation.
- PHOTO recovers a normalized focal point from the historical MASTER frame and PRINT cover behavior, then projects the same intent into the Wallet FRONT frame with cover semantics.
- PHOTO preserves the historical effective zoom factor `fotoScale * 0.999`, including the narrow-source top-alignment behavior at the MASTER source frame.
- SIGNATURE uses an independent normalized center/zoom model and true contain sizing from the original image dimensions.
- The Wallet renderer loads the same resolved media source and uses its natural dimensions. Invalid or absent projection inputs fall back to the previous raster behavior without crashing.
- Presentation resolution is enabled only for the two exact production Wallet FRONT IDs; other Wallet pages and synthetic/unrelated elements remain untouched.
- `CNHHabilitacao` passes the stored historical MASTER layout only to the valid-snapshot Wallet FRONT Engine caller.
- BACK, MRZ, QR, PRINT rendering semantics, identity/security, endpoints, authentication, D1/schema, and persistence were not changed.

Checkpoint health:
- full repository: 1454 PASS / 0 FAIL across 42 test files
- cross-profile framing math: 9 PASS / 0 FAIL
- resolved Wallet renderer: 18 PASS / 0 FAIL
- CNH resolution extension: 113 PASS / 0 FAIL
- immutable layout snapshot: 12 PASS / 0 FAIL
- Wallet FRONT master derivation: 5 PASS / 0 FAIL
- resolved PRINT renderer: 36 PASS / 0 FAIL
- PRINT parity: 54 PASS / 0 FAIL
- Engine TypeScript: 0
- CNH TypeScript: 0
- global baseline: 122 historical errors
- build: PASS (2265 modules; existing warnings only)
- `git diff --check`: PASS

ENGINE_REVIEW status:
- `APPROVED` at reviewed HEAD `f40b448`, exactly matching the clean base and formally closing 3B.8B.4B.
- The review predates the focal/zoom diff and is not approval of `2833812`; no matching `CHANGES_REQUIRED` exists.
- Repository source, tests, TypeScript gates, and build independently validated the new checkpoint.

STOP after this slice:
- do not migrate Wallet BACK runtime;
- do not migrate MRZ or QR;
- no remote staging, push, deploy, production, schema/DDL, endpoint/auth, or old-data migration.

Governance:
- push NO
- deploy NO
- merge NO
- production change NO
- schema/DDL migration NO
- new endpoint/auth change NO
