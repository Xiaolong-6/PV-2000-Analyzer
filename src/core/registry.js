(function(root){
  const PV=root.PV2000=root.PV2000||{},mods=[];
  function register(m){mods.push(m)}
  function resolve(type){return mods.find(m=>m.types?.includes(type))||mods.find(m=>m.fallback)}
  PV.registry={register,resolve,list:()=>mods.slice()};
})(typeof window!=='undefined'?window:globalThis);
