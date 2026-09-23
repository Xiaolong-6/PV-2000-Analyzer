(function(root){
  const PV=root.PV2000=root.PV2000||{};

  function escapeHtml(value){
    return String(value??'').replace(/[&<>"']/g,char=>({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[char]));
  }

  function help(text){
    return `<span class="help" title="${escapeHtml(text)}">i</span>`;
  }

  function cssVar(name){
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function setupTooltip(canvas){
    let tip=canvas.parentElement.querySelector('.plot-tooltip');
    if(!tip){
      tip=document.createElement('div');
      tip.className='plot-tooltip hidden';
      canvas.parentElement.appendChild(tip);
    }
    return tip;
  }

  function showTooltip(tip,event,html){
    tip.innerHTML=html;
    tip.classList.remove('hidden');
    const rect=tip.parentElement.getBoundingClientRect();
    tip.style.left=`${Math.min(rect.width-tip.offsetWidth-8,Math.max(8,event.clientX-rect.left+12))}px`;
    tip.style.top=`${Math.min(rect.height-tip.offsetHeight-8,Math.max(8,event.clientY-rect.top+12))}px`;
  }

  function hideTooltip(tip){
    tip.classList.add('hidden');
  }

  function validDataFilterMarkup({
    prefix,
    metrics,
    state,
    title='Valid-data filter',
    helpText='Choose a result quantity and numeric range. The resulting site mask is shared by summaries, maps, distributions and exports.',
    centralLabel='1–99%',
    centralTitle='Set limits to the 1st–99th percentile of the selected filter metric.',
    resetTitle='Reset the range to all available sites for the selected filter metric.',
    applyTitle='Apply the entered lower/upper limits to the shared site mask.'
  }={}){
    if(!prefix)throw new Error('Valid-data filter prefix is required.');
    const options=Object.values(metrics||{}).map(metric=>
      `<option value="${escapeHtml(metric.key)}"${metric.key===state.metricKey?' selected':''}>${escapeHtml(metric.short||metric.label||metric.key)}</option>`
    ).join('');
    const lower=Number.isFinite(state.lower)?state.lower:'',
      upper=Number.isFinite(state.upper)?state.upper:'';
    return `<section class="panel valid-data-filter"><h3>${escapeHtml(title)} ${help(helpText)}</h3>
      <div class="filter-grid">
        <label>Filter metric<select id="${prefix}Metric">${options}</select></label>
        <label>Lower<input id="${prefix}Lo" type="number" step="any" value="${lower}"></label>
        <label>Upper<input id="${prefix}Hi" type="number" step="any" value="${upper}"></label>
      </div>
      <div class="filter-actions">
        <span><b id="${prefix}Count">${state.validCount}</b> / ${state.siteCount} valid</span>
        <span class="grow"></span>
        <button id="${prefix}Central" title="${escapeHtml(centralTitle)}">${escapeHtml(centralLabel)}</button>
        <button id="${prefix}Reset" title="${escapeHtml(resetTitle)}">Reset</button>
        <button id="${prefix}Apply" title="${escapeHtml(applyTitle)}">Apply</button>
      </div>
    </section>`;
  }

  function bindValidDataFilter(host,{
    prefix,
    controller,
    onChange,
    onError=message=>alert(message)
  }={}){
    const get=id=>host.querySelector(`#${prefix}${id}`),
      metric=get('Metric'),
      lo=get('Lo'),
      hi=get('Hi'),
      count=get('Count');
    if(!metric||!lo||!hi)return;

    function sync(state){
      metric.value=state.metricKey;
      lo.value=Number.isFinite(state.lower)?state.lower:'';
      hi.value=Number.isFinite(state.upper)?state.upper:'';
      if(count)count.textContent=state.validCount;
      onChange?.(state);
    }

    metric.onchange=()=>{
      try{sync(controller.setMetric(metric.value))}catch(error){onError(error.message)}
    };
    get('Central').onclick=()=>{
      try{sync(controller.central(.01,.99))}catch(error){onError(error.message)}
    };
    get('Reset').onclick=()=>{
      try{sync(controller.reset())}catch(error){onError(error.message)}
    };
    get('Apply').onclick=()=>{
      try{sync(controller.apply(Number(lo.value),Number(hi.value)))}catch(error){onError(error.message)}
    };
  }

  PV.ui={escapeHtml,help,cssVar,setupTooltip,showTooltip,hideTooltip,validDataFilterMarkup,bindValidDataFilter};
})(typeof window!=='undefined'?window:globalThis);
