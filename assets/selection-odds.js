/* Exact draw probabilities. Equivalent number memberships are counted together. */
const SelectionOdds = ((engine) => {
 const all = Array.from({length:49}, (_,i)=>i+1);
 const tiers = [[6,0],[5,1],[5,0],[4,1],[4,0],[3,1],[3,0]];
 const names = ['頭獎','二獎','三獎','四獎','五獎','六獎','七獎'];
 function pool(count) {
  if (!Number.isInteger(count) || count<6 || count>49) throw Error('候選號碼須為6–49碼。');
  const states=[];
  for(let regular=0;regular<=6;regular++) for(let extra=0;extra<=1;extra++) {
   const p=engine.choose(count,regular)*engine.choose(49-count,6-regular)/engine.choose(49,6);
   states.push({regular,extra,probability:p*(extra?count-regular:43-count+regular)/43});
  }
  return {count,states,hit3:states.filter(s=>s.regular>=3).reduce((a,s)=>a+s.probability,0),
   hit4:states.filter(s=>s.regular+s.extra>=4).reduce((a,s)=>a+s.probability,0),
   all7:states.find(s=>s.regular===6&&s.extra===1).probability};
 }
 function groups(bet) {
  if(bet.mode==='groups') return bet.groups.flatMap(groups);
  if(bet.mode==='mandel') return bet.bets.map(numbers=>({numbers,bankers:[]}));
  return [{numbers:bet.numbers,bankers:bet.bankers||[]}];
 }
 function mask(numbers) {
  let lo=0,hi=0;
  for(const n of numbers) if(n<=31)lo|=1<<(n-1);else hi|=1<<(n-32);
  return [lo,hi];
 }
 function pop(x) {x-=x>>>1&0x55555555;x=(x&0x33333333)+(x>>>2&0x33333333);return (((x+(x>>>4))&0x0F0F0F0F)*0x01010101)>>>24;}
 function* calculate(bet,candidates,universe=all) {
  if(!engine.validNumbers(candidates,6,49)||!engine.validNumbers(universe,7,49)||!candidates.every(n=>universe.includes(n)))throw Error('概率號碼池無效。');
  const raw=groups(bet),seen=new Set(),gs=[];
  for(const g of raw) {
   if(!engine.validNumbers(g.bankers,0,5)||!engine.validNumbers(g.numbers,6-g.bankers.length,49)||g.numbers.some(n=>g.bankers.includes(n)))throw Error('注碼格式無效。');
   const key=[...g.bankers].sort((a,b)=>a-b).join(',')+'|'+[...g.numbers].sort((a,b)=>a-b).join(',');
   if(!seen.has(key)){seen.add(key);gs.push(g);}
  }
  const full=mask(universe),pm=mask(candidates),classes=new Map();
  // Pool membership participates in the partition so the conditional count is exact too.
  for(const n of universe) {
   const sig=gs.map(g=>g.bankers.includes(n)?2:g.numbers.includes(n)?1:0);
   const inPool=candidates.includes(n),key=sig.join('')+'|'+Number(inPool);
   if(!classes.has(key))classes.set(key,{sig,inPool,numbers:[]});
   classes.get(key).numbers.push(n);
  }
  const parts=[...classes.values()].sort((a,b)=>a.numbers.length-b.numbers.length);
  const suffix=Array(parts.length+1).fill(0);
  for(let i=parts.length-1;i>=0;i--)suffix[i]=suffix[i+1]+parts[i].numbers.length;
  const lookups=gs.map(g=>{
   const runners=mask(g.numbers.filter(n=>universe.includes(n))),bankers=mask(g.bankers.filter(n=>universe.includes(n)));
   const outside=[full[0]&~(runners[0]|bankers[0]),full[1]&~(runners[1]|bankers[1])];
   const categories=[outside,runners,bankers],table=[];
   for(let b=0;b<=6;b++)for(let r=0;r<=6;r++) {
    const contributions=[];
    for(let e=0;e<3;e++) {
     if(e===2&&!g.bankers.length)continue;
     const be=Number(e===2),re=Number(e===1),other=g.numbers.length-r-re,need=6-g.bankers.length;
     for(let t=0;t<7;t++) {
      const [m,x]=tiers[t],a=m-b,c=x-be,o=need-a-c;
      if(a>=0&&a<=r&&c>=0&&c<=re&&o>=0&&o<=other)
       contributions.push([t,...categories[e]]);
     }
    }
    table[b*7+r]=contributions;
   }
   return table;
  });
  const regular=new Uint8Array(gs.length),banker=new Uint8Array(gs.length);
  const totals=Array(9).fill(0),conditional=Array(9).fill(0);
  // Keep the first banker group's roles separate, including when an extra ticket
  // is present. Pool hits alone cannot describe a banker ticket's outcome.
  const bankerIndex=gs.findIndex(g=>g.bankers.length),bankerStates=new Map();
  let bankerMasks;
  if(bankerIndex>=0){
   const g=gs[bankerIndex],bm=mask(g.bankers.filter(n=>universe.includes(n))),rm=mask(g.numbers.filter(n=>universe.includes(n)));
   bankerMasks=[[full[0]&~(bm[0]|rm[0]),full[1]&~(bm[1]|rm[1])],rm,bm];
  }
  const byPoolHits=Array.from({length:14},(_,i)=>{
   const regular=Math.floor(i/2),extra=i%2;
   const draws=engine.choose(candidates.length,regular)*engine.choose(universe.length-candidates.length,6-regular);
   const denominator=Math.max(0,draws*(extra?candidates.length-regular:universe.length-candidates.length-6+regular));
   return {regular,extra,denominator,favorable:Array(9).fill(0)};
  });
  let visited=0,weightTotal=0;
  const lo=new Int32Array(9),hi=new Int32Array(9);
  function score(drawLo,drawHi,weight,outsidePool) {
   lo.fill(0);hi.fill(0);
   for(let j=0;j<gs.length;j++) for(const [t,a,b] of lookups[j][banker[j]*7+regular[j]]) {lo[t]|=a;hi[t]|=b;}
   for(let t=0;t<7;t++) {lo[7]|=lo[t];hi[7]|=hi[t];if(t<6){lo[8]|=lo[t];hi[8]|=hi[t];}}
   if(bankerMasks)for(let extraRole=0;extraRole<3;extraRole++){
    const a=bankerMasks[extraRole][0]&~drawLo,b=bankerMasks[extraRole][1]&~drawHi;
    const available=pop(a)+pop(b);if(!available)continue;
    const bankerRegular=banker[bankerIndex],runnerRegular=regular[bankerIndex],key=`${bankerRegular},${runnerRegular},${extraRole}`;
    if(!bankerStates.has(key))bankerStates.set(key,{bankerRegular,runnerRegular,extraRole,denominator:0,favorable:Array(9).fill(0)});
    const state=bankerStates.get(key);state.denominator+=weight*available;
    for(let t=0;t<9;t++)state.favorable[t]+=weight*(pop(a&lo[t])+pop(b&hi[t]));
   }
   for(let t=0;t<9;t++) {
    const a=lo[t]&~drawLo,b=hi[t]&~drawHi;
    const eligible=pop(a)+pop(b),inside=pop(a&pm[0])+pop(b&pm[1]),state=(6-outsidePool)*2;
    totals[t]+=weight*eligible;
    byPoolHits[state].favorable[t]+=weight*(eligible-inside);
    byPoolHits[state+1].favorable[t]+=weight*inside;
    if(!outsidePool)conditional[t]+=weight*inside;
   }
   weightTotal+=weight;
  }
  function* walk(index,left,drawLo,drawHi,weight,outsidePool) {
   if(left===0) {
    score(drawLo,drawHi,weight,outsidePool);
    if(++visited%2000===0)yield {visited};
    return;
   }
   if(index===parts.length||suffix[index]<left)return;
   const part=parts[index],max=Math.min(left,part.numbers.length),min=Math.max(0,left-suffix[index+1]);
   let a=drawLo,b=drawHi;
   for(let take=0;take<=max;take++) {
    if(take) {
     const n=part.numbers[take-1];if(n<=31)a|=1<<(n-1);else b|=1<<(n-32);
     for(let j=0;j<gs.length;j++){if(part.sig[j]===1)regular[j]++;else if(part.sig[j]===2)banker[j]++;}
    }
    if(take>=min)yield* walk(index+1,left-take,a,b,weight*engine.choose(part.numbers.length,take),outsidePool+(!part.inPool?take:0));
   }
   for(let j=0;j<gs.length;j++){if(part.sig[j]===1)regular[j]-=max;else if(part.sig[j]===2)banker[j]-=max;}
  }
  yield* walk(0,6,0,0,1,0);
  const denominator=engine.choose(universe.length,6)*(universe.length-6),conditionalDenominator=engine.choose(candidates.length,6)*(candidates.length-6);
  for(const state of byPoolHits)state.probabilities=state.denominator?state.favorable.map(n=>n/state.denominator):null;
  const byBankerHits=[...bankerStates.values()].sort((a,b)=>a.bankerRegular-b.bankerRegular||a.runnerRegular-b.runnerRegular||a.extraRole-b.extraRole);
  for(const state of byBankerHits){state.probability=state.denominator/denominator;state.probabilities=state.favorable.map(n=>n/state.denominator);}
  return {probabilities:totals.map(n=>n/denominator),conditional:conditionalDenominator?conditional.map(n=>n/conditionalDenominator):null,
   favorable:totals,conditionalFavorable:conditional,denominator,conditionalDenominator,byPoolHits,byBankerHits,visited,weightTotal};
 }
 return {pool,calculate,names,tiers};
})(typeof module!=='undefined'?require('./core.js'):Engine);
if(typeof module!=='undefined')module.exports=SelectionOdds;
