function flattenSpec({ data, definitions, propName = '.' } = {}) {
  let obj = {};
  const keys = [
    '$ref',
    'description',
    'type',
    'required',
    'additionalProperties', // "type": Possible $ref same as items[]
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

  // TODO - JSONSchemaProps cycles
  if(data['$ref'] && !data['$ref'].includes('JSONSchemaProps')) {
    data = {
      ...data,
      ...definitions[`${data['$ref'].replace('#/definitions/', '')}`]
    }
  }

  // If set, this node is an anonymous child; name it.
  // Otherwise, either its properties or the parent properties will be
  // overwritten.
  if(data['parentType']) {
    if(['array', 'object'].includes(data.type)) {
      if(data.parentType == 'object')
        propName = `${propName}{}`;
      if(data.parentType == 'array')
        propName = `${propName}[]`;
    }
    else {
      data.type = `${data.parentType} (${data.type})`;
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
    impliedChild['parentType'] = data['type'];

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

// TODO - reqPath itself is also included (but not for '.'), but must not be
function getPropertiesByPath({ properties, otherPaths = [], reqPath = '.' } = {}) {
  const keyPath = reqPath.split('.').slice(1);
  const always = Array.from(new Set([ '.', '.metadata', '.spec', '.status' ].concat(otherPaths)));

  const avoidChildrenOf = always
    .filter(prefix => prefix != reqPath)
    .filter(prefix => {
      const prefixPath = prefix.split('.').slice(1);
      return keyPath.every((part, idx) => part == prefixPath[idx]) && (prefixPath.length - keyPath.length) == 1;
    });

  // TODO - If a key matches, it can be deleted from properties

  const toRender = Object.entries(properties)
    .filter(([ propName ]) => {
      const propPath = propName.split('.').slice(1);

      // TODO - Can skip filter entirely
      if(reqPath == '.') {
        return true;
      }

      // Do not include self
      if(reqPath == propName)
        return false;

      return keyPath.every((part, idx) => part == propPath[idx]);
    }).reduce((accum, entry) => {
      const [ key, props ] = entry;
      return ({ ...accum, [key]: props });
    }, {});

  const final = Object.keys(toRender)
    .filter(v => {
      let keep = true;
      const vParts = v.split('.').slice(1);
      const vPartsLen = vParts.length;

      for(const avoidme of avoidChildrenOf) {
        const testPath = avoidme.split('.').slice(1);
        const testPathLen = testPath.length;
        keep = testPath.every((part, idx) => part == vParts[idx]);

        if(keep && vPartsLen == testPathLen) {
          return true;
        }

        if(keep && vPartsLen > testPathLen) {
          keep = false;
          continue;
        }
      }

      return keep;
    });

  return final;
}

module.exports = {
  flattenSpec,
  walkProps: flattenSpec,
  getPropertiesByPath
};
