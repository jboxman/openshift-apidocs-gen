#!/usr/bin/env node
const program = require('commander');

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const loadApiSpec = require('../lib/openapi');

const { createDefinitions } = require('../lib/config');
const createDefinitionCollection = require('../lib/models/definitions');
const { readStream, getOffsets, buildApiPath } = require('../lib/util');

program
  .arguments('<api_resources> <openapi_file>')
  .description('')
  .action(main);

const allResources = [];

// TODO - refactor duplicate code
async function main(apiResources, oapiSpecFile) {
  const openApiSpec = {};
  if(! Object.keys(openApiSpec).length)
    Object.assign(openApiSpec, loadApiSpec(oapiSpecFile));

  const definitions = createDefinitionCollection();
  createDefinitions({ collection: definitions, spec: openApiSpec['definitions'] });
  definitions.initialize();

  let rows = await readStream(fs.createReadStream(apiResources, { encoding: 'utf8' }));
  let columnOffsets;

  if(!rows)
    process.exit(1);

  for(const row of rows) {
    if(row == rows[0]) {
      columnOffsets = getOffsets(row);
      continue;
    }
    if(row.length <= 1)
      continue;

    let plural = row.substring(columnOffsets[0].start, columnOffsets[0].stop).replace(/\s/g, '');
    let group = row.substring(columnOffsets[2].start, columnOffsets[2].stop).replace(/\s/g, '');
    let namespaced = row.substring(columnOffsets[3].start, columnOffsets[3].stop).replace(/\s/g, '') == 'true' ?
      true : false;
    let kind = row.substring(columnOffsets[4].start).replace(/\s/g, '');
    let version;

    // The core group presents as an empty field
    // https://kubernetes.io/docs/reference/using-api/api-overview/#api-groups
    if(!group) {
      group = 'core';
    }

    const results = definitions.getByGroupKind({ group, kind });
    if(results.length <= 0) {
      console.warn(`Missing definition for ${kind} [${group}] in OpenAPI spec.`);
      continue;
    }

    for(const { version } of definitions.getByGroupKind({ group, kind })) {
      allResources.push({ kind, group, version, plural, namespaced });
    }
  }

  const found = [];
  for(const { kind, group, version, plural, namespaced } of allResources) {
    let matches;

    matches = Object.entries(openApiSpec['paths']).filter(([ path, opts ]) => {
      return buildApiPath({ plural, group, version }, namespaced).includes(path);
    });

    for(const [ path, opts ] of matches) {
      found.push(path);

      for(const [ verb, params ] of Object.entries(opts)) {
        if(verb == 'parameters')
          continue;

        let obj;

        obj = { 
          path,
          verb,
          kind,
          group,
          version,
          action: params['x-kubernetes-action'],
          params: { ...params },
          pathParms: { ...opts.parameters }
        }

        //if(/\/(status|scale|proxy|finalize|attach|binding|eviction|exec|log|portforward|token|finalize)$/.test(obj.path))
        //  console.log(obj.path);
      }
    }

  }

  const notFound = Object.keys(openApiSpec['paths']).filter(path => {
    return !found.includes(path) && !/\/$/.test(path);
  });
  console.log(JSON.stringify(notFound, null, 2));

}

program.parseAsync(process.argv);
