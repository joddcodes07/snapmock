#!/usr/bin/env node
'use strict';

const { version } = require('../src');
const { run } = require('../src/cli');

const help = `Usage: snapmock --db <file> [options]

Start a configuration-driven mock REST API server.

Options:
  --db <file>          JSON database file (required to start a server)
  --port <number>      Server port (default: 3000)
  --delay <milliseconds>  Delay successful responses
  --error-rate <0-100> Simulate a percentage of server errors
  --scenario <name>    normal, unauthorized, serverError, or slowNetwork
  --help               Show this help message
  --version            Show the installed version

Generate fake records:
  snapmock generate <collection> --count <number> --output <file>`;

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(help);
  process.exitCode = 0;
} else if (args.includes('--version') || args.includes('-v')) {
  console.log(version);
  process.exitCode = 0;
} else {
  run(args).catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  });
}
