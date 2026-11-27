/* Full frequency ranking for one inclusive historical window. */
const FrequencyStudy=((selection)=>{
 function summarize(data,{start=1,end=100,includeExtra=true}={}){
  if(!Array.isArray(data)||!data.length)throw Error('目前沒有開獎資料。');
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end>data.length)throw Error(`請輸入有效整數範圍：1 ≤ 起點 ≤ 終點 ≤ ${data.length}。`);
  if(typeof includeExtra!=='boolean')throw Error('請選擇統計是否包含特別號。');
  const window=data.slice(start-1,end),counts=selection.frequencies(window,includeExtra);
  const ranks=selection.rankings(window,{mode:includeExtra?'rank':'rank_regular'});
  const rows=ranks.hot.map((number,i)=>({number,count:counts[number],hotRank:i+1,coldRank:49-i}));
  return {start,end,periods:window.length,includeExtra,newest:window[0],oldest:window.at(-1),rows,seen:rows.filter(r=>r.count>0).length};
 }
 function orderedRows(result,order='hot'){
  const key={hot:'hotRank',cold:'coldRank',number:'number'}[order]||'hotRank';
  return [...result.rows].sort((a,b)=>a[key]-b[key]);
 }
 return {summarize,orderedRows};
})(typeof module!=='undefined'?require('./selection.js'):Selection);
if(typeof module!=='undefined')module.exports=FrequencyStudy;
