---
name: Conferência Repasse Config
description: How the gestão/arena split is stored and computed in the conferência module.
---

## Rule
`conferenciaRepasseConfig` stores one row per (arenaId, periodo). `pctArena` is the period-level arena percentage; the selected gestor stores the period-specific management percentage in `conferenciaGestores.percentualComissao`. Legacy gestor values of 0 continue using the calculated remainder.

**Why:** Gestão is NOT a separately configured %. It is the mathematical remainder after paying arena (pctArena%) and professor (their individual %). The user only sets Arena%, and gestão captures whatever is left.

## Formula (both SessaoView and RelatorioView)
- `vArena  = valor × pctArena / 100`
- `vProf`  = from individual professor %, stored in `valorProfessor`
- `vGestao = max(0, valor − vArena − vProf)` — the legacy remainder; when a selected gestor has a positive configured percentage, Arena + professor + gestor must equal 100% and that percentage is used.
- `gestaoAtiva = pctArena < 100` (when arena takes 100%, there is no gestão remainder)

## UI card (RepasseConfigCard)
- **Left section**: "% Repasse Arena" — editable number input, saves to `pctArena`
- **Right section**: "Gestão" — no % input; shows a gestor selector only when `gestaoAtiva`
  - The selected `gestaoGestorId` is the default recipient for the remainder; legacy `gestaoTipo`/`gestaoProfessorId` fields remain for compatibility.
- A gestor percentage is constrained to 0–100%; explicit positive manager percentages are accepted only when the three allocations close at 100%.
- **RepasseConfigCard lives only in RelatorioView** — removed from MesView

## How to apply
- `pctArena` defaults to 100 when no config row exists (backwards compatible → no gestão)
- `totalGestao = max(0, totalRecebido − totalArena − totalProfessores)` for aggregate display
- In RelatorioView, `gestaoRow(r)` computes per-record gestão the same way
