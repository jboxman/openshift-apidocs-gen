const program = require('commander');

// Define the CLI for working with the OpenShift OpenAPI spec

const buildAction = require('./build');
const createTopicMapAction = require('./create-topic-map');
const createChangelogAction = require('./create-changelog');
const verifyPackageRulesAction = require('./verify-package-rules');
const createResourcesAction = require('./create-resources');

module.exports = function() {

  program
    .command('build <oapiSpecFile>')
    .description('Build the Asciidoc source for the OpenShift API reference documentation')
    .option('--config <file>.yaml', 'A YAML file describing the build config')
    .option('--output-dir <dir>', 'Output dir for the Asciidoc files')
    .action(buildAction);

  program
    .command('topic-map')
    .description('Output YAML to stdout suitable for inclusion in an AsciiBinder _topic_map.yml file')
    .option('-c,--config <file>.yaml', 'A YAML file describing the build config')
    .action(createTopicMapAction);

  program
    .command('changelog')
    .description('Output a changelog to stdout for a specified resource map')
    .option('--config <file>.yaml', 'A YAML file describing the build config')
    .option('--apis <apis>', 'A text file with the output from `oc api-resources`')
    .action(createChangelogAction);

  program
    .command('verify-rules [oapiSpecFile]')
    .description('Output a list of API resources in an OpenShift OpenAPI spec file')
    .option('-q, --quiet', 'Output only unmatched packages')
    .action(verifyPackageRulesAction);

    program
    .command('create-resources <apiResources>')
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
