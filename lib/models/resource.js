function createResource({
  kind = '',
  version = '',
  group = '',
  plural = '',
  namespaced = ''
} = {}) {
  const attributes = {
    kind,
    version,
    group,
    plural,
    namespaced,
    definition: null,
    endpoints: [],
    operations: []
  };

  return {
    ...attributes
  };
}

module.exports = createResource;
