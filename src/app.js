(function(root){
  const PV=root.PV2000;
  const $=q=>document.querySelector(q);
  const collator=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});
  let current=null,folderFiles=[],folderIndex=-1,pendingFallbackDirection=0;

  function setStatus(t){$('#status').textContent=t||''}
  function clearFolderContext(){
    folderFiles=[];
    folderIndex=-1;
    pendingFallbackDirection=0;
    syncFolderNav();
  }
  function syncFolderNav(){
    const prev=$('#prevXml'),next=$('#nextXml');
    if(!prev||!next)return;
    const hasCurrent=!!current,hasFolder=folderFiles.length>0,hasMatchedFolder=hasFolder&&folderIndex>=0;
    prev.disabled=!hasCurrent||!hasMatchedFolder||folderIndex===0;
    next.disabled=!hasCurrent||!hasMatchedFolder||folderIndex===folderFiles.length-1;
    prev.title=hasMatchedFolder?'Load previous XML in the authorized folder':'Authorize this folder once to enable adjacent-file navigation';
    next.title=hasMatchedFolder?'Load next XML in the authorized folder':'Authorize this folder once to enable adjacent-file navigation';
    const access=$('#folderXmlAccess');
    if(access){
      access.disabled=!hasCurrent;
      access.title=hasMatchedFolder?'Change the authorized XML folder':'Authorize the current XML folder for ← / → navigation';
    }
  }
  async function openFile(file,{keepFolder=false}={}){
    if(!file)return;
    if(!keepFolder)clearFolderContext();
    setStatus('Loading…');
    try{
      const text=await file.text(),
      parsed=PV.xml.parse(text),
      mod=PV.registry.resolve(parsed.type),
      data=mod.parse(parsed),
      analysis=mod.analyze(data);
      current={file,parsed,mod,data,analysis};
      if(keepFolder&&folderFiles.length)folderIndex=folderFiles.findIndex(entry=>entry.name===file.name);
      $('#landing').classList.add('hidden');
      $('#app').classList.remove('hidden');
      $('#fileName').textContent=file.name;
      $('#measurementType').textContent=parsed.type||'Unknown';
      mod.render($('#moduleHost'),data,analysis,{file});
      setStatus('');
      syncFolderNav();
    }catch(e){console.error(e);
      setStatus(e.message);
      syncFolderNav();
      alert(e.message)}
  }
  function bindInput(id){$(id).addEventListener('change',e=>openFile(e.target.files?.[0]))}
  function fileEntry(file){return{name:file.name,getFile:async()=>file}}
  function sortEntries(entries){return entries.sort((a,b)=>collator.compare(a.name,b.name))}
  function fallbackFolderEntries(fileList){
    return sortEntries(Array.from(fileList||[])
      .filter(file=>/\.xml$/i.test(file.name))
      .filter(file=>{
        const relative=file.webkitRelativePath||'';
        return !relative||relative.split('/').filter(Boolean).length===2;
      })
      .map(fileEntry));
  }
  async function chooseFolder(){
    if(typeof root.showDirectoryPicker!=='function')return false;
    try{
      const directory=await root.showDirectoryPicker({mode:'read'}),entries=[];
      for await(const handle of directory.values()){
        if(handle.kind==='file'&&/\.xml$/i.test(handle.name)){
          entries.push({name:handle.name,getFile:()=>handle.getFile()});
        }
      }
      folderFiles=sortEntries(entries);
      folderIndex=current?folderFiles.findIndex(entry=>entry.name===current.file.name):-1;
      syncFolderNav();
      if(!folderFiles.length)setStatus('No XML files found in the selected folder.');
      return folderFiles.length>0;
    }catch(e){
      if(e?.name!=='AbortError'){console.error(e);setStatus('Could not read that folder.');}
      return false;
    }
  }
  async function navigateReady(step){
    if(!folderFiles.length)return;
    const target=folderIndex<0?(step>0?0:folderFiles.length-1):folderIndex+step;
    if(target<0||target>=folderFiles.length){
      setStatus(step<0?'Already at the first XML in this folder.':'Already at the last XML in this folder.');
      syncFolderNav();
      return;
    }
    try{
      const file=await folderFiles[target].getFile();
      folderIndex=target;
      await openFile(file,{keepFolder:true});
      folderIndex=target;
      syncFolderNav();
    }catch(e){console.error(e);setStatus('Could not open the adjacent XML file.')}
  }
  async function authorizeFolder(){
    if(!current)return;
    if(typeof root.showDirectoryPicker==='function'){
      const ok=await chooseFolder();
      if(ok&&folderIndex<0)setStatus('The current XML is not in the authorized folder.');
      else if(ok)setStatus('Folder authorized. Use ← / → to load adjacent XML files.');
      return;
    }
    pendingFallbackDirection=0;
    $('#folderXmlFallback').click();
  }
  async function navigateFolder(step){
    if(!current)return;
    if(!folderFiles.length||folderIndex<0){
      setStatus('Authorize the current XML folder once; ← / → never open a picker.');
      syncFolderNav();
      return;
    }
    await navigateReady(step);
  }

  bindInput('#openLanding');bindInput('#openTop');
  $('#prevXml').onclick=()=>navigateFolder(-1);
  $('#nextXml').onclick=()=>navigateFolder(1);
  $('#folderXmlAccess').onclick=()=>authorizeFolder();
  $('#folderXmlFallback').addEventListener('change',async e=>{
    folderFiles=fallbackFolderEntries(e.target.files);
    folderIndex=current?folderFiles.findIndex(entry=>entry.name===current.file.name):-1;
    syncFolderNav();
    pendingFallbackDirection=0;
    if(!folderFiles.length)setStatus('No XML files found in the selected folder.');
    else if(folderIndex<0)setStatus('The current XML is not in the selected folder.');
    else setStatus('Folder authorized. Use ← / → to load adjacent XML files.');
    e.target.value='';
  });

  const drop=$('#dropZone');
    drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('drag')});
    drop.addEventListener('dragleave',()=>drop.classList.remove('drag'));
    drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('drag');openFile(e.dataTransfer.files?.[0])});
    
  syncFolderNav();
  $('#themeBtn').onclick=()=>PV.theme.toggle();document.addEventListener('pv-theme-change',()=>{$('#themeBtn').textContent=PV.theme.current()==='dark'?'Dark':'Light'});PV.theme.apply(PV.theme.system(),false);
})(typeof window!=='undefined'?window:globalThis);
