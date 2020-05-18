// A user can perform an operation on a resource with the API

function createResource({ name, version, group } = {}) {
  const attributes = {
    name,
    version,
    group,

    flatSpec: {},
    description: null,
    type: null,
    definition: null

    //descWarning: null,
    //descNote: null,
    //relatedTasks: [],
    //includeDesc: null,
    //linkTo: null
  };

  return {
    ...attributes
  };
}

module.exports = createResource;
