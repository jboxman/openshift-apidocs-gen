const fs = require('fs');
const yaml = require('js-yaml');
const { loadYamlConfig, replaceWith } = require('../util');

/*
Name: OpenShift REST APIs
Dir: rest_api
Topics:
- Name: API endpoints
  File: index
*/

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

/**
 * CLI action
 * @param {object} cmd
 */
function action(cmd) {
  const { config: configFile } = cmd;
  const currentResources = [];

  if(!fs.existsSync(configFile))
    process.exit(1);

  const configFileData = loadYamlConfig(configFile);
  if(configFileData.hasOwnProperty('version')) {
    currentResources.push(...configFileData.apiMap);
  }
  else {
    currentResources.push(...configFileData);
  }

  for(const { name, resources } of currentResources) {
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
