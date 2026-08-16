# FUTURE ROADMAP — DOCMASTER ENGINE V1

This file captures suggested future implementation direction from the conversation.

## 1. Complete current region/linkage checkpoint
- reconcile BACK map
- verify exact regions
- verify concrete membership
- verify zero absolute replacement geometry
- tests/typecheck/build
- commit exact files
- no push/deploy

Suggested commit:
`feat(cnh): define master regions and wallet projection map`

## 2. Wallet FRONT master-derived runtime migration
Only FRONT first.

Target:
master element
-> region_cnh_front
-> projection
-> relative override
-> Engine Wallet FRONT geometry

Preserve:
- public/legacy default
- current preview gating
- orientation
- browser/raster parity

Do not migrate BACK/MRZ/QR simultaneously.

## 3. Cross-profile PHOTO/SIGNATURE framing
Need canonical framing intent, likely:
- normalized focal point
- zoom intent
- pure conversion from current persisted offsets/scales

Constraints:
- same original media
- no independent Wallet media state
- avoid persistence migration if possible
- PHOTO cover and SIGNATURE contain treated separately

## 4. Wallet BACK master-derived migration
Derive shared fields.
Keep explicit profile-specific exceptions:
- categories semantic presentation
- observations single-line behavior
- assDigital composite/debt

## 5. Wallet MRZ master-derived migration
Share semantic content and master geometry relation.
Keep Wallet-specific raster alignment/70px line spacing if necessary.
No MRZ semantic recomputation.

## 6. Full-stack local/browser validation
Use local Wrangler.
Validate real `/habilitacao`.
Check:
- orientation
- typography
- photo/signature
- responsiveness
- PDF/share compatibility where applicable

## 7. Safe staging
Separate:
- Pages project
- D1 database
- synthetic data

Production must remain isolated.

## 8. Push + staging deployment
Only with explicit user authorization.

## 9. User manual fine-tuning
The user wants a clear milestone notification when ready for:
- branch push
- staging/preview deployment
- manual visual tuning

## 10. Production
No default switch until separately approved after staging/manual proof.

---

# Long-term product direction

- Studio as real authoring surface
- Engine-owned geometry
- background is asset, fields are logical definitions
- clean normal view, edit handles only on selection
- multiple render profiles
- master-derived geometry where logically related
- explicit profile overrides
- original media + canonical framing intent
- no final-bitmap crop shortcut
