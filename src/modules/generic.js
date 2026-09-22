(function(root){
  const PV=root.PV2000=root.PV2000||{},X=PV.xml,esc=PV.ui.escapeHtml;

  function parse(parsed){
    return{...X.common(parsed),parsed};
  }

  function analyze(d){
    return d;
  }

  function render(host,d){
    const m=d.parsed.measurement,rows=[];
    for(const c of X.children(m)){
      if(c.children.length)continue;
      const v=c.textContent.trim();
      if(v)rows.push([X.lname(c),v]);
    }

    host.innerHTML=`
      <div class="generic">
        <section class="panel">
          <h2>Unsupported measurement type</h2>
          <p>The XML was parsed successfully, but no dedicated analyzer is registered for <code>${esc(d.type||'unknown')}</code>.</p>
          <dl class="meta">
            <dt>Result</dt><dd>${esc(d.resultName)}</dd>
            <dt>Recipe</dt><dd>${esc(d.name)}</dd>
            <dt>Substrate</dt><dd>${esc(d.substrateId)}</dd>
            <dt>Status</dt><dd>${esc(d.status)}</dd>
          </dl>
        </section>
        <section class="panel">
          <h3>Top-level measurement fields</h3>
          <div class="table-wrap">
            <table><tbody>${rows.map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</tbody></table>
          </div>
        </section>
      </div>
    `;
  }

  PV.modules=PV.modules||{};
  PV.modules.generic={fallback:true,parse,analyze,render};
  PV.registry.register(PV.modules.generic);
})(typeof window!=='undefined'?window:globalThis);
