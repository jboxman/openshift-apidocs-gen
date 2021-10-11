const { describe } = require('riteway');

const util = require('../lib/util');

describe('#sortByVersion', async assert => {
  const versions = [
    'v2', 'v1', 'v3', 'v3beta1', 'v1alpha1', 'v2alpha1',
    'v1alpha2', 'v2', 'v1beta9', 'v1beta3'
  ];

  const sorted = versions.sort(util.groupKindByVersion);
  const result = ['v1',
    'v1alpha1',
    'v1alpha2',
    'v1beta3',
    'v1beta9',
    'v2',
    'v2',
    'v2alpha1',
    'v3',
    'v3beta1'
  ];

  assert({
    given: 'a list of versions',
    should: 'sort in version order',
    actual: sorted.join(''),
    expected: result.join('')
  })
});

describe('#createRef', async assert => {
  const createRef = util.createRef;
  const given = 'a resource, kind, group, version'

  assert({
    given,
    should: 'create a ref',
    actual: createRef({ resource: 'name', kind: 'kind', group: 'example.com', version: 'v1beta2'}),
    expected: { path: 'name', filename: 'kind-example-com-v1beta2.adoc', anchor: 'kind-example-com-v1beta2' }
  });
});

describe('#getApiSupportLevel', async assert => {
  const given = 'an apiGroup';
  const supportObj = [{
    "apiGroup": 'openshift\\.io',
    "supportLevels": [
      {
        "apiVersion": 'v\\d+',
        "level": 1
      },
      {
        "apiVersion": 'v\\d+beta\\d+',
        "level": 2
      },
      {
        "apiVersion": 'v\\d+alpha\\d+',
        "level": 4
      }
    ]
  }];

  assert({
    given,
    should: 'return support level 1',
    actual: util.getApiSupportLevel(supportObj, { group: 'example.openshift.io', version: 'v99' }),
    expected: 1
  });

  assert({
    given,
    should: 'return support level 2',
    actual: util.getApiSupportLevel(supportObj, { group: 'example.openshift.io', version: 'v1beta99' }),
    expected: 2
  });

  assert({
    given,
    should: 'return support level 4',
    actual: util.getApiSupportLevel(supportObj, { group: 'any.openshift.io', version: 'v1alpha0' }),
    expected: 4
  });

});
