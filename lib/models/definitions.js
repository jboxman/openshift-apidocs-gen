const { createKey } = require('../util');

function createDefinitionCollection(schemas = []) {
  const apiResources = new Map();
  const items = {};
  let itemsByGroup = {};
  let isInitialized = false;

  for(const [ , schema ] of schemas) {
    add(schema);
  }

  function initialize() {

    if(Object.keys(items).length <= 0) {
      return isInitialized;
    }

    // Need to support sorting by version
    itemsByGroup = Object.entries(items).reduce(function(accum, value) {
      const [ key, definition ] = value;
      const group = definition.group;
      if(! accum[group])
        accum[group] = [];
  
      accum[group].push(definition);

      return accum;
    }, {});

    isInitialized = true;
    return isInitialized;
  }

  function add(definition) {
    if(! definition.apiKey) {
      return false;
    }
    items[definition.schemaId] = definition;
    apiResources.set(definition.apiKey(), definition.schemaId);
    //return definition;
  }

  function all() {
    return Object.assign({}, items);
  }

  // Look up a definition by its group, version, kind key
  function getByVersionKind(gvk) {
    // TODO - Salve
    if(gvk.group == 'core') gvk.group = '';

    const apiKey = createKey(gvk);
    const def = items[apiResources.get(apiKey)];
    if(def) {
      return def;
    }
    else {
      // If the configuration has drifted too far from the latest OpenAPI spec
      // then the definition might have been dropped from Kubernetes or OpenShift.
      return null;
    }
  }

  function getBySchemaId(schemaId = '') {
    return { ...items[schemaId] };
  }

  function getByGroupKind({ group, kind } = {}) {
    // TODO - Salve
    if(group == 'core') group = '';
    return getItemsByGroup(group).filter(candidate => candidate.kind == kind);
  }

  function getItemsByGroup(group = '') {
    if(itemsByGroup[group])
      return itemsByGroup[group];

    return [];
  }

  return {
    add,
    all,
    initialize,

    getBySchemaId,
    getByVersionKind,
    getByGroupKind
  }
}

module.exports = createDefinitionCollection;
