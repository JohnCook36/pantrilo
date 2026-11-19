/** Android/iOS persistence: SQLite is authoritative; legacy AsyncStorage is read once. */
import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeSavedState, encodeSavedState } from './state-codec.ts';
import type { SavedState } from './state-codec.ts';
import { DB_FILENAME, DB_SCHEMA_VERSION, READ_SNAPSHOT_SQL, SCHEMA_V1, WRITE_SNAPSHOT_SQL } from './persistence-schema.ts';

const LEGACY_KEY = 'pantrilo:demo:v1';
let databasePromise: Promise<SQLite.SQLiteDatabase> | undefined;
let writeQueue: Promise<void> = Promise.resolve();

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_FILENAME);
      await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
      const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      const version = row?.user_version ?? 0;
      if (version > DB_SCHEMA_VERSION) {
        throw new Error('База создана более новой версией приложения. Обнови Pantrilo.');
      }
      if (version === 0) {
        await db.withExclusiveTransactionAsync(async (tx) => {
          await tx.execAsync(SCHEMA_V1);
          await tx.execAsync('PRAGMA user_version = 1');
        });
      }
      return db;
    })().catch((error: unknown) => {
      databasePromise = undefined;
      throw error;
    });
  }
  return databasePromise;
}

async function writeSnapshot(db: SQLite.SQLiteDatabase, json: string): Promise<void> {
  await db.runAsync(WRITE_SNAPSHOT_SQL, json, Date.now());
}

/** Read SQLite first; import legacy AsyncStorage only if SQLite has no snapshot. */
export async function loadLocalState(): Promise<SavedState | null> {
  // Avoid loading an outdated snapshot while an earlier write is in flight.
  await writeQueue;
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ payload: string }>(READ_SNAPSHOT_SQL);
  if (row) return decodeSavedState(row.payload);
  const legacy = await AsyncStorage.getItem(LEGACY_KEY);
  if (legacy === null) return null;
  const saved = decodeSavedState(legacy);
  // Atomic INSERT and leave AsyncStorage untouched as a recovery backup.
  // Only called during initial bootstrap, before UI permits any writes.
  await writeSnapshot(db, encodeSavedState(saved));
  return saved;
}

/** Queue writes: rapid theme/tabs/checkbox changes cannot finish out of order. */
export function saveLocalState(state: SavedState): Promise<void> {
  const payload = encodeSavedState(state);
  const next = writeQueue.catch(() => undefined).then(async () => {
    const db = await getDatabase();
    await writeSnapshot(db, payload);
  });
  writeQueue = next;
  return next;
}
