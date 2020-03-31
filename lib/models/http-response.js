module.exports = function createHttpResponse(attrs) {
  const attributes = {
    code: null,
    //name: null,
    type: null,
    description: null,
    definition: null
  };

  return Object.assign({}, attributes, attrs);
}
