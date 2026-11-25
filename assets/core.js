/* Pure calculation functions, shared by UI and regression tests. */
const Engine = (() => {
 const keys=['first','second','third','fourth','fifth','sixth','seventh'];
 const defaults=[8000000,1000000,56000,9600,640,320,40];
 function choose(n,k){if(k<0||n<0||k>n)return 0;let v=1;for(let i=1;i<=Math.min(k,n-k);i++)v=v*(n-i+1)/i;return Math.round(v);}
 function prize(m,e){return m===6?0:m===5?(e?1:2):m===4?(e?3:4):m===3?(e?5:6):-1;}
 function validNumbers(a,min=0,max=49){return Array.isArray(a)&&a.length>=min&&a.length<=max&&new Set(a).size===a.length&&a.every(n=>Number.isInteger(n)&&n>=1&&n<=49);}
 function count(pool,bankers,draw){
  const out=Array(7).fill(0), need=6-bankers.length;
  const bm=bankers.filter(n=>draw.numbers.includes(n)).length, be=bankers.includes(draw.extra_number)?1:0;
  const m=pool.filter(n=>draw.numbers.includes(n)).length,e=pool.includes(draw.extra_number)?1:0,o=pool.length-m-e;
  for(let a=0;a<=6;a++)for(let b=0;b<=1;b++){const p=prize(a+bm,b+be);if(p>=0)out[p]+=choose(m,a)*choose(e,b)*choose(o,need-a-b);}
  return out;
 }
 function evaluate(bet,draw){if(bet.mode==='groups')return bet.groups.reduce((out,g)=>{evaluate(g,draw).forEach((n,i)=>out[i]+=n);return out;},Array(7).fill(0));if(bet.mode==='mandel'){const out=Array(7).fill(0);for(const nums of bet.bets){const p=prize(nums.filter(n=>draw.numbers.includes(n)).length,nums.includes(draw.extra_number));if(p>=0)out[p]++;}return out;}return count(bet.numbers,bet.bankers||[],draw);}
 function total(bet){return bet.mode==='groups'?bet.groups.reduce((n,g)=>n+total(g),0):bet.mode==='mandel'?bet.bets.length:choose(bet.numbers.length,6-(bet.bankers||[]).length);}
 function audit(rows){
  if(!Array.isArray(rows)||!rows.length)return ['沒有有效開獎資料'];
  const issues=[],seen=new Set();
  rows.forEach((d,i)=>{
   if(!d||typeof d!=='object'){issues.push(`第 ${i+1} 筆資料無效`);return;}
   if(!Array.isArray(d.numbers)||!validNumbers([...d.numbers,d.extra_number],7,7))issues.push(`第 ${i+1} 筆號碼無效`);
   if(!/^\d{2}\/\d{3}$/.test(d.draw_number))issues.push(`第 ${i+1} 筆期號格式無效`);
   if(seen.has(d.draw_number))issues.push(`期號 ${d.draw_number} 重複，待核對來源`);seen.add(d.draw_number);
   const date=new Date(d.draw_date);
   if(!/^\d{4}-\d{2}-\d{2}$/.test(d.draw_date)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==d.draw_date)issues.push(`第 ${i+1} 筆日期無效`);
   if(i&&rows[i-1]&&d.draw_date>=rows[i-1].draw_date)issues.push('日期並非嚴格倒序');
  });
  return issues;
 }
 function rank(rows,n){const freq=Array(50).fill(0);rows.forEach(d=>[...d.numbers,d.extra_number].forEach(x=>freq[x]++));return Array.from({length:49},(_,i)=>i+1).sort((a,b)=>freq[b]-freq[a]||a-b).slice(0,n);}
 return {keys,defaults,choose,prize,validNumbers,count,evaluate,total,audit,rank};
})();
if(typeof module!=='undefined')module.exports=Engine;
function validRange(a,b){return Number.isInteger(a)&&Number.isInteger(b)&&a>=1&&a<=b&&b<=lotteryData.length;}
