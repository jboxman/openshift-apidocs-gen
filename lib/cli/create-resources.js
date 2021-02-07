const fs = require('fs');
const yaml = require('js-yaml');

const { readStream, getOffsets } = require('../util');

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

const groups = {};
const yamlObj = [];
async function action(apiResources) {
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

    if(!groups[group])
      groups[group] = [];

    // Already sorted in `oc api-resources` output
    groups[group].push({ kind, group, version, plural, namespaced });
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

module.exports = action;
