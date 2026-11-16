function renderPairEvidence(result){
 const oldShortRecord=result.version!==2&&result.sample<30;
 const sampleNotice=oldShortRecord?'此為舊規則保存的記錄：少於30期時未啟用搭配。重新篩選即可套用現行規則，原有注碼不會自動更改。':result.sample<30?'樣本較少：已按所選 '+result.sample+' 期計算搭配，歷史關聯可能較不穩定。':'';
 const addedText=result.added.join('、')||(oldShortRecord?'舊規則未啟用':result.pairs.length?'未新增號碼；池內仍有合格搭配':'無符合門檻的新增搭配');
 const badge=nums=>nums.map(n=>`<span class="hf-ball hf-ball--md hf-ball--primary">${Number(n)}</span>`).join('');
 return `<div class="pair-evidence"><p><strong>最終 ${result.numbers.length} 碼</strong> ${badge(result.numbers)}</p><p>排名核心：${result.cores.join('、')}<br>搭配加入：${addedText}<br>排名補足：${result.fallback.join('、')||'無'}</p>${sampleNotice?`<p class="pair-sample-notice">${sampleNotice}</p>`:''}<p class="muted">${result.sample} 期，包含特別號。依所選期數計算，沒有30期限制。門檻：共現至少3次、各自出現至少5次且調整分數大於0。此分數描述歷史關聯，不是中獎機率。要讓搭配保留在同一注，請於下方抽號模式選「保留搭配」。</p>${result.pairs.length?`<details open><summary>符合門檻的搭配（${result.pairs.length} 對）</summary><div class="table-scroll"><table class="results-table"><thead><tr><th>搭配</th><th>共現／各自次數</th><th>基準次數</th><th>調整分數</th></tr></thead><tbody>${result.pairs.map(p=>`<tr><td>${p.a} ＋ ${p.b}</td><td>${p.observed} ／ ${p.freqA}、${p.freqB}</td><td>${p.expected.toFixed(2)}</td><td>${p.score.toFixed(2)}</td></tr>`).join('')}</tbody></table></div></details>`:`<p class="empty-state">${oldShortRecord?'此筆記錄按舊規則停用搭配。':'此區間無符合門檻的搭配，已按頻率補足。'}</p>`}<details><summary>評分怎樣計算</summary><p>基準次數 = A次數 × B次數 ÷ 期數 × 7/8；7/8 對應每期49選7的不放回抽樣修正。分數 =（共現 − 基準）÷ √(基準＋1) × 共現 ÷ (共現＋8)。這是固定的排序啟發式，並非顯著性檢定。所有核心候選搭配一起排序，避免按核心順序先到先得。</p></details></div>`;
}
function renderPairedBets(info){
 return `<p>${info.pairs?.length?'每注至少保留一對符合門檻的搭配。':'沒有符合門檻的搭配：本次按一般號碼池抽取。'}共 ${info.bets.length} 注，每期 $${info.bets.length*10}。</p>${info.requested>info.bets.length?'<p>可用不重複組合不足，已顯示實際注數。</p>':''}${info.relaxed?`<p class="muted">${info.relaxed} 注與其他注重複超過4碼；號碼池或搭配限制下已放寬重複目標。</p>`:''}<div class="smart-bets-container">${info.bets.map((b,i)=>`<div class="smart-bet-row"><strong>第${i+1}注</strong><div>${b.numbers.map(n=>`<span class="number-ball">${Number(n)}</span>`).join('')}</div></div>`).join('')}</div>${info.pairs?.length?`<details><summary>搭配採用次數</summary><p>${info.pairs.map(p=>`${Number(p.a)}＋${Number(p.b)}：${Number(p.used)} 注`).join(' ／ ')}</p></details>`:''}`;
}
function buildPairedDisplay(pool){
 const saved=window.currentPairResult;
 const matches=saved&&saved.numbers.length===pool.length&&saved.numbers.every(n=>pool.includes(n));
 const result=Pairing.tickets(pool,matches?saved.pairs:[],Number(document.getElementById('paired-count').value)||5);
 const info={mode:'paired',bets:result.bets.map(numbers=>({numbers})),pairs:result.usage,requested:result.requested,relaxed:result.relaxed};
 document.getElementById('draw-result-title').textContent=`保留搭配 · ${info.bets.length} 注`;
 return {displayHtml:renderPairedBets(info),drawnNumbers:[...new Set(result.bets.flat())].sort((a,b)=>a-b),drawModeInfo:info};
}
let pairComparisonRows=[];
async function comparePairStrategies(){
 const target=document.getElementById('pair-comparison-result'),button=document.getElementById('compare-pairs');
 pairComparisonRows=[];document.getElementById('export-pairs').disabled=true;
 const train=Number(document.getElementById('pair-train').value),periods=Number(document.getElementById('pair-periods').value),size=Number(document.getElementById('pair-size').value),count=Number(document.getElementById('pair-bets').value);
 if(!Number.isInteger(train)||train<1||!Number.isInteger(periods)||periods<20||train+periods>lotteryData.length||!Number.isInteger(size)||size<6||size>20||!Number.isInteger(count)||count<1||count>10||Engine.choose(size,6)<count){target.textContent='請設定至少1期訓練、20期驗證、6–20碼和1–10注；資料期數及可用組合必須足夠。';return;}
 button.disabled=true;pairComparisonRows=[];document.getElementById('export-pairs').disabled=true;
 const holdout=Math.max(10,Math.floor(periods*.25));
 try{
  const output=[];
  for(let i=0;i<periods;i++){
   output.push(...Pairing.comparePeriod(lotteryData,i,train,size,count,Engine).map(r=>({...r,segment:i<holdout?'最近保留段':'較早觀察段'})));
   if(i%8===0){target.textContent=`正在比較 ${i+1} / ${periods} 期…`;await new Promise(r=>setTimeout(r,0));}
  }
  pairComparisonRows=output;
  const table=segment=>{const all=output.filter(r=>r.segment===segment);return `<h4>${segment}（${segment==='最近保留段'?holdout:periods-holdout}期）</h4><div class="table-scroll"><table class="results-table"><thead><tr><th>方法</th><th>池平均命中正選</th><th>池中≥3正選</th><th>中獎注數／總注數</th><th>成本</th></tr></thead><tbody>${['rank','legacy','paired','random'].map(mode=>{const rows=all.filter(r=>r.mode===mode),hits=rows.reduce((s,r)=>s+r.poolHits,0),hit3=rows.filter(r=>r.poolHits>=3).length,wins=rows.reduce((s,r)=>s+r.wins,0),total=rows.reduce((s,r)=>s+r.bets.length,0);return `<tr><td>${Pairing.labels[mode]}</td><td>${(hits/rows.length).toFixed(3)}</td><td>${hit3}/${rows.length} (${(hit3/rows.length*100).toFixed(1)}%)</td><td>${wins}/${total}</td><td>$${(total*10).toLocaleString()}</td></tr>`;}).join('')}</tbody></table></div>`;};
  target.innerHTML=`<p>驗證 ${lotteryData[periods-1].draw_date} 至 ${lotteryData[0].draw_date}；每期以前 ${train} 期選 ${size} 碼，每法每期 ${count} 注（每注 $10）。</p>${train<30?'<p class="pair-sample-notice">樣本較少：已按所選訓練期數計算搭配，歷史關聯可能較不穩定。</p>':''}<p class="muted">舊搭配以相同最終碼數重現；新搭配採保留搭配抽號。其他方法使用相同減少重複的抽號程序。隨機基準為固定種子的單次可重現抽樣，會有抽樣波動。號碼池命中數不是單注中獎率。</p>${table('較早觀察段')}${table('最近保留段')}<p>請先固定參數，再用最近保留段評估；若反覆看結果再改參數，它便不能視為獨立驗證。表格不宣稱任何方法能提升未來中獎率。</p>`;
  document.getElementById('export-pairs').disabled=false;
 }catch(e){target.textContent='比較未完成：'+e.message;}finally{button.disabled=false;}
}
function exportPairComparison(){if(!pairComparisonRows.length)return;download('搭配策略比較.csv',['區段,方法,期號,日期,訓練最新日期,訓練最早日期,號碼池,每注號碼,池命中正選,中獎注數,成本',...pairComparisonRows.map(r=>[r.segment,Pairing.labels[r.mode],r.draw,r.date,r.trainingNewest,r.trainingOldest,r.pool.join(' '),r.bets.map(b=>b.join(' ')).join(' | '),r.poolHits,r.wins,r.bets.length*10].join(','))].join('\n'),'text/csv');}
document.addEventListener('DOMContentLoaded',()=>{
 const host=document.getElementById('pair-comparison');
 updateDrawModeUI(false);
 host.innerHTML='<h3>排名與搭配策略比較</h3><p>固定號碼池、注數及成本，以更早資料選號，再核對下一期。包含正選及特別號的歷史頻率。</p><div class="search-row"><label>訓練期數 <input id="pair-train" type="number" min="1" value="100"></label><label>驗證期數 <input id="pair-periods" type="number" min="20" value="120"></label><label>最終號碼數 <input id="pair-size" type="number" min="6" max="20" value="12"></label><label>每期注數 <input id="pair-bets" type="number" min="1" max="10" value="5"></label><button id="compare-pairs" onclick="comparePairStrategies()">比較四種方法</button><button id="export-pairs" onclick="exportPairComparison()" disabled>匯出比較 CSV</button></div><div id="pair-comparison-result" role="status" aria-live="polite"></div>';
 const saved=Store.get('workspace',{}).controls||{};
 for(const id of ['pair-train','pair-periods','pair-size','pair-bets'])if(saved[id]!==undefined)document.getElementById(id).value=String(saved[id]);
});
