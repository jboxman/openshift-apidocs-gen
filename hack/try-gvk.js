#!/usr/bin/env node

const loadConfig = require('../lib/config');

// The OpenShift console outputs a list of {Group,Kind}

// Read GK from STDIN, then lookup if possible all
// available versions. With sorting, the latest
// version is probably what is offered in OCP-latest.

if(! process.argv[2])
  process.exit(1);

const { definitions } = loadConfig({ specFile: process.argv[2] });
const group = process.argv[3];
const version = process.argv[4];
const kind = process.argv[5];

const def = definitions.getByVersionKind({ group, version, kind });

if(def) {
  console.log(def.key());
}
else {
  console.log('No definition found.');
}
