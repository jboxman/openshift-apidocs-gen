const fs = require('fs');

const { loadYamlConfig } = require('../util');
const { readStream, getOffsets } = require('../util');

const resources = [];
const groupIdx = 2;
const kindIdx = 4;

async function action(cmd) {
  const { apis: apiResources, config: configFile } = cmd;
  const currentResources = [];

  if(!fs.existsSync(configFile))
    process.exit(1);

  const configFileData = loadYamlConfig(configFile);
  if(configFileData.hasOwnProperty('version')) {
    currentResources.push(...configFileData.apiMap);
  }
  else {
    currentResources.push(...configFileData);
  }

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

    const groupVersion = /(?<group>.+)\/(?<version>.+)/.exec(group);
    if(groupVersion) {
      ({ group, version } = groupVersion.groups);
    }
    else {
      version = group;
      // The core group presents as an empty field
      // https://kubernetes.io/docs/reference/using-api/api-overview/#api-groups
      group = 'core';
    }

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
