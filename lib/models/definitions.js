const createDefinition = require('./definition');
const createField = require('./field');

const {
  getDefinitionVersionKind,
  getTypeName,
  isComplex,
  createKey
} = require('../util');

const {
  patchMergeKeyKey,
  patchStrategyKey
} = require('../constants');

function createDefinitionCollection() {
  const items = {};
  let itemsByKind = {};
  let isInitialized = false;

  // TODO - basically no-op
  function initialize() {

    if(Object.keys(items).length <= 0) {
      return isInitialized;
    }

    isInitialized = true;
    return isInitialized;
  }

  function add(definition) {
    if(! definition.key) {
      definition = createDefinition(definition);
    }
    items[definition.key()] = definition;
    return definition;
  }

  function all() {
    return Object.assign({}, items);
  }

  // types.go
  function getSchemaFor(schema) {
    const gvk = getDefinitionVersionKind(schema);
    if(gvk) {
      return getByVersionKind(gvk);
    }
    return null;
  }

  // spec['$ref']
  function getForSchema(schema = {}) {
    const gvk = getDefinitionVersionKind(schema);
    return getByVersionKind(gvk);
  }

  function parameterToField({ name, description, schema }) {
    let definition;
    let fieldType;

    const field = createField({
      name,
      description
    });

    if(schema) {
      fieldType = getTypeName(schema);
      definition = getForSchema(schema);
      if(definition) {
        field.type = fieldType;
        field.definition = definition.key();
      }
    }

    return field;
  }

  // types.go
  function getReferences(definition) {
    const defs = [];
    const { properties } = definition.getSchema();

    for(const property in properties) {
      if(! isComplex(properties[property])) {
        continue;
      }

      let referencedSchema = getSchemaFor(properties[property]);
      if(referencedSchema) {
        defs.push(referencedSchema);
      }
      else {
        const gvk = getDefinitionVersionKind(properties[property]);
        console.log(`${definition.key()} Couldn't find reference for "${property}"`);
      }
    }

    return defs;
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
    return getItemsByKind(kind).filter(candidate => candidate.group == group);
  }

  function getItemsByKind(kind = undefined) {
    if(itemsByKind[kind])
      return itemsByKind[kind];

    return [];
  }

  return {
    add,
    all,
    initialize,

    getByVersionKind,
    getForSchema,
    parameterToField
  }
}

module.exports = createDefinitionCollection;
