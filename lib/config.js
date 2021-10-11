const util = require('./util');
const { loadApiSpec, parseApiSpec } = require('./openapi');

const { createResourceCategory } = require('./models/resources');
const createDefinitionCollection = require('./models/definitions');

// Provide global defaults and ignore unknown keys
const fromFile = ({
  version = '',
  outputDir = 'build',
  apiMap = [],
  apisToHide = [],
  ...rest
} = {}) => ({version, outputDir, apiMap});

function createConfig(options = {}) {
  const openApiSpec = {};

  const resource_categories = [];
  const { oapiSpecFile, configFile, configOverride } = options;
  const configFileData = util.loadYamlConfig(configFile);

  if(configFileData.hasOwnProperty('version')) {
    resource_categories.push(...configFileData.apiMap);
  }
  else {
    resource_categories.push(...configFileData);
  }

  const config = {
    // TODO
    // These aren't really resources, they describe content organization
    // apiDisplayGroup && apiDisplayGroupItem
    resourceCategories: [ ...initializeResources(resource_categories) ],
    definitions: [],
    refs: {}
  };

  Object.assign(config, fromFile(configFileData), configOverride);

  function initialize() {
    if(!Object.keys(openApiSpec).length) Object.assign(openApiSpec, loadApiSpec(oapiSpecFile));

    const { apis, definitions: schemas, endpoints } = parseApiSpec({ spec: openApiSpec });

    Object.assign(config, { definitions: createDefinitionCollection(schemas), apis, schemas, endpoints });
  }

  function getConfig() {
    return { ...config };
  }

  function finalize() {
    visitResources(config);

    config.definitions.initialize();
  
    // TODO - Refactor
    for(const [ key, definition ] of Object.entries(config.definitions.all())) {
      if(!definition.isResource) {
        config.refs[definition.schemaId] = util.createRef({ resource: 'objects', schemaId: definition.schemaId });
      }
    }
  }

  return {
    getConfig,
    initialize,
    finalize
  };
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
      let { group, version, kind } = resource;
      // TODO salve
      if(group == 'core') group = '';
      const definition = config.definitions.getByVersionKind({ group, version, kind });

      const endpoints = config.endpoints.get(`${kind}:${group}:${version}`);
      const operations = config.apis.get(`${kind}:${group}:${version}`);

      if(!definition) {
        console.error(`No known definition for '${resource.kind} [${resource.group}/${resource.version}]'`);
        continue;
      }

      resource.definition = definition;
      resource.operations = operations;
      resource.endpoints = endpoints;

      // persistentvolumeclaim-core-v1 is the only resource with an xref to it
      // Every xref is to a common object
      config.refs[definition.schemaId] = util.createRef({ resource: category.name, kind, group, version });
    }
  }
}

module.exports = createConfig;
