'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { generateRecords } = require('../src/generators');

test('generates realistic user records with sequential ids', () => {
  const users = generateRecords('users', 2, () => 0);
  assert.deepEqual(users, [
    { id: 1, name: 'Ava Shah', email: 'ava.shah@example.com', phone: '+1-555-1000', age: 18 },
    { id: 2, name: 'Ava Shah', email: 'ava.shah@example.com', phone: '+1-555-1000', age: 18 }
  ]);
});

test('generates product names and prices', () => {
  const [product] = generateRecords('products', 1, () => 0);
  assert.equal(product.name, 'Wireless Headphones');
  assert.equal(product.price, 10);
});

test('validates generation inputs', () => {
  assert.throws(() => generateRecords('', 1), /collection name/);
  assert.throws(() => generateRecords('users', 0), /positive integer/);
});
