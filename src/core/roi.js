(function(root){
  'use strict';
  const PV=root.PV2000=root.PV2000||{};
  const finite=Number.isFinite;
  const norm=a=>((a%360)+360)%360;
  const rad=a=>a*Math.PI/180;
  const deg=a=>a*180/Math.PI;
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rounded=n=>Math.round(n*10000)/10000;
  function valid(roi){
    const g=roi&&roi.geometry||{};
    if(!finite(g.cx)||!finite(g.cy))return false;
    if(roi.type==='rectangle')return finite(g.width)&&g.width>0&&finite(g.height)&&g.height>0&&finite(g.rotation);
    if(roi.type==='circle')return finite(g.radius)&&g.radius>0;
    if(roi.type==='sector')return finite(g.radius)&&g.radius>0&&finite(g.startDeg)&&finite(g.sweepDeg)&&g.sweepDeg>0&&g.sweepDeg<=360;
    return false;
  }
  function contains(roi,point){
    if(!valid(roi)||!finite(point?.x)||!finite(point?.y))return false;
    const g=roi.geometry,dx=point.x-g.cx,dy=point.y-g.cy,eps=1e-9;
    if(roi.type==='rectangle'){
      const a=rad(g.rotation),x=dx*Math.cos(a)+dy*Math.sin(a),y=-dx*Math.sin(a)+dy*Math.cos(a);
      return Math.abs(x)<=g.width/2+eps&&Math.abs(y)<=g.height/2+eps;
    }
    if(dx*dx+dy*dy>(g.radius+eps)**2)return false;
    // The sector vertex belongs to every angular span, independent of atan2(0,0).
    if(roi.type==='circle'||g.sweepDeg>=360||(dx===0&&dy===0))return true;
    const angle=norm(deg(Math.atan2(dy,dx)));
    return norm(angle-norm(g.startDeg))<=g.sweepDeg+1e-8;
  }
  function selectMask(coords,roi){
    return coords.map(pt=>contains(roi,pt));
  }
  function combineMasks(mask,coords,roi){
    if(!roi)return mask.slice();
    if(mask.length!==coords.length)throw new Error('ROI selection must share the site-index space.');
    return mask.map((ok,i)=>!!ok&&contains(roi,coords[i]));
  }
  function create({coords,onChange}={}){
    const points=Array.isArray(coords)?coords:[];
    const notify=typeof onChange==='function'?onChange:()=>{};
    let rois=[],activeId=null,scope='whole',mode='inspect',drawing=null,serial=0;
    let host=null,prefix='',panel=null,overlay=null,transform=null,drag=null,preview=null;
    const active=()=>rois.find(r=>r.id===activeId)||null;
    const chosen=()=>scope==='roi'?active():null;
    const label=()=>scope==='roi'&&active()?'ROI: '+active().name:'Whole sample';
    const mask=base=>combineMasks(base,Array.from({length:base.length},(_,i)=>points[i]||null),chosen());
    const html=key=>prefix+key;
    const number=v=>String(rounded(v));
    function changed(){refresh();notify();}
    function add(type,geometry){
      const roi={id:'roi-'+(++serial),name:'ROI '+serial,type,visible:true,geometry};
      if(!valid(roi))return null;
      rois.push(roi);activeId=roi.id;scope='roi';mode='edit';drawing=null;changed();return roi;
    }
    function remove(){
      rois=rois.filter(r=>r.id!==activeId);activeId=rois[0]?.id||null;
      if(!activeId)scope='whole';changed();
    }
    function toolbar(id){
      prefix=id;
      return '<button type="button" id="'+esc(id)+'Toggle" class="roi-toggle" title="Select a spatial ROI or draw Rectangle, Circle and Sector regions.">ROI</button>'+
        '<div class="roi-editor" id="'+esc(id)+'Panel" hidden></div>';
    }
    function fields(){
      const a=active(),g=a?.geometry||{};
      if(!a)return '<span class="roi-hint">Draw a Rectangle, Circle or Sector to select measured sites.</span>';
      const field=(key,text,value)=>'<label>'+text+'<input data-roi-field="'+key+'" type="number" step="any" value="'+esc(number(value))+'"></label>';
      let out='<div class="roi-field-grid">'+field('cx','Center X [mm]',g.cx)+field('cy','Center Y [mm]',g.cy);
      if(a.type==='rectangle')out+=field('width','Width [mm]',g.width)+field('height','Height [mm]',g.height)+field('rotation','Rotation [°]',g.rotation);
      else out+=field('radius','Radius [mm]',g.radius);
      if(a.type==='sector')out+=field('startDeg','Start [°]',g.startDeg)+field('sweepDeg','Sweep [°]',g.sweepDeg);
      return out+'</div><div class="roi-field-actions"><button data-roi-apply type="button">Apply</button><button data-roi-delete type="button">Delete ROI</button><button data-roi-export type="button">Export ROIs</button></div>';
    }
    function refresh(){
      if(!panel)return;
      const a=active();
      const editor=panel.hidden;
      panel.innerHTML='<div class="roi-main-row"><div class="roi-tools">'+
        ['rectangle','circle','sector'].map(type=>'<button type="button" data-roi-draw="'+type+'"'+(drawing===type?' class="roi-active-tool"':'')+'>'+type[0].toUpperCase()+type.slice(1)+'</button>').join('')+
        '<button type="button" data-roi-inspect'+(mode==='inspect'?' class="roi-active-tool"':'')+'>Inspect</button>'+
        '<button type="button" data-roi-edit'+(mode==='edit'&&!drawing?' class="roi-active-tool"':'')+'>Edit</button></div>'+
        '<label>Statistics <select data-roi-scope><option value="whole">Whole sample</option>'+
        (a?'<option value="roi">ROI: '+esc(a.name)+'</option>':'')+'</select></label>'+
        '<label>Selected ROI <select data-roi-select><option value="">None</option>'+
        rois.map(r=>'<option value="'+esc(r.id)+'">'+esc(r.name)+'</option>').join('')+'</select></label></div>'+
        (a?'<label class="roi-name-row">Name <input type="text" data-roi-name maxlength="60" value="'+esc(a.name)+'"></label>':'')+
        fields()+'<div class="roi-hint">Draw or drag in Map edit mode; controls use real X/Y coordinates in mm. Existing site inspection is preserved in Inspect mode.</div>';
      panel.hidden=editor;
      const scopeSelect=panel.querySelector('[data-roi-scope]');
      if(scopeSelect)scopeSelect.value=scope;
      const selection=panel.querySelector('[data-roi-select]');
      if(selection)selection.value=activeId||'';
      panel.querySelectorAll('[data-roi-draw]').forEach(button=>button.onclick=()=>{drawing=button.dataset.roiDraw;mode='edit';refresh();renderOverlay();});
      panel.querySelector('[data-roi-inspect]').onclick=()=>{drawing=null;mode='inspect';refresh();renderOverlay();};
      panel.querySelector('[data-roi-edit]').onclick=()=>{drawing=null;mode='edit';refresh();renderOverlay();};
      scopeSelect.onchange=()=>{scope=scopeSelect.value;changed();};
      selection.onchange=()=>{activeId=selection.value||null;if(!activeId)scope='whole';else scope='roi';changed();};
      const name=panel.querySelector('[data-roi-name]');
      if(name)name.onchange=()=>{if(active()){active().name=name.value.trim()||active().name;changed();}};
      const apply=panel.querySelector('[data-roi-apply]');
      if(apply)apply.onclick=()=>{
        const next={...active().geometry};
        panel.querySelectorAll('[data-roi-field]').forEach(input=>{next[input.dataset.roiField]=input.value.trim()?Number(input.value):NaN;});
        const updated={...active(),geometry:next};
        if(!valid(updated)){panel.querySelector('.roi-hint').textContent='Invalid ROI parameters. Width, height, radius and sweep must be positive; sweep must not exceed 360°.';return;}
        active().geometry=next;changed();
      };
      const del=panel.querySelector('[data-roi-delete]');
      if(del)del.onclick=remove;
      const exportBtn=panel.querySelector('[data-roi-export]');
      if(exportBtn)exportBtn.onclick=()=>PV.exporter.json('PV2000_roi.json',{
        schema:'PV2000-ROI-1',units:'mm',angleUnit:'degrees',rois:exportRows()
      });
      const toggle=host?.querySelector('#'+html('Toggle'));
      if(toggle){toggle.setAttribute('aria-expanded',String(!panel.hidden));toggle.textContent=scope==='roi'?'ROI •':'ROI';}
    }
    function bind(element,id){
      host=element;prefix=id;panel=host.querySelector('#'+html('Panel'));
      const toggle=host.querySelector('#'+html('Toggle'));
      if(!toggle||!panel)return;
      toggle.onclick=()=>{
        const opening=panel.hidden;
        const header=toggle.closest('header');
        if(opening)header?.querySelectorAll('.axis-popover-card:not([hidden])').forEach(box=>{
          box.hidden=true;
          box.__pvToggle?.setAttribute('aria-expanded','false');
        });
        panel.hidden=!opening;
        if(!opening){mode='inspect';drawing=null;renderOverlay();}
        refresh();
      };
      host.onkeydown=e=>{
        const editable=/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
        if(e.key==='Escape'&&mode!=='inspect'){
          mode='inspect';drawing=null;preview=null;drag=null;refresh();renderOverlay();e.preventDefault();
        }else if((e.key==='Delete'||e.key==='Backspace')&&!editable&&mode==='edit'&&active()){
          remove();renderOverlay();e.preventDefault();
        }
      };
      refresh();
    }
    function svgPoint(e){
      if(!overlay||!transform)return null;
      let p;
      try{
        const q=overlay.createSVGPoint();q.x=e.clientX;q.y=e.clientY;
        p=q.matrixTransform(overlay.getScreenCTM().inverse());
      }catch(_){
        const r=overlay.getBoundingClientRect();
        p={x:(e.clientX-r.left)*transform.W/r.width,y:(e.clientY-r.top)*transform.H/r.height};
      }
      const X=transform.X,Y=transform.Y,dx=X(1)-X(0),dy=Y(1)-Y(0);
      if(!dx||!dy)return null;
      return{pixel:p,x:(p.x-X(0))/dx,y:(p.y-Y(0))/dy};
    }
    function ellipse(p,r){
      return '<ellipse cx="'+transform.X(p.cx)+'" cy="'+transform.Y(p.cy)+'" rx="'+Math.abs(transform.X(p.cx+r)-transform.X(p.cx))+'" ry="'+Math.abs(transform.Y(p.cy+r)-transform.Y(p.cy))+'"/>';
    }
    function corners(g){
      const a=rad(g.rotation),c=Math.cos(a),s=Math.sin(a);
      return [[-1,-1],[1,-1],[1,1],[-1,1]].map(pair=>({
        x:g.cx+pair[0]*g.width/2*c-pair[1]*g.height/2*s,
        y:g.cy+pair[0]*g.width/2*s+pair[1]*g.height/2*c
      }));
    }
    function geomSvg(roi){
      const g=roi.geometry,X=transform.X,Y=transform.Y;
      if(roi.type==='circle')return ellipse(g,g.radius);
      let pts=[];
      if(roi.type==='rectangle')pts=corners(g);
      else{
        const samples=Math.max(3,Math.ceil(g.sweepDeg/4));
        pts=[{x:g.cx,y:g.cy}];
        for(let j=0;j<=samples;j++){
          const a=rad(g.startDeg+g.sweepDeg*j/samples);
          pts.push({x:g.cx+g.radius*Math.cos(a),y:g.cy+g.radius*Math.sin(a)});
        }
      }
      return '<polygon points="'+pts.map(pt=>X(pt.x)+','+Y(pt.y)).join(' ')+'"/>';
    }
    function handlePoint(type,g,key){
      if(key==='radius'){
        const angle=type==='sector'?g.startDeg+g.sweepDeg/2:0;
        return{x:g.cx+g.radius*Math.cos(rad(angle)),y:g.cy+g.radius*Math.sin(rad(angle))};
      }
      if(key==='start'||key==='end'){
        const a=rad(g.startDeg+(key==='end'?g.sweepDeg:0));
        return{x:g.cx+g.radius*Math.cos(a),y:g.cy+g.radius*Math.sin(a)};
      }
      const a=rad(g.rotation);
      if(key==='width')return{x:g.cx+Math.cos(a)*g.width/2,y:g.cy+Math.sin(a)*g.width/2};
      return{x:g.cx-Math.sin(a)*g.height/2,y:g.cy+Math.cos(a)*g.height/2};
    }
    function renderOverlay(){
      if(!overlay||!transform)return;
      overlay.setAttribute('viewBox','0 0 '+transform.W+' '+transform.H);
      overlay.style.pointerEvents=mode==='inspect'?'none':'auto';
      overlay.style.cursor=drawing?'crosshair':'default';
      const area=transform.plotRect;
      let out='<defs><clipPath id="'+esc(prefix)+'RoiClip"><rect x="'+area.x0+'" y="'+area.y0+'" width="'+(area.x1-area.x0)+'" height="'+(area.y1-area.y0)+'"/></clipPath></defs>';
      out+='<rect class="roi-hit-plane" x="'+area.x0+'" y="'+area.y0+'" width="'+(area.x1-area.x0)+'" height="'+(area.y1-area.y0)+'" fill="transparent"/>';
      out+='<g clip-path="url(#'+esc(prefix)+'RoiClip)">';
      rois.filter(r=>r.visible).concat(preview?[preview]:[]).forEach(r=>{
        const current=r.id===activeId,ghost=r===preview;
        out+='<g class="roi-shape'+(current?' roi-selected':'')+(ghost?' roi-preview':'')+'" data-roi-id="'+esc(r.id)+'">'+geomSvg(r)+'</g>';
      });
      const a=active();
      if(a&&mode==='edit'&&!drawing&&a.visible){
        const keys=a.type==='rectangle'?['width','height']:a.type==='circle'?['radius']:['radius','start','end'];
        keys.forEach(key=>{
          const pt=handlePoint(a.type,a.geometry,key);
          out+='<circle class="roi-handle" data-roi-handle="'+key+'" cx="'+transform.X(pt.x)+'" cy="'+transform.Y(pt.y)+'" r="5"/>';
        });
      }
      out+='</g>';
      overlay.innerHTML=out;
    }
    function pointerDown(e){
      if(mode==='inspect')return;
      const p=svgPoint(e);if(!p)return;
      const a=active(),target=e.target,handle=target.getAttribute('data-roi-handle'),targetRoi=target.closest('[data-roi-id]');
      if(drawing){drag={kind:'draw',from:p,type:drawing};preview=null;}
      else if(handle&&a){drag={kind:'handle',from:p,key:handle,original:{...a.geometry}};}
      else if(targetRoi){
        const id=targetRoi.dataset.roiId;
        if(rois.some(r=>r.id===id)){activeId=id;scope='roi';drag={kind:'move',from:p,original:{...active().geometry}};refresh();}
      }else{drag=null;}
      if(drag){e.preventDefault();overlay.focus?.();overlay.setPointerCapture?.(e.pointerId);}
    }
    function pointerMove(e){
      if(!drag)return;
      const p=svgPoint(e);if(!p)return;
      if(drag.kind==='draw'){
        const a=drag.from,dx=p.x-a.x,dy=p.y-a.y;
        if(drag.type==='rectangle')preview={id:'draft',type:'rectangle',geometry:{cx:(a.x+p.x)/2,cy:(a.y+p.y)/2,width:Math.abs(dx),height:Math.abs(dy),rotation:0}};
        else preview={id:'draft',type:drag.type,geometry:{cx:a.x,cy:a.y,radius:Math.hypot(dx,dy),...(drag.type==='sector'?{startDeg:0,sweepDeg:90}:{})}};
      }else if(active()){
        const g={...drag.original},dx=p.x-drag.from.x,dy=p.y-drag.from.y;
        if(drag.kind==='move'){g.cx+=dx;g.cy+=dy;}
        else if(drag.key==='radius'){g.radius=Math.max(.00001,Math.hypot(p.x-g.cx,p.y-g.cy));}
        else if(drag.key==='start'||drag.key==='end'){
          const angle=norm(deg(Math.atan2(p.y-g.cy,p.x-g.cx)));
          if(drag.key==='start'){
            const end=norm(g.startDeg+g.sweepDeg);g.startDeg=angle;g.sweepDeg=norm(end-angle)||360;
          }else g.sweepDeg=norm(angle-norm(g.startDeg))||360;
        }else if(drag.key==='width'||drag.key==='height'){
          const a=rad(g.rotation),u=(p.x-g.cx)*Math.cos(a)+(p.y-g.cy)*Math.sin(a),
            v=-(p.x-g.cx)*Math.sin(a)+(p.y-g.cy)*Math.cos(a);
          if(drag.key==='width')g.width=Math.max(.00001,2*Math.abs(u));
          else g.height=Math.max(.00001,2*Math.abs(v));
        }
        active().geometry=g;
      }
      renderOverlay();
    }
    function pointerUp(e){
      if(!drag)return;
      if(drag.kind==='draw'&&preview&&valid(preview))add(preview.type,preview.geometry);
      else if(drag.kind!=='draw')changed();
      drag=null;preview=null;renderOverlay();
      try{overlay.releasePointerCapture?.(e.pointerId);}catch(_){}
    }
    function attach({surface,W,H,X,Y,plotRect}){
      if(!surface||!finite(W)||!finite(H)||!X||!Y||!plotRect)return;
      const parent=surface.parentElement;
      if(!parent)return;
      parent.style.position='relative';
      if(overlay?.parentElement!==parent){
        overlay?.remove();
        overlay=root.document.createElementNS('http://www.w3.org/2000/svg','svg');
        overlay.classList.add('roi-overlay');
        overlay.setAttribute('aria-label','Spatial ROI editor');
        overlay.setAttribute('tabindex','0');
        parent.appendChild(overlay);
        overlay.addEventListener('pointerdown',pointerDown);
        overlay.addEventListener('pointermove',pointerMove);
        overlay.addEventListener('pointerup',pointerUp);
        overlay.addEventListener('pointercancel',pointerUp);
      }
      transform={W,H,X,Y,plotRect};
      renderOverlay();
    }
    function exportRows(){
      return rois.map(r=>({id:r.id,name:r.name,type:r.type,visible:r.visible,...r.geometry}));
    }
    return{toolbar,bind,attach,mask,label,active,selected:chosen,rois:()=>rois.slice(),scope:()=>scope,contains,selectMask,exportRows,add,remove};
  }
  PV.roi={contains,selectMask,combineMasks,create,valid};
})(typeof window!=='undefined'?window:globalThis);
