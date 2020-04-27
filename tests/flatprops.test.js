const test = require('tape');

const {
  walkProps
} = require('../lib/properties');

test('flatten definition properties', t => {
  let definitions;
  let testSpec;
  let flatProps;

  ({ definitions } = require('./specs/prometheus-spec.json'));
  testSpec = definitions['com.coreos.monitoring.v1.Prometheus'];

  flatProps = walkProps({ data: testSpec, definitions });

  t.equal(
    Object.keys(flatProps).length,
    1051);
  // A string or integer must not be explicitly named
  /*
  "portals": {
    "description": "iSCSI Target Portal List...",
    "type": "array",
    "items": {
      "type": "string"
    }
  },
  */
  t.equal(
    flatProps.hasOwnProperty('.spec.volumes[].iscsi.portals{}'),
    false);
  t.equal(
    flatProps.hasOwnProperty('.spec.volumes[].iscsi.portals[]'),
    false);
  t.equal(
    flatProps.hasOwnProperty('.spec.volumes[].iscsi.portals'),
    true);

  ({ definitions } = require('./specs/storageclass-spec.json'));
  testSpec = definitions['io.k8s.api.storage.v1.StorageClass'];

  flatProps = walkProps({ data: testSpec, definitions });

  t.equal(
    Object.keys(flatProps).length,
    46);

  ({ definitions } = require('./specs/image-spec.json'));
  testSpec = definitions['com.github.openshift.api.image.v1.Image'];

  flatProps = walkProps({ data: testSpec, definitions });

  t.equal(
    Object.keys(flatProps).length,
    101);
  // parent must be an array
  t.equal(
    flatProps['.signatures[].conditions']['type'],
    'array');
  // child must be an object
  t.equal(
    flatProps['.signatures[].conditions[]']['type'],
    'object');

  ({ definitions } = require('./specs/image-spec.json'));
  testSpec = definitions['com.github.openshift.api.image.v1.ImageStreamLayers'];

  flatProps = walkProps({ data: testSpec, definitions });

  t.equal(
    Object.keys(flatProps).length,
    43);
  // Resolve additionalProperties $ref
  t.equal(
    ['.blobs{}.size', '.blobs{}.mediaType'].every(prop => flatProps[prop]),
    true);
  // Don't overwritten 'description' with 'description' from $ref
  t.equal(
    flatProps['.blobs']['description'],
    'blobs is a map of blob name to metadata about the blob.');

  ({ definitions } = require('./specs/crd-spec.json'));
  testSpec = definitions['io.k8s.apiextensions-apiserver.pkg.apis.apiextensions.v1.CustomResourceDefinition'];

  flatProps = walkProps({ data: testSpec, definitions });

  t.equal(
    Object.keys(flatProps).length,
    64);

  t.end();
});
