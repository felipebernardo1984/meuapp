---
name: Conferência Excel header detection
description: TotalPass/Wellhub Excel files have title rows at the top — must auto-detect the real header row, not use row 0.
---

## The rule
Never use XLSX `sheet_to_json` defaults for TotalPass/Wellhub exports.
They always have 1-3 title rows (e.g. "Veja todos os check-ins...") before the actual header row.
Using default parsing gives `__EMPTY_N` as column names → 0 encontrados.

**How to apply:** Use `sheet_to_json({ header: 1 })` to get raw arrays, scan the first 15 rows for header keywords (nome, cpf, valor, data, etc.), pick the one with the highest keyword score, then build the column map from that row. See `parseExcelRows()` in `server/conferenciaRoutes.ts`.

**Why:** Discovered when server logs showed `col.nome: "__EMPTY_6"` — the real header was in row 3+, not row 1.
