'use strict';

const { createSnapMockServer, listen } = require('./server');
const { SCENARIOS } = require('./scenarios');

module.exports = {
  createSnapMockServer,
  listen,
  scenarios: [...SCENARIOS],
  version: require('../package.json').version
};
