const {
  flattenSpec,
  getPropertiesByPath
} = require('../properties');

function createDefinition(attrs = {}) {
  let isInitialized = false;

  const attributes = {
    specId: null,

    group: null,
    version: null,
    kind: null,

    isResource: false,

    flatSpec: {},
    propertiesByPath: {},
    relatedDefinitions: [],

    resource: null,
    schema: null
  };

  Object.assign(attributes, attrs);

  //function appendToOperationCategories(oc) {
    //console.log(`Appending opCats: ${Object.keys(oc)}`);
  //  return attributes.operationCategories = [...attributes.operationCategories, oc];
  //}

  return {
    initialize({ definitions = {} } = {}) {

      let resolve = attributes.isResource ? attributes.group : false;
      attributes.flatSpec = flattenSpec({ data: attributes.schema, definitions, resolve });

      let wantPaths = Object.entries(attributes.flatSpec).reduce((accum, entry) => {
        if(['object', 'array'].includes(entry[1].type) || entry[0] == '.')
          accum.push(entry[0]);
        return accum;
      }, []);

      attributes.propertiesByPath = wantPaths.reduce((accum, path) => {
        return {
          ...accum,
          [path]: getPropertiesByPath({ properties: attributes.flatSpec, otherPaths: wantPaths, reqPath: path })
        };
      }, {});

      attributes.relatedDefinitions = Object.entries(attributes.flatSpec).reduce((accum, entry) => {
        if(entry[1].hasOwnProperty('gvk')) {
          const { gvk } = entry[1];
          if(!accum.find(v => (v.group == gvk.group && v.version == gvk.version && v.kind == gvk.kind)))
            accum.push(gvk);
        }
        return accum;
      }, []);

      return isInitialized = true;
    },

    key() {
      const { group, version, kind } = attributes;
      return [group, version, kind].join('.');
    },

    // TODO - template wants a property, but key() used above
    get key2() {
      return this.key();
    },

    get specId() {
      return attributes.specId;
    },

    get group() {
      return attributes.group;
    },

    get version() {
      return attributes.version;
    },

    get kind() {
      return attributes.kind;
    },

    get isResource() {
      return attributes.isResource;
    },

    set isResource(bool) {
      attributes.isResource = bool;
    },

    get description() {
      return attributes.description;
    },

    get flatSpec() {
      return { ...attributes.flatSpec };
    },

    get propertiesByPath() {
      return { ...attributes.propertiesByPath };
    },

    get relatedDefinitions() {
      return [ ...attributes.relatedDefinitions ];
    },

    appendToOperations(operation) {
      //console.log(`Appending: ${operation.key()}`);
      return attributes.operations = [ ...attributes.operations, operation ];
    },

    // Only return useful attributes
    _attributes() {
      const attrs = Object.assign({}, attributes);
      delete attrs.schema;
      return attrs;
    }

  }
}

module.exports = createDefinition;
