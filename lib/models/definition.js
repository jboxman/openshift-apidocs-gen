const { patchMergeKeyKey, patchStrategyKey } = require('../constants');
const { titleize, guessGroupVersionKind } = require('../util');

function createDefinition(attrs = {}) {
  let isInitialized = false;

  const attributes = {
    specId: null,
    name: null,

    group: null,
    version: null,
    kind: null,

    showGroup: true,
    description: null,
    groupFullName: null,

    // Operation categories and associated operations
    operationCategories: [],
    operations: [], // not in original type

    flatProperties: {},
    relatedProperties: [],
    propertiesByPath: [],

    fields: [],

    sampleConfig: null,
    fullName: null,
    resource: null,
    schema: null
  };

  Object.assign(attributes, attrs);

  //function appendToOperationCategories(oc) {
    //console.log(`Appending opCats: ${Object.keys(oc)}`);
  //  return attributes.operationCategories = [...attributes.operationCategories, oc];
  //}

  return {
    initialize() { // no-op
      return isInitialized = true;
    },

    key() {
      const { group, version, kind } = attributes;
      return [group, version, kind].join('.');
    },

    // TODO - template wants a property, but key() used above
    get key2() {
      return this.key();
    },

    get specId() {
      return attributes.specId;
    },

    get name() {
      return attributes.name;
    },

    get group() {
      return attributes.group;
    },

    get version() {
      return attributes.version;
    },

    get kind() {
      return attributes.kind;
    },

    get description() {
      return attributes.description;
    },

    get flatProperties() {
      return { ...attributes.flatProperties };
    },

    get relatedProperties() {
      return [ ...attributes.relatedProperties ];
    },

    get fields() {
      return [ ...attributes.fields ];
    },

    get appearsIn() {
      return [ ...attributes.appearsIn ];
    },

    get inlineDefs() {
      return [ ...attributes.inlineDefs ];
    },

    get dependsOn() {
      return [ ...attributes.dependsOn ];
    },

    get operationCategories() {
      return [ ...attributes.operationCategories ];
    },

    // This hardcodes some peculiarities of operationId mapping.
    get operationGroupName() {
      // Special case in k8s
      if(attributes.group.toLowerCase() == 'rbac') {
        return 'RbacAuthorization';
      }
      // Must return bare word for core k8s APIs
      if(/io\.k8s\.api\.core/.test(attributes.group)) {
        return 'Core';
      }
      // Some k8s APIs
      else if(/io\.k8s\.api/) {
        return titleize(attributes.group.split('.')[0]);
      }

      return attributes.group;
    },

    setOtherVersions(versions = []) {
      return attributes.otherVersions = versions;
    },

    appendToAppearsIn(definition = '') {
      attributes.foundInField = true;

      return attributes.appearsIn.includes(definition) ?
        [ ...attributes.appearsIn ] :
        attributes.appearsIn = attributes.appearsIn.concat(definition);
    },

    appendToAppearsInline(definition = '') {
      return attributes.inlineDefs.includes(definition) ?
        [ ...attributes.inlineDefs ] :
        attributes.inlineDefs = attributes.inlineDefs.concat(definition);
    },

    appendToDependsOn (definition = '') {
      return attributes.dependsOn.includes(definition) ?
        [ ...attributes.dependsOn ] :
        attributes.dependsOn = attributes.dependsOn.concat(definition);
    },

    appendToOperationCategories(category) {
      return attributes.operationCategories = [ ...attributes.operationCategories, category ];
    },

    appendToOperations(operation) {
      //console.log(`Appending: ${operation.key()}`);
      return attributes.operations = [ ...attributes.operations, operation ];
    },

    set isInlined(bool = false) {
      attributes.isInlined = !!bool;
    },

    set foundInField(bool = false) {
      attributes.foundInField = !!bool;
    },

    set inToc(bool = false) {
      attributes.inToc = !!bool;
    },

    // TODO - define field type
    addField(field) {
      attributes.fields.push(field);
    },

    getSchema() {
      return Object.assign({}, attributes.schema);
    },

    // Only return useful attributes
    _attributes() {
      const attrs = Object.assign({}, attributes);
      delete attrs.schema;
      return attrs;
    }

  }
}

module.exports = createDefinition;
