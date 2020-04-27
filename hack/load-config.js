#!/usr/bin/env node

const loadConfig = require('../lib/config');

if(! process.argv[2])
  process.exit(1);

const { definitions } = loadConfig({ specFile: process.argv[2] });

console.log('Loaded');

for(const [ key, val ] of Object.entries(definitions.all())) {
  //console.log(JSON.stringify(val.flatProperties, null, 2));
  console.log(JSON.stringify(val.relatedProperties, null, 2));
}
