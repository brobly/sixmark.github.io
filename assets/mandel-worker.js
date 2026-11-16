// Optional HTTP worker entry point; the page uses the equivalent self-contained Blob worker.
importScripts('mandel-engine.js');
self.onmessage=({data:n})=>{
 try{const work=MandelEngine.createStepper(n);let next,last=-1;
  while(!(next=work.next()).done){const progress=Math.floor(next.value.progress);if(progress!==last){postMessage({progress});last=progress;}}
  postMessage({progress:100,bets:next.value});
 }catch(e){postMessage({error:e.message});}
};
