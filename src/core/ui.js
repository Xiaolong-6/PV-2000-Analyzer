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

  PV.ui={escapeHtml,help,cssVar,setupTooltip,showTooltip,hideTooltip};
})(typeof window!=='undefined'?window:globalThis);
