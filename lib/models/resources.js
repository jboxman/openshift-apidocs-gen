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

/*
// ResourceCategory defines a category of Concepts
type ResourceCategory struct {
	// Name is the display name of this group
	Name string `yaml:",omitempty"`
	// Include is the name of the _resource.md file to include in the index.html.md
	Include string `yaml:",omitempty"`
	// Resources are the collection of Resources in this group
	Resources Resources `yaml:",omitempty"`
	// LinkToMd is the relative path to the md file containing the contents that clicking on this should link to
	LinkToMd string `yaml:"link_to_md,omitempty"`
}
*/
