let poolComparison=null;
function comparePoolSelections(){
 poolComparison=null;$('export-pool-comparison').disabled=true;
 try{
  const settings={train:Number($('pool-train').value),short:Number($('pool-short').value),count:Number($('pool-size').value),periods:Number($('pool-periods').value)};
  const rows=Selection.compare(lotteryData,settings);poolComparison={settings,rows};renderPoolComparison();$('export-pool-comparison').disabled=false;
 }catch(e){$('pool-comparison-results').textContent=e.message;}
}
function poolMetricTable(groups){
 const goal=['mean','hit3','hit4'].includes($('pool-goal').value)?$('pool-goal').value:'mean';
 const sorted=[...groups].sort((a,b)=>b.summary[goal]-a.summary[goal]||a.label.localeCompare(b.label));
 return `<div class="table-scroll"><table class="results-table"><thead><tr><th>方法</th><th>平均命中正選</th><th>中≥3碼期數</th><th>中≥4碼期數</th><th>中特別號期數</th></tr></thead><tbody>${sorted.map(g=>`<tr><td>${escapeText(g.label)}</td><td>${g.summary.mean.toFixed(3)}</td><td>${g.summary.hit3} / ${g.summary.draws}</td><td>${g.summary.hit4} / ${g.summary.draws}</td><td>${g.summary.extra} / ${g.summary.draws}</td></tr>`).join('')}</tbody></table></div>`;
}
function renderPoolComparison(){
 if(!poolComparison)return;
 const {settings,rows}=poolComparison,{train,short,count,periods}=settings,b=Selection.baseline(count);
 const groups=segment=>['rank','rank_regular','blend','rank_with_pair'].map(mode=>({label:Selection.labels[mode],summary:Selection.summary(segment.filter(r=>r.mode===mode))}));
 const recentDates=[...new Set(rows.map(r=>r.date))].slice(0,Math.min(100,Math.max(1,Math.floor(periods/2))));
 const recent=rows.filter(r=>recentDates.includes(r.date)),older=rows.filter(r=>!recentDates.includes(r.date));
 $('pool-comparison-results').innerHTML=`<p>核對 ${rows.at(-1).date} 至 ${rows[0].date}，共 ${periods} 期；每期選 ${count} 碼，使用其之前 ${train} 期；混合短期 ${short} 期，兩邊各50%。</p><h4>全部核對期</h4>${poolMetricTable(groups(rows))}${older.length?`<details><summary>較早 ${periods-recentDates.length} 期與最近 ${recentDates.length} 期分段比較</summary><h4>較早區段</h4>${poolMetricTable(groups(older))}<h4>最近區段</h4>${poolMetricTable(groups(recent))}</details>`:''}<p>公平獨立抽樣、同樣 ${count} 碼的理論基準：平均 ${b.mean.toFixed(3)} 個正選；中≥3碼 ${(b.hit3*100).toFixed(2)}%；中≥4碼 ${(b.hit4*100).toFixed(2)}%。這是理論值，不是一次隨機抽樣結果。</p><p class="muted">表格排序只改顯示順序，不會自動轉換選號策略。這是歷史回測，較新區段亦可能已看過；反覆調參不能證明未來更準。預先保存後的新一期表現另列於下方。</p>`;
}
function exportPoolComparison(){if(!poolComparison)return;download('固定碼數逐期比較.csv',['方法,期號,日期,選號最新日期,選號最早日期,號碼池,命中正選,中特別號',...poolComparison.rows.map(r=>[Selection.labels[r.mode],r.draw,r.date,r.trainingNewest,r.trainingOldest,r.numbers.join(' '),r.hits,r.extra].join(','))].join('\n'),'text/csv');}
function forecastRecords(){const records=Store.get('forecasts',[]);return Forecast.validList(records)?records:[];}
function saveForecast(){
 try{
  const ctx=currentFilterContext,s=ctx?.selectionSettings;
  if(!s||s.version!==1||ctx.startPeriod!==1||ctx.dataAsOf!==lotteryData[0].draw_date||!Engine.validNumbers(currentFilteredNumbers,6,49))throw Error('請先以最新第1期為起點，重新篩選目前要保存的號碼。');
  if(Number($('start-period').value)!==ctx.startPeriod||Number($('end-period').value)!==ctx.endPeriod||$('filter-mode-select').value!==s.mode||Number($('filter-count-select').value)!==s.count||(s.mode==='blend'&&Number($('filter-short-periods').value)!==s.short)||rankShowColdComplement!==s.cold)throw Error('設定已更改，請先重新篩選再鎖定。');
  const stored=Store.get('forecasts',[]);if(!Forecast.validList(stored))throw Error('預存記錄格式損壞，請保留備份檔，暫不加入新記錄。');
  const records=stored;
  if(records.some(r=>r.anchorDraw===lotteryData[0].draw_number&&r.anchorDate===lotteryData[0].draw_date))throw Error('此基準期已鎖定第一筆選號，不能覆寫或重複加入。');
  if(records.length>=500)throw Error('已達500筆記錄上限，請先匯出備份。');
  const record=Forecast.create(lotteryData,{...s,numbers:currentFilteredNumbers});
  if(!Store.set('forecasts',[record,...records]))throw Error('瀏覽器未能保存，尚未鎖定。請匯出備份及檢查儲存空間。');
  renderForecasts();$('forecast-status').textContent=`已鎖定 ${record.numbers.length} 碼，等待 ${record.anchorDraw} 之後緊接的一期。`;
 }catch(e){$('forecast-status').textContent=e.message;}
}
function forecastLabel(r){return `${Selection.labels[r.mode]}${r.cold?'（冷門）':''} · ${r.numbers.length}碼／${r.train}期${r.mode==='blend'?'／短期'+r.short+'期':''}`;}
function renderForecasts(){
 const records=forecastRecords(),resolved=records.map(r=>({r,result:Forecast.resolve(r,lotteryData)})),settled=resolved.filter(x=>x.result.status==='settled'),groups=new Map();
 for(const x of settled){const key=forecastLabel(x.r);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(x);}
 const status={pending:'等待下一期資料',missing:'基準期不在目前資料集',late:'同日／較後保存：補錄，不計前瞻',settled:'已完成（依本機保存日期）'};
 $('forecast-results').innerHTML=`<p>共 ${records.length} 筆；已完成並可計前瞻 ${settled.length} 筆；等待 ${resolved.filter(x=>x.result.status==='pending').length} 筆。各組只比較相同設定及同一批核對期。</p>${[...groups].map(([label,items])=>`<h4>${escapeText(label)}</h4>${poolMetricTable([{label:'預先鎖定選號',summary:Selection.summary(items.map(x=>x.result))},{label:'同碼數純排名基準（保存時一併鎖定）',summary:Selection.summary(items.map(x=>x.result.baseline))}])}`).join('')}${!records.length?'<p class="empty-state">尚未預先保存選號。</p>':`<details open><summary>最近 ${Math.min(20,records.length)} 筆記錄（CSV可匯出全部）</summary><div class="table-scroll"><table class="results-table"><thead><tr><th>保存時間／基準期</th><th>方法及鎖定號碼</th><th>核對期</th><th>正選／特別號</th><th>狀態</th></tr></thead><tbody>${resolved.slice(0,20).map(({r,result})=>`<tr><td>${escapeText(r.createdAt)}<br>${r.anchorDraw} · ${r.anchorDate}</td><td>${escapeText(forecastLabel(r))}<br>${r.numbers.join('、')}</td><td>${result.draw?result.draw.draw_number+' · '+result.draw.draw_date:'—'}</td><td>${result.draw?result.hits+' / 6；特別號'+(result.extra?'有':'無'):'—'}</td><td>${status[result.status]}</td></tr>`).join('')}</tbody></table></div></details>`}`;
}
function exportForecasts(){const rows=forecastRecords();download('預先保存選號.csv',['保存時間,基準期,基準日期,模式,選號期數,短期期數,號碼池,基準號碼池,核對期,核對日期,命中正選,中特別號,基準命中正選,狀態',...rows.map(r=>{const s=Forecast.resolve(r,lotteryData);return [r.createdAt,r.anchorDraw,r.anchorDate,forecastLabel(r),r.train,r.short,r.numbers.join(' '),r.baseline.join(' '),s.draw?.draw_number||'',s.draw?.draw_date||'',s.hits??'',s.extra??'',s.baseline?.hits??'',s.status].join(',');})].join('\n'),'text/csv');}
document.addEventListener('DOMContentLoaded',renderForecasts);
