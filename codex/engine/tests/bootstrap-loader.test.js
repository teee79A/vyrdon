const test = require('node:test');
const assert = require('node:assert/strict');

test('bootstrap loads and is immutable', () => {
  const { loadBootstrap } = require('../dist/system/bootstrapLoader.js');
  const bootstrap = loadBootstrap();

  assert.equal(bootstrap.fail_closed, true);
  assert.ok(Array.isArray(bootstrap.domain_split.guard_domain));
  assert.ok(Array.isArray(bootstrap.domain_split.controlled_domain));
  assert.ok(Object.isFrozen(bootstrap));
});
