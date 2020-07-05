#!/usr/bin/env node

const util = require('../lib/util');
const loadApiSpec = require('../lib/openapi');

const spec = loadApiSpec(process.argv[2]);

// TODO - probably need to load config and find defs with children.

const kinds = new Set([]);
for(const key in spec['definitions']) {
  const { group, version, kind } = util.guessGroupVersionKind(key);
  if(kind && spec['definitions'][key].properties && spec['definitions'][key].properties.spec)
    kinds.add(kind);
}

console.log(Array.from(kinds).sort().join(`\n`));
console.log(`\nCount: ${Array.from(kinds).length}`);
