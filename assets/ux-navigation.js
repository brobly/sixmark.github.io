/* Presentation only: calculation engines and locked study fingerprints stay unchanged. */
document.addEventListener('DOMContentLoaded',()=>{
 const $=id=>document.getElementById(id),nav=document.querySelector('.tab-nav'),content=document.querySelector('.tab-content');
 const sections=[['results','開獎'],['statistics','揀號'],['arrange','排注'],['verification','核對'],['studies','研究'],['records','我的記錄']];
 for(const [id,title] of sections){if(!$(id)){const pane=document.createElement('div');pane.id=id;pane.className='tab-pane';pane.innerHTML='<h2>'+title+'</h2>';content.append(pane);}}
 const oldSwitch=window.switchTab;
 window.switchTab=function(id){if(['results','statistics','verification'].includes(id))oldSwitch(id);else{document.querySelectorAll('.tab-pane').forEach(p=>p.classList.toggle('active',p.id===id));}nav.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.pane===id));};
 nav.innerHTML='';for(const [id,title] of sections){const b=document.createElement('button');b.className='tab-button';b.dataset.pane=id;b.textContent=title;b.onclick=()=>switchTab(id);nav.append(b);}
 const budget=document.querySelector('.budget-panel');$('arrange').append(budget);
 // Keep the shared study configuration visible in the arrange page, with an explicit shortcut.
 const heading=[...budget.querySelectorAll('h3')].find(h=>h.textContent.includes('新版前瞻'));
 if(heading){const study=document.createElement('section');study.className='backtest';$('studies').append(study);let node=heading;while(node){const next=node.nextSibling;study.append(node);node=next;}}
 for(const id of ['pool-comparison','pair-comparison','research-panel','forecast-panel'])if($(id))$('studies').append($(id));
 const backtest=document.querySelector('#verification .backtest');if(backtest)$('studies').append(backtest);
 const tools=document.querySelector('.workspace-tools');if(tools)$('records').append(tools);
 const saved=$('saved-sets')?.closest('details');if(saved)$('records').append(saved);
 // Keep the list beside its heading, clear button and frequency summary on the selection page.
 const hist=$('filter-history');if(hist){
  const shortcut=document.createElement('button');shortcut.type='button';shortcut.id='open-filter-history';shortcut.textContent='查看篩選歷史記錄';
  shortcut.onclick=()=>{switchTab('statistics');$('high-frequency-result').style.display='block';hist.scrollIntoView({block:'center'});hist.focus({preventScroll:true});};
  $('records').append(shortcut);
  // Saved records remain visible after a reload without drawing or replacing any tickets.
  if(hist.querySelector('.hf-history-card'))$('high-frequency-result').style.display='block';
 }
 const directory=document.createElement('details');directory.innerHTML='<summary>全站教學 · 31個主題</summary><div class="ux-directory"></div>';
 const top=document.createElement('div');top.className='ux-tools';const intro=document.createElement('button');intro.textContent='▶ 全站入門';intro.onclick=()=>openTutorial('site-intro',intro);top.append(intro,directory);document.querySelector('.header').after(top);
 for(const t of TutorialTopics){const b=document.createElement('button');b.textContent='▶ '+t.title;b.onclick=()=>openTutorial(t.id,b);directory.querySelector('div').append(b);}
 const mapping=[['固定注數','budget','用同一注數，比較兩種排法。'],['新版前瞻','prospective','開獎日前保存，之後逐期核對。'],['固定碼數','selection-compare','同注數，比較揀號後排注同全49碼。'],['排名與搭配策略比較','strategy-compare','比較相同注數下有幾多期中獎。'],['前瞻研究','legacy','按原有規則繼續研究。'],['個別預存','single-snapshot','保存候選號碼，等下一期核對。'],['策略回測','backtest','用以前資料選號，再核對之後結果。'],['高頻號碼篩選結果','pool','選出候選號碼，準備排注。'],['歷史高頻','history','統計已保存注碼，並非開獎次數。','歷史常用號碼'],['篩選歷史記錄','history','','篩選歷史記錄'],['投注號碼選擇','check','選擇注碼，再核對開獎。'],['近期開獎','results','查看正選及特別號。'],['歷史注碼','history','載入原有注碼，再核對。'],['覆蓋保證','mandel','查看五碼覆蓋的條件。'],['組合列表','groups','展開查看每一注。']];
 function button(id){const b=document.createElement('button');b.type='button';b.className='tutorial-button';b.textContent='▶ 睇示範';b.onclick=()=>openTutorial(id,b);return b;}
  function decorate(){
  document.querySelectorAll('.tab-pane h2,.tab-pane h3,.tab-pane h4').forEach(h=>{if(h.dataset.taught||/^\d{2}\/\d{3}$/.test(h.textContent.trim()))return;const m=mapping.find(m=>h.textContent.includes(m[0]));const defaultId={results:'results',statistics:'pool',arrange:'budget',verification:'check',studies:'site-intro',records:'saved'}[h.closest('.tab-pane')?.id];const id=m?.[1]||defaultId;if(!id)return;h.dataset.taught='1';if(m){h.textContent=m[3]||TutorialTopics.find(t=>t.id===id)?.title||h.textContent;}h.append(button(id));if(m?.[2]&&!h.nextElementSibling?.classList.contains('ux-purpose')){const purpose=document.createElement('p');purpose.className='ux-purpose';purpose.textContent=m[2];h.after(purpose);}});
  document.querySelectorAll('.mode-tab').forEach(b=>{
   if(b.dataset.taught)return;b.dataset.taught='1';
   const mode=b.textContent.includes('膽')?'banker':b.textContent.includes('Mandel')?'mandel':b.textContent.includes('歷史')?'groups':'complex';
   const panel=$(mode+'-betting-mode');if(!panel)return;
   const help=document.createElement('div');help.className='mode-tutorial';
   const demo=button({complex:'compound',banker:'banker',mandel:'mandel',groups:'history'}[mode]);
   demo.textContent='▶ '+b.textContent.trim()+'示範';help.append(demo);panel.prepend(help);
  });
  // Long explanations stay available, outside the main reading path; result conditions remain visible.
  document.querySelectorAll('.tab-pane p').forEach(p=>{if(p.closest('details')||p.dataset.concise||p.id||p.textContent.length<90||p.textContent.includes('保證')||p.textContent.includes('覆蓋：'))return;p.dataset.concise='1';const d=document.createElement('details');d.className='ux-explanation';d.innerHTML='<summary>詳細說明</summary>';p.before(d);d.append(p);});
 }
 decorate();let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate();});}).observe(content,{subtree:true,childList:true});
 // Each mode and setting has a contextual entry, including controls without a section heading.
 const controls={'filter-mode-select':'pool','draw-mode-select':'groups','budget-scope':'pool','budget-target':'budget','budget-seed':'budget','mandel-advanced':'filter','start-period':'range','verification-start-period':'check','prize-0':'cost'};
 for(const [id,topic] of Object.entries(controls))if($(id)){
  const input=$(id),demo=button(topic),label=input.type==='checkbox'?input.closest('label'):null;
  if(label){
   const row=document.createElement('div');row.className='tutorial-control-row';label.before(row);row.append(label,demo);
  }else input.after(demo);
 }
 for(const [paneId,category] of [['results','draws'],['statistics','selection'],['arrange','tickets'],['verification','verification'],['studies','research'],['records','records']]){const d=document.createElement('details');d.innerHTML='<summary>本頁其他教學</summary>';for(const t of TutorialTopics.filter(t=>t.section===category)){const b=button(t.id);b.textContent='▶ '+t.title;d.append(b);}$(paneId).insertBefore(d,$(paneId).children[1]);}
 const studyNote=document.createElement('p');studyNote.textContent='「逐期驗證注碼」沿用排注頁設定；下方歷史比較各有設定。';$('studies').insertBefore(studyNote,$('studies').children[1]);
 const backupNote=document.createElement('p');backupNote.textContent='一般備份與新版研究分開保存。新版研究請到「研究」匯出 JSON。';$('records').append(backupNote,button('backup'));
 switchTab('results');
});
