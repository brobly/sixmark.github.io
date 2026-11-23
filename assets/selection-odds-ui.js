let selectionOddsJob=null;
let candidateOddsCollapsed=false;
function toggleCandidateOdds(){
 candidateOddsCollapsed=!candidateOddsCollapsed;
 const content=document.getElementById('candidate-odds-content');
 const button=document.getElementById('candidate-odds-toggle');
 if(content)content.hidden=candidateOddsCollapsed;
 if(button){button.textContent=candidateOddsCollapsed?'展開':'收起';button.setAttribute('aria-expanded',String(!candidateOddsCollapsed));}
}
function oddsText(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function oddsPercent(p){if(p===0)return '0%';if(p===1)return '100%';return (p*100).toLocaleString('zh-HK',{minimumFractionDigits:2,maximumFractionDigits:p<.0001?8:6})+'%';}
function oddsCell(p){return `<strong>${oddsPercent(p)}</strong>${p>0&&p<1?`<small>約 ${Math.round(1/p).toLocaleString('zh-HK')} 分之 1</small>`:''}`;}
function renderCandidateOdds(pool){
 const result=SelectionOdds.pool(pool.length),states=result.states;
 const rows=[];
 for(let r=0;r<=5;r++)for(let e=0;e<=1;e++){
  const p=states.find(s=>s.regular===r&&s.extra===e).probability;
  rows.push(`<tr><th scope="row">中 ${r+e*.5} 個</th><td>${r} 個正選${e?'＋特別號':'，無特別號'}</td><td>${oddsCell(p)}</td></tr>`);
 }
 rows.push(`<tr><th scope="row">中 6 個</th><td>6 個正選（特別號有或無）</td><td>${oddsCell(states.filter(s=>s.regular===6).reduce((a,s)=>a+s.probability,0))}</td></tr>`);
 return `<section class="selection-odds"><div class="hf-probability-toolbar"><h4 data-taught="1">候選號碼命中概率</h4><button type="button" id="candidate-odds-toggle" class="hf-probability-toggle" onclick="toggleCandidateOdds()" aria-expanded="${!candidateOddsCollapsed}" aria-controls="candidate-odds-content">${candidateOddsCollapsed?'展開':'收起'}</button></div><div id="candidate-odds-content"${candidateOddsCollapsed?' hidden':''}><p><strong>${pool.length} / 49 個候選號碼</strong>；每期不重複抽出 6 個正選＋1 個特別號，共 7 個。</p><p>「.5」表示命中特別號。例如中 3.5 個＝3 個正選＋特別號。下表逐項計算恰好命中嘅情況。</p>
 <div class="odds-highlights"><div>中3個字或以上<small>至少3個正選，特別號不限</small>${oddsCell(result.hit3)}</div><div>中4個字或以上<small>至少4個正選，或3個正選＋特別號</small>${oddsCell(result.hit4)}</div></div>
 <div class="table-scroll"><table class="results-table odds-table"><thead><tr><th>命中</th><th>號碼組成</th><th>概率</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>
 <p>7 個開獎號碼全部在候選池：<strong>${oddsPercent(result.all7)}</strong>。</p>
 <details><summary>計算方式</summary><p>假設49個號碼公平、隨機、不重複開出。設候選碼數為 N、命中正選 r 個，P(r)＝C(N,r) × C(49−N,6−r) ÷ C(49,6)；其後中特別號的條件概率為 (N−r) ÷ 43，無特別號為 (43−N+r) ÷ 43。「中6個」合併特別號有、無兩種情況。</p></details></div></section>`;
}
function renderTicketOdds(result,bet,pool,info,verification=null){
 const labels=['6個正選','5個正選＋特別號','5個正選','4個正選＋特別號','4個正選','3個正選＋特別號','3個正選','中3個字或以上','中4個字或以上'];
 const names=[...SelectionOdds.names,'任何獎項','六獎或以上'];
 const total=Engine.total(bet),mode=info?.mode||'single';
 const verifiedState=verification?result.byPoolHits?.find(s=>s.regular===verification.regular&&s.extra===verification.extra):null;
 const verifiedTitle=verification?`候選池含${verification.regular}個正選${verification.extra?'＋特別號':'、無特別號'}時`:'按驗證期命中數';
 const verifiedLabel=verification?`${verification.regular} 個正選${verification.extra?'＋特別號':'，無特別號'}`:'';
 const modeName={single:'單式',complex:'複式',smart:'聰明組合',smartComplex:'聰明組合＋複式',paired:'保留搭配',banker:'膽拖',mandel:'Mandel 濃縮法',fiveBankerFullMeal:'5膽拖全餐'}[mode]||'已保存注碼';
 return `<h4 data-taught="1">抽號模式中獎概率 · ${modeName}</h4>
 <p>${info?.bets&&['single','complex'].includes(mode)?`${info.bets.length} 注${mode==='complex'?`複式，每注 ${info.count} 碼`:''}；`:''}共 <strong>${total.toLocaleString()} 注六碼單式等值</strong>${info?.randomBet?'（包含額外隨機注）':''}。</p>
 <p>按目前顯示嘅整批注碼計算<strong>至少一注中該獎</strong>嘅概率；複式包含所有六碼組合，各注重疊已合併計算。同一期可中多個獎，獎項列不可直接相加。</p>
 <p class="odds-verification-note" data-concise="1">${verification?`驗證期 ${oddsText(verification.drawNumber)} · ${oddsText(verification.date)}：目前 ${pool.length} 碼候選池包含 <strong>${verifiedLabel}</strong>。第一欄概率按呢個命中數作條件，計算所有同樣命中數嘅開獎組合。`:'目前沒有驗證期，第一欄概率暫未能計算。'}</p>
 <div class="table-scroll"><table class="results-table odds-table odds-ticket-table"><thead><tr><th>獎項／命中條件</th><th class="odds-verification-column">${verifiedTitle}</th><th>一般49碼開獎</th><th>7個開獎號碼全在候選池時</th></tr></thead><tbody>${names.map((name,i)=>`<tr><th scope="row">${name}<small>${labels[i]}</small></th><td class="odds-verification-column">${verifiedState?.probabilities?oddsCell(verifiedState.probabilities[i]):verification?'不適用':'暫無驗證期'}</td><td>${oddsCell(result.probabilities[i])}</td><td>${result.conditional?oddsCell(result.conditional[i]):'不適用'}</td></tr>`).join('')}</tbody></table></div>
 <p class="muted">${pool.length<7?'候選池只有6碼，無法包含全部7個開獎號碼，條件概率不適用。':`右欄假設6個正選及1個特別號全部在目前 ${pool.length} 碼候選池內，再計算已排注碼嘅中獎概率。`}</p>
 <details><summary>整批注碼計算方式</summary><p>一般開獎精確計算所有 C(49,6) × 43＝601,304,088 種正選與特別號結果。驗證期條件欄只計候選池命中正選個數、特別號有無均與驗證期相同的結果，再計算其中至少一注中該獎的比例。最右欄只計候選池內 C(${pool.length},6) × (${pool.length}−6) 種結果。每個結果逐獎項判斷有無至少一注中獎；相同注碼重複投注不會增加命中概率。</p></details>`;
}
async function updateSelectionOdds(pool,drawn=[],info=null,verificationDraw=null){
 if(selectionOddsJob){selectionOddsJob.cancelled=true;selectionOddsJob.worker?.terminate();}
 const job={cancelled:false};selectionOddsJob=job;
 const target=document.getElementById('probability-info');
 if(!Engine.validNumbers(pool,6,49)){target.textContent='請先選出6–49個候選號碼。';return;}
 const verification=verificationDraw?{regular:verificationDraw.numbers.filter(n=>pool.includes(n)).length,extra:Number(pool.includes(verificationDraw.extra_number)),drawNumber:verificationDraw.draw_number,date:verificationDraw.draw_date}:null;
 target.innerHTML=renderCandidateOdds(pool)+'<section id="selection-ticket-odds" class="selection-odds" aria-live="polite"></section>';
 const output=document.getElementById('selection-ticket-odds');
 let bet;
 try{if(!info&&drawn.length!==6)throw Error('請先生成注碼，即可查看各獎項概率。');bet=Coverage.toBet(drawn,info);}
 catch(error){output.textContent=error.message;return;}
 output.textContent='正在精確計算整批注碼嘅各獎項概率…';
 const finish=result=>{if(!job.cancelled)output.innerHTML=renderTicketOdds(result,bet,pool,info,verification);};
 const fallback=async()=>{
  const work=SelectionOdds.calculate(bet,pool);let step;
  while(!job.cancelled){const until=performance.now()+30;do{step=work.next();}while(!step.done&&performance.now()<until);if(step.done){finish(step.value);return;}await new Promise(resolve=>setTimeout(resolve,0));}
 };
 if(typeof Worker!=='undefined'){
  try{
   const worker=new Worker('assets/selection-odds-worker.js?v=20261123-pool-hit-odds');job.worker=worker;
   worker.onmessage=({data})=>{if(job.cancelled)return;if(data.result){worker.terminate();finish(data.result);}else if(data.error){worker.terminate();output.textContent=data.error;}else if(data.progress)output.textContent=`正在精確計算整批注碼…已核算 ${data.progress.visited.toLocaleString()} 類開獎組合。`;};
   worker.onerror=()=>{worker.terminate();if(!job.cancelled)fallback().catch(error=>{if(!job.cancelled)output.textContent=error.message;});};
   worker.postMessage({bet,pool});return;
  }catch{/* Direct file previews can deny workers; keep computation cancellable. */}
 }
 try{await fallback();}catch(error){if(!job.cancelled)output.textContent=error.message;}
}
