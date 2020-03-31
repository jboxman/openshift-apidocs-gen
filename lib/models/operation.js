// /apis/<group>/<version>/namespaces/{namespace}/<resources>/{name}/<subresource>
//const matchNamespaced = new RegExp(
//  `^/apis/([A-Za-z0-9\.]+)/([A-Za-z0-9]+)/namespaces/{namespace}/([A-Za-z0-9\.]+)/{name}/([A-Za-z0-9\.]+)$`);

//const matchUnnamespaced = new RegExp(
//  `^/apis/([A-Za-z0-9\.]+)/([A-Za-z0-9]+)/([A-Za-z0-9\.]+)/{name}/([A-Za-z0-9\.]+)$`);

function createOperation(attrs) {
  const attributes = {
    // This seems to be the API endpoint operations dict (needed to inspect endpoint query parameters)
    item: null,
    // This appears to be the raw JSON (needed to inspect HTTP verb parameters)
    op: null,
    id: null,
    // This is the OperationType{Name,Match}
    operationType: null,
    path: null,
    httpMethod: null,
    // The resource definition; I'm tempted to just use an ID here
    definition: null,
    // All arrays of Field, name, type, desc, optional definition field/foreign key
    bodyParams: [],
    queryParams: [],
    pathParams: [],
    // This is an array of {Field, Code} objects
    httpResponses: [],
    exampleConfig: null
  };

  // initialize operation
  Object.assign(attributes, attrs);

  function key() {
    return attributes['id'];
  }

  return {
    key,

    get operationTypeName() {
      return attributes.operationType.name;
    },

    get description() {
      return attributes.op.description;
    },

    get definition() {
      return attributes.definition;
    },

    set definition(v) {
      attributes.definition = v;
    },

    get item() {
      return Object.assign({}, attributes.item);
    },

    get op() {
      return Object.assign({}, attributes.op);
    },

    get httpMethod() {
      return attributes.httpMethod;
    },

    set operationType(v) {
      attributes.operationType = v;
    },

    get operationSpec() {
      return attributes.op;
    },

    get path() {
      return attributes.path;
    },

    getMethod() {
      const methods = {
        GET: 'List',
        POST: 'Create',
        PATCH: 'Patch',
        DELETE: 'Delete',
        PUT: 'Update'
      };

      return methods[attributes.httpMethod] || '';
    },

    // TODO - appears unused
    /*
    getGroupVersionKindSub() {
      let { group, version, kind, sub } = {};
      let matches;

      matches = matchNamespaced.exec(attributes.path);
      if(matches) {
        [, group, version, kind, sub] = matches;
        return { group: group.split('.')[0], version, kind, sub };
      }

      matches = matchUnnamespaced.exec(attributes.path);
      if(matches) {
        [, group, version, kind, sub] = matches;
        return { group, version, kind, sub };
      }

      return {};
    },
    */

    get bodyParams() {
      return [ ...attributes.bodyParams ];
    },

    get queryParams() {
      return [ ...attributes.queryParams ];
    },

    get pathParams() {
      return [ ...attributes.pathParams ];
    },

    get httpResponses() {
      return [ ...attributes.httpResponses ];
    },

    addHttpBodyParam(field = {}) {
      return attributes.bodyParams = [ ...attributes.bodyParams, field ];
    },

    addHttpQueryParam(field = {}) {
      return attributes.queryParams = [ ...attributes.queryParams, field ];
    },

    addHttpPathParam(field = {}) {
      return attributes.pathParams = [ ...attributes.pathParams, field ];
    },

    addHttpResponse(field = {}) {
      return attributes.httpResponses = [ ...attributes.httpResponses, field ];
    }

  }
}

/*
	item          spec.PathItem
	op            *spec.Operation
	ID            string
	Type          OperationType
	Path          string
	HttpMethod    string
	Definition    *Definition
	BodyParams    Fields
	QueryParams   Fields
	PathParams    Fields
	HttpResponses HttpResponses

	ExampleConfig ExampleConfig
*/

module.exports = createOperation;
