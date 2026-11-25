/* Shared fixed-size selection rules for filtering and chronological comparison. */
const Selection = ((engine,pairing)=>{
 const labels={default:'純排名（含特別號）',rank:'純排名（含特別號）',rank_regular:'純排名（只計正選）',blend:'長短期混合（含特別號）',rank_with_pair:'排名＋搭配',cold_hot_balance:'冷熱平衡'};
 function frequencies(rows,extra=true){const scores=Array(50).fill(0);for(const d of rows)for(const n of [...d.numbers,...(extra?[d.extra_number]:[])])scores[n]++;return scores;}
 const balanceDefaults={hotStart:1,hotEnd:25,coldStart:1,coldEnd:24};
 function validBalanceRanges(r){return !!r&&['hot','cold'].every(k=>Number.isInteger(r[k+'Start'])&&Number.isInteger(r[k+'End'])&&r[k+'Start']>=1&&r[k+'Start']<=r[k+'End']&&r[k+'End']<=49);}
 function balanceRangeText(r){return `最熱第${r.hotStart}–${r.hotEnd}名／最冷第${r.coldStart}–${r.coldEnd}名`;}
 function balanced(rows,count,ranges=balanceDefaults,random=Math.random){
  if(!Array.isArray(rows)||!rows.length||!Number.isInteger(count)||count<6||count>49)throw Error('請選擇6–49個號碼及有效資料範圍。');
  if(!validBalanceRanges(ranges))throw Error('排名範圍須為1–49的整數，起始名次不可大於結束名次。');
  const scores=frequencies(rows),ranked=Array.from({length:49},(_,i)=>i+1).sort((a,b)=>scores[b]-scores[a]||a-b);
  const hotPool=ranked.slice(ranges.hotStart-1,ranges.hotEnd),coldPool=[...ranked].reverse().slice(ranges.coldStart-1,ranges.coldEnd);
  const targetCount=Math.min(count,new Set([...hotPool,...coldPool]).size);
  // Keep the split as even as possible, filling a short side from the other range.
  const hotCount=Math.min(hotPool.length,Math.max(Math.ceil(targetCount/2),targetCount-coldPool.length)),coldCount=targetCount-hotCount;
  const shuffle=pool=>{const a=[...pool];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  // Reserve enough shared candidates for the cold quota when the ranges overlap.
  const hot=[];let shared=0;
  for(const n of shuffle(hotPool)){
   const inCold=coldPool.includes(n);
   if(inCold&&coldPool.length-shared<=coldCount)continue;
   hot.push(n);if(inCold)shared++;
   if(hot.length===hotCount)break;
  }
  const cold=shuffle(coldPool.filter(n=>!hot.includes(n))).slice(0,coldCount);
  return {numbers:[...hot,...cold].sort((a,b)=>a-b),hot,cold};
 }
 function select(rows,{mode='rank',count=10,short=10,cold=false}={}){
  if(!Array.isArray(rows)||!rows.length||!Number.isInteger(count)||count<6||count>49)throw Error('請選擇6–49個號碼及有效資料範圍。');
  if(!['default','rank','rank_regular','blend','rank_with_pair'].includes(mode))throw Error('不支援此比較方法。');
  if(mode==='rank_with_pair')return pairing.select(rows,count).numbers;
  const f=frequencies(rows,mode!=='rank_regular');let scores=f;
  if(mode==='blend'){
   if(!Number.isInteger(short)||short<1||short>rows.length)throw Error('短期期數必須為正整數，且不可超過所選範圍期數。');
   const recent=frequencies(rows.slice(0,short));
   // Multiply both 50% window scores by the same positive denominator.
   // Integer numerators keep equal scores exactly tied, so number order wins.
   scores=f.map((x,i)=>x*short+recent[i]*rows.length);
  }
  const ranked=Array.from({length:49},(_,i)=>i+1).sort((a,b)=>(cold&&mode==='rank'?scores[a]-scores[b]:scores[b]-scores[a])||a-b);
  return ranked.slice(0,count).sort((a,b)=>a-b);
 }
 function hits(numbers,draw){return {hits:draw.numbers.filter(n=>numbers.includes(n)).length,extra:numbers.includes(draw.extra_number)?1:0};}
 function summary(rows){return {draws:rows.length,mean:rows.length?rows.reduce((s,r)=>s+r.hits,0)/rows.length:0,hit3:rows.filter(r=>r.hits>=3).length,hit4:rows.filter(r=>r.hits>=4).length,extra:rows.reduce((s,r)=>s+r.extra,0)};}
 function baseline(count){return {mean:6*count/49,hit3:[3,4,5,6].reduce((s,k)=>s+engine.choose(count,k)*engine.choose(49-count,6-k)/engine.choose(49,6),0),hit4:[4,5,6].reduce((s,k)=>s+engine.choose(count,k)*engine.choose(49-count,6-k)/engine.choose(49,6),0)};}
 function blendWeightText(train,short){return `最近 ${short} 期合計權重 ${((.5+.5*short/train)*100).toFixed(1)}%，其餘 ${train-short} 期 ${((.5-.5*short/train)*100).toFixed(1)}%`;}
 function compare(data,{train,short,count,periods}){
  if(!Number.isInteger(train)||train<1||!Number.isInteger(periods)||periods<1||train+periods>data.length||!Number.isInteger(short)||short<1||short>train)throw Error('請輸入有效整數期數；短期不可超過訓練期數，訓練與核對期數合共不可超過資料筆數。');
  const rows=[];
  for(let i=0;i<periods;i++){
   const previous=data.slice(i+1,i+train+1),draw=data[i];
   for(const mode of ['rank','rank_regular','blend','rank_with_pair']){const numbers=select(previous,{mode,count,short});rows.push({mode,draw:draw.draw_number,date:draw.draw_date,trainingNewest:previous[0].draw_date,trainingOldest:previous.at(-1).draw_date,numbers,...hits(numbers,draw)});}
  }
  return rows;
 }
 return {labels,frequencies,select,hits,summary,baseline,compare,blendWeightText,balanceDefaults,validBalanceRanges,balanceRangeText,balanced};
})(typeof module!=='undefined'?require('./core.js'):Engine,typeof module!=='undefined'?require('./pairing.js'):Pairing);
if(typeof module!=='undefined')module.exports=Selection;
