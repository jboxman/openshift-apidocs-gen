const util = require('../util');
const loadApiSpec = require('../openapi');

// With each new OpenShift release, new package namespaces may
// be added.

/**
 * CLI action
 * @param {object} oapiSpecFile - OpenAPI spec
 */
function action(oapiSpecFile, { quiet = false } = {}) {

  const spec = loadApiSpec(oapiSpecFile);

  for(const key in spec['definitions']) {
    const { group, version, kind } = util.guessGroupVersionKind(key);
    // io.k8s.apimachinery.pkg.* are internal k8s definitions
    if(!quiet && kind && group && version) {
      console.log(`${group}/${version} ${kind}`);
    }
    if(!group)
      console.log(`Add new rule for definition: "${key}"`);
  }
}

module.exports = action;
