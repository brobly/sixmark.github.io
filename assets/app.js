
        // 全局變量
        let selectedNumbers = [];
        const maxSelections = 20; // 最多選擇20個號碼

        // 膽腳投注變量
        let currentBettingMode = 'complex'; // 'complex' 或 'banker'
        let bankerNumbers = []; // 膽碼
        let runnerNumbers = []; // 腳碼
        const maxBankerNumbers = 5; // 最多5個膽碼

        /** 統計頁：'cooccurrence' 共現分析 | 'periodBalls' 各期開獎號碼 */
        let statsViewMode = 'cooccurrence';
        let statsStatsSwitchBound = false;

        // 預設投注組合
        const quickSelections = {
            hot: [3, 7, 11, 13, 20, 21, 22, 23, 24, 27, 30], // 熱門號碼
            custom1: [5, 6, 9, 13, 19, 25, 26, 30, 32, 35, 36, 39, 40, 44, 45, 46], // 組合一
            custom2: [4, 6, 12, 19, 25, 26, 27, 29, 32, 34, 46], // 組合二
            saved: [] // 用戶保存的組合
        };

        // 嵌入真實六合彩數據
        


        // 標籤切換功能
        function switchTab(tabName) {
            // 隱藏所有標籤頁
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            
            // 移除所有按鈕的active類別
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // 顯示選中的標籤頁
            document.getElementById(tabName).classList.add('active');
            document.querySelectorAll('.tab-button').forEach((b,i)=>b.classList.toggle('active',['results','statistics','verification'][i]===tabName));
            
            // 載入對應數據
            if (tabName === 'results') {
                loadResults();
            } else if (tabName === 'statistics') {
                // 初始化範圍選擇介面
                initializeRangeSelection();
                applyRangeSelection();
            } else if (tabName === 'verification') {
                // 初始化號碼選擇介面和範圍選擇
                initializeNumberSelection();
                initializeVerificationRangeSelection();
                // 如果是膽腳投注模式，也初始化膽腳網格
                if (currentBettingMode === 'banker') {
                    initializeBankerGrids();
                }
                // 預設載入統計分析結果
                loadVerification();
            }
        }

        // 載入開獎結果

        // 計算數字共現矩陣
        function calculateCoOccurrence(selectedData) {
            const coMatrix = {};
            
            // 初始化共現矩陣
            for (let i = 1; i <= 49; i++) {
                coMatrix[i] = {};
                for (let j = 1; j <= 49; j++) {
                    if (i !== j) coMatrix[i][j] = 0;
                }
            }
            
            // 計算共現次數
            selectedData.forEach(row => {
                const allNumbers = [...row.numbers, row.extra_number];
                
                // 對每一對數字計算共現
                for (let i = 0; i < allNumbers.length; i++) {
                    for (let j = i + 1; j < allNumbers.length; j++) {
                        const num1 = allNumbers[i];
                        const num2 = allNumbers[j];
                        coMatrix[num1][num2]++;
                        coMatrix[num2][num1]++;
                    }
                }
            });
            
            return coMatrix;
        }

        // 獲取與指定數字最常共現的其他數字
        function getTopCoOccurring(number, coMatrix, topN = 5) {
            const coOccurrences = [];
            
            for (let otherNum = 1; otherNum <= 49; otherNum++) {
                if (otherNum !== number) {
                    coOccurrences.push({
                        number: otherNum,
                        frequency: coMatrix[number][otherNum] || 0
                    });
                }
            }
            
            // 按頻率降序排序
            coOccurrences.sort((a, b) => b.frequency - a.frequency);
            
            return coOccurrences.slice(0, topN);
        }

        // 初始化範圍選擇介面
        function initializeRangeSelection() {
            // 設置最大期數限制
            const maxPeriods = lotteryData.length;
            document.getElementById('start-period').max = maxPeriods;
            document.getElementById('end-period').max = maxPeriods;

            // 添加輸入事件監聽器
            document.getElementById('start-period').addEventListener('input', updateRangeInfo);
            document.getElementById('end-period').addEventListener('input', updateRangeInfo);

            // 初始化範圍資訊
            updateRangeInfo();

            if (!statsStatsSwitchBound) {
                statsStatsSwitchBound = true;
                document.getElementById('stats-content').addEventListener('change', function (e) {
                    if (e.target && e.target.id === 'stats-view-mode-switch') {
                        statsViewMode = e.target.checked ? 'periodBalls' : 'cooccurrence';
                        const sp = Number(document.getElementById('start-period').value);
                        const ep = Number(document.getElementById('end-period').value);
                        updateStatsWithRange(sp, ep);
                    }
                });
            }
        }

        // 設置快速範圍選擇
        function setQuickRange(start, end) {
            document.getElementById('start-period').value = start;
            document.getElementById('end-period').value = end;
            updateRangeInfo();
            // 自動執行篩選並更新隨機核心號碼
            filterHighFrequencyNumbers();
        }

        const SHIFT_RANGE_STEP = 1;

        // 下期：將期數範圍整段向後平移 1 期
        function shiftRangeForward(type) {
            let startInput, endInput, updateFunc;

            if (type === 'stats') {
                startInput = document.getElementById('start-period');
                endInput = document.getElementById('end-period');
                updateFunc = updateRangeInfo;
            } else if (type === 'verification') {
                startInput = document.getElementById('verification-start-period');
                endInput = document.getElementById('verification-end-period');
                updateFunc = updateVerificationRangeInfo;
            } else {
                return;
            }

            const currentStart = Number(startInput.value);
            const currentEnd = Number(endInput.value);
            if(!validRange(currentStart,currentEnd)){alert('請先輸入有效整數期數範圍。');return;}
            const maxPeriods = lotteryData.length;

            const newStart = currentStart + SHIFT_RANGE_STEP;
            const newEnd = currentEnd + SHIFT_RANGE_STEP;

            if (newEnd > maxPeriods) {
                alert(`已達到最大期數範圍！目前最大期數為 ${maxPeriods}`);
                return;
            }

            startInput.value = newStart;
            endInput.value = newEnd;

            updateFunc();

            if (type === 'verification' && document.getElementById('verification').classList.contains('active')) {
                loadVerification();
            }

            if(type==='stats') filterHighFrequencyNumbers();
        }

        // 上期：將期數範圍整段向前平移 1 期（與下期相反）
        function shiftRangeBackward(type) {
            let startInput, endInput, updateFunc;

            if (type === 'stats') {
                startInput = document.getElementById('start-period');
                endInput = document.getElementById('end-period');
                updateFunc = updateRangeInfo;
            } else if (type === 'verification') {
                startInput = document.getElementById('verification-start-period');
                endInput = document.getElementById('verification-end-period');
                updateFunc = updateVerificationRangeInfo;
            } else {
                return;
            }

            const currentStart = Number(startInput.value);
            const currentEnd = Number(endInput.value);
            if(!validRange(currentStart,currentEnd)){alert('請先輸入有效整數期數範圍。');return;}

            const newStart = currentStart - SHIFT_RANGE_STEP;
            const newEnd = currentEnd - SHIFT_RANGE_STEP;

            if (newStart < 1) {
                alert('已達最早期數範圍！開始期數不能小於第 1 期');
                return;
            }

            startInput.value = newStart;
            endInput.value = newEnd;

            updateFunc();

            if (type === 'verification' && document.getElementById('verification').classList.contains('active')) {
                loadVerification();
            }

            if(type==='stats') filterHighFrequencyNumbers();
        }

        // 更新篩選模式說明
        function updateFilterModeDescription(refresh = true) {
            const modeSelect = document.getElementById('filter-mode-select');
            const countSelect = document.getElementById('filter-count-select');
            
            const mode = modeSelect.value;

            if (mode !== 'rank') {
                rankShowColdComplement = false;
            }
            
            // 預設模式下禁用數量選擇
            if (mode === 'default') {
                countSelect.disabled = true;
                countSelect.style.opacity = '0.5';
            } else {
                countSelect.disabled = false;
                countSelect.style.opacity = '1';
            }

            updateRankColdToggleUI();
            if(refresh && document.getElementById('high-frequency-result').style.display === 'block') filterHighFrequencyNumbers();
        }

        /** 歷史覆蓋分析區：收起 / 展開（偏好存於 localStorage） */
        function toggleProbabilityPanel() {
            const panel = document.getElementById('probability-panel');
            const btn = document.getElementById('probability-toggle-btn');
            if (!panel || !btn) return;
            const collapsed = panel.classList.toggle('hf-probability-panel--collapsed');
            btn.textContent = collapsed ? '展開' : '收起';
            btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
            try {
                Store.rawSet('hfProbabilityPanelCollapsed', collapsed ? '1' : '0');
            } catch (e) {}
        }

        function applyProbabilityPanelCollapsedPreference() {
            let pref = null;
            try {
                pref = Store.rawGet('hfProbabilityPanelCollapsed');
            } catch (e) {
                return;
            }
            if (pref !== '1') return;
            const panel = document.getElementById('probability-panel');
            const btn = document.getElementById('probability-toggle-btn');
            if (!panel || !btn) return;
            panel.classList.add('hf-probability-panel--collapsed');
            btn.textContent = '展開';
            btn.setAttribute('aria-expanded', 'false');
        }

        // 更新範圍資訊顯示
        function updateRangeInfo() {
            const startPeriod = Number(document.getElementById('start-period').value);
            const endPeriod = Number(document.getElementById('end-period').value);

            const periodCount = Math.max(0, endPeriod - startPeriod + 1);

            document.getElementById('period-count').textContent = `統計期數：${periodCount}期`;
            document.getElementById('period-range').textContent = `範圍：第${startPeriod}期 至 第${endPeriod}期`;

            // 驗證範圍
            const applyBtn = document.querySelector('.apply-btn');
            if (!validRange(startPeriod, endPeriod)) {
                applyBtn.disabled = true;
                applyBtn.textContent = '❌ 範圍無效';
            } else if (endPeriod > lotteryData.length) {
                applyBtn.disabled = true;
                applyBtn.textContent = `❌ 超出資料範圍 (最大${lotteryData.length}期)`;
            } else {
                applyBtn.disabled = false;
                applyBtn.textContent = '🔍 應用範圍統計';
            }
        }

        /** 單期開獎：六個正選（排序）+ 特別號，依排名號碼高亮球色 */
        function buildDrawBallsHtml(row, rankNumber) {
            const sortedRegular = [...row.numbers].sort((a, b) => a - b);
            const extra = row.extra_number;
            let html = '';
            sortedRegular.forEach((n) => {
                const cls = n === rankNumber
                    ? 'hf-ball hf-ball--lg hf-ball--primary-glow'
                    : 'hf-ball hf-ball--lg hf-ball--secondary';
                html += `<span class="${cls}">${n}</span>`;
            });
            const extraCls = extra === rankNumber
                ? 'hf-ball hf-ball--lg hf-ball--primary-glow'
                : 'hf-ball hf-ball--lg hf-ball--warning';
            html += `<span class="${extraCls}">${extra}</span>`;
            return html;
        }

        // 應用範圍選擇
        function applyRangeSelection() {
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

            updateStatsWithRange(startPeriod, endPeriod);
        }

        // 更新統計數據（範圍版本）
        function updateStatsWithRange(startPeriod, endPeriod) {
            const statsContent = document.getElementById('stats-content');
            if(!validRange(startPeriod,endPeriod)){statsContent.textContent='請輸入有效期數範圍。';return;}

            try {
                // 計算號碼統計
                const numberFreq = {};

                // 初始化1-49的頻率為0
                for (let i = 1; i <= 49; i++) {
                    numberFreq[i] = 0;
                }

                // 計算選定範圍內的號碼頻率
                // 注意：陣列索引從0開始，但期數從1開始，所以需要調整
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

                // 共現模式才計算共現矩陣
                const coMatrix = statsViewMode === 'cooccurrence'
                    ? calculateCoOccurrence(selectedData)
                    : null;

                // 轉換為陣列並按頻率排序
                const sortedNumbers = Object.entries(numberFreq)
                    .map(([num, freq]) => ({
                        number: parseInt(num),
                        frequency: freq
                    }))
                    .sort((a, b) => b.frequency - a.frequency);

                // 生成統計網格
                let html = '<div class="stats-grid">';

                sortedNumbers.forEach((item, index) => {
                    const rank = index + 1;
                    let rankClass = '';

                    if (rank <= 7) rankClass = `rank-${rank}`;
                    else if (rank <= 14) rankClass = 'rank-7';
                    else rankClass = 'rank-7';

                    html += `
                        <div class="number-stat">
                            <div class="stat-header">
                                <div class="stat-number">${item.number}</div>
                                <div class="stat-info">
                                    <div class="stat-frequency">${item.frequency}次</div>
                                    <div class="stat-rank ${rankClass}">第${rank}名</div>
                                </div>
                            </div>
                    `;

                    if (statsViewMode === 'cooccurrence') {
                        const topCoOccurring = getTopCoOccurring(item.number, coMatrix, 10);

                        html += `
                            <details class="co-occurrence"><summary>查看共現號碼</summary>
                                <div class="co-occurrence-title">常與以下數字同時出現：</div>
                                <div class="co-numbers">
                        `;

                        if (topCoOccurring.length > 0) {
                            topCoOccurring.forEach(co => {
                                html += `
                                    <div class="co-number">
                                        <div class="co-number-ball">${co.number}</div>
                                        <span class="co-frequency">${co.frequency}次</span>
                                    </div>
                                `;
                            });
                        } else {
                            html += '<div class="co-number"><span class="co-frequency">暫無共現數據</span></div>';
                        }

                        html += `
                                </div>
                            </details>
                        `;
                    } else {
                        html += `<div class="stat-draw-appearance">`;
                        html += `<div class="co-occurrence-title">範圍內出現期數：</div>`;

                        const matchingRows = [];
                        selectedData.forEach((row, i) => {
                            if (row.numbers.includes(item.number) || row.extra_number === item.number) {
                                matchingRows.push({ row, relPeriod: startPeriod + i });
                            }
                        });

                        if (matchingRows.length === 0) {
                            html += `<div class="stat-draw-empty">本範圍內未出現此號碼</div>`;
                        } else {
                            matchingRows.forEach(({ row, relPeriod }) => {
                                const ballsHtml = buildDrawBallsHtml(row, item.number);
                                html += `
                                    <div class="stat-draw-row">
                                        <span class="stat-draw-period-label">第${relPeriod}期(${row.draw_number} - ${row.draw_date})</span>
                                        <div class="stat-draw-balls">${ballsHtml}</div>
                                    </div>
                                `;
                            });
                        }

                        html += `</div>`;
                    }

                    html += `</div>`;
                });

                html += '</div>';

                const periodCount = endPeriod - startPeriod + 1;
                const switchChecked = statsViewMode === 'periodBalls' ? 'checked' : '';
                const summaryLine1 = statsViewMode === 'cooccurrence'
                    ? `第${startPeriod}期至第${endPeriod}期號碼出現頻率統計與共現分析 (包含特別號)`
                    : `第${startPeriod}期至第${endPeriod}期號碼出現頻率統計 — 各名顯示該號於範圍內出現之開獎期及該期全部號碼 (包含特別號)`;
                const summaryLine2 = statsViewMode === 'cooccurrence'
                    ? `統計期數：${periodCount}期 | 資料範圍：${selectedData.length}筆開獎記錄`
                    : `統計期數：${periodCount}期 | 資料範圍：${selectedData.length}筆開獎記錄 | 排名號碼以藍色標示`;

                statsContent.innerHTML = `
                    <div class="stats-summary-toolbar">
                        <p class="stats-summary">
                            ${summaryLine1}<br><small>${selectedData[0].draw_number} (${selectedData[0].draw_date}) 至 ${selectedData[selectedData.length-1].draw_number} (${selectedData[selectedData.length-1].draw_date})</small><br>
                            <small>${summaryLine2}</small>
                        </p>
                        <div class="stats-view-toggle-wrap">
                            <span class="stats-view-toggle-label">共現</span>
                            <label class="stats-switch" title="切換：共現分析 / 各期開獎號碼">
                                <input type="checkbox" id="stats-view-mode-switch" ${switchChecked}>
                                <span class="stats-switch-slider"></span>
                            </label>
                            <span class="stats-view-toggle-label">開獎期</span>
                        </div>
                    </div>
                    ${html}
                `;

            } catch (error) {
                console.error('Error updating stats:', error);
                statsContent.innerHTML = '<div class="error">載入統計數據時出現錯誤</div>';
            }
        }

        // 保持向後相容性的舊版 updateStats 函數
        function updateStats(periods) {
            updateStatsWithRange(1, periods);
        }

        // 投注模式切換
        function switchBettingMode(mode) {
            currentBettingMode = mode;

            // 更新標籤頁樣式
            document.querySelectorAll('.mode-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.mode-tab').forEach((b,i)=>b.classList.toggle('active',['complex','banker','mandel'][i]===mode));

            // 隱藏所有模式
            document.getElementById('complex-betting-mode').classList.add('hidden');
            document.getElementById('banker-betting-mode').classList.add('hidden');
            document.getElementById('mandel-betting-mode').classList.add('hidden');

            // 顯示對應模式
            if (mode === 'complex') {
                document.getElementById('complex-betting-mode').classList.remove('hidden');
            } else if (mode === 'banker') {
                document.getElementById('banker-betting-mode').classList.remove('hidden');
                initializeBankerGrids();
            } else if (mode === 'mandel') {
                document.getElementById('mandel-betting-mode').classList.remove('hidden');
                initializeMandel();
            }

            // 更新統計分析
            if (document.getElementById('verification').classList.contains('active')) {
                loadVerification();
            }
        }

        // 初始化膽腳投注網格
        function initializeBankerGrids() {
            const bankerGrid = document.getElementById('banker-grid');
            const runnerGrid = document.getElementById('runner-grid');

            bankerGrid.innerHTML = '';
            runnerGrid.innerHTML = '';

            // 生成膽碼網格
            for (let i = 1; i <= 49; i++) {
                const bankerCell = document.createElement('button');
                bankerCell.className = 'number-cell';
                bankerCell.textContent = i;
                bankerCell.onclick = () => toggleBankerNumber(i);
                bankerGrid.appendChild(bankerCell);

                const runnerCell = document.createElement('button');
                runnerCell.className = 'number-cell';
                runnerCell.textContent = i;
                runnerCell.onclick = () => toggleRunnerNumber(i);
                runnerGrid.appendChild(runnerCell);
            }

            updateBankerDisplay();
        }

        // 切換膽碼選擇
        function toggleBankerNumber(number) {
            const index = bankerNumbers.indexOf(number);

            if (index > -1) {
                // 取消選擇膽碼
                bankerNumbers.splice(index, 1);
            } else {
                // 選擇膽碼
                if (bankerNumbers.length >= maxBankerNumbers) {
                    alert(`膽碼最多只能選擇${maxBankerNumbers}個！`);
                    return;
                }

                // 檢查是否已在腳碼中
                if (runnerNumbers.includes(number)) {
                    alert('該號碼已在腳碼中，不能重複選擇！');
                    return;
                }

                bankerNumbers.push(number);
            }

            updateBankerDisplay();
            updateBankerStatus();
        }

        // 切換腳碼選擇
        function toggleRunnerNumber(number) {
            const index = runnerNumbers.indexOf(number);

            if (index > -1) {
                // 取消選擇腳碼
                runnerNumbers.splice(index, 1);
            } else {
                // 選擇腳碼
                // 檢查是否已在膽碼中
                if (bankerNumbers.includes(number)) {
                    alert('該號碼已在膽碼中，不能重複選擇！');
                    return;
                }

                runnerNumbers.push(number);
            }

            updateBankerDisplay();
            updateBankerStatus();
        }

        // 更新膽腳投注顯示
        function updateBankerDisplay() {
            // 更新膽碼顯示
            const bankerCells = document.querySelectorAll('#banker-grid .number-cell');
            bankerCells.forEach(cell => {
                const number = parseInt(cell.textContent);
                if (bankerNumbers.includes(number)) {
                    cell.classList.add('selected');
                } else {
                    cell.classList.remove('selected');
                }

                // 如果在腳碼中，禁用膽碼選擇
                if (runnerNumbers.includes(number)) {
                    cell.classList.add('disabled');
                } else {
                    cell.classList.remove('disabled');
                }
            });

            // 更新腳碼顯示
            const runnerCells = document.querySelectorAll('#runner-grid .number-cell');
            runnerCells.forEach(cell => {
                const number = parseInt(cell.textContent);
                if (runnerNumbers.includes(number)) {
                    cell.classList.add('selected');
                } else {
                    cell.classList.remove('selected');
                }

                // 如果在膽碼中，禁用腳碼選擇
                if (bankerNumbers.includes(number)) {
                    cell.classList.add('disabled');
                } else {
                    cell.classList.remove('disabled');
                }
            });
        }

        // 更新膽腳投注狀態
        function updateBankerStatus() {
            const bankerCount = bankerNumbers.length;
            const runnerCount = runnerNumbers.length;

            // 計算組合數：C(腳碼數, 6-膽碼數)
            let combinationCount = 0;
            if (bankerCount >= 1 && bankerCount <= 5 && runnerCount >= 1) {
                const needFromRunner = 6 - bankerCount;
                if (needFromRunner <= runnerCount) {
                    combinationCount = getCombinationCount(runnerCount, needFromRunner);
                }
            }

            document.getElementById('banker-count').textContent = `膽碼：${bankerCount}個`;
            document.getElementById('runner-count').textContent = `腳碼：${runnerCount}個`;
            document.getElementById('banker-combination-count').textContent = `總組合：${combinationCount.toLocaleString()}注`;

            // 如果當前在核對中獎標籤頁，自動更新統計分析
            if (document.getElementById('verification').classList.contains('active')) {
                loadVerification();
            }
        }

        // 初始化號碼選擇介面
        function initializeNumberSelection() {
            const numberGrid = document.getElementById('number-grid');
            numberGrid.innerHTML = '';

            // 生成1-49的號碼格子
            for (let i = 1; i <= 49; i++) {
                const numberCell = document.createElement('button');
                numberCell.className = 'number-cell';
                numberCell.textContent = i;
                numberCell.onclick = () => toggleNumber(i);
                numberGrid.appendChild(numberCell);
            }

            // 載入保存的選擇
            loadSavedSelection();
            updateNumberDisplay();
            updateSelectionStatus();
        }

        // Fisher-Yates 洗牌
        function shuffleArray(arr) {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        }

        // 複式投注隨機選號
        function complexRandomSelect() {
            const selectEl = document.getElementById('bet-count-select');
            if (!selectEl) { console.error('bet-count-select not found'); return; }
            const raw = parseInt(selectEl.value, 10);
            const count = Math.max(6, Math.min(maxSelections, isNaN(raw) ? 10 : raw));

            const pool = [];
            for (let i = 1; i <= 49; i++) pool.push(i);
            shuffleArray(pool);
            selectedNumbers = pool.slice(0, count).sort((a, b) => a - b);
            updateNumberDisplay();
            updateSelectionStatus();
        }

        // 膽碼隨機選號
        function bankerRandomSelect() {
            const selectEl = document.getElementById('banker-count-select');
            if (!selectEl) { console.error('banker-count-select not found'); return; }
            const raw = parseInt(selectEl.value, 10);
            const count = Math.max(1, Math.min(maxBankerNumbers, isNaN(raw) ? 2 : raw));

            const pool = [];
            for (let i = 1; i <= 49; i++) {
                if (!runnerNumbers.includes(i)) pool.push(i);
            }
            shuffleArray(pool);
            bankerNumbers = pool.slice(0, Math.min(count, pool.length)).sort((a, b) => a - b);
            updateBankerDisplay();
            updateBankerStatus();
        }

        // 腳碼隨機選號
        function runnerRandomSelect() {
            const selectEl = document.getElementById('runner-count-select');
            if (!selectEl) { console.error('runner-count-select not found'); return; }
            const raw = parseInt(selectEl.value, 10);
            const count = Math.max(1, Math.min(14, isNaN(raw) ? 8 : raw));

            const pool = [];
            for (let i = 1; i <= 49; i++) {
                if (!bankerNumbers.includes(i)) pool.push(i);
            }
            shuffleArray(pool);
            runnerNumbers = pool.slice(0, Math.min(count, pool.length)).sort((a, b) => a - b);
            updateBankerDisplay();
            updateBankerStatus();
        }

        // 切換號碼選擇狀態
        function toggleNumber(number) {
            const index = selectedNumbers.indexOf(number);

            if (index > -1) {
                // 取消選擇
                selectedNumbers.splice(index, 1);
            } else {
                // 選擇號碼
                if (selectedNumbers.length < maxSelections) {
                    selectedNumbers.push(number);
                } else {
                    alert(`最多只能選擇${maxSelections}個號碼！`);
                    return;
                }
            }

            updateNumberDisplay();
            updateSelectionStatus();
        }

        // 更新號碼顯示狀態（僅限複式投注網格）
        function updateNumberDisplay() {
            const numberCells = document.querySelectorAll('#number-grid .number-cell');
            numberCells.forEach(cell => {
                const number = parseInt(cell.textContent, 10);
                if (selectedNumbers.includes(number)) {
                    cell.classList.add('selected');
                } else {
                    cell.classList.remove('selected');
                }
            });
        }

        // 更新選擇狀態顯示
        function updateSelectionStatus() {
            const selectedCount = selectedNumbers.length;
            const combinationCount = selectedCount >= 6 ? getCombinationCount(selectedCount, 6) : 0;

            document.getElementById('selected-count').textContent = `已選擇：${selectedCount}個號碼`;
            document.getElementById('combination-count').textContent = `可組合：${combinationCount.toLocaleString()}注`;

            // 如果當前在核對中獎標籤頁，自動更新統計分析
            if (document.getElementById('verification').classList.contains('active')) {
                loadVerification();
            }
        }

        // 計算組合數
        function getCombinationCount(n, r) {
            if (n < r) return 0;
            if (r === 0 || r === n) return 1;

            let result = 1;
            for (let i = 0; i < r; i++) {
                result = result * (n - i) / (i + 1);
            }
            return Math.round(result);
        }

        // 重置選擇
        function resetSelection() {
            if (currentBettingMode === 'banker') {
                bankerNumbers = [];
                runnerNumbers = [];
                updateBankerDisplay();
                updateBankerStatus();
            } else if (currentBettingMode === 'mandel') {
                mandelClearAll();
            } else {
                selectedNumbers = [];
                updateNumberDisplay();
                updateSelectionStatus();
            }
        }

        // 保存選擇到localStorage
        function saveSelection() {
            if(currentBettingMode==='mandel'){saveSet();return;}
            if (currentBettingMode === 'banker') {
                if (bankerNumbers.length === 0 && runnerNumbers.length === 0) {
                    alert('請先選擇膽碼和腳碼！');
                    return;
                }

                const bankerData = {
                    mode: 'banker',
                    bankerNumbers: [...bankerNumbers],
                    runnerNumbers: [...runnerNumbers]
                };
                if(!Store.rawSet('savedBankerNumbers', JSON.stringify(bankerData))){alert('瀏覽器未能儲存，請匯出備份。');return;}
                alert(`已保存膽腳投注組合到「我的保存」！`);
            } else {
                if (selectedNumbers.length === 0) {
                    // 如果沒有手動選擇號碼，保存當前統計分析的熱門號碼
                    const startPeriod = Number(document.getElementById('verification-start-period').value);
                    const endPeriod = Number(document.getElementById('verification-end-period').value);
                    
                    if(!validRange(startPeriod,endPeriod)){alert('請先輸入有效期數範圍。');return;}
                    const startIndex = startPeriod - 1;
                    const endIndex = endPeriod;
                    const analysisData = lotteryData.slice(startIndex, endIndex);
                    const numberFreq = {};

                    // 初始化1-49的頻率為0
                    for (let i = 1; i <= 49; i++) {
                        numberFreq[i] = 0;
                    }

                    // 計算號碼頻率（包含特別號）
                    analysisData.forEach(row => {
                        row.numbers.forEach(num => {
                            numberFreq[num]++;
                        });
                        // 特別號也計入統計
                        numberFreq[row.extra_number]++;
                    });

                    // 轉換為陣列並按頻率排序，取前10名
                    const sortedNumbers = Object.entries(numberFreq)
                        .map(([num, freq]) => ({
                            number: parseInt(num),
                            frequency: freq
                        }))
                        .sort((a, b) => b.frequency - a.frequency)
                        .slice(0, 10);

                    const analysisNumbers = sortedNumbers.map(item => item.number);
                    
                    if(!Store.rawSet('savedLotteryNumbers', JSON.stringify(analysisNumbers))){alert('瀏覽器未能儲存，請匯出備份。');return;}
                    quickSelections.saved = [...analysisNumbers];
                    alert(`已保存統計分析的${analysisNumbers.length}個熱門號碼到「我的保存」！\n號碼：${analysisNumbers.sort((a, b) => a - b).join(', ')}`);
                } else {
                    if(!Store.rawSet('savedLotteryNumbers', JSON.stringify(selectedNumbers))){alert('瀏覽器未能儲存，請匯出備份。');return;}
                    quickSelections.saved = [...selectedNumbers];
                    alert(`已保存${selectedNumbers.length}個號碼到「我的保存」！`);
                }
            }
        }

        // 載入保存的選擇
        function loadSavedSelection() {
            const saved = Store.rawGet('savedLotteryNumbers');
            if (saved) {
                const parsed=safeNumbersParse(saved);
                quickSelections.saved=Array.isArray(parsed)?parsed:[];
            }
        }

        // 載入保存的膽腳投注
        function loadSavedBankerSelection() {
            const saved = Store.rawGet('savedBankerNumbers');
            if (saved) {
                const parsed=safeNumbersParse(saved);
                return Array.isArray(parsed)?null:parsed;
            }
            return null;
        }

        // 快速選擇預設組合
        function loadQuickSelection(type) {
            if(currentBettingMode==='mandel'){alert('請使用「已保存號碼組」載入濃縮組合。');return;}
            if (currentBettingMode === 'banker') {
                if (type === 'saved') {
                    const savedBanker = loadSavedBankerSelection();
                    if (!savedBanker) {
                        alert('尚未保存任何膽腳投注組合！');
                        return;
                    }
                    bankerNumbers = [...savedBanker.bankerNumbers];
                    runnerNumbers = [...savedBanker.runnerNumbers];
                    updateBankerDisplay();
                    updateBankerStatus();
                } else {
                    // 為膽腳投注模式適配其他快速選擇
                    const numbers = quickSelections[type];
                    if (!numbers || numbers.length === 0) {
                        alert('該組合暫無數據！');
                        return;
                    }

                    // 將前3個作為膽碼，其餘作為腳碼
                    bankerNumbers = numbers.slice(0, Math.min(3, numbers.length));
                    runnerNumbers = numbers.slice(3);

                    // 如果腳碼不足，將部分膽碼移到腳碼
                    if (runnerNumbers.length === 0 && bankerNumbers.length > 1) {
                        runnerNumbers = bankerNumbers.slice(1);
                        bankerNumbers = bankerNumbers.slice(0, 1);
                    }

                    updateBankerDisplay();
                    updateBankerStatus();
                }
            } else {
                if (type === 'saved') {
                    // 從 localStorage 重新載入保存的號碼
                    const saved = Store.rawGet('savedLotteryNumbers');
                    if (!saved) {
                        alert('尚未保存任何號碼組合！');
                        return;
                    }
                    const savedNumbers = safeNumbersParse(saved);
                    if(!Engine.validNumbers(savedNumbers,1,20)){alert('保存號碼格式無效。');return;}
                    quickSelections.saved = [...savedNumbers];
                    selectedNumbers = [...savedNumbers];
                    updateNumberDisplay();
                    updateSelectionStatus();
                    alert(`已載入保存的${savedNumbers.length}個號碼：${savedNumbers.sort((a, b) => a - b).join(', ')}`);
                } else {
                    const numbers = quickSelections[type];
                    if (!numbers || numbers.length === 0) {
                        alert('該組合暫無數據！');
                        return;
                    }

                    selectedNumbers = [...numbers];
                    updateNumberDisplay();
                    updateSelectionStatus(); // 這會自動觸發統計分析更新
                }
            }
        }

        // 初始化核對中獎頁面的範圍選擇介面
        function initializeVerificationRangeSelection() {
            // 設置最大期數限制
            const maxPeriods = lotteryData.length;
            document.getElementById('verification-start-period').max = maxPeriods;
            document.getElementById('verification-end-period').max = maxPeriods;

            // 添加輸入事件監聽器
            document.getElementById('verification-start-period').addEventListener('input', updateVerificationRangeInfo);
            document.getElementById('verification-end-period').addEventListener('input', updateVerificationRangeInfo);

            // 初始化範圍資訊
            updateVerificationRangeInfo();
        }

        // 設置核對中獎頁面的快速範圍選擇
        function setVerificationQuickRange(start, end) {
            document.getElementById('verification-start-period').value = start;
            document.getElementById('verification-end-period').value = end;
            updateVerificationRangeInfo();

            // 立即更新統計分析（快速選擇不需要延遲）
            if (document.getElementById('verification').classList.contains('active')) {
                loadVerification();
            }
        }

        // 更新核對中獎頁面的範圍資訊顯示
        function updateVerificationRangeInfo() {
            const startPeriod = Number(document.getElementById('verification-start-period').value);
            const endPeriod = Number(document.getElementById('verification-end-period').value);

            const periodCount = Math.max(0, endPeriod - startPeriod + 1);

            document.getElementById('verification-period-count').textContent = `統計期數：${periodCount}期`;
            document.getElementById('verification-period-range').textContent = `範圍：第${startPeriod}期 至 第${endPeriod}期`;
        }

        // 新的複式中獎計算函數

        // 顯示派彩獎金彈窗

        // 關閉派彩獎金彈窗
        function closeWinningsModal() {
            document.getElementById('winnings-modal').style.display = 'none';
        }

        // 點擊彈窗外部關閉
        window.onclick = function(event) {
            const modal = document.getElementById('winnings-modal');
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        }

        // 計算組合數（從n個數字中選r個的組合數）
        function getCombinations(arr, size) {
            function combine(start, combo) {
                if (combo.length === size) {
                    return [combo.slice()];
                }
                
                let combinations = [];
                for (let i = start; i < arr.length; i++) {
                    combo.push(arr[i]);
                    combinations = combinations.concat(combine(i + 1, combo));
                    combo.pop();
                }
                return combinations;
            }
            
            return combine(0, []);
        }

        // 生成膽腳投注組合
        function generateBankerCombinations(bankerNumbers, runnerNumbers) {
            const needFromRunner = 6 - bankerNumbers.length;
            const runnerCombinations = getCombinations(runnerNumbers, needFromRunner);

            return runnerCombinations.map(runnerCombo => {
                return [...bankerNumbers, ...runnerCombo].sort((a, b) => a - b);
            });
        }

        // 複式投注計算功能

        // 核對中獎功能 - 統計分析

        // 頁面載入完成後初始化
        document.addEventListener('DOMContentLoaded', function() {
            loadResults();
            // 如果當前在統計標籤頁，初始化範圍選擇
            if (document.getElementById('statistics').classList.contains('active')) {
                initializeRangeSelection();
            }
            updateFilterModeDescription();
            applyProbabilityPanelCollapsedPreference();
            // 如果當前在核對中獎標籤頁，初始化號碼選擇和範圍選擇
            if (document.getElementById('verification').classList.contains('active')) {
                initializeNumberSelection();
                initializeVerificationRangeSelection();
                // 如果是膽腳投注模式，也初始化膽腳網格
                if (currentBettingMode === 'banker') {
                    initializeBankerGrids();
                }
                loadVerification();
            }
            // Mandel 已整合到核對中獎頁面內
        });

