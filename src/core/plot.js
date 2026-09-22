(function(root){
  const PV=root.PV2000=root.PV2000||{};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function finiteRange(r){return Array.isArray(r)&&r.length===2&&r.every(Number.isFinite)&&r[1]>r[0]}
  function resolve(auto,state){return finiteRange(state)?state.slice():auto.slice()}
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
  function point(el,W,H,e){const r=el.getBoundingClientRect();return{x:(e.clientX-r.left)*W/(r.width||1),y:(e.clientY-r.top)*H/(r.height||1)}}
  function bind(el,{W,H,plotRect,ranges,xLog=false,yLog=false,onChange,onReset}){
    if(!el||!plotRect||!ranges)return;
    const {x0,x1,y0,y1}=plotRect;
    el.dataset.zoomable='true';
    el.onwheel=e=>{
      const p=point(el,W,H,e),inside=p.x>=x0&&p.x<=x1&&p.y>=y0&&p.y<=y1,onX=p.x>=x0&&p.x<=x1&&p.y>y1&&p.y<=H,onY=p.x<x0&&p.x>=0&&p.y>=y0&&p.y<=y1;
      if(!inside&&!onX&&!onY)return;
      e.preventDefault();
      const factor=e.deltaY>0?1.18:1/1.18,fx=clamp((p.x-x0)/(x1-x0||1),0,1),fy=clamp((y1-p.y)/(y1-y0||1),0,1),next={x:ranges.x.slice(),y:ranges.y.slice()};
      if(inside||onX)next.x=zoomRange(ranges.x,factor,fx,xLog);
      if(inside||onY)next.y=zoomRange(ranges.y,factor,fy,yLog);
      onChange?.(next,inside?'both':onX?'x':'y');
    };
    el.ondblclick=e=>{e.preventDefault();onReset?.()};
  }
  function clear(state){state.x=null;state.y=null;return state}
  PV.plot={resolve,zoomRange,bind,clear};
})(typeof window!=='undefined'?window:globalThis);
