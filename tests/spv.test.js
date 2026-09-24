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
