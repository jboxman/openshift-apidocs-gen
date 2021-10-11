const { describe } = require('riteway');

const avoidPaths = require('../lib/properties').getPropertiesByPath.avoidPaths;

const pathList = [
  '.',
  '.spec',
  '.spec.baz',
  '.spec.foo',
  '.spec.foo.bar',
  '.spec.foo.bar.what'
];

describe('#avoidPaths', async assert => {
  const given = 'list of paths';
  let avoid;

  assert({
    given,
    should: 'exclude dot',
    actual: avoidPaths({ pathList }),
    expected: pathList.filter(v => v != '.')
  });

  assert({
    given,
    should: 'accept list of children to avoid',
    actual: avoidPaths({ pathList, avoidChildrenOf: [] }),
    expected: pathList.filter(v => v != '.')
  });

  avoid = ['.'];
  assert({
    given,
    should: 'avoid root but include children',
    actual: avoidPaths({ avoidChildrenOf: avoid, pathList }),
    expected: pathList.filter(v => v != '.')
  });

  avoid = ['.spec'];
  assert({
    given,
    should: 'avoid .spec children',
    actual: avoidPaths({ avoidChildrenOf: avoid, pathList }),
    expected: ['.spec']
  });

  avoid = ['.spec.foo'];
  assert({
    given,
    should: 'avoid .spec.foo children',
    actual: avoidPaths({ avoidChildrenOf: avoid, pathList }),
    expected: ['.spec', '.spec.baz', '.spec.foo']
  });

});
