/* ============================================================
 * ROC / AUC 與最佳截斷值計算器
 * Hughie's Online Lab
 * ------------------------------------------------------------
 * 計算邏輯：
 *  - 將分數由大到小排序，依序把每個分數作為候選截斷值
 *  - 在每個截斷值下計算 TP / FP / TN / FN
 *  - 由 (1 - Specificity, Sensitivity) 構成 ROC 曲線
 *  - AUC 採梯形法（trapezoidal rule）積分
 *  - 最佳截斷值 = argmax(Sensitivity + Specificity - 1) (Youden)
 * ============================================================ */

(function () {
  'use strict';

  // ---------- DOM ----------
  const $  = (id) => document.getElementById(id);
  const labelInput = $('labelInput');
  const scoreInput = $('scoreInput');
  const csvInput   = $('csvInput');
  const runBtn     = $('runBtn');
  const sampleBtn  = $('sampleBtn');
  const clearBtn   = $('clearBtn');

  const resultPanel       = $('resultPanel');
  const aucVal            = $('aucVal');
  const aucInterpret      = $('aucInterpret');
  const cutoffVal         = $('cutoffVal');
  const cutoffInterpret   = $('cutoffInterpret');
  const senVal            = $('senVal');
  const speVal            = $('speVal');
  const youdenVal         = $('youdenVal');
  const ppvVal            = $('ppvVal');
  const npvVal            = $('npvVal');
  const accVal            = $('accVal');
  const resultMeta        = $('resultMeta');

  const cutoffTableBody   = document.querySelector('#cutoffTable tbody');
  const downloadChartBtn  = $('downloadChartBtn');
  const exportCsvBtn      = $('exportCsvBtn');
  const copyResultBtn     = $('copyResultBtn');
  const toast             = $('toast');

  const canvas = $('rocCanvas');

  // 全域結果快取（供匯出 / 複製使用）
  let lastResult = null;

  // ---------- Toast ----------
  let toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  // ---------- 數據解析 ----------
  function parseColumn(text) {
    if (!text) return [];
    return text.split(/\r?\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  function parseCSV(text) {
    if (!text || !text.trim()) return null;
    const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (lines.length === 0) return null;

    const rows = lines.map(line => line.split(/[\s,;\t]+/).filter(Boolean));

    // 嘗試判斷第一列是否為表頭（任一欄非數字即視為表頭）
    const first = rows[0];
    const firstIsHeader = first.some(c => isNaN(parseFloat(c)));
    const dataRows = firstIsHeader ? rows.slice(1) : rows;

    const labels = [];
    const scores = [];
    for (const r of dataRows) {
      if (r.length < 2) continue;
      const lab = parseFloat(r[0]);
      const sc  = parseFloat(r[1]);
      if (!Number.isFinite(lab) || !Number.isFinite(sc)) continue;
      if (lab !== 0 && lab !== 1) continue;
      labels.push(lab);
      scores.push(sc);
    }
    return { labels, scores };
  }

  function collectData() {
    // 優先 CSV
    const csv = parseCSV(csvInput.value);
    if (csv && csv.labels.length > 0) return csv;

    // 否則使用兩欄
    const labRaw = parseColumn(labelInput.value);
    const scRaw  = parseColumn(scoreInput.value);

    const labels = [], scores = [];
    const n = Math.min(labRaw.length, scRaw.length);
    for (let i = 0; i < n; i++) {
      const l = parseFloat(labRaw[i]);
      const s = parseFloat(scRaw[i]);
      if (!Number.isFinite(l) || !Number.isFinite(s)) continue;
      if (l !== 0 && l !== 1) continue;
      labels.push(l);
      scores.push(s);
    }
    return { labels, scores };
  }

  // ---------- 核心：ROC / AUC ----------
  function computeROC(labels, scores) {
    const n = labels.length;
    const P = labels.reduce((a, b) => a + b, 0);   // 陽性樣本數
    const N = n - P;                               // 陰性樣本數

    if (P === 0 || N === 0) {
      throw new Error('資料中需同時存在陽性 (1) 與陰性 (0) 樣本，請檢查結局欄位。');
    }

    // 由分數降序排列
    const idx = Array.from({ length: n }, (_, i) => i)
      .sort((a, b) => scores[b] - scores[a]);

    const sortedScores = idx.map(i => scores[i]);
    const sortedLabels = idx.map(i => labels[i]);

    // 候選截斷值：所有唯一分數，外加一個「最高分數 + 1」作為起點
    // 規則：score >= cutoff 判為陽性
    const uniqueScores = [];
    for (let i = 0; i < sortedScores.length; i++) {
      if (i === 0 || sortedScores[i] !== sortedScores[i - 1]) {
        uniqueScores.push(sortedScores[i]);
      }
    }
    // 加入 +Infinity（全部判陰）與 -Infinity（全部判陽）端點
    const cutoffs = [Infinity, ...uniqueScores, -Infinity];

    const rows = [];
    for (let c = 0; c < cutoffs.length; c++) {
      const cut = cutoffs[c];
      let TP = 0, FP = 0;
      for (let i = 0; i < n; i++) {
        if (sortedScores[i] >= cut) {
          if (sortedLabels[i] === 1) TP++; else FP++;
        }
      }
      const FN = P - TP;
      const TN = N - FP;
      const sen = P > 0 ? TP / P : 0;
      const spe = N > 0 ? TN / N : 0;
      const youden = sen + spe - 1;
      const ppv = (TP + FP) > 0 ? TP / (TP + FP) : NaN;
      const npv = (TN + FN) > 0 ? TN / (TN + FN) : NaN;
      const acc = (TP + TN) / n;

      rows.push({
        cutoff: cut,
        TP, FP, TN, FN,
        sen, spe, youden, ppv, npv, acc,
        fpr: 1 - spe,
        tpr: sen
      });
    }

    // AUC：依 FPR 升序積分（梯形法）
    const sortedByFPR = rows.slice().sort((a, b) => a.fpr - b.fpr || a.tpr - b.tpr);
    let auc = 0;
    for (let i = 1; i < sortedByFPR.length; i++) {
      const x1 = sortedByFPR[i - 1].fpr, x2 = sortedByFPR[i].fpr;
      const y1 = sortedByFPR[i - 1].tpr, y2 = sortedByFPR[i].tpr;
      auc += (x2 - x1) * (y1 + y2) / 2;
    }
    auc = Math.max(0, Math.min(1, auc));

    // 最佳截斷值（排除 ±Infinity 端點）
    const candidates = rows.filter(r => Number.isFinite(r.cutoff));
    candidates.sort((a, b) => b.youden - a.youden);
    const optimal = candidates[0];

    return { rows, sortedByFPR, auc, optimal, P, N, n };
  }

  // ---------- AUC 等級判定 ----------
  function aucLabel(auc) {
    if (auc >= 0.9) return { tier: '優秀（Excellent）', desc: '模型對陽性與陰性的區分能力非常好。' };
    if (auc >= 0.8) return { tier: '良好（Good）',      desc: '模型具有較好的區分能力。' };
    if (auc >= 0.7) return { tier: '尚可（Fair）',      desc: '模型有一定區分能力，但仍有改進空間。' };
    if (auc >= 0.6) return { tier: '較弱（Poor）',      desc: '模型區分能力有限，使用前需審慎評估。' };
    return            { tier: '無區分力（Fail）',        desc: 'AUC 接近 0.5，幾乎等同於隨機猜測。' };
  }

  // ---------- Canvas 繪圖 ----------
  function drawROC(rocPoints, auc) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // 背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // 邊距
    const m = { l: 70, r: 30, t: 40, b: 70 };
    const pw = W - m.l - m.r;
    const ph = H - m.t - m.b;

    // 座標轉換
    const X = (v) => m.l + v * pw;
    const Y = (v) => m.t + (1 - v) * ph;

    // 網格
    ctx.strokeStyle = '#ece5d3';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      ctx.beginPath(); ctx.moveTo(X(t), Y(0)); ctx.lineTo(X(t), Y(1)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X(0), Y(t)); ctx.lineTo(X(1), Y(t)); ctx.stroke();
    }
    ctx.setLineDash([]);

    // 座標軸
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(1), Y(0));
    ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(0), Y(1));
    ctx.stroke();

    // 對角參考線
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(1), Y(1));
    ctx.stroke();
    ctx.setLineDash([]);

    // ROC 曲線 + 填色
    const pts = rocPoints.slice().sort((a, b) => a.fpr - b.fpr || a.tpr - b.tpr);

    // 填色（曲線下方）
    ctx.fillStyle = 'rgba(201, 169, 97, 0.15)';
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0));
    pts.forEach(p => ctx.lineTo(X(p.fpr), Y(p.tpr)));
    ctx.lineTo(X(1), Y(0));
    ctx.closePath();
    ctx.fill();

    // 曲線
    ctx.strokeStyle = '#c9a961';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = X(p.fpr), y = Y(p.tpr);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 最佳點
    const opt = lastResult && lastResult.optimal;
    if (opt) {
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(X(opt.fpr), Y(opt.tpr), 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(X(opt.fpr), Y(opt.tpr), 5, 0, Math.PI * 2);
      ctx.stroke();

      // 標註
      ctx.fillStyle = '#1a1a1a';
      ctx.font = '600 12px "Open Sans", sans-serif';
      const labelText = `最佳截斷 = ${formatNum(opt.cutoff)}`;
      const tx = X(opt.fpr) + 10;
      const ty = Y(opt.tpr) - 10;
      ctx.fillText(labelText, tx, ty);
    }

    // 軸刻度文字
    ctx.fillStyle = '#555';
    ctx.font = '12px "Open Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i <= 10; i += 2) {
      const t = i / 10;
      ctx.fillText(t.toFixed(1), X(t), Y(0) + 8);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 10; i += 2) {
      const t = i / 10;
      ctx.fillText(t.toFixed(1), X(0) - 8, Y(t));
    }

    // 軸標題
    ctx.fillStyle = '#1a1a1a';
    ctx.font = '600 13px "Encode Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('1 − Specificity (False Positive Rate)', m.l + pw / 2, H - 28);

    ctx.save();
    ctx.translate(22, m.t + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Sensitivity (True Positive Rate)', 0, 0);
    ctx.restore();

    // 標題與 AUC
    ctx.fillStyle = '#1a1a1a';
    ctx.font = '700 16px "Encode Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('ROC Curve', m.l, 12);

    ctx.fillStyle = '#c9a961';
    ctx.font = '700 14px "Encode Sans", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`AUC = ${auc.toFixed(4)}`, m.l + pw, 14);
  }

  // ---------- 工具函數 ----------
  function formatNum(v, digits = 4) {
    if (!Number.isFinite(v)) return v > 0 ? '+∞' : '−∞';
    if (Math.abs(v) >= 1000) return v.toFixed(2);
    return Number(v.toFixed(digits)).toString();
  }
  function pct(v, digits = 1) {
    if (!Number.isFinite(v)) return '—';
    return (v * 100).toFixed(digits);
  }

  // ---------- 渲染結果 ----------
  function renderResult(result) {
    const { auc, optimal, n, P, N, rows } = result;

    // 概覽
    resultMeta.textContent = `共 ${n} 筆樣本（陽性 ${P} · 陰性 ${N}）；以 Youden 指數為最佳截斷準則。`;

    aucVal.textContent = auc.toFixed(4);
    const lab = aucLabel(auc);
    aucInterpret.textContent = `判讀：${lab.tier}。${lab.desc}`;

    cutoffVal.textContent = formatNum(optimal.cutoff);
    cutoffInterpret.textContent =
      `當分數 ≥ ${formatNum(optimal.cutoff)} 時判為陽性，可同時兼顧敏感度與特異度。`;

    senVal.textContent    = pct(optimal.sen);
    speVal.textContent    = pct(optimal.spe);
    youdenVal.textContent = optimal.youden.toFixed(4);
    ppvVal.textContent    = pct(optimal.ppv);
    npvVal.textContent    = pct(optimal.npv);
    accVal.textContent    = pct(optimal.acc);

    // 表格（節選）
    renderTable(rows, optimal);

    // ROC 曲線
    drawROC(result.sortedByFPR, auc);

    resultPanel.classList.remove('hidden');
    resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderTable(rows, optimal) {
    cutoffTableBody.innerHTML = '';
    // 過濾掉 ±Infinity 端點，只展示實際分數
    const finiteRows = rows.filter(r => Number.isFinite(r.cutoff));
    // 取前 30 列（或全部）
    const display = finiteRows.length <= 30
      ? finiteRows
      : sampleEvenly(finiteRows, 30);

    // 確保最佳截斷一定出現在列表
    if (optimal && !display.some(r => r.cutoff === optimal.cutoff)) {
      display.push(optimal);
      display.sort((a, b) => b.cutoff - a.cutoff);
    }

    const frag = document.createDocumentFragment();
    for (const r of display) {
      const tr = document.createElement('tr');
      if (optimal && r.cutoff === optimal.cutoff) tr.classList.add('optimal');
      tr.innerHTML = `
        <td>${formatNum(r.cutoff)}</td>
        <td>${r.TP}</td>
        <td>${r.FP}</td>
        <td>${r.TN}</td>
        <td>${r.FN}</td>
        <td>${pct(r.sen)}%</td>
        <td>${pct(r.spe)}%</td>
        <td>${r.youden.toFixed(4)}</td>
        <td>${pct(r.ppv)}%</td>
        <td>${pct(r.npv)}%</td>`;
      frag.appendChild(tr);
    }
    cutoffTableBody.appendChild(frag);
  }

  function sampleEvenly(arr, k) {
    if (arr.length <= k) return arr.slice();
    const step = (arr.length - 1) / (k - 1);
    const out = [];
    for (let i = 0; i < k; i++) {
      out.push(arr[Math.round(i * step)]);
    }
    return out;
  }

  // ---------- 匯出 ----------
  function downloadChart() {
    if (!lastResult) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `ROC_AUC_${lastResult.auc.toFixed(4)}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showToast('ROC 圖已下載');
  }

  function exportCSV() {
    if (!lastResult) return;
    const rows = lastResult.rows.filter(r => Number.isFinite(r.cutoff));
    const header = ['cutoff','TP','FP','TN','FN','sensitivity','specificity','youden','PPV','NPV','accuracy'];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push([
        r.cutoff,
        r.TP, r.FP, r.TN, r.FN,
        r.sen.toFixed(6),
        r.spe.toFixed(6),
        r.youden.toFixed(6),
        Number.isFinite(r.ppv) ? r.ppv.toFixed(6) : '',
        Number.isFinite(r.npv) ? r.npv.toFixed(6) : '',
        r.acc.toFixed(6)
      ].join(','));
    }
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ROC_cutoff_table.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('截斷值表已匯出');
  }

  function copyResult() {
    if (!lastResult) return;
    const r = lastResult.optimal;
    const lab = aucLabel(lastResult.auc);
    const txt =
`ROC / AUC 分析結果（Hughie's Online Lab）
樣本數：${lastResult.n}（陽性 ${lastResult.P} · 陰性 ${lastResult.N}）
AUC：${lastResult.auc.toFixed(4)}（${lab.tier}）

最佳截斷值（Youden）：${formatNum(r.cutoff)}
- 敏感度 Sensitivity：${pct(r.sen)}%
- 特異度 Specificity：${pct(r.spe)}%
- Youden Index：${r.youden.toFixed(4)}
- PPV：${pct(r.ppv)}%
- NPV：${pct(r.npv)}%
- 準確度 Accuracy：${pct(r.acc)}%
- TP=${r.TP} · FP=${r.FP} · TN=${r.TN} · FN=${r.FN}

* 本工具僅供方法學學習與初步分析使用。`;
    navigator.clipboard.writeText(txt).then(
      () => showToast('結果已複製到剪貼簿'),
      () => showToast('複製失敗，請手動選取')
    );
  }

  // ---------- 示例資料 ----------
  function loadSample() {
    // 生成兩個常態分佈：陰性 N(0.30, 0.15)、陽性 N(0.65, 0.18)
    const labels = [], scores = [];
    function randn() {
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    // 50 陰性 + 50 陽性
    for (let i = 0; i < 50; i++) {
      labels.push(0);
      scores.push(Math.max(0, Math.min(1, 0.30 + 0.15 * randn())));
    }
    for (let i = 0; i < 50; i++) {
      labels.push(1);
      scores.push(Math.max(0, Math.min(1, 0.65 + 0.18 * randn())));
    }
    labelInput.value = labels.join('\n');
    scoreInput.value = scores.map(s => s.toFixed(4)).join('\n');
    csvInput.value = '';
    showToast('已載入 100 筆示例資料');
  }

  function clearAll() {
    labelInput.value = '';
    scoreInput.value = '';
    csvInput.value   = '';
    resultPanel.classList.add('hidden');
    lastResult = null;
  }

  // ---------- 主流程 ----------
  function run() {
    try {
      const data = collectData();
      if (data.labels.length < 4) {
        showToast('有效樣本過少（需至少 4 筆）');
        return;
      }
      const result = computeROC(data.labels, data.scores);
      lastResult = result;
      renderResult(result);
    } catch (err) {
      console.error(err);
      showToast(err.message || '分析失敗，請檢查輸入');
    }
  }

  // ---------- 事件綁定 ----------
  runBtn.addEventListener('click', run);
  sampleBtn.addEventListener('click', loadSample);
  clearBtn.addEventListener('click', clearAll);
  downloadChartBtn.addEventListener('click', downloadChart);
  exportCsvBtn.addEventListener('click', exportCSV);
  copyResultBtn.addEventListener('click', copyResult);

})();
