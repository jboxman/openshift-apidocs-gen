const openApiPreamble = {
  "swagger": "2.0",
  "info": {
   "description": "Hello world.",
   "title": "OpenShift API (with Kubernetes)",
   "license": {
    "name": "Apache 2.0 (ASL2.0)",
    "url": "http://www.apache.org/licenses/LICENSE-2.0"
   },
   "version": "latest"
  },
  paths: {},
  definitions: {}
};

// Adds paths
// Add definitions

function reflect(definitions, ...objs) {
  if(objs.length > 0)
    objs = [...objs];

  return objs.reduce(function(spec, obj) {
    // Add to either paths or definitions
    spec.definitions[obj.specId] = obj.getSchema();

    Object.assign(spec.definitions, descend(obj._attributes().dependsOn, definitions));

    for(const definition of obj._attributes().inlineDefs) {
      spec.definitions[definition.specId] = definition.getSchema();
    }

    // TODO - Determine if $ref in parameters and responses must be resolved
    for(const operation of obj._attributes().operations) {
      if(! spec.paths[operation.path])
        spec.paths[operation.path] = {};

      spec.paths[operation.path][operation.httpMethod] = operation.op;
    }

    return spec;
  }, openApiPreamble);
}

function descend(dependsOn, definitions, defs = {}) {
  //console.log(JSON.stringify(dependsOn, null, 2));

  for(const key of dependsOn) {
    const definition = definitions.all()[key];
    defs[definition.specId] = definition.getSchema();

    if(definition._attributes().dependsOn.length > 0) {
      Object.assign(defs, descend(definition._attributes().dependsOn, definitions, defs));
    }
  }

  return defs;
}

module.exports = reflect;
