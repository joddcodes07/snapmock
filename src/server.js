'use strict';

const http = require('node:http');
const { JsonDatabase } = require('./database');
const { createRouter } = require('./router');

async function createSnapMockServer({ dbPath } = {}) {
  if (!dbPath || typeof dbPath !== 'string') throw new TypeError('A database file path is required.');
  const database = await new JsonDatabase(dbPath).load();
  const server = http.createServer(createRouter(database));
  return { database, server };
}

function listen(server, port = 3000, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const onError = (error) => { server.off('listening', onListening); reject(error); };
    const onListening = () => { server.off('error', onError); resolve(server.address()); };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });
}

function close(server) {
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

module.exports = { close, createSnapMockServer, listen };
