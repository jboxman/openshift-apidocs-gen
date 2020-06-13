#!/usr/bin/env node

const loadConfig = require('../lib/config');

// The OpenShift console outputs a list of {Group,Kind}

// Read GK from STDIN, then lookup if possible all
// available versions. With sorting, the latest
// version is probably what is offered in OCP-latest.

// $ oc api-resources | hack/get-versions-from-gk.js ...

if(! process.argv[2])
  process.exit(1);

const groups = {};

// TODO - load definitions only
// This bootstraps the entire configuration, including operations and fields
const { definitions } = loadConfig({ specFile: process.argv[2] });

async function main() {
  let rows = await readStream(process.stdin);
  let columnOffsets;

  if(! rows)
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

    // The core group presents as an empty field
    // https://kubernetes.io/docs/reference/using-api/api-overview/#api-groups
    if(!group)
      group = 'core';

    const defs = definitions.getByGroupKind({ group, kind });

    // Not currently sorted; it's accidentally correct version order.
    //console.log(defs);
    if(defs.length > 0) {
      if(!groups[group])
        groups[group] = [];

      groups[group].push({ group, version: defs[0].version, kind });
      //console.log(`- name: ${kind}\n  version: ${defs[0].version}\n  group: ${group}`);
    }
    else {
      console.error(`Could not find ${kind}/${group}`);
    }
  }

  // Group by resource group
  // This is suitable for ./cli.js --resources <resource>
  for(const grouping in groups) {
    console.log(`- name: ${grouping}\n  resources:`);
    for(const resource of groups[grouping]) {
      console.log(`  - kind: ${resource.kind}\n    group: ${resource.group}\n    version: ${resource.version}`);
    }
  }

  /*
  Name: OpenShift REST APIs
  Dir: rest_api
  Topics:
  - Name: API endpoints
    File: index
  */
  // This is suitable for ascii_binder _topic_map.yaml

  for(const grouping in groups) {
    console.log(`- Name: ${grouping}`);
    console.log(`  File: ${grouping.replace(/\./g, '-')}`);
  }
}

main();

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
