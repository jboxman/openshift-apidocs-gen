const test = require('tape');

const {
  flatPropertiesForTable,
  flatPropertiesSliceForTable
} = require ('../templates/helpers');


test('template helpers', t => {
  let output;

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

  const byPath = {
    '.': {
      'abc': true
    },
    '.key2': {
      'def': true
    }
  }

  output = flatPropertiesForTable(flatProps);

  t.equal(
    output[0].hasOwnProperty('property'),
    true
  );

  t.equal(
    output[1].hasOwnProperty('property'),
    true
  );

//  output = flatPropertiesSliceForTable(byPath, '.');
//  console.log(output);

  t.end();
});
