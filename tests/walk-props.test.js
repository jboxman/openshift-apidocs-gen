const test = require('tape');

const {
  walkProps,
  getPropertiesByPath
} = require('../lib/properties');

test('getPropertiesByPath', t => {
  t.plan(8);

  let props;

  const { definitions } = require('./specs/prometheus-spec.json');
  const testSpec = definitions['com.coreos.monitoring.v1.Prometheus'];
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
  let definitions;
  let testSpec;
  let flatProps;

  ({ definitions } = require('./specs/prometheus-spec.json'));
  testSpec = definitions['com.coreos.monitoring.v1.Prometheus'];

  flatProps = walkProps({ data: testSpec, definitions });

  t.equal(
    Object.keys(flatProps).length,
    1099);

  ({ definitions } = require('./specs/storageclass-spec.json'));
  testSpec = definitions['io.k8s.api.storage.v1.StorageClass'];

  flatProps = walkProps({ data: testSpec, definitions });

  t.equal(
    Object.keys(flatProps).length,
    48);

  t.end();
});
