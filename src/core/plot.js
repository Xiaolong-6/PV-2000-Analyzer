(function(root){
  const PV=root.PV2000=root.PV2000||{};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function finiteRange(r){return Array.isArray(r)&&r.length===2&&r.every(Number.isFinite)&&r[1]>r[0]}
  function resolve(auto,state){return finiteRange(state)?state.slice():auto.slice()}
  function equalAspectRanges(xRange,yRange,plotW,plotH){
    if(!finiteRange(xRange)||!finiteRange(yRange)||!(plotW>0)||!(plotH>0))return{x:xRange.slice(),y:yRange.slice()};
    const x=xRange.slice(),y=yRange.slice(),xs=x[1]-x[0],ys=y[1]-y[0],target=plotW/plotH,current=xs/ys;
    if(current<target){
      const span=ys*target,c=(x[0]+x[1])/2;x[0]=c-span/2;x[1]=c+span/2;
    }else if(current>target){
      const span=xs/target,c=(y[0]+y[1])/2;y[0]=c-span/2;y[1]=c+span/2;
    }
    return{x,y};
  }
  function zoomRange(range,factor,fraction=0.5,log=false){
    if(!finiteRange(range)||!(factor>0))return range.slice();
    fraction=clamp(fraction,0,1);
    if(log){
      if(!(range[0]>0&&range[1]>0))return range.slice();
      const lo=Math.log(range[0]),hi=Math.log(range[1]),a=lo+(hi-lo)*fraction,nlo=a-(a-lo)*factor,nhi=a+(hi-a)*factor;
      return[Math.exp(nlo),Math.exp(nhi)];
    }
    const lo=range[0],hi=range[1],a=lo+(hi-lo)*fraction;
    return[a-(a-lo)*factor,a+(hi-a)*factor];
  }
  function axisControls(id,{label='Axes',distribution=false,swapped=false}={}){
    const swap=distribution?`<button type="button" data-axis-swap aria-pressed="${!!swapped}" title="Swap the Distribution count and quantity axes.">Swap axes</button>`:'';
    return `<details class="axis-popover" data-axis-controls="${id}"><summary title="Set manual numeric X/Y limits.">${label}</summary><div class="axis-popover-card"><div class="axis-limit-grid"><label>X min<input type="number" step="any" data-axis="xmin"></label><label>X max<input type="number" step="any" data-axis="xmax"></label><label>Y min<input type="number" step="any" data-axis="ymin"></label><label>Y max<input type="number" step="any" data-axis="ymax"></label></div><div class="axis-limit-actions">${swap}<button type="button" data-axis-auto>Auto</button><button type="button" data-axis-apply>Apply</button></div></div></details>`;
  }
  function binControls(id,bins=30){
    const n=Math.max(5,Math.min(200,Math.round(Number(bins)||30)));
    return `<details class="axis-popover bin-popover" data-bin-controls="${id}"><summary title="Set histogram bin count.">Bins</summary><div class="axis-popover-card bin-popover-card"><label class="axis-bin-control" title="More bins make narrower bars; fewer bins make wider bars.">Bin count<input type="number" min="5" max="200" step="1" value="${n}" data-bin-count></label></div></details>`;
  }
  function bindAxisControls(root,id,state,onChange,{xLog=false,yLog=false,swapped=false,onSwap=null}={}){
    const box=root?.querySelector(`[data-axis-controls="${id}"]`);if(!box)return;
    const input=k=>box.querySelector(`[data-axis="${k}"]`),
      set=(axis,loKey,hiKey)=>{const r=finiteRange(state?.[axis])?state[axis]:null;
      input(loKey).value=r?String(r[0]):'';
      input(hiKey).value=r?String(r[1]):''};
      set('x','xmin','xmax');
      set('y','ymin','ymax');
      
    const read=(loKey,hiKey,log,label)=>{
      const a=input(loKey).value.trim(),
      b=input(hiKey).value.trim();
      if(!a&&!b)return null;
      if(!a||!b)throw new Error(`${label}: enter both lower and upper limits, or leave both blank for Auto.`);
      const lo=Number(a),
      hi=Number(b);
      if(!Number.isFinite(lo)||!Number.isFinite(hi)||!(hi>lo))throw new Error(`${label}: upper limit must be greater than lower limit.`);
      if(log&&!(lo>0))throw new Error(`${label}: logarithmic limits must be positive.`);
      return[lo,hi]};
      
    const apply=()=>{try{
      const next={x:read('xmin','xmax',xLog,'X axis'),y:read('ymin','ymax',yLog,'Y axis')};
      box.open=false;
      onChange?.(next);
    }catch(err){alert(err.message)}};
    box.querySelector('[data-axis-apply]').onclick=apply;
    box.querySelector('[data-axis-auto]').onclick=()=>{box.open=false;onChange?.({x:null,y:null})};

    const swap=box.querySelector('[data-axis-swap]');
    if(swap){
      swap.setAttribute('aria-pressed',String(!!swapped));
      swap.onclick=()=>onSwap?.();
    }
    box.querySelectorAll('[data-axis="xmin"],[data-axis="xmax"],[data-axis="ymin"],[data-axis="ymax"]').forEach(el=>el.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();apply()}});
  }
  function bindBinControls(root,id,bins,onChange){
    const box=root?.querySelector(`[data-bin-controls="${id}"]`);if(!box)return;
    const input=box.querySelector('[data-bin-count]');
    if(!input)return;
    input.value=String(Math.max(5,Math.min(200,Math.round(Number(bins)||30))));
    const apply=()=>{
      const n=Math.round(Number(input.value));
      if(!Number.isFinite(n)||n<5||n>200){
        alert('Bins: enter an integer from 5 to 200.');
        input.value=String(Math.max(5,Math.min(200,Math.round(Number(bins)||30))));
        return;
      }
      box.open=false;
      onChange?.(n);
    };
    input.onchange=apply;
    input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();apply()}};
  }
  function point(el,W,H,e){const r=el.getBoundingClientRect();return{x:(e.clientX-r.left)*W/(r.width||1),y:(e.clientY-r.top)*H/(r.height||1)}}
  function bind(el,{W,H,plotRect,ranges,xLog=false,yLog=false,yDown=false,onChange,onReset}){
    if(!el||!plotRect||!ranges)return;
    const {x0,x1,y0,y1}=plotRect;
    el.dataset.zoomable='true';
    el.onwheel=e=>{
      const p=point(el,W,H,e),inside=p.x>=x0&&p.x<=x1&&p.y>=y0&&p.y<=y1,onX=p.x>=x0&&p.x<=x1&&p.y>y1&&p.y<=H,onY=p.x<x0&&p.x>=0&&p.y>=y0&&p.y<=y1;
      if(!inside&&!onX&&!onY)return;
      e.preventDefault();
      const factor=e.deltaY>0?1.18:1/1.18,fx=clamp((p.x-x0)/(x1-x0||1),0,1),fy=clamp((yDown?p.y-y0:y1-p.y)/(y1-y0||1),0,1),next={x:ranges.x.slice(),y:ranges.y.slice()};
      if(inside||onX)next.x=zoomRange(ranges.x,factor,fx,xLog);
      if(inside||onY)next.y=zoomRange(ranges.y,factor,fy,yLog);
      onChange?.(next,inside?'both':onX?'x':'y');
    };
    el.ondblclick=e=>{e.preventDefault();onReset?.()};
    el.onpointermove=e=>{const p=point(el,W,H,e),
      inside=p.x>=x0&&p.x<=x1&&p.y>=y0&&p.y<=y1,
      onX=p.x>=x0&&p.x<=x1&&p.y>y1&&p.y<=H,
      onY=p.x<x0&&p.x>=0&&p.y>=y0&&p.y<=y1;
      el.style.cursor=inside?'zoom-in':onX?'ew-resize':onY?'ns-resize':'default'};
      
    el.onpointerleave=()=>{el.style.cursor='default'};
  }
  function canvasFrame(canvas,{surface='standard',fallbackWidth=760}={}){
    const holder=canvas?.parentElement,
      rect=holder?.getBoundingClientRect?.()||canvas?.getBoundingClientRect?.(),
      measured=Number(rect?.width)||Number(canvas?.clientWidth)||fallbackWidth,
      W=Math.max(280,Math.round(measured)),
      rawH=surface==='compact'?W*5/16:W*9/16,
      H=Math.round(surface==='compact'?clamp(rawH,180,260):clamp(rawH,260,420)),
      dpr=clamp(Number(root.devicePixelRatio)||1,1,3),
      pixelW=Math.max(1,Math.round(W*dpr)),
      pixelH=Math.max(1,Math.round(H*dpr));
    if(canvas.style){canvas.style.width='100%';canvas.style.height=`${H}px`}
    if(canvas.width!==pixelW)canvas.width=pixelW;
    if(canvas.height!==pixelH)canvas.height=pixelH;
    const ctx=canvas.getContext('2d');
    ctx.setTransform?.(dpr,0,0,dpr,0,0);
    return{ctx,W,H,dpr,surface};
  }
  function observeResize(host,onResize){
    host?.__pvPlotResizeObserver?.disconnect?.();
    if(!host||typeof root.ResizeObserver!=='function')return null;
    let last=Number(host.getBoundingClientRect?.().width)||0,raf=0;
    const schedule=()=>{
      if(raf)return;
      const run=()=>{raf=0;if(host.isConnected!==false)onResize?.()};
      raf=typeof root.requestAnimationFrame==='function'?root.requestAnimationFrame(run):root.setTimeout(run,0);
    };
    const observer=new root.ResizeObserver(entries=>{
      const width=Number(entries?.[0]?.contentRect?.width)||Number(host.getBoundingClientRect?.().width)||0;
      if(Math.abs(width-last)<1)return;
      last=width;schedule();
    });
    observer.observe(host);
    host.__pvPlotResizeObserver=observer;
    return observer;
  }
  function clear(state){state.x=null;state.y=null;return state}
  PV.plot={resolve,equalAspectRanges,zoomRange,axisControls,binControls,bindAxisControls,bindBinControls,bind,canvasFrame,observeResize,clear};
})(typeof window!=='undefined'?window:globalThis);
