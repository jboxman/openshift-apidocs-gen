const fs = require('fs');
const yaml = require('js-yaml');

const loadApiSpec = require('../openapi');
const { createDefinitions } = require('../config');
const createDefinitionCollection = require('../models/definitions');
const { readStream, getOffsets } = require('../util');

const resources = [];
const yamlObj = [];
const groupIdx = 2;
const kindIdx = 4;

async function action(oapiSpecFile, cmd) {
  const { apis: apiResources, map: resourceFile } = cmd;
  let currentResources;

  if(!fs.existsSync(resourceFile))
    process.exit(1);

  try {
    currentResources = yaml.safeLoad(fs.readFileSync(resourceFile));
  }
  catch(e) {}

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

    let group = row.substring(columnOffsets[groupIdx].start, columnOffsets[groupIdx].stop).replace(/\s/g, '');
    let kind = row.substring(columnOffsets[kindIdx].start, row.length).replace(/\s/g, '');
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

    resources.push({ kind, group, version });
  }

  const allResources = currentResources.reduce((accum, item) => {
    accum.push(...item.resources);
    return accum;
  }, []);

  const found = [];
  const dropped = [];
  const versionDelta = [];

  for(const { kind, group, version } of allResources) {
    const match = resources.find(v => v.group == group && v.kind == kind);
    if(match) {
      if(match.version != version) {
        versionDelta.push({ kind, group, oldVersion: version, newVersion: match.version });
      }
      else {
        found.push({ kind, group, version });
      }
    }
    else {
      dropped.push({ kind, group, version });
    }
  }

  const added = [];
  for(const v of resources) {
    if(found.find(m => m.group == v.group && m.kind == v.kind && m.version == v.version))
      continue;

    if(versionDelta.find(m => m.group == v.group && m.kind == v.kind))
      continue;

    // No new 'extensions' will ever be added to k8s
    if(v.group == 'extensions')
      continue;

      added.push(v);
  }

  if(versionDelta.length > 0) {
    console.log('\nAPI version changes\n');
    versionDelta.forEach(({ kind, group, oldVersion, newVersion }) => {
      console.log(`- ${kind} [${group}]: ${oldVersion} => ${newVersion}`);
    });
  }

  if(added.length > 0) {
    console.log('\nAPIs added\n');
    added.forEach(({ kind, group, version }) => {
      console.log(`- ${kind} [${group}/${version}]`);
    });
  }

  if(dropped.length > 0) {
    console.log('\nAPIs dropped\n');
    dropped.forEach(({ kind, group, version }) => {
      console.log(`- ${kind} [${group}/${version}]`);
    });
  }
}

module.exports = action;
