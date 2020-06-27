const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const gvkRules =  yaml.safeLoad(fs.readFileSync(path.join(__dirname, '../config/gvk.yaml')));

const INLINE_DEFINITIONS = [
  {name: 'Spec', match: '${resource}Spec'},
  {name: 'Status', match: '${resource}Status'},
  {name: 'List', match: '${resource}List'},
  {name: 'Strategy', match: '${resource}Strategy'},
  {name: 'Rollback', match: '${resource}Rollback'},
  {name: 'RollingUpdate', match: 'RollingUpdate${resource}'},
  {name: 'EventSource', match: '${resource}EventSource'},
];

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

// Determine whether a property is simple or complex
function getTypeName(schema) {
  let type;

  if(isDefinition(schema)) {
    ({ kind: type } = getDefinitionVersionKindFromRef(schema['$ref']));
    return type;
  }

  if(isArray(schema)) {
    type = getTypeName(schema.items);
    return `${type} array`;
  }

  return schema.type;
}

function getDefinitionVersionKindFromRef(ref) {
  ref = ref.replace('#/definitions/', '');
  const name = ref.split('.');
  const len = name.length;
  let group;
  let version;
  let kind;

  ({ group, version, kind } = guessGroupVersionKind(ref));

  return {
    group,
    version,
    kind
  }
}

// returns {group, version, kind} or null
function getDefinitionVersionKind(spec) {
  if(isDefinition(spec)) {
    return getDefinitionVersionKindFromRef(spec['$ref']);
  }

  // Such as:
  /*
     "containers": {
      "description": "List of containers belonging to the pod...",
      "type": "array",
      "items": {
       "$ref": "#/definitions/io.k8s.api.core.v1.Container"
      },
  */
  if(isArray(spec)) {
    if(spec.items['$ref']) {
      return getDefinitionVersionKindFromRef(spec.items['$ref']);
    }
  }

  return null;
}

function isArray(spec) {
  return (spec.type == "array" && spec.items) ? true : false;
}

function isComplex(spec) {
  return getDefinitionVersionKind(spec) ? true : false;
}

function isDefinition(spec) {
  return spec['$ref'] ? true : false;
}

// Deprecated
function getInlinedDefinitionNames(parent) {

  return INLINE_DEFINITIONS.reduce((accum, def) => {
    accum.push(def.match.replace('${resource}', parent));
    return accum;
  }, []);
}

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

module.exports = {
  getInlinedDefinitionNames,
  getDefinitionVersionKind,
  guessGroupVersionKind,
  getTypeName,
  isComplex,
  titleize,
  createKey,
  createRef,
  replaceWith
};

/*
function compareApiGroup()

func (g ApiGroup) LessThan(other ApiGroup) bool {
	// "apps" group APIs are newer than "extensions" group APIs
	if g.String() == "apps" && other.String() == "extensions" {
		return true
	}
	if other.String() == "apps" && g.String() == "extensions" {
		return false
	}

	// "policy" group APIs are newer than "extensions" group APIs
	if g == "policy" && other.String() == "extensions" {
		return true
	}
	if other.String() == "policy" && g.String() == "extensions" {
		return false
	}

	// "networking" group APIs are newer than "extensions" group APIs
	if g.String() == "networking" && other.String() == "extensions" {
		return true
	}
	if other.String() == "networking" && g.String() == "extensions" {
		return false
	}

	return strings.Compare(g.String(), other.String()) < 0
}
*/
