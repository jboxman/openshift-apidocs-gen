const { description } = require('commander');
const { describe } = require('riteway');

const util = require('../lib/util');

describe('#createRef', async assert => {
  const createRef = util.createRef;
  const given = 'a resource, kind, group, version'

  assert({
    given,
    should: 'create a ref',
    actual: createRef({ resource: 'name', kind: 'kind', group: 'example.com', version: 'v1beta2'}),
    expected: 'name/kind-example-com-v1beta2'
  });
});

describe('#getKindGroupVersion', async assert => {
  const getKindGroupVersion = util.getKindGroupVersion;
  const given  = 'a package name';

  const packageMap = {
    'io.k8s.api.batch': 'batch'
  };

  assert({
    given,
    should: 'get a group',
    actual: getKindGroupVersion(packageMap, 'io.k8s.api.batch.v1.Cron')['group'],
    expected: 'batch'
  });

  assert({
    given,
    should: 'get a kind',
    actual: getKindGroupVersion(packageMap, 'io.k8s.api.batch.v1.Cron')['kind'],
    expected: 'Cron'
  });

  assert({
    given,
    should: 'get a version',
    actual: getKindGroupVersion(packageMap, 'io.k8s.api.batch.v1.Cron')['version'],
    expected: 'v1'
  });

  assert({
    given,
    should: 'log missing',
    actual: Object.keys(getKindGroupVersion(packageMap, 'io.does.not.exist.v7beta1.Epic')).length,
    expected: 0
  });

  assert({
    given,
    should: 'handle no version',
    actual: getKindGroupVersion(packageMap, 'io.k8s.api.batch.util.Sour')['version'],
    expected: 'none'
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
