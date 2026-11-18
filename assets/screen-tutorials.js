/* Live interface snapshots in a script-free frame. Never click or write to the real app. */
const ScreenLessons={
'site-intro':[['.tab-nav','先揀你想做嘅事。'],['[data-pane="statistics"]','揀號：準備候選號碼。'],['[data-pane="arrange"]','排注：將號碼排成每注六碼。'],['[data-pane="verification"]','核對：查看每注有冇中獎。']],
results:[['.latest-draw','呢度係資料最新一期。'],['.latest-draw .number-ball','前六個係正選號碼。'],['.latest-draw .extra-number-ball','呢個係特別號，獎項會分開計。']],
search:[['#draw-search','喺呢度輸入期號，例如26/122。','26/122'],['button[onclick*="resultQuery"]','再按「搜尋」。'],['#results-content table','結果會列出符合條件嘅開獎記錄。']],
range:[['#start-period','第1期代表資料最新一期。','1'],['#end-period','想睇最近20期，就填20。','20'],['.apply-btn','按呢度套用範圍。']],
frequency:[['#filter-mode-select','喺呢度選擇排名方法。','rank'],['#rank-cold-toggle-btn','呢個掣可以切換冷門。'],['#filtered-numbers','篩選結果會喺呢度顯示。']],
pool:[['#filter-count-select','先揀幾多個候選號碼。','12'],['.filter-btn','按呢度產生候選號碼。'],['#filtered-numbers','呢批係候選號碼，仲未等於每注號碼。']],
'main-only':[['#filter-mode-select','選「純排名（只計正選）」。','rank_regular'],['.filter-btn','按篩選，重新計排名。'],['#filtered-numbers','結果只按正選出現次數揀號。']],
blend:[['#filter-mode-select','先選長短期混合。','blend'],['#filter-short-periods','填近期幾多期，例如10期。','10'],['.filter-btn','按篩選，產生混合排名候選號碼。']],
pairs:[['#filter-mode-select','選排名＋搭配。','rank_with_pair'],['.filter-btn','按篩選查看歷史搭配。'],['#filtered-numbers','結果會顯示採用嘅搭配；歷史常見不等於下期必出。']],
single:[['#bet-count-select','單式選6個號碼。','6'],['#complex-betting-mode .number-grid','喺號碼格揀六個。'],['button[onclick="loadVerification()"]','揀好後按「核對結果」。']],
compound:[['#bet-count-select','例如選7個號碼。','7'],['#complex-betting-mode .number-grid','喺呢度選齊7個。'],['#live-cost','7碼複式會展開成7注，成本要睇呢度。']],
banker:[['#banker-count-select','先定每注保留幾個膽碼。','2'],['#banker-grid','喺呢度揀膽碼。'],['#runner-grid','再揀腳碼；腳碼輪流補滿六個。']],
groups:[['#draw-mode-select','喺呢度選分組模式。','smart'],['#random-6-numbers','排好嘅每一注會列喺呢度。'],['#refresh-draw-btn','想重新排一次，按呢度。']],
'preserve-pair':[['#draw-mode-select','選「保留搭配」。','paired'],['#paired-count','設定每期幾多注。','5'],['#refresh-draw-btn','按呢度產生保留搭配嘅注碼。']],
budget:[['#budget-count','先揀每種排法幾多注。','5'],['#budget-scope','選全49碼，或者自己嘅候選池。','all'],['#budget-generate','按呢度，產生兩組同注數嘅注碼。'],['#budget-output','比較結果會喺呢度顯示，標示為模擬估計。']],
'cover-three':[['#budget-count','完整12碼三碼覆蓋要15注。','15'],['#budget-scope','選按所選方法揀號。','selected'],['#budget-size','候選池選12碼。','12'],['#budget-generate','目標中3碼，產生後查看220組覆蓋。']],
mandel:[['#mandel-v-select','先揀候選號碼數量。','10'],['#mandel-grid','揀齊候選號碼。'],['#mandel-generate-btn','按「生成濃縮組合」。'],['#mandel-guarantee','睇清楚保證條件：池內至少有5個正選。']],
filter:[['#mandel-advanced','勾選後會剔除部分注碼。',true],['#mandel-generate-btn','重新產生組合。'],['#mandel-filter-summary','呢度會顯示少咗幾多注、失去幾多覆蓋。']],
'pool-ticket':[['#filtered-numbers','示例：12個候選號碼中咗3個正選，已圈出。'],['#random-6-numbers','3個正選分散喺兩注，兩注都未中獎。'],['#probability-info','池中3個，仍要同一注湊齊3個先中獎。']],
check:[['#complex-betting-mode','先選擇你要核對嘅號碼。'],['#verification-start-period','選要核對嘅開獎範圍。','1'],['button[onclick="loadVerification()"]','按「核對結果」。'],['#verification-content','喺呢度睇各注命中及獎項。']],
cost:[['#live-cost','呢度顯示注數同每期成本。'],['.prize-settings','估算獎金用呢度嘅設定金額。'],['button[onclick="calculateComplexWinnings()"]','按估算獎金；金額唔等於正式派彩。']],
 'selection-compare':[['#pool-train','每一期只用當時之前嘅資料揀號。','100'],['#pool-size','四種方法選同樣碼數，另加全49碼對照。','12'],['#pool-tickets','各組每期都重新排呢個注數，選1至10注。','10'],['button[onclick="comparePoolSelections()"]','按逐期比較，等進度完成。'],['#pool-ticket-goal','主結果計有幾多期至少一注中3個正選；亦可切換總中獎注數。','hit3']],
'strategy-compare':[['#pair-bets','先固定每法每期注數。','5'],['#compare-pairs','按呢度比較四種方法。'],['#pair-comparison-result','先睇有中獎期數，再睇中獎注數。']],
backtest:[['#training-count','設定每期之前用幾多期選號。','100'],['#testing-count','設定核對幾多期。','30'],['button[onclick="runBacktest()"]','按執行，結果屬歷史回測。']],
prospective:[['#budget-count','先喺排注頁定每法幾多注。','10'],['#ticket-create','開獎日前按呢度，鎖定規則及首期注碼。'],['#ticket-results','保存後顯示等待；開獎資料更新後再核對。'],['#ticket-next','新一期資料加入後，按呢度保存下一期。']],
legacy:[['#research-plan','揀返你原有方案。'],['#research-results','睇原有規則、進度及結果。'],['#research-lock','每次資料更新後，保存下一期。']],
'single-snapshot':[['button[onclick="saveForecast()"]','開獎日前按呢度保存目前候選號碼。'],['#forecast-results','呢度會顯示等待緊接下一期。'],['button[onclick="renderForecasts()"]','資料更新後，按更新核對顯示。']],
examples:[['button[onclick="BudgetUI.example()"]','按呢度查看163注研究示例。'],['#budget-example','呢度列出完整注碼與成本；有獎不等於回本。']],
history:[['#filter-history','喺呢度揀返歷史記錄。'],['#filter-history','載入原有注碼再核對，唔會重新抽票。']],
saved:[['button[onclick="saveSet()"]','按呢度保存目前號碼組。'],['#saved-sets','已保存號碼組會列喺呢度。'],['button[onclick="copySelection()"]','需要貼去其他地方，就按複製號碼。']],
backup:[['button[onclick="exportWorkspace()"]','一般號碼及舊研究用呢度備份。'],['#ticket-export','新版注碼研究要另外匯出呢份JSON。'],['#import-backup','一般備份用呢度還原；新版用新版研究匯入入口。']]
};

const screenBalls=(nums,hits=[])=>nums.map(n=>'<span class="number-ball '+(hits.includes(n)?'screen-example-hit':'')+'">'+n+'</span>').join('');
const ScreenExamples={
 '#filtered-numbers':screenBalls([1,4,7,10,13,16,19,22,25,28,31,34],[4,13,25]),
 '#random-6-numbers':'<div class="screen-example-row">第1注 '+screenBalls([1,4,7,10,16,19],[4])+' 中1個</div><div class="screen-example-row">第2注 '+screenBalls([13,19,22,25,28,34],[13,25])+' 中2個</div><p>圈住嘅3個正選分散喺兩注，兩注都未中3個。</p>',
 '#probability-info':'<p>候選池中3碼以上：12／90期</p><p>實際中獎注數：7／450注</p><p>候選池命中，唔代表同一注包含晒。呢兩個數唔會相等。</p>',
 '#budget-output':'<p><strong>每方法各5注 · 每注6碼</strong></p><div class="screen-example-row">隨機排注：5注／$50</div><div class="screen-example-row">覆蓋排注：5注／$50</div><p>產生後會列出兩組完整注碼，同模擬估計。</p>',
 '#ticket-results':'<p><strong>本期注碼已鎖定 · 等開獎</strong></p><p>資料更新後，呢度會顯示達標期數及中獎注數。</p>',
 '#forecast-results':'<p><strong>候選號碼已保存 · 等緊接下一期</strong></p><p>更新開獎資料後，再按更新核對顯示。</p>'
};
document.addEventListener('DOMContentLoaded',()=>{
 const modal=document.createElement('dialog');modal.className='screen-tutorial';modal.setAttribute('aria-labelledby','screen-title');modal.innerHTML='<header><div><small>介面快照示範 · 不會更改資料</small><h2 id="screen-title"></h2></div><button data-action="close" aria-label="關閉教學">關閉 ×</button></header><p class="screen-purpose"></p><div class="screen-view"><iframe title="操作示範介面" sandbox="allow-same-origin" tabindex="-1"></iframe><div class="screen-ring"></div><div class="screen-pointer">↖<span>點呢度</span></div></div><div class="screen-caption" aria-live="polite"></div><footer><span class="screen-counter"></span><button data-action="prev">上一步</button><button data-action="play">暫停</button><button data-action="next">下一步</button><button data-action="replay">重播</button></footer>';document.body.append(modal);
 const q=s=>modal.querySelector(s),frame=q('iframe'),ring=q('.screen-ring'),pointer=q('.screen-pointer');let lessonId='',steps=[],index=0,timer=null,playing=false,origin=null,serial=0;
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function stop(){clearTimeout(timer);playing=false;q('[data-action="play"]').textContent=index===steps.length-1?'重播':'播放';}
 function schedule(){clearTimeout(timer);if(playing)timer=setTimeout(()=>{if(index<steps.length-1){index++;render();}else stop();},6500);}
 function locate(){const d=frame.contentDocument,t=d?.querySelector('[data-screen-target]');if(!t)return;const b=t.getBoundingClientRect(),w=frame.clientWidth,h=frame.clientHeight;ring.style.cssText=`left:${Math.max(3,b.left-5)}px;top:${Math.max(3,b.top-5)}px;width:${Math.min(w-8,b.width+10)}px;height:${Math.min(h-8,b.height+10)}px`;pointer.style.left=Math.max(8,Math.min(w-115,b.left+b.width/2))+'px';pointer.style.top=Math.max(10,Math.min(h-45,b.bottom+10))+'px';ring.hidden=pointer.hidden=false;pointer.querySelector('span').textContent=/^(BUTTON|INPUT|SELECT)$/.test(t.tagName)?'點呢度':'睇呢度';pointer.classList.remove('clicking');void pointer.offsetWidth;pointer.classList.add('clicking');}
 function render(){const seq=++serial,[selector,caption,value]=steps[index];ring.hidden=pointer.hidden=true;q('.screen-caption').textContent=caption;q('.screen-counter').textContent=(index+1)+' / '+steps.length;q('[data-action="prev"]').disabled=index===0;q('[data-action="next"]').disabled=index===steps.length-1;q('[data-action="play"]').textContent=playing?'暫停':'播放';
 const actual=document.querySelector(selector);if(!actual){q('.screen-caption').textContent=caption+'（請先產生相關結果，呢個位置先會出現。）';frame.srcdoc='<p>此功能尚未產生畫面。</p>';schedule();return;}
 let section=actual.closest('section,.betting-mode-content,.stats-controls,.workspace-tools,.backtest,.latest-draw')||actual.parentElement;if(section===document.body)section=actual;
 const copy=section.cloneNode(true),originals=[section,...section.querySelectorAll('*')],clones=[copy,...copy.querySelectorAll('*')],target=clones[originals.indexOf(actual)];
 originals.forEach((node,i)=>{const c=clones[i];if(node.tagName==='INPUT'){c.setAttribute('value',node.value);if(node.checked)c.setAttribute('checked','');else c.removeAttribute('checked');}if(node.tagName==='SELECT')[...c.options].forEach((o,j)=>o.toggleAttribute('selected',node.options[j].selected));});
 for(const c of clones){for(const a of [...c.attributes])if(a.name.startsWith('on'))c.removeAttribute(a.name);if(['SCRIPT','IFRAME'].includes(c.tagName))c.remove();}
 target.setAttribute('data-screen-target','');
 // Keep earlier demo choices visible as the tutorial progresses, in the clone only.
 for(const [sel,,demo] of steps.slice(0,index+1)){if(demo===undefined)continue;const n=copy.matches(sel)?copy:copy.querySelector(sel);if(!n)continue;if(n.tagName==='SELECT')[...n.options].forEach(o=>o.toggleAttribute('selected',o.value===String(demo)));else if(n.type==='checkbox')n.toggleAttribute('checked',!!demo);else n.setAttribute('value',String(demo));}
 let demo=ScreenExamples[selector];if(selector==='#filtered-numbers'&&lessonId!=='pool-ticket')demo=screenBalls([1,4,7,10,13,16,19,22,25,28,31,34]);if(selector==='#random-6-numbers'&&lessonId!=='pool-ticket')demo='<div class="screen-example-row">第1注 '+screenBalls([1,4,7,10,16,19])+'</div><div class="screen-example-row">第2注 '+screenBalls([13,19,22,25,28,34])+'</div>';if(demo){target.innerHTML='<small class="screen-example-label">教學示例 · 非你的結果</small>'+demo;}else if(!target.textContent.trim()&&!['INPUT','SELECT','BUTTON'].includes(target.tagName)){target.innerHTML='<p style="padding:24px">完成上一步後，結果會出現喺呢度。</p>';}
 
 if(selector==='#filtered-numbers'){const size=copy.querySelector('#filter-count-select');if(size)[...size.options].forEach(o=>o.toggleAttribute('selected',o.value==='12'));}
 let a=target;while(a){a.hidden=false;a.classList.remove('hidden');a.style.display=a===target&&a.tagName==='INPUT'?'inline-block':'revert';if(a.tagName==='DETAILS')a.open=true;if(a===copy)break;a=a.parentElement;}
 copy.style.display='block';copy.style.margin='0';copy.style.width='100%';copy.style.maxWidth='none';
 const sheets=[...document.querySelectorAll('link[rel="stylesheet"]')].map(l=>'<link rel="stylesheet" href="'+escape(l.href)+'">').join('');
 frame.onload=()=>{if(seq!==serial||!modal.open)return;const t=frame.contentDocument.querySelector('[data-screen-target]');if(t){const b=t.getBoundingClientRect();frame.contentWindow.scrollTo({top:Math.max(0,b.top+frame.contentWindow.scrollY-(frame.clientHeight-Math.min(b.height,frame.clientHeight-50))/2),behavior:'instant'});locate();}schedule();};
 frame.srcdoc='<!doctype html><html lang="zh-Hant"><head><meta name="viewport" content="width=device-width,initial-scale=1">'+sheets+'<style>body{margin:0;padding:20px;background:#fafbfe;overflow:hidden;min-height:0}.tutorial-button,.ux-purpose{display:none!important}*{animation:none!important;transition:none!important}button,input,select{pointer-events:none}body>section{padding:16px} [data-screen-target]{opacity:1!important;outline:none!important} .tab-pane{display:block!important}.screen-example-label{display:block;color:#a3480b;background:#fff1d5;padding:6px 10px;margin-bottom:14px}.screen-example-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0}.screen-example-hit{outline:3px solid #d74225} [data-screen-target] .number-ball{display:inline-flex;margin:4px}</style></head><body>'+copy.outerHTML+'</body></html>';
 }
 window.openTutorial=(id,button)=>{stop();const topic=TutorialTopics.find(t=>t.id===id)||TutorialTopics[0];lessonId=id;steps=ScreenLessons[id]||ScreenLessons['site-intro'];index=0;origin=button;q('#screen-title').textContent=topic.title;q('.screen-purpose').textContent=topic.purpose;playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;modal.showModal();render();};
 modal.addEventListener('click',e=>{const a=e.target.dataset.action;if(a==='close')modal.close();if(a==='prev'||a==='next'){stop();index=Math.max(0,Math.min(steps.length-1,index+(a==='next'?1:-1)));render();}if(a==='replay'){index=0;playing=true;render();}if(a==='play'){if(playing)stop();else{if(index===steps.length-1)index=0;playing=true;render();}}});
 modal.addEventListener('close',()=>{stop();serial++;frame.srcdoc='';origin?.focus();});document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('resize',()=>{if(modal.open)render();});
});
