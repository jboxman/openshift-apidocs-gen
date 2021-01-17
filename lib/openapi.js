const fs = require('fs');

const apiSpec = {};

function loadApiSpec(specFile = '') {
  let contents;

  if(Object.keys(apiSpec).length > 0)
    return Object.assign({}, apiSpec);

  if(! fs.existsSync(specFile)) {
    console.error(`Cannot open OpenAPI spec file: ${specFile}`);
    console.error(err.message);
    process.exit(1);
  }

  try {
    contents = fs.readFileSync(specFile);
  }
  catch(err) {
    console.error(`Cannot read OpenAPI spec file: ${specFile}`);
    console.error(err.message);
    process.exit(1);
  }

  try {
    Object.assign(apiSpec, JSON.parse(contents));
  }
  catch(err) {
    if(err instanceof SyntaxError) {
      console.error(err.message);
      process.exit(1);
    }
  }

  return Object.assign({}, apiSpec);
}

module.exports = loadApiSpec;
