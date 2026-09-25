const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

require('../src/core/ui.js');

test('shared UI helpers escape HTML and build safe help markup',()=>{
  const UI=globalThis.PV2000.ui;
  assert.equal(UI.escapeHtml('<a x="1">&\'test\'</a>'),'&lt;a x=&quot;1&quot;&gt;&amp;&#39;test&#39;&lt;/a&gt;');
  assert.equal(UI.help('A "quoted" hint'),'<span class="help" title="A &quot;quoted&quot; hint">i</span>');
});

test('measurement modules reuse core UI helpers instead of redefining them',()=>{
  for(const file of ['dit.js','qss-upcd.js','lbic.js','generic.js']){
    const text=fs.readFileSync(require.resolve('../src/modules/'+file),'utf8');
    assert.doesNotMatch(text,/const esc=s=>/);
    assert.doesNotMatch(text,/function showTip\(/);
    assert.doesNotMatch(text,/function setupTooltip\(/);
  }
});

test('single-file build loads shared UI helpers before analyzers',()=>{
  const text=fs.readFileSync(require.resolve('../scripts/build.js'),'utf8');
  const ui=text.indexOf("'src/core/ui.js'");
  const dit=text.indexOf("'src/modules/dit.js'");
  const generic=text.indexOf("'src/modules/generic.js'");
  assert.ok(ui>=0);
  assert.ok(dit>ui);
  assert.ok(generic>ui);
});


test('shared UI exposes reusable valid-data filter markup and binder',()=>{
  const UI=globalThis.PV2000.ui;
  const state={metricKey:'dark',lower:.1,upper:.5,validCount:2,siteCount:3};
  const html=UI.validDataFilterMarkup({
    prefix:'tFilter',
    metrics:{
      dark:{key:'dark',short:'Vcpd Dark'},
      vsb:{key:'vsb',short:'VSB'}
    },
    state
  });
  assert.match(html,/Valid-data filter/);
  assert.match(html,/id="tFilterMetric"/);
  assert.match(html,/Vcpd Dark/);
  assert.match(html,/id="tFilterLo"[^>]*value="0.1"/);
  assert.match(html,/id="tFilterHi"[^>]*value="0.5"/);
  assert.match(html,/2<\/b> \/ 3 valid/);
  assert.equal(typeof UI.bindValidDataFilter,'function');
});


test('shared valid-data filter UI preserves defaults and supports QSS wording overrides',()=>{
  const UI=globalThis.PV2000.ui,
    state={metricKey:'lifetime',lower:10,upper:80,validCount:8,siteCount:9},
    metrics={lifetime:{key:'lifetime',short:'τeff.d'}},
    defaults=UI.validDataFilterMarkup({prefix:'d',metrics,state}),
    custom=UI.validDataFilterMarkup({
      prefix:'qFilter',metrics,state,
      centralTitle:'QSS central title',
      resetTitle:'QSS reset title',
      applyTitle:'QSS apply title'
    });
  assert.match(defaults,/Set limits to the 1st–99th percentile of the selected filter metric\./);
  assert.match(defaults,/Reset the range to all available sites for the selected filter metric\./);
  assert.match(custom,/title="QSS central title"/);
  assert.match(custom,/title="QSS reset title"/);
  assert.match(custom,/title="QSS apply title"/);
});


test('valid-data filter binder supports a linked displayed-metric select',()=>{
  const src=fs.readFileSync(require.resolve('../src/core/ui.js'),'utf8');
  assert.match(src,/linkedSelect=null/);
  assert.match(src,/linked\.value=controller\.snapshot\(\)\.metricKey/);
  assert.match(src,/controller\.setMetric\(linked\.value\)/);
  assert.match(src,/if\(linked&&linked\.value!==state\.metricKey\)linked\.value=state\.metricKey/);
});
