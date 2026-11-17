'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { close, createSnapMockServer, listen } = require('../src/server');

async function start(options = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'snapmock-server-'));
  const dbPath = path.join(directory, 'db.json');
  await writeFile(dbPath, '{"movies":[{"id":1,"title":"Arrival","genre":"Sci-Fi"}]}');
  const { server } = await createSnapMockServer({ dbPath, ...options });
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

test('simulates named scenarios and error rates', async (t) => {
  const unauthorized = await start({ scenario: 'unauthorized' });
  const errors = await start({ errorRate: 100 });
  t.after(() => Promise.all([close(unauthorized.server), close(errors.server)]));
  assert.equal((await fetch(`${unauthorized.url}/movies`)).status, 401);
  assert.equal((await fetch(`${errors.url}/movies`)).status, 500);
});

test('delays responses by the configured duration', async (t) => {
  const app = await start({ delay: 25 });
  t.after(() => close(app.server));
  const startedAt = Date.now();
  assert.equal((await fetch(`${app.url}/movies`)).status, 200);
  assert.ok(Date.now() - startedAt >= 20);
});

test('validates simulation options', async () => {
  await assert.rejects(createSnapMockServer({ dbPath: '/missing', scenario: 'unknown' }), /Unknown scenario/);
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

test('filters, searches, and paginates collections', async (t) => {
  const app = await start();
  t.after(() => close(app.server));
  await fetch(`${app.url}/movies`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"title":"Interstellar","genre":"Sci-Fi"}' });
  await fetch(`${app.url}/movies`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"title":"Alien","genre":"Horror"}' });
  const filtered = await fetch(`${app.url}/movies?genre=Sci-Fi&q=stellar&_page=1&_limit=1`);
  assert.equal(filtered.headers.get('x-total-count'), '1');
  assert.equal(filtered.headers.get('x-total-pages'), '1');
  assert.deepEqual(await filtered.json(), [{ id: 2, title: 'Interstellar', genre: 'Sci-Fi' }]);
  assert.equal((await fetch(`${app.url}/movies?_page=zero`)).status, 400);
});
