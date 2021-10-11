const createConfig = require('../config');
//const { loadApiSpec, parseApiSpec } = require('../openapi');

async function action(oapiSpecFile, cmd) {
  const { config: configFile } = cmd;

  const config = createConfig({ configFile, oapiSpecFile });
  config.initialize();
  config.finalize();
  const { definitions } = config.getConfig();
  const { resourceCategories: currentResources } = config.getConfig();

  const allResources = currentResources.reduce((accum, item) => {
    accum.push(...item.resources);
    return accum;
  }, []);

  const found = [];
  const dropped = [];
  const versionDelta = [];

  for(const { kind, group, version } of allResources) {
    const match = definitions.getByVersionKind({ kind, group, version });
    if(match) {
      if(match.version != version) {
        versionDelta.push({ kind, group, oldVersion: version, newVersion: match.version });
      }
      else {
        found.push({ kind, group, version });
      }
    }
    else {
      dropped.push({ kind, group, version });
    }
  }

  // TODO -
  // This needs to match on the latest API version only.
  const added = [];
  for(const v of Object.values(definitions.all())) {
    if(!v.isResource) continue;
    if(found.find(m => m.group == v.group && m.kind == v.kind && m.version == v.version))
      continue;

    if(versionDelta.find(m => m.group == v.group && m.kind == v.kind))
      continue;

    // No new 'extensions' will ever be added to k8s
    if(v.group == 'extensions')
      continue;

      added.push(v);
  }

  if(versionDelta.length > 0) {
    console.log('\nAPI version changes\n');
    versionDelta.forEach(({ kind, group, oldVersion, newVersion }) => {
      console.log(`- ${kind} [${group}]: ${oldVersion} => ${newVersion}`);
    });
  }

  if(added.length > 0) {
    console.log('\nAPIs added\n');
    added.forEach(({ kind, group, version }) => {
      console.log(`- ${kind} [${group}/${version}]`);
    });
  }

  if(dropped.length > 0) {
    console.log('\nAPIs dropped\n');
    dropped.forEach(({ kind, group, version }) => {
      console.log(`- ${kind} [${group}/${version}]`);
    });
  }
}

module.exports = action;
