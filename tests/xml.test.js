const test = require('node:test');
const assert = require('node:assert/strict');

global.PV2000 = {};
require('../src/core/xml.js');

test('missing or empty numeric XML nodes use the requested fallback instead of zero', () => {
  const missing = { children: [] };
  const empty = { children: [{ localName: 'Value', nodeName: 'Value', textContent: '' }] };
  assert.ok(Number.isNaN(PV2000.xml.num(missing, 'Value', NaN)));
  assert.equal(PV2000.xml.num(missing, 'Value', -0.1), -0.1);
  assert.equal(PV2000.xml.num(empty, 'Value', 0.65), 0.65);
});
