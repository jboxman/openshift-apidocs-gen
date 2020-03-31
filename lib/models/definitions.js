const createDefinition = require('./definition');
const createField = require('./field');

const {
  getInlinedDefinitionNames,
  getDefinitionVersionKind,
  getTypeName,
  isComplex,
  createKey
} = require('../util');

const {
  patchMergeKeyKey,
  patchStrategyKey
} = require('../constants');

function createDefinitionCollection() {
  const items = {};
  let itemsByKind = {};
  let isInitialized = false;

  function initialize() {

    if(Object.keys(items).length <= 0) {
      return isInitialized;
    }

    for(const item in items) {
      initializeFields(items[item]);
    }

    // Need to support sorting by version
    itemsByKind = Object.keys(items).reduce(function(accum, value) {
      const kind = items[value].name;
      if(! accum[kind])
        accum[kind] = [];
  
      accum[kind].push(items[value]);

      return accum;
    }, {});

    // Initialize otherVersions in each definition
    for(const item in items) {
      const otherDefs = getItemsByKind(items[item].name);
      //console.log(`${item}: ${otherDefs.length}`);
      const others = otherDefs.filter(def => def.version != items[item].version);
      items[item].setOtherVersions(others);
    }

    // Initialize appearsIn for each definition
    for(const key in items) {
      const refs = getReferences(items[key]);
      //if(refs.length > 0) {
      //  console.log(items[item].key());
      //}
      refs.forEach(ref => {
        ref.appendToAppearsIn(key);
      });
    }

    // Initialize Inline, IsInlined 
    // Note: examples of inline definitions are "Spec", "Status", "List", etc
    for(const item in items) {
      const possibleInlinedDefinitionNames = getInlinedDefinitionNames(items[item].name);
      possibleInlinedDefinitionNames.forEach(def => {
        const cr = getByVersionKind({group: items[item].group, version: items[item].version, kind: def});
        if(cr) {
          //console.log(`(${items[item].key()}) Inline: ${cr.key()}`);
          items[item].appendToAppearsInline(cr.key());
          items[cr.key()].isInlined = true;
          items[cr.key()].foundInField = true;
        }
      });
    }

    isInitialized = true;
    return isInitialized;
  }

/*
	for _, d := range s.All {
		s.ByKind[d.Name] = append(s.ByKind[d.Name], d)
	}

	// If there are multiple versions for an object.  Mark all by the newest as old
	// Sort the ByKind index in by version with newer versions coming before older versions.
	for k, l := range s.ByKind {
		if len(l) <= 1 {
			continue
		}
		sort.Sort(l)
		// Mark all version as old
		for i, d := range l {
			if len(l) > 1 {
				if i == 0 {
					fmt.Printf("Current Version: %s.%s.%s", d.Group, d.Version, k)
					if len(l) > i-1 {
						fmt.Printf(" Old Versions: [")
					}
				} else {
					fmt.Printf("%s.%s.%s", d.Group, d.Version, k)
					if len(l) > i-1 {
						fmt.Printf(",")
					}
					d.IsOldVersion = true
				}
			}
		}
		if len(l) > 1 {
			fmt.Printf("]\n")
		}
	}

*/

  function add(definition) {
    if(! definition.key) {
      definition = createDefinition(definition);
    }
    items[definition.key()] = definition;
    return this;
  }

  function all() {
    return Object.assign({}, items);
  }

  function initializeFields(item) {
    let fieldDefinition;
    for(const name in item.getSchema().properties) {
      const schema = item.getSchema().properties[name];

      // TODO - Can use field.js
      const field = {
        name,
        type: getTypeName(schema),
        description: schema.description,
        definition: null,
        patchMergeKey: schema[patchMergeKeyKey] || null,
        patchStrategyKey: schema[patchStrategyKey] || null
      };

      const gvk = getDefinitionVersionKind(item.getSchema().properties[name]);
      if(gvk && (fieldDefinition = getByVersionKind(gvk))) {
        if(fieldDefinition) {
          field.definition = fieldDefinition;
          item.appendToDependsOn(fieldDefinition.key());
        }
      }

      item.addField(field);
    }
  }

  // types.go
  function getSchemaFor(schema) {
    const gvk = getDefinitionVersionKind(schema);
    if(gvk) {
      return getByVersionKind(gvk);
    }
    return null;
  }

  // spec['$ref']
  function getForSchema(schema = {}) {
    const gvk = getDefinitionVersionKind(schema);
    return getByVersionKind(gvk);
  }

  function parameterToField({ name, description, schema }) {
    let definition;
    let fieldType;

    const field = createField({
      name,
      description
    });

    if(schema) {
      fieldType = getTypeName(schema);
      definition = getForSchema(schema);
      if(definition) {
        field.type = fieldType;
        field.definition = definition.key();
      }
    }

    return field;
  }

  // types.go
  function getReferences(definition) {
    const defs = [];
    const { properties } = definition.getSchema();

    for(const property in properties) {
      if(! isComplex(properties[property])) {
        continue;
      }

      let referencedSchema = getSchemaFor(properties[property]);
      if(referencedSchema) {
        defs.push(referencedSchema);
      }
      else {
        const gvk = getDefinitionVersionKind(properties[property]);
        console.log(`${definition.key()} Couldn't find reference for "${property}"`);
      }
    }

    return defs;
  }

  // Look up a definition by its group, version, kind key
  function getByVersionKind(gvk) {
    const key = createKey(gvk);
    const def = items[key];
    if(def) {
      return def;
    }
    else {
      // It may not exist. That's okay.
      //console.error(`Definition not found: ${gvk.group} ${gvk.version} ${gvk.kind}`);
      return null;
    }
  }

  function getByGroupKind({ group, kind } = {}) {
    return getItemsByKind(kind).filter(candidate => candidate.group == group);
  }

  function getItemsByKind(kind = undefined) {
    if(itemsByKind[kind])
      return itemsByKind[kind];

    return [];
  }

  return {
    add,
    all,
    initialize,

    getByVersionKind,
    getByGroupKind,
    getForSchema,
    parameterToField
  }
}

module.exports = createDefinitionCollection;
