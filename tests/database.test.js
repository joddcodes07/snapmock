'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readFile, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { DatabaseError, JsonDatabase } = require('../src/database');

async function temporaryDatabase(contents = '{"movies": [{"id": 1, "title": "Arrival", "genre": "Sci-Fi"}]}') {
  const directory = await mkdtemp(path.join(tmpdir(), 'snapmock-'));
  const filePath = path.join(directory, 'db.json');
  await writeFile(filePath, contents);
  return filePath;
}

test('loads collections and finds individual records', async () => {
  const database = await new JsonDatabase(await temporaryDatabase()).load();
  assert.equal(database.collectionNames()[0], 'movies');
  assert.equal(database.getRecord('movies', 1).title, 'Arrival');
  assert.equal(database.getRecord('movies', 99), null);
});

test('rejects malformed JSON and invalid collection shapes', async () => {
  await assert.rejects(new JsonDatabase(await temporaryDatabase('{')).load(), { code: 'DATABASE_INVALID_JSON' });
  await assert.rejects(new JsonDatabase(await temporaryDatabase('{"movies": {}}')).load(), { code: 'DATABASE_INVALID_COLLECTION' });
});

test('creates records with generated ids and rejects duplicates', async () => {
  const database = await new JsonDatabase(await temporaryDatabase()).load();
  const created = await database.create('movies', { title: 'Dune' });
  assert.equal(created.id, 2);
  await assert.rejects(database.create('movies', { id: 1, title: 'Duplicate' }), { code: 'DUPLICATE_ID' });
});

test('replaces, patches, deletes, and persists records', async () => {
  const filePath = await temporaryDatabase();
  const database = await new JsonDatabase(filePath).load();
  assert.deepEqual(await database.replace('movies', 1, { id: 200, title: 'Alien' }), { id: 1, title: 'Alien' });
  assert.deepEqual(await database.patch('movies', 1, { genre: 'Horror' }), { id: 1, title: 'Alien', genre: 'Horror' });
  assert.equal(await database.remove('movies', 1), true);
  assert.equal(await database.remove('movies', 1), false);
  assert.deepEqual(JSON.parse(await readFile(filePath, 'utf8')).movies, []);
});

test('serializes concurrent mutations', async () => {
  const database = await new JsonDatabase(await temporaryDatabase('{"users": []}')).load();
  const records = await Promise.all(Array.from({ length: 10 }, (_, index) => database.create('users', { name: `User ${index}` })));
  assert.deepEqual(records.map((record) => record.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('reports missing collections without exposing paths', async () => {
  const database = await new JsonDatabase(await temporaryDatabase()).load();
  assert.throws(() => database.getCollection('missing'), DatabaseError);
});
