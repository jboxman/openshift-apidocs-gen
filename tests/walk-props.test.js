const test = require('tape');

const {
  walkProps,
  getPropertiesByPath
} = require('./');

const { definitions } = require('../openshift-openapi-spec-4.4.0.json');
const testSpec = require('./specs/prometheus-spec.json');
//const props = { 'io.k8s.api.core.v1.Pod': definitions['io.k8s.api.core.v1.Pod'] };

test('getPropertiesByPath', t => {
  let props;
  const flatPropsOfResource = walkProps({ data: testSpec, definitions });

  // Get all properties for a path
  props = getPropertiesByPath({
    properties: flatPropsOfResource, otherPaths: ['.', '.spec'], reqPath: '.spec'
  });

  t.equal(
    props.includes('.spec.containers[].env[].name'),
    true);

  // Do not get properties for other paths,
  // or children of path if in same tree
  props = getPropertiesByPath({
    properties: flatPropsOfResource, otherPaths: ['.', '.spec', '.spec.containers[]'], reqPath: '.spec'
  });

  t.equal(
    props.includes('.spec.containers[].'),
    false);
  t.equal(
    props.includes('.spec.containers[]'),
    true);
  t.equal(
    props.includes('.metadata'),
    false);

  // TODO - this works by happenstance; confirm why
  // Get root paths, but not children
  props = getPropertiesByPath({
    properties: flatPropsOfResource, otherPaths: ['.', '.spec', '.spec.containers[]'], reqPath: '.'
  });

  t.equal(
    props.includes('.apiVersion'),
    true);
  t.equal(
    props.includes('.status.'),
    false);
  t.equal(
    props.includes('.spec.containers[].'),
    false);
  t.equal(
    props.includes('.metadata'),
    true);

  t.end();
});

test('flatten definition properties', t => {
  const nestedProps = {
    top: {
      description: "text",
      type: "object",
      properties: {
        key1: {
          description: "key1",
          type: "string"
        },
        key2: {
          description: "array",
          type: "array",
          items: {
            description: "item",
            type: "string"
          }
        }
      }
    }
  }

  //const result = walkProps({ data: nestedProps });
  //console.log(JSON.stringify(result, null, 2));

  t.end();
});
