const program = require('commander');

// Define the CLI for working with the OpenShift OpenAPI spec

const buildAction = require('./build-action');
const createTopicMap = require('./create-topic-map');
const createChangelogAction = require('./create-changelog');

//const { prepareConfig } = require('./lib/config');

module.exports = function() {

  program
    .command('build [oapiSpecFile]')
    .description('Build the Asciidoc source for the OpenShift API reference documentation')
    .option('--map <resource_map>', 'A YAML file describing API resources')
    .action(buildAction);

  program
    .command('topic-map [resource_map]')
    .description('Output YAML to stdout suitable for inclusion in an AsciiBinder _topic_map.yml file')
    .action(createTopicMap);

  program
    .command('changelog [oapiSpecFile]')
    .description('Output a changelog to stdout for a specified resource map')
    .option('--map [resource_map]', 'A YAML file describing API resources')
    .option('--apis [apis]', 'A text file with the output from `oc api-resources`')
    .action(createChangelogAction);

  return {
    start(...args) {
      if(args.length > 0) {
        return program.parseAsync(...args);
      }
      else {
        return program.parseAsync(process.argv);
      }
    }
  }
}
