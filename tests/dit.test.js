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
  const fit = PV2000.modules.dit.makeCurve(sample.x, sample.dit, sample.data, Infinity, 'linear');
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
  const defaultAnalysis = PV2000.modules.dit.analyze(data);
  const linear = PV2000.modules.dit.analyze(data, { pchipScale: 'linear' });
  const log = PV2000.modules.dit.analyze(data, { pchipScale: 'log10' });
  assert.equal(defaultAnalysis.options.pchipScale, 'log10');
  assert.equal(defaultAnalysis.stats.MidgapDit.mean, log.stats.MidgapDit.mean);
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


test('Median-binned PCHIP groups nearby Vsb points and takes the median in the selected interpolation space', () => {
  const x = [0.101, 0.109, 0.300, 0.500];
  const y = [1e10, 1e12, 1e11, 1e12];
  const logFit = PV2000.modules.dit.makeCurve(x, y, sample.data, Infinity, 'log10', 'median', 0.010);
  const linearFit = PV2000.modules.dit.makeCurve(x, y, sample.data, Infinity, 'linear', 'median', 0.010);
  assert.equal(logFit.knots.length, 3);
  assert.equal(linearFit.knots.length, 3);
  assert.ok(Math.abs(logFit.knots[0].x - 0.105) < 1e-12);
  assert.ok(Math.abs(logFit.knots[0].y / 1e11 - 1) < 1e-12);
  assert.ok(Math.abs(linearFit.knots[0].y / 5.05e11 - 1) < 1e-12);
});

test('Midgap Dit defaults to 10 mV Median-binned PCHIP while original PCHIP remains selectable', () => {
  const base = { sites: [], doping: 1e14, dopingType: 'n', useCocosII: false };
  const def = PV2000.modules.dit.analyze(base);
  const original = PV2000.modules.dit.analyze(base, { pchipMethod: 'original' });
  assert.equal(def.options.pchipMethod, 'median');
  assert.equal(def.options.pchipMedianWindowV, 0.010);
  assert.equal(original.options.pchipMethod, 'original');
});

test('PCHIP preprocessing choices never change the PV2000-style discrete minimum', () => {
  const site = {
    VDark: 0, Vsb: 0.2, InitialQc: 0,
    rows: [0, 1, 2, 4, 7, 11].map((step, i) => ({
      Qc: step * 1e11, VDark: i * 0.02, VLight: i * 0.01, Vsb: [0.101, 0.109, 0.20, 0.30, 0.40, 0.50][i]
    }))
  };
  const data = { sites: [site], doping: 1e14, dopingType: 'n', useCocosII: false };
  const original = PV2000.modules.dit.analyze(data, { pchipMethod: 'original', pchipScale: 'log10' });
  const median5 = PV2000.modules.dit.analyze(data, { pchipMethod: 'median', pchipMedianWindowV: 0.005, pchipScale: 'log10' });
  const median20Linear = PV2000.modules.dit.analyze(data, { pchipMethod: 'median', pchipMedianWindowV: 0.020, pchipScale: 'linear' });
  assert.equal(original.sites[0].Dit, median5.sites[0].Dit);
  assert.equal(original.sites[0].Dit, median20Linear.sites[0].Dit);
});

test('invalid median window is surfaced', () => {
  const base = { sites: [], doping: 1e14, dopingType: 'n', useCocosII: false };
  const analysis = PV2000.modules.dit.analyze(base, { pchipMethod: 'median', pchipMedianWindowV: 0 });
  assert.match(analysis.error, /Median Vsb window must be greater than 0 mV/);
});
