const test = require('tape');

const {
  walkProps,
  getPropertiesByPath
} = require('../lib/properties');

test('getPropertiesByPath', t => {
  t.plan(9);

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

  const wantPaths = [
    '.spec',
    '.spec.affinity',
    '.spec.affinity.nodeAffinity',
    '.spec.affinity.podAffinity',
    '.spec.affinity.podAntiAffinity',
    '.spec.volumes[]',
    '.spec.tolerations[]',
    '.spec.storage',
    '.spec.serviceMonitorNamespaceSelector',
    '.spec.remoteWrite[]',
    '.spec.remoteRead[]',
    '.spec.podMonitorNamespaceSelector',
    '.spec.initContainers[]',
    '.spec.containers[]',
    '.spec.apiserverConfig',
    '.spec.alerting',
  ];
  const propertiesByPath = wantPaths.reduce((accum, path) => {
    return {
      ...accum,
      [path]: getPropertiesByPath({ properties: flatPropsOfResource, otherPaths: wantPaths, reqPath: path })
    };
  }, {});

  //console.log(JSON.stringify(propertiesByPath, null, 2))

  t.equal(
    Object.values(propertiesByPath).every(array => array.length > 0),
    true
  );

  t.end();
});
