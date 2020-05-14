const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const util = require('./util');
const loadApiSpec = require('./openapi');

const { createResourceCategory } = require('./models/resources');
const createDefinitionCollection = require('./models/definitions');
const { createOperationCollection, createOperationCategory } = require('./models/operations');
const createOperation = require('./models/operation');
const createHttpResponse = require('./models/http-response');

const { typeKey } = require('./constants');

const {
  flattenSpec,
  getPropertiesByPath
} = require('./properties');

const ROOT = path.join(__dirname, '..');

const openApiSpec = {};

function loadConfig({ specFile, resourceFile = 'resources.yaml' } = {}) {
  if(! Object.keys(openApiSpec).length)
    Object.assign(openApiSpec, loadApiSpec(specFile));

  const operationsConfigFile = fs.readFileSync(path.join(__dirname, '../config/operations.yaml'));
  const operation_categories = yaml.safeLoad(operationsConfigFile);

  const resourcesConfigFile = loadYamlConfig(resourceFile);
  const resource_categories= resourcesConfigFile;

  const config = {
    operationCategories: [ ...initializeOperationCategories(operation_categories) ],
    resourceCategories: [ ...initializeResources(resource_categories) ],
    groupMap: {},
    definitions: createDefinitionCollection(),
    operations: createOperationCollection()
  };

  createDefinitions(config);
  
  visitResources(config, resourceVisitor);

  initializeOperations(config);

  return {
    ...config
  }
}

function initializeResources(resourceConfig) {
  const resourcesByCategory = [];

  for(const category of resourceConfig) {
    const resourceCategory = createResourceCategory({
      name: category.name,
      resources: category.resources
    });
    resourcesByCategory.push(resourceCategory);
  }

  return resourcesByCategory;
}

function initializeOperationCategories(categoryConfig) {
  const operationsByCategory = [];

  for(const category of categoryConfig) {
    const operationCategory = createOperationCategory({
      name: category.name,
      isDefault: category.default,
      operationTypes: category.operation_types
    });
    operationsByCategory.push(operationCategory);
  }

  return operationsByCategory;
}

function visitResources(config = {}, visitor = function(){}) {
  for(const category of config.resourceCategories) {
    for(const resource of category.resources) {
      const { group, version, name } = resource;
      const definition = config.definitions.getByVersionKind({ group, version, kind: name });
      visitor({
        resource,
        definition
      });
    }
  }
}

function resourceVisitor({ resource, definition }) {
  if(definition) {
    // TODO - handle in resource instead
    resource.definition = definition.key();
    resource.flatSpec = flattenSpec({ data: definition.getSchema(), definitions: openApiSpec.definitions });
    resource.description = resource.flatSpec['.'].description;
    resource.type = resource.flatSpec['.'].type;
  }
  else {
    console.error(`No known definition for '${resource.group}.${resource.version}.${resource.name}'`);
    //process.exit(1);
  }
}

// open_api.go
function createDefinitions(config = {}) {
  const groupMap = buildGroupMap();

  for(const name in openApiSpec.definitions) {
    const def = openApiSpec.definitions[name];
    let fullGroupName;

    // Note: This doesn't exist anywhere in the k8s OpenAPI spec file
    // Always ""
    //const resource = typeof def[resourceNameKey] !== 'undefined' ? def[resourceNameKey] : "";

    // Note: This doesn't exist anywhere in the k8s OpenAPI spec file
    //  'io.k8s.kubernetes.pkg.api.*'
    //  'io.k8s.kubernetes.pkg.apis.*'
    //if(def.description.includes('Deprecated. Please use')) {
    //  continue;
    //}

    // Note: This doesn't exist anywhere in the k8s OpenAPI spec file
    //if(name.includes('JSONSchemaPropsOrStringArray')) {
    //  continue;
    //}

    const { group, version, kind } = util.guessGroupVersionKind(name);
    //console.log(name);
    //console.log(`${group} ${version} ${kind}`);

    // TODO - template.v1.Template must have pkg.runtime
    // This skips pkg.runtime and pkg.util
    if(group == '' || typeof group == 'undefined') {
      // TODO - raise exception?
      console.log(`Could not resolve: ${name}`);
      continue;
    }

    fullGroupName = typeof groupMap[group] == 'undefined' ? group : groupMap[group];

    // TODO - clean up assignments
    const item = {
      schema: def,
      name: kind,
      group,
      fullGroupName,
      version,
      kind,
      specId: name
    };

    config.definitions.add(item).initialize();
  }

  config.definitions.initialize();
}

// Initialize all Operations in the config
function initializeOperations(config = {}) {
  //const operations = [];

  visitOperations(openApiSpec, function(operation) {

    // "operationId": "getCodeVersion" lacks `typeKey`
    if(! operation.operationSpec[typeKey])
      return;

    // TODO - this is "" for Core, like ConfigMap; Does this matter?
    const gvkGroup = operation.operationSpec[typeKey]['group'];
    const gvkGroupFirst = util.titleize(gvkGroup.split('.')[0]);
    const groupId = gvkGroup.split('.').map(util.titleize).join('');

    // Build group lookup dict to aid in mapping operationId to definitions using GVK
    // (definition) #/definitions/com.github.openshift.api.network.v1.ClusterNetwork
    // (operationId) readNetworkOpenshiftIoV1ClusterNetwork

    /*
     "x-kubernetes-group-version-kind": {
      "group": "network.openshift.io",
      "kind": "ClusterNetwork",
      "version": "v1"
     }
    */

    // io.k8s.api.core
    if(gvkGroup == "") {
      config.groupMap['core'] = 'Core';
    }
    // A noop mapping for K8sIo
    else if(/k8s\.io/.test(gvkGroup)) {
      config.groupMap[gvkGroup] = gvkGroupFirst;
    }
    else {
      config.groupMap[gvkGroup] = groupId;
    }


    // A noop mapping for K8sIo
    /*
    if(/k8s\.io/.test(gvkGroup)) {
      config.groupMap[gvkGroupFirst] = gvkGroupFirst;
    }
    else {
      config.groupMap[gvkGroupFirst] = groupId;
    }
    */

    config.operations.add(operation);
  });

  //console.log(JSON.stringify(config.groupMap, null, 2));

  mapOperationsToDefinitions(config);

  // Sanity check in generators/api/config.go
  /*
  visitOperations(openApiSpec, function(operation) {
    const op = config.operations.getByKey(operation.key());
    if(!op) {
      console.log(`Missing: ${operation.key()}`);
    }
    else {
      console.log(`Processed: ${op.key()}`);
    }
  });
  */

  initializeOperationParameters(config);
}

// open_api.go
function buildGroupMap() {
  const groupMap = {};

  Object.assign(groupMap, {
    apiregistration: "apiregistration.k8s.io",
    apiextensions: "apiextensions.k8s.io",
    certificates: "certificates.k8s.io",
    meta: 'meta',
    core: 'core',
    extensions: 'extensions'
  });

  for(const name in openApiSpec.definitions) {
    const def = openApiSpec.definitions[name];

    const {group} = util.guessGroupVersionKind(name);

    if(groupMap[group])
      continue;

    // special groups where group name from extension is empty!
    if(['meta', 'core'].includes(group))
      continue;

    // full group not exposed as x-kubernetes- openapi extensions
    // from kube-aggregator project or apiextensions-apiserver project
    if(['apiregistration', 'apiextensions'].includes(group))
      continue;

    if(def[typeKey]) {
      let fullGroup;
      let gvkList = def[typeKey];
      // TODO - raise exception if none found?
      fullGroup = (gvkList.find(item => item.group) || {})['group'];

      if(fullGroup) {
        groupMap[group] = fullGroup;
      }
    }
  }

  return groupMap;
}

function mapOperationsToDefinitions(config = {}) {
  visitResources(config, function({ resource, definition }) {
    // TODO - Should never be false, but is with missing definitions
    if(! definition)
      return;

    const def = definition;
    const key = definition.key();

  //for(const [key, def] of Object.entries(config.definitions.all())) {
    if(def._attributes().isInlined) {
      console.log(`Skipping inlined def: [${key}]`);
      return false;
    }

    // Write Operations -> Create
    // ect.
    //const definitionOperations = [];
    for(const opCat of config.operationCategories) {
      //let operation;

      var operationsForCategory = createOperationCategory({
        name: opCat.name
      });

      for(const opCatType of opCat.operationTypes) {

        //console.log(`${opCat.name} ${opCatType.name}`);
        const matchOperationId = getOperationId({
          match: opCatType.match,
          group: def.operationGroupName,
          groupMap: config.groupMap,
          version: def.version,
          kind: def.kind
        });

        //console.log(matchOperationId);

        const findOperationConfig = {
          operations: config.operations.all(),
          match: matchOperationId,
          opCatType,
          opCat,
          definition: def
        };

        // TODO - refactor setOperation()
        const namespacedOperation = setOperation({
          ...findOperationConfig,
          isNamespaced: true
        });

        const unnamespacedOperation = setOperation({
          ...findOperationConfig,
          isNamespaced: false
        });

        // Create category only if it will be populated
        if(namespacedOperation || unnamespacedOperation) {
          if(namespacedOperation)
            operationsForCategory.operations.push(namespacedOperation);
          if(unnamespacedOperation)
            operationsForCategory.operations.push(unnamespacedOperation);
        }
      }

      if(operationsForCategory.operations.length > 0)
        def.appendToOperationCategories(operationsForCategory);
        //definitionOperations.push(operationsForCategory);

      //if(operationsForCategory.name)
      // happens after each category set lookup
      /*
      if(opCat.operations.length > 0) {
        def.appendToOperationCategories({
          operationType: opCatType,
          operations: [ ...opCat.operations ]
        });
      }
      */
    }
  });
}

function getOperationId({ match, group, groupMap, version, kind } = {}) {
  const g = groupMap[group];

  // TODO - group may be wrong for NetworkingV1, exclude K8sIo portion
  if(g) {
    group = g;
  }

  match = match.replace('${group}', group);
  match = match.replace('${version}', util.titleize(version));
  match = match.replace('${resource}', kind);

  return match;
}

function setOperation({ operations, match, isNamespaced, opCatType, opCat, definition } = {}) {
  const namespaced = isNamespaced ? 'Namespaced' : '';
  const key = match.replace('(Namespaced)?', namespaced);

  // TODO - this is failing because of inline definitions not getting skipped
  if(o = operations[key]) {
    if(o.definition) {
      console.log(`Found multiple matching definitions [${definition.key()}, ${o.definition.key()}] for operation key: ${key}`);
      //throw new Error(`Operation (${key}) cannot have more than one definition.`);
    }

    o.operationType = opCatType;
    o.definition = definition;

    //console.log(`Adding ${key}`);
    //opCat.operations.push(o);

    // just set definition here instead
    definition.appendToOperations(o);
    return o;
  }

  return null;
}

function visitOperations(spec = {}, visitor = function(){}) {
  // Must handle both /api and /apis
  // /api includes verbs and parameters in the same dict
  // /apis includes parameters as a key in each verb dict instead

  for(const [path, verbs] of Object.entries(spec.paths)) {
    for(const [verb, op] of Object.entries(getOperationVerbs(verbs))) {
      if(! isBlacklistedOperation(op)) {
        visitor(createOperation({
          id: op['operationId'],
          op,
          path,
          httpMethod: verb,
          item: verbs
        }));
      }
    }
  }
}

function getOperationVerbs(verbs = {}) {
  const httpVerbs = ['get', 'post', 'put', 'delete', 'patch', 'head'];
  // Include only httpVerbs in the returned object
  return Object.entries(verbs).reduce((accum, [key, val]) => {
      if(httpVerbs.includes(key)) {
        accum[key] = val;
      }
    return accum;
  }, {})
}

function isBlacklistedOperation(operation = {}) {
  const blacklisted = ['APIGroup', 'APIResources', 'APIVersions'];
  return blacklisted.some(item => operation['operationId'].includes(item));
}

function initializeOperationParameters(config = {}) {
  const defs = config.definitions;
  const operations = config.operations.all();

  for(const operation of Object.values(operations)) {

    // URL path parameters
    if(operation.item.parameters) {
      for(const parameter of operation.item.parameters) {
        const where = parameter['in'];
        switch(where) {
          case 'path':
            operation.addHttpPathParam(defs.parameterToField(parameter));
            break;
          case 'query':
            operation.addHttpQueryParam(defs.parameterToField(parameter));
            break;
          case 'body':
            operation.addHttpBodyParam(defs.parameterToField(parameter));
            break;
        }
      }
    }

    // HTTP method parameters
    if(operation.op.parameters) {
      for(const parameter of operation.op.parameters) {
        const where = parameter['in'];
        switch(where) {
          case 'path':
            operation.addHttpPathParam(defs.parameterToField(parameter));
            break;
          case 'query':
            operation.addHttpQueryParam(defs.parameterToField(parameter));
            break;
          case 'body':
            operation.addHttpBodyParam(defs.parameterToField(parameter));
            break;
        }
      }
    }

    // TODO - this implementation raises exception when this happens
    if(! operation.op.parameters) {
      console.log(`${operation.key()}:NO parameters`);
    }

    // TODO - get HTTP responses
    for(const [code, response] of Object.entries(operation.op.responses)) {
      let httpResponse;
      let definition;

      // generators/api/config.go - skips 4xx codes
      if(!response.schema) {
        continue;
      }

      if(util.isComplex(response.schema)) {
        definition = defs.getForSchema(response.schema);
        // TODO - why would this ever be null?
        if(definition) {
          definition.foundInField = true;
          console.log(`Found definition: ${definition.key()}`);
        }
      }

      httpResponse = createHttpResponse({
        code,
        description: response.description,
        type: util.getTypeName(response.schema),
        definition
      });

      operation.addHttpResponse(httpResponse);
    }
  }
}

// TODO - add robustness
function loadYamlConfig(file = '') {
  if(! fs.existsSync(file)) {
    file = path.join(ROOT, 'config', file);
    if(! fs.existsSync(file)) {
      console.error(`Cannot open configuration file: ${file}`);
      process.exit(1);
    }
  }

  return yaml.safeLoad(fs.readFileSync(file));
}

loadConfig.visitResources = visitResources;
loadConfig.getOperationVerbs = getOperationVerbs;
loadConfig.isBlacklistedOperation = isBlacklistedOperation;
loadConfig.getOperationId = getOperationId;

module.exports = loadConfig;
