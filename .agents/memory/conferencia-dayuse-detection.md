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

## Multi-modal: Letícia case (genuine 2-modality students)
When the same student name appears with 2+ distinct modalities **each with ≥ 3 check-ins**, their "confirmado" records are **downgraded to "pendente"** so the gestor can manually confirm which professor belongs to each modality. Professor suggestion is kept as a pre-fill — no automatic reassignment.

**Threshold rule (≥3 check-ins):** A modality only counts as "real" if the student has ≥3 check-ins in it. A single accidental dayuse check-in (count 1 or 2) does NOT qualify as a second modality and does NOT trigger a downgrade. This prevents the "Brenda case" where 1 wrong dayuse check-in pushed 11 correct check-ins to possíveis.

**Why 3:** Platform contracts limit total check-ins (8–12 or 10–14/month). A genuine second-modality student will always have ≥3 check-ins in it; an accidental dayuse entry will typically be 1–2.

Applied via `buildDivergentesSet()` in both upload and rematch handlers.

## "Divergente" badge (purple)
`buildDivergentesSet(records)` — returns a Set of normalized student names that have 2+ modalities with ≥3 check-ins each. Used to show the purple "Divergente" badge in the UI. Computed at GET time from session data, no schema changes. Also computed in upload and rematch to drive the downgrade.

**Removed (deprecated):**
- `buildMultiModalidadeAlertas` (count-based, > 1.8× median) — removed because it caused false positives for active students who simply check in often. The yellow "Multi-modalidade?" badge is gone.
- Professor-based "Modalidade divergente" badge (red) — removed to avoid confusion with the file-based "Divergente" concept.

## GET endpoint enrichment
`clusterHint` ("padrao" | "dayuse" | "desconhecido") and `divergente` (boolean) are computed dynamically at GET time and added to enriched records — no DB schema changes needed.
