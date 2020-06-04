// TODO - add double newline for asciidoc
const escapeMarkup = (text = '') => {
  return text.replace(/[|]/g, '\\|');
};

const hasChildren = children => {
  if(Array.isArray(children) && children.length > 0)
    return true;

  return false;
};

const truncatePath = (path, parent) => {
  return path.replace(`${parent}.`, '');
};

const notRoot = key => key == '.' ? false : true;

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

module.exports = {
  escapeMarkup,
  createFindDefinitionByKey,
  flatPropertiesForTable,
  flatPropertiesSliceForTable,
  truncatePath,
  hasChildren,
  notRoot
};
