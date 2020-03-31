#!/usr/bin/env node

const util = require('../lib/util');
const loadApiSpec = require('../lib/openapi');

const spec = loadApiSpec(process.argv[2]);

// An improperly defined CRD lacks a properties key

for(const key in spec['definitions']) {
  const { group, version, kind } = util.guessGroupVersionKind(key);
  if(group && !['meta', 'apiextensions'].includes(group)) {
    if(! spec['definitions'][key]['properties']) {
      console.warn(`${group}/${version} ${kind}`);
    }
  }
}
