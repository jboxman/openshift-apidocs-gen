const test = require('tape');

const avoidPaths = require('../lib/properties').getPropertiesByPath.avoidPaths;

const pathList = [
  '.',
  '.spec',
  '.spec.baz',
  '.spec.foo',
  '.spec.foo.bar',
  '.spec.foo.bar.what'
];

test('avoidPaths', t => {
  let avoid;

  t.deepEqual(avoidPaths({ pathList }), pathList.filter(v => v != '.'));
  t.deepEqual(avoidPaths({ pathList, avoidChildrenOf: [] }), pathList.filter(v => v != '.'));

  avoid = ['.'];
  t.deepEqual(avoidPaths({ avoidChildrenOf: avoid, pathList }), pathList.filter(v => v != '.'));

  avoid = ['.spec'];
  t.deepEqual(avoidPaths({ avoidChildrenOf: avoid, pathList }), ['.spec']);

  avoid = ['.spec.foo'];
  t.deepEqual(avoidPaths({ avoidChildrenOf: avoid, pathList }), ['.spec', '.spec.baz', '.spec.foo']);

  t.end();
});
