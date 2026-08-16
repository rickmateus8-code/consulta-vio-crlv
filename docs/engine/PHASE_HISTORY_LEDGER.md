# PHASE HISTORY LEDGER — DOCMASTER ENGINE V1

This is the chronological ledger of major Engine/CNH checkpoints referenced in the conversation.

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
- `4b4b35b` APP Wallet orientation checkpoint
- `e741502` PHOTO/SIGNATURE media framing SSOT
- `490dac1` master-region projection primitives

Important recent phase flow:

3B.8A:
- Cloudflare/remote preview audit
- ordinary preview against prod D1 declared unsafe
- staging should be separate project + separate D1

3B.8B.1:
- PHOTO/SIGNATURE media SSOT
- exact PRINT space reconciled to 2481x3508
- committed as e741502

3B.8B.2:
- structural PRINT <-> Wallet audit
- confirmed second manual Wallet composition
- Studio/D1 changes do not propagate to Wallet today
- QR confirmed independent

3B.8B.3:
- generic region projection contract
- initial proof showed candidate regions were not exact
- fact-check corrected overclaiming

3B.8B.3B:
- cleaned generic projection contract
- removed speculative metadata
- fixed DerivedElementLink semantics
- committed as 490dac1

3B.8B.3C:
- CNH regions + relative override map designed/implemented uncommitted

3B.8B.3C.1:
- final fact-check before commit
- conversation stopped here
- no commit yet
