#!/usr/bin/env node

const program = require('commander');

const fs = require('fs');
const yaml = require('js-yaml');

const loadApiSpec = require('../lib/openapi');
const { createDefinitions } = require('../lib/config');
const createDefinitionCollection = require('../lib/models/definitions');

// The OpenShift console outputs a list of {Group,Kind}

// Read GK from STDIN, then lookup if possible all
// available versions. With sorting, the latest
// version is probably what is offered in OCP-latest.

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

// https://humanwhocodes.com/snippets/2019/05/nodejs-read-stream-promise/
function readStream(stream, encoding = "utf8") {

  stream.setEncoding(encoding);

  return new Promise((resolve, reject) => {
    let data = "";

    stream.on("data", chunk => data += chunk);
    stream.on("end", () => resolve(data.split(/\n/)));
    stream.on("error", error => reject(error));
  });
}

function getOffsets(row) {
  const columns = {};
  let begin = false;
  let columnIdx = 0;

  for(let i = 0; i < row.length; i++) {

    if(begin && (i == (row.length - 1) || !/[A-Z]/.test(row[i]))) {

      if(i == (row.length - 1) || /[A-Z]/.test(row[i+1])) {
        begin = false;

        columns[columnIdx] = {
          ...columns[columnIdx],
          stop: i
        };

        columnIdx++;
      }

      continue;
    }

    if(!begin && /[A-Z]/.test(row[i])) {
      columns[columnIdx] = {
        ...columns[columnIdx],
        start: i
      };

      begin = true;
    }
  }

  return columns;
}
