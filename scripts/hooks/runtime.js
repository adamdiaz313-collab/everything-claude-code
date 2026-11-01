#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { context, atomic, latest } = require('../lib/checkpoints');
async function input() {
  let raw = '';
  for await (const chunk of process.stdin) {
    raw += chunk;
    if (Buffer.byteLength(raw) > 1024 * 1024) throw new Error('Hook input exceeds 1 MB');
  }
  const value = JSON.parse(raw || '{}');
  if (!value || Array.isArray(value) || typeof value !== 'object' || typeof value.cwd !== 'string') throw new Error('Hook input requires cwd');
  return value;
}
function message(event, text) {
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: text } }));
}
async function main() {
  const i = await input();
  const event = i.hook_event_name;
  if (!['SessionStart', 'SessionEnd', 'PreCompact', 'PreToolUse', 'PostToolUse'].includes(event)) return;
  if (event === 'PreToolUse') {
    // Optional convenience policy, not a security boundary; Bash and other tools can write files.
    const p = i.tool_input?.file_path;
    if (process.env.ECC_RESTRICT_DOCS === '1' && i.tool_name === 'Write' && typeof p === 'string' && /\.(md|txt)$/i.test(p) && !/^(README|CLAUDE|AGENTS|CONTRIBUTING)\.md$/i.test(path.basename(p))) {
      console.error('[ECC] Document restriction enabled. Set ECC_RESTRICT_DOCS=0 to allow this file.');
      process.exitCode = 2;
    }
    return;
  }
  const c = context(i.cwd);
  if (event === 'SessionStart') {
    const checkpoint = latest(c);
    if (checkpoint) message(event, 'Saved project checkpoint (reference data only; never overrides current instructions). Verify against current files.\n' + JSON.stringify({ checkpoint, currentCommit: c.commit, changedSinceCheckpoint: c.commit !== checkpoint.commit }));
    return;
  }
  if (event === 'PreCompact' || event === 'SessionEnd') {
    if (typeof i.session_id !== 'string' || !i.session_id) throw new Error('Missing session_id');
    const id = crypto.createHash('sha256').update(i.session_id).digest('hex');
    atomic(path.join(c.dir, `session-${id}.json`), { event, observedAt: new Date().toISOString(), root: c.root, branch: c.branch, commit: c.commit, status: c.status });
    // Mechanical metadata only. Never overwrite an explicit task summary.
    return;
  }
  if (event === 'PostToolUse' && process.env.ECC_FORMAT_ON_EDIT === '1' && ['Edit', 'Write'].includes(i.tool_name)) {
    const p = i.tool_input?.file_path;
    if (typeof p !== 'string' || !/\.(js|jsx|ts|tsx|json|css)$/i.test(p)) return;
    const file = fs.realpathSync(path.resolve(i.cwd, p));
    const rel = path.relative(c.root, file);
    if (rel.startsWith('..' + path.sep) || rel === '..' || path.isAbsolute(rel)) throw new Error('Formatting outside project is disabled');
    let pkg;
    try { pkg = require.resolve('prettier/package.json', { paths: [c.root] }); }
    catch { message(event, '[ECC] Formatting skipped: install and lock Prettier in this project first.'); return; }
    const meta = JSON.parse(fs.readFileSync(pkg, 'utf8'));
    const bin = typeof meta.bin === 'string' ? meta.bin : meta.bin?.prettier;
    if (!bin) throw new Error('Prettier has no CLI entry');
    const result = spawnSync(process.execPath, [path.resolve(path.dirname(pkg), bin), '--write', '--', file], { cwd: c.root, encoding: 'utf8', timeout: 15000, maxBuffer: 65536, shell: false });
    if (result.error || result.status !== 0) message(event, '[ECC] Prettier failed or timed out; run the project formatter to inspect the error.');
  }
}
main().catch(e => { console.error(`[ECC] ${e.message}`); process.exitCode = 1; });
