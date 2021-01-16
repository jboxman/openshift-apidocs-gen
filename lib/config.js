const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const util = require('./util');
const loadApiSpec = require('./openapi');

const { createResourceCategory } = require('./models/resources');
const createDefinitionCollection = require('./models/definitions');
const createOperation = require('./models/operation');

const openApiSpec = {};

function loadConfig(options = {}) {
  const resource_categories = [];
  const { oapiSpecFile, configFile, configOverride } = options;
  const configFileData = loadYamlConfig(configFile);
 
  if(! Object.keys(openApiSpec).length)
    Object.assign(openApiSpec, loadApiSpec(oapiSpecFile));

  // Provide global defaults and ignore unknown keys
  const fromFile = ({
    version = '',
    outputDir = 'build',
    apisToHide = [],
    apiSupportLevels = {},
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

  createDefinitions({ collection: config.definitions, spec: openApiSpec['definitions'] });
  
  visitResources(config);

  config.definitions.initialize({ definitions: openApiSpec.definitions });

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
          }));
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
function createDefinitions({ collection = {}, spec = {} } = {}) {

  for(const [ ref, definition ] of Object.entries(spec)) {
    let group;
    let version;
    let kind;
    let gvk;

    ({ group, version, kind } = util.guessGroupVersionKind(ref));

    if(group == '') {
      // TODO - raise exception?
      console.log(`Could not resolve: ${ref}`);
      continue;
    }

    // TODO - clean up assignments
    const item = {
      schema: definition,
      group,
      version,
      kind,
      specId: ref
    };

    collection.add(item);
  }
}

function loadYamlConfig(file = 'api-config.yaml') {
  if(! fs.existsSync(file)) {
    console.error(`Cannot open configuration file: ${file}`);
    process.exit(1);
  }

  try {
    return yaml.safeLoad(fs.readFileSync(file, { encoding: 'utf8' }));
  }
  catch(e) {
    if(e instanceof Error && e.name == 'YAMLException') {
      console.error(`Cannot parse configuration file. The YAML is invalid.`);
      console.error(e.message);
      process.exit(1);
    }
  }
}

loadConfig.createDefinitions = createDefinitions;

module.exports = loadConfig;
