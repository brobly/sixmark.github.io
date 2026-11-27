/* Count the pre-draw ranks of winning numbers over chronological validation windows. */
const RankOccurrence=((engine,selection)=>{
 function settings(data,input){
  const s={validationStart:input.validationStart,validationEnd:input.validationEnd,lookback:input.lookback,mode:input.mode??'rank',short:input.short??10,target:input.target??'all'};
  if(!Array.isArray(data)||data.length<2)throw Error('至少需要2期開獎資料。');
  if(!Number.isInteger(s.validationStart)||!Number.isInteger(s.validationEnd)||s.validationStart<1||s.validationEnd<s.validationStart)throw Error('統計範圍須為由第1期起的整數，起點不可大於終點。');
  if(!Number.isInteger(s.lookback)||s.lookback<1||s.lookback>=data.length)throw Error(`每次排名資料須為1–${data.length-1}期的整數。`);
  if(s.validationEnd>data.length-s.lookback)throw Error(`每次用 ${s.lookback} 期較舊資料，統計範圍最遠可選至第 ${data.length-s.lookback} 期；之後沒有足夠較舊資料計排名。`);
  s.start=s.validationStart+1;s.end=s.validationStart+s.lookback;s.periods=s.validationEnd-s.validationStart+1;
  if(!['rank','rank_regular','blend'].includes(s.mode))throw Error('請選擇有效排名依據。');
  if(s.mode==='blend'&&(!Number.isInteger(s.short)||s.short<1||s.short>s.lookback))throw Error('混合短期期數須介乎1與每次排名資料期數之間。');
  if(!['all','regular','special'].includes(s.target))throw Error('請選擇有效統計對象。');
  return s;
 }
 function run(data,input){
  const s=settings(data,input);
  if(engine.audit(data).length)throw Error('開獎資料格式或日期排序有誤，請先檢查資料。');
  const rows=[];
  for(let offset=0;offset<s.periods;offset++){
   const start=s.start+offset,end=s.end+offset,draw=data[start-2];
   // Recompute before each target, using strictly older draws only.
   const ranks=selection.rankings(data.slice(start-1,end),{mode:s.mode,short:s.short});
   const winning=s.target==='special'?[draw.extra_number]:[...draw.numbers,...(s.target==='all'?[draw.extra_number]:[])];
   const row={period:start-1,draw:draw.draw_number,date:draw.draw_date,start,end,hot:[],cold:[]};
   for(const key of ['hot','cold'])for(const number of winning)row[key].push(ranks[key].indexOf(number)+1);
   rows.push(row);
  }
  return {settings:s,rows,...tally(rows)};
 }
 function tally(rows){
  const counts={hot:Array(50).fill(0),cold:Array(50).fill(0)};
  for(const row of rows)for(const key of ['hot','cold'])for(const rank of row[key])counts[key][rank]++;
  const board=key=>Array.from({length:49},(_,i)=>({rank:i+1,count:counts[key][i+1]})).sort((a,b)=>b.count-a.count||a.rank-b.rank).map((r,i)=>({...r,position:i+1}));
  return {observations:counts.hot.reduce((sum,n)=>sum+n,0),hot:board('hot'),cold:board('cold')};
 }
 function hotSelection(result,count){
  if(!result||!Array.isArray(result.hot)||result.hot.length!==49)throw Error('請先完成排名出現統計。');
  if(!Number.isInteger(count)||count<6||count>49)throw Error('請選擇榜首6–49個名次，對應揀號的目標號碼數。');
  const ranks=result.hot.slice(0,count).map(r=>r.rank),sorted=[...ranks].sort((a,b)=>a-b),segments=[];
  if(new Set(ranks).size!==count||ranks.some(r=>!Number.isInteger(r)||r<1||r>49))throw Error('統計名次無效，請重新統計。');
  for(let i=0;i<sorted.length;i++){
   const start=sorted[i];let end=start;
   while(sorted[i+1]===end+1)end=sorted[++i];
   segments.push(start===end?String(start):`${start}-${end}`);
  }
  return {count,ranks,hot:segments.join(',')};
 }
 return {settings,run,tally,hotSelection};
})(typeof module!=='undefined'?require('./core.js'):Engine,typeof module!=='undefined'?require('./selection.js'):Selection);
if(typeof module!=='undefined')module.exports=RankOccurrence;
