/* Immutable local pool snapshots; outcomes are resolved by the first draw after the anchor. */
const Forecast = ((engine,selection)=>{
 const day=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
 const hkDay=value=>{const t=Date.parse(value);return Number.isFinite(t)?new Date(t+8*3600000).toISOString().slice(0,10):'';};
 function valid(r){return !!r&&r.version===1&&r.algorithmVersion===1&&typeof r.createdAt==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(r.createdAt)&&Number.isFinite(Date.parse(r.createdAt))&&r.savedDay===hkDay(r.createdAt)&&day(r.anchorDate)&&r.savedDay>=r.anchorDate&&typeof r.anchorDraw==='string'&&/^\d{2}\/\d{3}$/.test(r.anchorDraw)&&engine.validNumbers(r.numbers,6,49)&&engine.validNumbers(r.baseline,r.numbers.length,r.numbers.length)&&Object.hasOwn(selection.labels,r.mode)&&Number.isInteger(r.train)&&r.train>=1&&r.train<=10000&&Number.isInteger(r.short)&&r.short>=1&&r.short<=r.train&&typeof r.cold==='boolean';}
 function validList(records){return Array.isArray(records)&&records.length<=500&&records.every(valid)&&new Set(records.map(r=>r.anchorDraw+'|'+r.anchorDate)).size===records.length;}
 function create(data,{numbers,mode,train,short=1,cold=false},now=new Date().toISOString()){
  if(!Number.isInteger(train)||train<1||train>data.length)throw Error('選號範圍無效。');
  const r={version:1,algorithmVersion:1,createdAt:now,savedDay:hkDay(now),anchorDraw:data[0].draw_number,anchorDate:data[0].draw_date,numbers:[...numbers],baseline:selection.select(data.slice(0,train),{mode:'rank',count:numbers.length}),mode,train,short,cold:!!cold};
  if(!valid(r)||r.savedDay<r.anchorDate)throw Error('保存資料或本機日期無效，請檢查日期及選號。');
  return r;
 }
 function resolve(record,data){
  const index=data.findIndex(d=>d.draw_number===record.anchorDraw&&d.draw_date===record.anchorDate);
  if(index<0)return {status:'missing'};
  if(index===0)return {status:'pending'};
  const draw=data[index-1],eligible=record.savedDay<draw.draw_date;
  return {status:eligible?'settled':'late',draw,...selection.hits(record.numbers,draw),baseline:selection.hits(record.baseline,draw)};
 }
 function merge(existing,incoming){
  if(!validList(existing)||!validList(incoming))throw Error('預存記錄格式無效。');
  const records=new Map(existing.map(r=>[r.anchorDraw+'|'+r.anchorDate,r]));
  for(const r of incoming)if(!records.has(r.anchorDraw+'|'+r.anchorDate))records.set(r.anchorDraw+'|'+r.anchorDate,r);
  const out=[...records.values()].sort((a,b)=>b.anchorDate.localeCompare(a.anchorDate));
  if(out.length>500)throw Error('預存記錄超過500筆，未匯入。');
  return out;
 }
 return {valid,validList,create,resolve,merge,hkDay};
})(typeof module!=='undefined'?require('./core.js'):Engine,typeof module!=='undefined'?require('./selection.js'):Selection);
if(typeof module!=='undefined')module.exports=Forecast;
