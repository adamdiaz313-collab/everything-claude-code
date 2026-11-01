#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const { save, latest, context } = require('./lib/checkpoints');
try {
  const [action, cwd = process.cwd()] = process.argv.slice(2);
  if (action === 'save') {
    // Read at most the limit plus one byte, even for an unbounded input stream.
    const buffer = Buffer.alloc(16001);
    let size = 0;
    while (size < buffer.length) {
      const count = fs.readSync(0, buffer, size, buffer.length - size, null);
      if (count === 0) break;
      size += count;
    }
    if (size > 16000) throw new Error('Checkpoint input exceeds 16 KB');
    const raw = buffer.subarray(0, size).toString('utf8');
    console.log(JSON.stringify(save(cwd, JSON.parse(raw)), null, 2));
  } else if (action === 'show') console.log(JSON.stringify(latest(context(cwd)), null, 2));
  else throw new Error('Usage: node scripts/checkpoint.js save|show [project-directory]; save reads JSON from stdin');
} catch (e) { console.error(`[Checkpoint] ${e.message}`); process.exitCode = 1; }
