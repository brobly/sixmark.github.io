/* Historical outcomes of the displayed tickets, never an estimate of future odds. */
const Coverage = ((engine) => {
 const prizeNames=['頭獎','二獎','三獎','四獎','五獎','六獎','七獎'];
 const multiModes=['paired','smart','smartComplex','mandel','fiveBankerFullMeal'];
 function analyze(draw,pool,drawn,info){
  if(!engine.validNumbers(pool))throw Error('號碼池無效');
  const matched=draw.numbers.filter(n=>pool.includes(n));
  const missing=draw.numbers.filter(n=>!pool.includes(n));
  const groups=[];let unavailable=false;
  const add=(numbers,label,min=6,max=6)=>{
   if(!engine.validNumbers(numbers,min,max)){unavailable=true;return;}
   const counts=engine.count(numbers,[],draw),total=engine.choose(numbers.length,6);
   groups.push({label,numbers:[...numbers],matched:numbers.filter(n=>draw.numbers.includes(n)),extra:numbers.includes(draw.extra_number),counts,total});
  };
  if(info&&!info.error){
   if(multiModes.includes(info.mode)){
    if(!Array.isArray(info.bets)||(!info.bets.length&&!(info.mode==='mandel'&&info.filterInfo?.advanced&&info.filterInfo.retainedCount===0)))unavailable=true;
    else info.bets.forEach((b,i)=>add(b?.numbers,`第 ${i+1} 組`,6,info.mode==='smartComplex'?49:6));
   }else if(info.mode==='single'||info.mode==='complex')add(drawn,'抽號結果',6,info.mode==='complex'?49:6);
   else unavailable=true;
   if(info.randomBet)add(info.randomBet,'額外隨機注');
  }else unavailable=true;
  const counts=prizeNames.map((_,i)=>groups.reduce((s,g)=>s+g.counts[i],0));
  const total=groups.reduce((s,g)=>s+g.total,0),wins=counts.reduce((s,n)=>s+n,0);
  return {matched,missing,extra:pool.includes(draw.extra_number),groups,counts,total,wins,cost:total*10,unavailable};
 }
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function render(draw,pool,drawn,info){
  const r=analyze(draw,pool,drawn,info);
  const awards=counts=>counts.map((n,i)=>n?`${prizeNames[i]} × ${n.toLocaleString()}`:'').filter(Boolean).join('、')||'未中獎';
  return `<div class="historical-coverage"><p><strong>核對期：${escape(draw.draw_number)} · ${escape(draw.draw_date)}</strong></p>
   <p>號碼池 ${pool.length} 碼：命中正選 <strong>${r.matched.length} / 6</strong>（${r.matched.join('、')||'無'}）；特別號 <strong>${r.extra?'有':'無'}</strong>。</p>
   <p>未覆蓋正選：${r.missing.join('、')||'無，六個正選全部在池內'}。</p>
   <p class="muted">池內有開獎號碼，不等於實際注碼有中獎。以下只核對本次顯示或歷史保存的注碼，不估算未來中獎率。</p>
   ${info?.mode==='mandel'&&info.filterInfo?.advanced?`<p>進階濃縮：原有 ${info.filterInfo.originalCount} 注，剔除 ${info.filterInfo.removedCount} 注，保留 ${info.filterInfo.retainedCount} 注；只核對保留注碼，原有五元組覆蓋保證不再適用。</p>`:''}
   <h4>實際注碼核對</h4>
   ${r.unavailable?'<p class="hf-text--muted">部分或全部注碼未生成、資料不足或格式無效；只核對以下可確認的注碼，不能視為完整結果。</p>':''}
   ${r.groups.length?`<p>已核對 <strong>${r.total.toLocaleString()} 注</strong>（六碼單式等值），中獎 <strong>${r.wins.toLocaleString()} 注</strong>；按每注 $10 計算成本 <strong>$${r.cost.toLocaleString()}</strong>。</p>
   <p><strong>各獎項：</strong>${awards(r.counts)}。</p>
   <details open><summary>逐組號碼及核對結果（${r.groups.length} 組）</summary><div class="table-scroll"><table class="results-table"><thead><tr><th>組別／號碼</th><th>命中正選</th><th>特別號</th><th>等值注數</th><th>獎項注數</th></tr></thead><tbody>${r.groups.map(g=>`<tr><td>${g.label}<br>${g.numbers.join('、')}${g.numbers.length>6?`<br>複式 ${g.numbers.length} 碼`:''}</td><td>${g.matched.length} 個<br>${g.matched.join('、')||'無'}</td><td>${g.extra?'有':'無'}</td><td>${g.total.toLocaleString()}</td><td>${awards(g.counts)}</td></tr>`).join('')}</tbody></table></div></details>
   <p class="muted">複式按全部六碼組合計算；各組重複注碼按重複投注計。成本以全注模擬，沒有估算派彩金額。複式的「命中正選」是該組號碼覆蓋數，獎項另按每注六碼核對。</p>`:info?.mode==='mandel'&&info.filterInfo?.advanced&&info.filterInfo.retainedCount===0?'<p>濃縮注碼已全部剔除：0 注，成本 $0。</p>':'<p>尚無可核對的實際注碼。</p>'}
   <details><summary>條件覆蓋公式的適用範圍</summary><p>從 N 碼均勻隨機選六碼，包含指定 k 碼的機率為 C(N−k, 6−k) ÷ C(N, 6)，前提是 N ≥ 6、0 ≤ k ≤ 6。這只描述指定號碼的抽取事件，不是中獎率，也不適用於保留搭配等受限制的抽號方式。正選與特別號分開呈現，不要求一注六碼同時包含七個開獎號碼。</p></details></div>`;
 }
 return {analyze,render};
})(typeof module!=='undefined'?require('./core.js'):Engine);
if(typeof module!=='undefined')module.exports=Coverage;

function updateHistoricalCoverage(startPeriod,pool,drawn=[],info=null){
 const target=document.getElementById('probability-info');
 const balls=document.getElementById('previous-period-numbers');
 if(!Number.isInteger(startPeriod)||startPeriod<2||startPeriod>lotteryData.length){
  balls.innerHTML='<span class="hf-text--muted">無驗證期（較新一期）</span>';
  target.innerHTML='<p class="hf-text--muted">目前範圍沒有較新一期可核對；新增下一期資料後才可核對。</p>';return;
 }
 const draw=lotteryData[startPeriod-2];
 balls.innerHTML=draw.numbers.map(n=>`<span class="hf-ball hf-ball--md ${pool.includes(n)?'hf-ball--primary-glow':'hf-ball--success'}">${n}</span>`).join('')+`<span class="hf-separator">+</span><span class="hf-ball hf-ball--md ${pool.includes(draw.extra_number)?'hf-ball--warning-glow':'hf-ball--warning'}">${draw.extra_number}</span>`;
 target.innerHTML=Coverage.render(draw,pool,drawn,info);
}
