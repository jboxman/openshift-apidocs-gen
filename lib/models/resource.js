function createResource({ kind, version, group } = {}) {
  const attributes = {
    kind,
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
