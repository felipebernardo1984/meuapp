---
name: Conferência Repasse Config
description: How the gestão/arena split is stored and computed in the conferência module.
---

## Rule
`conferenciaRepasseConfig` stores one row per (arenaId, periodo). Only **`pctArena`** is the user-configured field. `pctGestao` is always stored as "0" (unused).

**Why:** Gestão is NOT a separately configured %. It is the mathematical remainder after paying arena (pctArena%) and professor (their individual %). The user only sets Arena%, and gestão captures whatever is left.

## Formula (both SessaoView and RelatorioView)
- `vArena  = valor × pctArena / 100`
- `vProf`  = from individual professor %, stored in `valorProfessor`
- `vGestao = max(0, valor − vArena − vProf)` — the remainder
- `gestaoAtiva = pctArena < 100` (when arena takes 100%, there is no gestão remainder)

## UI card (RepasseConfigCard)
- **Left section**: "% Repasse Arena" — editable number input, saves to `pctArena`
- **Right section**: "Gestão" — no % input; shows destination selector only when `gestaoAtiva`
  - Destination (`gestaoTipo`): "caixa" (separate bucket) or "professor" (specific professor via `gestaoProfessorId`)
- **RepasseConfigCard lives only in RelatorioView** — removed from MesView

## How to apply
- `pctArena` defaults to 100 when no config row exists (backwards compatible → no gestão)
- `totalGestao = max(0, totalRecebido − totalArena − totalProfessores)` for aggregate display
- In RelatorioView, `gestaoRow(r)` computes per-record gestão the same way
