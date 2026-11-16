/* Pair scores are descriptive heuristics, not estimated winning probabilities. */
const Pairing = (() => {
 const MIN_DRAWS=1, LOW_SAMPLE_DRAWS=30, MIN_SUPPORT=3, PRIOR=8;
 function stats(rows){
  const freq=Array(50).fill(0),co=Array.from({length:50},()=>Array(50).fill(0));
  for(const d of rows){const nums=[...d.numbers,d.extra_number];for(const a of nums){freq[a]++;for(const b of nums)if(a!==b)co[a][b]++;}}
  const ranked=Array.from({length:49},(_,i)=>i+1).sort((a,b)=>freq[b]-freq[a]||a-b);
  return {freq,co,ranked};
 }
 function select(rows,count){
  if(!Number.isInteger(count)||count<3||count>49)throw Error('號碼數必須為 3–49');
  const {freq,co,ranked}=stats(rows),cores=ranked.slice(0,Math.ceil(count/2)),pool=new Set(cores),edges=[];
  if(rows.length>=MIN_DRAWS)for(let a=1;a<=49;a++)for(let b=a+1;b<=49;b++){
   // 7 of 49 sampled without replacement: correction to marginal-product baseline = 7/8.
   const observed=co[a][b],expected=freq[a]*freq[b]/rows.length*7/8;
   const score=(observed-expected)/Math.sqrt(expected+1)*observed/(observed+PRIOR);
   if(observed>=MIN_SUPPORT&&freq[a]>=5&&freq[b]>=5&&score>0)edges.push({a,b,observed,expected,score,freqA:freq[a],freqB:freq[b]});
  }
  edges.sort((a,b)=>b.score-a.score||b.observed-a.observed||a.a-b.a||a.b-b.b);
  const added=[];
  // Evaluate all core-to-candidate edges together, rather than allocating partners by core order.
  for(const e of edges){if(pool.size>=count)break;const candidate=cores.includes(e.a)?e.b:cores.includes(e.b)?e.a:null;if(candidate!==null&&!pool.has(candidate)){pool.add(candidate);added.push(candidate);}}
  const fallback=[];for(const n of ranked){if(pool.size>=count)break;if(!pool.has(n)){pool.add(n);fallback.push(n);}}
  const pairs=edges.filter(e=>pool.has(e.a)&&pool.has(e.b)).slice(0,12);
  return {version:2,lowSample:rows.length<LOW_SAMPLE_DRAWS,numbers:[...pool].sort((a,b)=>a-b),cores,added,fallback,pairs,sample:rows.length};
 }
 function legacy(rows,count){
  const {ranked,co}=stats(rows),cores=ranked.slice(0,Math.ceil(count/2)),out=new Set(cores);
  for(const a of cores){if(out.size>=count)break;const b=ranked.filter(x=>x!==a).sort((x,y)=>co[a][y]-co[a][x]||x-y).find(x=>!out.has(x));if(b)out.add(b);}
  for(const n of ranked){if(out.size>=count)break;out.add(n);}return [...out].sort((a,b)=>a-b);
 }
 function seeded(seed){let v=seed>>>0;return ()=>{v+=0x6D2B79F5;let t=Math.imul(v^v>>>15,1|v);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
 function sample(pool,n,rng){const a=[...pool];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a.slice(0,n);}
 function choose(n,k){if(n<k)return 0;let c=1;for(let i=1;i<=k;i++)c=c*(n-i+1)/i;return Math.round(c);}
 function tickets(pool,pairs,count,rng=Math.random){
  if(!Array.isArray(pool)||new Set(pool).size!==pool.length||pool.length<6||pool.length>49||pool.some(n=>!Number.isInteger(n)||n<1||n>49)||!Number.isInteger(count)||count<1||count>10)throw Error('請選至少 6 碼及 1–10 注');
  pool=[...pool].sort((a,b)=>a-b);
  const valid=pairs.filter(p=>pool.includes(p.a)&&pool.includes(p.b)),bets=[],seen=new Set(),usage=valid.map(()=>0);let relaxed=0;
  const target=Math.min(count,choose(pool.length,6));
  for(let i=0;i<target;i++){
   let best=null,bestScore=Infinity;
   for(let attempt=0;attempt<160;attempt++){
    const least=Math.min(...usage),eligible=valid.map((_,j)=>j).filter(j=>usage[j]===least);
    const anchor=valid.length?valid[eligible[Math.floor(rng()*eligible.length)]]:null;
    const fixed=anchor?[anchor.a,anchor.b]:[],nums=[...fixed,...sample(pool.filter(n=>!fixed.includes(n)),6-fixed.length,rng)].sort((a,b)=>a-b),key=nums.join(',');
    if(seen.has(key))continue;
    const maxOverlap=bets.reduce((m,b)=>Math.max(m,b.filter(n=>nums.includes(n)).length),0);
    const repeated=bets.reduce((s,b)=>s+b.filter(n=>nums.includes(n)).length,0);
    const score=maxOverlap*100+repeated;
    if(score<bestScore){best=nums;bestScore=score;}
   }
   // Exhaustive fallback only needed for small, almost exhausted pools.
   if(!best&&pool.length<=10){const visit=(at,chosen)=>{if(best)return;if(chosen.length===6){if(!seen.has(chosen.join(','))&&(!valid.length||valid.some(p=>chosen.includes(p.a)&&chosen.includes(p.b))))best=[...chosen];return;}for(let j=at;j<pool.length;j++)visit(j+1,[...chosen,pool[j]]);};visit(0,[]);}
   if(!best)break;
   if(bets.some(b=>b.filter(n=>best.includes(n)).length>4))relaxed++;
   bets.push(best);seen.add(best.join(','));valid.forEach((p,j)=>{if(best.includes(p.a)&&best.includes(p.b))usage[j]++;});
  }
  return {bets,usage:valid.map((p,i)=>({...p,used:usage[i]})),relaxed,requested:count};
 }
 const labels={rank:'純排名',legacy:'舊搭配（同碼數）',paired:'新搭配＋保留搭配',random:'隨機基準'};
 function comparePeriod(data,index,train,size,count,engine){
  if(index<0||index+train>=data.length)throw Error('資料範圍不足');
  const previous=data.slice(index+1,index+train+1),target=data[index],selection=select(previous,size);
  const seed=Number(target.draw_date.replaceAll('-',''));
  const pools={rank:stats(previous).ranked.slice(0,size).sort((a,b)=>a-b),legacy:legacy(previous,size),paired:selection.numbers,random:sample(Array.from({length:49},(_,i)=>i+1),size,seeded(seed+49)).sort((a,b)=>a-b)};
  return Object.entries(pools).map(([mode,pool])=>{
   const generated=tickets(pool,mode==='paired'?selection.pairs:[],count,seeded(seed+137));
   if(generated.bets.length!==count)throw Error('無法產生足夠的不重複注數，請降低注數');
   const wins=generated.bets.filter(b=>engine.prize(b.filter(n=>target.numbers.includes(n)).length,b.includes(target.extra_number))>=0).length;
   return {mode,draw:target.draw_number,date:target.draw_date,trainingNewest:previous[0].draw_date,trainingOldest:previous[previous.length-1].draw_date,pool,bets:generated.bets,poolHits:pool.filter(n=>target.numbers.includes(n)).length,wins};
  });
 }
 return {select,legacy,stats,tickets,seeded,sample,comparePeriod,labels,MIN_DRAWS,LOW_SAMPLE_DRAWS,MIN_SUPPORT,PRIOR};
})();
if(typeof module!=='undefined')module.exports=Pairing;
