#!/usr/bin/env node

const program = require('commander');

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

program
  .arguments('<RESOURCE_FILE>')
  .description('Output YAML to stdout suitable for ascii_binder `_topic_map.yaml`')
  .action(main);

async function main(resourceFile) {
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

  if(!fs.existsSync(resourceFile))
    process.exit(1);

  try {
    data = yaml.safeLoad(fs.readFileSync(resourceFile));
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

program.parseAsync(process.argv);
