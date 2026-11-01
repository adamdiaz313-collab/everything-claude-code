const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runSuite } = require('./run-all');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-runner-'));
try {
 fs.writeFileSync(path.join(dir,'crash.js'), 'throw new Error("expected fixture crash")');
 assert.equal(runSuite(['crash.js'],dir),1);
 assert.equal(runSuite(['missing.js'],dir),1);
 fs.writeFileSync(path.join(dir,'ok.js'), 'process.exit(0)');
 assert.equal(runSuite(['ok.js'],dir),0);
 console.log('Runner regressions: 3 passed');
} finally { fs.rmSync(dir,{ recursive:true, force:true }); }
