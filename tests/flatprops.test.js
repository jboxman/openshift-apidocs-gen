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
    1068);

  ({ definitions } = require('./specs/storageclass-spec.json'));
  testSpec = definitions['io.k8s.api.storage.v1.StorageClass'];

  flatProps = walkProps({ data: testSpec, definitions });

  t.equal(
    Object.keys(flatProps).length,
    12);

  /*
  ({ definitions } = require('./specs/crd-spec.json'));
  testSpec = definitions['io.k8s.apiextensions-apiserver.pkg.apis.apiextensions.v1.CustomResourceDefinition'];

  flatProps = walkProps({ data: testSpec, definitions });

  t.equal(
    Object.keys(flatProps).length,
    48);
  */

  t.end();
});
