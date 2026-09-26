---
name: Conferência Repasse Config
description: How the gestão/arena split is stored and computed in the conferência module.
---

## Rule
`conferenciaRepasseConfig` stores one row per `(arenaId, periodo)`. When a row exists,
`pctArena` is the exact arena percentage and `conferenciaGestores.percentualComissao`
is the optional manager percentage. A manager with 0% uses the remaining percentage.

**Why:** The arena must never silently receive the professor's remainder. The user
needs the configured arena percentage to be the amount used for payment and reports.

## Formula
- `vArena = valor × pctArena / 100` whenever the period is configured.
- `vProf = valor × professorPercentage / 100`.
- With a positive manager percentage, `vGestor = valor × managerPercentage / 100`.
- Without a positive manager percentage, `vGestor = max(0, valor − vArena − vProf)`.
- If no manager is available, the remainder is stored without a recipient and the UI
  warns before allowing the user to continue; this must not block the arena snapshot.

## Manager selection
- An explicitly selected `gestaoGestorId` wins.
- When the period has exactly one manager, it is the automatic recipient even if the
  selection field was not saved separately.
- Existing mensalista snapshots are recalculated when the period configuration is read
  or changed, so changing `pctArena` repairs older values.

## How to apply
- `pctArena` defaults to 100 when no period row exists for backwards compatibility.
- Keep arena, manager, and report cards ordered as Total Geral, Plataformas, Mensalistas,
  then Repasse Arena/Repasse Gestor.
