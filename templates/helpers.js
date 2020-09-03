const util = require("../lib/util");

// TODO - add double newline for asciidoc
const escapeMarkup = (text = '') => {
  return text.replace(/[|]/g, '\\|');
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

const isComplex = prop => prop.hasOwnProperty('gvk') ? true : false;

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
    .sort((a, b) => a.name.localeCompare(b.name))
};

const truncatePath = (path, parent) => {
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

const createGatherRelatedDefinitions = config => function fn(relatedDefinitions) {
  return relatedDefinitions.reduce((accum, gvk) => {
    const definition = config.definitions.getByVersionKind(gvk);

    if(definition) {
      if(!accum.find(v => (v.group == gvk.group && v.version == gvk.version && v.kind == gvk.kind))) {
        accum.push(gvk);

        if(definition.relatedDefinitions.length > 0) {
          const uniq = fn(definition.relatedDefinitions).filter(gvk => {
            return !accum.find(v => (v.group == gvk.group && v.version == gvk.version && v.kind == gvk.kind));
          });
    
          if(uniq.length > 0)
            accum.push(...uniq);
        }
      }
    }

    return accum;
  }, []);
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

const createLinkToObject = config => prop => {
  if(!prop.hasOwnProperty('gvk'))
    return '';

  const ref = config.refs[util.createKey(prop.gvk)];
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
const createLinkToResource = config => kgv => {
  const ref = config.refs[util.createKey(kgv)];
  if(ref)
    return `./${ref.path}/${ref.filename}#${ref.anchor}`;

  return '';
}

module.exports = {
  isRoot,
  isComplex,
  hasChildren,
  hasRequired,

  sortedByEndpoint,
  getEndpointOperations,
  getEndpointParameters,
  parametersFor,

  escapeMarkup,

  createFindDefinitionByKey,
  createGatherRelatedDefinitions,
  createLinkToObject,
  createLinkToResource,

  flatPropertiesForTable,
  flatPropertiesSliceForTable,
  truncatePath,
  getRoot
};
