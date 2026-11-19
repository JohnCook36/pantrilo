# Android-first Mobile Prototype (M2 in progress)

## Launch on Windows 11 with Android Studio

1. Install **Node.js 22.13+**, Android Studio, and an Android emulator (e.g. Pixel 7 / API 35+). Ensure `adb devices` shows an emulator.
2. Check out `feat/mobile-demo-20261119` after it has been merged or fetch the branch directly.
3. From the repository root:

```powershell
npm install
npm run check
npm run mobile:check
npm run mobile:android
```

Alternatively `cd apps/mobile; npx expo start --android`.

This is an **Expo SDK 54** project. If Expo Go reports an SDK mismatch, install the compatible SDK 54 Expo Go build through https://expo.dev/go or use a custom development build. Android Studio is needed to run the emulator; there is no checked-in `android/` Gradle project yet.

## Prototype capabilities

- Setup: region label, weekly budget, adults/children, dietary exclusions, allergens, kitchen equipment, preferences, optional snacks and extras.
- Menu: 7 days, 21 or 28 meal slots, deterministic planner from shared `src/` core.
- Shopping: merged shopping basket using whole packs and optional pantry stock, per-item checkmarks.
- Recipe: test ingredient quantities per standard portion, equipment requirement.
- Storage: AsyncStorage persists settings, plan snapshot and shopping checkmarks on the device. No account, network requests or backend needed.
- A light/dark theme toggle.

## Deliberate limitations

- **All prices are invented fixtures**, shared across all region labels; no actual regional pricing and no store-specific data.
- Children's age-based portions and clinical dietary safety are NOT implemented. Child count is treated as one standard adult portion and a warning is displayed.
- No verified preparation instructions, nutrition facts or licensed recipe photos.
- In the first prototype, there is no SQLite database; AsyncStorage is used to persist the demo state. SQLite migration remains a separate issue.
- This is not a production app and has not yet been checked on a physical Android device.
- Backend sync and real receipts are not implemented.

## Sanity checklist

- Create a plan with default 7000 rubles; see seven days.
- Change a recipe, check shopping total stays within requested amount.
- Open Shopping, check an item, close and reopen app; checkmarks persist.
- Select fish as allergen; regenerate and verify no fish ingredients appear.
- Use a tiny budget: see explicit failure rather than an invented successful plan.
- Select a region: UI must always clearly show test price warning; it must NOT claim region changes actual prices.

## If Git reports: invalid reference: origin/feat/mobile-demo-20261119

Earlier setup instructions used `git clone --single-branch`. In that case,
`git fetch origin` will continue to fetch only the initially selected branch,
so the mobile remote-tracking branch may be absent even though it exists on GitHub.
From the repository root in PowerShell, without discarding any local changes:

```powershell
git status --short
git fetch origin "refs/heads/feat/mobile-demo-20261119:refs/remotes/origin/feat/mobile-demo-20261119"
git switch --track origin/feat/mobile-demo-20261119
npm install
npm run check
npm run mobile:check
npm run mobile:android
```

Before switching, save any local changes if `git status --short` reports them.
If the explicit fetch fails, run `git remote -v` and verify that `origin`
points to `https://github.com/JohnCook36/pantrilo.git`.
The npm mobile scripts exist on the mobile branch, not on the earlier core branch.

## Text size accessibility (Android smoke)

- Open **Настройка** and select **Обычный / Крупный / Очень крупный** in the **Размер текста** control.
- The choice applies to all four screens; the default is **Крупный**, including existing installs that have no saved font preference.
- From **Меню**, open **Рецепт**. The same control appears on the recipe detail page; changing it immediately affects the ingredient list and descriptions.
- Close and reopen the app: the selection should persist through AsyncStorage, without resetting the menu or checked shopping items.
- Test all three sizes in both light and dark themes on Pixel 7, including long product names and the bottom navigation at the largest size.
- Android accessibility font-size settings may further enlarge React Native text; verify layout with system font scaling as well.

## SQLite persistence v1 (dependent PR)

New mobile development branch `feat/sqlite-persistence-20261119` migrates existing
AsyncStorage demo state to Expo SQLite on first launch, retaining the legacy
key as an untouched emergency backup. See [SQLite migration details](SQLITE.md).
