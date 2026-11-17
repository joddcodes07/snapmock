'use strict';

const { writeFile } = require('node:fs/promises');
const path = require('node:path');
const { generateRecords } = require('./generators');
const { SCENARIOS } = require('./scenarios');
const { createSnapMockServer, listen, close } = require('./server');

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith('--')) throw new Error(`Unknown argument: ${argument}`);
    const key = argument.slice(2);
    if (!['db', 'port', 'delay', 'error-rate', 'scenario', 'count', 'output'].includes(key)) throw new Error(`Unknown option: ${argument}`);
    const value = args[++index];
    if (!value || value.startsWith('--')) throw new Error(`Option ${argument} requires a value.`);
    options[key] = value;
  }
  return options;
}

function asInteger(value, name, min, max = Infinity) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  return number;
}

async function run(args, output = console) {
  if (args[0] === 'generate') return generateCommand(args.slice(1), output);
  const options = parseArguments(args);
  if (!options.db) throw new Error('The --db option is required.');
  const port = options.port === undefined ? 3000 : asInteger(options.port, 'port', 1, 65535);
  const delay = options.delay === undefined ? 0 : asInteger(options.delay, 'delay', 0);
  const errorRate = options['error-rate'] === undefined ? 0 : Number(options['error-rate']);
  if (!Number.isFinite(errorRate) || errorRate < 0 || errorRate > 100) throw new Error('error-rate must be between 0 and 100.');
  const scenario = options.scenario || 'normal';
  if (!SCENARIOS.has(scenario)) throw new Error(`scenario must be one of: ${[...SCENARIOS].join(', ')}.`);
  const { database, server } = await createSnapMockServer({ dbPath: options.db, delay, errorRate, scenario });
  const address = await listen(server, port, '127.0.0.1');
  output.log(`SnapMock running at http://127.0.0.1:${address.port}`);
  for (const collection of database.collectionNames()) output.log(`  /${collection}  GET, POST`);
  const shutdown = async () => { output.log('\nSnapMock stopped.'); await close(server); };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  return { server, address };
}

async function generateCommand(args, output) {
  const collection = args[0];
  if (!collection || collection.startsWith('--')) throw new Error('A collection name is required for generate.');
  const options = parseArguments(args.slice(1));
  if (!options.count || !options.output) throw new Error('generate requires --count and --output.');
  const records = generateRecords(collection, asInteger(options.count, 'count', 1));
  const outputPath = path.resolve(options.output);
  await writeFile(outputPath, `${JSON.stringify({ [collection]: records }, null, 2)}\n`, 'utf8');
  output.log(`Generated ${records.length} ${collection} records in ${outputPath}`);
}

module.exports = { parseArguments, run };
