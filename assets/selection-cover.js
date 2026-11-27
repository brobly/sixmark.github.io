/* Greedy coverage of triples, with balanced number usage to break ties. */
const SelectionCover = ((engine)=>{
 function pick(pool,size,random){const a=[...pool];for(let i=0;i<size;i++){const j=i+Math.floor(random()*(a.length-i));[a[i],a[j]]=[a[j],a[i]];}return a.slice(0,size).sort((a,b)=>a-b);}
 function triples(a){const out=[];for(let i=0;i<a.length-2;i++)for(let j=i+1;j<a.length-1;j++)for(let k=j+1;k<a.length;k++)out.push((a[i]*50+a[j])*50+a[k]);return out;}
 function generate(pool,size,count,random=Math.random){
  if(!engine.validNumbers(pool,6,49)||!Number.isInteger(size)||size<6||size>15||size>pool.length||!Number.isInteger(count)||count<1||count>30)throw Error('請選擇有效碼數及1–30注。');
  const maximum=engine.choose(pool.length,size);
  if(count>maximum)throw Error(`目前 ${pool.length} 碼只能排 ${maximum} 注不同的 ${size} 碼組合；請減少注數或增加候選號碼。`);
  const covered=new Set(),seen=new Set(),uses=Array(50).fill(0),bets=[];
  let exhaustive=null;
  if(maximum<=500){exhaustive=[];const walk=(start,a)=>{if(a.length===size){exhaustive.push([...a]);return;}for(let i=start;i<=pool.length-(size-a.length);i++)walk(i+1,[...a,pool[i]]);};walk(0,[]);}
  for(let slot=0;slot<count;slot++){
   const options=exhaustive||Array.from({length:180},()=>pick(pool,size,random));
   if(!exhaustive)options.push([...pool].map(n=>({n,t:random()})).sort((a,b)=>uses[a.n]-uses[b.n]||a.t-b.t).slice(0,size).map(x=>x.n).sort((a,b)=>a-b));
   let best=null,bestScore=-Infinity,bestTriples=[];
   for(const numbers of options){
    const key=[...numbers].sort((a,b)=>a-b).join(',');if(seen.has(key))continue;
    const ts=triples(numbers),fresh=ts.reduce((n,t)=>n+!covered.has(t),0),balance=numbers.reduce((n,x)=>n+uses[x],0),score=fresh*10000-balance+random();
    if(score>bestScore){bestScore=score;best=[...numbers].sort((a,b)=>a-b);bestTriples=ts;}
   }
   if(!best)throw Error('未能排出不同注碼，請重新抽取。');
   seen.add(best.join(','));bets.push(best);best.forEach(n=>uses[n]++);bestTriples.forEach(t=>covered.add(t));
  }
  return {bets,covered:covered.size,total:engine.choose(pool.length,3)};
 }
 function randomPool(count,random=Math.random){if(!Number.isInteger(count)||count<6||count>49)throw Error('請選擇6–49個號碼。');return pick(Array.from({length:49},(_,i)=>i+1),count,random);}
 return {generate,randomPool};
})(typeof module!=='undefined'?require('./core.js'):Engine);
if(typeof module!=='undefined')module.exports=SelectionCover;
