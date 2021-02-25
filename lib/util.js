const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const whoami = path.basename(process.argv[1] || '') || 'ocp-api-docgen';

const gvkRules =  yaml.safeLoad(fs.readFileSync(path.join(__dirname, '../config/gvk.yaml'), { encoding: 'utf8' }));

function getKindGroupVersion(packageName = '', packageMap = {}) {
  const packageParts = packageName.split(/\./);
  const kind = packageParts.slice(-1)[0];
  // Certain special packages do not have any version
  const version = /^v/.test(packageParts.slice(-2)[0]) ? packageParts.slice(-2)[0] : 'none';
  const packagePrefix = packageParts.slice(0, -2).join('.');

  if(packageMap[packagePrefix]) {
    return {
      group: packageMap[packagePrefix],
      version,
      kind
    };
  }

  console.log(`${packagePrefix} [${kind} ???/${version}] is not mapped to a group`);
  return {};
}

// Try to guess what the group, version, and kind is for a definition
// based on its name
function guessGroupVersionKind(name) {
  var match;
  const gvkRulesCopy = [ ...gvkRules ];
  let group = '',
    version = '',
    kind = '';

  if(group && version && kind)
    return { group, version, kind };

  // Use rules defined in gvk.yaml
  while(match = gvkRulesCopy.shift()) {

    // Support granular matches
    if(! name.includes(match.rule))
      continue;

    const groupOverride = match['groupOverride'];
    const matchRe = RegExp(`^${match.match}$`);
    const matches = matchRe.exec(name);

    if(! matches)
      continue;

    const groups = matches.groups;

    ({ group, version, kind } = groups);

    if(groupOverride)
      group = groupOverride.replace('<group>', group);

    // Rule matched successfully. Stop.
    if(group && version && kind) {
      // Very loud.
      //console.log(`Hit match rule (${match.rule}): ${group} ${version} ${kind}`);
      break;
    }

  };

  if(! (group && version && kind)) {
    console.log(`Fail: ${name}`);
    return {};
  }

  return {
    group,
    version,
    kind
  }
}

// TODO - rewrite using regexp
const buildApiPath = ({ plural = '', group = '', version = '' } = {}, namespaced = false) => {
  const paths = [];
  if(group == 'core') {
    if(namespaced) {
      paths.push(...[
          //`/api/${version}/watch/namespaces/{namespace}/${plural}`,
          //`/api/${version}/watch/namespaces/{namespace}/${plural}/{name}`,
          `/api/${version}/namespaces/{namespace}/${plural}`,
          `/api/${version}/namespaces/{namespace}/${plural}/{name}`,
          `/api/${version}/namespaces/{namespace}/${plural}/{name}/proxy/{path}`,
          `/api/${version}/namespaces/{namespace}/${plural}/{name}/status`,
          `/api/${version}/namespaces/{namespace}/${plural}/{name}/attach`,
          `/api/${version}/namespaces/{namespace}/${plural}/{name}/binding`,
          `/api/${version}/namespaces/{namespace}/${plural}/{name}/eviction`,
          `/api/${version}/namespaces/{namespace}/${plural}/{name}/exec`,
          `/api/${version}/namespaces/{namespace}/${plural}/{name}/log`,
          `/api/${version}/namespaces/{namespace}/${plural}/{name}/proxy`,
          `/api/${version}/namespaces/{namespace}/${plural}/{name}/portforward`,
          `/api/${version}/namespaces/{namespace}/${plural}/{name}/scale`,
          `/api/${version}/namespaces/{namespace}/${plural}/{name}/token`,
        ]);
    }

    return paths.concat([
        //`/api/${version}/watch/${plural}`,
        //`/api/${version}/watch/${plural}/{name}`,
        `/api/${version}/${plural}`,
        `/api/${version}/${plural}/{name}`,
        `/api/${version}/${plural}/{name}/proxy/{path}`,
        `/api/${version}/${plural}/{name}/finalize`,
        `/api/${version}/${plural}/{name}/proxy`,
        `/api/${version}/${plural}/{name}/status`,
      ]);
  }

  if(namespaced) {
    paths.push(...[
        //`/apis/${group}/${version}/watch/namespaces/{namespace}/${plural}`,
        //`/apis/${group}/${version}/watch/namespaces/{namespace}/${plural}/{name}`,
        `/apis/${group}/${version}/namespaces/{namespace}/${plural}`,
        `/apis/${group}/${version}/namespaces/{namespace}/${plural}/{name}`,
        `/apis/${group}/${version}/namespaces/{namespace}/${plural}/{name}/layers`,
        `/apis/${group}/${version}/namespaces/{namespace}/${plural}/{name}/secrets`,
        `/apis/${group}/${version}/namespaces/{namespace}/${plural}/{name}/clone`,
        `/apis/${group}/${version}/namespaces/{namespace}/${plural}/{name}/details`,
        `/apis/${group}/${version}/namespaces/{namespace}/${plural}/{name}/scale`,
        `/apis/${group}/${version}/namespaces/{namespace}/${plural}/{name}/status`,
        `/apis/${group}/${version}/namespaces/{namespace}/${plural}/{name}/instantiate`,
        `/apis/${group}/${version}/namespaces/{namespace}/${plural}/{name}/log`,
        `/apis/${group}/${version}/namespaces/{namespace}/${plural}/{name}/rollback`,
        `/apis/${group}/${version}/namespaces/{namespace}/${plural}/{name}/instantiatebinary`,
        `/apis/${group}/${version}/namespaces/{namespace}/${plural}/{name}/webhooks`,
        `/apis/${group}/${version}/namespaces/{namespace}/${plural}/{name}/webhooks/{path}`,
      ]);
  }

  return paths.concat([
      //`/apis/${group}/${version}/watch/${plural}`,
      //`/apis/${group}/${version}/watch/${plural}/{name}`,
      `/apis/${group}/${version}/${plural}`,
      `/apis/${group}/${version}/${plural}/{name}`,
      `/apis/${group}/${version}/${plural}/{name}/status`,
      `/apis/${group}/${version}/${plural}/{name}/approval`,
    ]);
}

const getApiSupportLevel = (apiSupportLevels = [], { group, version } = {}) => {
  // If false, provide an empty object and destructure to an empty array
  const { supportLevels = [] } = (apiSupportLevels.find(({ apiGroup = '' }) => {
    const groupRegex = new RegExp(`${apiGroup}`);
    if(groupRegex.test(group)) {
      return true;
    }
    return false;
  }) || {});

  return supportLevels.reduce((accum, { apiVersion, level }) => {
    if(accum)
      return accum;

    const versionRegex = new RegExp(`^${apiVersion}$`);
    if(versionRegex.test(version)) {
      return level;
    }

    return '';
  }, '');
};

function titleize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function createKey(gvk) {
  const { group, version, kind } = gvk;
  return [group, version, kind].join('.');
}

const replaceWith = replacer => title => title
  .toLowerCase()
  .replace(/[\s\.]+/g, replacer);

const createRef = ({ resource = '', kind = '', group = '', version = '' } = {}) => {
  const p = replaceWith('_')(resource);
  const filename = resource == 'objects' ?
    'index.adoc' : `${replaceWith('-')([ kind, group, version ].join(' '))}.adoc`;
  const anchor = replaceWith('-')([ kind, group, version ].join(' '));
  return {
    path: p,
    filename,
    anchor
  };
};

// https://humanwhocodes.com/snippets/2019/05/nodejs-read-stream-promise/
function readStream(stream, encoding = "utf8") {

  stream.setEncoding(encoding);

  return new Promise((resolve, reject) => {
    let data = "";

    stream.on("data", chunk => data += chunk);
    stream.on("end", () => resolve(data.split(/\n/)));
    stream.on("error", error => reject(error));
  });
}

function getOffsets(row) {
  const columns = {};
  let begin = false;
  let columnIdx = 0;

  for(let i = 0; i < row.length; i++) {

    if(begin && (i == (row.length - 1) || !/[A-Z]/.test(row[i]))) {

      if(i == (row.length - 1) || /[A-Z]/.test(row[i+1])) {
        begin = false;

        columns[columnIdx] = {
          ...columns[columnIdx],
          stop: i
        };

        columnIdx++;
      }

      continue;
    }

    if(!begin && /[A-Z]/.test(row[i])) {
      columns[columnIdx] = {
        ...columns[columnIdx],
        start: i
      };

      begin = true;
    }
  }

  return columns;
}

function loadYamlConfig(file = 'api-config.yaml') {
  if(! fs.existsSync(file)) {
    console.error(`Cannot open configuration file: ${file}`);
    process.exit(1);
  }

  try {
    return yaml.safeLoad(fs.readFileSync(file, { encoding: 'utf8' }));
  }
  catch(e) {
    if(e instanceof Error && e.name == 'YAMLException') {
      console.error(`Cannot parse configuration file. The YAML is invalid.`);
      console.error(e.message);
      process.exit(1);
    }
  }
}

module.exports = {
  whoami,
  
  guessGroupVersionKind,

  buildApiPath,

  getApiSupportLevel,

  titleize,

  createKey,
  createRef,
  replaceWith,

  getOffsets,
  readStream,
  loadYamlConfig
};
