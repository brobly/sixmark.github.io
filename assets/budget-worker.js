importScripts('cover-templates.js','budget.js');
onmessage=({data:d})=>{try{const groups=Budget.generate(d.pool,d.count,d.target,d.seed);postMessage({groups,assessment:Object.fromEntries(Object.entries(groups).map(([k,b])=>[k,Budget.assess(b,d.target)])),coverage:d.pool.length<=15?Budget.coverage(d.pool,groups.cover,d.target):null});}catch(e){postMessage({error:e.message});}};
