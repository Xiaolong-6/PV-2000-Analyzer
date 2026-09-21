const test = require('node:test');
const assert = require('node:assert/strict');

global.PV2000 = {};
require('../src/core/stats.js');
require('../src/core/registry.js');
PV2000.xml = {};
require('../src/modules/dit.js');

const targetVsb = 0.3;
const doping = 9.65e9 * Math.exp(targetVsb * 1.60218e-19 / (1.38e-23 * 300));
const sample = { x: [0.1, 0.5], dit: [1e10, 1e12], data: { doping } };

test('Linear PCHIP keeps the existing Dit-space midpoint', () => {
  const fit = PV2000.modules.dit.makeCurve(sample.x, sample.dit, sample.data, Infinity);
  assert.ok(Math.abs(fit.mid / 5.05e11 - 1) < 1e-12);
});

test('LOG10 PCHIP fits positive log Dit then restores the midpoint and curve', () => {
  const fit = PV2000.modules.dit.makeCurve(sample.x, sample.dit, sample.data, Infinity, 'log10');
  const withZero = PV2000.modules.dit.makeCurve([0.1, 0.3, 0.5], [1e10, 0, 1e12], sample.data, Infinity, 'log10');
  assert.ok(Math.abs(fit.mid / 1e11 - 1) < 1e-12);
  assert.ok(fit.curve.length > 2 && fit.curve.every(point => point.y > 0));
  assert.ok(Math.abs(withZero.mid / fit.mid - 1) < 1e-12);
});

test('PCHIP mode recalculates every Dit site and the Results summary', () => {
  const site = factor => ({
    VDark: 0, Vsb: 0.2, InitialQc: 0,
    rows: [0, 1, 4, 5, 12].map((step, i) => ({
      Qc: step * factor * 1e11, VDark: i * 0.02, VLight: i * 0.01, Vsb: 0.05 + i * 0.1
    }))
  });
  const data = { sites: [site(1), site(1.7)], doping: 1e14, dopingType: 'n', useCocosII: false };
  const linear = PV2000.modules.dit.analyze(data, { pchipScale: 'linear' });
  const log = PV2000.modules.dit.analyze(data, { pchipScale: 'log10' });
  assert.equal(log.options.pchipScale, 'log10');
  assert.equal(log.stats.MidgapDit.count, 2);
  for (let i = 0; i < data.sites.length; i++) {
    assert.ok(Math.abs(linear.sites[i].MidgapDit / log.sites[i].MidgapDit - 1) > 0.01);
    assert.equal(log.sites[i].Dit, linear.sites[i].Dit);
    assert.equal(log.sites[i].directRaw.length, data.sites[i].rows.length - 1);
  }
  const expectedMean = (log.sites[0].MidgapDit + log.sites[1].MidgapDit) / 2;
  assert.ok(Math.abs(log.stats.MidgapDit.mean / expectedMean - 1) < 1e-12);
  assert.notEqual(log.stats.MidgapDit.mean, linear.stats.MidgapDit.mean);
});
