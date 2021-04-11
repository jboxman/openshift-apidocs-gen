#!/usr/bin/env node

const program = require('commander');
const Handlebars = require('handlebars');

const loadConfig = require('../lib/config');
const loadApiSpec = require('../lib/openapi');
const { getKindGroupVersion } = require('../lib/util');
const {
  flattenProps,
  getPropertiesByPath
} = require('../lib/properties');

// load config
// load spec
// create definition, again, for single API only
// filter flatProps as necessary
// render template(s) with data

program
  .arguments('<oapi_file>')
  .description('Output a API fields in markup for a tabular format')
  .requiredOption('-c,--config <file>.yaml', 'A YAML file describing the build config')
  .requiredOption('--api <api>', 'An API specified as: <api_kind>.<api_group>/<version>')
  .action(main);

const parseApi = api => {
  const [ version, parts ] = api.split('/').reverse();
  const kindGroup = parts.split('.');
  const kind = kindGroup.shift();
  const group = kindGroup.join('.');
  return { kind, group, version };
};

function main(oapiSpecFile, cmd = {}) {
  const kgv = parseApi(cmd.api);
  const openApiSpec = loadApiSpec(oapiSpecFile);

  const config = loadConfig({
    oapiSpecFile,
    configFile: cmd.config
  });

  const template = Handlebars.compile(`
[cols="1,1,1",options="header"]
|===

|===
`);

  // TODO - can use packageMap reversed plus Kind and Version for direct lookup
  let definition;
  for(const [ packageName, schema ] of Object.entries(openApiSpec['definitions'])) {
    const packageKind = packageName.split('.').reverse().shift();
    if(!packageKind == kgv.kind) continue;
    const { kind, group, version } = getKindGroupVersion(packageName, config.packageMap);
    if(kgv.kind == kind && kgv.group == group && kgv.version == version) {
      definition = schema;
      break;
    }
  }

  // allow for
  // --root
  // -- path spec (to include [] or {} if present)
  // Should it work if type is not object?
  // Should it allow a depth as well?
  // Optional --include-description, default yes

  const flatProps = flattenProps({
    data: definition,
    definitions: openApiSpec['definitions'],
    resolve: true,
    packageMap: config.packageMap
  });

  // TODO - do I need to implement a `depth` field for this?
  const myProps = getPropertiesByPath({ properties: flatProps, otherPaths: [], reqPath: '.spec'});
  console.log(Object.keys(flatProps).filter(p => p.split('.').length == 3));
  //console.log(myProps);
}

program.parse(process.argv);
