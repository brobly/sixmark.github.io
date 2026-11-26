/* Candidate-pool verification. Each target is newer than its entire selection window. */
const RollingStudy=((engine,selection,pairing)=>{
 const methods=['rank','rank_cold','rank_regular','blend','rank_with_pair','cold_hot_balance','random'];
 const labels={rank:'排名模式（熱門）',rank_cold:'排名模式（冷門）',rank_regular:'純排名（只計正選）',blend:'長短期混合',rank_with_pair:'排名＋搭配',cold_hot_balance:'冷熱平衡',random:'純隨機'};
 const levels=Array.from({length:14},(_,i)=>i/2),thresholds=levels.filter(n=>n>=3);
 function settings(data,input){
  if(engine.audit(data).length)throw Error('開獎資料格式或日期排序有誤，請先檢查資料。');
  const s={start:input.start,end:input.end,periods:input.periods,count:input.count,short:input.short??10,methods:[...(input.methods||[])],balanceRanges:{...(input.balanceRanges||selection.balanceDefaults)},seed:20261125};
  if(!Number.isInteger(s.start)||!Number.isInteger(s.end)||s.start<2||s.end<s.start)throw Error('選號範圍須為整數，並由第2期或之後開始，才有較新一期可驗證。');
  if(!Number.isInteger(s.periods)||s.periods<1)throw Error('逐期驗證期數須為正整數。');
  if(s.end+s.periods-1>data.length)throw Error(`目前共${data.length}期資料；此選號範圍最多可逐期驗證${Math.max(0,data.length-s.end+1)}期。`);
  if(!Number.isInteger(s.count)||s.count<6||s.count>49)throw Error('目標號碼數須為6–49的整數。');
  if(!s.methods.length||new Set(s.methods).size!==s.methods.length||s.methods.some(m=>!methods.includes(m)))throw Error('請選擇至少一種篩選方式。');
  if(s.methods.includes('blend')&&(!Number.isInteger(s.short)||s.short<1||s.short>s.end-s.start+1))throw Error('混合短期期數須為正整數，且不可超過選號範圍的期數。');
  if(s.methods.includes('cold_hot_balance')&&!selection.validBalanceRanges(s.balanceRanges))throw Error('冷熱排名範圍須為1–49的整數，起始名次不可大於結束名次。');
  return s;
 }
 function seedFor(s,training,mode){
  let hash=2166136261;
  const key=[s.seed,mode,training[0].draw_number,training[0].draw_date,training.at(-1).draw_number].join('|');
  for(const char of key)hash=Math.imul(hash^char.charCodeAt(0),16777619);
  return hash>>>0;
 }
 function choose(training,mode,s){
  const random=pairing.seeded(seedFor(s,training,mode));
  if(mode==='cold_hot_balance')return selection.balanced(training,s.count,s.balanceRanges,random).numbers;
  if(mode==='random')return pairing.sample(Array.from({length:49},(_,i)=>i+1),s.count,random).sort((a,b)=>a-b);
  return selection.select(training,{mode:mode==='rank_cold'?'rank':mode,count:s.count,short:s.short,cold:mode==='rank_cold'});
 }
 function summary(rows){
  const total=rows.length,counts=Array(14).fill(0);
  for(const r of rows)counts[r.hits*2+r.extra]++;
  const cell=(score,count)=>({score,count,probability:total?count/total:0});
  return {total,exact:levels.map((score,i)=>cell(score,counts[i])),atLeast:thresholds.map(score=>cell(score,counts.slice(score*2).reduce((a,b)=>a+b,0)))};
 }
 // Follow the table's period positions (newest to oldest). Only periods BETWEEN hits count.
 function intervals(rows,threshold){
  const ordered=[...rows].sort((a,b)=>a.period-b.period),occurrences=[];
  for(const r of ordered){
   if(r.score<threshold)continue;
   const previous=occurrences.at(-1);
   occurrences.push({period:r.period,draw:r.draw,date:r.date,score:r.score,gap:previous?r.period-previous.period-1:null});
  }
  const startPeriod=ordered[0]?.period??null,endPeriod=ordered.at(-1)?.period??null;
  const count=occurrences.length,intervalCount=Math.max(0,count-1),totalGap=occurrences.reduce((sum,r)=>sum+(r.gap??0),0);
  return {threshold,total:ordered.length,startPeriod,endPeriod,occurrences,count,intervalCount,totalGap,
   averageGap:intervalCount?totalGap/intervalCount:null,
   leadingGap:count?occurrences[0].period-startPeriod:null,trailingGap:count?endPeriod-occurrences.at(-1).period:null};
 }
 async function run(data,input,{onProgress=()=>{},isCancelled=()=>false,yieldControl=()=>Promise.resolve()}={}){
  const s=settings(data,input),rows=[];
  for(let offset=0;offset<s.periods;offset++){
   if(isCancelled())throw Error('已取消逐期驗證。');
   const start=s.start+offset,end=s.end+offset,training=data.slice(start-1,end),draw=data[start-2];
   for(const mode of s.methods){
    const numbers=choose(training,mode,s),{hits,extra}=selection.hits(numbers,draw);
    rows.push({mode,period:start-1,draw:draw.draw_number,date:draw.draw_date,winning:[...draw.numbers],special:draw.extra_number,start,end,trainingNewest:training[0].draw_date,trainingOldest:training.at(-1).draw_date,numbers,hits,extra,score:hits+extra/2});
   }
   onProgress({completed:offset+1,total:s.periods});
   if(offset%5===0)await yieldControl();
  }
  if(isCancelled())throw Error('已取消逐期驗證。');
  return {version:1,settings:s,rows,groups:s.methods.map(mode=>{const items=rows.filter(r=>r.mode===mode);return {mode,...summary(items),intervals:[3,4].map(threshold=>intervals(items,threshold)),minSize:Math.min(...items.map(r=>r.numbers.length)),maxSize:Math.max(...items.map(r=>r.numbers.length))};})};
 }
 return {methods,labels,levels,thresholds,settings,choose,summary,intervals,run};
})(typeof module!=='undefined'?require('./core.js'):Engine,typeof module!=='undefined'?require('./selection.js'):Selection,typeof module!=='undefined'?require('./pairing.js'):Pairing);
if(typeof module!=='undefined')module.exports=RollingStudy;
