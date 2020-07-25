#!/usr/bin/env node

// This script generates YAML output suitable for an initial resources file.
// Because all resources are grouped by API group, this is only a starting
// point. Resources must be further organized by hand. For example:

/*
- name: whereabouts.cni.cncf.io
  resources:
  - kind: IPPool
    group: whereabouts.cni.cncf.io
    version: v1alpha1
*/

const program = require('commander');

const fs = require('fs');
const yaml = require('js-yaml');

const loadApiSpec = require('../lib/openapi');
const { createDefinitions } = require('../lib/config');
const createDefinitionCollection = require('../lib/models/definitions');
const { readStream, getOffsets } = require('../lib/util');

const desc = `Output YAML to stdout suitable for an initial resources.yaml file.

<api_resources> - Specify a file with the output from \`oc api-resources\`
<openapi_file> - Specify an OpenShift OpenAPI spec JSON file`

program
  .arguments('<api_resources> <openapi_file>')
  .description(desc)
  .action(main);

const groups = {};
const yamlObj = [];
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

    let group = row.substring(columnOffsets[2].start, columnOffsets[2].stop).replace(/\s/g, '');
    let kind = row.substring(columnOffsets[4].start, row.length).replace(/\s/g, '');
    let version;

    // The core group presents as an empty field
    // https://kubernetes.io/docs/reference/using-api/api-overview/#api-groups
    if(!group) {
      group = 'core';
    }

    // TODO - correct by accident; sorted by version in the spec file
    const results = definitions.getByGroupKind({ group, kind });
    if(results.length <= 0) {
      console.warn(`Missing definition for ${kind} [${group}] in OpenAPI spec.`);
      continue;
    }
    ({ version } = definitions.getByGroupKind({ group, kind })[0])

    if(!groups[group])
      groups[group] = [];

    // Already sorted in `oc api-resources` output
    groups[group].push({ kind, group, version });
  }

  Object.entries(groups).reduce((accum, entry) => {
    accum.push({
      name: entry[0],
      resources: entry[1]
    });
    return accum;
  }, yamlObj);

  console.log(yaml.safeDump(yamlObj, { noArrayIndent: true }));
}

program.parseAsync(process.argv);
