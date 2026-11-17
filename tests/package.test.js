'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const packageInfo = require('../package.json');

const execFileAsync = promisify(execFile);

test('public API exposes the package version', () => {
  assert.equal(require('../src').version, packageInfo.version);
});

test('CLI prints help and version', async () => {
  const help = await execFileAsync(process.execPath, ['bin/snapmock.js', '--help']);
  const version = await execFileAsync(process.execPath, ['bin/snapmock.js', '--version']);

  assert.match(help.stdout, /Usage: snapmock/);
  assert.equal(version.stdout.trim(), packageInfo.version);
});
