/* =========================================================
 * Missing Value & Outlier Assistant
 * 全部於本地瀏覽器執行，不上傳任何資料
 * ========================================================= */

(function () {
  'use strict';

  // ---------- 全域狀態 ----------
  const state = {
    fileName: '',
    headers: [],
    rows: [],          // 二維陣列 (string)
    colTypes: [],      // 'numeric' | 'categorical'
    missingSummary: [],
    numericStats: [],
    outlierStats: [],
    recommendations: []
  };

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const uploadZone = $('uploadZone');
  const csvFile = $('csvFile');
  const fileInfo = $('fileInfo');

  // ---------- 拖放上傳 ----------
  ['dragenter', 'dragover'].forEach(ev =>
    uploadZone.addEventListener(ev, e => {
      e.preventDefault(); e.stopPropagation();
      uploadZone.classList.add('dragover');
    })
  );
  ['dragleave', 'drop'].forEach(ev =>
    uploadZone.addEventListener(ev, e => {
      e.preventDefault(); e.stopPropagation();
      uploadZone.classList.remove('dragover');
    })
  );
  uploadZone.addEventListener('drop', e => {
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleFile(f);
  });
  csvFile.addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) handleFile(f);
  });

  // ---------- 檔案處理 ----------
  function handleFile(file) {
    if (!/\.csv$/i.test(file.name)) {
      toast('請上傳 .csv 格式的檔案');
      return;
    }
    state.fileName = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        parseCSV(e.target.result);
        analyse();
        renderAll();
        showResultCards();
      } catch (err) {
        console.error(err);
        toast('CSV 解析失敗：' + err.message);
      }
    };
    reader.onerror = () => toast('讀取檔案發生錯誤');
    reader.readAsText(file, 'UTF-8');
  }

  function showResultCards() {
    ['overviewCard', 'missingCard', 'statsCard', 'outlierCard', 'recCard', 'discCard']
      .forEach(id => $(id).classList.remove('hidden'));
    fileInfo.classList.add('show');
    fileInfo.innerHTML =
      `已載入：<b>${escapeHtml(state.fileName)}</b>　|　` +
      `${state.rows.length} 列 × ${state.headers.length} 欄`;
  }

  // ---------- CSV 解析（支援雙引號與逗號）----------
  function parseCSV(text) {
    text = text.replace(/^\uFEFF/, ''); // BOM
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') { row.push(field); field = ''; }
        else if (ch === '\r') { /* skip */ }
        else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else field += ch;
      }
    }
    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }

    if (rows.length < 2) throw new Error('檔案至少需要表頭與一行資料');

    state.headers = rows[0].map(h => h.trim());
    state.rows = rows.slice(1)
      .filter(r => r.some(v => v !== undefined && String(v).trim() !== ''))
      .map(r => {
        // 確保長度與表頭一致
        const out = new Array(state.headers.length).fill('');
        for (let j = 0; j < state.headers.length; j++) out[j] = (r[j] ?? '').trim();
        return out;
      });
  }

  // ---------- 缺失值判斷 ----------
  const MISSING_TOKENS = new Set(
    ['', 'na', 'n/a', 'null', 'nan', 'none', '.', '-', '--']
  );
  const isMissing = (v) => v === undefined || v === null ||
    MISSING_TOKENS.has(String(v).trim().toLowerCase());

  // ---------- 變量類型判斷 ----------
  function detectType(colIndex) {
    let n = 0, num = 0;
    for (let i = 0; i < state.rows.length; i++) {
      const v = state.rows[i][colIndex];
      if (isMissing(v)) continue;
      n++;
      const x = Number(v);
      if (Number.isFinite(x) && /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(String(v).trim())) num++;
    }
    if (n === 0) return 'categorical';
    return (num / n) >= 0.8 ? 'numeric' : 'categorical';
  }

  // ---------- 主分析流程 ----------
  function analyse() {
    const nCols = state.headers.length;
    const nRows = state.rows.length;
    state.colTypes = state.headers.map((_, j) => detectType(j));
    state.missingSummary = [];
    state.numericStats = [];
    state.outlierStats = [];
    state.recommendations = [];

    let totalMiss = 0;

    state.headers.forEach((name, j) => {
      let miss = 0;
      const numericVals = [];
      for (let i = 0; i < nRows; i++) {
        const v = state.rows[i][j];
        if (isMissing(v)) { miss++; continue; }
        if (state.colTypes[j] === 'numeric') {
          const x = Number(v);
          if (Number.isFinite(x)) numericVals.push(x);
        }
      }
      totalMiss += miss;
      const valid = nRows - miss;
      const rate = nRows ? (miss / nRows) * 100 : 0;

      // 缺失摘要
      const advice = adviseByMissing(rate);
      state.missingSummary.push({
        name, type: state.colTypes[j],
        valid, missing: miss, rate, advice
      });

      // 數值統計與異常值
      if (state.colTypes[j] === 'numeric' && numericVals.length > 0) {
        const stats = computeStats(numericVals);
        state.numericStats.push({ name, ...stats });

        // IQR
        const lower = stats.q1 - 1.5 * stats.iqr;
        const upper = stats.q3 + 1.5 * stats.iqr;
        let iqrCount = 0;
        for (const v of numericVals) if (v < lower || v > upper) iqrCount++;

        // Z-score
        let zCount = 0;
        if (stats.std > 0) {
          for (const v of numericVals) if (Math.abs((v - stats.mean) / stats.std) > 3) zCount++;
        }

        state.outlierStats.push({
          name, n: numericVals.length,
          iqrLower: lower, iqrUpper: upper,
          iqrCount, iqrRate: numericVals.length ? iqrCount / numericVals.length * 100 : 0,
          zCount, zRate: numericVals.length ? zCount / numericVals.length * 100 : 0
        });
      }
    });

    // 概覽指標
    $('mTotalRows').textContent = nRows.toLocaleString();
    $('mTotalCols').textContent = nCols;
    $('mNumCols').textContent = state.colTypes.filter(t => t === 'numeric').length;
    $('mCatCols').textContent = state.colTypes.filter(t => t === 'categorical').length;
    $('mTotalMiss').textContent = totalMiss.toLocaleString();
    $('mTotalMissRate').textContent =
      nRows && nCols ? ((totalMiss / (nRows * nCols)) * 100).toFixed(2) : '0.00';

    buildRecommendations();
  }

  // ---------- 統計量 ----------
  function computeStats(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = sorted.reduce((s, v) => s + v, 0) / n;
    const median = quantile(sorted, 0.5);
    const q1 = quantile(sorted, 0.25);
    const q3 = quantile(sorted, 0.75);
    const variance = n > 1
      ? sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)
      : 0;
    return {
      n, mean, median,
      std: Math.sqrt(variance),
      min: sorted[0], max: sorted[n - 1],
      q1, q3, iqr: q3 - q1
    };
  }

  function quantile(sorted, p) {
    if (!sorted.length) return NaN;
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
  }

  // ---------- 缺失建議 ----------
  function adviseByMissing(rate) {
    if (rate === 0) return { tag: '無缺失', level: 'low', text: '資料完整，可直接分析。' };
    if (rate < 5) return { tag: '< 5%', level: 'low', text: '可考慮完整案例分析（CCA）。' };
    if (rate <= 20) return { tag: '5%–20%', level: 'mid', text: '建議插補或進行敏感性分析。' };
    return { tag: '> 20%', level: 'high', text: '需謹慎評估變量可用性。' };
  }

  // ---------- 渲染 ----------
  function renderAll() {
    renderMissingTable();
    renderStatsTable();
    renderOutlierTable();
    renderRecommendations();
  }

  function renderMissingTable() {
    const tbody = $('missingTable').querySelector('tbody');
    tbody.innerHTML = state.missingSummary.map(r => `
      <tr>
        <td class="var-name">${escapeHtml(r.name)}</td>
        <td><span class="pill-tag ${r.type === 'numeric' ? 'pill-num' : 'pill-cat'}">
          ${r.type === 'numeric' ? '數值' : '類別'}
        </span></td>
        <td>${r.valid.toLocaleString()}</td>
        <td>${r.missing.toLocaleString()}</td>
        <td>
          <span class="pill-tag pill-${r.advice.level}">
            ${r.rate.toFixed(2)}%
          </span>
        </td>
        <td style="font-family:'Open Sans',sans-serif;color:#555;">${r.advice.text}</td>
      </tr>
    `).join('');
  }

  function renderStatsTable() {
    const tbody = $('statsTable').querySelector('tbody');
    if (!state.numericStats.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#888;">未偵測到數值型變量</td></tr>`;
      return;
    }
    tbody.innerHTML = state.numericStats.map(s => `
      <tr>
        <td class="var-name">${escapeHtml(s.name)}</td>
        <td>${s.n.toLocaleString()}</td>
        <td>${fmt(s.mean)}</td>
        <td>${fmt(s.median)}</td>
        <td>${fmt(s.std)}</td>
        <td>${fmt(s.min)}</td>
        <td>${fmt(s.q1)}</td>
        <td>${fmt(s.q3)}</td>
        <td>${fmt(s.max)}</td>
      </tr>
    `).join('');
  }

  function renderOutlierTable() {
    const tbody = $('outlierTable').querySelector('tbody');
    if (!state.outlierStats.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#888;">無數值型變量可進行異常值偵測</td></tr>`;
      return;
    }
    tbody.innerHTML = state.outlierStats.map(o => `
      <tr>
        <td class="var-name">${escapeHtml(o.name)}</td>
        <td>${o.n.toLocaleString()}</td>
        <td>${fmt(o.iqrLower)}</td>
        <td>${fmt(o.iqrUpper)}</td>
        <td>${o.iqrCount.toLocaleString()}</td>
        <td><span class="pill-tag ${rateLevel(o.iqrRate)}">${o.iqrRate.toFixed(2)}%</span></td>
        <td>${o.zCount.toLocaleString()}</td>
        <td><span class="pill-tag ${rateLevel(o.zRate)}">${o.zRate.toFixed(2)}%</span></td>
      </tr>
    `).join('');
  }

  function rateLevel(r) {
    if (r < 1) return 'pill-low';
    if (r <= 5) return 'pill-mid';
    return 'pill-high';
  }

  // ---------- 建議匯整 ----------
  function buildRecommendations() {
    const recs = [];

    // 缺失值類
    const lowMiss = state.missingSummary.filter(r => r.rate > 0 && r.rate < 5);
    const midMiss = state.missingSummary.filter(r => r.rate >= 5 && r.rate <= 20);
    const highMiss = state.missingSummary.filter(r => r.rate > 20);

    if (lowMiss.length) recs.push({
      title: '缺失比例 < 5%',
      tag: 'COMPLETE CASE',
      items: [
        `涉及變量：${lowMiss.map(x => x.name).join('、')}`,
        '此類變量缺失比例較低，可考慮使用完整案例分析（CCA）。',
        '若樣本量充足，刪除缺失列對統計效力影響有限。'
      ]
    });
    if (midMiss.length) recs.push({
      title: '缺失比例 5%–20%',
      tag: 'IMPUTATION',
      items: [
        `涉及變量：${midMiss.map(x => x.name).join('、')}`,
        '建議使用單一插補（均值/中位數/眾數）或多重插補（MICE）。',
        '應對結果做敏感性分析，比較插補前後估計值的穩定性。'
      ]
    });
    if (highMiss.length) recs.push({
      title: '缺失比例 > 20%',
      tag: 'RISK',
      items: [
        `涉及變量：${highMiss.map(x => x.name).join('、')}`,
        '需謹慎評估變量可用性，過高缺失可能造成嚴重偏倚。',
        '建議檢視缺失機制（MCAR / MAR / MNAR），考慮是否剔除該變量或使用敏感性分析。'
      ]
    });
    if (!lowMiss.length && !midMiss.length && !highMiss.length) {
      recs.push({
        title: '無缺失',
        tag: 'CLEAN',
        items: ['本批資料未檢出缺失值，可直接進入後續分析。']
      });
    }

    // 異常值類
    const heavyOutliers = state.outlierStats.filter(o => o.iqrRate > 5 || o.zRate > 5);
    if (heavyOutliers.length) recs.push({
      title: '異常值比例偏高',
      tag: 'OUTLIER',
      items: [
        `涉及變量：${heavyOutliers.map(x => x.name).join('、')}`,
        '建議進一步繪製箱型圖 / 散點圖確認分布形態。',
        '考慮資料錯誤、極端值或真實尾部分布，必要時使用對數變換、Winsorization 或穩健統計法。'
      ]
    });

    // 通用提醒
    recs.push({
      title: '研究設計提醒',
      tag: 'GENERAL',
      items: [
        '缺失值處理策略應結合缺失機制（MCAR、MAR、MNAR）判斷。',
        '異常值是否剔除須考量領域知識，避免誤刪有意義的極端值。',
        '所有處理步驟應於分析報告中透明記錄，以利再現性。'
      ]
    });

    state.recommendations = recs;
  }

  function renderRecommendations() {
    $('recList').innerHTML = state.recommendations.map(r => `
      <div class="rec-block">
        <div class="rec-title">${escapeHtml(r.title)}<span class="rec-tag">· ${r.tag}</span></div>
        <ul>${r.items.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
      </div>
    `).join('');
  }

  // ---------- 匯出 CSV ----------
  function downloadCSV(rows, filename) {
    const csv = rows.map(r =>
      r.map(v => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')
    ).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  $('exportMissingBtn').addEventListener('click', () => {
    const rows = [['變量名稱', '類型', '有效值', '缺失數', '缺失比例(%)', '建議']];
    state.missingSummary.forEach(r => rows.push([
      r.name, r.type === 'numeric' ? '數值' : '類別',
      r.valid, r.missing, r.rate.toFixed(2), r.advice.text
    ]));
    downloadCSV(rows, 'missing_summary.csv');
    toast('已匯出缺失摘要 CSV');
  });

  $('exportStatsBtn').addEventListener('click', () => {
    const rows = [['變量名稱', '有效N', '均值', '中位數', '標準差', '最小值', 'Q1', 'Q3', '最大值']];
    state.numericStats.forEach(s => rows.push([
      s.name, s.n, fmt(s.mean), fmt(s.median), fmt(s.std),
      fmt(s.min), fmt(s.q1), fmt(s.q3), fmt(s.max)
    ]));
    downloadCSV(rows, 'numeric_stats.csv');
    toast('已匯出統計量 CSV');
  });

  $('exportOutlierBtn').addEventListener('click', () => {
    const rows = [['變量名稱', '有效N', 'IQR下界', 'IQR上界', 'IQR異常值數', 'IQR比例(%)', 'Zscore異常值數', 'Zscore比例(%)']];
    state.outlierStats.forEach(o => rows.push([
      o.name, o.n, fmt(o.iqrLower), fmt(o.iqrUpper),
      o.iqrCount, o.iqrRate.toFixed(2),
      o.zCount, o.zRate.toFixed(2)
    ]));
    downloadCSV(rows, 'outlier_report.csv');
    toast('已匯出異常值報表 CSV');
  });

  $('exportAllBtn').addEventListener('click', () => {
    const rows = [];
    rows.push(['== 數據概覽 ==']);
    rows.push(['檔案', state.fileName]);
    rows.push(['列數', state.rows.length]);
    rows.push(['欄位數', state.headers.length]);
    rows.push([]);
    rows.push(['== 缺失值摘要 ==']);
    rows.push(['變量名稱', '類型', '有效值', '缺失數', '缺失比例(%)', '建議']);
    state.missingSummary.forEach(r => rows.push([
      r.name, r.type === 'numeric' ? '數值' : '類別',
      r.valid, r.missing, r.rate.toFixed(2), r.advice.text
    ]));
    rows.push([]);
    rows.push(['== 數值型變量統計 ==']);
    rows.push(['變量名稱', '有效N', '均值', '中位數', '標準差', '最小值', 'Q1', 'Q3', '最大值']);
    state.numericStats.forEach(s => rows.push([
      s.name, s.n, fmt(s.mean), fmt(s.median), fmt(s.std),
      fmt(s.min), fmt(s.q1), fmt(s.q3), fmt(s.max)
    ]));
    rows.push([]);
    rows.push(['== 異常值偵測 ==']);
    rows.push(['變量名稱', '有效N', 'IQR下界', 'IQR上界', 'IQR異常值數', 'IQR比例(%)', 'Zscore異常值數', 'Zscore比例(%)']);
    state.outlierStats.forEach(o => rows.push([
      o.name, o.n, fmt(o.iqrLower), fmt(o.iqrUpper),
      o.iqrCount, o.iqrRate.toFixed(2),
      o.zCount, o.zRate.toFixed(2)
    ]));
    downloadCSV(rows, 'data_quality_report.csv');
    toast('已匯出完整報表 CSV');
  });

  // ---------- 一鍵複製建議 ----------
  $('copyRecBtn').addEventListener('click', async () => {
    const text = state.recommendations.map(r =>
      `【${r.title}】(${r.tag})\n` + r.items.map(i => `  • ${i}`).join('\n')
    ).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      toast('已複製處理建議到剪貼簿');
    } catch (e) {
      // 後備方案
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast('已複製處理建議到剪貼簿');
    }
  });

  // ---------- 工具函式 ----------
  function fmt(v) {
    if (!Number.isFinite(v)) return '--';
    const abs = Math.abs(v);
    if (abs !== 0 && (abs < 0.01 || abs >= 1e6)) return v.toExponential(3);
    return Number(v.toFixed(4)).toString();
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 2200);
  }
})();
