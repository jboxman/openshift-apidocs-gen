const { describe } = require('riteway');

const { createKey } = require('../lib/util');

const {
  flatPropertiesForTable,
  flatPropertiesSliceForTable,
  createGatherRelatedDefinitions
} = require ('../templates/helpers');

// TODO - format correctly
// this may be different for a block vs. in a table cell
// "description": "A BuildPostCommitSpec holds a build post commit hook specification. The hook executes a command in a temporary container running the build output image, immediately after the last layer of the image is committed and before the image is pushed to a registry. The command is executed with the current working directory ($PWD) set to the image's WORKDIR.\n\nThe build will be marked as failed if the hook execution fails. It will fail if the script or command return a non-zero exit code, or if there is any other error related to starting the temporary container.\n\nThere are five different ways to configure the hook. As an example, all forms below are equivalent and will execute `rake test --verbose`.\n\n1. Shell script:\n\n       \"postCommit\": {\n         \"script\": \"rake test --verbose\",\n       }\n\n    The above is a convenient form which is equivalent to:\n\n       \"postCommit\": {\n         \"command\": [\"/bin/sh\", \"-ic\"],\n         \"args\":    [\"rake test --verbose\"]\n       }\n\n2. A command as the image entrypoint:\n\n       \"postCommit\": {\n         \"commit\": [\"rake\", \"test\", \"--verbose\"]\n       }\n\n    Command overrides the image entrypoint in the exec form, as documented in\n    Docker: https://docs.docker.com/engine/reference/builder/#entrypoint.\n\n3. Pass arguments to the default entrypoint:\n\n       \"postCommit\": {\n\t\t      \"args\": [\"rake\", \"test\", \"--verbose\"]\n\t      }\n\n    This form is only useful if the image entrypoint can handle arguments.\n\n4. Shell script with arguments:\n\n       \"postCommit\": {\n         \"script\": \"rake test $1\",\n         \"args\":   [\"--verbose\"]\n       }\n\n    This form is useful if you need to pass arguments that would otherwise be\n    hard to quote properly in the shell script. In the script, $0 will be\n    \"/bin/sh\" and $1, $2, etc, are the positional arguments from Args.\n\n5. Command with arguments:\n\n       \"postCommit\": {\n         \"command\": [\"rake\", \"test\"],\n         \"args\":    [\"--verbose\"]\n       }\n\n    This form is equivalent to appending the arguments to the Command slice.\n\nIt is invalid to provide both Script and Command simultaneously. If none of the fields are specified, the hook is not executed."
// "description": "scope specifies the scope of this rule. Valid values are \"Cluster\", \"Namespaced\", and \"*\" \"Cluster\" means that only cluster-scoped resources will match this rule. Namespace API objects are cluster-scoped. \"Namespaced\" means that only namespaced resources will match this rule. \"*\" means that there are no scope restrictions. Subresources match the scope of their parent resource. Default is \"*\"."

describe('template helpers', async assert => {
  let output;

  const flatProps = {
    key1: {
      type: 'string',
      description: 'short'
    },
    key2: {
      type: 'integer',
      description: 'none'
    }
  }

  const byPath = {
    '.': {
      'abc': true
    },
    '.key2': {
      'def': true
    }
  }

  output = flatPropertiesForTable(flatProps);

  assert({
    given: 'flatProps',
    should: 'transform to a `property` item 0',
    actual: output[0].hasOwnProperty('property'),
    expected: true
  });

  assert({
    given: 'flatProps',
    should: 'transform to a `property` item 1',
    actual: output[1].hasOwnProperty('property'),
    expected: true
  });

//  output = flatPropertiesSliceForTable(byPath, '.');
//  console.log(output);

});

describe('relatedDefinitions()', async assert => {
  // mock config
  const config = {
    objs: {
      'a.a.a': {
        get relatedDefinitions() {
          return [];
        }
      },
      'b.b.b': {
        get relatedDefinitions() {
          return [
            { group: 'c', version: 'c', kind: 'c' },
          ]
        }
      },
      'c.c.c': {
        get relatedDefinitions() {
          return [
            { group: 'd', version: 'd', kind: 'd' },
          ]
        }
      },
      'd.d.d': {
        get relatedDefinitions() {
          return [];
        }
      },
      'a.b.c': {
        get relatedDefinitions() {
          return [
            { group: 'a', version: 'a', kind: 'a' },
            { group: 'a', version: 'a', kind: 'a' }, // ensure no dups are included
            { group: 'c', version: 'c', kind: 'c' }, // ensure no dups are included
            { group: 'b', version: 'b', kind: 'b' }
          ]
        }
      }
    },
    definitions: {
      getByVersionKind(gvk) {
        return config.objs[createKey(gvk)];
      }
    }
  };

  const gatherRelated = createGatherRelatedDefinitions(config);

  assert({
    given: 'no related objects',
    should: 'return `[]`',
    actual: gatherRelated(config.objs['a.a.a'].relatedDefinitions),
    expected: []
  });

  assert({
    given: 'related objects',
    should: 'recursive children',
    actual: gatherRelated(config.objs['a.b.c'].relatedDefinitions),
    expected: [
      { group: 'a', version: 'a', kind: 'a' },
      { group: 'c', version: 'c', kind: 'c' },
      { group: 'd', version: 'd', kind: 'd' },
      { group: 'b', version: 'b', kind: 'b' }
    ]
  });

});
