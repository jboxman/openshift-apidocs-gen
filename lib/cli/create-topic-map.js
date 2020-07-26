const fs = require('fs');
const yaml = require('js-yaml');

const replaceWith = replacer => title => title
  .toLowerCase()
  .replace(/[\s\.]+/g, replacer);

/*
Name: OpenShift REST APIs
Dir: rest_api
Topics:
- Name: API endpoints
  File: index
*/

/**
 * CLI action
 * @param {object} resourceMap - YAML
 */
function action(resourceMap) {
  let data;

  const yamlObj = {
    Name: 'API reference',
    Dir: 'rest_api',
    Topics: [{
      Name: 'API list',
      File: 'index',
    },
    {
      Name: 'Common object reference',
      Dir: 'objects',
      Topics: [{
        Name: 'Index',
        File: `index`
      }]
    }]
  };

  if(!fs.existsSync(resourceMap))
    process.exit(1);

  try {
    data = yaml.safeLoad(fs.readFileSync(resourceMap, { encoding: 'utf8' }));
  }
  catch(e) {}

  for(const { name, resources } of data) {
    let topics = [];

    topics.push({
        Name: `About ${name}`,
        File: replaceWith('-')([ name, 'index' ].join(' '))
    });

    for(const { kind, version, group } of resources) {
      topics.push({
        Name: `${kind} [${group}/${version}]`,
        File: replaceWith('-')([ kind, group, version ].join(' '))
      });
    }

    yamlObj['Topics'].push({
      Name: name,
      Dir: replaceWith('_')(name),
      Topics: topics
    });
  }

  console.log(yaml.safeDump(yamlObj, { noArrayIndent: true }));
}

module.exports = action;
