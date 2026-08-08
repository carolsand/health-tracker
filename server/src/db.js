const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

// Resolve relative to the server's own root (not process.cwd()), so this
// works the same regardless of which directory a command is run from.
const SERVER_ROOT = path.join(__dirname, "..");
const DB_PATH = path.resolve(SERVER_ROOT, process.env.DB_PATH || "./data/tracker.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_state (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    state_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = db;
