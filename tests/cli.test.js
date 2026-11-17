'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { parseArguments, run } = require('../src/cli');

test('parses supported options and rejects malformed input', () => {
  assert.deepEqual(parseArguments(['--db', 'db.json', '--port', '4000']), { db: 'db.json', port: '4000' });
  assert.throws(() => parseArguments(['--port']), /requires a value/);
  assert.throws(() => parseArguments(['--unknown', 'x']), /Unknown option/);
});

test('generate writes a collection to its explicit output path', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'snapmock-cli-'));
  const output = path.join(directory, 'generated.json');
  const logs = [];
  await run(['generate', 'users', '--count', '2', '--output', output], { log: (message) => logs.push(message) });
  assert.equal(JSON.parse(await readFile(output, 'utf8')).users.length, 2);
  assert.match(logs[0], /Generated 2 users/);
});
