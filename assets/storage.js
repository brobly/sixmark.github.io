const Store={
 get(key,fallback){try{const value=JSON.parse(localStorage.getItem('sixmark.v2.'+key));if(value===null||typeof value!==typeof fallback||(Array.isArray(fallback)!==Array.isArray(value)))return fallback;if(key==='sets')return value.filter(validSavedSet);if(key==='history')return value.filter(validHistoryItem);return value;}catch{return fallback;}},
 set(key,value){try{localStorage.setItem('sixmark.v2.'+key,JSON.stringify(value));return true;}catch{const el=document.getElementById('save-status');if(el)el.textContent='瀏覽器未能儲存，請匯出備份。';return false;}}
};
function safeNumbersParse(raw){try{const v=JSON.parse(raw);if(Engine.validNumbers(v,0,20))return v;if(v&&Engine.validNumbers(v.bankerNumbers,0,5)&&Engine.validNumbers(v.runnerNumbers)&&!v.bankerNumbers.some(n=>v.runnerNumbers.includes(n)))return v;}catch{}return [];}
function restorableControl(el){return el&&el.matches('input[id],select[id]')&&!['file','button','submit','reset','hidden'].includes(el.type)&&!['draw-search','stats-view-mode-switch'].includes(el.id);}
function captureControls(){return Object.fromEntries([...document.querySelectorAll('input[id],select[id]')].filter(restorableControl).map(el=>[el.id,el.type==='checkbox'?el.checked:el.value]));}
function restoreControls(values,scope=null){
 if(!values||typeof values!=='object'||Array.isArray(values))return;
 Object.entries(values).forEach(([id,value])=>{
  const el=document.getElementById(id);
  if(!restorableControl(el)||(scope&&!scope.contains(el)))return;
  if(el.type==='checkbox'){if(typeof value==='boolean')el.checked=value;return;}
  if(!['string','number'].includes(typeof value))return;
  if(el.tagName==='SELECT'&&![...el.options].some(o=>o.value===String(value)))return;
  el.value=String(value);
 });
 if(!scope&&Object.prototype.hasOwnProperty.call(values,'mandel-v-select')&&typeof syncMandelTarget==='function'){syncMandelTarget();updateMandelUI();}
}
function validMandelBets(pool,bets){
 if(!Engine.validNumbers(pool,7,18)||!Array.isArray(bets)||!bets.length||bets.length>Engine.choose(pool.length,6))return false;
 const tickets=new Set(),covered=new Set();
 for(const bet of bets){
  if(!Engine.validNumbers(bet,6,6)||!bet.every(n=>pool.includes(n)))return false;
  const sorted=[...bet].sort((a,b)=>a-b),key=sorted.join(',');
  if(tickets.has(key))return false;tickets.add(key);
  for(let i=0;i<6;i++)covered.add(sorted.filter((_,j)=>j!==i).join(','));
 }
 return covered.size===Engine.choose(pool.length,5);
}
function validMandelRecord(pool,bets,info){
 if(!info?.advanced)return validMandelBets(pool,bets);
 if(info.advanced!==true||info.version!==1||!Engine.validNumbers(pool,7,18)||!Array.isArray(bets))return false;
 if(!['originalCount','removedCount','retainedCount'].every(k=>Number.isInteger(info[k])&&info[k]>=0)||info.originalCount<1||info.originalCount>Engine.choose(pool.length,6)||info.retainedCount!==bets.length||info.removedCount+info.retainedCount!==info.originalCount)return false;
 const seen=new Set();
 return bets.every(b=>{if(!Engine.validNumbers(b,6,6)||!b.every(n=>pool.includes(n))||[0,1,2,3,4].some(t=>b.filter(n=>Math.floor(n/10)===t).length>=4))return false;const key=[...b].sort((a,b)=>a-b).join(',');if(seen.has(key))return false;seen.add(key);return true;});
}
function validSavedSet(s){
 if(!s||typeof s!=='object'||typeof s.name!=='string')return false;
 if(s.mode==='complex')return Engine.validNumbers(s.numbers,6,20);
 if(s.mode==='banker')return Engine.validNumbers(s.bankers,1,5)&&Engine.validNumbers(s.numbers,6-s.bankers.length)&&!s.bankers.some(n=>s.numbers.includes(n));
 return s.mode==='mandel'&&validMandelRecord(s.numbers,s.bets,s.filterInfo);
}
function validPairEvidence(p){
 return p&&['numbers','cores','added','fallback'].every(k=>Engine.validNumbers(p[k]))&&Number.isFinite(p.sample)&&Array.isArray(p.pairs)&&p.pairs.every(q=>q&&Engine.validNumbers([q.a,q.b],2,2)&&['observed','freqA','freqB','expected','score'].every(k=>Number.isFinite(q[k])));
}
function validHistoryItem(h){
 if(!h||!Engine.validNumbers(h.filteredNumbers)||!Engine.validNumbers(h.random6)||typeof h.timestamp!=='string'||/[<>]/.test(h.timestamp)||!Number.isInteger(h.startPeriod)||!Number.isInteger(h.endPeriod)||h.startPeriod<1||h.endPeriod<h.startPeriod||!Number.isFinite(h.maxFrequency)||!Number.isFinite(h.threshold))return false;
 if(h.selectionSettings){const s=h.selectionSettings;if(s.version!==1||!Object.hasOwn(Selection.labels,s.mode)||s.mode!==h.filterMode||s.count!==h.filteredNumbers.length||!Number.isInteger(s.train)||s.train!==h.endPeriod-h.startPeriod+1||!Number.isInteger(s.short)||s.short<1||s.short>s.train||typeof s.cold!=='boolean')return false;}
 if(h.pairing&&!validPairEvidence(h.pairing))return false;
 const d=h.drawModeInfo;if(!d)return true;
 if(!['single','complex','smart','smartComplex','paired','mandel','fiveBankerFullMeal','unavailable'].includes(d.mode))return false;
 if(d.bets!==undefined&&(!Array.isArray(d.bets)||!d.bets.every(b=>b&&Engine.validNumbers(b.numbers,6,d.mode==='smartComplex'?49:6))))return false;
 if(d.filterInfo?.advanced&&!validMandelRecord(d.selectedNumbers,d.bets?.map(b=>b.numbers),d.filterInfo))return false;
 if(d.randomBet!==undefined&&!Engine.validNumbers(d.randomBet,6,6))return false;
 if(['selectedNumbers','bankers','runners'].some(k=>d[k]!==undefined&&!Engine.validNumbers(d[k])))return false;
 if(['numbersPerBet','count','requested','relaxed'].some(k=>d[k]!==undefined&&!Number.isFinite(d[k])))return false;
 if(d.pairs!==undefined&&(!Array.isArray(d.pairs)||!d.pairs.every(p=>p&&Engine.validNumbers([p.a,p.b],2,2)&&Number.isFinite(p.used))))return false;
 return true;
}
Store.rawGet=key=>{try{return localStorage.getItem(key);}catch{return null;}};
Store.rawSet=(key,value)=>{try{localStorage.setItem(key,value);return true;}catch{return false;}};
