        // ========================================
        // Mandel 組合濃縮法功能
        // ========================================

        let mandelSelected = [];
        let mandelCombinations = [];
        let mandelFilterInfo = null;
        let mandelAdvancedEnabled = false;
        let mandelTargetV = 15;
        let mandelCombosExpanded = false;

        // 本版確定性貪心演算法的實測注數；不宣稱最少注數。
        const MANDEL_ESTIMATE_TABLE = {
            7: 6, 8: 12, 9: 34, 10: 56, 11: 110, 12: 172,
            13: 306, 14: 483, 15: 726, 16: 840, 17: 1309, 18: 1811
        };

        // The visible selector is authoritative, including programmatic/browser restores.
        function syncMandelTarget() {
            const select = document.getElementById('mandel-v-select');
            const value = Number(select?.value);
            const target = Number.isInteger(value) && value >= 7 && value <= 18 ? value : mandelTargetV;
            if (select) select.value = String(target);
            const advanced=!!document.getElementById('mandel-advanced')?.checked;
            if (target !== mandelTargetV || mandelSelected.length > target || advanced!==mandelAdvancedEnabled) {
                invalidateMandel();
                mandelTargetV = target;
                mandelAdvancedEnabled = advanced;
                mandelSelected = mandelSelected.slice(0, target);
            }
            return target;
        }

        function initializeMandel() {
            const grid = document.getElementById('mandel-grid');
            if (!grid) return;
            syncMandelTarget();
            updateMandelEstimate();
            if (grid.children.length > 0) { updateMandelUI(); return; }

            let html = '';
            for (let i = 1; i <= 49; i++) {
                html += `<div class="number-cell" data-num="${i}" onclick="toggleMandelNum(${i})">${i}</div>`;
            }
            grid.innerHTML = html;
            updateMandelUI();
        }

        function onMandelVChange() {
            syncMandelTarget();
            updateMandelUI();
        }

        function onMandelAdvancedChange(){
            syncMandelTarget();updateMandelUI();
            if(mandelSelected.length===mandelTargetV)return mandelGenerate();
        }
        function mandelFilterSummary(info, compact=false){
            if(!info?.advanced)return '';
            return `<div class="mandel-filter-summary"><strong>進階版：同區段最多3碼</strong><p>濃縮原有 ${info.originalCount} 注 → 剔除 ${info.removedCount} 注 → 保留 ${info.retainedCount} 注；成本 $${(info.retainedCount*10).toLocaleString()}。</p>${compact?'':'<p>區段：1–9、10–19、20–29、30–39、40–49。過濾後不再提供原本的五元組覆蓋／至少三獎保證。</p>'}${info.retainedCount===0?'<p>所有濃縮注碼均被剔除，沒有可投注的組合。可更改選號或關閉進階過濾。</p>':''}</div>`;
        }

        function updateMandelEstimate() {
            const est = MANDEL_ESTIMATE_TABLE[mandelTargetV] || '?';
            const cost = typeof est === 'number' ? (est * 10).toLocaleString() : '?';
            const badge = document.getElementById('mandel-estimate');
            if (badge) badge.textContent = `${mandelAdvancedEnabled?'過濾前：':'本版演算法 '}${est} 注 · $${cost}${mandelAdvancedEnabled?'；保留注數以生成結果為準':''}`;
        }

        function toggleMandelNum(num) {
            syncMandelTarget();
            const idx = mandelSelected.indexOf(num);
            if(idx<0&&mandelSelected.length>=mandelTargetV)return;
            invalidateMandel();
            if (idx >= 0) {
                mandelSelected.splice(idx, 1);
            } else if (mandelSelected.length < mandelTargetV) {
                mandelSelected.push(num);
            } else {
                return;
            }
            mandelSelected.sort((a, b) => a - b);
            updateMandelUI();
        }

        function updateMandelUI() {
            syncMandelTarget();
            updateMandelEstimate();
            document.querySelectorAll('#mandel-grid .number-cell').forEach(cell => {
                const n = parseInt(cell.dataset.num);
                cell.classList.toggle('selected', mandelSelected.includes(n));
            });
            const countEl = document.getElementById('mandel-count');
            if (countEl) countEl.textContent = `已選：${mandelSelected.length} / ${mandelTargetV}`;
            const genBtn = document.getElementById('mandel-generate-btn');
            if (genBtn) genBtn.disabled = mandelSelected.length !== mandelTargetV || !!mandelWorker;
        }

        function mandelRankFill() {
            syncMandelTarget();
            const sp = Number(document.getElementById('verification-start-period').value);
            const ep = Number(document.getElementById('verification-end-period').value);
            if(!validRange(sp,ep)){alert('請輸入有效整數期數範圍。');return;}
            invalidateMandel();
            const startIdx = sp - 1;
            const endIdx = Math.min(lotteryData.length, ep);
            const windowData = lotteryData.slice(startIdx, endIdx);
            if (windowData.length === 0) { alert('所選範圍無數據'); return; }

            // Include zero-frequency numbers so even a short range fills the requested count.
            mandelSelected = Engine.rank(windowData, mandelTargetV).sort((a, b) => a - b);
            mandelCombinations = [];
            const resultsDiv = document.getElementById('mandel-results');
            if (resultsDiv) resultsDiv.style.display = 'none';
            updateMandelUI();
        }

        function mandelQuickRandom() {
            syncMandelTarget();
            invalidateMandel();
            mandelSelected = [];
            const pool = [];
            for (let i = 1; i <= 49; i++) pool.push(i);
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
            }
            mandelSelected = pool.slice(0, mandelTargetV).sort((a, b) => a - b);
            updateMandelUI();
        }

        function mandelClearAll() {
            invalidateMandel();
            mandelSelected = [];
            mandelCombinations = [];
            mandelCombosExpanded = false;
            updateMandelUI();
            const resultsDiv = document.getElementById('mandel-results');
            if (resultsDiv) resultsDiv.style.display = 'none';
            const progressDiv = document.getElementById('mandel-progress');
            if (progressDiv) progressDiv.style.display = 'none';
        }

        // 生成 n 取 r 的所有組合（回傳索引陣列）
        function combinations(n, r) {
            const result = [];
            const combo = [];
            function gen(start) {
                if (combo.length === r) {
                    result.push([...combo]);
                    return;
                }
                for (let i = start; i < n; i++) {
                    combo.push(i);
                    gen(i + 1);
                    combo.pop();
                }
            }
            gen(0);
            return result;
        }

        // 從一個集合中取 r 個的所有子集
        function subsetsOf(arr, r) {
            const result = [];
            const combo = [];
            function gen(start) {
                if (combo.length === r) {
                    result.push([...combo]);
                    return;
                }
                for (let i = start; i < arr.length; i++) {
                    combo.push(arr[i]);
                    gen(i + 1);
                    combo.pop();
                }
            }
            gen(0);
            return result;
        }

        function subKey(arr) {
            return arr.join(',');
        }

        // 計算 C(n,r)
        function comb(n, r) {
            if (r > n) return 0;
            if (r === 0 || r === n) return 1;
            let result = 1;
            for (let i = 0; i < r; i++) {
                result = result * (n - i) / (i + 1);
            }
            return Math.round(result);
        }


        function displayMandelResults() {
            const v = mandelTargetV;
            const total = mandelCombinations.length;
            const notice=document.getElementById('mandel-filter-summary');
            if(notice)notice.innerHTML=mandelFilterSummary(mandelFilterInfo);
            const guarantee=document.getElementById('mandel-guarantee');
            if(guarantee)guarantee.hidden=!!mandelFilterInfo?.advanced;
            const fullBuy = comb(v, 6);
            const saving = fullBuy > 0 ? ((1 - total / fullBuy) * 100).toFixed(1) : '0';

            document.getElementById('mandel-total-bets').textContent = total;
            document.getElementById('mandel-total-cost').textContent = '$' + (total * 10).toLocaleString();
            document.getElementById('mandel-full-cost').textContent = '$' + (fullBuy * 10).toLocaleString();
            document.getElementById('mandel-saving').textContent = saving + '%';

            // 更新歷史覆蓋分析
            const prob = comb(v, 6) / comb(49, 6);
            const probPct = (prob * 100).toFixed(4);
            const probInv = Math.round(1 / prob);
            const probNote = document.getElementById('mandel-prob-note');
            if (probNote) {
                probNote.textContent = `另作參考：6 個正選全落在 ${v} 碼池內的機率約 ${probPct}%（1/${probInv.toLocaleString()}）；這是號碼池覆蓋率，不是濃縮注碼的頭獎機率。`;
            }

            // 組合列表標籤
            const countLabel = document.getElementById('mandel-combo-count-label');
            if (countLabel) countLabel.textContent = `（共 ${total} 注）`;

            // 預覽前 20 注
            const previewDiv = document.getElementById('mandel-combos-preview');
            const previewCount = Math.min(20, total);
            let previewHtml = '<table class="mandel-combos-preview-table">';
            for (let i = 0; i < previewCount; i++) {
                const balls = mandelCombinations[i].map(n =>
                    `<span class="combo-num">${n}</span>`
                ).join('');
                previewHtml += `<tr><td style="width:40px;color:#999;">${i + 1}</td><td>${balls}</td></tr>`;
            }
            if (total > 20) {
                previewHtml += `<tr><td colspan="2" style="color:#999;padding:10px;">... 還有 ${total - 20} 注（點擊「展開全部」查看）</td></tr>`;
            }
            previewHtml += '</table>';
            previewDiv.innerHTML = previewHtml;

            document.getElementById('mandel-combos-body').innerHTML = '';

            // 收合狀態
            document.getElementById('mandel-combos-full').style.display = 'none';
            previewDiv.style.display = 'block';
            document.getElementById('mandel-combos-section').style.display = '';
            document.getElementById('mandel-section-toggle-btn').textContent = '隱藏';
            const toggleBtn = document.getElementById('mandel-toggle-btn');
            if (toggleBtn) toggleBtn.textContent = '展開全部';
            mandelCombosExpanded = false;

            document.getElementById('mandel-results').style.display = 'block';
        }

        function mandelToggleSection() {
            const section = document.getElementById('mandel-combos-section');
            const btn = document.getElementById('mandel-section-toggle-btn');
            if (section.style.display === 'none') {
                section.style.display = '';
                btn.textContent = '隱藏';
            } else {
                section.style.display = 'none';
                btn.textContent = '顯示';
            }
        }

        function mandelToggleCombos() {
            mandelCombosExpanded = !mandelCombosExpanded;
            const fullDiv = document.getElementById('mandel-combos-full');
            const previewDiv = document.getElementById('mandel-combos-preview');
            const toggleBtn = document.getElementById('mandel-toggle-btn');

            if (mandelCombosExpanded) {
                document.getElementById('mandel-combos-body').innerHTML = mandelCombinations.map((c,i)=>`<tr><td>${i+1}</td><td>${c.map(n=>`<span class="combo-num">${n}</span>`).join('')}</td></tr>`).join('');
                fullDiv.style.display = 'block';
                previewDiv.style.display = 'none';
                toggleBtn.textContent = '收合';
            } else {
                fullDiv.style.display = 'none';
                previewDiv.style.display = 'block';
                toggleBtn.textContent = '展開全部';
            }
        }

        function mandelExport() {
            if (mandelCombinations.length === 0) return;

            let csv = '注數,號碼1,號碼2,號碼3,號碼4,號碼5,號碼6\n';
            mandelCombinations.forEach((combo, i) => {
                csv += (i + 1) + ',' + combo.join(',') + '\n';
            });

            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mandel_${mandelFilterInfo?.advanced?'advanced_':''}C${mandelTargetV}_6_5.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }

    
