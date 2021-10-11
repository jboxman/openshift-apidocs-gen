const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const whoami = path.basename(process.argv[1] || '') || 'ocp-api-docgen';

// TODO - recycle
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

  console.log(`${packagePrefix} [${kind}] is not mapped to a group`);
  return {};
}

const versionRegex = /^v(\d+)((alpha|beta)(\d+))?$/;
const sortGroupKindByVersion = (a, b) => {
  if(typeof a === 'object' && typeof b === 'object') {
    [ a, b ] = [ a.version, b.version ];
  }
  const [ , aMajor, , aAlphaBeta, aMinor ] = versionRegex.exec(a);
  const [ , bMajor, , bAlphaBeta, bMinor ] = versionRegex.exec(b);

  if(aMajor < bMajor) {
    return 1;
  }
  else if(aMajor > bMajor) {
    return -1;
  }
  else {
    if(!aAlphaBeta && !bAlphaBeta) {
      return 0;
    }
    // a lacks alpha|beta so > than b
    else if(!aAlphaBeta) {
      return -1;
    }
    else if(!bAlphaBeta) {
      return 1;
    }
    else if(aAlphaBeta == 'beta' && bAlphaBeta == 'beta') {
      if(aMinor == bMinor) return 0;
      return aMinor < bMinor ? 1 : -1;
    }
    else if(aAlphaBeta == 'alpha' && bAlphaBeta == 'alpha') {
      if(aMinor == bMinor) return 0;
      return aMinor < bMinor ? 1 : -1;
    }
    else if(aAlphaBeta == 'alpha' && bAlphaBeta == 'beta') {
      return 1;
    }
    else {
      return -1;
    }
  }
};

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

const onlyUniqSchemaRefs = (accum, obj) => {
  const target = Array.isArray(obj) ? obj[1] : obj.schema;
  if(target && target.hasOwnProperty('$ref')) {
    const schemaId = target['$ref'].replace('#/definitions/', '');
    if(!accum.find(v => v == schemaId)) accum.push(schemaId);
  }
  return accum;
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

const createRef = ({ resource = '', kind = '', group = '', version = '', schemaId = '' } = {}) => {
  const p = replaceWith('_')(resource);
  const filename = resource == 'objects' ?
    'index.adoc' : `${replaceWith('-')([ kind, group, version ].join(' '))}.adoc`;
  const anchor = schemaId ? schemaId : replaceWith('-')([ kind, group, version ].join(' '));
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
  
  getKindGroupVersion,
  sortGroupKindByVersion,

  getApiSupportLevel,

  onlyUniqSchemaRefs,

  titleize,

  createKey,
  createRef,
  replaceWith,

  getOffsets,
  readStream,
  loadYamlConfig
};
