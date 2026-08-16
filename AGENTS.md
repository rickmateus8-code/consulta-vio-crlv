# AGENTS.md — DocMaster Engine V1

Before doing any work, read in this order:

1. `docs/engine/CURRENT_RESUME_POINT.md`
2. `docs/engine/DOCMASTER_ENGINE_FULL_CONTEXT.md`
3. `docs/engine/PHASE_HISTORY_LEDGER.md`
4. `docs/engine/FUTURE_ROADMAP.md`
5. `docs/engine/ENGINE_STATE.md`
6. `docs/engine/ENGINE_REVIEW.md` if non-empty.

Then verify repository truth before changing code.

Codex is the default primary writer.
Antigravity normal/2.0 is the default independent reviewer/supervisor.

Repository truth > Git > tests/runtime > committed contracts > these docs > old reports.

Never use destructive Git (`reset --hard`, `clean -fd`, `restore .`, force push).
Never use `git add .` or `git add -A`.
No push/deploy/merge/production-default/schema/D1 changes without explicit authorization.
Do not mix `/consultas` into this Engine line.
