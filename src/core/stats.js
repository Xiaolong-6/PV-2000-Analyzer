(function(root){
  const PV=root.PV2000=root.PV2000||{};
  const finite=a=>(a||[]).map(Number).filter(Number.isFinite);
  function mean(a){const b=finite(a);return b.length?b.reduce((s,v)=>s+v,0)/b.length:NaN}
  function median(a){const b=finite(a).sort((x,y)=>x-y);if(!b.length)return NaN;const m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2}
  function stdev(a,sample=true){const b=finite(a);if(b.length<(sample?2:1))return NaN;const m=mean(b);return Math.sqrt(b.reduce((s,v)=>s+(v-m)*(v-m),0)/(b.length-(sample?1:0)))}
  function summary(a){const b=finite(a);return {count:b.length,mean:mean(b),median:median(b),stdev:stdev(b,true),min:b.length?Math.min(...b):NaN,max:b.length?Math.max(...b):NaN}}
  function histogram(a,bins=30){
    const b=finite(a);
    if(!b.length)return[];
    let lo=Math.min(...b),
    hi=Math.max(...b);
    if(lo===hi){lo-=0.5;
      hi+=0.5}const w=(hi-lo)/bins,
    c=Array(bins).fill(0);
    for(const v of b){
      let i=Math.floor((v-lo)/w);
      if(i===bins)i=bins-1;
      c[Math.max(0,Math.min(bins-1,i))]++}return c.map((n,i)=>({lo:lo+i*w,hi:lo+(i+1)*w,count:n}))}
  PV.stats={finite,mean,median,stdev,summary,histogram};
})(typeof window!=='undefined'?window:globalThis);
