'use strict';

const { createSnapMockServer, listen } = require('./server');

module.exports = {
  createSnapMockServer,
  listen,
  version: require('../package.json').version
};
