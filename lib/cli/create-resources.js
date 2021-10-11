const yaml = require('js-yaml');

//const createConfig = require('../config');
const { loadApiSpec, parseApiSpec } = require('../openapi');
const { sortGroupKindByVersion } = require('../util');

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

async function action(oapiSpecFile) {
  const groups = {};
  const yamlObj = [];  

  const { definitions } = parseApiSpec({ spec: loadApiSpec(oapiSpecFile) });
  for(const [ , definition ] of definitions) {
    if(!definition.isResource) continue;

    const { kind, group, version } = definition;
    const entry = !group ? { kind, version } : { kind, group, version };

    if(!groups[group]) groups[group] = [];

    groups[group] = [
      ...groups[group].filter(v => v.kind != kind),
      ...[[entry].concat(...groups[group].filter(v => v.kind == kind)).sort(sortGroupKindByVersion)[0]]
    ];
  }

  Object.entries(groups).reduce((accum, entry) => {
    accum.push({
      name: entry[0] || 'core',
      resources: entry[1]
    });
    return accum;
  }, yamlObj);

  console.log(yaml.safeDump(yamlObj, { noArrayIndent: true }));
}

module.exports = action;
