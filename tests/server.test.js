'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { close, createSnapMockServer, listen } = require('../src/server');

async function start() {
  const directory = await mkdtemp(path.join(tmpdir(), 'snapmock-server-'));
  const dbPath = path.join(directory, 'db.json');
  await writeFile(dbPath, '{"movies":[{"id":1,"title":"Arrival","genre":"Sci-Fi"}]}');
  const { server } = await createSnapMockServer({ dbPath });
  const address = await listen(server, 0);
  return { server, url: `http://127.0.0.1:${address.port}` };
}

test('provides automatic CRUD endpoints with expected status codes', async (t) => {
  const app = await start();
  t.after(() => close(app.server));
  const all = await fetch(`${app.url}/movies`);
  assert.equal(all.status, 200);
  assert.equal((await all.json())[0].title, 'Arrival');
  const created = await fetch(`${app.url}/movies`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"title":"Dune"}' });
  assert.equal(created.status, 201);
  assert.equal((await created.json()).id, 2);
  const patched = await fetch(`${app.url}/movies/2`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: '{"genre":"Sci-Fi"}' });
  assert.deepEqual(await patched.json(), { id: 2, title: 'Dune', genre: 'Sci-Fi' });
  const deleted = await fetch(`${app.url}/movies/2`, { method: 'DELETE' });
  assert.equal(deleted.status, 204);
});

test('handles missing resources, invalid bodies, and unsupported methods', async (t) => {
  const app = await start();
  t.after(() => close(app.server));
  assert.equal((await fetch(`${app.url}/missing`)).status, 404);
  assert.equal((await fetch(`${app.url}/movies/99`)).status, 404);
  assert.equal((await fetch(`${app.url}/movies`, { method: 'POST', body: '{' })).status, 400);
  const unsupported = await fetch(`${app.url}/movies`, { method: 'DELETE' });
  assert.equal(unsupported.status, 405);
  assert.equal(unsupported.headers.get('allow'), 'GET, POST');
});
