const fs = require('fs');

const createDefinition = require('./models/definition');
const createOperation = require('./models/operation');

const {
  typeKey,
} = require('./constants');

function loadApiSpec(specFile = '') {
  const apiSpec = {};
  let contents;

  if(Object.keys(apiSpec).length > 0)
    return Object.assign({}, apiSpec);

  if(! fs.existsSync(specFile)) {
    console.error(`Cannot open OpenAPI spec file: ${specFile}`);
    console.error(err.message);
    process.exit(1);
  }

  try {
    contents = fs.readFileSync(specFile);
  }
  catch(err) {
    console.error(`Cannot read OpenAPI spec file: ${specFile}`);
    console.error(err.message);
    process.exit(1);
  }

  try {
    Object.assign(apiSpec, JSON.parse(contents));
  }
  catch(err) {
    if(err instanceof SyntaxError) {
      console.error(err.message);
      process.exit(1);
    }
  }

  return Object.assign({}, apiSpec);
}

function parseApiSpec({ spec = {} } = {}) {
  const [ apis, endpoints ] = Object.entries(spec['paths']).reduce(([ ops, endpoints ] , [ path, opts ]) => {
    const verbs = Object.entries(opts).reduce((accum, [ verb, properties ]) => {
      if(properties.hasOwnProperty(typeKey)) {
        const { kind, group, version } = properties[typeKey];
  
        accum.push(createOperation({
          operationId: properties.operationId,
          apiKey: `${kind}:${group}:${version}`,
          path,
          verb,
          kind,
          group,
          version,
          action: properties['x-kubernetes-action'],
          properties: { ...properties }
        }));
      }
  
      //if(verb != 'parameters')
      //  console.warn(`${path} ${verb} ${params.operationId}`);
  
      return accum;
    }, []);

    for(const verb of verbs) {
      const { apiKey } = verb;

      if(! ops.has(apiKey)) {
        ops.set(apiKey, []);
      }
      ops.set(apiKey, ops.get(apiKey).concat(verb));
    }

    // Every verb is associated with the same apiKey
    if(verbs.length > 0) {
      if(! endpoints.has(verbs[0].apiKey)) {
        endpoints.set(verbs[0].apiKey, {});
      }
      if(! endpoints.has(verbs[0].apiKey)[path]) {
        endpoints.set(verbs[0].apiKey, Object.assign(endpoints.get(verbs[0].apiKey), {[path]: { ... opts }}));
      }
    }

    return [ ops, endpoints ];
  }, [ new Map(), new Map() ]);

  const [ definitions ] = Object.entries(spec['definitions']).reduce(([ m, apis ], [ schemaId, schema ]) => {
    const kgvs = schema[typeKey] || [];
    const { kind, group, version } = kgvs.length == 1 ? kgvs[0] : (kgvs.find(v => v.group != '') || {});

    m.set(schemaId, createDefinition({
      schemaId,
      kind,
      group,
      version,
      isResource: apis.has(`${kind}:${group}:${version}`) ? true : false,
      schema
    }, spec['definitions']));

    return [ m, apis ];
  }, [ new Map(), apis ]);

  return { apis, definitions, endpoints };
}

module.exports = {
  loadApiSpec,
  parseApiSpec
}
