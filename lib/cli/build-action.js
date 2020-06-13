const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const loadConfig = require('../config');

const { compilePage, registerPartials } = require('../../templates');

const helpers = require ('../../templates/helpers');

const replaceWith = replacer => title => title
  .toLowerCase()
  .replace(/[\s\.]+/g, replacer);

const ROOT = path.join(__dirname, '../..');
const BUILDDIR = path.join(ROOT, 'build');

async function action(oapiSpecFile = 'openshift-openapi-spec-latest.json', cmd) {
  const configOptions = {
    specFile: oapiSpecFile
  };

  if(cmd.resources)
    configOptions.resourceFile = cmd.resources;

  const config = loadConfig(configOptions);

  Handlebars.registerHelper('findDefinitionByKey', helpers.createFindDefinitionByKey(config));
  Handlebars.registerHelper('gatherRelatedDefinitions', helpers.createGatherRelatedDefinitions(config));
  Handlebars.registerHelper('flatPropertiesForTable', helpers.flatPropertiesForTable);
  Handlebars.registerHelper('flatPropertiesSliceForTable', helpers.flatPropertiesSliceForTable);
  Handlebars.registerHelper('hasChildren', helpers.hasChildren);
  Handlebars.registerHelper('truncatePath', helpers.truncatePath);
  Handlebars.registerHelper('isRoot', helpers.isRoot);
  Handlebars.registerHelper('getRoot', helpers.getRoot);
  Handlebars.registerHelper('escapeMarkup', helpers.escapeMarkup);
  //Handlebars.registerHelper('shorter', text => text && text.substring(0, 100));
  // no-op
  Handlebars.registerHelper('shorter', text => text);

  await registerPartials(Handlebars);

  const resourceTemplate = await compilePage(Handlebars, 'resource');
  const resourceGroupTemplate = await compilePage(Handlebars, 'resource-group');

  if(! fs.existsSync(BUILDDIR)) {
    fs.mkdirSync(BUILDDIR);
  }

  const aDocPaths = [];
  for(const { name, resources } of config.resourceCategories) {
    let basename = replaceWith('-')(name);
    let resourceGroupDir = path.join(BUILDDIR, replaceWith('_')(name));

    let adocPath = path.join(BUILDDIR, `${basename}.adoc`);
    aDocPaths.push(adocPath);

    if(! fs.existsSync(resourceGroupDir)) {
      fs.mkdirSync(resourceGroupDir);
    }

    for(const resource of resources) {
      let id = replaceWith('-')([ resource.kind, resource.group, resource.version ].join(' '));
      let resourceFilePath = path.join(resourceGroupDir, `${id}.adoc`);
      fs.writeFileSync(resourceFilePath, resourceTemplate({
        id,
        resource
      }));
    }

    fs.writeFileSync(adocPath, resourceGroupTemplate({
      name,
      resources,
      basename
    }));
  }

  //const indexTemplate = await compilePage(Handlebars);
  //fs.writeFileSync(path.join(BUILDDIR, 'index.adoc'), indexTemplate(aDocPaths));
}

module.exports = action;
