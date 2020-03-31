#!/usr/bin/env node

const loadConfig = require('../lib/config');
const reflect = require('../lib/reflector');

const config = loadConfig();

// TODO - accept $group.$version.$kind via ARGS

const obj = reflect(
  config.definitions,
  config.definitions.getByVersionKind({group: 'core', version: 'v1', kind: 'Event'}),
  config.definitions.getByVersionKind({group: 'networking', version: 'v1', kind: 'NetworkPolicy'}));

//console.error(JSON.stringify(obj, null, 2));
