'use strict';

const FIRST_NAMES = ['Ava', 'Liam', 'Mia', 'Noah', 'Zoe', 'Arjun', 'Priya', 'Leo'];
const LAST_NAMES = ['Shah', 'Khan', 'Patel', 'Smith', 'Jones', 'Brown', 'Garcia', 'Wilson'];
const PRODUCTS = ['Wireless Headphones', 'Travel Mug', 'Mechanical Keyboard', 'Desk Lamp', 'Canvas Backpack'];

function generateRecords(collection, count, random = Math.random) {
  if (!Number.isInteger(count) || count < 1) throw new TypeError('count must be a positive integer.');
  if (!collection || typeof collection !== 'string') throw new TypeError('A collection name is required.');
  return Array.from({ length: count }, (_, index) => generateRecord(collection, index + 1, random));
}

function generateRecord(collection, id, random) {
  const name = `${pick(FIRST_NAMES, random)} ${pick(LAST_NAMES, random)}`;
  const normalized = collection.toLowerCase();
  const base = { id };
  if (normalized.includes('user') || normalized.includes('customer')) {
    return { ...base, name, email: `${name.toLowerCase().replace(' ', '.')}@example.com`, phone: `+1-555-${String(1000 + Math.floor(random() * 9000))}`, age: 18 + Math.floor(random() * 53) };
  }
  if (normalized.includes('product')) {
    return { ...base, name: pick(PRODUCTS, random), price: Number((10 + random() * 190).toFixed(2)) };
  }
  return { ...base, name, email: `${name.toLowerCase().replace(' ', '.')}@example.com`, age: 18 + Math.floor(random() * 53) };
}

function pick(values, random) {
  return values[Math.floor(random() * values.length)];
}

module.exports = { generateRecords };
