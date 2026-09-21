(function(root){
  const PV=root.PV2000=root.PV2000||{};
  const esc=v=>{const s=String(v??'');return /[",\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s};
  function csv(name,headers,rows){const content=[headers.map(esc).join(','),...rows.map(r=>r.map(esc).join(','))].join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);a.remove()}
  PV.exporter={csv};
})(typeof window!=='undefined'?window:globalThis);
