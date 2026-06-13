---
name: Conferência dayuse detection
description: How day use entries are detected in the Conferência module — collective modality+value map approach replacing the old inverted per-student heuristic.
---

## Rule
Day use detection uses a **collective modality+value map** built from all records in the session file (not per student). Any record with `categoria = "comissao"` whose value is < 80% of the dominant value for its modality is reclassified as dayuse (no professor).

**Why:** The old per-student min/max heuristic was inverted — it marked HIGH values as dayuse, but day use repasse is always LOWER than regular class repasse. Also, comparing within a single student breaks when they have 50/50 regular+dayuse. Collective analysis across the whole file is robust because day use records are a minority and the dominant value correctly represents the standard class rate.

## How to apply
- `buildModalidadeMap(records)` — takes array of `{modalidade, valor}`, returns `Map<string, {valorPadrao, threshold}>` where `threshold = valorPadrao × 0.80`. Only creates an entry if values below threshold exist AND modalidade has ≥ 3 records.
- Applied in **upload handler** (before `.map()` loop, per row) and in **rematch handler** (post-update pass over freshRegs).
- **Do NOT touch** the `isArenaOnly` / keyword path — it's a separate first-pass filter for known arena-only modality names.

## Multi-modal alert (Letícia case)
`buildMultiModalidadeAlertas(records)` — detects students with > 1.8× the median check-in count for their modality. Used for TotalPass "BeachSports" which groups multiple sports. Adds `multiModalidadeAlerta: true` to enriched records for display in the UI (yellow badge). Requires ≥ 3 students per modality for reliable median.

## GET endpoint enrichment
`clusterHint` ("padrao" | "dayuse" | "desconhecido") and `multiModalidadeAlerta` (boolean) are computed dynamically at GET time and added to enriched records — no DB schema changes needed.
