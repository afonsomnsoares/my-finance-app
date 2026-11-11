const fs = require('fs');
const path = require('path');

/*
 * File-based store. Zero dependencies, zero install: data lives in JSON files
 * under backend/data/. Each call reads/writes the whole file, which is fine
 * for a single-user personal app running on one machine.
 */
const DATA_DIR = path.join(__dirname, '..', 'data');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function read(name) {
  ensureDir();
  const p = path.join(DATA_DIR, name);
  if (!fs.existsSync(p)) return [];
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return [];
  }
}

function write(name, rows) {
  ensureDir();
  fs.writeFileSync(path.join(DATA_DIR, name), JSON.stringify(rows, null, 2));
}

function nextId(rows) {
  return rows.length > 0 ? Math.max(...rows.map((r) => r.id || 0)) + 1 : 1;
}

function whereUser(rows, userId, extra = {}) {
  return rows.filter((r) => r.userId === userId && Object.entries(extra).every(([k, v]) => r[k] === v));
}

function findById(rows, id, userId) {
  return rows.find((r) => r.id === id && (!userId || r.userId === userId));
}

module.exports = { read, write, nextId, whereUser, findById, DATA_DIR };
