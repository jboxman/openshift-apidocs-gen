const createResource = require('./resource');

function createResourceCategory({ name, resources } = {}) {
  const attributes = {
    name,
    resources: [ ...initializeResources(resources) ]
  }

  return {
    ...attributes
  }
}

function initializeResources(resources = []) {
  return resources.reduce((accum, resource) => {

    accum.push(createResource(resource));
    return accum;
  }, []);
}

module.exports = {
  createResourceCategory
}
