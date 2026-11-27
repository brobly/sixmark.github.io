const FrequencyStudyUI=(()=>{
 const el=id=>document.getElementById('frequency-'+id);
 let result=null;
 function read(){return {start:Number(el('start').value),end:Number(el('end').value),includeExtra:el('basis').value==='all'};}
 function changed(){
  let error='';
  try{FrequencyStudy.summarize(lotteryData,read());}catch(e){error=e.message;}
  el('error').textContent=error;el('error').hidden=!error;el('run').disabled=!!error;
  el('status').textContent=result?'設定已更改；下方保留上次結果，按「更新排名」套用。':'';
 }
 function render(){
  if(!result)return;
  const order=el('order').value,rows=FrequencyStudy.orderedRows(result,order),basis=result.includeExtra?'正選＋特別號':'只計正選';
  el('summary').textContent=`最近第${result.start}–${result.end}期 · 共 ${result.periods} 期 · ${basis} · 已出現 ${result.seen} 個號碼，未出現 ${49-result.seen} 個`;
  el('dates').textContent=`${result.oldest.draw_number}（${result.oldest.draw_date}）至 ${result.newest.draw_number}（${result.newest.draw_date}）`;
  const header=(key,label)=>`<th scope="col"${order===key?' aria-sort="ascending"':''}>${label}</th>`;
  el('table').innerHTML=`<table class="frequency-table"><thead><tr>${header('number','號碼')}<th scope="col">出現次數</th>${header('hot','最熱排名')}${header('cold','最冷排名')}</tr></thead><tbody>${rows.map(r=>`<tr><th scope="row"><span class="frequency-number">${r.number}</span></th><td>${r.count}<span class="frequency-count-note">${r.count?' 次':' 次 · 未出現'}</span></td><td${order==='hot'?' class="frequency-active-rank"':''}>${r.hotRank}</td><td${order==='cold'?' class="frequency-active-rank"':''}>${r.coldRank}</td></tr>`).join('')}</tbody></table>`;
  el('table').scrollTop=0;el('results').hidden=false;el('export').disabled=false;
 }
 function run(event){
  event?.preventDefault();
  try{const next=FrequencyStudy.summarize(lotteryData,read());result=next;render();el('error').hidden=true;el('error').textContent='';el('run').disabled=false;el('status').textContent='';}
  catch(e){el('error').textContent=e.message;el('error').hidden=false;el('run').disabled=true;el('status').textContent=result?'下方保留上次完成的排名。':'';}
 }
 function preset(count){el('start').value='1';el('end').value=String(Math.min(count,lotteryData.length));run();}
 function exportCSV(){
  if(!result)return;
  const rows=[['最近起點','最近終點','統計期數','統計方式','最早期號','最新期號','號碼','出現次數','最熱排名','最冷排名'],...FrequencyStudy.orderedRows(result,el('order').value).map(r=>[result.start,result.end,result.periods,result.includeExtra?'正選＋特別號':'只計正選',result.oldest.draw_number,result.newest.draw_number,r.number,r.count,r.hotRank,r.coldRank])];
  download(`熱冷排名-第${result.start}-${result.end}期.csv`,rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n'),'text/csv');
 }
 document.addEventListener('DOMContentLoaded',()=>{
  for(const id of ['start','end'])el(id).max=lotteryData.length;
  if(Number(el('end').value)>lotteryData.length)el('end').value=String(lotteryData.length);
  for(const id of ['start','end','basis'])el(id).addEventListener('input',changed);
  run();
 });
 return {run,preset,changed,render,exportCSV};
})();
