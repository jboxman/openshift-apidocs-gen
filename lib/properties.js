const pathLength = path => {
  return path[0] == '' ? 0 : path.length;
}

function flattenSpec({ data, definitions = {}, propName = '.' } = {}) {
  let obj = {};
  const keys = [
    '$ref',
    'description',
    'type',
    'required',
    // circular ref
    //'additionalProperties', // "type": Possible $ref same as items[]
    'format',
    'x-kubernetes-int-or-string', // this replaces "type" if present
    'x-kubernetes-group-version-kind'
  ];

  // Recursively flatten a tree into a dot notation key and object value
  const flatten = (accum, v) => {
    const [ prop, value ] = v;
    accum = {
      ...accum,
      ...flattenSpec({ data: value, propName: prop, definitions })
    };
    return accum;
  };

  const getPropName = (parentProp, prop) => {
    if(parentProp == '.')
      return `.${prop}`;

    return `${parentProp}.${prop}`;
  };

  // TODO - Cleanly handle deep object refs
  data = JSON.parse(JSON.stringify(data));

  // TODO - JSONSchemaProps cycles
  if(data['$ref'] && !data['$ref'].includes('JSONSchemaProps')) {
    data = {
      ...data,
      ...definitions[`${data['$ref'].replace('#/definitions/', '')}`],
    }
  }

  // If set, this node is an anonymous child; name it.
  // Otherwise, either its properties or the parent properties will be
  // overwritten.
  if(data['parent']) {
    if(['array', 'object'].includes(data.type)) {
      if(data.parent.type == 'object')
        propName = `${propName}{}`;
      if(data.parent.type == 'array')
        propName = `${propName}[]`;
    }
    else {
      data.type = `${data.parent.type} (${data.type})`;
      data.description = data.parent.description;
    }
  }

  if(! obj[`${propName}`])
    obj[`${propName}`] = {};

  for(const key of keys) {
    if(data.hasOwnProperty(key)) {
      obj[`${propName}`][key] = data[key];
    }
  }

  let impliedChild = data['items'] || data['additionalProperties'];
  if(impliedChild) {
    if(! impliedChild[`parent`])
      impliedChild[`parent`] = {};

    for(const key of keys) {
      if(data.hasOwnProperty(key)) {
        impliedChild[`parent`][key] = data[key];
      }
    }

    return Object.entries({ [`${propName}`]: impliedChild })
      .map(v => [ ...v ])
      .reduce(flatten, obj);
  }

  // A properties object contains all keys for an object type
  if(data['properties']) {
    return Object.entries(data.properties)
    .map(v => {
      let [ prop, value ] = v;
      prop = getPropName(propName, prop);
      return [ prop, value ];
    })
    .reduce(flatten, obj);
  }

  // TODO - annotate required fields, using 'required' array if possible

  return obj;
}

function getPropertiesByPath({ properties, otherPaths = [], reqPath = '.' } = {}) {
  const keyPath = reqPath.split('.').slice(1);
  const always = otherPaths;

  let avoidChildrenOf;
  avoidChildrenOf = always
    .filter(prefix => prefix != reqPath)
    .filter(prefix => {
      const prefixPath = prefix.split('.').slice(1);

      // Handle root properties separately
      // keyPath is [''] and keyPath.every() will return false.
      if(reqPath == '.' && pathLength(prefixPath) == 1)
        return true;

      return keyPath.every((part, idx) => part == prefixPath[idx]) && (pathLength(prefixPath) - pathLength(keyPath)) == 1;
    });

  // TODO - If a key matches, it can be deleted from properties
  const toRender = selectPaths({ reqPath, properties: Object.keys(properties) });

  return avoidPaths({ pathList: toRender, avoidChildrenOf });
}

function selectPaths({ reqPath, properties }) {
  const keyPath = reqPath.split('.').slice(1);

  return properties
    .filter(propName => {
      const propPath = propName.split('.').slice(1);

      // TODO - Can skip filter entirely
      if(reqPath == '.') {
        return true;
      }

      // Do not include self
      if(reqPath == propName)
        return false;

      return keyPath.every((part, idx) => part == propPath[idx]);
    });
}

// Expects a list of paths from a single root.
// Avoids children for that path only.
function avoidPaths({ avoidChildrenOf, pathList } = {}) {

  if(!Array.isArray(avoidChildrenOf))
    avoidChildrenOf = [];

  return avoidChildrenOf.reduce((accum, avoidChildOf) => {

    const testPath = avoidChildOf.split('.').slice(1);
    const testPathLen = pathLength(testPath);

    for(const prop of accum) {
      const vParts = prop.split('.').slice(1);
      const vPartsLen = pathLength(vParts);

      if(testPath.every((part, idx) => part == vParts[idx])) {

        if(vPartsLen > testPathLen) {
          accum = accum.filter(v => v != prop);
        }

      }
    }

    return accum;
    // TODO - Pass an object instead for `delete`
  }, pathList.filter(v => v != '.'));

}

getPropertiesByPath.avoidPaths = avoidPaths;

module.exports = {
  flattenSpec,
  walkProps: flattenSpec,
  getPropertiesByPath
};
