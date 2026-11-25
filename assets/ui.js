/* Page orchestration and accessible, responsive presentation. */
const $=id=>document.getElementById(id);
const escapeText=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>(n<0?'−':'')+'$'+Math.abs(Math.round(n)).toLocaleString('zh-HK');
const names=['頭獎','二獎','三獎','四獎','五獎','六獎','七獎'];
const balls=nums=>nums.map(n=>`<span class="number-ball">${n}</span>`).join('');
let resultsPage=0,resultQuery='',reports={},mandelWorker=null,workspaceRestoring=false;
let historyVerificationBet=null;
const bettingLabels={single:'單式',complex:'複式',banker:'膽拖',smart:'聰明組合',smartComplex:'聰明組合＋複式',paired:'保留搭配',mandel:'Mandel 濃縮法',fiveBankerFullMeal:'5膽拖全餐'};
function groupedBetLabel(b){return (b.sourceMode==='mandel'&&b.groups[0]?.filterInfo?.advanced?'Mandel 進階濃縮':bettingLabels[b.sourceMode])+(b.hasRandomBet?'＋額外隨機注':'');}
function updateHistoryBetUI(){
 const b=historyVerificationBet;
 $('history-mode-tab').classList.toggle('hidden',!b);
 $('history-mode-tab').textContent=b?groupedBetLabel(b)+'（歷史）':'歷史注碼';
 $('history-bet-title').textContent=b?groupedBetLabel(b):'尚未載入歷史注碼';
 $('history-bet-count').textContent=b?`${b.groups.length} 組 · ${Engine.total(b).toLocaleString()} 注（六碼單式等值）`:'';
}
function clearComplexSelection(){selectedNumbers=[];updateNumberDisplay();updateSelectionStatus();saveWorkspace();}
function clearBankerSelection(){bankerNumbers=[];runnerNumbers=[];updateBankerDisplay();updateBankerStatus();saveWorkspace();}
function clearHistoryBet(){historyVerificationBet=null;updateHistoryBetUI();if(currentBettingMode==='groups')switchBettingMode('complex');saveWorkspace();}
function applyVerificationBet(bet){
 const b=JSON.parse(JSON.stringify(bet));
 invalidateMandel();
 if(b.mode==='groups'){historyVerificationBet=b;updateHistoryBetUI();}
 else if(b.mode==='banker'){bankerNumbers=b.bankers;runnerNumbers=b.numbers;$('banker-count-select').value=String(b.bankers.length);$('runner-count-select').value=String(b.numbers.length);}
 else if(b.mode==='complex'){selectedNumbers=b.numbers;$('bet-count-select').value=String(b.numbers.length);}
 else if(b.mode==='mandel'){
  mandelSelected=b.numbers;mandelTargetV=b.numbers.length;$('mandel-v-select').value=String(mandelTargetV);
  $('mandel-advanced').checked=!!b.filterInfo?.advanced;mandelAdvancedEnabled=!!b.filterInfo?.advanced;mandelCombinations=b.bets;mandelFilterInfo=b.filterInfo||null;
 }
 switchBettingMode(b.mode);updateNumberDisplay();updateSelectionStatus();updateBankerDisplay();updateBankerStatus();
 if(b.mode==='mandel'){updateMandelUI();displayMandelResults();}
}
function verifyHistoryItem(index){
 const item=filterHistory[index];if(!item)return;
 try{
  let bet=Coverage.toBet(item.random6,item.drawModeInfo);
  if(bet.mode==='complex'&&bet.numbers.length>20)bet={mode:'groups',sourceMode:'complex',numbers:[...bet.numbers],groups:[bet]};
  if(!validSavedSet({...bet,name:'歷史注碼'}))throw Error('這筆記錄的注碼不完整，無法載入核對。');
  applyVerificationBet(bet);switchTab('verification');
  $('save-status').textContent='已載入歷史原有注碼並核對；期數範圍沿用目前設定。';
  $('verification').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){alert(e.message);}
}
function loadResults(){
 const rows=lotteryData.filter(d=>(d.draw_number+' '+d.draw_date).includes(resultQuery));
 resultsPage=Math.max(0,Math.min(resultsPage,Math.ceil(rows.length/25)-1));
 $('results-content').classList.remove('loading');
 $('results-content').innerHTML=`<div class="latest-draw"><div><small>資料最新一期 · ${lotteryData[0].draw_date}</small><h3>${lotteryData[0].draw_number}</h3></div><div>${balls(lotteryData[0].numbers)} <span class="extra-number-ball number-ball">${lotteryData[0].extra_number}</span></div></div><div class="search-row"><label for="draw-search">搜尋期號或日期</label><input id="draw-search" value="${escapeText(resultQuery)}" placeholder="例如 26/120 或 2026-11" onchange="resultQuery=this.value.trim();resultsPage=0;loadResults()"><button onclick="resultQuery=$('draw-search').value.trim();resultsPage=0;loadResults()">搜尋</button><span>${rows.length} 筆</span></div><div class="table-scroll"><table class="results-table"><thead><tr><th>期號</th><th>日期</th><th>正選號碼</th><th>特別號</th></tr></thead><tbody>${rows.slice(resultsPage*25,resultsPage*25+25).map(d=>`<tr><td>${d.draw_number}</td><td>${d.draw_date}</td><td>${balls(d.numbers)}</td><td><span class="extra-number-ball number-ball">${d.extra_number}</span></td></tr>`).join('')}</tbody></table></div><div class="pager"><button onclick="resultsPage--;loadResults()" ${resultsPage===0?'disabled':''}>上一頁</button><span>${rows.length?resultsPage+1:0} / ${Math.ceil(rows.length/25)}</span><button onclick="resultsPage++;loadResults()" ${(resultsPage+1)*25>=rows.length?'disabled':''}>下一頁</button></div>`;
}
function currentBet(){
 if(currentBettingMode==='groups'){if(!validGroupedBet(historyVerificationBet))throw Error('請先從篩選歷史記錄載入注碼。');return historyVerificationBet;}
 if(currentBettingMode==='mandel'){syncMandelTarget();if(mandelWorker)throw Error('正在生成濃縮組合，完成後會自動核對結果。');if(!mandelCombinations.length&&!mandelFilterInfo)throw Error('請選擇號碼並生成濃縮組合。');return {mode:'mandel',numbers:[...mandelSelected],bets:mandelCombinations,filterInfo:mandelFilterInfo};}
 if(currentBettingMode==='banker'){if(!Engine.validNumbers(bankerNumbers,1,5)||!Engine.validNumbers(runnerNumbers,6-bankerNumbers.length)||runnerNumbers.some(n=>bankerNumbers.includes(n)))throw Error('請選擇 1–5 個膽碼，膽碼與腳碼合共至少 6 個，且不能重複。');return {mode:'banker',bankers:[...bankerNumbers],numbers:[...runnerNumbers]};}
 if(!Engine.validNumbers(selectedNumbers,6,20))throw Error('請先選擇至少 6 個號碼，再核對結果。');return {mode:'complex',numbers:[...selectedNumbers]};
}
function amounts(){return Engine.defaults.map((n,i)=>{const el=$('prize-'+i),v=el?Number(el.value):n;return Number.isFinite(v)&&v>=0?v:n;});}
function reportRows(rows,betForRow){const prices=amounts();return rows.map((draw,i)=>{const bet=betForRow(i),counts=Engine.evaluate(bet,draw),cost=Engine.total(bet)*10;return {draw,bet,counts,cost,prize:counts.reduce((s,c,j)=>s+c*prices[j],0)};});}
function reportSelection(bet){
 if(bet.mode==='groups')return `<p><strong>${escapeText(groupedBetLabel(bet))}</strong> · 保留原有 ${bet.groups.length} 組，共 ${Engine.total(bet).toLocaleString()} 注。各組重複注碼按重複投注計。</p><details><summary>查看原有逐組號碼</summary>${bet.groups.map((g,i)=>`<div class="report-bet-group"><strong>${bet.hasRandomBet&&i===bet.groups.length-1?'額外隨機注':`第 ${i+1} 組`}（${Engine.total(g).toLocaleString()} 注）</strong>${g.mode==='mandel'?reportSelection(g)+`<details><summary>濃縮逐注號碼</summary>${g.bets.map(n=>`<div>${n.join('、')}</div>`).join('')}</details>`:reportSelection(g)}</div>`).join('')}</details>`;
 if(bet.mode==='banker')return `<div>膽碼：${balls(bet.bankers||[])}</div><div>腳碼：${balls(bet.numbers)}</div>`;
 return `<div>${bet.mode==='mandel'?'Mandel 選號池：':'選用號碼：'}${balls(bet.numbers)}</div>${bet.mode==='mandel'?`${mandelFilterSummary(bet.filterInfo)}<p>實際核對已生成的 ${bet.bets.length.toLocaleString()} 注濃縮組合；逐注號碼見濃縮組合列表。</p>`:''}`;
}
function renderReport(rows,target,title){
 const cost=rows.reduce((s,r)=>s+r.cost,0),prize=rows.reduce((s,r)=>s+r.prize,0);reports[target]=rows;
 const first=rows[0]?.bet,key=JSON.stringify(first),shared=!!first&&rows.every(r=>JSON.stringify(r.bet)===key);
 $(target).classList.remove('loading');
 $(target).innerHTML=`<h3>${title}</h3><p class="muted">按下方設定金額估算，每注 $10；不是逐期實際派彩。歷史表現不代表下一期結果。</p>
 ${shared?`<section class="report-selection"><h4>本次使用號碼（${rows.length} 期共用）</h4>${reportSelection(first)}</section>`:'<p class="muted">每期選號不同，使用號碼另列於各期明細。</p>'}
 <div class="metric-grid"><div>核對期數<strong>${rows.length}</strong></div><div>總成本<strong>${money(cost)}</strong></div><div>估算獎金<strong>${money(prize)}</strong></div><div>估算淨額<strong>${money(prize-cost)}</strong></div></div><button onclick="exportReport('${target}')">匯出核對 CSV</button>
 <details><summary>逐期核對明細（${rows.length} 期）</summary><div class="table-scroll"><table class="results-table"><thead><tr><th>期號 / 日期</th><th>開獎號碼（正選＋特別號）</th>${shared?'':'<th>使用號碼</th>'}${names.map(n=>`<th>${n}</th>`).join('')}<th>估算獎金</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.draw.draw_number}<br>${r.draw.draw_date}</td><td class="report-draw">${balls(r.draw.numbers)} <span aria-label="特別號">＋ <span class="number-ball extra-number-ball">${r.draw.extra_number}</span></span></td>${shared?'':`<td>${reportSelection(r.bet)}</td>`}${r.counts.map(c=>`<td>${c}</td>`).join('')}<td>${money(r.prize)}</td></tr>`).join('')}</tbody></table></div></details>`;
}
function loadVerification(){try{const a=Number($('verification-start-period').value),b=Number($('verification-end-period').value);if(!validRange(a,b))throw Error(`請輸入 1 至 ${lotteryData.length} 的整數範圍，開始不可大於結束。`);const bet=currentBet();renderReport(reportRows(lotteryData.slice(a-1,b),()=>bet),'verification-content',`我的號碼核對 · ${lotteryData[a-1].draw_number} 至 ${lotteryData[b-1].draw_number}`);$('live-cost').textContent=`${Engine.total(bet).toLocaleString()} 注 · 每期 ${money(Engine.total(bet)*10)}`;}catch(e){delete reports['verification-content'];$('verification-content').innerHTML=`<p class="empty-state">${escapeText(e.message)}</p>`;if($('live-cost'))$('live-cost').textContent='選擇號碼後顯示成本';}saveWorkspace();syncButtons();}
function calculateComplexWinnings(){loadVerification();$('verification-content').scrollIntoView({behavior:'smooth',block:'start'});}
function runBacktest(){delete reports['backtest-content'];const train=Number($('training-count').value),periods=Number($('testing-count').value);if(!Number.isInteger(train)||!Number.isInteger(periods)||train<1||periods<1||train+periods>lotteryData.length){$('backtest-content').textContent='訓練及驗證期數必須為正整數，合共不可超過資料筆數。';return;}const rows=reportRows(lotteryData.slice(0,periods),i=>({mode:'complex',numbers:Engine.rank(lotteryData.slice(i+1,i+1+train),10)}));renderReport(rows,'backtest-content',`滾動回測 · 每期只用之前 ${train} 期選熱門 10 碼`);}
function invalidateMandel(){if(currentBettingMode==='mandel')delete reports['verification-content'];if(mandelWorker){mandelWorker.terminate();mandelWorker=null;}mandelCombinations=[];mandelFilterInfo=null;if($('mandel-results'))$('mandel-results').style.display='none';if($('mandel-progress'))$('mandel-progress').style.display='none';if($('verification-content')&&currentBettingMode==='mandel')$('verification-content').innerHTML='<p class="empty-state">號碼已更改，請重新生成組合。</p>';if($('live-cost')&&currentBettingMode==='mandel')$('live-cost').textContent='請重新生成組合';}
function mandelGenerate(){
 syncMandelTarget();updateMandelUI();
 if(mandelSelected.length!==mandelTargetV){$('verification-content').textContent=`請選滿 ${mandelTargetV} 個號碼，目前已選 ${mandelSelected.length} 個。`;return Promise.resolve(false);}
 invalidateMandel();const snapshot=[...mandelSelected],advanced=mandelAdvancedEnabled;
 $('mandel-progress').style.display='block';$('mandel-progress-bar').style.width='0%';
 $('mandel-generate-btn').disabled=true;
 $('verification-content').innerHTML='<p class="empty-state">正在生成濃縮組合，完成後會自動核對結果。</p>';
 return new Promise(resolve=>{
  let worker=null,url=null,timer=null,fallbackStarted=false;
  const release=()=>{if(worker){worker.terminate();worker=null;}if(url){URL.revokeObjectURL(url);url=null;}if(timer!==null){clearTimeout(timer);timer=null;}};
  const job={terminate(){release();resolve(false);}};mandelWorker=job;
  const active=()=>mandelWorker===job;
  const fail=error=>{if(!active())return;release();mandelWorker=null;$('mandel-progress').style.display='none';updateMandelUI();$('verification-content').textContent='生成未完成：'+error.message+'。請重新選號後重試。';resolve(false);};
  const finish=bets=>{
   syncMandelTarget();
   if(!active())return;
   release();mandelWorker=null;const filtered=MandelEngine.filterBets(bets.map(c=>c.map(i=>snapshot[i])),advanced);mandelCombinations=filtered.bets;mandelFilterInfo=filtered.filterInfo;
   $('mandel-progress-bar').style.width='100%';$('mandel-progress').style.display='none';
   updateMandelUI();displayMandelResults();loadVerification();resolve(true);
  };
  const fallback=()=>{
   if(!active()||fallbackStarted)return;fallbackStarted=true;release();
   const work=MandelEngine.createStepper(snapshot.length);
   const tick=()=>{
    if(!active())return;
    try{const until=Date.now()+8;let step;
     do{step=work.next();if(step.done){finish(step.value);return;}}while(Date.now()<until);
     $('mandel-progress-bar').style.width=step.value.progress+'%';timer=setTimeout(tick,0);
    }catch(e){fail(e);}
   };
   timer=setTimeout(tick,0);
  };
  try{
   url=URL.createObjectURL(new Blob([MandelEngine.workerSource()],{type:'text/javascript'}));
   worker=new Worker(url);
   worker.onmessage=({data})=>{if(!active()||fallbackStarted)return;if(data.error){fallback();return;}if(data.progress!==undefined)$('mandel-progress-bar').style.width=data.progress+'%';if(data.bets)finish(data.bets);};
   worker.onerror=e=>{if(e.preventDefault)e.preventDefault();fallback();};
   worker.postMessage(snapshot.length);
  }catch{fallback();}
 });
}
function syncButtons(){document.querySelectorAll('.number-cell').forEach(el=>{if(el.tagName!=='BUTTON'){el.setAttribute('role','button');el.tabIndex=0;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click();}};}el.setAttribute('aria-pressed',String(el.classList.contains('selected')||el.classList.contains('banker-selected')||el.classList.contains('runner-selected')));});}
function captureWorkspace(){return {numbers:selectedNumbers,bankers:bankerNumbers,runners:runnerNumbers,tab:document.querySelector('.tab-pane.active')?.id||'results',mode:currentBettingMode,statsViewMode,rankShowColdComplement,mandelNumbers:mandelSelected,mandelBets:mandelCombinations,mandelFilterInfo,historyVerificationBet,statsBankerDraft,currentSelectionDraw,controls:captureControls()};}
function saveWorkspace(){if(!workspaceRestoring)Store.set('workspace',captureWorkspace());}
function restoreStatsCoreOption(saved){
 const value=String(saved.controls?.['smart-core-number']||''),select=$('smart-core-number');
 if(saved.controls?.['draw-repeat-switch']!==true||!Engine.validNumbers([Number(value)],1,1)||[...select.options].some(o=>o.value===value))return;
 const option=document.createElement('option');option.value=value;option.textContent=value;select.appendChild(option);
}
function clearWorkspaceSelection(){historyVerificationBet=null;updateHistoryBetUI();if(currentBettingMode==='groups')switchBettingMode('complex');selectedNumbers=[];bankerNumbers=[];runnerNumbers=[];mandelClearAll();updateNumberDisplay();updateSelectionStatus();updateBankerDisplay();updateBankerStatus();loadVerification();}
function download(name,text,type='text/plain'){const u=URL.createObjectURL(new Blob([type==='application/json'?text:'\ufeff'+text],{type}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function exportReport(target){const lastReport=reports[target];if(!lastReport)return;download('核對結果.csv',['期號,日期,開獎正選,特別號,使用號碼,膽碼,逐組注碼,成本,估算獎金,'+names.join(','),...lastReport.map(r=>[r.draw.draw_number,r.draw.draw_date,r.draw.numbers.join(' '),r.draw.extra_number,r.bet.numbers.join(' '),(r.bet.bankers||[]).join(' '),betTicketText(r.bet),r.cost,r.prize,...r.counts].join(','))].join('\n'),'text/csv');}
function exportWorkspace(){try{download('sixmark-backup.json',JSON.stringify({version:2,workspace:captureWorkspace(),history:filterHistory,sets:Store.get('sets',[]),forecasts:forecastRecords(),research:researchLedger()}),'application/json');}catch(e){$('save-status').textContent=e.message;}}
function saveSet(){try{const bet=currentBet(),sets=Store.get('sets',[]);sets.unshift({...bet,name:new Date().toLocaleString('zh-HK')});if(!Store.set('sets',sets.slice(0,30)))return;renderSets();$('save-status').textContent='已保存號碼組。';}catch(e){$('save-status').textContent=e.message;}}
function renderSets(){const sets=Store.get('sets',[]);$('saved-sets').innerHTML=sets.map((s,i)=>`<button onclick="restoreSet(${i})">${escapeText(s.name)} · ${s.mode==='groups'?escapeText(groupedBetLabel(s)):s.mode==='banker'?'膽拖':s.mode==='mandel'?(s.filterInfo?.advanced?'進階濃縮':'濃縮'):'複式'} ${s.numbers.length} 碼</button>`).join('')||'<span class="muted">尚未保存號碼組</span>';}
function restoreSet(i){const s=Store.get('sets',[])[i];if(!s)return;applyVerificationBet(s);loadVerification();}
function betTicketText(b){return b.mode==='groups'?b.groups.map((g,i)=>`第${i+1}組：${betTicketText(g)}`).join(' | '):b.mode==='mandel'?b.bets.map(n=>n.join(' ')).join(' | '):(b.bankers?.length?'膽：'+b.bankers.join(' ')+'／腳：':'')+b.numbers.join(' ');}
function copyBetText(b){return b.mode==='groups'?b.groups.map((g,i)=>`${b.hasRandomBet&&i===b.groups.length-1?'額外隨機注':`第${i+1}組`}：\n${copyBetText(g)}`).join('\n'):b.mode==='mandel'?b.bets.map(x=>x.join(', ')).join('\n'):(b.bankers?.length?'膽：'+b.bankers.join(', ')+'\n腳：':'')+b.numbers.join(', ');}
async function copySelection(){try{const b=currentBet(),text=copyBetText(b);await navigator.clipboard.writeText(text);$('save-status').textContent='已複製。';}catch{$('save-status').textContent='未能複製，請使用匯出備份。';}}
function restoreMandelWorkspace(saved){
 const numbers=Engine.validNumbers(saved.mandelNumbers,0,18)?[...saved.mandelNumbers]:[];
 const count=Number(saved.controls?.['mandel-v-select']);
 const hasCount=Number.isInteger(count)&&count>=7&&count<=18;
 if(hasCount)$('mandel-v-select').value=String(count);
 else if(numbers.length>=7)$('mandel-v-select').value=String(numbers.length);
 mandelSelected=numbers;mandelCombinations=[];mandelFilterInfo=null;
 if(saved.controls?.['mandel-advanced']===undefined)$('mandel-advanced').checked=!!saved.mandelFilterInfo?.advanced;
 syncMandelTarget();
 if(numbers.length===mandelTargetV&&mandelAdvancedEnabled===!!saved.mandelFilterInfo?.advanced&&validMandelRecord(mandelSelected,saved.mandelBets,saved.mandelFilterInfo)){mandelCombinations=saved.mandelBets.map(b=>[...b]);mandelFilterInfo=saved.mandelFilterInfo||null;}
}
document.addEventListener('DOMContentLoaded',()=>{ workspaceRestoring=true;
 const banner=document.createElement('div');banner.className='data-banner';const issues=Engine.audit(lotteryData);banner.textContent=`資料截至 ${lotteryData[0].draw_date} · ${lotteryData.length} 期 · 本機資料集`+(issues.length?' ｜ '+issues.join('；'):'');document.querySelector('.header').after(banner);
 $('verification-content').insertAdjacentHTML('beforebegin','<p id="live-cost" class="live-cost"></p><div class="workspace-tools"><button onclick="saveSet()">保存號碼組</button><button onclick="copySelection()">複製號碼</button><button onclick="clearWorkspaceSelection()">清除選號</button><button onclick="exportWorkspace()">匯出備份</button><label>匯入備份 <input type="file" id="import-backup" accept=".json"></label><span id="save-status" role="status"></span></div><details><summary>已保存號碼組</summary><div id="saved-sets"></div></details>');
 $('verification-content').insertAdjacentHTML('afterend',`<details class="prize-settings"><summary>估算金額設定（非逐期實際派彩）</summary><div class="prize-inputs">${names.map((n,i)=>`<label>${n}<input type="number" min="0" id="prize-${i}" value="${Engine.defaults[i]}" onchange="loadVerification()"></label>`).join('')}</div></details>`);
 const saved=Store.get('workspace',{});restoreStatsCoreOption(saved);if(validSelectionDraw(saved.currentSelectionDraw))currentSelectionDraw=saved.currentSelectionDraw;if(validStatsBankerDraft(saved.statsBankerDraft))statsBankerDraft={bankers:[...saved.statsBankerDraft.bankers],runners:[...saved.statsBankerDraft.runners]};restoreControls(saved.controls);statsViewMode=saved.statsViewMode==='periodBalls'?'periodBalls':'cooccurrence';rankShowColdComplement=saved.rankShowColdComplement===true;updateFilterModeDescription(false);if(Engine.validNumbers(saved.numbers,0,20))selectedNumbers=saved.numbers;if(Engine.validNumbers(saved.bankers,0,5))bankerNumbers=saved.bankers;if(Engine.validNumbers(saved.runners)&&!saved.runners.some(n=>bankerNumbers.includes(n)))runnerNumbers=saved.runners;restoreMandelWorkspace(saved);initializeNumberSelection();initializeBankerGrids();updateBankerStatus();initializeMandel();historyVerificationBet=validGroupedBet(saved.historyVerificationBet)?saved.historyVerificationBet:null;updateHistoryBetUI();if(['complex','banker','mandel'].includes(saved.mode)||(saved.mode==='groups'&&historyVerificationBet))switchBettingMode(saved.mode);if(mandelCombinations.length||mandelFilterInfo)displayMandelResults();renderSets();updateFilterHistoryDisplay();if(['statistics','verification'].includes(saved.tab))switchTab(saved.tab);
 Promise.resolve().then(()=>{workspaceRestoring=false;syncButtons();saveWorkspace();});
 document.addEventListener('change',saveWorkspace);document.addEventListener('click',()=>{syncButtons();saveWorkspace();});
 document.querySelectorAll('label.input-label').forEach(el=>{const input=el.parentElement.querySelector('input');if(input)el.htmlFor=input.id;});
 $('import-backup').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>10000000)throw Error();const d=JSON.parse((await file.text()).replace(/^\uFEFF/,''));if(d.version!==2||!validBackup(d))throw Error();if(!importWorkspace(d)){ $('save-status').textContent='未能完成匯入：可能有鎖定記錄衝突、儲存空間不足或超過記錄上限，請保留備份檔。';return;}location.reload();}catch{$('save-status').textContent='備份格式或號碼無效，未匯入。';}};
});
function validBackup(d){
 if(!d||typeof d!=='object')return false;
 const w=d.workspace;
 if(!w||!Engine.validNumbers(w.numbers,0,20)||!Engine.validNumbers(w.bankers,0,5)||!Engine.validNumbers(w.runners)||w.bankers.some(n=>w.runners.includes(n)))return false;
 if(w.mode!==undefined&&!['complex','banker','mandel','groups'].includes(w.mode))return false;
 if(w.historyVerificationBet!=null&&!validGroupedBet(w.historyVerificationBet))return false;
 if(w.mode==='groups'&&!validGroupedBet(w.historyVerificationBet))return false;
 if(w.currentSelectionDraw!=null&&!validSelectionDraw(w.currentSelectionDraw))return false;
 if(w.statsBankerDraft!==undefined&&!validStatsBankerDraft(w.statsBankerDraft))return false;
 if(w.mandelNumbers!==undefined&&!Engine.validNumbers(w.mandelNumbers,0,18))return false;
 if(w.mandelBets!==undefined&&(!Array.isArray(w.mandelBets)||((w.mandelBets.length||w.mandelFilterInfo)&&!validMandelRecord(w.mandelNumbers,w.mandelBets,w.mandelFilterInfo))))return false;
 if(d.forecasts!==undefined&&!Forecast.validList(d.forecasts))return false;
 if(d.research!==undefined&&!Research.valid(d.research))return false;
 return Array.isArray(d.history)&&d.history.length<=20&&d.history.every(validHistoryItem)&&Array.isArray(d.sets)&&d.sets.length<=30&&d.sets.every(validSavedSet);
}
function importWorkspace(data){
 const keys=['workspace','history','sets'];
 if(data.forecasts!==undefined){try{data={...data,forecasts:Forecast.merge(forecastRecords(),data.forecasts)};keys.push('forecasts');}catch{return false;}}
 if(data.research!==undefined){try{data={...data,research:Research.merge(researchLedger(),data.research)};keys.push('research');}catch{return false;}}
 const before=keys.map(k=>Store.rawGet('sixmark.v2.'+k));
 for(const key of keys)if(!Store.set(key,data[key])){
  keys.forEach((k,i)=>{try{if(before[i]===null)localStorage.removeItem('sixmark.v2.'+k);else localStorage.setItem('sixmark.v2.'+k,before[i]);}catch{}});
  return false;
 }
 return true;
}
