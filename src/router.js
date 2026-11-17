'use strict';

const { DatabaseError } = require('./database');
const { parseJsonBody, sendJson } = require('./middleware');

function createRouter(database, { beforeRequest } = {}) {
  return async function route(request, response) {
    try {
      if (request.method === 'OPTIONS') {
        response.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'access-control-allow-headers': 'content-type' });
        return response.end();
      }
      if (beforeRequest && await beforeRequest(request, response)) return;

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
  if (request.method === 'GET') {
    const url = new URL(request.url, 'http://localhost');
    const result = queryCollection(database.getCollection(collection), url.searchParams);
    return sendJson(response, 200, result.records, result.headers);
  }
  if (request.method === 'POST') {
    const created = await database.create(collection, await parseJsonBody(request));
    return sendJson(response, 201, created, { location: `/${encodeURIComponent(collection)}/${encodeURIComponent(created.id)}` });
  }
  return methodNotAllowed(response, 'GET, POST');
}

function queryCollection(records, params) {
  const pageValue = params.get('_page');
  const limitValue = params.get('_limit');
  const page = pageValue === null ? null : Number(pageValue);
  const limit = limitValue === null ? null : Number(limitValue);
  if ((page !== null && (!Number.isInteger(page) || page < 1)) || (limit !== null && (!Number.isInteger(limit) || limit < 1))) {
    const error = new Error('Pagination values must be positive integers.');
    error.code = 'INVALID_QUERY';
    throw error;
  }

  let result = records;
  for (const [key, value] of params) {
    if (key === '_page' || key === '_limit' || key === 'q') continue;
    result = result.filter((record) => String(record[key]) === value);
  }
  const search = params.get('q');
  if (search) {
    const needle = search.toLowerCase();
    result = result.filter((record) => Object.values(record).some((value) => typeof value === 'string' && value.toLowerCase().includes(needle)));
  }

  const total = result.length;
  if (page !== null || limit !== null) {
    const effectiveLimit = limit || 10;
    const effectivePage = page || 1;
    result = result.slice((effectivePage - 1) * effectiveLimit, effectivePage * effectiveLimit);
    return { records: result, headers: { 'x-total-count': String(total), 'x-page': String(effectivePage), 'x-limit': String(effectiveLimit), 'x-total-pages': String(Math.ceil(total / effectiveLimit)) } };
  }
  return { records: result, headers: { 'x-total-count': String(total) } };
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
  if (error.code === 'BODY_TOO_LARGE' || error.code === 'INVALID_JSON_BODY' || error.code === 'INVALID_QUERY') {
    return sendJson(response, 400, { error: error.message });
  }
  return sendJson(response, 500, { error: 'Unexpected server error.' });
}

module.exports = { createRouter, queryCollection };
