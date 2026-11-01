'use strict';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync, execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-integration-'));
after(() => fs.rmSync(temp, { recursive: true, force: true }));
const state = path.join(temp, 'state');
const project = path.join(temp, 'project with spaces');
const other = path.join(temp, 'other');
fs.mkdirSync(project); fs.mkdirSync(other);
const env = { ...process.env, ECC_STATE_DIR: state, ECC_FORMAT_ON_EDIT: '0', ECC_RESTRICT_DOCS: '0' };
const notes = { task: 'Repair UI', decisions: 'Keep API', completed: 'Added fix', unfinished: 'Browser test', tests: 'Unit: 3 passed; browser: not run', nextSteps: 'Run browser tests' };
function run(script, input, extra = {}, args = []) {
 return spawnSync(process.execPath, [path.join(root, script), ...args], { input: typeof input === 'string' ? input : JSON.stringify(input), env: { ...env, ...extra }, encoding: 'utf8', timeout: 25000 });
}
function hook(event, data = {}, extra = {}) { return run('scripts/hooks/runtime.js', { cwd: project, session_id: 'session-one', hook_event_name: event, ...data }, extra); }
function save(cwd = project, value = notes) { return run('scripts/checkpoint.js', value, {}, ['save', cwd]); }
function show(cwd = project) { return JSON.parse(run('scripts/checkpoint.js', '', {}, ['show', cwd]).stdout); }
test('manifest dispatches real tool names to existing scripts', () => {
 const hooks = JSON.parse(fs.readFileSync(path.join(root, 'hooks/hooks.json'))).hooks;
 for (const [event, entries] of Object.entries(hooks)) for (const entry of entries) {
  assert.ok(!entry.matcher.includes('tool =='));
  for (const h of entry.hooks) assert.equal(h.command, 'node "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/runtime.js"');
  if (event === 'PostToolUse') { assert.match('Edit', new RegExp(entry.matcher)); assert.match('Write', new RegExp(entry.matcher)); assert.doesNotMatch('Bash', new RegExp(entry.matcher)); }
 }
});
test('save and restore explicit notes via SessionStart stdout', () => {
 assert.equal(save().status, 0);
 const result = hook('SessionStart'); assert.equal(result.status, 0);
 const output = JSON.parse(result.stdout).hookSpecificOutput;
 assert.equal(output.hookEventName, 'SessionStart'); assert.ok(output.additionalContext.includes(notes.nextSteps));
 assert.deepEqual(show().notes, notes);
});
test('other projects do not load these notes', () => { assert.equal(show(other), null); assert.equal(hook('SessionStart', { cwd: other }).stdout, ''); });
test('end and compact record metadata without overwriting summary', () => {
 assert.equal(hook('PreCompact').status, 0); assert.equal(hook('SessionEnd').status, 0);
 assert.deepEqual(show().notes, notes);
});
test('invalid checkpoint rejected without losing saved data', () => {
 assert.equal(save(project, { task: 'incomplete' }).status, 1); assert.deepEqual(show().notes, notes);
});
test('large checkpoint rejected', () => { assert.equal(save(project, { ...notes, task: 'x'.repeat(17000) }).status, 1); });
test('malformed hook input reports error', () => { assert.equal(run('scripts/hooks/runtime.js', '{').status, 1); });
test('missing cwd does not write into arbitrary directory', () => { assert.equal(run('scripts/hooks/runtime.js', {}).status, 1); });
test('normal documents allowed by default', () => { assert.equal(hook('PreToolUse', { tool_name: 'Write', tool_input: { file_path: 'docs/design.md' } }).status, 0); });
test('optional document policy blocks with exit 2 and allows README', () => {
 const opt = { ECC_RESTRICT_DOCS: '1' };
 assert.equal(hook('PreToolUse', { tool_name: 'Write', tool_input: { file_path: 'docs/design.md' } }, opt).status, 2);
 assert.equal(hook('PreToolUse', { tool_name: 'Write', tool_input: { file_path: 'README.md' } }, opt).status, 0);
});
test('missing local formatter reports skip; no download', () => {
 const file = path.join(other, 'x.js'); fs.writeFileSync(file, 'let x=1');
 const result = hook('PostToolUse', { cwd: other, tool_name: 'Edit', tool_input: { file_path: file } }, { ECC_FORMAT_ON_EDIT: '1' });
 assert.equal(result.status, 0); assert.ok(result.stdout.includes('install and lock Prettier')); assert.equal(fs.readFileSync(file, 'utf8'), 'let x=1');
});
test('formatter receives special filename as one literal argument', () => {
 const pkg = path.join(project, 'node_modules/prettier'); fs.mkdirSync(pkg, { recursive: true });
 fs.writeFileSync(path.join(pkg, 'package.json'), JSON.stringify({ name: 'prettier', bin: './cli.js' }));
 fs.writeFileSync(path.join(pkg, 'cli.js'), "require('fs').writeFileSync('received.json', JSON.stringify(process.argv.slice(2)))");
 const name = process.platform === 'win32' ? 'space & special.js' : 'space $(touch INJECTED) `touch INJECTED2` "quote.js';
 const file = path.join(project, name); fs.writeFileSync(file, 'let x=1');
 const result = hook('PostToolUse', { tool_name: 'Edit', tool_input: { file_path: file } }, { ECC_FORMAT_ON_EDIT: '1' });
 assert.equal(result.status, 0); assert.deepEqual(JSON.parse(fs.readFileSync(path.join(project, 'received.json'))), ['--write', '--', fs.realpathSync(file)]);
 assert.equal(fs.existsSync(path.join(project, 'INJECTED')), false);
 assert.equal(fs.existsSync(path.join(project, 'INJECTED2')), false);
});
test('formatter cannot edit outside project', () => {
 const file = path.join(other, 'outside.js'); fs.writeFileSync(file, 'x');
 assert.equal(hook('PostToolUse', { tool_name: 'Edit', tool_input: { file_path: file } }, { ECC_FORMAT_ON_EDIT: '1' }).status, 1);
});
test('corrupt latest checkpoint falls back to last valid notes', () => {
 const { context } = require('../../scripts/lib/checkpoints');
 const old = process.env.ECC_STATE_DIR; process.env.ECC_STATE_DIR = state;
 const c = context(project); if (old === undefined) delete process.env.ECC_STATE_DIR; else process.env.ECC_STATE_DIR = old;
 fs.writeFileSync(path.join(c.dir, 'checkpoint-9999999999999-aaaa.json'), '{'); assert.deepEqual(show().notes, notes);
});
test('sessions cannot escape storage with hostile IDs', () => {
 assert.equal(hook('SessionEnd', { session_id: '../../escape' }).status, 0); assert.equal(fs.existsSync(path.join(temp, 'escape.json')), false);
});
test('branch checkpoints remain separate including nested directories', () => {
 const repo = path.join(temp, 'git-project'); fs.mkdirSync(repo);
 const git = args => execFileSync('git', args, { cwd: repo, stdio: 'pipe' });
 git(['init', '-b', 'main']); git(['-c','user.name=Test','-c','user.email=test@example.invalid','commit','--allow-empty','-m','Initial']);
 assert.equal(save(repo).status, 0); git(['checkout','-b','feature']); assert.equal(show(repo), null);
 save(repo, { ...notes, task: 'Feature work' }); git(['checkout','main']);
 const sub = path.join(repo,'sub'); fs.mkdirSync(sub); assert.equal(show(sub).notes.task, notes.task);
});
test('formatting is disabled by default even when local formatter exists', () => {
 const output = path.join(project,'received.json'); fs.rmSync(output, {force:true});
 const file = path.join(project,'disabled.js'); fs.writeFileSync(file,'x');
 assert.equal(hook('PostToolUse',{tool_name:'Write',tool_input:{file_path:file}}).status,0);
 assert.equal(fs.existsSync(output),false);
});
test('formatter failure is surfaced as context without claiming success', () => {
 fs.writeFileSync(path.join(project,'node_modules/prettier/cli.js'),'process.exit(3)');
 const file = path.join(project,'disabled.js');
 const result = hook('PostToolUse',{tool_name:'Edit',tool_input:{file_path:file}},{ECC_FORMAT_ON_EDIT:'1'});
 assert.equal(result.status,0); assert.ok(result.stdout.includes('failed or timed out'));
});
test('saving notes does not modify project files', () => {
 const before = fs.readdirSync(project).sort(); assert.equal(save().status,0);
 assert.deepEqual(fs.readdirSync(project).sort(),before);
});
