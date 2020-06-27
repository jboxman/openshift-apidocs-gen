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
  })
});
