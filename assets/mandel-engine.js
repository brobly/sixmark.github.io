/* Self-contained runtime shared by Blob workers and cooperative main-thread fallback. */
function createMandelRuntime(){
 function* combinations(n,k,start=0,prefix=[]){
  if(!k){yield prefix;return;}
  for(let i=start;i<=n-k;i++)yield* combinations(n,k-1,i+1,[...prefix,i]);
 }
 function* createStepper(n){
  if(!Number.isInteger(n)||n<7||n>18)throw Error('請選擇 7–18 個號碼');
  const ids=new Map(),owners=[],candidates=[],coverage=[],bets=[];let ticks=0;
  for(const c of combinations(n,5)){
   const mask=c.reduce((m,i)=>m|(1<<i),0);ids.set(mask,owners.length);owners.push([]);
   if(++ticks%256===0)yield {progress:0};
  }
  for(const c of combinations(n,6)){
   const mask=c.reduce((m,i)=>m|(1<<i),0),index=candidates.length;
   const covered=c.map(i=>ids.get(mask^(1<<i)));
   candidates.push(c);coverage.push(covered);covered.forEach(id=>owners[id].push(index));
   if(++ticks%256===0)yield {progress:0};
  }
  const scores=new Uint8Array(candidates.length).fill(6),seen=new Uint8Array(owners.length);
  let remaining=owners.length;
  while(remaining){
   let best=-1,score=0;
   for(let i=0;i<scores.length;i++){
    if(scores[i]>score){best=i;score=scores[i];}
    if(++ticks%4096===0)yield {progress:100*(owners.length-remaining)/owners.length};
   }
   if(best<0)throw Error('無法完成五元組覆蓋');
   bets.push(candidates[best]);
   for(const id of coverage[best])if(!seen[id]){
    seen[id]=1;remaining--;for(const owner of owners[id])scores[owner]--;
   }
  }
  return bets;
 }
 return {createStepper};
}
const MandelEngine=createMandelRuntime();
// Filter real lottery numbers after covering generation, never their zero-based indices.
MandelEngine.hasFourInDecade=numbers=>{
 const counts=[0,0,0,0,0];
 return numbers.some(n=>++counts[Math.floor(n/10)]>=4);
};
MandelEngine.filterBets=(bets,advanced=false)=>{
 const kept=advanced?bets.filter(b=>!MandelEngine.hasFourInDecade(b)):bets;
 return {bets:kept,filterInfo:{version:1,advanced:!!advanced,originalCount:bets.length,removedCount:bets.length-kept.length,retainedCount:kept.length}};
};
MandelEngine.workerSource=()=>`const runtime=(${createMandelRuntime.toString()})();self.onmessage=({data:n})=>{try{const work=runtime.createStepper(n);let next,last=-1;while(!(next=work.next()).done){const progress=Math.floor(next.value.progress);if(progress!==last){postMessage({progress});last=progress;}}postMessage({progress:100,bets:next.value});}catch(e){postMessage({error:e.message});}};`;
if(typeof module!=='undefined')module.exports=MandelEngine;
