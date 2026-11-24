importScripts('core.js?v=20261117-prospective','selection-odds.js?v=20261124-repeat-banker-odds');
onmessage=({data})=>{
 try{
  const work=SelectionOdds.calculate(data.bet,data.pool);let step,last=0;
  while(!(step=work.next()).done){if(Date.now()-last>500){postMessage({progress:step.value});last=Date.now();}}
  postMessage({result:step.value});
 }catch(error){postMessage({error:error.message});}
};
