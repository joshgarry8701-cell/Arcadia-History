'use strict';
const crypto = require('node:crypto');

const SESSION_DAYS = 30;

function hashSecret(secret) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(secret), salt, 32);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

function verifySecret(secret, stored) {
  const [alg, saltHex, keyHex] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const key = crypto.scryptSync(String(secret), Buffer.from(saltHex, 'hex'), 32);
  const want = Buffer.from(keyHex, 'hex');
  return want.length === key.length && crypto.timingSafeEqual(key, want);
}

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const newId = () => crypto.randomUUID();

// Readable access codes without easily confused characters.
function accessCode(len = 8) {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out.slice(0, 4) + '-' + out.slice(4);
}

function createSession(db, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)')
    .run(sha(token), userId, Date.now() + SESSION_DAYS * 864e5);
  return token;
}

function userFromToken(db, token) {
  if (!token) return null;
  const row = db.prepare(`SELECT u.id, u.username, u.role, u.display, u.class, s.expires_at
    FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`).get(sha(token));
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(token));
    return null;
  }
  return { id: row.id, username: row.username, role: row.role, display: row.display, class: row.class };
}

function destroySession(db, token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(token));
}

// Simple in-memory login throttle: 10 failures per 15 minutes per key.
const failures = new Map();
function loginAllowed(key) {
  const now = Date.now();
  const list = (failures.get(key) || []).filter((t) => now - t < 15 * 60e3);
  failures.set(key, list);
  return list.length < 10;
}
function recordFailure(key) {
  const list = failures.get(key) || [];
  list.push(Date.now());
  failures.set(key, list);
}

module.exports = { hashSecret, verifySecret, newId, accessCode, createSession, userFromToken, destroySession, loginAllowed, recordFailure };
