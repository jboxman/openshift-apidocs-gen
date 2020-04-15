const test = require('tape');

const {
  flatPropertiesForTable
} = require ('../templates/helpers');


test('template helpers', t => {

  const flatProps = {
    key1: {
      type: 'string',
      description: 'short'
    },
    key2: {
      type: 'integer',
      description: 'none'
    }
  }

  const output = flatPropertiesForTable(flatProps);

  t.equal(
    output[0].hasOwnProperty('property'),
    true
  );

  t.equal(
    output[1].hasOwnProperty('property'),
    true
  );

  t.end();
});
