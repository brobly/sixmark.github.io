/* Compact range controls; serialized values keep existing saved settings readable. */
const RankRangesUI=(()=>{
 const states=new Map(),el=id=>document.getElementById(id);
 const label=side=>side==='hot'?'最熱':'最冷';
 const validRank=value=>/^\d+$/.test(value)&&Number(value)>=1&&Number(value)<=49;
 const reversed=part=>validRank(part.start)&&validRank(part.end)&&Number(part.start)>Number(part.end);
 function feedback(prefix,side,state){
  const host=el(`${prefix}-${side}-segments`),inputs=host.querySelectorAll?.('input')||[],repairs=host.querySelectorAll?.('.rank-range-single')||[];
  state.segments.forEach((part,i)=>{
   for(const [offset,key] of ['start','end'].entries())inputs[i*2+offset]?.setAttribute?.('aria-invalid',String(!validRank(part[key])||reversed(part)));
   if(repairs[i]){repairs[i].hidden=!reversed(part);repairs[i].textContent=`只選第${part.start}名`;}
  });
 }
 function decode(value){
  return String(value).replace(/[，、]/g,',').replace(/[–—－]/g,'-').split(',').slice(0,49).map(part=>{
   const m=part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
   return m?{start:m[1],end:m[2]??m[1]}:{start:'',end:''};
  });
 }
 function render(prefix,side,state){
  const host=el(`${prefix}-${side}-segments`),name=label(side),disabled=state.disabled?' disabled':'';
  const described=prefix==='filter'?'filter-balance-summary cold-hot-error':'rolling-balance-summary rolling-balance-error';
  host.innerHTML=state.segments.map((part,i)=>`<span class="rank-range-segment">
   <span>由</span><input type="number" min="1" max="49" step="1" value="${part.start}" aria-label="${name}第${i+1}段起始名次" aria-describedby="${described}" oninput="RankRangesUI.edit('${prefix}','${side}',${i},'start',this.value)"${disabled}>
   <span>至</span><input type="number" min="1" max="49" step="1" value="${part.end}" aria-label="${name}第${i+1}段結束名次" aria-describedby="${described}" oninput="RankRangesUI.edit('${prefix}','${side}',${i},'end',this.value)"${disabled}><span>名</span>
   <button type="button" class="rank-range-button" aria-label="刪除${name}第${i+1}段" title="刪除此範圍" onclick="RankRangesUI.remove('${prefix}','${side}',${i})"${state.disabled||state.segments.length===1?' disabled':''}>−</button>
   <button type="button" class="rank-range-single" aria-label="修正${name}第${i+1}段為單一名次" onclick="RankRangesUI.useSingle('${prefix}','${side}',${i})"${reversed(part)?'':' hidden'}${disabled}>只選第${part.start}名</button>
  </span>`).join('')+`<button type="button" class="rank-range-button rank-range-add" aria-label="增加${name}範圍" title="增加${name}範圍" onclick="RankRangesUI.add('${prefix}','${side}')"${state.disabled||state.segments.length>=49?' disabled':''}>＋</button>`;
  feedback(prefix,side,state);
 }
 function sync(prefix){
  for(const side of ['hot','cold']){
   const input=el(`${prefix}-${side}-ranges`),source=input.value,key=`${prefix}-${side}`;
   const disabled=side==='cold'&&!el(`${prefix}-include-cold`).checked;
   input.disabled=disabled;el(`${prefix}-${side}-segments`).hidden=disabled;
   let state=states.get(key);
   if(!state||state.source!==source||state.disabled!==disabled){
    state={source,disabled,segments:decode(source)};states.set(key,state);render(prefix,side,state);
   }
  }
  disclosure(prefix);
 }
 function disclosure(prefix){
  const editor=el(`${prefix}-rank-editor`),button=el(`${prefix}-rank-toggle`),summary=el(`${prefix}-rank-collapsed`);
  if(!editor||!button||!summary)return;
  const expanded=!editor.hidden;
  button.textContent=expanded?'收起':'展開';button.setAttribute?.('aria-expanded',String(expanded));
  summary.hidden=expanded;
  const hot=el(`${prefix}-hot-ranges`).value.trim(),cold=el(`${prefix}-cold-ranges`).value.trim();
  summary.textContent=`最熱：${hot?`第${hot.replaceAll(',','、')}名`:'未設定'}；最冷：${el(`${prefix}-include-cold`).checked?(cold?`第${cold.replaceAll(',','、')}名`:'未設定'):'不加入'}`;
 }
 function toggle(prefix){
  const editor=el(`${prefix}-rank-editor`);if(!editor)return;
  editor.hidden=!editor.hidden;disclosure(prefix);
 }
 function commit(prefix,side,state,redraw=false,focusIndex=0){
  state.source=state.segments.map(p=>p.start!==''&&p.start===p.end?p.start:`${p.start}-${p.end}`).join(',');
  el(`${prefix}-${side}-ranges`).value=state.source;
  const notice=el(`${prefix}-rank-transfer-status`);if(notice){notice.textContent='';notice.hidden=true;}
  if(redraw){
   render(prefix,side,state);
   el(`${prefix}-${side}-segments`).querySelectorAll('input')[focusIndex*2]?.focus();
  }
  feedback(prefix,side,state);
  if(prefix==='filter')updateBalanceRangeFeedback();else RollingStudyUI.changed();
 }
 function edit(prefix,side,index,key,value){
  const state=states.get(`${prefix}-${side}`);
  if(!state||state.disabled||!state.segments[index]||!['start','end'].includes(key))return;
  state.segments[index][key]=/^\d+$/.test(value)?value:'';
  commit(prefix,side,state);
 }
 function add(prefix,side){
  sync(prefix);const state=states.get(`${prefix}-${side}`);
  if(state.disabled||state.segments.length>=49)return;
  const used=new Set();
  for(const p of state.segments)for(let n=Math.max(1,Number(p.start));n<=Math.min(49,Number(p.end));n++)used.add(n);
  const after=Number(state.segments.at(-1).end)+1;
  const candidates=Array.from({length:49},(_,i)=>i+1);
  const rank=(after>=1&&after<=49&&!used.has(after)?after:candidates.find(n=>!used.has(n)))??49;
  state.segments.push({start:String(rank),end:String(rank)});
  commit(prefix,side,state,true,state.segments.length-1);
 }
 function remove(prefix,side,index){
  sync(prefix);const state=states.get(`${prefix}-${side}`);
  if(state.disabled||state.segments.length===1||!state.segments[index])return;
  state.segments.splice(index,1);commit(prefix,side,state,true,Math.min(index,state.segments.length-1));
 }
 function useSingle(prefix,side,index){
  sync(prefix);const state=states.get(`${prefix}-${side}`),part=state?.segments[index];
  if(!state||state.disabled||!part||!reversed(part))return;
  part.end=part.start;commit(prefix,side,state,true,index);
 }
 return {sync,edit,add,remove,useSingle,toggle};
})();
