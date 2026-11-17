/* Shared fixed-size selection rules for filtering and chronological comparison. */
const Selection = ((engine,pairing)=>{
 const labels={default:'純排名（含特別號）',rank:'純排名（含特別號）',rank_regular:'純排名（只計正選）',blend:'長短期混合（含特別號）',rank_with_pair:'排名＋搭配',cold_hot_balance:'冷熱平衡'};
 function frequencies(rows,extra=true){const scores=Array(50).fill(0);for(const d of rows)for(const n of [...d.numbers,...(extra?[d.extra_number]:[])])scores[n]++;return scores;}
 function select(rows,{mode='rank',count=10,short=10,cold=false}={}){
  if(!Array.isArray(rows)||!rows.length||!Number.isInteger(count)||count<6||count>49)throw Error('請選擇6–49個號碼及有效資料範圍。');
  if(!['default','rank','rank_regular','blend','rank_with_pair'].includes(mode))throw Error('不支援此比較方法。');
  if(mode==='rank_with_pair')return pairing.select(rows,count).numbers;
  const f=frequencies(rows,mode!=='rank_regular');let scores=f;
  if(mode==='blend'){
   if(!Number.isInteger(short)||short<1||short>rows.length)throw Error('短期期數必須為正整數，且不可超過所選範圍期數。');
   const recent=frequencies(rows.slice(0,short));scores=f.map((x,i)=>.5*x/rows.length+.5*recent[i]/short);
  }
  const ranked=Array.from({length:49},(_,i)=>i+1).sort((a,b)=>(cold&&mode==='rank'?scores[a]-scores[b]:scores[b]-scores[a])||a-b);
  return ranked.slice(0,count).sort((a,b)=>a-b);
 }
 function hits(numbers,draw){return {hits:draw.numbers.filter(n=>numbers.includes(n)).length,extra:numbers.includes(draw.extra_number)?1:0};}
 function summary(rows){return {draws:rows.length,mean:rows.length?rows.reduce((s,r)=>s+r.hits,0)/rows.length:0,hit3:rows.filter(r=>r.hits>=3).length,hit4:rows.filter(r=>r.hits>=4).length,extra:rows.reduce((s,r)=>s+r.extra,0)};}
 function baseline(count){return {mean:6*count/49,hit3:[3,4,5,6].reduce((s,k)=>s+engine.choose(count,k)*engine.choose(49-count,6-k)/engine.choose(49,6),0),hit4:[4,5,6].reduce((s,k)=>s+engine.choose(count,k)*engine.choose(49-count,6-k)/engine.choose(49,6),0)};}
 function compare(data,{train,short,count,periods}){
  if(!Number.isInteger(train)||train<1||!Number.isInteger(periods)||periods<1||train+periods>data.length||!Number.isInteger(short)||short<1||short>train)throw Error('請輸入有效整數期數；短期不可超過訓練期數，訓練與核對期數合共不可超過資料筆數。');
  const rows=[];
  for(let i=0;i<periods;i++){
   const previous=data.slice(i+1,i+train+1),draw=data[i];
   for(const mode of ['rank','rank_regular','blend','rank_with_pair']){const numbers=select(previous,{mode,count,short});rows.push({mode,draw:draw.draw_number,date:draw.draw_date,trainingNewest:previous[0].draw_date,trainingOldest:previous.at(-1).draw_date,numbers,...hits(numbers,draw)});}
  }
  return rows;
 }
 return {labels,frequencies,select,hits,summary,baseline,compare};
})(typeof module!=='undefined'?require('./core.js'):Engine,typeof module!=='undefined'?require('./pairing.js'):Pairing);
if(typeof module!=='undefined')module.exports=Selection;
