#!/usr/bin/env node

const program = require('commander');

const loadConfig = require('../lib/config');
const { getApiSupportLevel } = require('../lib/util');

program
  .arguments('<openApiSpec>')
  .description('Return the API support level for each API')
  .option('--config <file>.yaml', 'A YAML file describing the build config')
  //.option('-q, --quiet', 'Output only APIs without a support level')
  .action(main);

function main(oapiSpecFile, cmd = {}) {
  const config = loadConfig({
    oapiSpecFile,
    configFile: cmd.config
  });

  const apiGroups = config.resourceCategories.reduce((accum, entry) => {
    const { resources } = entry;
    const supportLevels = resources.map(function(resource) {
      const { group, version } = resource;
      return {
        group,
        version,
        level: getApiSupportLevel(config.apiSupportLevels, { group, version })
      }
    });

    // TODO - only removes possible local of duplication, not global
    const uniq = supportLevels.reduce((accum, obj) => {
      if(!accum.find(v => v.group == obj.group)) {
        accum.push(obj);
      }

      return accum;
    }, []);

    accum.push(...uniq);

    return accum;
  }, []);

  for(const { group, version, level } of apiGroups) {
    if(!level) {
      console.log(`API support level not defined: ${group}/${version}`);
    }
  }
}

program.parse(process.argv);
