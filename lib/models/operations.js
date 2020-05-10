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

module.exports = {
  createOperationCategory,
  createOperationCollection
}
