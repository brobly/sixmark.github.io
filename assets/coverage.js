/* Historical outcomes of the displayed tickets, never an estimate of future odds. */
const Coverage = ((engine) => {
 const prizeNames=['頭獎','二獎','三獎','四獎','五獎','六獎','七獎'];
 const multiModes=['paired','smart','smartComplex','mandel','fiveBankerFullMeal'];
 function legacyBankerMatches(info){
  if(info.mode!=='fiveBankerFullMeal'||!engine.validNumbers(info.bankers,5,5)||!engine.validNumbers(info.runners,1)||info.bankers.some(n=>info.runners.includes(n))||!Array.isArray(info.bets)||info.bets.length!==info.runners.length)return false;
  const keys=new Set(info.bets.map(b=>engine.validNumbers(b?.numbers,6,6)?[...b.numbers].sort((a,b)=>a-b).join(','):''));
  return info.runners.every(n=>keys.has([...info.bankers,n].sort((a,b)=>a-b).join(',')));
 }
 // Preserve individual groups and fixed bankers; a union of pools is not the original bet.
 function toBet(drawn,info){
  if(!info){if(engine.validNumbers(drawn,6,6))return {mode:'complex',numbers:[...drawn]};throw Error('這筆記錄沒有完整的下注模式及注碼。');}
  if(info.error||info.mode==='unavailable')throw Error('這筆記錄尚未生成可核對的注碼。');
  let bet;
  if((info.mode==='single'||info.mode==='complex')&&info.bets!==undefined){
   if(!Array.isArray(info.bets)||!info.bets.length||!info.bets.every(b=>engine.validNumbers(b?.numbers,6,info.mode==='single'?6:49)))throw Error('保存的逐組注碼不完整。');
   bet={mode:'groups',sourceMode:info.mode,groups:info.bets.map(b=>({mode:'complex',numbers:[...b.numbers]}))};
  }else if(info.mode==='single'||info.mode==='complex'){
   if(!engine.validNumbers(drawn,6,info.mode==='single'?6:49))throw Error('保存的抽號結果不完整。');
   bet={mode:'complex',numbers:[...drawn]};
  }else if(info.mode==='banker'||legacyBankerMatches(info)){
   if(!engine.validNumbers(info.bankers,1,5)||!engine.validNumbers(info.runners,6-info.bankers.length)||info.bankers.some(n=>info.runners.includes(n)))throw Error('保存的膽碼或腳碼無效。');
   bet={mode:'banker',bankers:[...info.bankers],numbers:[...info.runners]};
  }else if(multiModes.includes(info.mode)){
   const emptyMandel=info.mode==='mandel'&&info.filterInfo?.advanced&&info.filterInfo.retainedCount===0;
   if(!Array.isArray(info.bets)||(!info.bets.length&&!emptyMandel)||!info.bets.every(b=>engine.validNumbers(b?.numbers,6,['smartComplex','complex'].includes(info.mode)?49:6)))throw Error('保存的逐組注碼不完整。');
   if(info.mode==='mandel')bet={mode:'mandel',numbers:[...(info.selectedNumbers||drawn)],bets:info.bets.map(b=>[...b.numbers]),filterInfo:info.filterInfo||null};
   else bet={mode:'groups',sourceMode:info.mode,groups:info.bets.map(b=>({mode:'complex',numbers:[...b.numbers]}))};
  }else throw Error('無法識別這筆記錄的下注模式。');
  if(info.randomBet){
   if(!engine.validNumbers(info.randomBet,6,6))throw Error('保存的額外隨機注無效。');
   if(bet.mode!=='groups')bet={mode:'groups',sourceMode:info.mode,groups:[bet]};
   bet.hasRandomBet=true;bet.groups.push({mode:'complex',numbers:[...info.randomBet]});
  }
  if(bet.mode==='groups')bet.numbers=[...new Set(bet.groups.flatMap(g=>[...g.numbers,...(g.bankers||[])]))].sort((a,b)=>a-b);
  return bet;
 }
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
   if(info.mode==='banker'){
    try{const b=toBet(drawn,{...info,randomBet:undefined}),all=[...b.bankers,...b.numbers];groups.push({label:'膽拖',numbers:[...b.numbers],bankers:[...b.bankers],matched:all.filter(n=>draw.numbers.includes(n)),extra:all.includes(draw.extra_number),counts:engine.evaluate(b,draw),total:engine.total(b)});}catch{unavailable=true;}
   }else if(multiModes.includes(info.mode)||(['single','complex'].includes(info.mode)&&info.bets!==undefined)){
    if(!Array.isArray(info.bets)||(!info.bets.length&&!(info.mode==='mandel'&&info.filterInfo?.advanced&&info.filterInfo.retainedCount===0)))unavailable=true;
    else info.bets.forEach((b,i)=>add(b?.numbers,`第 ${i+1} 組`,6,['smartComplex','complex'].includes(info.mode)?49:6));
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
   <details open><summary>逐組號碼及核對結果（${r.groups.length} 組）</summary><div class="table-scroll"><table class="results-table"><thead><tr><th>組別／號碼</th><th>命中正選</th><th>特別號</th><th>等值注數</th><th>獎項注數</th></tr></thead><tbody>${r.groups.map(g=>`<tr><td>${g.label}<br>${g.bankers?'膽：'+g.bankers.join('、')+'<br>腳：':''}${g.numbers.join('、')}${!g.bankers&&g.numbers.length>6?`<br>複式 ${g.numbers.length} 碼`:''}</td><td>${g.matched.length} 個<br>${g.matched.join('、')||'無'}</td><td>${g.extra?'有':'無'}</td><td>${g.total.toLocaleString()}</td><td>${awards(g.counts)}</td></tr>`).join('')}</tbody></table></div></details>
   <p class="muted">複式按全部六碼組合計算；各組重複注碼按重複投注計。成本以全注模擬，沒有估算派彩金額。複式的「命中正選」是該組號碼覆蓋數，獎項另按每注六碼核對。</p>`:info?.mode==='mandel'&&info.filterInfo?.advanced&&info.filterInfo.retainedCount===0?'<p>濃縮注碼已全部剔除：0 注，成本 $0。</p>':'<p>尚無可核對的實際注碼。</p>'}
   <details><summary>條件覆蓋公式的適用範圍</summary><p>從 N 碼均勻隨機選六碼，包含指定 k 碼的機率為 C(N−k, 6−k) ÷ C(N, 6)，前提是 N ≥ 6、0 ≤ k ≤ 6。這只描述指定號碼的抽取事件，不是中獎率，也不適用於保留搭配等受限制的抽號方式。正選與特別號分開呈現，不要求一注六碼同時包含七個開獎號碼。</p></details></div>`;
 }
 return {analyze,render,toBet};
})(typeof module!=='undefined'?require('./core.js'):Engine);
if(typeof module!=='undefined')module.exports=Coverage;

function updateHistoricalCoverage(startPeriod,pool,drawn=[],info=null){
 const numbers=document.getElementById('previous-period-numbers');
 const period=document.getElementById('previous-period-info');
 let verificationDraw=null;
 if(!Number.isInteger(startPeriod)||startPeriod<2||startPeriod>lotteryData.length){
  period.textContent='';
  numbers.innerHTML='<span class="hf-text--muted">目前選號範圍之前沒有較新一期開獎資料可驗證。</span>';
 }else{
  const draw=lotteryData[startPeriod-2];
  verificationDraw=draw;
  period.textContent=`${draw.draw_number} · ${draw.draw_date}`;
  numbers.innerHTML=draw.numbers.map(n=>`<span class="hf-ball hf-ball--md ${pool.includes(n)?'hf-ball--primary-glow':'hf-ball--success'}" aria-label="正選 ${n}${pool.includes(n)?'，候選號碼命中':''}">${n}</span>`).join('')+`<span class="hf-separator">+</span><span class="hf-ball hf-ball--md ${pool.includes(draw.extra_number)?'hf-ball--warning-glow':'hf-ball--warning'}" aria-label="特別號 ${draw.extra_number}${pool.includes(draw.extra_number)?'，候選號碼命中':''}">${draw.extra_number}</span>`;
 }
 return updateSelectionOdds(pool,drawn,info,verificationDraw);
}
