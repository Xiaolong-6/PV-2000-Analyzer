(function(root){
  const PV=root.PV2000;
  const $=q=>document.querySelector(q);
  let current=null;
  function setStatus(t){$('#status').textContent=t||''}
  async function openFile(file){
    if(!file)return;
    setStatus('Loading…');
    try{
      const text=await file.text(),
      parsed=PV.xml.parse(text),
      mod=PV.registry.resolve(parsed.type),
      data=mod.parse(parsed),
      analysis=mod.analyze(data);
      current={file,parsed,mod,data,analysis};
      $('#landing').classList.add('hidden');
      $('#app').classList.remove('hidden');
      $('#fileName').textContent=file.name;
      $('#measurementType').textContent=parsed.type||'Unknown';
      mod.render($('#moduleHost'),data,analysis,{file});
      setStatus('')}catch(e){console.error(e);
      setStatus(e.message);
      alert(e.message)}}
  function bindInput(id){$(id).addEventListener('change',e=>openFile(e.target.files?.[0]))}
  bindInput('#openLanding');bindInput('#openTop');
  const drop=$('#dropZone');
    drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('drag')});
    drop.addEventListener('dragleave',()=>drop.classList.remove('drag'));
    drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('drag');openFile(e.dataTransfer.files?.[0])});
    
  $('#themeBtn').onclick=()=>PV.theme.toggle();document.addEventListener('pv-theme-change',()=>{$('#themeBtn').textContent=PV.theme.current()==='dark'?'Dark':'Light'});PV.theme.apply(PV.theme.system(),false);
})(typeof window!=='undefined'?window:globalThis);
