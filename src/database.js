'use strict';

const { randomBytes } = require('node:crypto');
const { readFile, rename, unlink, writeFile } = require('node:fs/promises');
const path = require('node:path');
const { clone, isPlainObject } = require('./utils');

class DatabaseError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
  }
}

class JsonDatabase {
  constructor(filePath) {
    this.filePath = path.resolve(filePath);
    this.data = null;
    this.writeChain = Promise.resolve();
  }

  async load() {
    let text;
    try {
      text = await readFile(this.filePath, 'utf8');
    } catch (error) {
      throw new DatabaseError('Unable to read the database file.', 'DATABASE_READ_ERROR');
    }

    try {
      this.data = JSON.parse(text);
    } catch (error) {
      throw new DatabaseError('The database file contains invalid JSON.', 'DATABASE_INVALID_JSON');
    }

    if (!isPlainObject(this.data)) {
      throw new DatabaseError('The database root must be a JSON object.', 'DATABASE_INVALID_SHAPE');
    }

    for (const [name, collection] of Object.entries(this.data)) {
      if (!Array.isArray(collection)) {
        throw new DatabaseError(`Collection "${name}" must be an array.`, 'DATABASE_INVALID_COLLECTION');
      }
    }

    return this;
  }

  collectionNames() {
    return Object.keys(this.#data());
  }

  getCollection(name) {
    return clone(this.#collection(name));
  }

  getRecord(name, id) {
    const record = this.#collection(name).find((item) => String(item.id) === String(id));
    return record ? clone(record) : null;
  }

  async create(name, record) {
    this.#validateRecord(record);
    return this.#mutate(async () => {
      const collection = this.#collection(name);
      const next = clone(record);
      if (next.id === undefined || next.id === null || next.id === '') {
        next.id = this.#nextId(collection);
      }
      if (collection.some((item) => String(item.id) === String(next.id))) {
        throw new DatabaseError('A record with this id already exists.', 'DUPLICATE_ID');
      }
      collection.push(next);
      return clone(next);
    });
  }

  async replace(name, id, record) {
    this.#validateRecord(record);
    return this.#mutate(async () => {
      const collection = this.#collection(name);
      const index = this.#findIndex(collection, id);
      if (index === -1) return null;
      const next = { ...clone(record), id: collection[index].id };
      collection[index] = next;
      return clone(next);
    });
  }

  async patch(name, id, changes) {
    this.#validateRecord(changes);
    return this.#mutate(async () => {
      const collection = this.#collection(name);
      const index = this.#findIndex(collection, id);
      if (index === -1) return null;
      const next = { ...collection[index], ...clone(changes), id: collection[index].id };
      collection[index] = next;
      return clone(next);
    });
  }

  async remove(name, id) {
    return this.#mutate(async () => {
      const collection = this.#collection(name);
      const index = this.#findIndex(collection, id);
      if (index === -1) return false;
      collection.splice(index, 1);
      return true;
    });
  }

  #data() {
    if (!this.data) throw new DatabaseError('The database has not been loaded.', 'DATABASE_NOT_LOADED');
    return this.data;
  }

  #collection(name) {
    const collection = this.#data()[name];
    if (!collection) throw new DatabaseError('Collection not found.', 'COLLECTION_NOT_FOUND');
    return collection;
  }

  #findIndex(collection, id) {
    return collection.findIndex((item) => String(item.id) === String(id));
  }

  #nextId(collection) {
    const numericIds = collection
      .map((item) => Number(item.id))
      .filter((id) => Number.isInteger(id) && id >= 0);
    return numericIds.length === 0 ? 1 : Math.max(...numericIds) + 1;
  }

  #validateRecord(record) {
    if (!isPlainObject(record)) {
      throw new DatabaseError('A record must be a JSON object.', 'INVALID_RECORD');
    }
  }

  #mutate(operation) {
    const task = this.writeChain.then(async () => {
      const result = await operation();
      await this.#persist();
      return result;
    });
    this.writeChain = task.catch(() => undefined);
    return task;
  }

  async #persist() {
    const directory = path.dirname(this.filePath);
    const temporaryPath = path.join(directory, `.${path.basename(this.filePath)}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`);
    try {
      await writeFile(temporaryPath, `${JSON.stringify(this.#data(), null, 2)}\n`, 'utf8');
      await rename(temporaryPath, this.filePath);
    } catch (error) {
      await unlink(temporaryPath).catch(() => undefined);
      throw new DatabaseError('Unable to save the database file.', 'DATABASE_WRITE_ERROR');
    }
  }
}

module.exports = { DatabaseError, JsonDatabase };
