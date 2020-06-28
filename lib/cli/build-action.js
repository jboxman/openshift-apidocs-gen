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
  Handlebars.registerHelper('linkToObject', helpers.createLinkToObject(config));
  Handlebars.registerHelper('flatPropertiesForTable', helpers.flatPropertiesForTable);
  Handlebars.registerHelper('flatPropertiesSliceForTable', helpers.flatPropertiesSliceForTable);
  Handlebars.registerHelper('hasChildren', helpers.hasChildren);
  Handlebars.registerHelper('truncatePath', helpers.truncatePath);
  Handlebars.registerHelper('isComplex', helpers.isComplex);
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

  for(const { name, resources } of config.resourceCategories) {
    let basename = replaceWith('-')(name);
    let resourceGroupDir = path.join(BUILDDIR, replaceWith('_')(name));
    let indexPath = path.join(resourceGroupDir, `${basename}-index.adoc`);

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

    fs.writeFileSync(indexPath, resourceGroupTemplate({
      name,
      resources,
      basename
    }));
  }

  const rd = helpers.createGatherRelatedDefinitions(config);
  const used = [];
  // TODO - use resources to avoid older versions of definitions
  for(const [ , definition ] of Object.entries(config.definitions.all())) {
    if(!definition.isResource)
      continue;

    if(definition.relatedDefinitions.length > 0)
      used.push(...new Set([ ...used, ...rd(definition.relatedDefinitions) ]));
  }

  //const adocPaths = [];
  const objects = [];
  for(const [ , definition ] of Object.entries(config.definitions.all())) {
    const { kind, group, version } = definition;
    if(!used.find(gvk => (kind == gvk.kind && group == gvk.group && version == gvk.version)))
      continue;

    // TODO - resource can define its own id internally
    let id = replaceWith('-')([ kind, group, version ].join(' '));

    objects.push({
      id,
      kind,
      group,
      version
    });
    //let id = replaceWith('-')([ definition.kind, definition.group, definition.version ].join(' '));
    //let adocPath = path.join(BUILDDIR, `${id}.adoc`);
    //adocPaths.push(adocPath);

    // TODO - create new template for this
    /*
    fs.writeFileSync(adocPath, resourceTemplate({
      id,
      resource: {
        kind: definition.kind,
        group: definition.group,
        version: definition.version,
        definition
      }
    }));
    */
  }

  const objectsDir = path.join(BUILDDIR, 'objects');
  if(! fs.existsSync(objectsDir)) {
    fs.mkdirSync(objectsDir);
  }

  const objectsTemplate = await compilePage(Handlebars, 'objects');
  fs.writeFileSync(path.join(objectsDir, 'index.adoc'), objectsTemplate(objects));

  //const indexTemplate = await compilePage(Handlebars);
  //fs.writeFileSync(path.join(BUILDDIR, 'index.adoc'), indexTemplate(adocPaths));
}

module.exports = action;
