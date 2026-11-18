/* Frozen prospective experiments. Stored tickets are the evidence; never rebuild them to score. */
const Research = ((engine, selection, mandel, forecast) => {
 const methods=['rank','rank_regular','blend'];
 const clone=value=>JSON.parse(JSON.stringify(value));
 const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
 const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
 const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
 const instant=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value));
 const anchor=d=>({draw:d.draw_number,date:d.draw_date});
 const key=a=>a.draw+'|'+a.date;
 const validAnchor=a=>a&&/^\d{2}\/\d{3}$/.test(a.draw)&&date(a.date)&&a.draw.slice(0,2)===a.date.slice(2,4);
 function consecutive(older,newer){return older.draw.slice(0,2)===newer.draw.slice(0,2)?Number(newer.draw.slice(3))===Number(older.draw.slice(3))+1:Number(newer.draw.slice(0,2))===Number(older.draw.slice(0,2))+1&&newer.draw.endsWith('/001');}
 async function hash(value){
  if(!globalThis.crypto?.subtle)throw Error('此瀏覽器未能建立資料指紋，請以較新瀏覽器開啟本機 HTML 或 GitHub Pages。');
  const bytes=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value)));
  return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
 }
 const drawData=rows=>rows.map(d=>[d.draw_number,d.draw_date,[...d.numbers].sort((a,b)=>a-b),d.extra_number]);
 function validSettings(s){return s&&s.goal==='pool_hit3'&&s.count===10&&Number.isInteger(s.train)&&s.train>=1&&s.train<=500&&Number.isInteger(s.short)&&s.short>=1&&s.short<=s.train&&Number.isInteger(s.horizon)&&s.horizon>=20&&s.horizon<=500&&['sample','mandel'].includes(s.betMode)&&Number.isInteger(s.tickets)&&s.tickets>=1&&s.tickets<=210&&(s.betMode!=='mandel'||s.tickets===56);}
 function* combinations(n,k,start=0,p=[]){if(!k){yield p;return;}for(let i=start;i<=n-k;i++)yield* combinations(n,k-1,i+1,[...p,i]);}
 let standard=null;
 function template(settings,seed){
  if(settings.betMode==='mandel'){
   if(!standard){const gen=mandel.createStepper(10);let step;while(!(step=gen.next()).done){}standard=step.value;}
   return clone(standard);
  }
  const all=[...combinations(10,6)];let state=parseInt(seed.slice(0,8),16)>>>0;
  const random=()=>{state=(state+0x6D2B79F5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
  for(let i=all.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[all[i],all[j]]=[all[j],all[i]];}
  return all.slice(0,settings.tickets);
 }
 function validRound(r,p){
  if(!r||r.version!==1||!validAnchor(r.anchor)||r.anchor.date<p.start.date||!instant(r.createdAt)||r.createdAt<p.createdAt||r.savedDay!==forecast.hkDay(r.createdAt)||r.savedDay<r.anchor.date||r.buildHash!==p.buildHash||!hex(r.dataHash)||!hex(r.trainingHash)||!hex(r.seed)||!hex(r.contentHash)||!validAnchor(r.trainingOldest)||r.trainingOldest.date>r.anchor.date||!Array.isArray(r.entries)||r.entries.length!==methods.length)return false;
  return r.entries.every((e,i)=>e&&e.mode===methods[i]&&engine.validNumbers(e.numbers,10,10)&&e.numbers.every((n,j)=>!j||n>e.numbers[j-1])&&e.cost===p.settings.tickets*10&&Array.isArray(e.bets)&&e.bets.length===p.settings.tickets&&e.bets.every(b=>engine.validNumbers(b,6,6)&&b.every(n=>e.numbers.includes(n)))&&new Set(e.bets.map(b=>[...b].sort((a,b)=>a-b).join(','))).size===e.bets.length);
 }
 function validPlan(p){return !!p&&p.version===1&&hex(p.id)&&instant(p.createdAt)&&validAnchor(p.start)&&forecast.hkDay(p.createdAt)>=p.start.date&&hex(p.buildHash)&&hex(p.seed)&&validSettings(p.settings)&&Array.isArray(p.rounds)&&p.rounds.length>=1&&p.rounds.length<=p.settings.horizon&&p.rounds.every(r=>validRound(r,p))&&key(p.rounds[0].anchor)===key(p.start)&&p.rounds[0].createdAt===p.createdAt&&p.rounds.every((r,i)=>!i||(r.anchor.date>p.rounds[i-1].anchor.date&&r.createdAt>p.rounds[i-1].createdAt));}
 function valid(ledger){return !!ledger&&ledger.version===1&&Array.isArray(ledger.plans)&&ledger.plans.length<=10&&ledger.plans.every(validPlan)&&new Set(ledger.plans.map(p=>p.id)).size===ledger.plans.length&&ledger.plans.reduce((n,p)=>n+p.rounds.length,0)<=500;}
 function timeline(p,data){
  if(engine.audit(data).length)return {problem:'開獎資料格式或排序無效，請先核實資料。',rows:[],elapsed:0,complete:false};
  const index=data.findIndex(d=>key(anchor(d))===key(p.start));
  if(index<0)return {problem:'找不到方案基準期，請還原完整開獎資料。',rows:[],elapsed:0,complete:false};
  const future=data.slice(0,index).reverse().slice(0,p.settings.horizon);let previous=p.start;
  for(const d of future){const a=anchor(d);if(!validAnchor(a)||!consecutive(previous,a))return {problem:'研究期間期號不連續，請補齊或核實開獎資料；暫停結算及新增。',rows:[],elapsed:future.length,complete:false};previous=a;}
  const rows=future.map((draw,i)=>({draw,anchor:i?anchor(future[i-1]):p.start}));
  return {problem:null,rows,elapsed:rows.length,complete:rows.length===p.settings.horizon};
 }
 async function round(p,data,now){
  if(engine.audit(data).length||data.length<p.settings.train||!instant(now)||forecast.hkDay(now)<data[0].draw_date)throw Error('開獎資料、訓練期數或本機日期無效。');
  const training=data.slice(0,p.settings.train),a=anchor(data[0]);
  for(let i=1;i<training.length;i++)if(!consecutive(anchor(training[i]),anchor(training[i-1])))throw Error('選號資料期號不連續，請先補齊資料。');
  const seed=await hash([p.seed,a]),positions=template(p.settings,seed);
  const entries=methods.map(mode=>{const numbers=selection.select(training,{mode,count:10,short:p.settings.short});return {mode,numbers,bets:positions.map(b=>b.map(i=>numbers[i])),cost:p.settings.tickets*10};});
  const r={version:1,anchor:a,createdAt:now,savedDay:forecast.hkDay(now),buildHash:p.buildHash,dataHash:await hash(drawData(data)),trainingHash:await hash(drawData(training)),trainingOldest:anchor(training.at(-1)),seed,entries};
  return {...r,contentHash:await hash(r)};
 }
 async function create(data,settings,buildHash,now=new Date().toISOString()){
  if(!validSettings(settings)||!hex(buildHash)||!data.length||!instant(now))throw Error('請設定有效的期數、短期及注數。');
  const base={version:1,createdAt:now,start:anchor(data[0]),buildHash,settings:clone(settings)};
  const p={...base,id:await hash(base),seed:await hash(['research-seed-v1',base]),rounds:[]};
  p.rounds.push(await round(p,data,now));if(!validPlan(p))throw Error('方案驗證失敗，尚未保存。');return p;
 }
 async function append(p,data,buildHash,now=new Date().toISOString()){
  if(!validPlan(p))throw Error('研究記錄格式無效。');
  if(!await intactPlan(p))throw Error('方案規則指紋不符，請還原原有研究備份。');
  if(p.buildHash!==buildHash)throw Error('選號程式版本已改變；此方案保留原記錄，請另建新方案。');
  const t=timeline(p,data);if(t.problem)throw Error(t.problem);if(t.complete)throw Error('已到預定評估期數，不能延長此方案。');
  if(p.rounds.some(r=>key(r.anchor)===key(anchor(data[0]))))throw Error('這一期已鎖定三組選號及注碼，不能覆寫或重抽。');
  const r=await round(p,data,now),updated={...clone(p),rounds:[...clone(p.rounds),r]};
  if(!validPlan(updated))throw Error('保存時間或資料順序無效。');return updated;
 }
 function wilson(success,total){
  if(!total)return null;const z=1.959963984540054,p=success/total,d=1+z*z/total,c=(p+z*z/(2*total))/d,h=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/d;
  return [Math.max(0,c-h),Math.min(1,c+h)];
 }
 async function intactPlan(p){const {version,createdAt,start,buildHash,settings}=p,base={version,createdAt,start,buildHash,settings};return p.id===await hash(base)&&p.seed===await hash(['research-seed-v1',base]);}
 async function analyze(p,data){
  if(!validPlan(p))throw Error('研究記錄格式無效。');
  if(!await intactPlan(p))return {problem:'方案規則指紋不符，請還原原有研究備份。',rows:[],elapsed:0,complete:false,eligible:0,missing:0,late:0,changed:0,groups:[]};
  const t=timeline(p,data);if(t.problem)return {...t,rows:[],eligible:0,missing:0,late:0,changed:0,groups:[]};
  const rows=await Promise.all(t.rows.map(async row=>{
   const r=p.rounds.find(r=>key(r.anchor)===key(row.anchor));if(!r)return {...row,status:'missing'};
   const {contentHash,...payload}=r;
   if(await hash(payload)!==contentHash)return {...row,record:r,status:'changed'};
   if(r.savedDay>=row.draw.draw_date)return {...row,record:r,status:'late'};
   const index=data.findIndex(d=>key(anchor(d))===key(r.anchor)),training=data.slice(index,index+p.settings.train);
   if(training.length!==p.settings.train||await hash(drawData(training))!==r.trainingHash)return {...row,record:r,status:'changed'};
   const results=r.entries.map(e=>({...selection.hits(e.numbers,row.draw),counts:engine.evaluate({mode:'mandel',bets:e.bets},row.draw),cost:e.cost}));
   return {...row,record:r,status:'settled',results};
  }));
  const settled=rows.filter(r=>r.status==='settled');
  const groups=methods.map((mode,i)=>{
   const outcomes=settled.map(r=>r.results[i]),summary=selection.summary(outcomes);
   const wins=outcomes.filter(r=>r.counts.some(n=>n)).length,counts=engine.keys.map((_,j)=>outcomes.reduce((n,r)=>n+r.counts[j],0));
   const better=settled.filter(r=>r.results[i].hits>=3&&r.results[0].hits<3).length,worse=settled.filter(r=>r.results[i].hits<3&&r.results[0].hits>=3).length;
   return {mode,summary,interval:wilson(summary.hit3,summary.draws),wins,counts,cost:outcomes.reduce((n,r)=>n+r.cost,0),better,worse,difference:summary.draws?(better-worse)/summary.draws:null};
  });
  return {...t,rows,groups,eligible:settled.length,missing:rows.filter(r=>r.status==='missing').length,late:rows.filter(r=>r.status==='late').length,changed:rows.filter(r=>r.status==='changed').length};
 }
 function merge(existing,incoming){
  if(!valid(existing)||!valid(incoming))throw Error('研究備份格式無效。');
  const plans=clone(existing.plans);
  for(const p of incoming.plans){
   const old=plans.find(x=>x.id===p.id);if(!old){plans.push(clone(p));continue;}
   const {rounds:a,...metaA}=old,{rounds:b,...metaB}=p;if(canonical(metaA)!==canonical(metaB))throw Error('同一方案的規則不一致，未匯入。');
   for(const r of b){const saved=a.find(x=>key(x.anchor)===key(r.anchor));if(saved&&canonical(saved)!==canonical(r))throw Error('同一期已有不同鎖定記錄，未覆寫或匯入。');if(!saved)a.push(clone(r));}
   a.sort((x,y)=>x.anchor.date.localeCompare(y.anchor.date));
  }
  plans.sort((a,b)=>a.createdAt.localeCompare(b.createdAt));const result={version:1,plans};if(!valid(result))throw Error('研究記錄超過上限（10 個方案、合共 500 期），或資料順序無效。');return result;
 }
 return {methods,canonical,hash,drawData,validSettings,validPlan,valid,create,append,analyze,timeline,merge,wilson,template};
})(typeof module!=='undefined'?require('./core.js'):Engine,typeof module!=='undefined'?require('./selection.js'):Selection,typeof module!=='undefined'?require('./mandel-engine.js'):MandelEngine,typeof module!=='undefined'?require('./forecast.js'):Forecast);
if(typeof module!=='undefined')module.exports=Research;
