/* Rolling historical ticket comparison: every target gets newly generated bets. */
const PoolComparison = ((engine,selection,budget)=>{
 const modes=['rank','rank_regular','blend','rank_with_pair'];
 const labels={all49:'全49碼',...selection.labels};
 function settings(data,s){
  const c={train:s.train,short:s.short,count:s.count,periods:s.periods,tickets:s.tickets,seed:s.seed??20261118};
  if(!Number.isInteger(c.tickets)||c.tickets<1||c.tickets>10)throw Error('每期注數請選1至10注。');
  if(!Number.isInteger(c.seed)||c.seed<0||c.seed>4294967295)throw Error('重現編號須為0至4294967295的整數。');
  if(engine.audit(data).length)throw Error('開獎資料格式或排序有誤，請先核實資料。');
  // Reuse the existing selector's validation, including pool size and windows.
  if(!Number.isInteger(c.periods)||c.periods<1||c.train+c.periods>data.length)throw Error('選號與核對期數合共不可超過'+data.length+'期；請減少期數。');
  selection.compare(data,{...c,periods:1});
  budget.validate(Array.from({length:c.count},(_,i)=>i+1),c.tickets,3);
  return c;
 }
 async function roundSeed(seed,anchor){
  // Match the existing 300/600-period reports. Only a pre-draw anchor enters
  // this seed; changing the training window must not change the all-49 control.
  const api=typeof module!=='undefined'?require('node:crypto').webcrypto:crypto;
  const bytes=await api.subtle.digest('SHA-256',new TextEncoder().encode('compare-300-v1|'+seed+'|'+anchor.draw_number));
  return new DataView(bytes).getUint32(0,false);
 }
 async function run(data,input,{onProgress=()=>{},yieldControl=async()=>{},isCancelled=()=>false}={}){
  const config=settings(data,input),rows=[],ticketRows=[];
  for(let i=0;i<config.periods;i++){
   if(isCancelled())throw Error('已取消比較。');
   const draw=data[i],training=data.slice(i+1,i+1+config.train),seed=await roundSeed(config.seed,training[0]);
   const base={draw:draw.draw_number,date:draw.draw_date,trainingNewest:training[0].draw_date,trainingOldest:training.at(-1).draw_date,seed};
   const pools=[{mode:'all49',numbers:[...budget.all]}];
   for(const mode of modes){
    const numbers=selection.select(training,{mode,count:config.count,short:config.short});
    rows.push({...base,mode,numbers,...selection.hits(numbers,draw)});
    pools.push({mode,numbers});
   }
   const generated=new Map();
   for(const {mode,numbers} of pools){
    const key=numbers.join(',');
    if(!generated.has(key))generated.set(key,budget.generate(numbers,config.tickets,3,seed));
    const groups=generated.get(key);
    for(const method of ['random','cover']){
     const bets=groups[method],hits=bets.map(b=>b.filter(n=>draw.numbers.includes(n)).length);
     ticketRows.push({...base,mode,method,numbers,bets,hits,hit3:hits.some(n=>n>=3),hit4:hits.some(n=>n>=4),winningTickets:hits.filter(n=>n>=3).length});
    }
   }
   onProgress({completed:i+1,total:config.periods});
   await yieldControl();
  }
  if(isCancelled())throw Error('已取消比較。');
  return {version:1,settings:config,rows,ticketRows};
 }
 function summary(rows){return {periods:rows.length,hit3:rows.filter(r=>r.hit3).length,hit4:rows.filter(r=>r.hit4).length,winningTickets:rows.reduce((n,r)=>n+r.winningTickets,0),totalTickets:rows.reduce((n,r)=>n+r.bets.length,0)};}
 return {modes,labels,run,summary,roundSeed};
})(typeof module!=='undefined'?require('./core.js'):Engine,typeof module!=='undefined'?require('./selection.js'):Selection,typeof module!=='undefined'?require('./budget.js'):Budget);
if(typeof module!=='undefined')module.exports=PoolComparison;
