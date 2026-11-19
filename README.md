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

## Android prototype (work in progress)

The first Expo Android UI lives in `apps/mobile/` (SDK 54). It uses the same TypeScript core from `src/` and has a local demo catalog of 23 recipes and **invented** price fixtures. It is **not** connected to regional statistics or shops.

From the project root, with Node.js 22.13+ and an Android emulator running:

```powershell
npm install
npm run check
npm run mobile:check
npm run mobile:android
```

See [docs/MOBILE.md](docs/MOBILE.md) for complete Windows/Android Studio setup and limitations. SQLite, real prices, age-appropriate portions, approved cooking steps and production testing are still pending.
