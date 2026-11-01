#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const { save, latest, context } = require('./lib/checkpoints');
try {
  const [action, cwd = process.cwd()] = process.argv.slice(2);
  if (action === 'save') {
    const raw = fs.readFileSync(0, 'utf8');
    if (Buffer.byteLength(raw) > 16000) throw new Error('Checkpoint input exceeds 16 KB');
    console.log(JSON.stringify(save(cwd, JSON.parse(raw)), null, 2));
  } else if (action === 'show') console.log(JSON.stringify(latest(context(cwd)), null, 2));
  else throw new Error('Usage: node scripts/checkpoint.js save|show [project-directory]; save reads JSON from stdin');
} catch (e) { console.error(`[Checkpoint] ${e.message}`); process.exitCode = 1; }
