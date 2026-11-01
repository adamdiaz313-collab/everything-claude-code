#!/usr/bin/env node
'use strict';
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
function runSuite(files, dir = __dirname) {
  let failed = 0;
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-test-home-'));
  try {
    for (const file of files) {
      const target = path.join(dir, file);
      if (!fs.existsSync(target)) { console.error(`Missing suite: ${file}`); failed++; continue; }
      const args = ['--require', path.join(__dirname, 'isolated-home.cjs')];
      if (file === 'hooks/hooks.test.js') args.push('--test');
      const result = spawnSync(process.execPath, [...args, target], { encoding: 'utf8', env: { ...process.env, ECC_TEST_HOME: home }, timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
      console.log(result.stdout || ''); console.error(result.stderr || '');
      if (result.error || result.status !== 0) { failed++; console.error(`Failed suite: ${file}`); }
    }
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
  return failed;
}
if (require.main === module) process.exitCode = runSuite(['lib/utils.test.js', 'lib/package-manager.test.js', 'hooks/hooks.test.js', 'runner.test.js']) ? 1 : 0;
module.exports = { runSuite };
