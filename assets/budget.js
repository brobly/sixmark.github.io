/* Reproducible budgeted coverage search. Simulation does not certify a guarantee. */
const Budget = (()=>{
 const templates=typeof module!=='undefined'?require('./cover-templates.js'):CoverTemplates;
 const all=Array.from({length:49},(_,i)=>i+1);
 function rng(seed){let s=seed>>>0;return ()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
 function pick(pool,n,r){const a=[...pool];for(let i=0;i<n;i++){const j=i+Math.floor(r()*(a.length-i));[a[i],a[j]]=[a[j],a[i]];}return a.slice(0,n).sort((a,b)=>a-b);}
 const key=b=>b.join(',');
 function random(pool,count,seed){const r=rng(seed),bets=[],seen=new Set();while(bets.length<count){const b=pick(pool,6,r),k=key(b);if(!seen.has(k)){seen.add(k);bets.push(b);}}return bets;}
 function mask(b){let lo=0,hi=0;for(const n of b)if(n<=31)lo|=1<<(n-1);else hi|=1<<(n-32);return [lo,hi];}
 function pop(x){x-=x>>>1&0x55555555;x=(x&0x33333333)+(x>>>2&0x33333333);return (((x+(x>>>4))&0x0F0F0F0F)*0x01010101)>>>24;}
 const hit=(a,b)=>pop(a[0]&b[0])+pop(a[1]&b[1]);
 function samples(n,seed){const r=rng(seed);return Array.from({length:n},()=>mask(pick(all,6,r)));}
 function score(bets,draws,target){const bm=bets.map(mask);let wins=0;for(const d of draws)if(bm.some(b=>hit(b,d)>=target))wins++;return wins;}
 function optimize(pool,count,target,seed){if(count===1)return random(pool,count,seed);const draws=samples(1800,seed^0x51a0),r=rng(seed^0xf031);let best=random(pool,count,seed),value=score(best,draws,target);
  if(pool.length===12&&count===15&&target===3)return templates.twelve.map(b=>b.map(i=>pool[i-1]));
  for(let i=0;i<100;i++){const candidate=best.map(b=>[...b]),slot=Math.floor(r()*count);candidate[slot]=pick(pool,6,r);if(new Set(candidate.map(key)).size!==count)continue;const v=score(candidate,draws,target);if(v>value){best=candidate;value=v;}}
  return best;
 }
 function interval(k,n){const z=1.95996398454,p=k/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [Math.max(0,c-h),Math.min(1,c+h)];}
 function assess(bets,target,seed=0x713813){const draws=samples(20000,seed),wins=score(bets,draws,target);return {wins,total:draws.length,probability:wins/draws.length,interval:interval(wins,draws.length)};}
 function validate(pool,count,target){if(!Array.isArray(pool)||pool.length<6||pool.length>49||new Set(pool).size!==pool.length||pool.some(n=>!Number.isInteger(n)||n<1||n>49)||!Number.isInteger(count)||!(count>=1&&count<=10||count===15)||![3,4].includes(target))throw Error('請使用6–49個不同號碼及1至10或15注。');let c=1;for(let i=0;i<6;i++)c=c*(pool.length-i)/(i+1);if(c<count)throw Error('號碼池太細，未能產生指定數量的不同注碼；6碼只可排1注。');}
 function generate(pool,count,target,seed){validate(pool,count,target);return {random:random(pool,count,seed),cover:optimize(pool,count,target,seed)};}
 function subsets(a,k){const out=[];function f(s,p){if(p.length===k){out.push(p);return;}for(let i=s;i<=a.length-(k-p.length);i++)f(i+1,[...p,a[i]]);}f(0,[]);return out;}
 function coverage(pool,bets,k){const b=bets.map(mask),sets=subsets(pool,k);return {covered:sets.filter(s=>b.some(m=>hit(mask(s),m)>=k)).length,total:sets.length};}
 return {all,rng,pick,random,generate,assess,coverage,templates,validate,mask,hit,score,samples};
})();
if(typeof module!=='undefined')module.exports=Budget;
