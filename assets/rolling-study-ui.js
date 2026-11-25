const RollingStudyUI=(()=>{
 const el=id=>document.getElementById(id),esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let result=null,job=null,page=0;
 const methodIds=RollingStudy.methods.map(m=>'rolling-method-'+m);
 function read(){return {start:Number(el('rolling-start').value),end:Number(el('rolling-end').value),periods:Number(el('rolling-periods').value),count:Number(el('rolling-count').value),short:Number(el('rolling-short').value),methods:RollingStudy.methods.filter(m=>el('rolling-method-'+m).checked),balanceRanges:{hotStart:Number(el('rolling-hot-start').value),hotEnd:Number(el('rolling-hot-end').value),coldStart:Number(el('rolling-cold-start').value),coldEnd:Number(el('rolling-cold-end').value)}};}
 function changed(){
  el('rolling-blend-controls').hidden=!el('rolling-method-blend').checked;
  el('rolling-balance-controls').hidden=!el('rolling-method-cold_hot_balance').checked;
  const s=read(),first=lotteryData[s.start-2],newest=lotteryData[s.start-1],oldest=lotteryData[s.end-1],last=lotteryData[s.start+s.periods-3];
  el('rolling-range-note').textContent=first&&newest&&oldest&&s.end>=s.start?`首次用第${s.start}–${s.end}期（${oldest.draw_date} 至 ${newest.draw_date}，共${s.end-s.start+1}期）揀號，驗證較新一期 ${first.draw_number}（${first.draw_date}）。${last&&s.periods>0?`逐期往舊推${s.periods}次，驗證至 ${last.draw_number}（${last.draw_date}）。`:''}`:'選號範圍由第2期起；第1期是資料最新一期，驗證期為範圍起點前一期。';
  if(result)el('rolling-status').textContent='設定已更改；下方仍是上次完成的結果，按「開始逐期驗證」更新。';
 }
 function cell(item,total){return `<strong>${(item.probability*100).toFixed(2)}%</strong><small>${item.count} / ${total} 期</small>`;}
 function table(kind){
  const values=kind==='exact'?RollingStudy.levels:RollingStudy.thresholds;
  return `<div class="table-scroll"><table class="results-table rolling-table"><thead><tr><th scope="col">${kind==='exact'?'恰好命中':'至少命中'}</th>${result.groups.map(g=>`<th scope="col">${esc(RollingStudy.labels[g.mode])}<small>${g.minSize===g.maxSize?g.minSize:`${g.minSize}–${g.maxSize}`} 個候選號碼</small></th>`).join('')}</tr></thead><tbody>${values.map((score,i)=>`<tr><th scope="row">${score} 字${kind==='exact'?'':'以上'}${score===6.5?'<small>6正選＋特別號</small>':''}</th>${result.groups.map(g=>`<td>${cell(g[kind][i],g.total)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
 }
 function render(){
  const s=result.settings,first=result.rows[0],last=result.rows.at(-1);
  el('rolling-results').innerHTML=`<div class="metric-grid"><div>每種方式驗證<strong>${s.periods} 期</strong></div><div>每次選號資料<strong>${s.end-s.start+1} 期</strong></div><div>目標號碼數<strong>${s.count} 個</strong></div><div>篩選方式<strong>${s.methods.length} 種</strong></div></div>
   <p data-concise="1">驗證期：${esc(last.draw)}（${esc(last.date)}）至 ${esc(first.draw)}（${esc(first.date)}）。首次選號範圍第${s.start}–${s.end}期，其後每次往舊推一期。${s.methods.includes('blend')?`混合短期${s.short}期。`:''}${s.methods.includes('cold_hot_balance')?`冷熱平衡：${Selection.balanceRangeText(s.balanceRanges)}。`:''}</p>
   <p class="muted" data-concise="1">機率以歷史命中期數 ÷ ${s.periods} 個驗證期計算。統計整個候選號碼池；.5 代表特別號。各「恰好命中」比例合共100%；「以上」包含更高命中數，彼此會重疊。歷史比例不代表下一期機率。</p>
   <h4 data-taught="1">各命中數機率 · 0 至 6.5 字</h4>${table('exact')}
   <h4 data-taught="1">累積命中機率 · 3 字以上至 6.5 字全中</h4>${table('atLeast')}
   <details class="rolling-details"><summary>逐期驗證明細</summary><label>篩選方式 <select id="rolling-detail-method" onchange="RollingStudyUI.detail(true)">${s.methods.map(m=>`<option value="${m}">${esc(RollingStudy.labels[m])}</option>`).join('')}</select></label><div id="rolling-detail-rows"></div></details>`;
  page=0;detail();
 }
 function detail(reset=false){
  if(!result)return;if(reset)page=0;
  const rows=result.rows.filter(r=>r.mode===el('rolling-detail-method').value),size=25,pages=Math.ceil(rows.length/size);
  page=Math.max(0,Math.min(page,pages-1));
  el('rolling-detail-rows').innerHTML=`<p class="muted">綠色為命中正選；橙色為命中特別號。</p><div class="table-scroll"><table class="results-table rolling-detail-table"><thead><tr><th>驗證期（較新一期）</th><th>選號資料範圍</th><th>候選號碼</th><th>命中</th></tr></thead><tbody>${rows.slice(page*size,(page+1)*size).map(r=>`<tr><td>第${r.period}期 · ${esc(r.draw)}<br>${esc(r.date)}<small>正選 ${r.winning.join('、')}<br>特別號 ${r.special}</small></td><td>第${r.start}–${r.end}期<small>${esc(r.trainingOldest)} 至 ${esc(r.trainingNewest)}</small></td><td><div class="rolling-balls">${r.numbers.map(n=>`<span class="rolling-ball${r.winning.includes(n)?' rolling-hit':n===r.special?' rolling-extra':''}" aria-label="${n}${r.winning.includes(n)?'，命中正選':n===r.special?'，命中特別號':''}">${n}</span>`).join('')}</div><small>共${r.numbers.length}個</small></td><td><strong>${r.score} 字</strong><small>${r.hits}正選${r.extra?'＋特別號':''}</small></td></tr>`).join('')}</tbody></table></div><div class="pager"><button onclick="RollingStudyUI.turn(-1)" ${page===0?'disabled':''}>上一頁</button><span>${page+1} / ${pages}</span><button onclick="RollingStudyUI.turn(1)" ${page===pages-1?'disabled':''}>下一頁</button></div>`;
 }
 async function run(){
  if(job)return;const active={cancelled:false};job=active;
  el('rolling-settings').disabled=true;el('rolling-run').disabled=true;el('rolling-cancel').hidden=false;el('rolling-export').disabled=true;
  el('rolling-status').textContent='正在逐期揀號及核對…';
  try{
   const next=await RollingStudy.run(lotteryData,read(),{onProgress:({completed,total})=>el('rolling-status').textContent=`已驗證${completed} / ${total}期…`,isCancelled:()=>active.cancelled,yieldControl:()=>new Promise(resolve=>setTimeout(resolve,0))});
   result=next;render();el('rolling-status').textContent=`已完成：每種方式共驗證${result.settings.periods}期。`;
  }catch(error){el('rolling-status').textContent=error.message+(result?' 下方保留上次完成的結果。':'');}
  finally{job=null;el('rolling-settings').disabled=false;el('rolling-run').disabled=false;el('rolling-cancel').hidden=true;el('rolling-export').disabled=!result;}
 }
 function exportCSV(){
  if(!result)return;const s=result.settings,rows=[['篩選方式','目標號碼數','實際號碼數','首次選號起點','首次選號終點','驗證期數','短期期數','冷熱排名範圍','驗證期位置','驗證期號','驗證日期','選號起點','選號終點','選號最早日期','選號最新日期','候選號碼','開獎正選','特別號','命中正選','命中特別號','命中字數'],...result.rows.map(r=>[RollingStudy.labels[r.mode],s.count,r.numbers.length,s.start,s.end,s.periods,r.mode==='blend'?s.short:'',r.mode==='cold_hot_balance'?Selection.balanceRangeText(s.balanceRanges):'',r.period,r.draw,r.date,r.start,r.end,r.trainingOldest,r.trainingNewest,r.numbers.join(' '),r.winning.join(' '),r.special,r.hits,r.extra,r.score])];
  rows.push([],['機率統計','篩選方式','條件','命中期數','驗證期數','機率']);
  for(const g of result.groups)for(const kind of ['exact','atLeast'])for(const item of g[kind])rows.push(['機率統計',RollingStudy.labels[g.mode],`${kind==='exact'?'恰好':'至少'}${item.score}字`,item.count,g.total,item.probability]);
  download('逐期驗證號碼池.csv',rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n'),'text/csv');
 }
 document.addEventListener('DOMContentLoaded',()=>{el('rolling-settings').addEventListener('change',changed);changed();});
 return {run,cancel:()=>{if(job)job.cancelled=true;},changed,detail,turn:n=>{page+=n;detail();},exportCSV};
})();
