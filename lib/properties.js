function walkProps({ data, propName = '' } = {}) {
  let obj = {};
  const keys = [
    '$ref',
    'description',
    'type',
    'required',
    'additionalProperties', // Possible $ref
    'format',
    'x-kubernetes-int-or-string',
    'x-kubernetes-group-version-kind'
  ];

  // Recursively flatten a tree into a dot notation key and object value
  const flatten = (accum, v) => {
    const [ prop, value ] = v;
    accum = {
      ...accum,
      ...walkProps({ data: value, propName: prop })
    };
    return accum;
  };

  const getPropName = (parentProp, prop) => {
    return `${parentProp}.${prop}`;
  };

  // Initial value is ""
  // This excludes all the keys on '.'
  if(propName) {
    if(! obj[`${propName}`])
      obj[`${propName}`] = {};

    for(const key of keys) {
      if(data.hasOwnProperty(key)) {
        obj[`${propName}`][key] = data[key];
      }
    }

    // TODO - do I care about resolving this?
    // Named object
    if(data['$ref']) {
      obj[`${propName}`]['type'] = `${data['$ref'].replace('#/definitions/', '')}`;
    }
  }

  if(data['items']) {
    if(! obj[`${propName}`])
      obj[`${propName}`] = {};

    for(const key of keys) {
      if(data.hasOwnProperty(key)) {
        obj[`${propName}`][key] = data[key];
      }
    }

    // Named object
    if(data['$ref']) {
      obj[`${propName}`]['type'] = `${data['$ref'].replace('#/definitions/', '')}`;
    }

    // An array is anonymous but must have the same prop depth
    // as its parent.
    return Object.entries({ [`${propName}[]`]: data.items })
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

  return obj;
}

// TODO - reqPath itself is also included (but not for '.'), but must not be
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

module.exports = {
  walkProps,
  getPropertiesByPath
};

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
