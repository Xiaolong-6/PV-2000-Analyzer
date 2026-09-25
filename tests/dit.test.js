const test = require('node:test');
const assert = require('node:assert/strict');

global.PV2000 = {};
require('../src/core/stats.js');
require('../src/core/selection.js');
require('../src/core/geometry.js');
require('../src/core/registry.js');
PV2000.xml = {};
require('../src/modules/dit.js');

const targetVsb = 0.3;
const doping = 9.65e9 * Math.exp(targetVsb * 1.60218e-19 / (1.38e-23 * 300));
const sample = { x: [0.1, 0.5], dit: [1e10, 1e12], data: { doping } };

test('Qsc uses the same legacy MATLAB ni as the midgap target', () => {
  const q = 1.60218e-19;
  const k = 1.38e-23;
  const T = 300;
  const eps0 = 8.85e-12;
  const eps = 11.68;
  const vsb = 0.6;
  const dopingCm3 = 1e15;

  const expectedQsc = niCm3 => {
    const ni = niCm3 * 1e6;
    const Nd = dopingCm3 * 1e6;
    const p0 = ni * ni / Nd;
    const n0 = Nd;
    const beta = q / (k * T);
    const term = (Math.exp(-beta * vsb) + beta * vsb - 1)
      + (p0 / n0) * (Math.exp(beta * vsb) - beta * vsb - 1);
    return -Math.sqrt(2 * k * T * eps0 * eps * n0) * Math.sqrt(Math.max(0, term)) * 1e-4 / q;
  };

  const actual = PV2000.modules.dit.qsc(vsb, dopingCm3, 'n');
  const legacyMidgapExpected = expectedQsc(9.65e9);
  const roundedLegacyExpected = expectedQsc(1.00e10);
  assert.ok(Math.abs(actual / legacyMidgapExpected - 1) < 1e-12);
  assert.ok(Math.abs(actual / roundedLegacyExpected - 1) > 1e-4);
});

test('Ge Qsc restores the legacy MATLAB ni and permittivity constants', () => {
  const q = 1.60218e-19, k = 1.38e-23, T = 300, eps0 = 8.85e-12;
  const vsb = 0.3, dopingCm3 = 1.5e15, ni = 2e13 * 1e6, Nd = dopingCm3 * 1e6;
  const p0 = ni * ni / Nd, n0 = Nd, beta = q / (k * T);
  const term = (Math.exp(-beta * vsb) + beta * vsb - 1)
    + (p0 / n0) * (Math.exp(beta * vsb) - beta * vsb - 1);
  const expected = -Math.sqrt(2 * k * T * eps0 * 16.2 * n0) * Math.sqrt(Math.max(0, term)) * 1e-4 / q;
  const actual = PV2000.modules.dit.qsc(vsb, dopingCm3, 'n', 'Ge');
  assert.ok(Math.abs(actual / expected - 1) < 1e-12);
});

test('material selection moves theoretical midgap target and defaults to Si', () => {
  const data = { sites: [], doping: 1.5e15, dopingType: 'n', useCocosII: false };
  const si = PV2000.modules.dit.analyze(data);
  const ge = PV2000.modules.dit.analyze(data, { material: 'Ge' });
  const k = 1.38e-23, T = 300, q = 1.60218e-19;
  const expectedSi = Math.abs(k * T / q * Math.log(data.doping / 9.65e9));
  const expectedGe = Math.abs(k * T / q * Math.log(data.doping / 2e13));
  assert.equal(si.options.material, 'Si');
  assert.equal(ge.options.material, 'Ge');
  assert.ok(Math.abs(PV2000.modules.dit.midgapTargetV({ ...data, material: 'Si' }) - expectedSi) < 1e-12);
  assert.ok(Math.abs(PV2000.modules.dit.midgapTargetV({ ...data, material: 'Ge' }) - expectedGe) < 1e-12);
  assert.ok(expectedSi - expectedGe > 0.15);
});

test('Standard COCOS Vsb keeps the doping-aware vendor sign convention', () => {
  const n = PV2000.modules.dit.standardVsb(0.1, 0.2, 1.2, 'n');
  const p = PV2000.modules.dit.standardVsb(0.1, 0.2, 1.2, 'p');
  assert.ok(Math.abs(n - 0.12) < 1e-12);
  assert.ok(Math.abs(p + 0.12) < 1e-12);
});

test('DIT InitialQc includes the initial state before preprocess charge attempts', () => {
  const calc = PV2000.modules.dit.initialQcFromPreprocess;
  assert.equal(calc(5, -1e11), -6e11);
  assert.equal(calc(1, -5e11), -1e12);
  assert.equal(calc(36, -1e11), -3.7e12);
  assert.equal(calc(2, -1e14), -3e14);
  assert.ok(Number.isNaN(calc(2, NaN)));
});

test('DIT final-result validator keeps regenerated light and Vsb drift diagnostic-only', () => {
  const fs = require('node:fs');
  const src = fs.readFileSync(require.resolve('../scripts/validate_dit_result_reference.py'), 'utf8');
  assert.match(src, /Initial Qc preprocess bookkeeping/);
  assert.match(src, /VLight and Vsb are printed as diagnostics/);
  assert.match(src, /attempts \+ 1/);
  assert.match(src, /VDark max=/);
  assert.match(src, /VLight diagnostic max=/);
  assert.match(src, /Vsb diagnostic max=/);
});

test('OnePoint circular substrate uses nominal geometry instead of point extent', () => {
  const g = PV2000.modules.dit.spatialEnvelope(
    { patternType: 'OnePointPattern', shapeType: 'Circle', radius: 50, edgeExclusion: 4 },
    [{ x: 0, y: 0 }]
  );
  assert.equal(g.onePoint, true);
  assert.equal(g.kind, 'round');
  assert.equal(g.radius, 50);
  assert.equal(g.innerRadius, 46);
  assert.equal(g.coordRadius, 0);
  assert.equal(g.geometrySource, 'substrate');
});

test('explicit RoundWafer target geometry takes precedence when present', () => {
  const g = PV2000.modules.dit.spatialEnvelope(
    { patternType: 'OnePointPattern', shapeType: 'Circle', radius: 75, targetType: 'RoundWafer', diameter: 100, edgeExclusion: 4 },
    [{ x: 0, y: 0 }]
  );
  assert.equal(g.radius, 50);
  assert.equal(g.innerRadius, 46);
  assert.equal(g.geometrySource, 'target');
});

test('NinePoint normalized coefficients map onto the EdgeExclusion-adjusted wafer radius', () => {
  const c = Math.sqrt(0.4);
  const raw = [
    {x:0,y:0},
    {x:-c,y:0},{x:c,y:0},{x:0,y:-c},{x:0,y:c},
    {x:-c,y:-c},{x:c,y:-c},{x:-c,y:c},{x:c,y:c}
  ];
  const g=PV2000.geometry.resolveMeasurementGeometry({
    patternType:'NinePointPattern',
    targetType:'RoundWafer',
    rawCoefficients:raw,
    pointCount:9,
    diameter:100,
    edgeExclusion:4
  });
  const expected=c*46;
  assert.equal(g.sourceSpace,'normalized-target-coefficient');
  assert.equal(g.interpretation,'target-relative-fixed-point-pattern');
  assert.equal(g.evidenceStatus,'inferred');
  assert.equal(g.nominal.radius,50);
  assert.equal(g.scheduled.radius,46);
  assert.ok(Math.abs(g.pointsMm[1].x+expected)<1e-12);
  assert.ok(Math.abs(g.pointsMm[2].x-expected)<1e-12);
  assert.ok(expected>29&&expected<30);
  assert.notEqual(g.pointsMm[1].x,raw[1].x);
});

test('variation-method Dit changes with semiconductor material', () => {
  const site = { rows: [0.05,0.12,0.20,0.30,0.42].map((vsb,i)=>({
    Qc:i*3e11, VDark:i*0.02, VLight:i*0.01, Vsb:vsb
  })) };
  const base = { doping: 1.5e15, dopingType: 'n' };
  const si = PV2000.modules.dit.variation(site, { ...base, material: 'Si' });
  const ge = PV2000.modules.dit.variation(site, { ...base, material: 'Ge' });
  assert.equal(si.raw.length, ge.raw.length);
  assert.ok(si.raw.some((v,i)=>Number.isFinite(v)&&Number.isFinite(ge.raw[i])&&Math.abs(v/ge.raw[i]-1)>1e-3));
});

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


test('PCHIP outlier limit is disabled by default but a finite manual limit is still supported', () => {
  const base = { sites: [], doping: 1e14, dopingType: 'n', useCocosII: false };
  const def = PV2000.modules.dit.analyze(base);
  assert.equal(def.options.ditReject, Infinity);
  const x = [0.05, 0.15, 0.25];
  const y = [1e13, 1e14, 1e13];
  const noLimit = PV2000.modules.dit.makeCurve(x, y, sample.data, Infinity, 'log10', 'original');
  const manualLimit = PV2000.modules.dit.makeCurve(x, y, sample.data, 2e13, 'log10', 'original');
  assert.equal(noLimit.knots.length, 3);
  assert.equal(manualLimit.knots.length, 2);
});

test('Midgap Dit is unavailable when theoretical midgap lies outside measured Vsb coverage', () => {
  const site = {
    VDark: 0, Vsb: 0.05, InitialQc: 0,
    rows: [0.01, 0.05, 0.10, 0.15, 0.218].map((vsb, i) => ({
      Qc: i * 4e11, VDark: i * 0.02, VLight: i * 0.01, Vsb: vsb
    }))
  };
  const data = { sites: [site], doping: 1.5e15, dopingType: 'n', useCocosII: false };
  const analysis = PV2000.modules.dit.analyze(data);
  assert.ok(analysis.sites[0].midgapV > 0.30);
  assert.equal(analysis.sites[0].midgapStatus, 'outside-measured');
  assert.ok(Number.isNaN(analysis.sites[0].MidgapDit));
  assert.equal(analysis.sites[0].midgapMeasuredMaxVsb, 0.218);
});

test('PCHIP never extrapolates beyond retained fit coverage', () => {
  const targetData = { doping: 1.5e15 };
  const fit = PV2000.modules.dit.makeCurve([0.02, 0.10, 0.218], [1e13, 2e13, 3e13], targetData, Infinity, 'log10', 'median', 0.010);
  assert.equal(fit.midgapCovered, false);
  assert.ok(Number.isNaN(fit.mid));
  assert.equal(fit.fitMaxVsb, 0.218);
});

test('non-positive finite PCHIP outlier limits are surfaced', () => {
  const base = { sites: [], doping: 1e14, dopingType: 'n', useCocosII: false };
  const analysis = PV2000.modules.dit.analyze(base, { ditReject: 0 });
  assert.match(analysis.error, /PCHIP outlier limit must be greater than 0 when set/);
});


test('DIT shared site filter keeps intrinsic algorithm validity separate from user range', () => {
  const analysis={
    options:{pchipEnabled:true},
    sites:[
      {valid:true,Qtot:1,Dit:10,MidgapDit:11,eot:1,Cox:1,Qsc:1,InitialQc:1,MaxVsb:.2},
      {valid:false,Qtot:2,Dit:20,MidgapDit:21,eot:2,Cox:2,Qsc:2,InitialQc:2,MaxVsb:.3},
      {valid:true,Qtot:3,Dit:30,MidgapDit:NaN,eot:3,Cox:3,Qsc:3,InitialQc:3,MaxVsb:.4},
      {valid:true,Qtot:4,Dit:40,MidgapDit:41,eot:4,Cox:4,Qsc:4,InitialQc:4,MaxVsb:.5}
    ]
  };
  const metrics=PV2000.modules.dit.filterMetrics(analysis);
  const filter=PV2000.selection.createFilter({
    metrics,
    siteCount:analysis.sites.length,
    intrinsicMask:analysis.sites.map(site=>site.valid),
    metricKey:'Qtot'
  });
  let state=filter.apply(2.5,4);
  assert.deepEqual(state.selection.intrinsicMask,[true,false,true,true]);
  assert.deepEqual(state.selection.activeMask,[false,false,true,true]);
  assert.deepEqual(filter.metricMask('MidgapDit'),[false,false,false,true]);
  assert.deepEqual(metrics.Dit.values,[10,20,30,40]);
  state=filter.reset();
  assert.deepEqual(state.selection.activeMask,[true,false,true,true]);
});

test('DIT filter candidates follow analysis availability without mutating calculations', () => {
  const site={valid:true,Qtot:1,Dit:2,MidgapDit:3,eot:4,Cox:5,Qsc:6,InitialQc:7,MaxVsb:.8};
  const withPchip=PV2000.modules.dit.filterMetrics({options:{pchipEnabled:true},sites:[site]});
  const withoutPchip=PV2000.modules.dit.filterMetrics({options:{pchipEnabled:false},sites:[site]});
  assert.equal(Object.keys(withPchip).length,8);
  assert.equal(Object.keys(withoutPchip).length,7);
  assert.ok(withPchip.MidgapDit);
  assert.equal(withoutPchip.MidgapDit,undefined);
  assert.equal(site.Dit,2);
  assert.equal(site.MidgapDit,3);
});

test('DIT renderer uses the shared Valid-data filter only for site population views', () => {
  const src=require('node:fs').readFileSync(require.resolve('../src/modules/dit.js'),'utf8');
  assert.match(src,/Sel\.createFilter/);
  assert.match(src,/intrinsicMask:analysis\.sites\.map\(x=>!!x\.valid\)/);
  assert.match(src,/PV\.ui\.validDataFilterMarkup/);
  assert.match(src,/PV\.ui\.bindValidDataFilter/);
  assert.match(src,/filterController\.metricMask\(metrics\[mapKey\]\)/);
  assert.match(src,/Pass valid-data filter/);
  assert.match(src,/ALGORITHM INVALID/);
  assert.match(src,/FILTERED \/ UNAVAILABLE/);
  assert.match(src,/validDataFilter:true/);
  assert.doesNotMatch(src,/filterController[^\n]*variation\(/);
});
