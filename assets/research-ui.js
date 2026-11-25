let researchBusy=false,researchRenderVersion=0;
const researchControls=['research-train','research-short','research-horizon','research-bet-mode','research-tickets'];
function researchLedger(){
 const raw=Store.rawGet('sixmark.v2.research');if(raw===null)return {version:1,plans:[]};
 let ledger;try{ledger=JSON.parse(raw);}catch{throw Error('研究記錄無法讀取，請保留原有備份；暫停新增及匯入。');}
 if(!Research.valid(ledger))throw Error('研究記錄格式損壞，請保留原有備份；暫停新增及匯入。');return ledger;
}
function researchSettings(){return {goal:'pool_hit3',count:10,train:Number($('research-train').value),short:Number($('research-short').value),horizon:Number($('research-horizon').value),betMode:$('research-bet-mode').value,tickets:$('research-bet-mode').value==='mandel'?56:Number($('research-tickets').value)};}
function selectedResearchPlan(){return researchLedger().plans.find(p=>p.id===$('research-plan').value);}
function researchBudgetLabel(s){return s.betMode==='mandel'?'Mandel 標準濃縮 · 56 注':`固定種子抽注 · ${s.tickets} 注`;
}
function updateResearchDraft(){
 try{
  const p=selectedResearchPlan(),s=p?.settings||researchSettings();
  researchControls.forEach(id=>{$(id).disabled=!!p||researchBusy;});
  $('research-tickets').disabled=!!p||researchBusy||s.betMode==='mandel';
  if(s.betMode==='mandel')$('research-tickets').value='56';
  if(!Research.validSettings(s)){$('research-draft-summary').textContent='請設定選號 1–500 期、有效短期、評估 20–500 期及每組 1–210 注。';return;}
  const recent=(.5+.5*s.short/s.train)*100;
  $('research-draft-summary').textContent=`三種方法各選 10 碼，使用之前 ${s.train} 期；混合短期 ${s.short} 期（最近 ${s.short} 期合計權重 ${recent.toFixed(1)}%）。${researchBudgetLabel(s)}，每方法每期模擬成本 $${s.tickets*10}。評估其後連續 ${s.horizon} 期；漏存亦佔評估期數，不順延。`;
 }catch(e){$('research-status').textContent=e.message;}
}
async function renderResearch(preferred){
 const version=++researchRenderVersion;
 try{
  const ledger=researchLedger(),selector=$('research-plan'),choice=preferred??(version===1?'':selector.value);
  selector.innerHTML='<option value="new">建立新方案</option>'+ledger.plans.map((p,i)=>`<option value="${p.id}">方案 ${i+1} · ${p.start.draw} 之後 · ${p.settings.horizon} 期</option>`).join('');
  selector.value=choice==='new'?'new':ledger.plans.some(p=>p.id===choice)?choice:ledger.plans.at(-1)?.id||'new';
  const p=ledger.plans.find(p=>p.id===selector.value);
  if(p){$('research-train').value=String(p.settings.train);$('research-short').value=String(p.settings.short);$('research-horizon').value=String(p.settings.horizon);$('research-bet-mode').value=p.settings.betMode;$('research-tickets').value=String(p.settings.tickets);}
  updateResearchDraft();
  const active=ledger.plans.find(x=>x.buildHash===ResearchBuild.sha256&&!Research.timeline(x,lotteryData).complete);
  $('research-create').hidden=!!p;$('research-create').disabled=!!active||researchBusy;
  $('research-lock').hidden=!p;$('research-lock').disabled=!p||researchBusy;
  $('research-export').disabled=!ledger.plans.length;$('research-csv').disabled=!p;
  if(!p){$('research-results').innerHTML=active?'<p class="research-notice">已有未完成方案，請從上方選單繼續。規則在開始後固定，完成預定期數後才建立下一方案。</p>':'<p class="empty-state">設定好期數及注數後，按「鎖定方案及首期選號」。三組號碼和全部注碼會一併保存。</p>';return;}
  $('research-results').innerHTML='<p>正在按已保存注碼核對…</p>';
  const a=await Research.analyze(p,lotteryData);if(version!==researchRenderVersion)return;
  const latest=lotteryData[0],locked=p.rounds.some(r=>r.anchor.draw===latest.draw_number&&r.anchor.date===latest.draw_date),sameBuild=p.buildHash===ResearchBuild.sha256;
  $('research-lock').disabled=researchBusy||!!a.problem||a.complete||locked||!sameBuild;
  $('research-lock').textContent=locked?'本期已鎖定，等待新資料':'保存下一期三組選號及注碼';
  const pct=n=>(100*n).toFixed(2)+'%',interval=x=>x?x.map(pct).join('–'):'—';
  const statuses={settled:'有效前瞻',missing:'漏存，不能補選',late:'同日／較後保存，不計前瞻',changed:'資料／記錄變更，暫不計入'};
  const baseline=Selection.baseline(10);
  const progress=a.complete?`已到預定 ${p.settings.horizon} 期；此方案停止新增。`:`階段記錄：已經過 ${a.elapsed} / ${p.settings.horizon} 期，仍在收集。`;
  const summary=a.problem?`<p class="research-notice">${escapeText(a.problem)}</p>`:`<p><strong>${progress}</strong> 三種方法共同有效 ${a.eligible} 期；漏存 ${a.missing} 期、同日／較後保存 ${a.late} 期、資料變更 ${a.changed} 期。</p>
   <div class="table-scroll"><table class="results-table"><caption>主要指標固定：10 碼池中至少 3 個正選</caption><thead><tr><th>固定方法</th><th>中≥3碼／有效期數</th><th>命中比例</th><th>約 95% 區間</th><th>較純排名差距</th></tr></thead><tbody>${a.groups.map((g,i)=>`<tr><td>${escapeText(Selection.labels[g.mode])}${i===0?'（基準）':''}</td><td>${g.summary.hit3} / ${g.summary.draws}</td><td>${g.summary.draws?pct(g.summary.hit3/g.summary.draws):'—'}</td><td>${interval(g.interval)}</td><td>${!i?'基準':g.difference===null?'—':`${g.difference>0?'+':''}${(100*g.difference).toFixed(2)} 個百分點<br>只此法達標 ${g.better} 期／只基準達標 ${g.worse} 期`}</td></tr>`).join('')}</tbody></table></div>
   <p class="muted">公平獨立抽樣下，同樣 10 碼中≥3碼的理論比例為 ${pct(baseline.hit3)}。區間為單一方法的 Wilson 近似區間，未作多重比較或連續查看修正；不能用區間重疊判斷方法差異。未到期僅屬階段記錄；到期亦不自動宣布勝出。${a.missing+a.late+a.changed?'有未納入期數，完整性不足，結果可能受選擇偏差影響。':''}</p>
   <details><summary>次要指標：平均命中、四碼、實際注碼中獎及成本</summary><div class="table-scroll"><table class="results-table"><thead><tr><th>方法</th><th>平均正選</th><th>中≥4碼期數</th><th>有中獎注碼期數</th><th>共同有效期成本</th><th>各獎中獎注數</th></tr></thead><tbody>${a.groups.map(g=>`<tr><td>${escapeText(Selection.labels[g.mode])}</td><td>${g.summary.draws?g.summary.mean.toFixed(3):'—'}</td><td>${g.summary.hit4} / ${g.summary.draws}</td><td>${g.wins} / ${g.summary.draws}</td><td>${money(g.cost)}</td><td>${g.counts.map((n,i)=>`${names[i]}×${n}`).join('　')}</td></tr>`).join('')}</tbody></table></div><p class="muted">成本為模擬全注成本；獎項按保存的每一注核對，沒有使用固定派彩估算盈利。三種方法在同一期使用相同注數和抽注位置，固定種子抽注不保證三碼覆蓋。</p></details>
   <details><summary>逐期完整性（最近 ${Math.min(20,a.rows.length)} 期；CSV 包含全部）</summary><div class="table-scroll"><table class="results-table"><thead><tr><th>核對期／開獎號碼</th><th>狀態</th><th>三組正選命中</th></tr></thead><tbody>${a.rows.slice(-20).reverse().map(row=>`<tr><td>${row.draw.draw_number} · ${row.draw.draw_date}<br>${row.draw.numbers.join('、')} ＋ ${row.draw.extra_number}</td><td>${statuses[row.status]}</td><td>${row.results?row.results.map((r,i)=>`${Selection.labels[Research.methods[i]]}：${r.hits}`).join('<br>'):'—'}</td></tr>`).join('')}</tbody></table></div></details>`;
  $('research-results').innerHTML=`<p class="research-notice">主指標、三種方法、期數與注數已鎖定。${sameBuild?'': '程式版本已改變，原方案只能核對及匯出；新版本請另建方案。'}</p>${summary}
   <details><summary>已鎖定號碼及完整注碼（最近 ${Math.min(5,p.rounds.length)} 筆）</summary>${p.rounds.slice(-5).reverse().map(r=>`<section class="research-snapshot"><h4>${r.anchor.draw} 之後緊接一期</h4><p>保存：${escapeText(r.createdAt)} · 每組 ${p.settings.tickets} 注／$${p.settings.tickets*10}</p>${r.entries.map(e=>`<details><summary>${escapeText(Selection.labels[e.mode])}：${e.numbers.join('、')}</summary><ol class="research-tickets">${e.bets.map(b=>`<li>${b.join('、')}</li>`).join('')}</ol></details>`).join('')}<details class="muted"><summary>重現資料</summary><p>選號資料：${r.trainingOldest.draw} 至 ${r.anchor.draw}<br>程式 SHA-256：${r.buildHash}<br>訓練資料 SHA-256：${r.trainingHash}<br>資料集 SHA-256：${r.dataHash}<br>抽注種子：${r.seed}<br>記錄 SHA-256：${r.contentHash}</p></details></section>`).join('')}</details>`;
 }catch(e){if(version===researchRenderVersion){$('research-status').textContent=e.message;$('research-lock').disabled=true;$('research-create').disabled=true;$('research-results').textContent='研究記錄未能核對；原資料沒有被清空。';}}
}
async function saveResearch(createNew=false){
 if(researchBusy)return;researchBusy=true;$('research-create').disabled=true;$('research-lock').disabled=true;$('research-status').textContent='正在建立並保存三組選號及全部注碼…';
 try{
  const before=Store.rawGet('sixmark.v2.research'),ledger=researchLedger(),data=JSON.parse(JSON.stringify(lotteryData));let plan;
  if(createNew){
   if(ledger.plans.some(p=>p.buildHash===ResearchBuild.sha256&&!Research.timeline(p,data).complete))throw Error('已有未完成方案，請繼續原定評估期數。');
   plan=await Research.create(data,researchSettings(),ResearchBuild.sha256);
  }else{const p=selectedResearchPlan();if(!p)throw Error('請先建立方案。');plan=await Research.append(p,data,ResearchBuild.sha256);}
  const merged=Research.merge(ledger,{version:1,plans:[plan]});
  if(Store.rawGet('sixmark.v2.research')!==before)throw Error('研究記錄已在另一個視窗更新，請重新查看後再保存。');
  if(!Store.set('research',merged))throw Error('瀏覽器未能保存；本次尚未鎖定，請先匯出備份及檢查空間。');
  $('research-status').textContent=`已鎖定三組 10 碼及各 ${plan.settings.tickets} 注，等待 ${data[0].draw_number} 之後緊接的一期。`;
  researchBusy=false;await renderResearch(plan.id);
 }catch(e){researchBusy=false;await renderResearch();$('research-status').textContent=e.message;}
}
function exportResearch(){try{download('sixmark-research.json',JSON.stringify(researchLedger()),'application/json');}catch(e){$('research-status').textContent=e.message;}}
async function importResearchFile(input){
 try{
  const file=input.files?.[0];if(!file)return;if(file.size>10000000)throw Error('備份檔過大。');
  const incoming=JSON.parse((await file.text()).replace(/^\uFEFF/,'')),merged=Research.merge(researchLedger(),incoming.research||incoming);
  if(!Store.set('research',merged))throw Error('未能儲存，尚未匯入。');await renderResearch(merged.plans.at(-1)?.id);$('research-status').textContent='研究備份已合併；原有規則及注碼不被覆寫。';
 }catch(e){$('research-status').textContent=e.message;}finally{input.value='';}
}
async function exportResearchCSV(){
 try{
  const p=selectedResearchPlan();if(!p)throw Error('請先選擇研究方案。');const a=await Research.analyze(p,lotteryData);if(a.problem)throw Error(a.problem);
  const rows=[['方案','主要指標','評估期數','訓練期數','短期','核對期','核對日期','開獎正選','特別號','狀態','方法','保存時間','號碼池','逐注號碼','正選命中','中特別號','成本',...names,'程式SHA256','訓練資料SHA256','抽注種子','記錄SHA256']];
  for(const row of a.rows)Research.methods.forEach((mode,i)=>{const r=row.record,e=r?.entries[i],v=row.results?.[i];rows.push([p.id,p.settings.goal,p.settings.horizon,p.settings.train,p.settings.short,row.draw.draw_number,row.draw.draw_date,row.draw.numbers.join(' '),row.draw.extra_number,row.status,Selection.labels[mode],r?.createdAt||'',e?.numbers.join(' ')||'',e?.bets.map(b=>b.join(' ')).join(' | ')||'',v?.hits??'',v?.extra??'',e?.cost??'',...(v?.counts||Array(7).fill('')),p.buildHash,r?.trainingHash||'',r?.seed||'',r?.contentHash||'']);});
  // Pending snapshots must also be exportable before their target draw exists.
  for(const r of p.rounds.filter(r=>!a.rows.some(row=>row.anchor.draw===r.anchor.draw&&row.anchor.date===r.anchor.date)))r.entries.forEach(e=>rows.push([p.id,p.settings.goal,p.settings.horizon,p.settings.train,p.settings.short,r.anchor.draw+' 之後','','','','pending',Selection.labels[e.mode],r.createdAt,e.numbers.join(' '),e.bets.map(b=>b.join(' ')).join(' | '),'','',e.cost,...Array(7).fill(''),p.buildHash,r.trainingHash,r.seed,r.contentHash]));
  download('前瞻研究逐期記錄.csv','\uFEFF'+rows.map(row=>row.map(value=>'"'+String(value).replace(/"/g,'""')+'"').join(',')).join('\n'),'text/csv');
 }catch(e){$('research-status').textContent=e.message;}
}
document.addEventListener('DOMContentLoaded',()=>{if($('research-panel'))renderResearch();});
