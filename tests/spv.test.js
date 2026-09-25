const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
global.PV2000={};
require('../src/core/stats.js');
require('../src/core/geometry.js');
require('../src/core/validity.js');
require('../src/core/quantity.js');
require('../src/core/measurement.js');
require('../src/core/profiles.js');
require('../src/core/registry.js');
PV2000.xml={};
PV2000.ui={escapeHtml:String};
require('../src/profiles/spv.js');
require('../src/modules/spv.js');

test('SPV module registers dedicated measurement type',()=>{
  assert.deepEqual(PV2000.modules.spv.types,['SPVMeasurement']);
});

test('paired SPV valid point reproduces vendor DL and Tau',()=>{
  const settings={
    spv8Global:5.329166666666667,
    spv8ReducedGlobal:6.9295,
    linearityRatioOk:2.00009,
    wavelength8:778,
    wavelength6:933,
    chuckTemperature:24.017447199265384,
    ledTemperature:24.745944291398835,
    temperatureCorrection8:0,
    temperatureCorrection6:0,
    oxideThickness:4,
    reflectivity8:0,
    reflectivity6:0,
    useTextureCorrection:false,
    textureCorrection:.74,
    useEnhancedMode:false,
    isPType:true
  };
  const result=PV2000.modules.spv.calculatePoint(3.4875,3.174,settings);
  assert.ok(Math.abs(result.dl-374.322451991734)<1e-9);
  assert.ok(Math.abs(result.tau-42.0003127798019)<1e-9);
  assert.equal(result.spv8,3.4875);
  assert.equal(result.spv6,3.174);
});

test('paired SPV Enhanced N-type point reproduces finite-wafer vendor DL and Tau',()=>{
  const settings={
    spv8Global:0.26814333333333334,
    spv8ReducedGlobal:0.15328,
    linearityRatioOk:2.00009,
    wavelength8:778,wavelength6:933,
    chuckTemperature:23.668503213957759,
    ledTemperature:24.488827670645854,
    temperatureCorrection8:0,temperatureCorrection6:0,
    oxideThickness:20,reflectivity8:0,reflectivity6:0,
    useTextureCorrection:false,textureCorrection:.74,
    useEnhancedMode:true,waferThickness:625,bsrVelocity:10,isPType:false
  };
  const result=PV2000.modules.spv.calculatePoint(0.36846,0.3424,settings);
  assert.ok(Math.abs(result.dl-352.197526652801)<1e-6);
  assert.ok(Math.abs(result.tau-103.774531801151)<1e-6);
  assert.equal(result.undefinedValue,false);
  const unavailable=PV2000.modules.spv.calculatePoint(0.6,0.6,settings);
  assert.ok(Number.isNaN(unavailable.dl));
  assert.ok(Number.isNaN(unavailable.tau));
  assert.equal(unavailable.undefinedValue,true);
});

test('SPV invalid DL leaves raw channels available',()=>{
  const settings={
    spv8Global:2.1305833333333335,spv8ReducedGlobal:1.4516666666666669,linearityRatioOk:2.00009,
    wavelength8:778,wavelength6:933,chuckTemperature:23.705234159779614,ledTemperature:25.278543005815735,
    temperatureCorrection8:0,temperatureCorrection6:0,oxideThickness:4,reflectivity8:0,reflectivity6:0,
    useTextureCorrection:false,textureCorrection:.74,useEnhancedMode:false,isPType:true
  };
  const result=PV2000.modules.spv.calculatePoint(1.3545,1.4695,settings);
  assert.ok(Number.isNaN(result.dl));
  assert.ok(Number.isNaN(result.tau));
  assert.equal(result.spv8,1.3545);
  assert.equal(result.spv6,1.4695);
});

test('SPV build is loaded before generic fallback',()=>{
  const build=fs.readFileSync(require.resolve('../scripts/build.js'),'utf8');
  const moduleIndex=build.indexOf("'src/modules/spv.js'"),generic=build.indexOf("'src/modules/generic.js'");
  assert.ok(moduleIndex>=0);
  assert.ok(generic>moduleIndex);
});

test('SPV source uses shared filter, map and Distribution controls',()=>{
  const src=fs.readFileSync(require.resolve('../src/modules/spv.js'),'utf8');
  assert.match(src,/Sel\.createFilter/);
  assert.match(src,/validDataFilterMarkup/);
  assert.match(src,/bindValidDataFilter/);
  assert.match(src,/axisControls\('spvMapAxes'\)/);
  assert.match(src,/axisControls\('spvHistAxes'/);
  assert.match(src,/binControls\('spvHistBins'/);
  assert.match(src,/Q\.PROVENANCE\.RAW/);
  assert.match(src,/Q\.PROVENANCE\.DERIVED_COMPATIBILITY/);
});

test('ordinary numeric settings stay inside the standard SPV profile',()=>{
  const p=PV2000.profiles.resolveCalculation('spv',{
    type:'SPVMeasurement',
    sites:[{}],
    parseSignals:false,
    linearityRatioMethod:'UseMeasuredLR',
    useEnhancedMode:false,
    useTextureCorrection:false,
    dopingType:'PType',
    multiplier:500,
    wavelength8:772,
    wavelength6:934,
    oxideThickness:8
  });
  assert.equal(p?.id,'SPV-CALC-STANDARD-001');
});

test('categorical SPV branches remain profile-scoped',()=>{
  const base={
    type:'SPVMeasurement',sites:[{}],parseSignals:false,linearityRatioMethod:'UseMeasuredLR',useEnhancedMode:false,
    useTextureCorrection:false,dopingType:'PType',multiplier:1000,
    wavelength8:778,wavelength6:933,oxideThickness:4,
    waferThickness:625,bsrVelocity:10
  };
  assert.equal(PV2000.profiles.resolveCalculation('spv',{...base,useEnhancedMode:true}),null);
  assert.equal(PV2000.profiles.resolveCalculation('spv',{
    ...base,useEnhancedMode:true,dopingType:'NType',oxideThickness:20
  })?.id,'SPV-CALC-ENHANCED-N-003');
  assert.equal(PV2000.profiles.resolveCalculation('spv',{...base,useTextureCorrection:true}),null);
  assert.equal(PV2000.profiles.resolveCalculation('spv',{...base,dopingType:'NType'}),null);
  assert.equal(PV2000.profiles.resolveCalculation('spv',{
    ...base,oxideThickness:0,reflectivity8:0,reflectivity6:0
  })?.id,'SPV-CALC-ZERO-OXIDE-002');
  assert.equal(PV2000.profiles.resolveCalculation('spv',{
    ...base,oxideThickness:0,reflectivity8:.1,reflectivity6:0
  }),null);
});

test('vendor cross-maps nonzero LED temperature coefficients',()=>{
  const base={
    spv8Global:5.329166666666667,spv8ReducedGlobal:6.9295,linearityRatioOk:2.00009,
    wavelength8:778,wavelength6:933,chuckTemperature:24,ledTemperature:25,
    temperatureCorrection8:0,temperatureCorrection6:0,oxideThickness:4,
    reflectivity8:0,reflectivity6:0,useTextureCorrection:false,textureCorrection:.74,
    useEnhancedMode:false,isPType:true
  };
  const zero=PV2000.modules.spv.calculatePoint(3.4875,3.174,base);
  const led6=PV2000.modules.spv.calculatePoint(3.4875,3.174,{...base,temperatureCorrection6:.01});
  const led8=PV2000.modules.spv.calculatePoint(3.4875,3.174,{...base,temperatureCorrection8:.01});
  assert.ok(Math.abs(led6.corrected8-zero.corrected8*.99)<1e-12);
  assert.ok(Math.abs(led6.corrected6-zero.corrected6)<1e-12);
  assert.ok(Math.abs(led8.corrected8-zero.corrected8)<1e-12);
  assert.ok(Math.abs(led8.corrected6-zero.corrected6*.99)<1e-12);
});

test('manual linearity-ratio branch stays outside paired SPV validation',()=>{
  const base={
    type:'SPVMeasurement',sites:[{}],parseSignals:false,linearityRatioMethod:'UseMeasuredLR',
    useEnhancedMode:false,useTextureCorrection:false,dopingType:'PType',
    multiplier:1000,wavelength8:778,wavelength6:933,oxideThickness:4
  };
  assert.equal(PV2000.profiles.resolveCalculation('spv',base)?.id,'SPV-CALC-STANDARD-001');
  assert.equal(PV2000.profiles.resolveCalculation('spv',{...base,linearityRatioMethod:'UseManualLR'}),null);
});


test('SPV validator promotes paired Enhanced mode through the finite-wafer oracle',()=>{
  const src=fs.readFileSync(require.resolve('../scripts/validate_spv_reference.py'),'utf8');
  assert.match(src,/def enhanced_equation/);
  assert.match(src,/def enhanced_dl/);
  assert.match(src,/SPV ENHANCED PASS/);
  assert.match(src,/wafer_thickness/);
  assert.match(src,/bsr_velocity/);
  assert.match(src,/if enhanced or is_enhanced\(xml_path\)/);
});
