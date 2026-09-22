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


test('Follow XML setting resolves COCOS-II XMLs to the inferred PV2000 path', () => {
  const base = { sites: [], doping: 1e14, dopingType: 'n', cocosIIEOT: 100 };
  const standard = PV2000.modules.dit.analyze({ ...base, useCocosII: false });
  const inferred = PV2000.modules.dit.analyze({ ...base, useCocosII: true });
  const obsoleteGuideRequest = PV2000.modules.dit.analyze({ ...base, useCocosII: true }, { cocosMode: 'guide' });
  assert.equal(standard.options.cocosMode, 'xml');
  assert.equal(standard.options.effectiveCocosMode, 'standard');
  assert.equal(inferred.options.cocosMode, 'xml');
  assert.equal(inferred.options.effectiveCocosMode, 'pv2000-re');
  assert.equal(inferred.mode, 'PV2000 COCOS-II (inferred)');
  assert.equal(obsoleteGuideRequest.options.cocosMode, 'xml');
  assert.equal(obsoleteGuideRequest.options.effectiveCocosMode, 'pv2000-re');
});


test('Analysis controls preserve open state and expose only current COCOS methods', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(require.resolve('../src/modules/dit.js'), 'utf8');
  assert.match(source, /analysisOpen=true/);
  assert.match(source, /analysisOpen\?'open':''/);
  assert.match(source, /Follow XML setting/);
  assert.match(source, /PV2000 COCOS-II \(inferred\)/);
  assert.doesNotMatch(source, /Advanced \/ legacy methods/);
  assert.doesNotMatch(source, /Use Legacy COCOS-II/);
  assert.doesNotMatch(source, /value="guide"/);
});


test('invalid COCOS-II settings do not silently fall back to Standard COCOS', () => {
  const site = factor => ({
    VDark: 0, Vsb: 0.2, InitialQc: 0,
    rows: Array.from({ length: 10 }, (_, i) => ({
      Qc: i * factor * 1e11,
      VDark: i * 0.03,
      VLight: i * 0.015,
      Vsb: 0.05 + i * 0.06
    }))
  });
  const data = {
    sites: [site(1), site(1.3)],
    doping: 1e14,
    dopingType: 'n',
    useCocosII: true,
    cocosIIEOT: 100,
    cocosIIMinVsb: -0.1,
    cocosIIMaxVsb: 0.65
  };
  const analysis = PV2000.modules.dit.analyze(data, {
    cocosMode: 'pv2000-re',
    cocosIIEOT_A: 100,
    cocosIIMinVsb: 0,
    cocosIIMaxVsb: 0
  });
  assert.match(analysis.error, /Max Vsb must be greater than Min Vsb/);
  assert.ok(analysis.sites.every(siteResult => !Number.isFinite(siteResult.Dit)));
});

test('COCOS-II recommendation returns finite data-driven EOT and safe Vsb bounds', () => {
  const site = factor => ({
    VDark: 0, Vsb: 0.2, InitialQc: 0,
    rows: Array.from({ length: 10 }, (_, i) => ({
      Qc: i * factor * 1e11,
      VDark: i * 0.03,
      VLight: i * 0.015,
      Vsb: 0.05 + i * 0.06
    }))
  });
  const data = { sites: [site(1), site(1.3)], doping: 1e14, dopingType: 'n', useCocosII: true, cocosIIEOT: 100 };
  const rec = PV2000.modules.dit.cocosRecommendation(data, 5);
  assert.ok(Number.isFinite(rec.eotA) && rec.eotA > 0);
  assert.ok(Number.isFinite(rec.minVsb));
  assert.ok(Number.isFinite(rec.maxVsb));
  assert.ok(rec.maxVsb > rec.minVsb);
});

test('COCOS-II PCHIP uses accepted window points while minimum Dit remains discrete', () => {
  const data = { doping: 1e14, dopingType: 'n' };
  const site = {
    rows: [
      { Qc: 0, Vsb: 0.05 }, { Qc: 1e11, Vsb: 0.15 },
      { Qc: 2e11, Vsb: 0.25 }, { Qc: 3e11, Vsb: 0.35 }
    ]
  };
  const result = PV2000.modules.dit.variation(site, data, 2e13, [0.05, 0.15, 0.25, 0.35], 'log10', { min: 0.1, max: 0.3 });
  assert.deepEqual(result.accepted, [false, true, true]);
  assert.equal(result.acceptedCount, 2);
  assert.ok(Number.isFinite(result.min));
});


test('optional PCHIP defaults on and can be disabled without changing discrete minimum Dit', () => {
  const data = { doping: 1e14, dopingType: 'n' };
  const site = {
    rows: [
      { Qc: 0, Vsb: 0.05 }, { Qc: 1e11, Vsb: 0.15 },
      { Qc: 2e11, Vsb: 0.25 }, { Qc: 3e11, Vsb: 0.35 }
    ]
  };
  const enabled = PV2000.modules.dit.variation(site, data, 2e13, [0.05,0.15,0.25,0.35], 'log10', null, true);
  const disabled = PV2000.modules.dit.variation(site, data, 2e13, [0.05,0.15,0.25,0.35], 'log10', null, false);
  assert.equal(enabled.min, disabled.min);
  assert.ok(enabled.curve.length > 0 || Number.isFinite(enabled.mid));
  assert.equal(disabled.curve.length, 0);
  assert.ok(Number.isNaN(disabled.mid));

  const base = { sites: [], doping: 1e14, dopingType: 'n', useCocosII: false };
  assert.equal(PV2000.modules.dit.analyze(base).options.pchipEnabled, true);
  assert.equal(PV2000.modules.dit.analyze(base,{pchipEnabled:false}).options.pchipEnabled, false);
});
