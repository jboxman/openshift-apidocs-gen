const { describe } = require('riteway');

const createOperation = require('../lib/models/operation');

describe('createOperation', async assert => {
  let paths;

  ({ paths } = require('./specs/kubecontrollermanager.json'));

  {
    const obj = {
      kind: 'any',
      group: 'any',
      version: 'any',
      path: '/apis/operator.openshift.io/v1/kubecontrollermanagers',
      verb: 'get',
      properties: {
      ...paths['/apis/operator.openshift.io/v1/kubecontrollermanagers'].get,
      pathParameters: paths['/apis/operator.openshift.io/v1/kubecontrollermanagers'].parameters
      }
    }

    const given = 'kubecontrollermanagers endpoint';

    const op = createOperation(obj);

    assert({
      given,
      should: 'include KGV',
      actual: { kind: op.kind, group: op.group, version: op.version },
      expected: { kind: obj.kind, group: obj.group, version: obj.version }
    });

    assert({
      given,
      should: 'merge endpoint parameters',
      actual: op.parameters.length,
      expected: 9
    });
  }

  {
    const obj = {
      kind: 'any',
      group: 'any',
      version: 'any',
      path: '/apis/operator.openshift.io/v1/kubecontrollermanagers',
      verb: 'post',
      properties: {
      ...paths['/apis/operator.openshift.io/v1/kubecontrollermanagers'].post,
      pathParameters: paths['/apis/operator.openshift.io/v1/kubecontrollermanagers'].parameters
      }
    }

    const given = 'kubecontrollermanagers endpoint';

    const op = createOperation(obj);
  }

});
