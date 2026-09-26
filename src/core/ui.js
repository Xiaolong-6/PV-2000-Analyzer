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

  function selectionStateFor(filterState,index,{intrinsicValid=true}={}){
    if(!intrinsicValid)return'ALGORITHM INVALID';
    const selection=filterState?.selection;
    if(!selection)return'UNAVAILABLE';
    return selection.supportMask?.[index]
      ?(selection.activeMask?.[index]?'VALID':'FILTERED')
      :'UNAVAILABLE';
  }

  function selectionStateBadge(state,{title=''}={}){
    const raw=String(state||'UNAVAILABLE').trim().toUpperCase(),
      active=['VALID','ACTIVE','AVAILABLE','DISPLAYED'].includes(raw),
      filtered=['FILTERED','EXCLUDED','PARTIAL'].includes(raw),
      invalid=raw==='ALGORITHM INVALID',
      tone=invalid?'invalid':active?'active':filtered?'filtered':'unavailable';
    return `<span class="selection-state selection-state-${tone}"${title?` title="${escapeHtml(title)}"`:''}>${escapeHtml(raw)}</span>`;
  }

  function selectionStateNote(state){
    const raw=String(state||'UNAVAILABLE').trim().toUpperCase();
    if(raw==='FILTERED')return'Outside the current range; local data remains inspectable.';
    if(raw==='UNAVAILABLE')return'The selected filter quantity is unavailable at this point.';
    if(raw==='ALGORITHM INVALID')return'This point is outside the analyzer algorithm-valid population.';
    if(raw==='VALID')return'Inside the current filter range.';
    return'';
  }

  function selectionStateRow(state,{label='Filter quantity',metric='',title='',note=null}={}){
    const detail=note===null?selectionStateNote(state):String(note||''),
      metricMarkup=metric?`<span class="selection-state-metric">${escapeHtml(metric)}</span><span class="selection-state-separator" aria-hidden="true">·</span>`:'';
    return `<dt>${escapeHtml(label)}</dt><dd class="selection-state-value"><span class="selection-state-line">${metricMarkup}${selectionStateBadge(state,{title})}</span>${detail?`<small class="selection-state-note">${escapeHtml(detail)}</small>`:''}</dd>`;
  }

  function formatNumericInputValue(value,{
    largeThreshold=1e6,
    smallThreshold=1e-4,
    significantDigits=6
  }={}){
    const n=Number(value);
    if(!Number.isFinite(n))return'';
    if(n===0)return'0';
    const magnitude=Math.abs(n);
    if(magnitude>=largeThreshold||magnitude<smallThreshold){
      const digits=Math.max(2,Math.min(12,Math.round(significantDigits))),
        [mantissa,exponent]=n.toExponential(digits-1).split('e'),
        compactMantissa=mantissa.replace(/\.?0+$/,'');
      return `${compactMantissa}e${Number(exponent)}`;
    }
    return String(n);
  }

  function setNumericInputValue(input,value,options){
    if(!input)return;
    const exact=Number.isFinite(value)?String(value):'',
      formatted=formatNumericInputValue(value,options);
    input.value=formatted;
    if(input.dataset){
      input.dataset.rawNumber=exact;
      input.dataset.formattedNumber=formatted;
    }
  }

  function readNumericInputValue(input){
    const shown=String(input?.value??'').trim(),
      raw=input?.dataset?.rawNumber,
      formatted=input?.dataset?.formattedNumber;
    return raw!==undefined&&shown===formatted?Number(raw):Number(shown);
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
    const lower=formatNumericInputValue(state.lower),
      upper=formatNumericInputValue(state.upper);
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
    linkedSelect=null,
    onChange,
    onError=message=>alert(message)
  }={}){
    const get=id=>host.querySelector(`#${prefix}${id}`),
      metric=get('Metric'),
      lo=get('Lo'),
      hi=get('Hi'),
      count=get('Count'),
      linked=typeof linkedSelect==='string'?host.querySelector(linkedSelect):linkedSelect;
    if(!metric||!lo||!hi)return;
    const initial=controller.snapshot();
    setNumericInputValue(lo,initial.lower);
    setNumericInputValue(hi,initial.upper);

    function sync(state){
      metric.value=state.metricKey;
      setNumericInputValue(lo,state.lower);
      setNumericInputValue(hi,state.upper);
      if(count)count.textContent=state.validCount;
      if(linked&&linked.value!==state.metricKey)linked.value=state.metricKey;
      onChange?.(state);
    }

    metric.onchange=()=>{
      try{sync(controller.setMetric(metric.value))}catch(error){onError(error.message)}
    };
    if(linked){
      linked.value=controller.snapshot().metricKey;
      linked.onchange=()=>{
        try{sync(controller.setMetric(linked.value))}catch(error){onError(error.message)}
      };
    }
    get('Central').onclick=()=>{
      try{sync(controller.central(.01,.99))}catch(error){onError(error.message)}
    };
    get('Reset').onclick=()=>{
      try{sync(controller.reset())}catch(error){onError(error.message)}
    };
    get('Apply').onclick=()=>{
      try{sync(controller.apply(readNumericInputValue(lo),readNumericInputValue(hi)))}catch(error){onError(error.message)}
    };
    return{sync};
  }

  PV.ui={
    escapeHtml,
    help,
    cssVar,
    setupTooltip,
    showTooltip,
    hideTooltip,
    selectionStateFor,
    selectionStateBadge,
    selectionStateRow,
    formatNumericInputValue,
    setNumericInputValue,
    readNumericInputValue,
    validDataFilterMarkup,
    bindValidDataFilter
  };
})(typeof window!=='undefined'?window:globalThis);
