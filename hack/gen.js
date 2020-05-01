#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const loadConfig = require('../lib/config');

const { compilePage, registerPartials } = require('../templates');

const helpers = require ('../templates/helpers');

const ROOT = path.join(__dirname, '..');
const BUILDDIR = path.join(ROOT, 'build');

const config = loadConfig({ specFile: process.argv[2] });

Handlebars.registerHelper('findDefinitionByKey', helpers.createFindDefinitionByKey(config));
Handlebars.registerHelper('flatPropertiesForTable', helpers.flatPropertiesForTable);
Handlebars.registerHelper('escapeMarkup', helpers.escapeMarkup);
//Handlebars.registerHelper('shorter', text => text && text.substring(0, 100));
// no-op
Handlebars.registerHelper('shorter', text => text);

async function main() {
  await registerPartials(Handlebars);

  if(! fs.existsSync(BUILDDIR)) {
    fs.mkdirSync(BUILDDIR);
  }

  const compiledTemplate = await compilePage(Handlebars);

  fs.writeFileSync(path.join(BUILDDIR, 'index.adoc'), compiledTemplate(config.resourceCategories));
}

main();
