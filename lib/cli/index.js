const program = require('commander');

const buildAction = require('./build-action.js');

//const { prepareConfig } = require('./lib/config');

module.exports = function() {

program
  .command('build [oapiSpecFile]')
  .description('Build')
  .option('--resources <resources.yaml>', 'YAML describing resource groups and resources to include')
  .action(buildAction);

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
