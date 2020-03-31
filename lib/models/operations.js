const createOperation = require('./operation');

function createOperationCollection() {
  const items = {};
  let isInitialized = false;

  function add(operation) {
    if(! operation.key) {
      operation = createOperation(operation);
    }

    items[operation.key()] = operation;
  }

  return {
    add,

    getByKey(key) {
      const item = items[key];
      return typeof item == 'undefined' ? null : item;
    },

    all() {
      return Object.assign({}, items);
    }
  }
}

function createOperationCategory(attrs) {
  const attributes = {
    name: null,
    isDefault: false,
    operationTypes: [],
    operations: []
  };

  return Object.assign({}, attributes, attrs);
}

/*
// OperationCategory defines a group of related operations
type OperationCategory struct {
	// Name is the display name of this group
	Name string `yaml:",omitempty"`
	// Operations are the collection of Operations in this group
	OperationTypes []OperationType `yaml:"operation_types,omitempty"`
	// Default is true if this is the default operation group for operations that do not match any other groups
	Default bool `yaml:",omitempty"`

	Operations []*Operation
}
*/

module.exports = {
  createOperationCategory,
  createOperationCollection
}
