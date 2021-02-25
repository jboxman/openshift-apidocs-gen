#!/usr/bin/env node

const program = require('commander');

const loadApiSpec = require('../lib/openapi');
const { guessGroupVersionKind } = require('../lib/util');

program
  .arguments('<openApiSpec>')
  .description('Return the group associated with each package')
  .action(main);

function main(openApiSpecFile) {
  const seen = {};
  const data = loadApiSpec(openApiSpecFile);
  for(const packageName of Object.keys(data['definitions']).sort((a, b) => a.localeCompare(b))) {
    const packagePrefix = packageName.replace(/\.v.+$/, '');
    const { group } = guessGroupVersionKind(packageName);

    if(!group) {
      continue;
    }

    if(!seen[packagePrefix]) {
      seen[packagePrefix] = true;
      console.log(`${packagePrefix}: ${group}`);
    }
  }
}

program.parse(process.argv);
