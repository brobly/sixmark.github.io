/* Shared fixed-size selection rules for filtering and chronological comparison. */
const Selection = ((engine,pairing)=>{
 const labels={default:'純排名（含特別號）',rank:'純排名（含特別號）',rank_regular:'純排名（只計正選）',blend:'長短期混合（含特別號）',rank_with_pair:'排名＋搭配',cold_hot_balance:'自訂熱／冷排名'};
 function frequencies(rows,extra=true){const scores=Array(50).fill(0);for(const d of rows)for(const n of [...d.numbers,...(extra?[d.extra_number]:[])])scores[n]++;return scores;}
 function rankings(rows,{mode='rank',short=10}={}){
  if(!Array.isArray(rows)||!rows.length)throw Error('請選擇有效資料範圍。');
  const f=frequencies(rows,mode!=='rank_regular');let scores=f;
  if(mode==='blend'){
   if(!Number.isInteger(short)||short<1||short>rows.length)throw Error('短期期數必須為正整數，且不可超過所選範圍期數。');
   const recent=frequencies(rows.slice(0,short));
   // Integer scores preserve exact ties for the two equally weighted windows.
   scores=f.map((x,i)=>x*short+recent[i]*rows.length);
  }
  const hot=Array.from({length:49},(_,i)=>i+1).sort((a,b)=>scores[b]-scores[a]||a-b);
  // Reverse the complete order, including ties: one-based hot + cold ranks = 50.
  const cold=[...hot].reverse();
  return {hot,cold};
 }
 const balanceDefaults={hot:'1-5',cold:'1-5',includeCold:true};
 // Historical single-range records keep their original validation and saved numbers.
 function validBalanceRanges(r,count){
  if(r&&Object.hasOwn(r,'hotStart'))return ['hot','cold'].every(k=>Number.isInteger(r[k+'Start'])&&Number.isInteger(r[k+'End'])&&r[k+'Start']>=1&&r[k+'Start']<=r[k+'End']&&r[k+'End']<=49);
  try{
   const normalized=normalizeRanges(r),total=parseRanks(normalized.hot,'最熱').length+(normalized.includeCold?parseRanks(normalized.cold,'最冷').length:0);
   return rangeDetails(normalized,count??total).errors.length===0;
  }catch{return false;}
 }
 function parseRanks(value,label){
  if(typeof value!=='string'||!value.trim())throw Error(`請輸入${label}排名。`);
  const text=value.trim().replace(/[，、]/g,',').replace(/[–—－]/g,'-'),ranks=new Set();
  for(const [index,part] of text.split(',').entries()){
   const match=part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
   if(!match)throw Error(`${label}排名格式有誤，請檢查各段起止名次。`);
   const start=Number(match[1]),end=Number(match[2]??match[1]);
   if(start<1||start>49||end<1||end>49)throw Error(`${label}排名第${index+1}段須為1–49的整數。`);
   if(start>end)throw Error(`${label}排名第${index+1}段：${start} 至 ${end}，起點大於終點；若只選第${start}名，請按該段修正掣。`);
   for(let rank=start;rank<=end;rank++){
    if(ranks.has(rank))throw Error(`${label}排名重複：第${rank}名，請移除重疊範圍。`);
    ranks.add(rank);
   }
  }
  return [...ranks].sort((a,b)=>a-b);
 }
 function normalizeRanges(r){
  // Accept the former single-range shape for callers with existing settings.
  if(r&&Object.hasOwn(r,'hotStart'))return {hot:`${r.hotStart}-${r.hotEnd}`,cold:`${r.coldStart}-${r.coldEnd}`,includeCold:true};
  if(!r||typeof r.includeCold!=='boolean')throw Error('請選擇是否加入最冷排名。');
  if(typeof r.cold!=='string')throw Error('最冷排名格式有誤。');
  return {hot:r.hot,cold:r.cold,includeCold:r.includeCold};
 }
 function rangeDetails(ranges,count,rows=[]){
  const r=normalizeRanges(ranges),hotRanks=parseRanks(r.hot,'最熱'),coldRanks=r.includeCold?parseRanks(r.cold,'最冷'):[];
  const total=hotRanks.length+coldRanks.length,errors=[];
  const overlap=hotRanks.filter(rank=>coldRanks.includes(50-rank));
  const ranked=rows.length?rankings(rows,{mode:'cold_hot_balance'}).hot:null;
  const hot=ranked?hotRanks.map(rank=>ranked[rank-1]):[],cold=ranked?coldRanks.map(rank=>ranked[49-rank]):[];
  if(overlap.length){
   const duplicates=ranked?overlap.map(rank=>ranked[rank-1]).sort((a,b)=>a-b).join('、'):'';
   errors.push(`熱／冷相同號碼${duplicates?`：${duplicates}`:''}，請調整範圍。`);
  }
  if(!Number.isInteger(count)||count<6||count>49)errors.push('目標號碼數須為6–49的整數。');
  else if(total!==count)errors.push(`${total<count?'欠':'多'} ${Math.abs(count-total)} 個，請調整範圍。`);
  return {ranges:r,hotRanks,coldRanks,total,errors,hot,cold,numbers:[...hot,...cold].sort((a,b)=>a-b)};
 }
 function balanceRangeText(ranges){
  if(ranges&&Object.hasOwn(ranges,'hotStart'))return `最熱第${ranges.hotStart}–${ranges.hotEnd}名／最冷第${ranges.coldStart}–${ranges.coldEnd}名`;
  const r=normalizeRanges(ranges);
  return `最熱第${r.hot}名／${r.includeCold?`最冷第${r.cold}名`:'不加入最冷'}`;
 }
 function balanced(rows,count,ranges=balanceDefaults){
  if(!Array.isArray(rows)||!rows.length||!Number.isInteger(count)||count<6||count>49)throw Error('請選擇6–49個號碼及有效資料範圍。');
  const details=rangeDetails(ranges,count,rows);
  if(details.errors.length)throw Error(details.errors.join(' '));
  return {numbers:details.numbers,hot:details.hot,cold:details.cold};
 }
 function select(rows,{mode='rank',count=10,short=10,cold=false}={}){
  if(!Array.isArray(rows)||!rows.length||!Number.isInteger(count)||count<6||count>49)throw Error('請選擇6–49個號碼及有效資料範圍。');
  if(!['default','rank','rank_regular','blend','rank_with_pair'].includes(mode))throw Error('不支援此比較方法。');
  if(mode==='rank_with_pair')return pairing.select(rows,count).numbers;
  const ranks=rankings(rows,{mode,short}),ranked=cold&&mode==='rank'?ranks.cold:ranks.hot;
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
 return {labels,frequencies,rankings,select,hits,summary,baseline,compare,blendWeightText,balanceDefaults,parseRanks,normalizeRanges,rangeDetails,validBalanceRanges,balanceRangeText,balanced};
})(typeof module!=='undefined'?require('./core.js'):Engine,typeof module!=='undefined'?require('./pairing.js'):Pairing);
if(typeof module!=='undefined')module.exports=Selection;
