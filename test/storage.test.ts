import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { DEFAULT_PREFERENCES } from '../src/sample-catalog.ts';
import { decodeSavedState, encodeSavedState } from '../apps/mobile/state-codec.ts';
import type { SavedState } from '../apps/mobile/state-codec.ts';
import { DB_SCHEMA_VERSION, READ_SNAPSHOT_SQL, SCHEMA_V1, WRITE_SNAPSHOT_SQL } from '../apps/mobile/persistence-schema.ts';

const original: SavedState = {
  preferences: DEFAULT_PREFERENCES,
  plannedPreferences: null,
  plan: null,
  purchased: ['oats', 'extra:coffee'],
  darkMode: true,
  textSize: 'extra',
};

test('SQLite schema tracks v1 and keeps a single atomic app snapshot', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(SCHEMA_V1);
    db.exec('PRAGMA user_version = ' + DB_SCHEMA_VERSION);
    assert.equal((db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version, 1);
    const saved = encodeSavedState(original);
    const stmt = db.prepare(WRITE_SNAPSHOT_SQL);
    stmt.run(saved, 100);
    const stored = db.prepare(READ_SNAPSHOT_SQL).get() as { payload: string };
    assert.deepEqual(decodeSavedState(stored.payload), original);
    stmt.run(encodeSavedState({ ...original, purchased: [] }), 101);
    const updated = db.prepare(READ_SNAPSHOT_SQL).get() as { payload: string };
    assert.deepEqual(decodeSavedState(updated.payload).purchased, []);
    assert.equal((db.prepare('SELECT COUNT(*) as count FROM app_snapshot').get() as { count: number }).count, 1);
  } finally { db.close(); }
});

test('state codec survives a JSON roundtrip preserving text size', () => {
  assert.deepEqual(decodeSavedState(encodeSavedState(original)), original);
});

test('legacy AsyncStorage record with no textSize migrates to large', () => {
  const { textSize: _, ...legacy } = original;
  assert.equal(decodeSavedState(JSON.stringify(legacy)).textSize, 'large');
});

test('malformed legacy JSON must not silently reset the household', () => {
  assert.throws(() => decodeSavedState('{broken'), /повреждены/);
  assert.throws(() => decodeSavedState('{}'), /настройки семьи/);
});

test('corrupted plan and purchase marks fail closed', () => {
  assert.throws(() => decodeSavedState(JSON.stringify({ ...original, purchased: [2] })), /отметки покупок/);
  assert.throws(() => decodeSavedState(JSON.stringify({ ...original, plan: { assignments: {} } })), /недельный план/);
});

test('unknown text setting falls back safely instead of breaking UI', () => {
  assert.equal(decodeSavedState(JSON.stringify({ ...original, textSize: 'gigantic' })).textSize, 'large');
});
