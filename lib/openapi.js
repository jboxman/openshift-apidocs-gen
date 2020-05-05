const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const apiSpec = {};

function loadApiSpec(specFile = '') {
  if(Object.keys(apiSpec).length > 0)
    return Object.assign({}, apiSpec);

  if(! fs.existsSync(specFile)) {
    // Allow a path relative to ROOT
    specFile = path.join(ROOT, specFile);
    if(! fs.existsSync(specFile)) {
      console.error(`Cannot open OpenAPI spec file: ${specFile}`);
      process.exit(1);
    }
  }

  const contents = fs.readFileSync(specFile);
  try {
    Object.assign(apiSpec, JSON.parse(contents));
  }
  catch(err) {
    if(err instanceof SyntaxError) {
      console.log(err.message);
      process.exit(1);
    }
  }

  return Object.assign({}, apiSpec);
}

module.exports = loadApiSpec;
