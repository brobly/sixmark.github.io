const RankOccurrenceUI=(()=>{
 const el=id=>document.getElementById('rank-occurrence-'+id);
 const labels={rank:'頻率（含特別號）',rank_regular:'頻率（只計正選）',blend:'長短期混合（含特別號）'};
 const targets={all:'6個正選＋特別號',regular:'6個正選',special:'特別號'};
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let result=null;
 function read(){return {validationStart:Number(el('validation-start').value),validationEnd:Number(el('validation-end').value),lookback:Number(el('lookback').value),mode:el('mode').value,short:Number(el('short').value),target:el('target').value};}
 function changed(){
  let s=read(),error='';el('blend').hidden=s.mode!=='blend';el('short').disabled=s.mode!=='blend';
  const validRange=Number.isInteger(s.validationStart)&&Number.isInteger(s.validationEnd)&&s.validationStart>=1&&s.validationEnd>=s.validationStart;
  el('period-count').textContent=validRange?`共 ${s.validationEnd-s.validationStart+1} 期`:'共 — 期';
  try{s=RankOccurrence.settings(lotteryData,s);}catch(e){error=e.message;}
  el('error').textContent=error;el('error').hidden=!error;el('run').disabled=!!error;
  el('window').textContent=error?'':`統計第${s.validationStart}–${s.validationEnd}期。首次用第${s.start}–${s.end}期計排名，核對第${s.validationStart}期；最後用第${s.validationEnd+1}–${s.validationEnd+s.lookback}期計排名，核對第${s.validationEnd}期。`;
  el('status').textContent=result?'設定已更改；下方保留上次結果，按「統計排名出現次數」更新。':'';
 }
 function board(key,label){
  const rows=result[key],top=rows[0];
  return `<section class="rank-occurrence-board" aria-labelledby="rank-occurrence-${key}-title"><h4 id="rank-occurrence-${key}-title" data-taught="1">${label}名次出現榜</h4><p class="rank-occurrence-leader">${label}第 <strong>${top.rank}</strong> 名 · 出現 <strong>${top.count}</strong> 次</p><div class="frequency-scroll" role="region" tabindex="0" aria-label="${label}名次出現次數清單"><table class="frequency-table"><thead><tr><th scope="col">次數排名</th><th scope="col">${label}名次</th><th scope="col">出現次數</th></tr></thead><tbody>${rows.map(r=>`<tr><td>第${r.position}名</td><th scope="row">第${r.rank}名</th><td><strong>${r.count}</strong> 次</td></tr>`).join('')}</tbody></table></div></section>`;
 }
 function render(){
  const s=result.settings,first=result.rows[0],last=result.rows.at(-1);
  el('summary').textContent=`第${s.validationStart}–${s.validationEnd}期 · 共 ${s.periods} 個驗證期 · 每期統計${targets[s.target]} · 每榜共 ${result.observations} 次`;
  el('basis').textContent=`排名依據：${labels[s.mode]}${s.mode==='blend'?` · 短期${s.short}期`:''}；每次用 ${s.lookback} 期較舊資料。首次第${s.start}–${s.end}期，其後逐期往舊推。`;
  el('dates').textContent=`驗證範圍：${last.draw}（${last.date}）至 ${first.draw}（${first.date}）`;
  el('boards').innerHTML=board('hot','最熱')+board('cold','最冷');
  el('detail').innerHTML=`<table class="frequency-table"><thead><tr><th scope="col">驗證期</th><th scope="col">排名資料</th><th scope="col">最熱名次</th><th scope="col">最冷名次</th></tr></thead><tbody>${result.rows.map(r=>`<tr><th scope="row">第${r.period}期 · ${esc(r.draw)}<small>${esc(r.date)}</small></th><td>第${r.start}–${r.end}期</td><td>${r.hot.map(n=>`第${n}名`).join('、')}</td><td>${r.cold.map(n=>`第${n}名`).join('、')}</td></tr>`).join('')}</tbody></table>`;
  el('results').hidden=false;el('export').disabled=false;
  transferFeedback();
 }
 function transferFeedback(){
  try{
   const transfer=RankOccurrence.hotSelection(result,Number(el('take-count').value));
   const destination=el('destination').value;
   if(!['filter','rolling'].includes(destination))throw Error('請選擇套入位置。');
   const destinationLabel=destination==='rolling'?'逐期驗證':'揀號';
   el('transfer').textContent=`一鍵套入${destinationLabel}`;
   el('transfer-preview').textContent=`將套入最熱第 ${transfer.hot.replaceAll(',','、')} 名 · 目標 ${transfer.count} 個 · 最冷關閉。`;
   el('transfer-note').textContent=`採用目前完成的「${labels[result.settings.mode]}」統計榜。沿用${destinationLabel}目前期數設定；只套入固定名次，自訂排名按頻率（含特別號）篩選。${result.settings.mode!=='rank'?'注意：來源與套入位置的排名依據不同，相同名次可能代表不同號碼。':''}${destination==='rolling'?'每期重新挑選名次，請改用「動態排名（每期重選名次）」。':''}`;
   el('transfer-error').textContent='';el('transfer-error').hidden=true;el('transfer').disabled=false;
  }catch(e){el('transfer-preview').textContent='';el('transfer-note').textContent='';el('transfer-error').textContent=e.message;el('transfer-error').hidden=false;el('transfer').disabled=true;}
 }
 function applyHot(){
  transferFeedback();if(el('transfer').disabled)return;
  try{
   const transfer=RankOccurrence.hotSelection(result,Number(el('take-count').value));
   if(el('destination').value==='rolling')RollingStudyUI.applyHotRanks(transfer);else applyStudyHotRanks(transfer);
  }
  catch(e){el('transfer-error').textContent=e.message;el('transfer-error').hidden=false;}
 }
 function run(event){
  event?.preventDefault();changed();if(el('run').disabled)return;
  try{const next=RankOccurrence.run(lotteryData,read());result=next;render();el('status').textContent='';}
  catch(e){el('error').textContent=e.message;el('error').hidden=false;}
 }
 function exportCSV(){
  if(!result)return;const s=result.settings;
  const rows=[['統計起點','統計終點','驗證期數','每次排名資料期數','首次排名起點','首次排名終點','排名依據','混合短期','統計對象'],[s.validationStart,s.validationEnd,s.periods,s.lookback,s.start,s.end,labels[s.mode],s.mode==='blend'?s.short:'',targets[s.target]],[],['榜別','次數排名','原本名次','出現次數']];
  for(const [key,label] of [['hot','最熱'],['cold','最冷']])for(const r of result[key])rows.push([label,r.position,r.rank,r.count]);
  rows.push([],['驗證期位置','驗證期號','日期','排名起點','排名終點','最熱名次','最冷名次']);
  for(const r of result.rows)rows.push([r.period,r.draw,r.date,r.start,r.end,r.hot.join(' '),r.cold.join(' ')]);
  download('排名出現統計.csv',rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n'),'text/csv');
 }
 document.addEventListener('DOMContentLoaded',()=>{
  for(const id of ['validation-start','validation-end','lookback'])el(id).max=lotteryData.length-1;
  el('settings').addEventListener('input',changed);changed();
 });
 return {run,changed,exportCSV,transferFeedback,applyHot};
})();
