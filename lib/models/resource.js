// A user can perform an operation on a resource with the API

function createResource({ name, version, group } = {}) {
  const attributes = {
    name,
    version,
    group,
    inlineDefinitions: [], // unused
    descWarning: null,
    descNote: null,
    conceptGuide: null,
    relatedTasks: [],
    includeDesc: null,
    linkTo: null,
    definition: null
  };

  return {
    ...attributes
  };
}

module.exports = createResource;
