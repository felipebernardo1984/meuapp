---
name: Conferência Repasse Config
description: How the gestão/arena split is stored and computed in the conferência module.
---

## Rule
`conferenciaRepasseConfig` table stores one row per (arenaId, periodo). Only `pctArena` is stored; `pctGestao` is derived on the fly as `100 - pctArena - professor%`.

**Why:** Each record can have a different professor%, so gestão is per-record computed — storing a global pctGestao in the config would require recomputing on every professor change.

## How to apply
- `gestaoAtiva = pctArena < 100`
- Per record: `vArena = valor * pctArena/100`, `vGestao = max(0, valor - vArena - valorProfessor)`
- When gestão = 0 (pctArena = 100), UI hides gestão lines entirely — backwards compatible with arenas that don't use this feature.
- `gestaoTipo`: "caixa" (separate line, no professor) or "professor" (attributed to a specific conferência professor).
- Auto-copy of professors+students from prior period: done server-side in GET /api/conferencia/professores — if period has no records, finds most recent prior period and copies all professors+students.
