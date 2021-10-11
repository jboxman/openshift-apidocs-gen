const fs = require('fs');
const path = require('path');
const dir = require('node-dir');
const fl = require('firstline');
const Handlebars = require('handlebars');
const createConfig = require('../config');

const { compilePage, registerPartials } = require('../../templates');

const { replaceWith } = require('../util');
const helpers = require ('../../templates/helpers');

const sortByKind = (a, b) => {
  if(a.kind == b.kind)
    return a.group.localeCompare(b.group);

  return a.kind.localeCompare(b.kind);
};

// Resolve the output dir
const getOutputDir = (outputDir) => {
  if(/^(\/)/.test(outputDir)) {
    return path.resolve(outputDir);
  }
  return path.join(process.cwd(), outputDir);
};

async function action(oapiSpecFile, cmd) {
  const configOptions = {
    oapiSpecFile
  };

  if(cmd.config)
    configOptions.configFile = cmd.config;

  delete cmd.config;

  // `cmd` includes all the props for a cmd action object
  const fromCli = (cliOptions = {}) => {
    return ['outputDir'].reduce((accum, key) => {
      if(cliOptions.hasOwnProperty(key))
        return accum = { ...accum, [key]: cliOptions[key] }
      return accum;
    }, {});
  };

  Object.assign(configOptions, {
    configOverride: {
      ...fromCli(cmd)
    }
  });

  const config = createConfig(configOptions);
  config.initialize();
  config.finalize();
  const { definitions, outputDir, resourceCategories } = config.getConfig();

  for(const name in helpers) {
    // register CreateFunctionName as functionName bound to config
    if(/^create/.test(name)) {
      const fnName = name.replace(/^create/, '');
      const fullFnName = `${fnName.slice(0,1).toLocaleLowerCase()}${fnName.slice(1)}`;
      Handlebars.registerHelper(fullFnName, helpers[name](config.getConfig()));
      continue;
    }

    Handlebars.registerHelper(name, helpers[name]);
  }

  await registerPartials(Handlebars);

  const resourceTemplate = await compilePage(Handlebars, 'resource');
  const resourceGroupTemplate = await compilePage(Handlebars, 'resource-group');

  if(! fs.existsSync(getOutputDir(outputDir))) {
    fs.mkdirSync(getOutputDir(outputDir));
  }

  // Find any existing files
  for(const file of await dir.promiseFiles(getOutputDir(outputDir))) {
    if(/\.adoc$/.test(file)) {
      const line = await fl(file);
      // Cleanup any existing files
      // Because the list of APIs might change, it cannot be relied upon
      if(/Automatically\s+generated/.test(line)) {
        try {
          fs.unlinkSync(file);
        }
        catch(e) {
          console.error(`Failed to remove: ${file}`);
          process.exit(1);
        }  
      }
    }
  }

  const resourceIndex = [];
  for(const { name, resources } of resourceCategories) {
    let basename = replaceWith('-')(name);
    let resourceGroupDir = path.join(getOutputDir(outputDir), replaceWith('_')(name));
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
  fs.writeFileSync(path.join(getOutputDir(outputDir), 'index.adoc'), indexTemplate(resourceIndex.sort(sortByKind)));

  const used = [];

  const allResources = resourceCategories.reduce((accum, item) => {
    accum.push(...item.resources);
    return accum;
  }, []);

  for(const { definition, operations } of allResources) {

    const gatherRelatedSchemas = function fn(relatedSchemas, used) {
      relatedSchemas.reduce((accum, schemaId) => {
        const fromSchemaId = definitions.getBySchemaId(schemaId);

        if(fromSchemaId) {
          if(!accum.find(v => v == schemaId)) accum.push(schemaId);
        }

        return accum;
      }, used);
    }

    operations.reduce((accum, operation) => {
      const { relatedSchemas } = operation;

      relatedSchemas.forEach(schemaId => {
        const def = definitions.getBySchemaId(schemaId);
        if(def && def.isResource) return;
        if(!accum.find(v => v == schemaId)) accum.push(schemaId);
      });

      //gatherRelatedSchemas(relatedSchemas, accum);

      return accum;
    }, used);

    gatherRelatedSchemas(definition.relatedSchemas, used);
  }

  const objectsDir = path.join(getOutputDir(outputDir), 'objects');
  if(! fs.existsSync(objectsDir)) {
    fs.mkdirSync(objectsDir);
  }

  const objectsTemplate = await compilePage(Handlebars, 'objects');
  fs.writeFileSync(path.join(objectsDir, 'index.adoc'), objectsTemplate(used.sort((a,b) => a.localeCompare(b))));
}

module.exports = action;
