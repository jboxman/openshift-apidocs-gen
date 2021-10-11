#!/usr/bin/env node

const loadApiSpec = require('../lib/openapi');
const spec = loadApiSpec(process.argv[2]);

const what = Object.entries(spec['definitions']).reduce((accum, [ id, spec ]) => {
  const kgvs = spec['x-kubernetes-group-version-kind'] || [];
  return accum.concat({
    id,
    kgvs
  });
}, []);

for(const obj of what) {
  if(obj.kgvs.length > 1)
    console.log(`${obj.id} ${obj.kgvs.length} ${obj.kgvs.map(v => `${v.kind}:${v.group}:${v.version}`).join('-')}`);
}
