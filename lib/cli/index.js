const program = require('commander');

// Define the CLI for working with the OpenShift OpenAPI spec

const buildAction = require('./build');
const createTopicMapAction = require('./create-topic-map');
const createChangelogAction = require('./create-changelog');
const createResourcesAction = require('./create-resources');

module.exports = function() {

  program
    .command('build <oApiSpecFile>')
    .description('Build the AsciiDoc source for the OpenShift API reference documentation')
    .option('-c, --config <file>.yaml', 'A YAML file describing the build config')
    .option('-o, --output-dir <dir>', 'Output dir for the AsciiDoc files')
    .action(buildAction);

  program
    .command('topic-map')
    .description('Output YAML to stdout suitable for inclusion in an AsciiBinder _topic_map.yml file')
    .option('-c, --config <file>.yaml', 'A YAML file describing the build config')
    .action(createTopicMapAction);

  program
    .command('changelog <oApiSpecFile>')
    .description('Output a changelog to stdout for an `apiMap`')
    .option('-c, --config <file>.yaml', 'A YAML file describing the build config')
    .action(createChangelogAction);

  program
    .command('create-resources <oApiSpecFile>')
    .description('Output an `apiMap` array in YAML to stdout')
    .action(createResourcesAction);

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
