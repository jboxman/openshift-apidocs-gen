const { describe } = require('riteway');

const {
  flattenProps,
  getPropertiesByPath
} = require('../lib/properties');

describe('getPropertiesByPath', async assert => {
  let props;

  const { definitions } = require('./specs/prometheus-spec.json');
  const testSpec = definitions['com.coreos.monitoring.v1.Prometheus'];
  const flatPropsOfResource = flattenProps({ data: testSpec, definitions });

  // TODO - this works by happenstance; confirm why
  // Get root paths, but not children
  props = getPropertiesByPath({
    properties: flatPropsOfResource, otherPaths: ['.', '.spec', '.spec.containers[]'], reqPath: '.'
  });

  assert({
    given: 'props for an API',
    should: 'include .apiVersion',
    actual: props.includes('.apiVersion'),
    expected: true
  });

  // TODO - This is an array; test succeeds by accident; need .filter on value instead
  /*
  assert({
    given: 'props for an API',
    should: 'not include status.* children',
    actual: !!props.find(v => v.includes('.status.')),
    expected: false
  });

  assert({
    given: 'props for an API',
    should: 'not include .spec.containers.*',
    actual: !!props.find(v => v.includes('.spec.containers')),
    expected: false
  });
  */

  assert({
    given: 'props for an API',
    should: 'include .metadata',
    actual: props.includes('.metadata'),
    expected: true
  });

  // Get all properties for a path
  props = getPropertiesByPath({
    properties: flatPropsOfResource, otherPaths: ['.', '.spec'], reqPath: '.spec'
  });

  assert({
    given: 'props for an API',
    should: 'include all props for a path',
    actual: props.includes('.spec.containers[].env[].name'),
    expected: true
  });

  // Get all paths starting at the root
  props = getPropertiesByPath({
    properties: flatPropsOfResource, reqPath: '.'
  });

  assert({
    given: 'props for an API',
    should: 'must not include root',
    actual: props.includes('.'),
    expected: false
  });

  // Do not get properties for other paths,
  // or children of path if in same tree
  props = getPropertiesByPath({
    properties: flatPropsOfResource, otherPaths: ['.', '.spec', '.spec.containers[]'], reqPath: '.spec'
  });

  assert({
    given: 'props for an API',
    should: "exclude other paths' children",
    actual: props.includes('.spec.containers[].'),
    expected: false
  });

  assert({
    given: 'props for an API',
    should: "include requested path's children",
    actual: props.includes('.spec.containers[]'),
    expected: true
  });

  assert({
    given: 'props for an API',
    should: 'exclude unselected root prop',
    actual: props.includes('.metadata'),
    expected: false
  });

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
  assert({
    given: 'props for an API',
    should: 'include values',
    actual: Object.values(propertiesByPath).every(array => array.length > 0),
    expected: true
  });

});
