#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const loadConfig = require('../lib/config');

const { assemblyTemplate } = require('../templates');

const {
  escapeMarkup,
  flatPropertiesForTable
} = require ('../templates/helpers');

const ROOT = path.join(__dirname, '..');
const BUILDDIR = path.join(ROOT, 'build');

const config = loadConfig({ specFile: process.argv[2] });

const resolveDefinition = config => key => {
  switch (typeof(key)) {
    case 'string':
        return config.definitions.all()[key];
      break;

    case 'object':
        return config.definitions.getByVersionKind(key);
      break;

    default:
       return {};
      break;
  }
};

const descendDependsOn = key => {
  let dependsOn = [];
  const keys = resolveDefinition(config)(key).dependsOn;

  if(keys.length <= 0) {
    return dependsOn;
  }

  for(const id of keys) {
    // Avoid blowing up the stack on shallow circular references
    if(id != key)
      dependsOn = [ id, ...descendDependsOn(id), ...dependsOn ];
  }

  return dependsOn.filter((v, idx, ary) => ary.indexOf(v) == idx);
};

Handlebars.registerHelper('noop', () => []);
Handlebars.registerHelper('findDefinitionByKey', resolveDefinition(config));
Handlebars.registerHelper('descendDependsOn', descendDependsOn);
Handlebars.registerHelper('withoutInline', (array, exclude) => array.filter(v => !exclude.includes(v)));
Handlebars.registerHelper('flatPropertiesForTable', flatPropertiesForTable);
Handlebars.registerHelper('escapeMarkup', escapeMarkup);
//Handlebars.registerHelper('shorter', text => text && text.substring(0, 100));
// no-op
Handlebars.registerHelper('shorter', text => text);

if(! fs.existsSync(BUILDDIR)) {
  fs.mkdirSync(BUILDDIR);
}

fs.writeFileSync(path.join(BUILDDIR, 'index.adoc'), assemblyTemplate(config.resourceCategories));
