'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const LIMIT = 12000;
function git(cwd, args) {
  try { return execFileSync('git', args, { cwd, encoding: 'utf8', timeout: 3000, maxBuffer: 65536, stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
  catch { return null; }
}
function context(cwd) {
  cwd = fs.realpathSync(cwd);
  const root = fs.realpathSync(git(cwd, ['rev-parse', '--show-toplevel']) || cwd);
  const branch = git(root, ['symbolic-ref', '--quiet', '--short', 'HEAD']) || git(root, ['rev-parse', 'HEAD']) || 'no-git';
  const key = crypto.createHash('sha256').update(JSON.stringify([root, branch])).digest('hex');
  const base = path.resolve(process.env.ECC_STATE_DIR || path.join(os.homedir(), '.claude', 'ecc-state'));
  return { root, branch, dir: path.join(base, key), commit: git(root, ['rev-parse', 'HEAD']), status: git(root, ['status', '--short', '--untracked-files=no']) };
}
function atomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${crypto.randomUUID()}.tmp`;
  try { fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' }); fs.renameSync(tmp, file); }
  finally { try { fs.unlinkSync(tmp); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
}
function validate(notes) {
  if (!notes || typeof notes !== 'object' || Array.isArray(notes)) throw new Error('Checkpoint must be an object');
  const fields = ['task', 'decisions', 'completed', 'unfinished', 'tests', 'nextSteps'];
  if (Object.keys(notes).some(k => !fields.includes(k))) throw new Error('Unknown checkpoint field');
  for (const k of fields) if (typeof notes[k] !== 'string') throw new Error(`Missing string field: ${k}`);
  if (!notes.task.trim() || !notes.nextSteps.trim()) throw new Error('Task and nextSteps must not be empty');
  if (Buffer.byteLength(JSON.stringify(notes)) > LIMIT) throw new Error('Checkpoint exceeds 12 KB');
  return notes;
}
function save(cwd, notes) {
  validate(notes);
  const c = context(cwd);
  const value = { version: 1, root: c.root, branch: c.branch, commit: c.commit, status: c.status, savedAt: new Date().toISOString(), notes };
  // Immutable history prevents concurrent sessions from silently destroying notes.
  atomic(path.join(c.dir, `checkpoint-${Date.now()}-${crypto.randomUUID()}.json`), value);
  return value;
}
function latest(c) {
  if (!fs.existsSync(c.dir)) return null;
  const files = fs.readdirSync(c.dir).filter(f => /^checkpoint-\d+-[a-f0-9-]+\.json$/.test(f)).sort().reverse();
  for (const file of files) {
    const p = path.join(c.dir, file);
    if (fs.statSync(p).size > 32000) continue;
    try {
      const value = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (value.version !== 1 || value.root !== c.root || value.branch !== c.branch) continue;
      validate(value.notes);
      return value;
    } catch { /* A damaged latest file must not hide the preceding checkpoint. */ }
  }
  return null;
}
module.exports = { context, atomic, save, latest, validate };
