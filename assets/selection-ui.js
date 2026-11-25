let poolComparison=null,poolComparisonJob=null;
async function comparePoolSelections(){
 if(poolComparisonJob)return;
 const job={cancelled:false};poolComparisonJob=job;
 poolComparison=null;$('export-pool-comparison').disabled=true;$('compare-pool-selections').disabled=true;$('cancel-pool-comparison').hidden=false;
 $('pool-comparison-results').innerHTML='';$('pool-only-results').innerHTML='';$('pool-comparison-status').textContent='正在逐期揀號及排注…';
 try{
  const settings={train:Number($('pool-train').value),short:Number($('pool-short').value),count:Number($('pool-size').value),periods:Number($('pool-periods').value),tickets:Number($('pool-tickets').value),seed:20261118};
  const progress=({completed,total})=>{$('pool-comparison-status').textContent='已核對 '+completed+' / '+total+' 期…';};
  const fallback=()=>PoolComparison.run(lotteryData,settings,{onProgress:progress,isCancelled:()=>job.cancelled,yieldControl:()=>new Promise(r=>setTimeout(r,0))});
  if(typeof Worker==='undefined')poolComparison=await fallback();
  else try{
   poolComparison=await new Promise((resolve,reject)=>{
    const worker=new Worker('assets/pool-comparison-worker.js?v=20261118-rolling49');let timer;
    const finish=(error,result)=>{clearTimeout(timer);worker.terminate();job.stop=null;error?reject(error):resolve(result);};
    const watch=()=>{clearTimeout(timer);timer=setTimeout(()=>finish(Error('計算逾時，請減少核對期數再試。')),30000);};
    job.stop=()=>finish(Error('已取消比較。'));watch();
    worker.onmessage=({data})=>{if(data.progress){watch();progress(data.progress);}else finish(data.error?Error(data.error):null,data.result);};
    worker.onerror=()=>finish(Error('背景計算未能啟動。'));
    worker.postMessage({draws:lotteryData,settings});
   });
  }catch(error){if(job.cancelled||location.protocol!=='file:')throw error;poolComparison=await fallback();}
  if(job.cancelled)throw Error('已取消比較。');
  renderPoolComparison();$('export-pool-comparison').disabled=false;$('pool-comparison-status').textContent='已完成 '+settings.periods+' 期比較。';
 }catch(e){poolComparison=null;$('pool-comparison-status').textContent=e.message;}
 finally{poolComparisonJob=null;$('compare-pool-selections').disabled=false;$('cancel-pool-comparison').hidden=true;}
}
function cancelPoolComparison(){if(poolComparisonJob){poolComparisonJob.cancelled=true;poolComparisonJob.stop?.();}}
function poolMetricTable(groups){
 const goal=['mean','hit3','hit4'].includes($('pool-goal').value)?$('pool-goal').value:'mean';
 const sorted=[...groups].sort((a,b)=>b.summary[goal]-a.summary[goal]||a.label.localeCompare(b.label));
 return `<div class="table-scroll"><table class="results-table"><thead><tr><th>方法</th><th>平均命中正選</th><th>中≥3碼期數</th><th>中≥4碼期數</th><th>中特別號期數</th></tr></thead><tbody>${sorted.map(g=>`<tr><td>${escapeText(g.label)}</td><td>${g.summary.mean.toFixed(3)}</td><td>${g.summary.hit3} / ${g.summary.draws}</td><td>${g.summary.hit4} / ${g.summary.draws}</td><td>${g.summary.extra} / ${g.summary.draws}</td></tr>`).join('')}</tbody></table></div>`;
}
function renderPoolComparison(){
 if(!poolComparison)return;
 const {settings,rows,ticketRows}=poolComparison,{train,short,count,periods,tickets}=settings,b=Selection.baseline(count);
 const goal=['hit3','hit4','winningTickets'].includes($('pool-ticket-goal').value)?$('pool-ticket-goal').value:'hit3';
 const metric=goal==='winningTickets'?'中3個或以上總注數':'至少一注中'+(goal==='hit4'?4:3)+'個或以上的期數';
 const cell=group=>{const s=PoolComparison.summary(group),denominator=goal==='winningTickets'?s.totalTickets:s.periods;return `${s[goal]} / ${denominator}<br><small>${(s[goal]/denominator*100).toFixed(2)}%</small>`;};
 const ticketTable=segment=>`<div class="table-scroll"><table class="results-table"><thead><tr><th>選號方法</th><th>隨機排注</th><th>覆蓋搜尋</th></tr></thead><tbody>${['all49',...PoolComparison.modes].map(mode=>`<tr><td>${escapeText(PoolComparison.labels[mode])}${mode==='all49'?'（對照）':' · '+count+'碼'}</td>${['random','cover'].map(method=>`<td>${cell(segment.filter(r=>r.mode===mode&&r.method===method))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
 const groups=segment=>['rank','rank_regular','blend','rank_with_pair'].map(mode=>({label:Selection.labels[mode],summary:Selection.summary(segment.filter(r=>r.mode===mode))}));
 const recentDates=[...new Set(rows.map(r=>r.date))].slice(0,Math.min(100,Math.max(1,Math.floor(periods/2))));
 const recent=rows.filter(r=>recentDates.includes(r.date)),older=rows.filter(r=>!recentDates.includes(r.date));
 $('pool-comparison-results').innerHTML=`<p>${rows.at(-1).date} 至 ${rows[0].date} · 共 ${periods} 期 · 每組每期 ${tickets} 注（每注6碼）。</p><p>四種方法每期用之前 ${train} 期選 ${count} 碼，混合短期 ${short} 期；全49碼組直接排注。</p><p><strong>${metric}</strong>${goal==='winningTickets'?'；同一期可有多注中獎。':'；同一期中幾多注都只計1期。'}</p>${ticketTable(ticketRows)}${older.length?`<details><summary>分段比較</summary><p>較早 ${periods-recentDates.length} 期</p>${ticketTable(ticketRows.filter(r=>!recentDates.includes(r.date)))}<p>最近 ${recentDates.length} 期</p>${ticketTable(ticketRows.filter(r=>recentDates.includes(r.date)))}</details>`:''}<p class="muted">覆蓋搜尋固定以「至少一注中3個正選」為目標，未保證最優。${tickets===1?'只有1注時兩種排法用同一注，無多注覆蓋可比較。':''}歷史結果不代表未來勝率或盈利。</p><details><summary>計算設定</summary><p>每期只用更早資料選號及產生注碼，再核對當期開獎；全49碼兩組也逐期重排。相同資料及設定會重現相同結果，重現編號 ${settings.seed}。混合視窗各50%：${Selection.blendWeightText(train,short)}。</p></details>`;
 $('pool-only-results').innerHTML=`${poolMetricTable(groups(rows))}${older.length?`<details><summary>號碼池分段統計</summary><p>較早區段</p>${poolMetricTable(groups(older))}<p>最近區段</p>${poolMetricTable(groups(recent))}</details>`:''}<p>同樣 ${count} 碼的公平抽樣理論基準：平均 ${b.mean.toFixed(3)} 個正選；池中≥3碼 ${(b.hit3*100).toFixed(2)}%；池中≥4碼 ${(b.hit4*100).toFixed(2)}%。這裡只計號碼池，未計排注。</p>`;
}
function exportPoolComparison(){if(!poolComparison)return;const s=poolComparison.settings,quote=v=>'"'+String(v).replace(/"/g,'""')+'"';const rows=[['方法','排注方式','期號','日期','選號最新日期','選號最早日期','選號期數','混合短期','每期注數','重現編號','逐期種子','號碼池','完整注碼','各注正選命中','至少一注中3正選','至少一注中4正選','中獎注數'],...poolComparison.ticketRows.map(r=>[PoolComparison.labels[r.mode],r.method==='random'?'隨機':'覆蓋搜尋',r.draw,r.date,r.mode==='all49'?'':r.trainingNewest,r.mode==='all49'?'':r.trainingOldest,r.mode==='all49'?'':s.train,r.mode==='blend'?s.short:'',s.tickets,s.seed,r.seed,r.numbers.join(' '),r.bets.map(b=>b.join(' ')).join(' | '),r.hits.join(' '),Number(r.hit3),Number(r.hit4),r.winningTickets])];download('揀號與全49碼逐期注碼比較.csv','\uFEFF'+rows.map(r=>r.map(quote).join(',')).join('\n'),'text/csv');}
function forecastRecords(){const records=Store.get('forecasts',[]);return Forecast.validList(records)?records:[];}
function saveForecast(){
 try{
  const ctx=currentFilterContext,s=ctx?.selectionSettings;
  if(!s||s.version!==1||ctx.startPeriod!==1||ctx.dataAsOf!==lotteryData[0].draw_date||!Engine.validNumbers(currentFilteredNumbers,6,49))throw Error('請先以最新第1期為起點，重新篩選目前要保存的號碼。');
  if(Number($('start-period').value)!==ctx.startPeriod||Number($('end-period').value)!==ctx.endPeriod||$('filter-mode-select').value!==s.mode||Number($('filter-count-select').value)!==(s.requestedCount??s.count)||(s.mode==='blend'&&Number($('filter-short-periods').value)!==s.short)||rankShowColdComplement!==s.cold)throw Error('設定已更改，請先重新篩選再鎖定。');
  if(s.mode==='cold_hot_balance'&&(!s.balanceRanges||Object.entries(readBalanceRanges()).some(([key,value])=>s.balanceRanges[key]!==value)))throw Error('冷熱排名範圍已更改，請先重新篩選再鎖定。');
  const stored=Store.get('forecasts',[]);if(!Forecast.validList(stored))throw Error('預存記錄格式損壞，請保留備份檔，暫不加入新記錄。');
  const records=stored;
  if(records.some(r=>r.anchorDraw===lotteryData[0].draw_number&&r.anchorDate===lotteryData[0].draw_date))throw Error('此基準期已鎖定第一筆選號，不能覆寫或重複加入。');
  if(records.length>=500)throw Error('已達500筆記錄上限，請先匯出備份。');
  const record=Forecast.create(lotteryData,{...s,numbers:currentFilteredNumbers});
  if(!Store.set('forecasts',[record,...records]))throw Error('瀏覽器未能保存，尚未鎖定。請匯出備份及檢查儲存空間。');
  renderForecasts();$('forecast-status').textContent=`已鎖定 ${record.numbers.length} 碼，等待 ${record.anchorDraw} 之後緊接的一期。`;
 }catch(e){$('forecast-status').textContent=e.message;}
}
function forecastLabel(r){return `${Selection.labels[r.mode]}${r.cold?'（冷門）':''} · ${r.numbers.length}碼／${r.train}期${r.mode==='blend'?'／短期'+r.short+'期':''}${r.balanceRanges?' · '+Selection.balanceRangeText(r.balanceRanges):''}`;}
function renderForecasts(){
 const records=forecastRecords(),resolved=records.map(r=>({r,result:Forecast.resolve(r,lotteryData)})),settled=resolved.filter(x=>x.result.status==='settled'),groups=new Map();
 for(const x of settled){const key=forecastLabel(x.r);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(x);}
 const status={pending:'等待下一期資料',missing:'基準期不在目前資料集',late:'同日／較後保存：補錄，不計前瞻',settled:'已完成（依本機保存日期）'};
 $('forecast-results').innerHTML=`<p>共 ${records.length} 筆；已完成並可計前瞻 ${settled.length} 筆；等待 ${resolved.filter(x=>x.result.status==='pending').length} 筆。各組只比較相同設定及同一批核對期。</p>${[...groups].map(([label,items])=>`<h4>${escapeText(label)}</h4>${poolMetricTable([{label:'預先鎖定選號',summary:Selection.summary(items.map(x=>x.result))},{label:'同碼數純排名基準（保存時一併鎖定）',summary:Selection.summary(items.map(x=>x.result.baseline))}])}`).join('')}${!records.length?'<p class="empty-state">尚未預先保存選號。</p>':`<details open><summary>最近 ${Math.min(20,records.length)} 筆記錄（CSV可匯出全部）</summary><div class="table-scroll"><table class="results-table"><thead><tr><th>保存時間／基準期</th><th>方法及鎖定號碼</th><th>核對期</th><th>正選／特別號</th><th>狀態</th></tr></thead><tbody>${resolved.slice(0,20).map(({r,result})=>`<tr><td>${escapeText(r.createdAt)}<br>${r.anchorDraw} · ${r.anchorDate}</td><td>${escapeText(forecastLabel(r))}<br>${r.numbers.join('、')}</td><td>${result.draw?result.draw.draw_number+' · '+result.draw.draw_date:'—'}</td><td>${result.draw?result.hits+' / 6；特別號'+(result.extra?'有':'無'):'—'}</td><td>${status[result.status]}</td></tr>`).join('')}</tbody></table></div></details>`}`;
}
function exportForecasts(){const rows=forecastRecords();download('預先保存選號.csv',['保存時間,基準期,基準日期,模式,選號期數,短期期數,號碼池,基準號碼池,核對期,核對日期,命中正選,中特別號,基準命中正選,狀態',...rows.map(r=>{const s=Forecast.resolve(r,lotteryData);return [r.createdAt,r.anchorDraw,r.anchorDate,forecastLabel(r),r.train,r.short,r.numbers.join(' '),r.baseline.join(' '),s.draw?.draw_number||'',s.draw?.draw_date||'',s.hits??'',s.extra??'',s.baseline?.hits??'',s.status].join(',');})].join('\n'),'text/csv');}
document.addEventListener('DOMContentLoaded',()=>{if($('forecast-panel'))renderForecasts();});
