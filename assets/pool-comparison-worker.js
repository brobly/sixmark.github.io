importScripts('core.js','pairing.js','selection.js','cover-templates.js','budget.js?v=20261118-rolling49','pool-comparison.js?v=20261118-rolling49');
onmessage=async({data})=>{
 try{
  const result=await PoolComparison.run(data.draws,data.settings,{onProgress:progress=>postMessage({progress})});
  postMessage({result});
 }catch(error){postMessage({error:error.message});}
};
