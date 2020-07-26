const program = require('commander');

// Define the CLI for working with the OpenShift OpenAPI spec

const buildAction = require('./build-action');
const createTopicMap = require('./create-topic-map');
const createChangelogAction = require('./create-changelog');

//const { prepareConfig } = require('./lib/config');

module.exports = function() {

  program
    .command('build [oapiSpecFile]')
    .description('Build')
    .option('--resources <resources>', 'A YAML file describing resources and resource groups')
    .action(buildAction);

  program
    .command('topic-map [resource_map]')
    .description('Output YAML to stdout suitable for inclusion in an AsciiBinder _topic_map.yml file')
    .action(createTopicMap);

  program
    .command('changelog [oapiSpecFile]')
    .description('Changelog')
    .option('--resources [resources]', 'A YAML file describing resources and resource groups')
    .option('--api-resources [api_resources]', 'A text file with the output from `oc api-resources`')
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
