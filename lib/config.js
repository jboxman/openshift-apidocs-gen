const fs = require('fs');
const yaml = require('js-yaml');

const util = require('./util');
const loadApiSpec = require('./openapi');

const { createResourceCategory } = require('./models/resources');
const createDefinitionCollection = require('./models/definitions');
const createDefinition = require('./models/definition');
const createOperation = require('./models/operation');

const openApiSpec = {};

function loadConfig(options = {}) {
  const resource_categories = [];
  const { oapiSpecFile, configFile, configOverride } = options;
  const configFileData = util.loadYamlConfig(configFile);
 
  if(! Object.keys(openApiSpec).length)
    Object.assign(openApiSpec, loadApiSpec(oapiSpecFile));

  // Provide global defaults and ignore unknown keys
  const fromFile = ({
    version = '',
    outputDir = 'build',
    apisToHide = [],
    apiSupportLevels = [],
    packageMap = {},
    apiMap = [],
    ...rest
  } = {}) => ({version, outputDir, apisToHide, apiSupportLevels,  packageMap, apiMap});

  if(configFileData.hasOwnProperty('version')) {
    resource_categories.push(...configFileData.apiMap);
  }
  else {
    resource_categories.push(...configFileData);
  }

  const config = {
    resourceCategories: [ ...initializeResources(resource_categories) ],
    definitions: createDefinitionCollection(),
    refs: {},
    seenDefs: []
  };

  Object.assign(config, fromFile(configFileData), configOverride);

  createDefinitions(config, { collection: config.definitions, spec: openApiSpec['definitions'] });
  
  visitResources(config);

  config.definitions.initialize({ definitions: openApiSpec.definitions, packageMap: config.packageMap });

  // TODO - Refactor
  for(const [ key, definition ] of Object.entries(config.definitions.all())) {
    if(!definition.isResource) {
      const { kind, group, version } = definition;
      config.refs[util.createKey({ group, version, kind })] = util.createRef({ resource: 'objects', kind, group, version });
    }
  }

  return {
    ...config
  }
}

function initializeResources(resourceConfig) {
  const resourcesByCategory = [];

  for(const category of resourceConfig) {
    const { name, resources } = category;

    // TODO - validate YAML after loading
    if(!name || !resources)
      continue;

    const resourceCategory = createResourceCategory({
      name,
      resources
    });
    resourcesByCategory.push(resourceCategory);
  }

  return resourcesByCategory;
}

function visitResources(config = {}) {
  for(const category of config.resourceCategories) {
    for(const resource of category.resources) {
      const { group, version, kind, plural, namespaced } = resource;
      const definition = config.definitions.getByVersionKind({ group, version, kind });

      const endpoints = {};
      const operations = [];

      if(!definition) {
        console.error(`No known definition for '${resource.kind} [${resource.group}/${resource.version}]'`);
        continue;
      }

      let matches = Object.entries(openApiSpec['paths']).filter(([ path, opts ]) => {
        return util.buildApiPath({ plural, group, version }, namespaced).includes(path);
      });

      for(const [ path, opts ] of matches) {
        endpoints[path] = [ ...opts.parameters ];
        for(const [ verb, params ] of Object.entries(opts)) {
          if(verb == 'parameters')
            continue;

          // TODO - cleanup
          operations.push(createOperation({
            kind,
            group,
            version,
            path,
            verb,
            properties: {
              ...params
            }
          }).initialize(config.packageMap));
        }
      }

      resource.definition = definition;
      resource.operations = operations;
      resource.endpoints = endpoints;
      definition.isResource = true;

      // persistentvolumeclaim-core-v1 is the only resource with an xref to it
      // Every xref is to a common object
      config.refs[util.createKey({ group, version, kind })] = util.createRef({ resource: category.name, kind, group, version });
    }
  }
}

// TODO - refactor
function createDefinitions(config = {}, { collection = {}, spec = {} } = {}) {

  for(const [packageName, schema] of Object.entries(spec)) {
    let group;
    let version;
    let kind;

    ({ group, version, kind } = util.getKindGroupVersion(packageName, config.packageMap));

    // TODO - is this fatal?
    if(group == '') {
      console.log(`Could not resolve: ${packageName}`);
      continue;
    }

    collection.add(createDefinition({
      kind,
      group,
      version,
      schema,
      apiSupportLevel: util.getApiSupportLevel(config.apiSupportLevels, { group, version })
    }));
  }
}

loadConfig.createDefinitions = createDefinitions;
//loadConfig.getKindGroupVersion = getKindGroupVersion;

module.exports = loadConfig;
