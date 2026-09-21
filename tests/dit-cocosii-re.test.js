const test = require('node:test');
const assert = require('node:assert/strict');

global.PV2000 = {};
require('../src/core/stats.js');
require('../src/core/registry.js');
PV2000.xml = {};
require('../src/modules/dit.js');

test('PV2000 reverse-engineered COCOS-II interprets EOT in angstrom', () => {
  const c2 = PV2000.modules.dit.cocosIIReverse(
    { rows: [{ Qc: 0, VDark: 0 }, { Qc: 1e12, VDark: 0 }] },
    { dopingType: 'n', cocosIIEOT: 100, cocosIIMinVsb: -0.1, cocosIIMaxVsb: 0.65 },
    { qfb: 0, vfbDark: 0 },
    {}
  );
  const expected = 1.60218e-19 * (100e-8) / (3.9 * 8.8541878128e-14) * 1e12;
  assert.ok(c2.valid);
  assert.ok(Math.abs(c2.light[1] - expected) < 1e-12);
  assert.ok(Math.abs(c2.vsb[1] - expected) < 1e-12);
  assert.ok(Math.abs(expected - 0.4639786204009496) < 1e-12);
});

test('reverse-engineered Vsb polarity is doping-aware and signed', () => {
  const site = { rows: [{ Qc: 0, VDark: 0.1 }, { Qc: 1e12, VDark: 0.1 }] };
  const f = { qfb: 0, vfbDark: 0.1 };
  const n = PV2000.modules.dit.cocosIIReverse(site, { dopingType: 'n', cocosIIEOT: 100 }, f, {});
  const p = PV2000.modules.dit.cocosIIReverse(site, { dopingType: 'p', cocosIIEOT: 100 }, f, {});
  assert.ok(n.vsb[1] > 0);
  assert.ok(p.vsb[1] < 0);
  assert.ok(Math.abs(n.vsb[1] + p.vsb[1]) < 1e-12);
});

test('COCOS-II Min/Max Vsb gates only the reported minimum selection', () => {
  const a = PV2000.modules.dit.windowedMin([0.05, 0.20, 0.40], [5, 2, 1], -0.10, 0.30);
  const b = PV2000.modules.dit.windowedMin([0.05, 0.20, 0.40], [5, 2, 1], -0.10, 0.65);
  assert.equal(a.min, 2);
  assert.deepEqual(a.accepted, [true, true, false]);
  assert.equal(b.min, 1);
});

test('Back Surface Shift is deliberately recorded but not applied', () => {
  const site = { rows: [{ Qc: 0, VDark: 0 }, { Qc: 1e12, VDark: 0 }] };
  const data = { dopingType: 'n', cocosIIEOT: 100 };
  const flat = { qfb: 0, vfbDark: 0 };
  const off = PV2000.modules.dit.cocosIIReverse(site, data, flat, { backSurfaceShift: false });
  const on = PV2000.modules.dit.cocosIIReverse(site, data, flat, { backSurfaceShift: true });
  assert.deepEqual(on.vsb, off.vsb);
  assert.equal(on.backSurfaceShiftRequested, true);
  assert.equal(on.backSurfaceShiftApplied, false);
});
