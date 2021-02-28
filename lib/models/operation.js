const { getKindGroupVersion } = require('../util');

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

  return {
    ...attributes,

    initialize(packageMap = {}) {
      const body = attributes.parameters.find(key => key.in == 'body');
      if(body && body.schema) {
        const gvk = getKindGroupVersion(body.schema['$ref'].replace('#/definitions/', ''), packageMap);
        Object.assign(body, { gvk, type: `${gvk.kind} ${gvk.group}/${gvk.version}` });
      }

      for(const [ code, properties ] of Object.entries(attributes.properties.responses)) {
        const response = { ...properties };

        if(response.schema) {
          if(response.schema['$ref']) {
            const gvk = getKindGroupVersion(response.schema['$ref'].replace('#/definitions/', ''), packageMap);
            Object.assign(response, { gvk, type: `${gvk.kind} ${gvk.group}/${gvk.version}` });
          }
          else {
            Object.assign(response, { type: response.schema.type });
          }
        }

        attributes.responses.push({
          code,
          ...response
        });

        return this;
      }
    },

    get key() {
      return attributes.parameters.operationId;
    },

    defs() {
      const defs = [];
      let body;

      if(body = attributes.parameters.find(key => key.in == 'body'))
        defs.push(body.gvk);

      return attributes.responses.reduce((accum, response) => {
        if(!response.hasOwnProperty('gvk'))
          return accum;

        let { gvk } = response;
        if(!accum.find(({ kind, group, version }) => gvk.kind == kind && gvk.group == group && gvk.version == version))
          accum.push(response.gvk);

        return accum;
      }, defs);
    }
  }
}

module.exports = createOperation;
