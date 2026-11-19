# SQLite persistence – first migration (v1)

The Pantrilo mobile prototype now saves the family preferences, generated menu,
checkmarks, theme and text size to a local `pantrilo-local.db` database using
`expo-sqlite` (Expo SDK 54).

## Design

- The database schema version is tracked with `PRAGMA user_version`.
- Schema v1 contains `app_snapshot` (one validated JSON state record) and a
  reserved `catalog_metadata` table. This deliberately does **not** claim
  a normalized recipe/price/pantry relational model; that is later work.
- On the first launch after update, if SQLite is empty, the earlier
  `pantrilo:demo:v1` AsyncStorage key is read, validated, and copied to SQLite.
- The old AsyncStorage key is **not deleted**, as an emergency backup. After
  migration, SQLite is authoritative. Future changes will not update the backup.
- SQLite snapshot updates are atomic; writes are serialized to prevent an older
  write finishing after a newer state.
- If a snapshot is invalid or the DB cannot open, the app displays a persistent
  warning and disables *writes* rather than silently overwriting saved data.
- Existing UI and its demo catalog remain unchanged; no actual regional price
  integration is provided by this migration.

## User verification on Android emulator

1. While on the previous mobile branch, configure a distinctive budget, choose
   dark mode and 'Очень крупный', generate a menu and check a shopping item.
2. Update to the new branch, install dependencies and launch:

   ```powershell
   npm install
   npm run check
   npm run mobile:check
   npm run mobile:android
   ```

3. Confirm the existing settings, 7-day plan and checked shopping item survive.
4. Change a setting, quit/reopen the app and confirm the new value persists.
5. Test airplane mode: the saved plan and shopping list must still open.
6. Do not clear emulator app data or uninstall the app during migration testing;
   doing so erases its local storage, regardless of persistence backend.

**Limitations:** SQL migrations have unit/schema tests, but the native Expo
SQLite/AsyncStorage migration must be exercised on the Android emulator.
Cloud sync, multi-user data, regional price imports and normalized catalogue
entities remain tracked in separate GitHub issues.
