#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const util = require('../lib/util');
const loadApiSpec = require('../lib/openapi');
const { typeKey } = require('../lib/constants');
const {
  visitResources,
  getOperationVerbs,
  isBlacklistedOperation,
  getOperationId
} = require('../lib/config');

const spec = loadApiSpec(process.argv[2]);

// Ensure that every resource matches at least one operation.

const resourcesConfigFile = fs.readFileSync(path.join(__dirname, '../config/resources.yaml'));
const operationsConfigFile = fs.readFileSync(path.join(__dirname, '../config/operations.yaml'));
const resourceCategories = yaml.safeLoad(resourcesConfigFile);
const operationCategories = yaml.safeLoad(operationsConfigFile);

const allOperationTypes = operationCategories.reduce(function(allOpTypes, opCat) {
  return allOpTypes.concat(opCat.operation_types.reduce((accum, opType) => {
    return accum.concat(opType);
  }, []));
}, []);

const config = {
  resourceCategories,
  definitions: {
    getByVersionKind: function({ group, version, kind }) {
      return kinds.find(definition => {
        return definition.group == group && definition.version == version && definition.kind == kind
      })
    }
  }
}

const kinds = [];
for(const key in spec['definitions']) {
  const { group, version, kind } = util.guessGroupVersionKind(key);
  // io.k8s.apimachinery.pkg.* are internal k8s definitions
  if(group) {
    kinds.push({
      group,
      version,
      kind,
      operations: [],
      key() {
        return `${this.group}.${this.version}.${this.kind}`;
      },
      get operationGroupName() {
        // Special case in k8s
        if(this.group.toLowerCase() == 'rbac') {
          return 'RbacAuthorization';
        }
        // Must return bare word for core k8s APIs
        if(/io\.k8s\.api\.core/.test(this.group)) {
          return 'Core';
        }
        // Some k8s APIs
        else if(/io\.k8s\.api/) {
          return util.titleize(this.group.split('.')[0]);
        }

        return this.group;
      }
    });
  }
}

const definitions = [];
visitResources(config, function({ resource, definition }) {
  if(!definition) {
    console.error(`The definition for ${resource.group}.${resource.version}.${resource.name} is missing!`);
    // TODO - configurable
    //process.exit(1);
    return;
  }
  definitions.push(definition);
});

const groupMap = {};
const operationIds = {};
for(const [path, verbs] of Object.entries(spec['paths'])) {
  for(const [key, obj] of Object.entries(getOperationVerbs(verbs))) {

    if(! isBlacklistedOperation(obj)) {

      if(! obj[typeKey])
        continue;

      const gvkGroup = obj[typeKey]['group'];
      const gvkGroupFirst = util.titleize(gvkGroup.split('.')[0]);
      const groupId = gvkGroup.split('.').map(util.titleize).join('');

      // io.k8s.api.core
      if(gvkGroup == "") {
        groupMap['core'] = 'Core';
      }
      // A noop mapping for K8sIo
      else if(/k8s\.io/.test(gvkGroup)) {
        groupMap[gvkGroup] = gvkGroupFirst;
      }
      else {
        groupMap[gvkGroup] = groupId;
      }

      if(obj.operationId) {
        operationIds[obj.operationId] = false;
      }
    }

  }
}

for(const definition of definitions) {
  for(const opType of allOperationTypes) {
    const constructedId = getOperationId({
      match: opType.match,
      groupMap,
      group: definition.operationGroupName,
      version: definition.version,
      kind: definition.kind
    });

    const [ unnamespaced, namespaced ] = ['', 'Namespaced'].map(v => constructedId.replace('(Namespaced)?', v));

    const didMatch = Object.keys(operationIds).some(v => (v == unnamespaced || v == namespaced));
    if(didMatch)
      definition.operations.push(opType.name);
  }
}

definitions
  .filter(definition => definition['operations'].length <= 0)
  .forEach(definition => {
    console.log(`[${definition.key()}] Failed to associate with any API endpoints!`);
});
definitions
  .filter(definition => definition.operations.length > 0)
  .forEach(definition => {
    definition.operations.forEach(opType => console.log(`[${definition.key()}] (${opType})`));
});
