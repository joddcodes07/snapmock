'use strict';

const { DatabaseError } = require('./database');
const { parseJsonBody, sendJson } = require('./middleware');

function createRouter(database) {
  return async function route(request, response) {
    try {
      if (request.method === 'OPTIONS') {
        response.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'access-control-allow-headers': 'content-type' });
        return response.end();
      }

      const url = new URL(request.url, 'http://localhost');
      const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
      if (parts.length === 0 || parts.length > 2) return sendJson(response, 404, { error: 'Endpoint not found.' });
      const [collection, id] = parts;
      if (!database.collectionNames().includes(collection)) return sendJson(response, 404, { error: 'Collection not found.' });

      if (!id) return await collectionRoute(request, response, database, collection);
      return await recordRoute(request, response, database, collection, id);
    } catch (error) {
      return handleError(response, error);
    }
  };
}

async function collectionRoute(request, response, database, collection) {
  if (request.method === 'GET') return sendJson(response, 200, database.getCollection(collection));
  if (request.method === 'POST') {
    const created = await database.create(collection, await parseJsonBody(request));
    return sendJson(response, 201, created, { location: `/${encodeURIComponent(collection)}/${encodeURIComponent(created.id)}` });
  }
  return methodNotAllowed(response, 'GET, POST');
}

async function recordRoute(request, response, database, collection, id) {
  if (request.method === 'GET') {
    const record = database.getRecord(collection, id);
    return record ? sendJson(response, 200, record) : sendJson(response, 404, { error: 'Record not found.' });
  }
  if (request.method === 'PUT' || request.method === 'PATCH') {
    const body = await parseJsonBody(request);
    const record = request.method === 'PUT'
      ? await database.replace(collection, id, body)
      : await database.patch(collection, id, body);
    return record ? sendJson(response, 200, record) : sendJson(response, 404, { error: 'Record not found.' });
  }
  if (request.method === 'DELETE') {
    const removed = await database.remove(collection, id);
    if (!removed) return sendJson(response, 404, { error: 'Record not found.' });
    response.writeHead(204, { 'access-control-allow-origin': '*' });
    return response.end();
  }
  return methodNotAllowed(response, 'GET, PUT, PATCH, DELETE');
}

function methodNotAllowed(response, allow) {
  return sendJson(response, 405, { error: 'Method not allowed.' }, { allow });
}

function handleError(response, error) {
  if (response.headersSent) return response.end();
  if (error instanceof DatabaseError) {
    const status = error.code === 'COLLECTION_NOT_FOUND' ? 404 : 400;
    return sendJson(response, status, { error: error.message });
  }
  if (error.code === 'BODY_TOO_LARGE' || error.code === 'INVALID_JSON_BODY') {
    return sendJson(response, 400, { error: error.message });
  }
  return sendJson(response, 500, { error: 'Unexpected server error.' });
}

module.exports = { createRouter };
