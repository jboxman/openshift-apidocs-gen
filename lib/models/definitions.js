const createDefinition = require('./definition');

const {
  createKey
} = require('../util');

function createDefinitionCollection() {
  const items = {};
  let itemsByGroup = {};
  let isInitialized = false;

  function initialize({ definitions = {} } = {}) {

    if(Object.keys(items).length <= 0) {
      return isInitialized;
    }

    // Conditionally initialize
    if(Object.keys(definitions).length > 0) {
      for(const definition of Object.values(items)) {
        definition.initialize({ definitions });
      }
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
    if(! definition.key) {
      definition = createDefinition(definition);
    }
    items[definition.key()] = definition;
    //return definition;
  }

  function all() {
    return Object.assign({}, items);
  }

  // Look up a definition by its group, version, kind key
  function getByVersionKind(gvk) {
    const key = createKey(gvk);
    const def = items[key];
    if(def) {
      return def;
    }
    else {
      // It may not exist. That's okay.
      //console.error(`Definition not found: ${gvk.group} ${gvk.version} ${gvk.kind}`);
      return null;
    }
  }

  function getByGroupKind({ group, kind } = {}) {
    return getItemsByGroup(group).filter(candidate => candidate.kind == kind);
  }

  function getItemsByGroup(group = undefined) {
    if(itemsByGroup[group])
      return itemsByGroup[group];

    return [];
  }

  return {
    add,
    all,
    initialize,

    getByVersionKind,
    getByGroupKind
  }
}

module.exports = createDefinitionCollection;
