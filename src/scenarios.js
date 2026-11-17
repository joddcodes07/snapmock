'use strict';

const { sendJson } = require('./middleware');

const SCENARIOS = new Set(['normal', 'unauthorized', 'serverError', 'slowNetwork']);

function createRequestSimulator({ delay = 0, errorRate = 0, scenario = 'normal', random = Math.random } = {}) {
  validateNonNegativeInteger(delay, 'delay');
  validatePercentage(errorRate);
  if (!SCENARIOS.has(scenario)) throw new TypeError(`Unknown scenario: ${scenario}.`);

  return async function simulate(request, response) {
    if (request.method === 'OPTIONS') return false;
    const totalDelay = delay + (scenario === 'slowNetwork' ? 1000 : 0);
    if (totalDelay > 0) await new Promise((resolve) => setTimeout(resolve, totalDelay));
    if (scenario === 'unauthorized') {
      sendJson(response, 401, { error: 'Unauthorized scenario response.' });
      return true;
    }
    if (scenario === 'serverError' || random() * 100 < errorRate) {
      sendJson(response, 500, { error: 'Simulated server error.' });
      return true;
    }
    return false;
  };
}

function validateNonNegativeInteger(value, name) {
  if (!Number.isInteger(value) || value < 0) throw new TypeError(`${name} must be a non-negative integer.`);
}

function validatePercentage(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new TypeError('errorRate must be a number between 0 and 100.');
  }
}

module.exports = { SCENARIOS, createRequestSimulator };
