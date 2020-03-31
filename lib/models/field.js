// An API struct field

function createField(attrs) {
  const attributes = {
    name: null,
    type: null,
    description: null,
    definition: null,
    patchStrategy: null,
    patchMergeKey: null
  };

  Object.assign(attributes, attrs);

  return {
    set type(v) {
      return attributes.type = v;
    },

    set definition(v) {
      return attributes.definition = v;
    },

    get name() {
      return attributes.name;
    },

    get type() {
      return attributes.type;
    },

    // Only query parameters include this field
    get description() {
      return attributes.description;
    }
  };
}

module.exports = createField;

/*
	Name                    string
	Type                    string
	Description             string
	DescriptionWithEntities string

	Definition *Definition // Optional Definition for complex types

	PatchStrategy string
	PatchMergeKey string
*/
