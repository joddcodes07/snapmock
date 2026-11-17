'use strict';

const { createSnapMockServer, listen } = require('./server');
const { SCENARIOS } = require('./scenarios');
const { generateRecords } = require('./generators');

module.exports = {
  createSnapMockServer,
  generateRecords,
  listen,
  scenarios: [...SCENARIOS],
  version: require('../package.json').version
};
