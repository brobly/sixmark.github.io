const RollingStudyUI=(()=>{
 const el=id=>document.getElementById(id),esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let result=null,job=null,page=0;
 function read(){return {start:Number(el('rolling-start').value),end:Number(el('rolling-end').value),periods:Number(el('rolling-periods').value),count:Number(el('rolling-count').value),short:Number(el('rolling-short').value),rankLookback:Number(el('rolling-rank-lookback').value),methods:RollingStudy.methods.filter(m=>el('rolling-method-'+m).checked),balanceRanges:{hot:el('rolling-hot-ranges').value.trim(),cold:el('rolling-cold-ranges').value.trim(),includeCold:el('rolling-include-cold').checked}};}
 function rangeFeedback(s=read()){
  RankRangesUI.sync('rolling');
  let warning='';el('rolling-balance-summary').textContent='';
  if(s.methods.includes('cold_hot_balance')){
   try{
    const validWindow=Number.isInteger(s.start)&&Number.isInteger(s.end)&&s.start>=2&&s.end>=s.start&&s.end<=lotteryData.length;
    const details=RollingStudy.rangeDetails(s.balanceRanges,s.count,validWindow?lotteryData.slice(s.start-1,s.end):[]);
    el('rolling-balance-summary').textContent=`熱 ${details.hotRanks.length}＋冷 ${details.coldRanks.length}＝${details.total} / ${s.count} 個`;
    warning=details.errors.join(' ');
   }catch(error){warning=error.message;}
  }
  el('rolling-balance-error').textContent=warning?'警告：'+warning:'';
  el('rolling-balance-error').hidden=!warning;
  let dynamicError='';
  if(s.methods.includes('rank_occurrence')&&!warning){try{RollingStudy.settings(lotteryData,s);}catch(error){dynamicError=error.message;}}
  el('rolling-dynamic-error').textContent=dynamicError;el('rolling-dynamic-error').hidden=!dynamicError;
  el('rolling-dynamic-note').textContent=dynamicError||!s.methods.includes('rank_occurrence')?'':`首次用第${s.start}–${s.end}期（${s.end-s.start+1}期）學習最常開出的 ${s.count} 個熱名次，再用第${s.start}–${s.start+s.rankLookback-1}期的號碼排名揀號，驗證第${s.start-1}期。每一期重新選名次；學習期本身也只用較舊 ${s.rankLookback} 期計排名。完整驗證需要資料至第${s.end+s.periods-1+s.rankLookback}期。`;
  el('rolling-run').disabled=!!job||!!warning||!!dynamicError;
  return !warning&&!dynamicError;
 }
 function changed(){
  el('rolling-rank-transfer-status').textContent='';el('rolling-rank-transfer-status').hidden=true;
  el('rolling-blend-controls').hidden=!el('rolling-method-blend').checked;
  el('rolling-balance-controls').hidden=!el('rolling-method-cold_hot_balance').checked;
  el('rolling-dynamic-controls').hidden=!el('rolling-method-rank_occurrence').checked;
  const s=read(),first=lotteryData[s.start-2],newest=lotteryData[s.start-1],oldest=lotteryData[s.end-1],last=lotteryData[s.start+s.periods-3];
  rangeFeedback(s);
  el('rolling-range-note').textContent=first&&newest&&oldest&&s.end>=s.start?`首次用第${s.start}–${s.end}期（${oldest.draw_date} 至 ${newest.draw_date}，共${s.end-s.start+1}期）揀號，驗證較新一期 ${first.draw_number}（${first.draw_date}）。${last&&s.periods>0?`逐期往舊推${s.periods}次，驗證至 ${last.draw_number}（${last.draw_date}）。`:''}`:'選號範圍由第2期起；第1期是資料最新一期，驗證期為範圍起點前一期。';
  if(s.methods.includes('rank_occurrence'))el('rolling-range-note').textContent=first&&last?`首次資料範圍第${s.start}–${s.end}期；動態排名用此範圍學習名次，其他方式用此範圍揀號。驗證第${s.start-1}–${s.start+s.periods-2}期（${last.draw_number} 至 ${first.draw_number}）。`:'首次資料由第2期起；第1期是資料最新一期。';
  if(result)el('rolling-status').textContent='設定已更改；下方仍是上次完成的結果，按「開始逐期驗證」更新。';
 }
 function useDynamicRanks(){
  if(job)return;
  for(const [id,value] of Object.entries({start:2,end:101,periods:100,count:16,'rank-lookback':100}))el('rolling-'+id).value=String(value);
  for(const mode of RollingStudy.methods)el('rolling-method-'+mode).checked=mode==='rank_occurrence';
  changed();saveWorkspace();
  el('rolling-status').textContent='已設定：每期用較舊100期重新挑選16個名次，號碼排名亦用較舊100期；按「開始逐期驗證」執行。'+(result?' 下方保留上次結果。':'');
 }
 function applyHotRanks(transfer){
  if(job)throw Error('逐期驗證正在執行，請完成或取消後再套入。');
  const ranks=Selection.parseRanks(transfer.hot,'最熱');
  if(!Number.isInteger(transfer.count)||transfer.count<6||transfer.count>49||ranks.length!==transfer.count)throw Error('套入名次總數須與目標號碼數相同（6–49個）。');
  el('rolling-hot-ranges').value=transfer.hot;
  el('rolling-count').value=String(transfer.count);
  el('rolling-include-cold').checked=false;
  el('rolling-method-cold_hot_balance').checked=true;
  changed();
  el('rolling-rank-transfer-status').textContent=`已套入出現次數榜首 ${transfer.count} 個最熱名次，目標 ${transfer.count} 個，最冷已關閉。沿用目前驗證設定；按「開始逐期驗證」更新結果。`;
  el('rolling-rank-transfer-status').hidden=false;
  showStudyPanel('rolling-study');
  el('rolling-balance-controls').scrollIntoView({block:'center'});
  saveWorkspace();
 }
 function cell(item,total){return `<strong>${(item.probability*100).toFixed(2)}%</strong><small>${item.count} / ${total} 期</small>`;}
 function table(kind){
  const values=kind==='exact'?RollingStudy.levels:RollingStudy.thresholds;
  return `<div class="table-scroll"><table class="results-table rolling-table"><thead><tr><th scope="col">${kind==='exact'?'恰好命中':'至少命中'}</th>${result.groups.map(g=>`<th scope="col">${esc(RollingStudy.labels[g.mode])}<small>${g.minSize===g.maxSize?g.minSize:`${g.minSize}–${g.maxSize}`} 個候選號碼</small></th>`).join('')}</tr></thead><tbody>${values.map((score,i)=>`<tr><th scope="row">${score} 字${kind==='exact'?'':'以上'}${score===6.5?'<small>6正選＋特別號</small>':''}</th>${result.groups.map(g=>`<td>${cell(g[kind][i],g.total)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
 }
 function intervalCard(item){
  const calculation=item.intervalCount?`間隔合計 ${item.totalGap} 期 ÷ ${item.intervalCount} 個完整間隔。`:'至少出現2次才可計算平均間隔。';
  const records=item.count?`<details class="rolling-interval-records"><summary>查看全部 ${item.count} 次出現紀錄</summary>
   <p class="muted">${item.leadingGap?`由範圍起點第${item.startPeriod}期起，先有 ${item.leadingGap} 期未達標。`:`範圍起點第${item.startPeriod}期已達標。`}</p>
   <ol class="rolling-interval-timeline" aria-label="${item.threshold}字以上出現紀錄">${item.occurrences.map(r=>`<li><span class="rolling-interval-hit"><strong>第${r.period}期 · ${r.score} 字</strong><small><span>${esc(r.draw)}</span><time datetime="${esc(r.date)}">${esc(r.date)}</time></small></span><span class="rolling-interval-gap${r.gap===null?' rolling-interval-first':r.gap===0?' rolling-interval-consecutive':''}"${r.gap===null?'':' title="與上一筆達標紀錄的間隔"'}>${r.gap===null?'首筆紀錄':r.gap===0?'連續出現':`隔 ${r.gap} 期`}</span></li>`).join('')}</ol>
   <p class="muted">${item.trailingGap?`最後一次達標後，至範圍終點第${item.endPeriod}期仍有 ${item.trailingGap} 期未達標。`:`最後一次達標正好在範圍終點第${item.endPeriod}期。`}</p>
   </details>`:`<p class="muted">這 ${item.total} 個驗證期內未有 ${item.threshold} 字以上的紀錄。</p>`;
  return `<section class="rolling-interval-card" aria-labelledby="rolling-interval-title-${item.threshold}"><h5 id="rolling-interval-title-${item.threshold}">${item.threshold} 字以上</h5><p class="rolling-interval-average">平均相隔<strong>${item.averageGap===null?'—':`${item.averageGap.toFixed(2)} 期`}</strong></p><p>出現 ${item.count} / ${item.total} 期 · ${item.intervalCount} 個完整間隔</p><p class="muted">${calculation}</p>${records}</section>`;
 }
 function renderIntervals(mode){
  const group=result.groups.find(g=>g.mode===mode),first=result.rows[0].period,last=result.rows.at(-1).period;
  el('rolling-intervals').innerHTML=`<h4>命中間隔 · 3字以上／4字以上</h4><p>按「${esc(RollingStudy.labels[mode])}」全部 ${result.settings.periods} 個驗證期計算：第${first}–${last}期，不受明細分頁影響。</p><details class="rolling-interval-help"><summary>間隔計算說明</summary><p class="muted">沿用明細順序，由新至舊排列。每筆右側標籤顯示與上一筆達標紀錄的間隔。「以上」包含該字數及更高字數；3.5字計入3字以上，未達4字以上。相隔期數只計兩次達標之間的期數：第77期到第79期＝隔1期；相鄰兩期達標顯示「連續出現」，計算平均時當作0期。平均＝間隔期數總和 ÷ 完整間隔數，範圍頭尾未構成完整間隔的期數不計入。</p></details><div class="rolling-interval-grid">${group.intervals.map(intervalCard).join('')}</div>`;
 }
 function render(){
  const s=result.settings,first=result.rows[0],last=result.rows.at(-1);
  el('rolling-results').innerHTML=`<div class="metric-grid"><div>每種方式驗證<strong>${s.periods} 期</strong></div><div>每次選號／名次學習資料<strong>${s.end-s.start+1} 期</strong></div><div>目標號碼數<strong>${s.count} 個</strong></div><div>篩選方式<strong>${s.methods.length} 種</strong></div></div>
   <p data-concise="1">驗證期：${esc(last.draw)}（${esc(last.date)}）至 ${esc(first.draw)}（${esc(first.date)}）。首次資料範圍第${s.start}–${s.end}期，其後每次往舊推一期。${s.methods.includes('blend')?`混合短期${s.short}期。`:''}${s.methods.includes('cold_hot_balance')?`自訂熱／冷排名：${esc(RollingStudy.rangeText(s.balanceRanges))}（名次固定）。`:''}</p>
   ${s.methods.includes('rank_occurrence')?`<p class="rank-transfer-notice">動態排名：每期只用之前 ${s.end-s.start+1} 個開獎期學習名次，再挑選出現最多的 ${s.count} 個熱名次。學習期及驗證期的號碼排名均使用各自較舊 ${s.rankLookback} 期；統計正選＋特別號，同次數按名次由小至大。每期採用的名次及資料範圍可在明細查看。</p>`:''}
   ${s.methods.includes('cold_hot_balance')?'<p class="muted">固定自訂名次若先由同一驗證範圍挑選，命中比例會偏樂觀；「動態排名」會在每一期只用較舊資料重新挑選名次。</p>':''}
   <p class="muted" data-concise="1">機率以歷史命中期數 ÷ ${s.periods} 個驗證期計算。統計整個候選號碼池；.5 代表特別號。各「恰好命中」比例合共100%；「以上」包含更高命中數，彼此會重疊。歷史比例不代表下一期機率。</p>
   <h4 data-taught="1">各命中數機率 · 0 至 6.5 字</h4>${table('exact')}
   <h4 data-taught="1">累積命中機率 · 3 字以上至 6.5 字全中</h4>${table('atLeast')}
   <details class="rolling-details"><summary>逐期驗證明細及命中間隔</summary><label>篩選方式 <select id="rolling-detail-method" onchange="RollingStudyUI.detail(true)">${s.methods.map(m=>`<option value="${m}">${esc(RollingStudy.labels[m])}</option>`).join('')}</select></label><div id="rolling-intervals"></div><div id="rolling-detail-rows"></div></details>`;
  detail(true);
 }
 function detail(reset=false){
  if(!result)return;if(reset)page=0;
  if(reset)renderIntervals(el('rolling-detail-method').value);
  const rows=result.rows.filter(r=>r.mode===el('rolling-detail-method').value),size=25,pages=Math.ceil(rows.length/size);
  page=Math.max(0,Math.min(page,pages-1));
  const dynamic=rows[0]?.mode==='rank_occurrence';
  const learningCell=r=>{const learn=r.rankLearning;return `<td>第${learn.start}–${learn.end}期<small>每個學習期用其較舊${learn.lookback}期計排名<br>最舊資料：第${learn.oldestSource}期</small><p>採用熱名次：第${esc(learn.hot.replaceAll(',','、'))}名</p><details><summary>查看${learn.selected.length}個名次的出現次數</summary><p>${learn.selected.map(item=>`第${item.rank}名：${item.count}次`).join('、')}</p></details></td>`;};
  el('rolling-detail-rows').innerHTML=`<p class="muted">綠色為命中正選；橙色為命中特別號。</p><div class="table-scroll"><table class="results-table rolling-detail-table${dynamic?' rolling-dynamic-table':''}"><thead><tr><th>驗證期（較新一期）</th><th>選號資料範圍</th>${dynamic?'<th>本期名次學習</th>':''}<th>候選號碼</th><th>命中</th></tr></thead><tbody>${rows.slice(page*size,(page+1)*size).map(r=>`<tr><td>第${r.period}期 · ${esc(r.draw)}<br>${esc(r.date)}<small>正選 ${r.winning.join('、')}<br>特別號 ${r.special}</small></td><td>第${r.start}–${r.end}期<small>${esc(r.trainingOldest)} 至 ${esc(r.trainingNewest)}</small></td>${dynamic?learningCell(r):''}<td><div class="rolling-balls">${r.numbers.map(n=>`<span class="rolling-ball${r.winning.includes(n)?' rolling-hit':n===r.special?' rolling-extra':''}" aria-label="${n}${r.winning.includes(n)?'，命中正選':n===r.special?'，命中特別號':''}">${n}</span>`).join('')}</div><small>共${r.numbers.length}個</small></td><td><strong>${r.score} 字</strong><small>${r.hits}正選${r.extra?'＋特別號':''}</small></td></tr>`).join('')}</tbody></table></div><div class="pager"><button onclick="RollingStudyUI.turn(-1)" ${page===0?'disabled':''}>上一頁</button><span>${page+1} / ${pages}</span><button onclick="RollingStudyUI.turn(1)" ${page===pages-1?'disabled':''}>下一頁</button></div>`;
 }
 async function run(){
  if(job)return;
  if(!rangeFeedback()){el('rolling-status').textContent='請先修正驗證設定。'+(result?' 下方保留上次完成的結果。':'');return;}
  el('rolling-rank-transfer-status').textContent='';el('rolling-rank-transfer-status').hidden=true;
  const active={cancelled:false};job=active;
  el('rolling-settings').disabled=true;el('rolling-run').disabled=true;el('rolling-cancel').hidden=false;el('rolling-export').disabled=true;
  el('rolling-status').textContent='正在逐期揀號及核對…';
  try{
   const next=await RollingStudy.run(lotteryData,read(),{onProgress:({completed,total})=>el('rolling-status').textContent=`已驗證${completed} / ${total}期…`,isCancelled:()=>active.cancelled,yieldControl:()=>new Promise(resolve=>setTimeout(resolve,0))});
   result=next;render();el('rolling-status').textContent=`已完成：每種方式共驗證${result.settings.periods}期。`;
  }catch(error){el('rolling-status').textContent=error.message+(result?' 下方保留上次完成的結果。':'');}
  finally{job=null;el('rolling-settings').disabled=false;rangeFeedback();el('rolling-cancel').hidden=true;el('rolling-export').disabled=!result;}
 }
 function exportCSV(){
  if(!result)return;const s=result.settings,rows=[['篩選方式','目標號碼數','實際號碼數','首次選號起點','首次選號終點','驗證期數','短期期數','冷熱排名範圍','驗證期位置','驗證期號','驗證日期','選號起點','選號終點','選號最早日期','選號最新日期','候選號碼','開獎正選','特別號','命中正選','命中特別號','命中字數','名次學習起點','名次學習終點','每次號碼排名資料期數','學習最舊資料位置','本期採用熱名次','各名次出現次數'],...result.rows.map(r=>[RollingStudy.labels[r.mode],s.count,r.numbers.length,s.start,s.end,s.periods,r.mode==='blend'?s.short:'',r.mode==='cold_hot_balance'?RollingStudy.rangeText(s.balanceRanges):'',r.period,r.draw,r.date,r.start,r.end,r.trainingOldest,r.trainingNewest,r.numbers.join(' '),r.winning.join(' '),r.special,r.hits,r.extra,r.score,r.rankLearning?.start??'',r.rankLearning?.end??'',r.rankLearning?.lookback??'',r.rankLearning?.oldestSource??'',r.rankLearning?.hot??'',r.rankLearning?.selected.map(item=>`第${item.rank}名:${item.count}次`).join(' ')??''])];
  rows.push([],['機率統計','篩選方式','條件','命中期數','驗證期數','機率']);
  for(const g of result.groups)for(const kind of ['exact','atLeast'])for(const item of g[kind])rows.push(['機率統計',RollingStudy.labels[g.mode],`${kind==='exact'?'恰好':'至少'}${item.score}字`,item.count,g.total,item.probability]);
  rows.push([],['間隔統計（只計兩次達標之間的期數；頭尾未完整間隔不計入平均）','篩選方式','條件','驗證期數','範圍起點','範圍終點','出現期數','完整間隔數','間隔總期數','平均相隔期數','首次達標前未達標期數','最後達標後未達標期數']);
  for(const g of result.groups)for(const item of g.intervals)rows.push(['間隔統計',RollingStudy.labels[g.mode],`${item.threshold}字以上`,item.total,item.startPeriod,item.endPeriod,item.count,item.intervalCount,item.totalGap,item.averageGap??'',item.leadingGap??'',item.trailingGap??'']);
  rows.push([],['出現紀錄（由新至舊；首次出現的間隔留空）','篩選方式','條件','驗證期位置','驗證期號','驗證日期','命中字數','與上次達標之間相隔期數']);
  for(const g of result.groups)for(const item of g.intervals)for(const r of item.occurrences)rows.push(['出現紀錄',RollingStudy.labels[g.mode],`${item.threshold}字以上`,r.period,r.draw,r.date,r.score,r.gap??'']);
  download('逐期驗證號碼池.csv',rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n'),'text/csv');
 }
 document.addEventListener('DOMContentLoaded',()=>{el('rolling-settings').addEventListener('input',changed);el('rolling-settings').addEventListener('change',changed);changed();});
 return {run,cancel:()=>{if(job)job.cancelled=true;},changed,detail,turn:n=>{page+=n;detail();},exportCSV,applyHotRanks,useDynamicRanks};
})();
