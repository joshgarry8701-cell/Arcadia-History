// SQLite storage using Node's built-in node:sqlite (no native dependencies).
'use strict';
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_SETTINGS = {
  ai_enabled: true,            // teacher switch; marking also needs ANTHROPIC_API_KEY on the server
  ai_model: 'claude-sonnet-5-5',
  price_input_per_mtok: null,  // USD per million input tokens — teacher must enter from the provider's price page
  price_output_per_mtok: null, // USD per million output tokens
  monthly_budget_usd: 10,      // hard ceiling enforced before every AI call
  max_output_tokens: 1500,
  max_words: 900,              // longest response a student can submit for marking
  daily_marks_per_student: 3,
  cooldown_seconds: 60,
  max_resubmissions: 2
};

function open(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('teacher','student')),
      display TEXT,
      class TEXT,
      pass_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS content (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS progress (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      topic_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      parent_id TEXT,
      text TEXT NOT NULL,
      status TEXT NOT NULL,
      ai_json TEXT,
      ai_error TEXT,
      teacher_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      at TEXT NOT NULL,
      input_tokens INTEGER NOT NULL,
      output_tokens INTEGER NOT NULL,
      cost_usd REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  return db;
}

function getSettings(db) {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const s = { ...DEFAULT_SETTINGS };
  for (const r of rows) s[r.key] = JSON.parse(r.value);
  return s;
}

function setSettings(db, patch) {
  const stmt = db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  for (const [k, v] of Object.entries(patch)) {
    if (!(k in DEFAULT_SETTINGS)) continue;
    stmt.run(k, JSON.stringify(v));
  }
  return getSettings(db);
}

module.exports = { open, getSettings, setSettings, DEFAULT_SETTINGS };
