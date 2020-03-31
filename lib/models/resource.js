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

/*
	// Name is the display name of this Resource
	Name    string `yaml:",omitempty"`
	Version string `yaml:",omitempty"`
	Group   string `yaml:",omitempty"`

	// InlineDefinition is a list of definitions to show along side this resource when displaying it
	InlineDefinition []string `yaml:inline_definition",omitempty"`
	// DescriptionWarning is a warning message to show along side this resource when displaying it
	DescriptionWarning string `yaml:"description_warning,omitempty"`
	// DescriptionNote is a note message to show along side this resource when displaying it
	DescriptionNote string `yaml:"description_note,omitempty"`
	// ConceptGuide is a link to the concept guide for this resource if it exists
	ConceptGuide string `yaml:"concept_guide,omitempty"`
	// RelatedTasks is as list of tasks related to this concept
	RelatedTasks []string `yaml:"related_tasks,omitempty"`
	// IncludeDescription is the path to an md file to incline into the description
	IncludeDescription string `yaml:"include_description,omitempty"`
	// LinkToMd is the relative path to the md file containing the contents that clicking on this should link to
	LinkToMd string `yaml:"link_to_md,omitempty"`

	// Definition of the object
	Definition *Definition
*/

module.exports = createResource;
