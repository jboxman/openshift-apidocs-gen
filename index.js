const { inspect } = require('util');

const loadConfig = require('./lib/config');

const config = loadConfig({ specFile: process.argv[2] });
