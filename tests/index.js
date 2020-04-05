function walkProps({ data, propName = '', depth = -1, definitions } = {}) {
  let obj = {};
  const keys = [
    'description',
    'type',
    'required',
    'additionalProperties',
    'format',
    'x-kubernetes-int-or-string',
    'x-kubernetes-group-version-kind'
  ];

  // Recursively flatten a tree into a dot notation key and object value
  const flatten = (accum, v) => {
    const [ prop, value ] = v;
    accum = {
      ...accum,
      ...walkProps({ data: value, propName: prop, depth: (depth + 1), definitions })
    };
    return accum;
  };

  const getPropName = (parentProp, prop, depth) => {
    if(depth > 0) {
      return `${parentProp}.${prop}`;
    }
    return `.${prop}`;
  };

  // Bootstrap the initial value
  if(depth < 0) {
    const result = Object.entries({ '': { type: 'object', items: Object.values(data)[0] } })
      .reduce(flatten, obj);

    // TODO - Eliminate spurious '' key
    delete result[''];
    return result;
  }

  // Resolve JSON ref
  if(data['$ref']) {
    data = {
      ...definitions[`${data['$ref'].replace('#/definitions/', '')}`]
    }
  }

  if(! obj[`${propName}`])
    obj[`${propName}`] = {};

  for(const key of keys) {
    if(data.hasOwnProperty(key)) {
      obj[`${propName}`][key] = data[key];
    }
  }

  if(data['items']) {
    // If not, it is the bootstrap items array
    if(depth > 0) {
      if(! obj[`${propName}`])
        obj[`${propName}`] = {};

      for(const key of keys) {
        if(data.hasOwnProperty(key)) {
          obj[`${propName}`][key] = data[key];
        }
      }
    }

    // An array is anonymous but must have the same prop depth
    // as its parent.
    return Object.entries({ [`${propName}[]`]: data.items })
      .map(v => {
        return depth <= 0 ? [ [''], v[1]] : [ ...v ]
      })
      .reduce(flatten, obj);
  }

  // A properties object contains all keys for an object type
  if(data['properties']) {
    return Object.entries(data.properties)
    .map(v => {
      let [ prop, value ] = v;
      prop = getPropName(propName, prop, depth);
      return [ prop, value ];
    })
    .reduce(flatten, obj);
  }

  return obj;
}
//properties = {}, otherPaths = ['.', '.meta', '.spec', '.status'], reqPath
function getPropertiesByPath({ properties, otherPaths = [], reqPath = '.' } = {}) {
  const always = Array.from(new Set([ '.', '.metadata', '.spec', '.status' ].concat(otherPaths)));

  const avoidChildrenOf = always.filter(prefix => prefix != reqPath);
  const keyPath = reqPath.split('.').slice(1);

  // TODO - If a key matches, it can be deleted from properties

  const toRender = Object.entries(properties)
    .filter(([ propName ]) => {
      const propPath = propName.split('.').slice(1);

      // TODO - Can skip filter entirely
      if(reqPath == '.') {
        return true;
      }

      return keyPath.every((part, idx) => part == propPath[idx]);
    }).reduce((accum, entry) => {
      const [ key, props ] = entry;
      return ({ ...accum, [key]: props });
    }, {});

  const final = Object.keys(toRender)
    .filter(v => {
      let skip = false;
      const vParts = v.split('.').slice(1);

      for(const avoidme of avoidChildrenOf) {
        const testPath = avoidme.split('.').slice(1);
        skip = testPath.every((part, idx) => part == vParts[idx]);

        // TODO - Is this desired behavior?
        // Because . and .foo are the same depth,
        // this limits . to a single level.
        if(skip) {
          if(vParts.length > testPath.length) {
            return false;
          }
        }
      }
      return true;
    });

  return final;
}

  /*
  const tables = Object.entries(properties)
    .filter(([ , props ]) => props.type == 'object')
    .reduce((accum, entry) => [ ...accum, entry[0] ], []);
  */

    /*
    .reduce((accum, entry) => {
      const [ key, props ] = entry;
      return ({ ...accum, [key]: props });
    }, {});
    */

module.exports = {
  walkProps,
  getPropertiesByPath
}
