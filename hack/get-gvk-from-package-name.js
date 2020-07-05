#!/usr/bin/env node

const util = require('../lib/util');
const loadApiSpec = require('../lib/openapi');

const spec = loadApiSpec(process.argv[2]);

// With each new OpenShift release, new package namespaces may
// be added. This tool must be updated to extract the GVK
// (Group, Version, Kind) triple for each.

for(const key in spec['definitions']) {
  const { group, version, kind } = util.guessGroupVersionKind(key);
  // io.k8s.apimachinery.pkg.* are internal k8s definitions
  if(kind && group && version) {
    console.log(`${group}/${version} ${kind}`);
  }
  if(!group)
    console.log(`Add new GVK match for definition: "${key}".`);
}
