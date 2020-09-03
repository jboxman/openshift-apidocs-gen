const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const loadConfig = require('../config');

const { compilePage, registerPartials } = require('../../templates');

const helpers = require ('../../templates/helpers');

const replaceWith = replacer => title => title
  .toLowerCase()
  .replace(/[\s\.]+/g, replacer);

/**
 * Sort a KGV by Kind, and then by Group, alphabetically in ascending order.
 * @func
 * @param {object} a - The {Kind,Group,Version} of an API
 * @param {string} a.kind
 * @param {string} a.group
 * @param {string} a.version
 * @param {object} b - The {Kind,Group,Version} of an API
 * @param {string} b.kind
 * @param {string} b.group
 * @param {string} b.version
 */
const sortByKind = (a, b) => {
  if(a.kind == b.kind)
    return a.group.localeCompare(b.group);

  return a.kind.localeCompare(b.kind);
};

const ROOT = path.join(__dirname, '../..');
const BUILDDIR = path.join(ROOT, 'build');

async function action(oapiSpecFile = 'openshift-openapi-spec-latest.json', cmd) {
  const configOptions = {
    specFile: oapiSpecFile
  };

  if(cmd.map)
    configOptions.resourceFile = cmd.map;

  const config = loadConfig(configOptions);

  for(const name in helpers) {
    if(/^create/.test(name)) {
      //Handlebars.registerHelper(, fn(config));
      continue;
    }

    Handlebars.registerHelper(name, helpers[name]);
  }

  Handlebars.registerHelper('findDefinitionByKey', helpers.createFindDefinitionByKey(config));
  Handlebars.registerHelper('gatherRelatedDefinitions', helpers.createGatherRelatedDefinitions(config));
  Handlebars.registerHelper('linkToObject', helpers.createLinkToObject(config));
  Handlebars.registerHelper('linkToResource', helpers.createLinkToResource(config));

  await registerPartials(Handlebars);

  const resourceTemplate = await compilePage(Handlebars, 'resource');
  const resourceGroupTemplate = await compilePage(Handlebars, 'resource-group');

  if(! fs.existsSync(BUILDDIR)) {
    fs.mkdirSync(BUILDDIR);
  }

  const resourceIndex = [];
  for(const { name, resources } of config.resourceCategories) {
    let basename = replaceWith('-')(name);
    let resourceGroupDir = path.join(BUILDDIR, replaceWith('_')(name));
    let indexPath = path.join(resourceGroupDir, `${basename}-index.adoc`);

    if(! fs.existsSync(resourceGroupDir)) {
      fs.mkdirSync(resourceGroupDir);
    }

    for(const resource of resources) {
      resourceIndex.push({ kind: resource.kind, group: resource.group, version: resource.version });
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

  const indexTemplate = await compilePage(Handlebars);
  fs.writeFileSync(path.join(BUILDDIR, 'index.adoc'), indexTemplate(resourceIndex.sort(sortByKind)));

/*
  config.seenDefs.push( ...blah.reduce((accum, o) => {
    if(!config.seenDefs.find(({ kind, group, version }) => o.kind == kind && o.group == group && o.version == version))
      accum.push({ kind: o.kind, group: o.group, version: o.version });
    return accum;
  }, []));
  */

  const rd = helpers.createGatherRelatedDefinitions(config);
  const used = [];

  // TODO - use resources to avoid older versions of definitions
  const allResources = config.resourceCategories.reduce((accum, item) => {
    accum.push(...item.resources);
    return accum;
  }, []);

  for(const { definition, operations } of allResources) {

    const blah = operations.reduce((accum, operation) => {
      const defs = operation.defs();

      if(defs.length > 0) {
        defs.forEach(v => {
          const def = config.definitions.getByVersionKind(v);

          if(!def)
            console.log(v);

          if(def && def.isResource)
            return;

          if(!accum.find(({ kind, group, version }) => v.kind == kind && v.group == group && v.version == version))
            accum.push({ kind: v.kind, group: v.group, version: v.version });
        });

      }

      return accum;
    }, []);

    used.push( ...blah.reduce((accum, o) => {
      if(!used.find(({ kind, group, version }) => o.kind == kind && o.group == group && o.version == version))
        accum.push({ kind: o.kind, group: o.group, version: o.version });
      return accum;
    }, []));

    if(definition.relatedDefinitions.length > 0) {
      used.push(
        ...rd(definition.relatedDefinitions).reduce((accum, o) => {
          if(!used.find(({ kind, group, version }) => o.kind == kind && o.group == group && o.version == version))
            accum.push({ kind: o.kind, group: o.group, version: o.version });

          return accum;
        }, [])
      );
    }
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
  fs.writeFileSync(path.join(objectsDir, 'index.adoc'), objectsTemplate(objects.sort(sortByKind)));
}

module.exports = action;
