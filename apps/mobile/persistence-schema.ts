/** SQLite schema. Increment PRAGMA user_version in a transaction for each migration. */
export const DB_FILENAME = 'pantrilo-local.db';
export const DB_SCHEMA_VERSION = 1;

export const SCHEMA_V1 = `
  CREATE TABLE IF NOT EXISTS app_snapshot (
    id INTEGER NOT NULL PRIMARY KEY CHECK(id = 1),
    payload TEXT NOT NULL,
    updated_at_ms INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS catalog_metadata (
    name TEXT NOT NULL PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

export const READ_SNAPSHOT_SQL = 'SELECT payload FROM app_snapshot WHERE id = 1';
export const WRITE_SNAPSHOT_SQL = `
  INSERT INTO app_snapshot (id, payload, updated_at_ms)
  VALUES (1, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    payload = excluded.payload,
    updated_at_ms = excluded.updated_at_ms
`;
