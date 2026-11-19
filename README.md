# Pantrilo (working name)

Local-first weekly family meal and grocery budget planner for Russian regions. This is the **initial TypeScript core**, not yet an Android application or a 7-day production planner.

## What works now

- Typed ingredients, portion-scaled recipes, dated regional/estimated package-price snapshots.
- Full-basket purchase cost with integer kopecks, optional pantry stock, extras and reserve.
- Exact cheapest whole-package combination for reasonably-sized catalogue entries.
- Strict recipe filters for allergens, excluded ingredient IDs and available equipment.
- Deterministic bounded beam-search planner, explicitly fails when no feasible plan is found.
- Node tests, type checking and GitHub Actions CI.

## Run

Requires Node 22+ and TypeScript 5.8+.

```bash
npm install
npm run check
npm run demo
```

All demo prices are **invented test data**, not actual store or regional prices.

## Limitations – not production-ready

- Optimizer is a heuristic beam search, not a globally optimal solver.
- No Android UI, SQLite persistence, price importer, validated recipes or live regional prices yet.
- Current `portions` is an integer multiplier. Age-specific child portions and nutrition rules are pending.
- Missing prices fail closed; no zero-cost estimates. Only one base unit is allowed per ingredient.
- No automatic deduction of pantry stock when a plan is merely generated.

See [architecture](docs/ARCHITECTURE.md) and [GitHub issues](https://github.com/JohnCook36/pantrilo/issues).
