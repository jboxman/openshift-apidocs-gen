const { onlyUniqSchemaRefs } = require('../util');

function createOperation(attributes = {}) {
  attributes = Object.assign({
    kind: '',
    group: '',
    version: '',
    path: '',
    verb: '',
    parameters: [],
    responses: [],
    properties: {},
  }, attributes);

  // From operation JSON
  attributes.properties = Object.assign({
    description: '',
    consumes: [],
    produces: [],
    schemes: [],
    tags: [],
    parameters: [],
    pathParameters: [],
    responses: {},
    'x-kubernetes-action': '',
    'x-kubernetes-group-version-kind': {}
  }, attributes.properties);

  attributes.verb = attributes.verb.toUpperCase();

  attributes.parameters = [ ...attributes.properties.parameters ];

  const body = attributes.parameters.find(key => key.in == 'body');
  if(body && body.schema) {
    const jsonRef = body.schema['$ref'].replace('#/definitions/', '');
    const refKind = jsonRef.split(/\./).slice(-1);
    Object.assign(body, { '$ref': body.schema['$ref'], type: refKind });
  }

  for(const [ code, properties ] of Object.entries(attributes.properties.responses)) {
    const response = { ...properties };

    if(response.schema) {
      if(response.schema['$ref']) {
        const jsonRef = response.schema['$ref'].replace('#/definitions/', '');
        const refKind = jsonRef.split(/\./).slice(-1);
        Object.assign(response, { '$ref': response.schema['$ref'], type: refKind });
      }
      else {
        Object.assign(response, { type: response.schema.type });
      }
    }

    attributes.responses.push({
      code,
      ...response
    });
  }

  const possibleBodyRef = () => {
    let body;
    if(body = attributes.parameters.find(key => key.in == 'body')) {
      return [ body.schema['$ref'].replace('#/definitions/', '') ];
    }
    return [];
  };

  attributes.relatedSchemas = attributes.responses.reduce(onlyUniqSchemaRefs, possibleBodyRef());

  return {
    ...attributes,

    get key() {
      return attributes.parameters.operationId;
    }
  }
}

module.exports = createOperation;
