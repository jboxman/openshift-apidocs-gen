const util = require("../lib/util");

const signature = () => `// Automatically generated by '${util.whoami}'. Do not edit.`;

// TODO - add double newline for asciidoc
const escapeMarkup = (text = '') => {
  return text.replace(/[|]/g, '\\|');
};

const displayGroupVersion = (version, group) => {
  if(!version) return '';
  if(!group) return version;
  return `${group}/${version}`;
};

const hasChildren = children => {
  if(Array.isArray(children) && children.length > 0)
    return true;

  return false;
};

const hasRequired = required => {
  if(Array.isArray(required) && required.length > 0)
    return true;

  return false;
};

const isComplex = prop => prop.hasOwnProperty('$ref') ? true : false;

const sortedByEndpoint = endpoints => {
  const fn = (a, b) => {
    if(a.length == b.length)
      return a.localeCompare(b);

    return a.length - b.length;
  };

  return Object.keys(endpoints).sort(fn);
};

const getEndpointOperations = (operations, endpoint) => {
  if(!Array.isArray(operations))
    return [];

  if(!endpoint)
    return [];

  return operations
    .filter(operation => operation.path == endpoint)
    .sort((a, b) => a.verb.localeCompare(b.verb));
};

const getEndpointParameters = (endpoints, endpoint) => {
  if(Object.prototype.toString.call(endpoints) !== '[object Object]')
    return [];

  if(!endpoint)
    return [];

  return endpoints[endpoint];
};

const parametersFor = (params = [], where = '') => {
  if(!Array.isArray(params))
    return [];

  if(!where)
    return [];

  return params
    .filter(param => param.in == where)
    .sort((a, b) => a.name.localeCompare(b.name));
};

const truncatePath = (path, parent) => {
  if(parent == '.')
    return path.replace(`.`, '');

  return path.replace(`${parent}.`, '');
};

const isRoot = key => key == '.' ? true : false;

const getRoot = flatProps => {
  if(! flatProps)
    return {};

  return flatProps['.'];
}

const flatPropertiesForTable = flatProps => {
  // TODO - There may not be any.
  // io.k8s.apimachinery.pkg.apis.meta.v1.Time
  if(! flatProps)
    return [];

  return Object.entries(flatProps)
    .reduce((a, e) => a.concat([ { property: e[0], ...e[1] } ]), []);
};

/*
{ '.':
  [
    '.apiVersion',
    '.fullName',
    '.groups'
  ]
}
*/
const flatPropertiesSliceForTable = (flatProps, slice) => {
  //console.log(flatProps);
  //console.log(slice);

  if(! flatProps)
    return [];

  if(! slice)
    return [];

  return slice.reduce((a, e) => a.concat([ { property: e, ...flatProps[e] } ]), []);
};

const createFindDefinitionByKey = config => key => {
  // TODO - There may not be one
  // io.k8s.apimachinery.pkg.apis.meta.v1.Time
  if(! key)
    return {};

  switch (typeof(key)) {
    case 'string':
        return config.definitions.all()[key];
      break;

    case 'object':
        return config.definitions.getByVersionKind(key);
      break;

    default:
       return {};
      break;
  }
};

const createLinkToObject = config => schemaProps => {
  //if(!schemaProps.type) console.log(`${schemaProps['$ref']}:${schemaProps.type}`);
  const ref = config.refs[schemaProps['$ref'].replace('#/definitions/', '')];
  if(ref)
    return `../${ref.path}/${ref.filename}#${ref.anchor}`;

  return '';
}

/**
 * Return a function that can link to the specified resource. Assumes that the linking
 * document is in the parent directory.
 *
 * @param {object} config - config instance
 * @returns {Handlebars.HelperDelegate} linkToResource
 */
const createLinkToResource = config => obj => {
  const ref = config.refs[obj.schemaId];
  if(ref)
    return `./${ref.path}/${ref.filename}#${ref.anchor}`;

  return '';
}

module.exports = {
  signature,

  isRoot,
  isComplex,
  hasChildren,
  hasRequired,

  sortedByEndpoint,
  getEndpointOperations,
  getEndpointParameters,
  parametersFor,

  escapeMarkup,
  displayGroupVersion,

  createFindDefinitionByKey,
  createLinkToObject,
  createLinkToResource,

  flatPropertiesForTable,
  flatPropertiesSliceForTable,
  truncatePath,
  getRoot
};
