#!/usr/bin/env node

const loadConfig = require('../lib/config');

// The OpenShift console outputs a list of {Group,Kind}

// Read GK from STDIN, then lookup if possible all
// available versions. With sorting, the latest
// version is probably what is offered in OCP-latest.

if(! process.argv[2])
  process.exit(1);

// This bootstraps the entire configuration, including operations and fields
const { definitions } = loadConfig({ specFile: process.argv[2] });
let rows;

// NAME,SHORTNAMES,APIGROUP,NAMESPACED,KIND
// localsubjectaccessreviews,,authorization.k8s.io,TRUE,LocalSubjectAccessReview

async function main() {
  rows = await readStream(process.stdin);

  if(! rows)
    process.exit(1);

  for(const row of rows) {
    if(row == rows[0])
      continue;

    let [ , , group, , kind] = row.trim().split(/\t/);

    if(!group)
      group = 'core';

    // These aren't fully qualified internally.
    if(/k8s\.io/.test(group))
      group = group.split(/\./)[0];

    const defs = definitions.getByGroupKind({ group, kind });

    // Not currently sorted; it's accidentally correct version order.
    if(defs.length > 0) {
      console.log(`- name: ${kind}\n  version: ${defs[0].version}\n  group: ${group}`);
    }
    else {
      console.log(`Invalid group (${kind}): ${group}`);
    }
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
