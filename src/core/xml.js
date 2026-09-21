(function(root){
  const PV=root.PV2000=root.PV2000||{};
  const lname=e=>e?(e.localName||e.nodeName?.split(':').pop()):'';
  const children=e=>e?[...e.children]:[];
  const direct=(e,n)=>children(e).find(c=>lname(c)===n)||null;
  const directs=(e,n)=>children(e).filter(c=>lname(c)===n);
  const text=(e,n,d='')=>{const x=direct(e,n);return x?x.textContent.trim():d};
  const num=(e,n,d=NaN)=>{const raw=text(e,n,'');if(raw==='')return d;const v=Number(raw);return Number.isFinite(v)?v:d};
  function attrType(e){if(!e)return'';for(const a of [...e.attributes])if(a.localName==='type'||a.name==='xsi:type')return a.value;return''}
  function parse(textContent){const doc=new DOMParser().parseFromString(textContent,'application/xml');if(doc.querySelector('parsererror'))throw new Error('XML parse failed');const job=doc.documentElement,measurement=direct(job,'Measurement');if(!measurement)throw new Error('No <Measurement> found');return{doc,job,measurement,type:attrType(measurement)}}
  function headerPairs(measurement){const h=direct(measurement,'HeaderInfo'),out={};if(!h)return out;for(const p of children(h)){const k=text(p,'First',''),v=text(p,'Second','');if(k)out[k]=v}return out}
  function common(parsed){const {job,measurement,type}=parsed,exec=direct(job,'ExecutionInfo'),sub=direct(job,'Substrate'),shape=direct(sub,'SubstrateShape');return{
    type,name:text(job,'Name',''),resultName:text(job,'ResultName',''),status:text(job,'Status',''),start:text(exec,'StartTime',''),end:text(exec,'EndTime',''),elapsed:text(exec,'ElapsedTime',''),
    substrateId:text(sub,'SubstrateId',''),lotId:text(sub,'LotId',''),description:text(sub,'Description',''),shapeType:attrType(shape),radius:num(shape,'Radius'),header:headerPairs(measurement)
  }}
  PV.xml={lname,children,direct,directs,text,num,attrType,parse,common,headerPairs};
})(typeof window!=='undefined'?window:globalThis);
