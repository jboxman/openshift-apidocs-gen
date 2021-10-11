const { onlyUniqSchemaRefs } = require('../util');
const {
  flattenProps,
  getPropertiesByPath
} = require('../properties');

function createDefinition(attrs = {}, definitions) {

  const attributes = {
    schemaId: '',

    group: '',
    version: '',
    kind: '',

    isResource: false,

    flatSpec: {},
    propertiesByPath: {},
    relatedSchemas: [],

    schema: null
  };

  Object.assign(attributes, attrs);

  let resolve = attributes.isResource ? attributes.schemaId : false;
  attributes.flatSpec = flattenProps({ data: attributes.schema, definitions, resolve });

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

  attributes.relatedSchemas = Object.entries(attributes.flatSpec).reduce(onlyUniqSchemaRefs, []);

  return {
    get schemaId() {
      return attributes.schemaId;
    },

    apiKey() {
      const { group, version, kind } = attributes;
      return [group, version, kind].join('.');
    },

    // TODO - template wants a property, but key() used above
    get key2() {
      return this.apiKey();
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

    get level() {
      return attributes.apiSupportLevel;
    },

    get isResource() {
      return attributes.isResource;
    },

    set isResource(bool) {
      attributes.isResource = bool;
    },

    get flatSpec() {
      return { ...attributes.flatSpec };
    },

    get propertiesByPath() {
      return { ...attributes.propertiesByPath };
    },

    get relatedSchemas() {
      return [ ...attributes.relatedSchemas ];
    }
  }
}

module.exports = createDefinition;
