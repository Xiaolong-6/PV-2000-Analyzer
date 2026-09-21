(function(root){
  const PV=root.PV2000=root.PV2000||{};let manual=false;
  const system=()=>root.matchMedia&&root.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
  const current=()=>document.documentElement.dataset.theme||system();
  function apply(theme,isManual=false){if(isManual){manual=true;document.documentElement.dataset.theme=theme}else if(!manual)document.documentElement.removeAttribute('data-theme');document.dispatchEvent(new CustomEvent('pv-theme-change',{detail:{theme:current()}}))}
  function toggle(){apply(current()==='dark'?'light':'dark',true)}
  if(root.matchMedia){const mq=root.matchMedia('(prefers-color-scheme: dark)');mq.addEventListener?.('change',()=>{if(!manual)apply(system(),false)})}
  PV.theme={system,current,apply,toggle};
})(typeof window!=='undefined'?window:globalThis);
