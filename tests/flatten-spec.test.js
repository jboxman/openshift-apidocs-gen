const { describe } = require('riteway');

const {
  walkProps
} = require('../lib/properties');

// TODO - process multiple specs from the same file
// to watch the deep clone / reference problem of modifying definitions

describe('flattenSpec', async assert => {

  let definitions;
  let testSpec;
  let flatProps;
  let given;

  ({ definitions } = require('./specs/prometheus-spec.json'));
  testSpec = definitions['com.coreos.monitoring.v1.Prometheus'];

  flatProps = walkProps({ data: testSpec, definitions });

  given = 'Prometheus spec';

  assert({
    given,
    should: 'recurse all keys',
    actual: Object.keys(flatProps).length,
    expected: 1051
  });

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

  assert({
    given,
    should: 'not recognize `.spec.volumes[].iscsi.portals` as array of objects',
    actual: flatProps.hasOwnProperty('.spec.volumes[].iscsi.portals{}'),
    expected: false
  });

  assert({
    given,
    should: 'not recognize `.spec.volumes[].iscsi.portals` as an array of arrays',
    actual: flatProps.hasOwnProperty('.spec.volumes[].iscsi.portals[]'),
    expected: false
  });

  assert({
    given,
    should: 'recognize `.spec.volumes[].iscsi.portals` property as without complex child',
    actual: flatProps.hasOwnProperty('.spec.volumes[].iscsi.portals'),
    expected: true
  });

  assert({
    given,
    should: 'copy description from $ref as string',
    actual: typeof flatProps['.metadata.annotations'].description,
    expected: 'string'
  });


  assert({
    given,
    should: 'copy description from $ref',
    actual: (flatProps['.metadata.annotations'].description || '').length > 0,
    expected: true
  });

  assert({
    given,
    should: 'recognize object of strings',
    actual: flatProps['.metadata.annotations'].type,
    expected: 'object (string)'
  });

  ({ definitions } = require('./specs/storageclass-spec.json'));
  testSpec = definitions['io.k8s.api.storage.v1.StorageClass'];

  flatProps = walkProps({ data: testSpec, definitions });

  given = 'StorageClass spec';

  assert({
    given,
    should: 'recurse all keys',
    actual: Object.keys(flatProps).length,
    expected: 46
  });

  ({ definitions } = require('./specs/image-spec.json'));
  testSpec = definitions['com.github.openshift.api.image.v1.Image'];

  flatProps = walkProps({ data: testSpec, definitions });

  given = 'Image spec';

  assert({
    given,
    should: 'recurse all keys',
    actual: Object.keys(flatProps).length,
    expected: 101
  });

  // parent must be an array
  assert({
    given,
    should: 'recognize `.signatures[].conditions` as an array',
    actual: flatProps['.signatures[].conditions']['type'],
    expected: 'array'
  });

  // child must be an object
  assert({
    given,
    should: 'recognize `.signatures[].conditions[]` as an object',
    actual: flatProps['.signatures[].conditions[]']['type'],
    expected: 'object'
  });

  ({ definitions } = require('./specs/image-spec.json'));
  testSpec = definitions['com.github.openshift.api.image.v1.ImageStreamLayers'];

  flatProps = walkProps({ data: testSpec, definitions });

  given = 'ImageStreamLayers spec';

  assert({
    given,
    should: 'recurse all keys',
    actual: Object.keys(flatProps).length,
    expected: 43
  });

  // Resolve additionalProperties $ref
  assert({
    given,
    should: 'recognize .blobs{}.* as object properties',
    actual: ['.blobs{}.size', '.blobs{}.mediaType'].every(prop => flatProps[prop]),
    expected: true
  });

  // Don't overwritten 'description' with 'description' from $ref
  assert({
    given,
    should: 'preserve `.blobs` description',
    actual: flatProps['.blobs']['description'],
    expected: 'blobs is a map of blob name to metadata about the blob.'
  });

  {
    const testSpec = definitions['com.github.openshift.api.image.v1.ImageStreamLayers'];
    const flatProps = walkProps({ data: testSpec, definitions, resolve: 'image.openshift.io' });

    given = 'ImageStreamLayers spec scoped to image.openshift.io';

    assert({
      given,
      should: 'not resolve `.metadata`',
      actual: flatProps['.metadata']['gvk'],
      expected: { group: 'meta', version: 'v1', kind: 'ObjectMeta' }
    });
  }

  ({ definitions } = require('./specs/crd-spec.json'));
  testSpec = definitions['io.k8s.apiextensions-apiserver.pkg.apis.apiextensions.v1.CustomResourceDefinition'];
  
  flatProps = walkProps({ data: testSpec, definitions });

  given = 'CustomResourceDefinition spec';

  // Avoid infinite recursion for this CRD
  assert({
    given, 
    should: 'recurse all keys',
    actual: Object.keys(flatProps).length,
    expected: 64
  });

});

describe('relatedSpecs', async assert => {
  {
    const { definitions } = require('./specs/image-spec.json');
    const testSpec = definitions['com.github.openshift.api.image.v1.ImageStreamLayers'];

    const flatProps = walkProps({ data: testSpec, definitions, resolve: false });

    // TODO - import function
    const actual = Object.entries(flatProps).reduce((accum, entry) => {
      if(entry[1].hasOwnProperty('gvk')) {
        accum.push(entry[1].gvk);
      }
      return accum;
    }, []);

    assert({
      given: 'ImageStreamLayers spec with unresolved $refs',
      should: 'assign GVK to each property',
      actual,
      expected: [
        { group: 'image.openshift.io', version: 'v1', kind: 'ImageLayerData' },
        { group: 'image.openshift.io', version: 'v1', kind: 'ImageBlobReferences' },
        { group: 'meta', version: 'v1', kind: 'ObjectMeta' },
      ]
    })

  }
});

describe('resolveRef', async assert => {
  const resolveRef = walkProps.resolveRef;
  var r;

  {
    const { definitions } = require('./specs/image-spec.json');
    const testSpec = definitions['com.github.openshift.api.image.v1.Image'];

    assert({
      given: 'data without `$ref`', 
      should: 'ignore data without `$ref`',
      actual: resolveRef({ data: testSpec, definitions, resolve: 'image.openshift.io' }),
      expected: testSpec
    });

    assert({
      given: 'data with `$ref` in specified group', 
      should: 'resolve `$ref` for specified group',
      actual: Object.keys(resolveRef({ data: testSpec.properties.dockerImageLayers.items, definitions, resolve: 'image.openshift.io' }).properties),
      expected: ['mediaType', 'name', 'size']
    });

    assert({
      given: 'data with `$ref` not in specified group', 
      should: 'not resolve `$ref`',
      actual: resolveRef({ data: testSpec.properties.metadata, definitions, resolve: 'image.openshift.io' }).gvk,
      expected: { group: 'meta', version: 'v1', kind: 'ObjectMeta' }
    });

  }

  {
    const { definitions } = require('./specs/image-spec.json');
    const testSpec = definitions['com.github.openshift.api.image.v1.ImageImportSpec'];

    assert({
      given: 'data with `$ref` in core group not matching /(Spec|Status)$/', 
      should: 'not resolve `$ref`',
      actual: resolveRef({ data: testSpec.properties.from, definitions, resolve: 'image.openshift.io' }).gvk,
      expected: { group: 'core', version: 'v1', kind: 'ObjectReference' }
    });

  }

  {
    const { definitions } = require('./specs/service-spec.json');
    const testSpec = definitions['io.k8s.api.core.v1.Service'];

    assert({
      given: 'data with `$ref` in core group matching /(Spec|Status)$/', 
      should: 'resolve `$ref`',
      actual: resolveRef({ data: testSpec.properties.spec, definitions, resolve: 'core' }).description,
      expected: 'ServiceSpec describes the attributes that a user creates on a service.'
    });

  }

});
