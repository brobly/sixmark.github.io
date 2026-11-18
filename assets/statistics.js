        // ========================================
        // 高頻號碼篩選功能
        // ========================================
        
        let currentFilterContext = null;
        let currentMandelDrawPool = null;
        let currentFilteredNumbers = []; // 儲存當前篩選結果
        let statsBankerDraft = {bankers:[],runners:[]};
        let statsBankerRole = 'bankers';
        let statsBankerNotice = '';
        let filterHistory = Store.get('history', []); // 儲存篩選歷史記錄
        /** 排名模式專用：false = 頻率前 N 名，true = 頻率最低 N 個（固定總數） */
        let rankShowColdComplement = false;

        function updateRankColdToggleUI() {
            const modeSelect = document.getElementById('filter-mode-select');
            const countSelect = document.getElementById('filter-count-select');
            const btn = document.getElementById('rank-cold-toggle-btn');
            if (!modeSelect || !countSelect || !btn) return;

            const mode = modeSelect.value;
            const count = parseInt(countSelect.value, 10) || 6;

            if (mode !== 'rank') {
                btn.style.display = 'none';
                return;
            }

            btn.style.display = 'inline-block';
            const disable = count >= 49;
            btn.disabled = disable;
            btn.style.opacity = disable ? '0.5' : '1';
            btn.style.cursor = disable ? 'not-allowed' : 'pointer';
            btn.textContent = rankShowColdComplement ? '切換熱門' : '切換冷門';
        }

        function toggleRankColdComplement() {
            const mode = document.getElementById('filter-mode-select').value;
            if (mode !== 'rank') return;
            const count = parseInt(document.getElementById('filter-count-select').value, 10) || 6;
            if (count >= 49) return;
            rankShowColdComplement = !rankShowColdComplement;
            updateRankColdToggleUI();
            filterHighFrequencyNumbers();
        }
        
        // getRandom6 函數：從陣列中隨機抽取 6 個號碼
        function getRandom6(arr) {
            if (!Array.isArray(arr)) return [];
            if (arr.length < 6) return [];
            if (arr.length === 6) return [...arr]; // 如果少於等於6個，直接回傳全部

            const copy = [...arr]; // 複製一份，避免修改原陣列
            // Fisher-Yates 洗牌（從後往前）
            for (let i = copy.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [copy[i], copy[j]] = [copy[j], copy[i]];
            }
            return copy.slice(0, 6); // 取洗牌後的前6個
        }
        
        // 篩選高頻號碼主函數
        function filterHighFrequencyNumbers() {
            // 取得當前選擇的期數範圍
            const startPeriod = Number(document.getElementById('start-period').value);
            const endPeriod = Number(document.getElementById('end-period').value);

            if (!validRange(startPeriod, endPeriod)) {
                alert('請輸入有效整數範圍：1 ≤ 開始 ≤ 結束 ≤ 資料筆數。');
                return;
            }

            if (endPeriod > lotteryData.length) {
                alert(`結束期數不能超過資料範圍！目前最大期數為 ${lotteryData.length}`);
                return;
            }

            updateStatsWithRange(startPeriod,endPeriod);

            // 取得篩選模式
            const filterMode = document.getElementById('filter-mode-select').value;
            const filterCount = parseInt(document.getElementById('filter-count-select').value) || 6;

            if(!Number.isInteger(filterCount)||filterCount<6||filterCount>49){alert('請選擇6–49個號碼。');return;}
            const short=Number(document.getElementById('filter-short-periods').value);
            if(filterMode==='blend'&&(!Number.isInteger(short)||short<1||short>endPeriod-startPeriod+1)){alert('短期期數必須為正整數，且不可超過所選範圍期數。');return;}

            // 計算號碼統計
            const numberFreq = {};

            // 初始化1-49的頻率為0
            for (let i = 1; i <= 49; i++) {
                numberFreq[i] = 0;
            }

            // 計算選定範圍內的號碼頻率
            const startIndex = startPeriod - 1;
            const endIndex = endPeriod;
            const selectedData = lotteryData.slice(startIndex, endIndex);

            selectedData.forEach(row => {
                row.numbers.forEach(num => {
                    numberFreq[num]++;
                });
                // 特別號也計入統計
                numberFreq[row.extra_number]++;
            });

            // 找出出現次數最多的號碼次數
            let maxFrequency = 0;
            for (let num in numberFreq) {
                if (numberFreq[num] > maxFrequency) {
                    maxFrequency = numberFreq[num];
                }
            }

            // 計算門檻值（一半次數）
            const threshold = Math.max(1, Math.ceil(maxFrequency / 2));

            // 根據模式篩選號碼
            currentFilteredNumbers = [];
            window.currentPairResult = null;
            let modeDescription = '';

            if (['default','rank','rank_regular','blend'].includes(filterMode)) {
                try{currentFilteredNumbers=Selection.select(selectedData,{mode:filterMode,count:filterCount,short:Number(document.getElementById('filter-short-periods').value),cold:rankShowColdComplement});}
                catch(e){alert(e.message);return;}
                modeDescription=Selection.labels[filterMode]+(filterMode==='rank'&&rankShowColdComplement?' · 最低頻率':'')+` · 固定 ${filterCount} 碼`;
                if(filterMode==='blend')modeDescription+=` · 短期${document.getElementById('filter-short-periods').value}／長期${selectedData.length}期，各50%（視窗重疊：${Selection.blendWeightText(selectedData.length,Number(document.getElementById('filter-short-periods').value))}）`;
            } else if (filterMode === 'rank_with_pair') {
                const result = Pairing.select(selectedData, filterCount);
                currentFilteredNumbers = result.numbers;
                window.currentPairResult = result;
                modeDescription = `固定 ${filterCount} 碼（核心 ${result.cores.length}／搭配加入 ${result.added.length}／排名補足 ${result.fallback.length}）`;
            } else if (filterMode === 'cold_hot_balance') {
                // 冷熱平衡模式：從高頻和低頻號碼中各抽取一半
                // 將所有1-49號碼按頻率排序
                const allNumbers = [];
                for (let i = 1; i <= 49; i++) {
                    allNumbers.push({
                        number: i,
                        frequency: numberFreq[i] || 0
                    });
                }
                
                // 按頻率降序排序
                allNumbers.sort((a, b) => b.frequency - a.frequency);
                
                // 找出中位數頻率（用於區分高頻和低頻）
                const medianIndex = Math.floor(allNumbers.length / 2);
                const medianFrequency = allNumbers[medianIndex].frequency;
                
                // 分離高頻和低頻號碼
                const highFreqNumbers = allNumbers.filter(item => item.frequency > medianFrequency).map(item => item.number);
                const lowFreqNumbers = allNumbers.filter(item => item.frequency < medianFrequency).map(item => item.number);
                // 頻率等於中位數的號碼，一半歸高頻，一半歸低頻
                const medianFreqNumbers = allNumbers.filter(item => item.frequency === medianFrequency).map(item => item.number);
                const medianSplit = Math.floor(medianFreqNumbers.length / 2);
                highFreqNumbers.push(...medianFreqNumbers.slice(0, medianSplit));
                lowFreqNumbers.push(...medianFreqNumbers.slice(medianSplit));
                
                // 計算需要抽取的數量
                const isOdd = filterCount % 2 === 1;
                const highCount = isOdd ? Math.floor(filterCount / 2) + 1 : filterCount / 2;
                const lowCount = Math.floor(filterCount / 2);
                
                // 從高頻號碼中隨機抽取
                let selectedHigh = getRandomNumbers(highFreqNumbers, Math.min(highCount, highFreqNumbers.length));
                
                // 如果高頻號碼不夠，從低頻號碼中補足
                if (selectedHigh.length < highCount) {
                    const needFromLow = highCount - selectedHigh.length;
                    const availableLow = lowFreqNumbers.filter(n => !selectedHigh.includes(n));
                    const additionalFromLow = getRandomNumbers(availableLow, Math.min(needFromLow, availableLow.length));
                    selectedHigh = [...selectedHigh, ...additionalFromLow];
                }
                
                // 從低頻號碼中隨機抽取（排除已選的高頻號碼）
                const availableLow = lowFreqNumbers.filter(n => !selectedHigh.includes(n));
                const selectedLow = getRandomNumbers(availableLow, Math.min(lowCount, availableLow.length));
                
                // 合併結果並排序
                currentFilteredNumbers = [...selectedHigh, ...selectedLow];
                const rest = allNumbers.map(x=>x.number).filter(n=>!currentFilteredNumbers.includes(n));
                currentFilteredNumbers.push(...getRandomNumbers(rest, filterCount-currentFilteredNumbers.length));
                currentFilteredNumbers.sort((a,b)=>a-b);
                
                modeDescription = `冷熱平衡模式 - 選取 ${filterCount} 個號碼（高頻${selectedHigh.length}個 + 低頻${selectedLow.length}個）`;
            }

            const scoringFreq=Selection.frequencies(selectedData,filterMode!=='rank_regular');
            const unseen=currentFilteredNumbers.filter(n=>scoringFreq[n]===0).length;
            if(unseen)modeDescription+=` · ${unseen} 碼於此區間未出現，依同頻排序補滿固定總數`;

            // 保存頻率信息供其他功能使用
            window.currentNumberFreq = numberFreq;
            
            // 顯示結果
            displayFilterResults(startPeriod, endPeriod, maxFrequency, threshold, currentFilteredNumbers, filterMode, modeDescription);
            
            updateRankColdToggleUI();
        }

        // 計算組合數 C(n, k)
        function combination(n, k) {
            if (k > n || k < 0) return 0;
            if (k === 0 || k === n) return 1;
            if (k > n - k) k = n - k; // 優化：利用對稱性
            
            let result = 1;
            for (let i = 0; i < k; i++) {
                result = result * (n - i) / (i + 1);
            }
            return Math.round(result);
        }

        /** Existing Mandel display uses fixed illustrative amounts. */
        const MARK_SIX_PRIZE_AMOUNTS_SINGLE = Object.fromEntries(Engine.keys.map((k,i)=>[k,Engine.defaults[i]]));

        function summarizeSixNumberBetsVsDraw(bets, drawRow) {
            if (!drawRow || !Array.isArray(drawRow.numbers)) return null;
            const winningNumbers = [...drawRow.numbers].sort((a, b) => a - b);
            const extraNumber = drawRow.extra_number;
            const counts = { first: 0, second: 0, third: 0, fourth: 0, fifth: 0, sixth: 0, seventh: 0 };
            let total = 0;
            const amt = Object.fromEntries(Engine.keys.map((k,i)=>[k,amounts()[i]]));
            (bets || []).forEach(bet => {
                const combo = bet.numbers;
                if (!combo || combo.length !== 6) return;
                const mainMatches = combo.filter(num => winningNumbers.includes(num)).length;
                const extraMatch = combo.includes(extraNumber);
                let tier = null;
                if (mainMatches === 6) tier = 'first';
                else if (mainMatches === 5 && extraMatch) tier = 'second';
                else if (mainMatches === 5) tier = 'third';
                else if (mainMatches === 4 && extraMatch) tier = 'fourth';
                else if (mainMatches === 4) tier = 'fifth';
                else if (mainMatches === 3 && extraMatch) tier = 'sixth';
                else if (mainMatches === 3) tier = 'seventh';
                if (tier) {
                    counts[tier]++;
                    total += amt[tier];
                }
            });
            return { counts, total };
        }

        /**
         * Mandel 多注對「篩選起始期數的驗證期（較新一期）」開獎：各獎項注數 + 小計獎金
         * @param {Array<{numbers:number[]}>} bets
         * @param {number} startPeriod 篩選條件中的開始期數（與機率區「驗證期（較新一期）」一致）
         */
        function buildMandelPrizeSummaryHtml(bets, startPeriod, options) {
            const hist = options && options.history;
            const lineClass = 'hf-mandel-prize-line' + (hist ? ' hf-mandel-prize-line--history' : '');
            const sp = startPeriod != null ? startPeriod : (Number(document.getElementById('start-period').value));
            if (sp <= 1) {
                return `<div class="${lineClass}"><span class="hf-text--muted">📋 各獎中獎：（篩選由第1期起，無「驗證期（較新一期）」開獎可對獎）</span></div>`;
            }
            const pi = sp - 2;
            if (pi < 0 || pi >= lotteryData.length) {
                return `<div class="${lineClass}"><span class="hf-text--muted">📋 各獎中獎：（無法取得驗證期（較新一期）開獎）</span></div>`;
            }
            const summary = summarizeSixNumberBetsVsDraw(bets, lotteryData[pi]);
            if (!summary) {
                return `<div class="${lineClass}"><span class="hf-text--muted">📋 各獎中獎：（無法計算）</span></div>`;
            }
            const periodNo = pi + 1;
            const { counts, total } = summary;
            const parts = [
                `頭獎×${counts.first}`, `二獎×${counts.second}`, `三獎×${counts.third}`, `四獎×${counts.fourth}`,
                `五獎×${counts.fifth}`, `六獎×${counts.sixth}`, `七獎×${counts.seventh}`
            ];
            return `
                <div class="${lineClass}">
                    <div class="hf-mandel-prize-period">對驗證期（較新一期）開獎（第${periodNo}期）・共 ${bets.length} 注</div>
                    <div><strong>📋 各獎中獎：</strong>${parts.join('　')}　｜　<strong>估算獎金 $${total.toLocaleString()}</strong>（按設定金額，非當期實際派彩）</div>
                </div>`;
        }

        /**
         * 依「抽號模式」產生高頻區塊的抽號 HTML 與 drawModeInfo（含 Mandel、5膽拖等）。
         * 供 displayFilterResults 與 refreshRandom6 共用，避免 Mandel 等模式僅在重抽時才有畫面。
         */
        function validStatsBankerDraft(d){
            return d&&Engine.validNumbers(d.bankers,0,5)&&Engine.validNumbers(d.runners)&&!d.bankers.some(n=>d.runners.includes(n));
        }
        function statsBankerTargets(){return {bankers:Number(document.getElementById('banker-draw-count').value),runners:Number(document.getElementById('runner-draw-count').value)};}
        function statsBankerTargetError(pool){
            const t=statsBankerTargets();
            if(!Number.isInteger(t.bankers)||t.bankers<1||t.bankers>5||!Number.isInteger(t.runners)||t.runners<1||t.runners>49-t.bankers||t.bankers+t.runners<6)return '膽碼須為1–5個，腳碼須為正整數，膽＋腳合共6–49個。';
            if(t.bankers+t.runners>pool.length)return `想揀 ${t.bankers+t.runners} 碼，但篩選結果只有 ${pool.length} 碼；請減少膽／腳數量或增加篩選碼數。`;
            return '';
        }
        function statsBankerDraftError(pool){
            const error=statsBankerTargetError(pool);if(error)return error;
            const t=statsBankerTargets(),b=statsBankerDraft;
            if(!validStatsBankerDraft(b)||![...b.bankers,...b.runners].every(n=>pool.includes(n)))return '選號不在目前篩選結果內，請重新選取。';
            if(b.bankers.length!==t.bankers||b.runners.length!==t.runners)return `請揀滿 ${t.bankers} 個膽及 ${t.runners} 個腳；目前 ${b.bankers.length} 膽、${b.runners.length} 腳。`;
            return '';
        }
        function syncStatsBankerPool(pool){
            const removed=[...statsBankerDraft.bankers,...statsBankerDraft.runners].filter(n=>!pool.includes(n));
            statsBankerDraft={bankers:statsBankerDraft.bankers.filter(n=>pool.includes(n)),runners:statsBankerDraft.runners.filter(n=>pool.includes(n))};
            if(removed.length)statsBankerNotice=`${removed.join('、')} 已不在篩選結果內，已取消選取。`;
        }
        function renderStatsBankerPicker(pool=currentFilteredNumbers){
            const t=statsBankerTargets(),b=statsBankerDraft,error=statsBankerDraftError(pool);
            document.getElementById('stats-banker-progress').textContent=`${b.bankers.length} / ${t.bankers}`;
            document.getElementById('stats-runner-progress').textContent=`${b.runners.length} / ${t.runners}`;
            document.getElementById('stats-pick-banker').setAttribute('aria-pressed',String(statsBankerRole==='bankers'));
            document.getElementById('stats-pick-runner').setAttribute('aria-pressed',String(statsBankerRole==='runners'));
            const role=statsBankerRole==='bankers'?'膽':'腳';
            document.getElementById('stats-banker-hint').textContent=`現在揀${role}：點號碼選取，再點同一角色的號碼取消；其他角色可直接轉做${role}。`;
            document.getElementById('stats-banker-grid').innerHTML=[...pool].sort((a,b)=>a-b).map(n=>{
                const selected=b.bankers.includes(n)?'bankers':b.runners.includes(n)?'runners':'';
                const label=selected==='bankers'?'膽':selected==='runners'?'腳':'未選';
                return `<button type="button" id="stats-banker-num-${n}" class="banker-pick-number ${selected}" aria-pressed="${!!selected}" aria-label="${n}，${label}，點選${selected===statsBankerRole?'取消':'設為'+role}" onclick="toggleStatsBankerNumber(${n})"><strong>${n}</strong><small>${label}</small></button>`;
            }).join('');
            document.getElementById('stats-banker-selected').innerHTML=`<div><strong>已選膽：</strong>${b.bankers.join('、')||'未選'}</div><div><strong>已選腳：</strong>${b.runners.join('、')||'未選'}</div>`;
            const ready=!error,total=ready?Engine.choose(b.runners.length,6-b.bankers.length):0,extra=document.getElementById('random-bet-checkbox').checked?1:0;
            document.getElementById('stats-banker-status').textContent=[statsBankerNotice,error||`膽拖 ${total.toLocaleString()} 注${extra?'＋額外隨機1注':''} · 共 ${(total+extra).toLocaleString()} 注，按每注 $10，成本 $${((total+extra)*10).toLocaleString()}。`].filter(Boolean).join(' ');
            document.getElementById('stats-banker-generate').disabled=!ready;
        }
        function showStatsBankerDraft(pool=currentFilteredNumbers){
            if(document.getElementById('draw-mode-select').value==='banker'){
                document.getElementById('banker-draw-container').style.display='block';
                document.getElementById('refresh-draw-btn').style.display='none';
            }
            syncStatsBankerPool(pool);renderStatsBankerPicker(pool);
            document.getElementById('draw-result-title').textContent='膽拖選號草稿：';
            const b=statsBankerDraft;
            document.getElementById('random-6-numbers').innerHTML='<p class="muted">選好號碼後按「生成膽拖並保存」，才會加入歷史及核對實際注碼。</p>'+(!statsBankerDraftError(pool)?renderBankerDraw(b.bankers,b.runners):'');
            if(currentFilterContext)updateHistoricalCoverage(currentFilterContext.startPeriod,pool);
            saveWorkspace();
        }
        function setStatsBankerRole(role){if(!['bankers','runners'].includes(role))return;statsBankerRole=role;renderStatsBankerPicker();}
        function toggleStatsBankerNumber(n){
            if(!currentFilteredNumbers.includes(n))return;
            const role=statsBankerRole,other=role==='bankers'?'runners':'bankers',t=statsBankerTargets();
            statsBankerNotice='';
            if(statsBankerDraft[role].includes(n))statsBankerDraft[role]=statsBankerDraft[role].filter(x=>x!==n);
            else if(!Number.isInteger(t[role])||t[role]<1||statsBankerDraft[role].length>=t[role]){
                statsBankerNotice=`${role==='bankers'?'膽碼':'腳碼'}已揀滿或數量無效，請先取消一個號碼或調整數量。`;renderStatsBankerPicker();return;
            }else{
                statsBankerDraft[other]=statsBankerDraft[other].filter(x=>x!==n);
                statsBankerDraft[role].push(n);statsBankerDraft[role].sort((a,b)=>a-b);
            }
            showStatsBankerDraft();document.getElementById(`stats-banker-num-${n}`)?.focus?.({preventScroll:true});
        }
        function onStatsBankerTargetsChange(){statsBankerNotice='';showStatsBankerDraft();}
        function clearStatsBankerDraft(){statsBankerDraft={bankers:[],runners:[]};statsBankerNotice='已清除膽及腳。';showStatsBankerDraft();}
        function fillStatsBankerRandom(){
            syncStatsBankerPool(currentFilteredNumbers);
            const t=statsBankerTargets(),error=statsBankerTargetError(currentFilteredNumbers);
            if(error||statsBankerDraft.bankers.length>t.bankers||statsBankerDraft.runners.length>t.runners){statsBankerNotice=error||'已選碼數超過目標，請先取消多出的號碼。';renderStatsBankerPicker();return;}
            for(const role of ['bankers','runners']){
                const free=currentFilteredNumbers.filter(n=>!statsBankerDraft.bankers.includes(n)&&!statsBankerDraft.runners.includes(n));
                statsBankerDraft[role].push(...getRandomNumbers(free,t[role]-statsBankerDraft[role].length));statsBankerDraft[role].sort((a,b)=>a-b);
            }
            statsBankerNotice='已保留手選號碼並隨機補齊；可再點選修改。';showStatsBankerDraft();
        }
        function useRemainingStatsRunners(){
            syncStatsBankerPool(currentFilteredNumbers);
            if(statsBankerDraft.bankers.length!==statsBankerTargets().bankers||!Engine.validNumbers(statsBankerDraft.bankers,1,5)||currentFilteredNumbers.length<6){statsBankerNotice='請先揀滿目標膽碼；篩選結果至少需要6碼。';renderStatsBankerPicker();return;}
            statsBankerDraft.runners=currentFilteredNumbers.filter(n=>!statsBankerDraft.bankers.includes(n)).sort((a,b)=>a-b);
            document.getElementById('runner-draw-count').value=String(statsBankerDraft.runners.length);
            statsBankerNotice='其餘篩選號碼已全部設為腳。';showStatsBankerDraft();
        }
        function buildStatsBankerDisplay(pool){
            syncStatsBankerPool(pool);renderStatsBankerPicker(pool);
            const error=statsBankerDraftError(pool);
            if(error)return {drawnNumbers:[],displayHtml:`<p class="error">${escapeText(error)}</p>`,drawModeInfo:null};
            const bankers=[...statsBankerDraft.bankers],runners=[...statsBankerDraft.runners];
            document.getElementById('draw-result-title').textContent=`膽拖（${bankers.length} 膽＋${runners.length} 腳）：`;
            return {drawnNumbers:[...bankers,...runners].sort((a,b)=>a-b),displayHtml:renderBankerDraw(bankers,runners),drawModeInfo:{mode:'banker',bankers,runners}};
        }
        function generateStatsBanker(){
            if(document.getElementById('draw-mode-select').value!=='banker'||!currentFilterContext)return;
            syncStatsBankerPool(currentFilteredNumbers);
            const error=statsBankerDraftError(currentFilteredNumbers);
            if(error){statsBankerNotice=error;renderStatsBankerPicker();return;}
            refreshRandom6(null,true);statsBankerNotice='已生成並保存到歷史；可按歷史的「載入並核對」。';renderStatsBankerPicker();
        }
        function renderBankerDraw(bankers,runners,draw=null){
            const render=nums=>nums.map(n=>`<span class="hf-ball hf-ball--sm ${draw?.extra_number===n?'hf-ball--orange hf-ball--highlight':draw?.numbers.includes(n)?'hf-ball--primary hf-ball--highlight':'hf-ball--secondary'}">${n}</span>`).join('');
            const total=Engine.choose(runners.length,6-bankers.length);
            return `<div class="banker-draw-result"><div><strong>膽碼（${bankers.length}個，全部固定）：</strong>${render(bankers)}</div><div><strong>腳碼（${runners.length}個，每注選${6-bankers.length}個）：</strong>${render(runners)}</div><p>共 ${total.toLocaleString()} 注 · 每注 $10，全注成本 $${(total*10).toLocaleString()}</p></div>`;
        }

        function buildHistoryPrizeSummary(item){
            const wrap=content=>`<div class="hf-mandel-prize-line hf-mandel-prize-line--history">${content}</div>`;
            if(!resolveHistoryRange(item))return wrap('各獎中獎：選號日期不在目前資料集，無法取得驗證期。');
            if(item.startPeriod<=1)return wrap('各獎中獎：尚無較新一期可核對。');
            const draw=lotteryData[item.startPeriod-2];
            if(!draw)return wrap('各獎中獎：無法取得驗證期。');
            const info=item.drawModeInfo|| (Engine.validNumbers(item.random6,6,6)?{mode:'single'}:null);
            const r=Coverage.analyze(draw,item.filteredNumbers,item.random6,info);
            if(r.unavailable)return wrap('各獎中獎：原有注碼未生成或不完整，無法完整核對。');
            const prize=r.counts.reduce((sum,n,i)=>sum+n*amounts()[i],0);
            return wrap(`<div class="hf-mandel-prize-period">驗證期 ${escapeText(draw.draw_number)} · ${escapeText(draw.draw_date)} · 共 ${r.total.toLocaleString()} 注${info?.randomBet?'（包含額外隨機注）':''}</div><div><strong>各獎中獎：</strong>${r.counts.map((n,i)=>`${names[i]}×${n.toLocaleString()}`).join('　')}</div><div>估算獎金 $${prize.toLocaleString()}（按設定金額，非當期實際派彩）</div>`);
        }

        function buildHighFrequencyDrawDisplay(pool, retainedMandelPool=null) {
            const drawResultTitle = document.getElementById('draw-result-title');
            const drawMode = document.getElementById('draw-mode-select').value;
            if(drawMode!=='mandel')currentMandelDrawPool=null;
            if(drawMode==='banker')return buildStatsBankerDisplay(pool);
            let drawnNumbers = [];
            let displayHtml = '';
            let drawModeInfo = null;
            const needed = drawMode === 'complex' ? Number(document.getElementById('complex-count-select').value) : drawMode === 'smartComplex' ? Number(document.getElementById('smart-complex-count-select').value) : drawMode === 'mandel' ? Number(document.getElementById('mandel-draw-count-select').value) : 6;
            if (pool.length < needed) { drawResultTitle.textContent = `此模式需要至少 ${needed} 個號碼，目前只有 ${pool.length} 個`; return { drawnNumbers: [], displayHtml: '<p class="error">請增加篩選號碼數量。</p>', drawModeInfo: null }; }

            if (drawMode === 'paired') {
                return buildPairedDisplay(pool);
            } else if (drawMode === 'single') {
                drawnNumbers = getRandom6(pool);
                drawResultTitle.textContent = '隨機抽取 6 個號碼：';
                displayHtml = drawnNumbers.map(num =>
                    `<span class="hf-ball hf-ball--lg hf-ball--secondary">${num}</span>`
                ).join('');
                drawModeInfo = { mode: 'single' };
            } else if (drawMode === 'complex') {
                const count = parseInt(document.getElementById('complex-count-select').value);
                drawnNumbers = getRandomNumbers(pool, count);
                drawResultTitle.textContent = `隨機抽取 ${count} 個號碼（復式）：`;
                displayHtml = drawnNumbers.map(num =>
                    `<span class="hf-ball hf-ball--lg hf-ball--secondary">${num}</span>`
                ).join('');
                drawModeInfo = { mode: 'complex', count: count };
            } else if (drawMode === 'smart') {
                const hasCoreNumber = document.getElementById('smart-core-checkbox').checked;
                const coreNumber = getCurrentCoreNumber();
                const isRandomCore = document.getElementById('smart-core-number').value === 'random';

                const bets = generateSmartBets(pool, hasCoreNumber, coreNumber);

                let titleText = `聰明組合（共 ${bets.length} 注）`;
                if (hasCoreNumber && coreNumber && isRandomCore) {
                    titleText += ` 🎲膽=${coreNumber}`;
                }
                titleText += '：';
                drawResultTitle.textContent = titleText;

                displayHtml = '<div class="smart-bets-container">';
                bets.forEach((bet, index) => {
                    const rowClass = bet.isRemainder ? 'smart-bet-row has-remainder' : 'smart-bet-row';
                    const labelText = bet.isRemainder ? `第${index + 1}注 *` : `第${index + 1}注`;

                    displayHtml += `<div class="${rowClass}">`;
                    displayHtml += `<span class="smart-bet-label">${labelText}</span>`;
                    displayHtml += '<div class="smart-bet-numbers">';

                    bet.numbers.forEach(num => {
                        const ballClass = (bet.coreNumber !== null && num === bet.coreNumber)
                            ? 'hf-ball hf-ball--md hf-ball--core'
                            : 'hf-ball hf-ball--md hf-ball--secondary';
                        displayHtml += `<span class="${ballClass}">${num}</span>`;
                    });

                    displayHtml += '</div>';
                    if (bet.isRemainder) {
                        displayHtml += `<span style="font-size: 0.75rem; color: #888;">(*含補充號碼)</span>`;
                    }
                    displayHtml += '</div>';
                });
                displayHtml += '</div>';

                drawnNumbers = [...new Set(bets.flatMap(b => b.numbers))].sort((a, b) => a - b);
                drawModeInfo = { mode: 'smart', bets: bets, hasCoreNumber: hasCoreNumber, coreNumber: coreNumber };
            } else if (drawMode === 'smartComplex') {
                const numbersPerBet = parseInt(document.getElementById('smart-complex-count-select').value);
                const hasCoreNumber = document.getElementById('smart-core-checkbox').checked;
                const coreNumber = getCurrentCoreNumber();
                const isRandomCore = document.getElementById('smart-core-number').value === 'random';

                const bets = generateSmartComplexBets(pool, numbersPerBet, hasCoreNumber, coreNumber);

                let titleText = `聰明組合+復式（每注${numbersPerBet}個，共 ${bets.length} 注）`;
                if (hasCoreNumber && coreNumber && isRandomCore) {
                    titleText += ` 🎲膽=${coreNumber}`;
                }
                titleText += '：';
                drawResultTitle.textContent = titleText;

                displayHtml = '<div class="smart-bets-container">';
                bets.forEach((bet, index) => {
                    let rowClass = 'smart-bet-row';
                    let labelText = `第${index + 1}注`;
                    let noteText = '';

                    if (bet.isExtraRandom) {
                        labelText += ' 🎲';
                        noteText = '<span style="font-size: 0.75rem; color: #888;">(隨機注)</span>';
                    } else if (bet.isRemainder) {
                        rowClass += ' has-remainder';
                        labelText += ' *';
                        noteText = `<span style="font-size: 0.75rem; color: #888;">(*餘${bet.remainderOriginal}+補${numbersPerBet - bet.remainderOriginal})</span>`;
                    }

                    displayHtml += `<div class="${rowClass}">`;
                    displayHtml += `<span class="smart-bet-label">${labelText}</span>`;
                    displayHtml += '<div class="smart-bet-numbers">';

                    bet.numbers.forEach(num => {
                        const ballClass = (bet.coreNumber !== null && num === bet.coreNumber)
                            ? 'hf-ball hf-ball--md hf-ball--core'
                            : 'hf-ball hf-ball--md hf-ball--secondary';
                        displayHtml += `<span class="${ballClass}">${num}</span>`;
                    });

                    displayHtml += '</div>';
                    displayHtml += noteText;
                    displayHtml += '</div>';
                });
                displayHtml += '</div>';

                drawnNumbers = [...new Set(bets.flatMap(b => b.numbers))].sort((a, b) => a - b);
                drawModeInfo = { mode: 'smartComplex', bets: bets, numbersPerBet: numbersPerBet, hasCoreNumber: hasCoreNumber, coreNumber: coreNumber };
            } else if (drawMode === 'mandel') {
                const mandelCount = parseInt(document.getElementById('mandel-draw-count-select').value);
                // 從篩選池隨機抽 N 個（非頻率排名前 N）
                const mandelNums = Engine.validNumbers(retainedMandelPool,mandelCount,mandelCount)&&retainedMandelPool.every(n=>pool.includes(n))?[...retainedMandelPool]:getRandomNumbers(pool, mandelCount);
                currentMandelDrawPool=[...mandelNums];

                if (mandelNums.length < mandelCount) {
                    drawResultTitle.textContent = `號碼不足（需要${mandelCount}個，僅有${mandelNums.length}個）`;
                    displayHtml = '<span class="hf-text--muted">篩選號碼不足</span>';
                    drawModeInfo = { mode: 'mandel', error: 'insufficient' };
                } else {
                    const n=mandelNums.length;
                    const work=MandelEngine.createStepper(n);
                    let step;while(!(step=work.next()).done){}
                    const filtered=MandelEngine.filterBets(step.value.map(combo=>combo.map(idx=>mandelNums[idx])),!!document.getElementById('mandel-draw-advanced').checked);
                    const mandelBets=filtered.bets;
                    const totalCost = mandelBets.length * 10;
                    const fullBuy = comb(n, 6);
                    const saving = fullBuy > 0 ? ((1 - mandelBets.length / fullBuy) * 100).toFixed(1) : '0';

                    drawResultTitle.textContent = `Mandel ${filtered.filterInfo.advanced?'進階濃縮':'濃縮法 C('+n+',6,5)'}（共 ${mandelBets.length} 注）：`;

                    displayHtml = mandelFilterSummary(filtered.filterInfo)+'<div class="five-banker-info">';
                    displayHtml += '<div class="five-banker-title">🎯 選取號碼（隨機' + n + '個）：</div>';
                    displayHtml += '<div class="five-banker-numbers">';
                    mandelNums.forEach(num => {
                        displayHtml += `<span class="hf-ball hf-ball--md hf-ball--secondary">${num}</span>`;
                    });
                    displayHtml += '</div>';
                    const mandelBetsForInfo = mandelBets.map(b => ({ numbers: b }));
                    displayHtml += buildMandelPrizeSummaryHtml(mandelBetsForInfo, Number(document.getElementById('start-period').value), {});
                    displayHtml += `<div class="five-banker-stats">`;
                    displayHtml += `📊 全買 C(${n},6) = ${fullBuy} 注 | 濃縮: ${mandelBets.length} 注 | 節省: ${saving}%<br>`;
                    displayHtml += `💰 成本: $${totalCost.toLocaleString()}`;
                    displayHtml += `</div></div>`;

                    displayHtml += '<div class="five-banker-bets-container">';
                    mandelBets.forEach((bet, index) => {
                        displayHtml += `<div class="five-banker-bet-row">`;
                        displayHtml += `<span class="five-banker-bet-label">第${index + 1}注</span>`;
                        displayHtml += '<div class="five-banker-bet-numbers">';
                        bet.forEach(num => {
                            displayHtml += `<span class="hf-ball hf-ball--md hf-ball--secondary">${num}</span>`;
                        });
                        displayHtml += '</div></div>';
                    });
                    displayHtml += '</div>';

                    drawnNumbers = mandelNums;
                    drawModeInfo = { mode: 'mandel', bets: mandelBetsForInfo, selectedNumbers: mandelNums, count: mandelCount, filterInfo:filtered.filterInfo };
                }
            }

            return { displayHtml, drawnNumbers, drawModeInfo };
        }

        // 顯示篩選結果
        function displayFilterResults(startPeriod, endPeriod, maxFrequency, threshold, filteredNumbers, filterMode = 'default', modeDescription = '') {
            const resultDiv = document.getElementById('high-frequency-result');
            const thresholdInfo = document.getElementById('filter-threshold-info');
            const filteredNumbersDiv = document.getElementById('filtered-numbers');
            const filteredNumbersCountDiv = document.getElementById('filtered-numbers-count');
            const previousPeriodNumbersDiv = document.getElementById('previous-period-numbers');
            const random6Div = document.getElementById('random-6-numbers');

            // 顯示結果區域
            resultDiv.style.display = 'block';

            // 根據模式顯示不同的篩選條件信息
            let infoText = `期數範圍：第 ${startPeriod} 期 ~ 第 ${endPeriod} 期（共 ${endPeriod - startPeriod + 1} 期）`;
            
            infoText += `｜${modeDescription}｜最終 ${filteredNumbers.length} 個號碼`;

            thresholdInfo.textContent = infoText;

            // 顯示篩選出數字的數量
            filteredNumbersCountDiv.textContent = `（共 ${filteredNumbers.length} 個）`;

            currentFilterContext = {startPeriod,endPeriod,maxFrequency,threshold,filterMode,selectionSettings:{version:1,mode:filterMode,count:filteredNumbers.length,train:endPeriod-startPeriod+1,short:filterMode==='blend'?Number(document.getElementById('filter-short-periods').value):1,cold:rankShowColdComplement},dataAsOf:lotteryData[0].draw_date};
            document.getElementById('pool-train').value=endPeriod-startPeriod+1;
            document.getElementById('pool-size').value=filteredNumbers.length;
            document.getElementById('pool-short').value=filterMode==='blend'?Number(document.getElementById('filter-short-periods').value):Math.min(10,endPeriod-startPeriod+1);
            updateHistoricalCoverage(startPeriod,filteredNumbers);

            // 顯示符合條件的號碼
            if (filteredNumbers.length === 0) {
                filteredNumbersDiv.innerHTML = '<span class="hf-text--muted">無符合條件的號碼</span>';
                random6Div.innerHTML = '<span class="hf-text--muted">無法抽取</span>';
            } else {
                // 根據模式顯示號碼
                filteredNumbersDiv.innerHTML = filterMode === 'rank_with_pair' && window.currentPairResult
                    ? renderPairEvidence(window.currentPairResult)
                    : filteredNumbers.map(num => `<span class="hf-ball hf-ball--md hf-ball--primary">${num}</span>`).join('');

                // 更新核心號碼選項
                updateSmartCoreOptions();
                
                if(document.getElementById('draw-mode-select').value==='banker'){showStatsBankerDraft(filteredNumbers);return;}
                const built = buildHighFrequencyDrawDisplay(filteredNumbers);
                let displayHtml = built.displayHtml;
                let drawnNumbers = built.drawnNumbers;
                let drawModeInfo = built.drawModeInfo;

                // 檢查是否勾選隨機注數
                const hasRandomBet = document.getElementById('random-bet-checkbox').checked;
                if (hasRandomBet) {
                    // 從1-49中隨機抽取6個號碼
                    const fullPool = Array.from({length: 49}, (_, i) => i + 1);
                    const randomBetNumbers = getRandomNumbers(fullPool, 6);
                    
                    displayHtml += `
                        <div class="random-bet-section">
                            <div class="random-bet-title">
                                <span>🎰</span> 隨機注數（1-49全號池）
                            </div>
                            <div class="random-bet-numbers">
                                ${randomBetNumbers.map(num => 
                                    `<span class="hf-ball hf-ball--lg hf-ball--secondary">${num}</span>`
                                ).join('')}
                            </div>
                        </div>
                    `;
                    
                    // 將隨機注數信息添加到 drawModeInfo
                    if (drawModeInfo) {
                        drawModeInfo.randomBet = randomBetNumbers;
                    } else { drawModeInfo = {mode: 'unavailable', randomBet: randomBetNumbers}; }
                }
                
                random6Div.innerHTML = displayHtml;
                updateHistoricalCoverage(startPeriod,filteredNumbers,drawnNumbers,drawModeInfo);
                
                // 添加到歷史記錄
                addToFilterHistory(startPeriod, endPeriod, maxFrequency, threshold, filteredNumbers, drawnNumbers, filterMode, drawModeInfo);
            }

            // 滾動到結果區域
            // resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // 更新抽獎模式UI
        function updateDrawModeUI(refresh = true) {
            const drawMode = document.getElementById('draw-mode-select').value;
            const complexContainer = document.getElementById('complex-count-container');
            const smartCoreContainer = document.getElementById('smart-core-container');
            const smartComplexContainer = document.getElementById('smart-complex-container');
            const mandelDrawContainer = document.getElementById('mandel-draw-count-container');
            const drawResultTitle = document.getElementById('draw-result-title');

            document.getElementById('banker-draw-container').style.display = drawMode === 'banker' ? 'block' : 'none';
            document.getElementById('refresh-draw-btn').style.display = drawMode === 'banker' ? 'none' : '';
            if(drawMode==='banker')renderStatsBankerPicker();
            document.getElementById('paired-count-container').style.display = drawMode === 'paired' ? 'flex' : 'none';
            document.getElementById('random-bet-container').style.display = drawMode === 'paired' ? 'none' : '';
            if(drawMode === 'paired') document.getElementById('random-bet-checkbox').checked = false;
            // 隱藏所有選項容器
            complexContainer.style.display = 'none';
            smartCoreContainer.style.display = 'none';
            smartComplexContainer.style.display = 'none';
            mandelDrawContainer.style.display = 'none';

            // 根據模式顯示對應的選項
            if (drawMode === 'single') {
                drawResultTitle.textContent = '隨機抽取 6 個號碼：';
            } else if (drawMode === 'mandel') {
                mandelDrawContainer.style.display = 'flex';
                const count = document.getElementById('mandel-draw-count-select').value;
                drawResultTitle.textContent = `Mandel 濃縮法（隨機${count}個號碼）：`;
            } else if (drawMode === 'complex') {
                complexContainer.style.display = 'flex';
                const count = document.getElementById('complex-count-select').value;
                drawResultTitle.textContent = `隨機抽取 ${count} 個號碼（復式）：`;
            } else if (drawMode === 'smart') {
                smartCoreContainer.style.display = 'flex';
                drawResultTitle.textContent = '聰明組合（多注）：';
                // 更新核心號碼選項
                updateSmartCoreOptions();
            } else if (drawMode === 'smartComplex') {
                smartComplexContainer.style.display = 'flex';
                smartCoreContainer.style.display = 'flex';
                const count = document.getElementById('smart-complex-count-select').value;
                drawResultTitle.textContent = `聰明組合+復式（每注${count}個）：`;
                // 更新核心號碼選項
                updateSmartCoreOptions();
            } else if (drawMode === 'banker') {
                drawResultTitle.textContent = '膽拖：';
            }

            // 如果有篩選結果，立即刷新顯示
            if (refresh && currentFilteredNumbers.length > 0) {
                refreshRandom6();
            }
        }
        
        // 更新聰明組合核心號碼UI
        function updateSmartCoreUI() {
            const checkbox = document.getElementById('smart-core-checkbox');
            const coreNumberSelect = document.getElementById('smart-core-number');
            
            coreNumberSelect.style.display = checkbox.checked ? 'inline-block' : 'none';
            
            // 如果有篩選結果，立即刷新顯示
            if (currentFilteredNumbers.length > 0) {
                refreshRandom6();
            }
        }
        
        // 復式模式數量改變時
        function onComplexCountChange() {
            const count = document.getElementById('complex-count-select').value;
            const drawResultTitle = document.getElementById('draw-result-title');
            drawResultTitle.textContent = `隨機抽取 ${count} 個號碼（復式）：`;
            
            // 如果有篩選結果，立即刷新顯示
            if (currentFilteredNumbers.length > 0) {
                refreshRandom6();
            }
        }
        
        // 聰明組合核心號碼改變時
        function onSmartCoreNumberChange() {
            // 如果有篩選結果，立即刷新顯示
            if (currentFilteredNumbers.length > 0) {
                refreshRandom6();
            }
        }
        
        // 隨機注數 checkbox 改變時
        function onRandomBetChange() {
            // 如果有篩選結果，立即刷新顯示
            if (currentFilteredNumbers.length > 0) {
                refreshRandom6();
            }
        }
        
        // 聰明組合+復式 數量改變時
        function onSmartComplexCountChange() {
            const count = document.getElementById('smart-complex-count-select').value;
            const drawResultTitle = document.getElementById('draw-result-title');
            drawResultTitle.textContent = `聰明組合+復式（每注${count}個）：`;
            
            // 如果有篩選結果，立即刷新顯示
            if (currentFilteredNumbers.length > 0) {
                refreshRandom6();
            }
        }
        
        // 更新核心號碼選項（根據高頻號碼）
        function updateSmartCoreOptions() {
            const coreNumberSelect = document.getElementById('smart-core-number');
            
            // 保存當前選中的值
            const previousValue = coreNumberSelect.value;
            
            coreNumberSelect.innerHTML = '';
            
            // 添加"隨機"選項
            const randomOption = document.createElement('option');
            randomOption.value = 'random';
            randomOption.textContent = '🎲 隨機';
            coreNumberSelect.appendChild(randomOption);
            
            if (currentFilteredNumbers.length > 0) {
                currentFilteredNumbers.forEach(num => {
                    const option = document.createElement('option');
                    option.value = num;
                    option.textContent = num;
                    coreNumberSelect.appendChild(option);
                });
                
                // 如果之前選中的值仍然在新的選項中，恢復選擇（但不是隨機）
                if (previousValue && previousValue !== 'random' && currentFilteredNumbers.includes(parseInt(previousValue))) {
                    coreNumberSelect.value = previousValue;
                } else if (previousValue === 'random') {
                    coreNumberSelect.value = 'random';
                }
            }
            
            // 如果是隨機模式，更新當前隨機核心號碼
            if (coreNumberSelect.value === 'random') {
                updateRandomCoreNumber();
            }
        }
        
        // 當前隨機選中的核心號碼
        let currentRandomCoreNumber = null;
        
        // 更新隨機核心號碼（從高頻號碼中隨機抽取一個）
        function updateRandomCoreNumber() {
            if (currentFilteredNumbers.length > 0) {
                const randomIndex = Math.floor(Math.random() * currentFilteredNumbers.length);
                currentRandomCoreNumber = currentFilteredNumbers[randomIndex];
            } else {
                currentRandomCoreNumber = null;
            }
            return currentRandomCoreNumber;
        }
        
        // 獲取當前核心號碼（處理隨機選項）
        function getCurrentCoreNumber() {
            const coreNumberSelect = document.getElementById('smart-core-number');
            const selectedValue = coreNumberSelect.value;
            
            if (selectedValue === 'random') {
                // 如果沒有隨機核心號碼，則生成一個
                if (!currentFilteredNumbers.includes(currentRandomCoreNumber)) {
                    updateRandomCoreNumber();
                }
                return currentRandomCoreNumber;
            }
            return currentFilteredNumbers.includes(Number(selectedValue))?Number(selectedValue):updateRandomCoreNumber();
        }
        
        // 從號碼池中隨機抽取指定數量的號碼
        function getRandomNumbers(pool, count) {
            if (pool.length < count) {
                return [...pool]; // 如果池中號碼不夠，返回全部
            }
            const copy = [...pool];
            // Fisher-Yates 洗牌算法
            for (let i = copy.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [copy[i], copy[j]] = [copy[j], copy[i]];
            }
            return copy.slice(0, count).sort((a, b) => a - b);
        }
        
        // 生成聰明組合注數
        function generateSmartBets(pool, hasCoreNumber, coreNumber) {
            const poolSize = pool.length;
            const betsPerGroup = 6;
            const bets = [];
            
            if (poolSize < 6) {
                // 號碼不夠，直接返回一注
                return [];
            }
            
            // 複製並打亂號碼池
            const shuffled = [...pool];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            
            // 如果有核心號碼，先從洗牌後的號碼中移除核心號碼
            let coreNum = null;
            if (hasCoreNumber && pool.includes(Number(coreNumber))) {
                coreNum = parseInt(coreNumber);
                const coreIndex = shuffled.indexOf(coreNum);
                if (coreIndex !== -1) {
                    shuffled.splice(coreIndex, 1);
                }
            }
            
            // 根據是否有核心號碼計算每注需要從池中取的號碼數
            const numbersPerBetFromPool = coreNum !== null ? (betsPerGroup - 1) : betsPerGroup;
            
            // 計算可以組成多少完整注
            const fullBetCount = Math.floor(shuffled.length / numbersPerBetFromPool);
            
            let usedNumbers = [];
            
            // 生成完整注數
            for (let i = 0; i < fullBetCount; i++) {
                let betNumbers;
                const startIdx = i * numbersPerBetFromPool;
                const endIdx = (i + 1) * numbersPerBetFromPool;
                
                if (coreNum !== null) {
                    // 如果有核心號碼，每注都要包含核心號碼
                    const otherNumbers = shuffled.slice(startIdx, endIdx);
                    betNumbers = [coreNum, ...otherNumbers];
                } else {
                    betNumbers = shuffled.slice(startIdx, endIdx);
                }
                usedNumbers = usedNumbers.concat(betNumbers);
                bets.push({
                    numbers: betNumbers.sort((a, b) => a - b),
                    isRemainder: false,
                    coreNumber: coreNum
                });
            }
            
            // 處理剩餘號碼
            const remainingNumbers = shuffled.slice(fullBetCount * numbersPerBetFromPool);
            
            if (remainingNumbers.length > 0) {
                // 需要補足到6個的數量
                const currentCount = remainingNumbers.length + (coreNum !== null ? 1 : 0);
                const needCount = betsPerGroup - currentCount;
                
                // 只有當需要補充時才補充
                let supplementNumbers = [];
                if (needCount > 0) {
                    // 從原池中找出未在剩餘號碼中的號碼（排除核心號碼）
                    const availableForSupplement = pool.filter(n => 
                        !remainingNumbers.includes(n) && n !== coreNum
                    );
                    
                    // 隨機選取補足號碼
                    supplementNumbers = getRandomNumbers(availableForSupplement, needCount);
                }
                
                let finalBet;
                if (coreNum !== null) {
                    finalBet = [coreNum, ...remainingNumbers, ...supplementNumbers];
                } else {
                    finalBet = [...remainingNumbers, ...supplementNumbers];
                }
                
                bets.push({
                    numbers: finalBet.sort((a, b) => a - b),
                    isRemainder: true,
                    remainderOriginal: currentCount,
                    coreNumber: coreNum
                });
            }
            
            return bets;
        }
        
        // 生成聰明組合+復式注數
        // 例：18個號碼 / 7 = 2注 + 餘數4
        // 第1注：隨機7個不重複號碼（含核心號碼如有）
        // 第2注：另外7個不重複號碼（從剩餘中，含核心號碼如有）
        // 第3注：餘數4 + 隨機3個（從18個中抽取補足，含核心號碼如有）
        // 第4注：從全部18個中完全隨機抽7個（額外隨機注，含核心號碼如有）
        function generateSmartComplexBets(pool, numbersPerBet, hasCoreNumber, coreNumber) {
            const poolSize = pool.length;
            const bets = [];
            
            // 處理核心號碼
            let coreNum = null;
            if (hasCoreNumber && pool.includes(Number(coreNumber))) {
                coreNum = parseInt(coreNumber);
            }
            
            if (poolSize < numbersPerBet) {
                // 號碼不夠，直接返回一注
                return [];
            }
            
            // 複製並打亂號碼池
            const shuffled = [...pool];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            
            // 如果有核心號碼，先從洗牌後的號碼中移除核心號碼
            if (coreNum !== null) {
                const coreIndex = shuffled.indexOf(coreNum);
                if (coreIndex !== -1) {
                    shuffled.splice(coreIndex, 1);
                }
            }
            
            // 根據是否有核心號碼計算每注需要從池中取的號碼數
            const numbersPerBetFromPool = coreNum !== null ? (numbersPerBet - 1) : numbersPerBet;
            
            // 計算可以組成多少完整注
            const fullBetCount = Math.floor(shuffled.length / numbersPerBetFromPool);
            
            // 生成完整注數（不重複）
            for (let i = 0; i < fullBetCount; i++) {
                const startIdx = i * numbersPerBetFromPool;
                const endIdx = (i + 1) * numbersPerBetFromPool;
                let betNumbers;
                
                if (coreNum !== null) {
                    const otherNumbers = shuffled.slice(startIdx, endIdx);
                    betNumbers = [coreNum, ...otherNumbers];
                } else {
                    betNumbers = shuffled.slice(startIdx, endIdx);
                }
                
                bets.push({
                    numbers: betNumbers.sort((a, b) => a - b),
                    isRemainder: false,
                    isExtraRandom: false,
                    coreNumber: coreNum
                });
            }
            
            // 處理餘數（如果有）
            const remainingNumbers = shuffled.slice(fullBetCount * numbersPerBetFromPool);
            if (remainingNumbers.length > 0) {
                const currentCount = remainingNumbers.length + (coreNum !== null ? 1 : 0);
                const needCount = numbersPerBet - currentCount;
                
                // 從原始號碼池中隨機補足（可以與前面的注重複，排除核心號碼）
                let supplementNumbers = [];
                if (needCount > 0) {
                    const availableForSupplement = pool.filter(n => 
                        !remainingNumbers.includes(n) && n !== coreNum
                    );
                    supplementNumbers = getRandomNumbers(availableForSupplement, needCount);
                }
                
                let finalBet;
                if (coreNum !== null) {
                    finalBet = [coreNum, ...remainingNumbers, ...supplementNumbers];
                } else {
                    finalBet = [...remainingNumbers, ...supplementNumbers];
                }
                
                bets.push({
                    numbers: finalBet.sort((a, b) => a - b),
                    isRemainder: true,
                    remainderOriginal: currentCount,
                    isExtraRandom: false,
                    coreNumber: coreNum
                });
            }
            
            // 額外隨機注：從全部號碼池中完全隨機抽取（含核心號碼如有）
            let extraRandomBet;
            if (coreNum !== null) {
                // 從池中隨機抽取 numbersPerBet - 1 個，再加上核心號碼
                const poolWithoutCore = pool.filter(n => n !== coreNum);
                const randomPart = getRandomNumbers(poolWithoutCore, numbersPerBet - 1);
                extraRandomBet = [coreNum, ...randomPart];
            } else {
                extraRandomBet = getRandomNumbers(pool, numbersPerBet);
            }
            bets.push({
                numbers: extraRandomBet.sort((a, b) => a - b),
                isRemainder: false,
                isExtraRandom: true,
                coreNumber: coreNum
            });
            
            return bets;
        }

        function onStatsMandelAdvancedChange(){
            if(currentFilteredNumbers.length&&document.getElementById('draw-mode-select').value==='mandel')refreshRandom6(currentMandelDrawPool);
        }

        // 重新隨機抽取號碼
        function refreshRandom6(retainedMandelPool=null,commitBanker=false) {
            if(document.getElementById('draw-mode-select').value==='banker'&&!commitBanker){showStatsBankerDraft();return;}
            if (currentFilteredNumbers.length === 0) {
                alert('請先執行「篩選高頻號碼」！');
                return;
            }

            const random6Div = document.getElementById('random-6-numbers');

            const built = buildHighFrequencyDrawDisplay(currentFilteredNumbers,retainedMandelPool);
            let displayHtml = built.displayHtml;
            let drawnNumbers = built.drawnNumbers;
            let drawModeInfo = built.drawModeInfo;

            // 檢查是否勾選隨機注數
            const hasRandomBet = document.getElementById('random-bet-checkbox').checked;
            if (hasRandomBet) {
                // 從1-49中隨機抽取6個號碼
                const fullPool = Array.from({length: 49}, (_, i) => i + 1);
                const randomBetNumbers = getRandomNumbers(fullPool, 6);
                
                displayHtml += `
                    <div class="random-bet-section">
                        <div class="random-bet-title">
                            <span>🎰</span> 隨機注數（1-49全號池）
                        </div>
                        <div class="random-bet-numbers">
                            ${randomBetNumbers.map(num => 
                                `<span class="hf-ball hf-ball--lg hf-ball--secondary">${num}</span>`
                            ).join('')}
                        </div>
                    </div>
                `;
                
                // 將隨機注數信息添加到 drawModeInfo
                if (drawModeInfo) {
                    drawModeInfo.randomBet = randomBetNumbers;
                } else { drawModeInfo = {mode: 'unavailable', randomBet: randomBetNumbers}; }
            }
            
            random6Div.innerHTML = displayHtml;
            
            // 取得當前的篩選參數（從最新的歷史記錄或當前顯示的資訊）
            if (currentFilterContext) {
                const latestItem = currentFilterContext;
                updateHistoricalCoverage(latestItem.startPeriod,currentFilteredNumbers,drawnNumbers,drawModeInfo);
                // 添加新的隨機結果到歷史記錄
                addToFilterHistory(
                    latestItem.startPeriod, 
                    latestItem.endPeriod, 
                    latestItem.maxFrequency, 
                    latestItem.threshold, 
                    currentFilteredNumbers, 
                    drawnNumbers,
                    latestItem.filterMode,
                    drawModeInfo
                );
            }
        }

        // 添加到歷史記錄
        function addToFilterHistory(startPeriod, endPeriod, maxFrequency, threshold, filteredNumbers, random6, filterMode = 'default', drawModeInfo = null) {
            const timestamp = new Date().toLocaleString('zh-TW', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
            });
            
            const historyItem = {
                timestamp,
                filterMode,
                selectionSettings: currentFilterContext?.selectionSettings || null,
                rankCold: rankShowColdComplement,
                dataVersion: lotteryData[0].draw_date,
                startDraw: lotteryData[startPeriod-1].draw_date,
                endDraw: lotteryData[endPeriod-1].draw_date,
                controls: captureControls(),
                pairing: window.currentPairResult || null,
                startPeriod,
                endPeriod,
                maxFrequency,
                threshold,
                filteredNumbers: [...filteredNumbers],
                random6: [...random6],
                drawModeInfo: drawModeInfo // 包含抽號模式和多注數據
            };
            
            // 添加到歷史記錄陣列（最新的在前面）
            filterHistory.unshift(historyItem);
            
            // 限制歷史記錄數量（最多保留 20 筆）
            if (filterHistory.length > 20) {
                filterHistory = filterHistory.slice(0, 20);
            }
            
            // 更新歷史記錄顯示
            updateFilterHistoryDisplay();
        }

        // 更新歷史記錄顯示
        function updateFilterHistoryDisplay() {
            filterHistory.forEach(resolveHistoryRange);
            Store.set('history', filterHistory);
            const historyDiv = document.getElementById('filter-history');
            
            if (filterHistory.length === 0) {
                historyDiv.innerHTML = '<p class="hf-empty">尚無篩選記錄</p>';
                updateHistoricalHighFrequencyNumbers(); // 更新歷史高頻號碼
                return;
            }
            
            let html = '';
            filterHistory.forEach((item, index) => {
                // 獲取驗證期（較新一期）的中獎號碼（如果存在）
                let previousPeriodRegularNumbers = new Set();
                let previousPeriodExtraNumber = null;
                if (item.startPeriod > 1) {
                    const previousPeriodIndex = item.startPeriod - 2;
                    if (previousPeriodIndex >= 0 && previousPeriodIndex < lotteryData.length) {
                        const previousPeriodData = lotteryData[previousPeriodIndex];
                        previousPeriodData.numbers.forEach(num => previousPeriodRegularNumbers.add(num));
                        previousPeriodExtraNumber = previousPeriodData.extra_number;
                    }
                }
                
                // 生成號碼顯示（根據抽號模式）
                let randomNumbersHtml = '';
                let modeLabel = '隨機 6 碼：';
                
                if (item.drawModeInfo?.mode === 'banker') {
                    const {bankers,runners}=item.drawModeInfo;
                    modeLabel=`膽拖（${bankers.length} 膽＋${runners.length} 腳）：`;
                    randomNumbersHtml=renderBankerDraw(bankers,runners,lotteryData[item.startPeriod-2]);
                } else if (item.drawModeInfo && item.drawModeInfo.mode === 'paired' && item.drawModeInfo.bets) {
                    modeLabel = `保留搭配（${item.drawModeInfo.bets.length} 注）：`;
                    randomNumbersHtml = renderPairedBets(item.drawModeInfo);
                } else if (item.drawModeInfo && item.drawModeInfo.mode === 'smart' && item.drawModeInfo.bets) {
                    // 聰明組合：顯示多注
                    modeLabel = `聰明組合（${item.drawModeInfo.bets.length} 注）：`;
                    randomNumbersHtml = '<div class="hf-history-smart-bets">';
                    item.drawModeInfo.bets.forEach((bet, betIndex) => {
                        const rowClass = bet.isRemainder ? 'hf-history-bet-row hf-history-bet-row--remainder' : 'hf-history-bet-row';
                        randomNumbersHtml += `<div class="${rowClass}">`;
                        randomNumbersHtml += `<span class="hf-history-bet-label">第${betIndex + 1}注${bet.isRemainder ? '*' : ''}</span>`;
                        
                        bet.numbers.forEach(num => {
                            const isRegularMatched = previousPeriodRegularNumbers.has(num);
                            const isExtraMatched = (previousPeriodExtraNumber !== null && num === previousPeriodExtraNumber);
                            const isCoreNumber = (bet.coreNumber !== null && num === bet.coreNumber);
                            
                            let ballClass = 'hf-ball hf-ball--sm hf-ball--secondary';
                            if (isCoreNumber) {
                                ballClass = 'hf-ball hf-ball--sm hf-ball--core';
                            } else if (isExtraMatched) {
                                ballClass = 'hf-ball hf-ball--sm hf-ball--orange hf-ball--highlight';
                            } else if (isRegularMatched) {
                                ballClass = 'hf-ball hf-ball--sm hf-ball--primary hf-ball--highlight';
                            }
                            
                            randomNumbersHtml += `<span class="${ballClass}">${num}</span>`;
                        });
                        
                        randomNumbersHtml += '</div>';
                    });
                    randomNumbersHtml += '</div>';
                } else if (item.drawModeInfo && item.drawModeInfo.mode === 'smartComplex' && item.drawModeInfo.bets) {
                    // 聰明組合+復式：顯示多注
                    const numbersPerBet = item.drawModeInfo.numbersPerBet || 7;
                    modeLabel = `聰明組合+復式（每注${numbersPerBet}個，${item.drawModeInfo.bets.length} 注）：`;
                    randomNumbersHtml = '<div class="hf-history-smart-bets">';
                    item.drawModeInfo.bets.forEach((bet, betIndex) => {
                        let rowClass = 'hf-history-bet-row';
                        let labelSuffix = '';
                        
                        if (bet.isExtraRandom) {
                            labelSuffix = ' 🎲';
                        } else if (bet.isRemainder) {
                            rowClass += ' hf-history-bet-row--remainder';
                            labelSuffix = '*';
                        }
                        
                        randomNumbersHtml += `<div class="${rowClass}">`;
                        randomNumbersHtml += `<span class="hf-history-bet-label">第${betIndex + 1}注${labelSuffix}</span>`;
                        
                        bet.numbers.forEach(num => {
                            const isRegularMatched = previousPeriodRegularNumbers.has(num);
                            const isExtraMatched = (previousPeriodExtraNumber !== null && num === previousPeriodExtraNumber);
                            const isCoreNumber = (bet.coreNumber !== null && num === bet.coreNumber);
                            
                            let ballClass = 'hf-ball hf-ball--sm hf-ball--secondary';
                            if (isCoreNumber) {
                                ballClass = 'hf-ball hf-ball--sm hf-ball--core';
                            } else if (isExtraMatched) {
                                ballClass = 'hf-ball hf-ball--sm hf-ball--orange hf-ball--highlight';
                            } else if (isRegularMatched) {
                                ballClass = 'hf-ball hf-ball--sm hf-ball--primary hf-ball--highlight';
                            }
                            
                            randomNumbersHtml += `<span class="${ballClass}">${num}</span>`;
                        });
                        
                        randomNumbersHtml += '</div>';
                    });
                    randomNumbersHtml += '</div>';
                } else if (item.drawModeInfo && item.drawModeInfo.mode === 'fiveBankerFullMeal' && item.drawModeInfo.bets) {
                    // 5膽拖全餐：顯示膽碼和多注
                    const bankers = item.drawModeInfo.bankers || [];
                    modeLabel = `5膽拖全餐（${item.drawModeInfo.bets.length} 注）：`;

                    randomNumbersHtml = '<div class="hf-history-five-banker">';
                    // 顯示膽碼
                    randomNumbersHtml += '<div style="margin-bottom: 8px;">';
                    randomNumbersHtml += '<strong style="color: #495057; font-size: 0.85rem;">🎯 膽碼：</strong>';
                    bankers.forEach(num => {
                        const isRegularMatched = previousPeriodRegularNumbers.has(num);
                        const isExtraMatched = (previousPeriodExtraNumber !== null && num === previousPeriodExtraNumber);

                        let ballClass = 'hf-ball hf-ball--sm hf-ball--secondary';
                        if (isExtraMatched) {
                            ballClass = 'hf-ball hf-ball--sm hf-ball--orange hf-ball--highlight';
                        } else if (isRegularMatched) {
                            ballClass = 'hf-ball hf-ball--sm hf-ball--primary hf-ball--highlight';
                        }

                        randomNumbersHtml += `<span class="${ballClass}">${num}</span>`;
                    });
                    randomNumbersHtml += '</div>';

                    // 顯示所有注數（不限制高度，顯示全部）
                    randomNumbersHtml += '<div class="hf-history-smart-bets">';
                    item.drawModeInfo.bets.forEach((bet, betIndex) => {
                        randomNumbersHtml += `<div class="hf-history-bet-row">`;
                        randomNumbersHtml += `<span class="hf-history-bet-label">第${betIndex + 1}注</span>`;

                        bet.numbers.forEach(num => {
                            const isRegularMatched = previousPeriodRegularNumbers.has(num);
                            const isExtraMatched = (previousPeriodExtraNumber !== null && num === previousPeriodExtraNumber);

                            let ballClass = 'hf-ball hf-ball--sm hf-ball--secondary';
                            if (isExtraMatched) {
                                ballClass = 'hf-ball hf-ball--sm hf-ball--orange hf-ball--highlight';
                            } else if (isRegularMatched) {
                                ballClass = 'hf-ball hf-ball--sm hf-ball--primary hf-ball--highlight';
                            }

                            randomNumbersHtml += `<span class="${ballClass}">${num}</span>`;
                        });

                        randomNumbersHtml += '</div>';
                    });
                    randomNumbersHtml += '</div>';
                    randomNumbersHtml += '</div>';
                } else if (item.drawModeInfo && item.drawModeInfo.mode === 'mandel' && item.drawModeInfo.bets) {
                    // Mandel 濃縮法：顯示選取號碼和多注
                    const selNums = item.drawModeInfo.selectedNumbers || [];
                    modeLabel = `Mandel ${item.drawModeInfo.filterInfo?.advanced?'進階濃縮':'濃縮法'}（${selNums.length}個，${item.drawModeInfo.bets.length} 注）：`;

                    randomNumbersHtml = '<div class="hf-history-five-banker">';
                    // 顯示選取號碼
                    randomNumbersHtml += '<div style="margin-bottom: 8px;">';
                    randomNumbersHtml += '<strong style="color: #495057; font-size: 0.85rem;">🎯 選取號碼：</strong>';
                    selNums.forEach(num => {
                        const isRegularMatched = previousPeriodRegularNumbers.has(num);
                        const isExtraMatched = (previousPeriodExtraNumber !== null && num === previousPeriodExtraNumber);
                        let ballClass = 'hf-ball hf-ball--sm hf-ball--secondary';
                        if (isExtraMatched) {
                            ballClass = 'hf-ball hf-ball--sm hf-ball--orange hf-ball--highlight';
                        } else if (isRegularMatched) {
                            ballClass = 'hf-ball hf-ball--sm hf-ball--primary hf-ball--highlight';
                        }
                        randomNumbersHtml += `<span class="${ballClass}">${num}</span>`;
                    });
                    randomNumbersHtml += '</div>';
                    randomNumbersHtml += buildHistoryPrizeSummary(item);
                    randomNumbersHtml += mandelFilterSummary(item.drawModeInfo.filterInfo, true);

                    // 顯示所有注數
                    randomNumbersHtml += '<div class="hf-history-smart-bets">';
                    item.drawModeInfo.bets.forEach((bet, betIndex) => {
                        randomNumbersHtml += `<div class="hf-history-bet-row">`;
                        randomNumbersHtml += `<span class="hf-history-bet-label">第${betIndex + 1}注</span>`;
                        bet.numbers.forEach(num => {
                            const isRegularMatched = previousPeriodRegularNumbers.has(num);
                            const isExtraMatched = (previousPeriodExtraNumber !== null && num === previousPeriodExtraNumber);
                            let ballClass = 'hf-ball hf-ball--sm hf-ball--secondary';
                            if (isExtraMatched) {
                                ballClass = 'hf-ball hf-ball--sm hf-ball--orange hf-ball--highlight';
                            } else if (isRegularMatched) {
                                ballClass = 'hf-ball hf-ball--sm hf-ball--primary hf-ball--highlight';
                            }
                            randomNumbersHtml += `<span class="${ballClass}">${num}</span>`;
                        });
                        randomNumbersHtml += '</div>';
                    });
                    randomNumbersHtml += '</div>';
                    randomNumbersHtml += '</div>';
                } else if (item.drawModeInfo && item.drawModeInfo.mode === 'complex') {
                    // 復式：顯示號碼數量
                    const count = item.random6.length;
                    modeLabel = `復式 ${count} 碼：`;
                    randomNumbersHtml = item.random6.map(num => {
                        const isRegularMatched = previousPeriodRegularNumbers.has(num);
                        const isExtraMatched = (previousPeriodExtraNumber !== null && num === previousPeriodExtraNumber);

                        let ballClass = 'hf-ball hf-ball--sm hf-ball--secondary';
                        if (isExtraMatched) {
                            ballClass = 'hf-ball hf-ball--sm hf-ball--orange hf-ball--highlight';
                        } else if (isRegularMatched) {
                            ballClass = 'hf-ball hf-ball--sm hf-ball--primary hf-ball--highlight';
                        }

                        return `<span class="${ballClass}">${num}</span>`;
                    }).join('');
                } else {
                    // 單式或舊格式
                    randomNumbersHtml = item.random6.map(num => {
                        const isRegularMatched = previousPeriodRegularNumbers.has(num);
                        const isExtraMatched = (previousPeriodExtraNumber !== null && num === previousPeriodExtraNumber);

                        let ballClass = 'hf-ball hf-ball--sm hf-ball--secondary';
                        if (isExtraMatched) {
                            ballClass = 'hf-ball hf-ball--sm hf-ball--orange hf-ball--highlight';
                        } else if (isRegularMatched) {
                            ballClass = 'hf-ball hf-ball--sm hf-ball--primary hf-ball--highlight';
                        }

                        return `<span class="${ballClass}">${num}</span>`;
                    }).join('');
                }
                
                // 處理隨機注數
                let randomBetHtml = '';
                if (item.drawModeInfo && item.drawModeInfo.randomBet && item.drawModeInfo.randomBet.length > 0) {
                    randomBetHtml = `
                        <div class="hf-history-random-bet">
                            <strong class="hf-history-random-label hf-history-random-label--green">🎰 隨機注數：</strong>
                            ${item.drawModeInfo.randomBet.map(num => {
                                // 將字符串號碼轉換為數字進行比對（lotteryData中的號碼是數字類型）
                                const numAsInt = parseInt(num, 10);
                                const isRegularMatched = previousPeriodRegularNumbers.has(numAsInt);
                                const isExtraMatched = (previousPeriodExtraNumber !== null && numAsInt === previousPeriodExtraNumber);
                                
                                // 使用與其他注數相同的顏色邏輯
                                let ballClass = 'hf-ball hf-ball--sm hf-ball--secondary'; // 沒中：紫色
                                if (isExtraMatched) {
                                    ballClass = 'hf-ball hf-ball--sm hf-ball--orange hf-ball--highlight'; // 中特別號碼：橙色
                                } else if (isRegularMatched) {
                                    ballClass = 'hf-ball hf-ball--sm hf-ball--primary hf-ball--highlight'; // 中正式號碼：藍紫色
                                }
                                
                                return `<span class="${ballClass}">${num}</span>`;
                            }).join('')}
                        </div>
                    `;
                }
                
                html += `
                    <div class="hf-history-card ${index === 0 ? 'hf-history-card--active' : ''}">
                        <div class="hf-history-header">
                            <span class="hf-history-time">🕐 ${escapeText(item.timestamp)}</span>
                            <div class="hf-history-actions">
                                <button onclick="verifyHistoryItem(${index})" class="hf-history-btn hf-history-btn--load">載入並核對</button>
                                <button onclick="removeHistoryItem(${index})" class="hf-history-btn hf-history-btn--remove">移除</button>
                            </div>
                        </div>
                        <div class="hf-history-meta">
                            期數：第 ${item.startPeriod} ~ ${item.endPeriod} 期 | ${item.selectionSettings?'固定 '+item.filteredNumbers.length+' 碼':'舊版保存記錄'}
                        </div>
                        ${item.drawModeInfo?.mode==='mandel'&&item.drawModeInfo.bets?'':buildHistoryPrizeSummary(item)}
                        <div class="hf-history-random">
                            <strong class="hf-history-random-label">${modeLabel}</strong>
                            ${randomNumbersHtml}
                        </div>
                        ${randomBetHtml}
                        <div class="hf-history-count">
                            符合條件：${item.filteredNumbers.length} 個號碼
                        </div>
                    </div>
                `;
            });
            
            historyDiv.innerHTML = html;
            
            // 更新歷史高頻號碼
            updateHistoricalHighFrequencyNumbers();
        }
        
        // 計算並更新歷史高頻號碼
        function updateHistoricalHighFrequencyNumbers() {
            const displayDiv = document.getElementById('historical-high-frequency');
            
            if (filterHistory.length === 0) {
                displayDiv.innerHTML = '<p class="hf-empty--inline">尚無歷史數據</p>';
                return;
            }
            
            // 統計所有歷史記錄中隨機6碼的號碼出現次數
            const numberFrequency = {};
            
            filterHistory.forEach(item => {
                item.random6.forEach(num => {
                    numberFrequency[num] = (numberFrequency[num] || 0) + 1;
                });
            });
            
            // 轉換為陣列並按頻率排序
            let sortedNumbers = Object.entries(numberFrequency)
                .map(([num, freq]) => ({
                    number: parseInt(num),
                    frequency: freq
                }))
                .sort((a, b) => {
                    // 如果頻率相同，需要根據當前期數範圍的統計排名來決定
                    if (b.frequency === a.frequency) {
                        return sortByGlobalRank(a.number, b.number);
                    }
                    return b.frequency - a.frequency;
                });
            
            // 取前6個不同的號碼
            const top6Numbers = sortedNumbers.slice(0, 6);
            
            if (top6Numbers.length === 0) {
                displayDiv.innerHTML = '<p class="hf-empty--inline">尚無數據</p>';
                return;
            }
            
            // 顯示高頻號碼
            let html = '';
            const gradientClasses = [
                'hf-ball--gradient-1',
                'hf-ball--gradient-2',
                'hf-ball--gradient-3',
                'hf-ball--gradient-4',
                'hf-ball--gradient-5',
                'hf-ball--gradient-6'
            ];
            top6Numbers.forEach((item, colorIndex) => {
                const gradientClass = gradientClasses[colorIndex] || gradientClasses[5];
                
                html += `
                    <div class="hf-top-item">
                        <span class="hf-ball hf-ball--xl ${gradientClass}">${item.number}</span>
                        <span class="hf-top-freq">${item.frequency}次</span>
                    </div>
                `;
            });
            
            displayDiv.innerHTML = html;
        }
        
        // 根據全局統計排名來排序（當頻率相同時使用）
        function sortByGlobalRank(num1, num2) {
            // 取得當前選擇的期數範圍
            const startPeriod = Number(document.getElementById('start-period').value);
            const endPeriod = parseInt(document.getElementById('end-period').value) || lotteryData.length;
            
            // 計算該範圍內的號碼頻率
            const numberFreq = {};
            for (let i = 1; i <= 49; i++) {
                numberFreq[i] = 0;
            }
            
            const startIndex = startPeriod - 1;
            const endIndex = endPeriod;
            const selectedData = lotteryData.slice(startIndex, endIndex);
            
            selectedData.forEach(row => {
                row.numbers.forEach(num => {
                    numberFreq[num]++;
                });
                numberFreq[row.extra_number]++;
            });
            
            // 比較兩個號碼的頻率
            const freq1 = numberFreq[num1] || 0;
            const freq2 = numberFreq[num2] || 0;
            
            if (freq2 !== freq1) {
                return freq2 - freq1; // 頻率高的排前面
            }
            
            // 如果頻率也相同，按號碼大小排序
            return num1 - num2;
        }

        // Anchor saved ranges to dates before any history preview or outcome calculation.
        function resolveHistoryRange(item) {
            if(!item.startDraw||!item.endDraw)return validRange(item.startPeriod,item.endPeriod);
            const si=lotteryData.findIndex(d=>d.draw_date===item.startDraw);
            const ei=lotteryData.findIndex(d=>d.draw_date===item.endDraw);
            if(si<0||ei<si){item.startPeriod=0;item.endPeriod=0;return false;}
            item.startPeriod=si+1;item.endPeriod=ei+1;return true;
        }

        // 載入歷史記錄項目
        function loadHistoryItem(index) {
            const item = filterHistory[index];
            if (!item) return;
            if(!resolveHistoryRange(item)){alert('此紀錄的選號日期不在目前資料集，無法核對。');return;}
            currentFilteredNumbers=[...item.filteredNumbers];
            restoreControls(item.controls,document.getElementById('statistics'));
            rankShowColdComplement=item.rankCold===true;
            updateSmartCoreOptions();
            restoreControls(item.controls,document.getElementById('statistics'));
            if(item.filterMode) document.getElementById('filter-mode-select').value = item.filterMode;
            if(item.drawModeInfo?.mode&&item.drawModeInfo.mode!=='unavailable') document.getElementById('draw-mode-select').value = item.drawModeInfo.mode==='fiveBankerFullMeal'?'banker':item.drawModeInfo.mode;
            if(['banker','fiveBankerFullMeal'].includes(item.drawModeInfo?.mode)){document.getElementById('banker-draw-count').value=String(item.drawModeInfo.bankers?.length||5);document.getElementById('runner-draw-count').value=String(item.drawModeInfo.runners?.length||1);}
            if(['banker','fiveBankerFullMeal'].includes(item.drawModeInfo?.mode)&&validStatsBankerDraft(item.drawModeInfo)){statsBankerDraft={bankers:[...item.drawModeInfo.bankers],runners:[...item.drawModeInfo.runners]};statsBankerNotice='已還原歷史膽／腳，可修改後重新生成。';}
            document.getElementById('mandel-draw-advanced').checked=!!item.drawModeInfo?.filterInfo?.advanced;
            currentMandelDrawPool=item.drawModeInfo?.mode==='mandel'?[...(item.drawModeInfo.selectedNumbers||[])]:null;
            updateDrawModeUI(false);
            updateFilterModeDescription(false);
            document.getElementById('smart-core-number').style.display=document.getElementById('smart-core-checkbox').checked?'inline-block':'none';
            if(item.drawModeInfo?.coreNumber)currentRandomCoreNumber=Number(item.drawModeInfo.coreNumber);
            const si = lotteryData.findIndex(d=>d.draw_date===item.startDraw);
            const ei = lotteryData.findIndex(d=>d.draw_date===item.endDraw);
            if(si>=0 && ei>=si){item.startPeriod=si+1;item.endPeriod=ei+1;}
            document.getElementById("start-period").value=item.startPeriod;
            document.getElementById("end-period").value=item.endPeriod;
            updateRangeInfo();
            updateStatsWithRange(item.startPeriod,item.endPeriod);
            
            // 更新當前篩選結果
            currentFilteredNumbers = [...item.filteredNumbers];
            window.currentPairResult = item.pairing || null;
            
            // 顯示結果區域
            const resultDiv = document.getElementById('high-frequency-result');
            resultDiv.style.display = 'block';
            
            // 更新篩選條件（包含篩選出數字的數量）
            const thresholdInfo = document.getElementById('filter-threshold-info');
            thresholdInfo.textContent = `期數範圍：第 ${item.startPeriod} 期 ~ 第 ${item.endPeriod} 期（共 ${item.endPeriod - item.startPeriod + 1} 期）｜最高出現次數：${item.maxFrequency} 次｜門檻值：${item.threshold} 次｜篩選出 ${item.filteredNumbers.length} 個號碼`;
            if(item.selectionSettings)thresholdInfo.textContent=`期數範圍：第 ${item.startPeriod} ~ ${item.endPeriod} 期｜${Selection.labels[item.filterMode]||'保存選號'}｜固定 ${item.filteredNumbers.length} 碼（原有保存號碼）`;
            if(item.pairing) thresholdInfo.textContent = `期數範圍：第 ${item.startPeriod} 期 ~ 第 ${item.endPeriod} 期｜排名＋搭配｜最終 ${item.filteredNumbers.length} 碼`;
            
            // 更新篩選出數字的數量
            const filteredNumbersCountDiv = document.getElementById('filtered-numbers-count');
            filteredNumbersCountDiv.textContent = `（共 ${item.filteredNumbers.length} 個）`;
            
            currentFilterContext = {startPeriod:item.startPeriod,endPeriod:item.endPeriod,maxFrequency:item.maxFrequency,threshold:item.threshold,filterMode:item.filterMode,selectionSettings:item.selectionSettings||null,dataAsOf:item.dataVersion};
            updateHistoricalCoverage(item.startPeriod,item.filteredNumbers,item.random6,item.drawModeInfo);

            const filteredNumbersDiv = document.getElementById('filtered-numbers');
            filteredNumbersDiv.innerHTML = item.filteredNumbers.map(num => 
                `<span class="hf-ball hf-ball--md hf-ball--primary">${num}</span>`
            ).join('');
            
            // 更新隨機 6 個號碼（Mandel 等多注模式需還原完整版面）
            const random6Div = document.getElementById('random-6-numbers');
            if (item.drawModeInfo && item.drawModeInfo.bets && (item.drawModeInfo.bets.length || item.drawModeInfo.mode==='mandel')) {
                const sel = item.drawModeInfo.selectedNumbers || item.filteredNumbers;
                const bets = item.drawModeInfo.bets;
                let h = '<div class="five-banker-info"><div class="five-banker-title">已保存選取號碼：</div><div class="five-banker-numbers">';
                sel.forEach(num => {
                    h += `<span class="hf-ball hf-ball--lg hf-ball--secondary">${num}</span>`;
                });
                h += '</div>';
                if(item.drawModeInfo.mode==='mandel')h += mandelFilterSummary(item.drawModeInfo.filterInfo)+buildMandelPrizeSummaryHtml(bets, item.startPeriod, {});
                h += '</div><div class="five-banker-bets-container">';
                bets.forEach((bet, index) => {
                    h += `<div class="five-banker-bet-row"><span class="five-banker-bet-label">第${index + 1}注</span><div class="five-banker-bet-numbers">`;
                    bet.numbers.forEach(num => {
                        h += `<span class="hf-ball hf-ball--md hf-ball--secondary">${num}</span>`;
                    });
                    h += '</div></div>';
                });
                h += '</div>';
                random6Div.innerHTML = h;
            } else {
                random6Div.innerHTML = item.random6.map(num =>
                    `<span class="hf-ball hf-ball--lg hf-ball--secondary">${num}</span>`
                ).join('');
            }

            if(item.pairing) filteredNumbersDiv.innerHTML = renderPairEvidence(item.pairing);
            if(item.drawModeInfo && item.drawModeInfo.mode === 'paired') {
                random6Div.innerHTML = renderPairedBets(item.drawModeInfo);
                document.getElementById('draw-result-title').textContent = `保留搭配 · ${item.drawModeInfo.bets.length} 注`;
            }
            if(item.drawModeInfo?.mode==='banker')random6Div.innerHTML=renderBankerDraw(item.drawModeInfo.bankers,item.drawModeInfo.runners);
            const modeLabels={single:'單式',complex:'複式',banker:'膽拖',smart:'聰明組合',smartComplex:'聰明組合＋複式',mandel:'Mandel 濃縮法',fiveBankerFullMeal:'5膽拖全餐',paired:'保留搭配',unavailable:'尚未生成'};
            document.getElementById('draw-result-title').textContent=(item.drawModeInfo?.filterInfo?.advanced?'Mandel 進階濃縮':modeLabels[item.drawModeInfo?.mode]||'保存號碼')+'（歷史原有注碼）';
            if(item.drawModeInfo?.randomBet)random6Div.innerHTML+='<div class="random-bet-section"><strong>額外隨機注：</strong>'+balls(item.drawModeInfo.randomBet)+'</div>';
            // 滾動到結果區域
            resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // 移除單筆歷史記錄
        function removeHistoryItem(index) {
            if (index < 0 || index >= filterHistory.length) {
                alert('無效的記錄索引！');
                return;
            }
            
            if (confirm('確定要移除這筆篩選歷史記錄嗎？')) {
                filterHistory.splice(index, 1);
                updateFilterHistoryDisplay();
            }
        }

        // 清除歷史記錄
        function clearFilterHistory() {
            if (filterHistory.length === 0) {
                alert('目前沒有歷史記錄！');
                return;
            }
            
            if (confirm('確定要清除所有篩選歷史記錄嗎？')) {
                filterHistory = [];
                updateFilterHistoryDisplay();
            }
        }

