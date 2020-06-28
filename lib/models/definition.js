const { titleize } = require('../util');

const {
  flattenSpec,
  getPropertiesByPath
} = require('../properties');

function createDefinition(attrs = {}) {
  let isInitialized = false;

  const attributes = {
    specId: null,
    //name: null, //deprecated

    group: null,
    version: null,
    kind: null,

    isResource: false,

    flatSpec: {},
    propertiesByPath: {},
    relatedDefinitions: [],

    // Operation categories and associated operations
    operationCategories: [],
    operations: [], // not in original type

    fields: [],

    resource: null,
    schema: null
  };

  Object.assign(attributes, attrs);

  //function appendToOperationCategories(oc) {
    //console.log(`Appending opCats: ${Object.keys(oc)}`);
  //  return attributes.operationCategories = [...attributes.operationCategories, oc];
  //}

  return {
    initialize({ definitions } = {}) {

      let resolve = attributes.isResource ? attributes.group : false;
      attributes.flatSpec = flattenSpec({ data: attributes.schema, definitions, resolve });

      let wantPaths = Object.entries(attributes.flatSpec).reduce((accum, entry) => {
        if(['object', 'array'].includes(entry[1].type))
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

    /*
    get name() {
      return attributes.name;
    },
    */

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

    set isResource(bool = false) {
      return attributes.isResource = bool;
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

    get fields() {
      return [ ...attributes.fields ];
    },

    get operationCategories() {
      return [ ...attributes.operationCategories ];
    },

    // This hardcodes some peculiarities of operationId mapping.
    get operationGroupName() {
      // Special case in k8s
      if(attributes.group.toLowerCase() == 'rbac') {
        return 'RbacAuthorization';
      }
      // Must return bare word for core k8s APIs
      if(/io\.k8s\.api\.core/.test(attributes.group)) {
        return 'Core';
      }
      // Some k8s APIs
      else if(/io\.k8s\.api/) {
        return titleize(attributes.group.split('.')[0]);
      }

      return attributes.group;
    },

    appendToOperationCategories(category) {
      return attributes.operationCategories = [ ...attributes.operationCategories, category ];
    },

    appendToOperations(operation) {
      //console.log(`Appending: ${operation.key()}`);
      return attributes.operations = [ ...attributes.operations, operation ];
    },

    // TODO - define field type
    addField(field) {
      attributes.fields.push(field);
    },

    getSchema() {
      return Object.assign({}, attributes.schema);
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
