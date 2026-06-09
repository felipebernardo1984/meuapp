---
name: Conferência Repasse Config
description: How the gestão/arena split is stored and computed in the conferência module.
---

## Rule
`conferenciaRepasseConfig` stores one row per (arenaId, periodo) with **two independent fields**: `pctArena` and `pctGestao`. Both are % of the gross (bruto) total received — they are NOT ratios of a remainder.

**Why:** User configures Arena and Gestão as independent items. e.g. Arena=40%, Gestão=10%, Professores handle their own %. The user is responsible for ensuring all %s sum to 100%.

## Formula (both SessaoView and RelatorioView)
- `vArena  = valor × pctArena  / 100`
- `vGestao = valor × pctGestao / 100` (zero when pctGestao = 0)
- `vProf`  = from individual professor %, stored in `valorProfessor`

## How to apply
- `gestaoAtiva = pctGestao > 0`; when false, gestão destination selector is hidden
- `pctArena` defaults to 100 when no config row exists (backwards compatible)
- UI card (RepasseConfigCard): 2-column layout — left col = % Repasse Arena, right col = % Gestão + destination selector
- Destination (`gestaoTipo`): "caixa" (separate bucket) or "professor" (attributed to a specific conferência professor via `gestaoProfessorId`)
- **RepasseConfigCard lives only in RelatorioView** — it was removed from MesView
- Auto-copy of professors+students from prior period: done server-side in GET /api/conferencia/professores
