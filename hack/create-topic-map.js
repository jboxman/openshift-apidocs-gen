#!/usr/bin/env node

const program = require('commander');

const fs = require('fs');
const path = require('path');
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

program
  .arguments('<RESOURCE_FILE>')
  .description('Output YAML to stdout suitable for ascii_binder `_topic_map.yaml`')
  .action(main);

async function main(resourceFile) {
  let data;

  const yamlObj = {
    Name: 'OpenShift REST APIs',
    Dir: 'rest_api',
    Topics: []
  };

  if(!fs.existsSync(resourceFile))
    process.exit(1);

  try {
    data = yaml.safeLoad(fs.readFileSync(resourceFile));
  }
  catch(e) {}

  for(const { name, resources } of data) {
    let topics = [];

    for(const { name, version, group } of resources) {
      topics.push({
        Name: `${name} [${group}/${version}]`,
        File: replaceWith('-')([ name, group, version ].join(' '))
      });
    }

    yamlObj['Topics'].push({
      Name: name,
      Dir: replaceWith('_')(name),
      Topics: topics
    });
  }

  console.log(yaml.safeDump(yamlObj));
}

program.parseAsync(process.argv);
