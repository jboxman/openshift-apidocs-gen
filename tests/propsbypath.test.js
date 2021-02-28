const test = require('tape');

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const {
  flattenProps,
  getPropertiesByPath
} = require('../lib/properties');

const packageMap =  yaml.safeLoad(fs.readFileSync(path.join(__dirname, 'kgv.yaml'), { encoding: 'utf8' }));

test('getPropertiesByPath', t => {
  t.plan(10);

  let props;

  const { definitions } = require('./specs/prometheus-spec.json');
  const testSpec = definitions['com.coreos.monitoring.v1.Prometheus'];
  const flatPropsOfResource = flattenProps({ data: testSpec, definitions, packageMap });

  // TODO - this works by happenstance; confirm why
  // Get root paths, but not children
  props = getPropertiesByPath({
    properties: flatPropsOfResource, otherPaths: ['.', '.spec', '.spec.containers[]'], reqPath: '.'
  });

  t.equal(
    props.includes('.apiVersion'),
    true);
  // TODO - This is an array; test succeeds by accident; need .filter on value instead
  t.equal(
    !!props.find(v => v.includes('.status.')),
    false);
  t.equal(
    !!props.find(v => v.includes('.spec.containers')),
    false);
  t.equal(
    props.includes('.metadata'),
    true);

  // Get all properties for a path
  props = getPropertiesByPath({
    properties: flatPropsOfResource, otherPaths: ['.', '.spec'], reqPath: '.spec'
  });

  t.equal(
    props.includes('.spec.containers[].env[].name'),
    true);

  // Get all paths starting at the root
  props = getPropertiesByPath({
    properties: flatPropsOfResource, reqPath: '.'
  });

  // Root must be excluded
  t.equal(
    props.includes('.'),
    false
  );

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

  // Confirms some value were captured; but are they correct?
  t.equal(
    Object.values(propertiesByPath).every(array => array.length > 0),
    true
  );

  t.end();
});
