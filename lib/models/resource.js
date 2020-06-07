function createResource({ name, version, group } = {}) {
  const attributes = {
    name,
    version,
    group,

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
