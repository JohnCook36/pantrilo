# Architecture decision record · 2026-11-19

**Status:** starter implementation, not final product specification.

## Boundaries

1. **Domain**: `Ingredient`, `Recipe`, `MealSlot`, `DietaryProfile`, `PriceSnapshot`.
2. **Budget**: combine per-portion ingredient quantities across all selected meals, subtract available pantry quantities, solve purchasable pack quantities, add explicit extras and reserve, output fully itemised `BudgetResult`.
3. **Planner**: reject forbidden allergens and ingredients, require available equipment, choose per-slot recipes with bounded deterministic beam search, evaluate the **whole basket** for each state.
4. **Persistence and publishing**: planned SQLite and atomic versioned catalogue updates. Not implemented yet.

## Non-negotiable invariants

- Money: positive integer kopecks. No floating-point currency calculations.
- Ingredient quantities: positive integer g, ml or pieces; never mix units under the same ID.
- Packages: positive size and price; all price observations must be attributed to a source and snapshot.
- Missing price: exception / infeasibility, never silently treated as zero.
- Forbidden allergen: checked against ingredient metadata as well as recipe declaration.
- Budget: compares purchasable whole packages plus extras plus reserve, not gram-weight recipe cost.
- Plan: explicitly reports snapshot ID. Future storage must snapshot recipe version and price observations.

## Next engineering gates

- Validate individual recipe and pricing source licences; importer schema; source quality.
- Persist to SQLite with migrations and store immutable historical planning snapshots.
- Model per-person and child portions and recipe cooked weight / edible yield.
- Develop unbiased price mapping for Russian regions with provenance / stale warnings.
- Benchmark optimizer, refine bounded search or use a dedicated integer solver if needed.
- Add an Android-first Expo UI as a separate app package after core checks are reliable.
