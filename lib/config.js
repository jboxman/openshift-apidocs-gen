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
      const { group, version, kind } = resource;
      const definition = config.definitions.getByVersionKind({ group, version, kind });
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
    //resource.definition = definition.key();
    resource.definition = definition;
  }
  else {
    console.error(`No known definition for '${resource.kind} [${resource.group}/${resource.version}]'`);
    //process.exit(1);
  }
}

// TODO - refactor
function createDefinitions(config = {}) {

  for(const [ ref, definition ] of Object.entries(openApiSpec.definitions)) {
    let group;
    let version;
    let kind;
    let gvk;
    let flatSpec;
    let wantPaths;

    // There is always an exception, somewhere in life.
    // - Group for '': core
    // - Group for com.github.openshift.api.template.v1.Template: template.openshift.io

    if(gvk = definition[typeKey]) {
      ({ group, version, kind } = gvk[0]);
      if(!group && gvk.length == 1) {
        // io.k8s.api.core.v1.Pod, ect.
        group = 'core';
      }
      else {
        // com.github.openshift.api.template.v1.*
        group = gvk.find(v => v.group != '').group;
        if(kind == 'ProcessedTemplate')
          kind = 'Template';
      }

      flatSpec = flattenSpec({ data: definition, definitions: openApiSpec.definitions, resolve: group });
      wantPaths = Object.entries(flatSpec).reduce((accum, entry) => {
        if(['object', 'array'].includes(entry[1].type))
          accum.push(entry[0]);
        return accum;
      }, []);

    }
    // Related API objects
    else {
      ({ group, version, kind } = util.guessGroupVersionKind(ref));

      if(group == '') {
        // TODO - raise exception?
        console.log(`Could not resolve: ${ref}`);
        continue;
      }

      flatSpec = flattenSpec({ data: definition, definitions: openApiSpec.definitions, resolve: false });
      //wantPaths = ['.'];
      wantPaths = Object.entries(flatSpec).reduce((accum, entry) => {
        if(['object', 'array'].includes(entry[1].type))
          accum.push(entry[0]);
        return accum;
      }, []);
    }

    const relatedDefinitions = Object.entries(flatSpec).reduce((accum, entry) => {
      if(entry[1].hasOwnProperty('gvk')) {
        const { gvk } = entry[1];
        if(!accum.find(v => (v.group == gvk.group && v.version == gvk.version && v.kind == gvk.kind)))
          accum.push(gvk);
      }
      return accum;
    }, []);

    //console.log(`${kind}: ${JSON.stringify(relatedDefinitions, null, 2)}`);

    const propertiesByPath = wantPaths.reduce((accum, path) => {
      return {
        ...accum,
        [path]: getPropertiesByPath({ properties: flatSpec, otherPaths: wantPaths, reqPath: path })
      };
    }, {});

    // TODO - clean up assignments
    const item = {
      schema: definition,
      group,
      version,
      kind,
      specId: ref,
      flatSpec,
      propertiesByPath,
      relatedDefinitions
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
    //if(! operation.op.parameters) {
    //  console.log(`${operation.key()}:NO parameters`);
    //}

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
        //if(definition) {
        //  definition.foundInField = true;
        //  console.log(`Found definition: ${definition.key()}`);
        //}
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
