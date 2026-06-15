/* =========================================================
 * Questionnaire Reliability Analyzer
 * Hughie's Online Lab
 * ========================================================= */
(function () {
  'use strict';

  // ----- DOM helpers
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // ----- State
  const state = {
    step: 1,
    headers: [],
    rows: [],            // numeric matrix; null = missing
    reverseSet: new Set()
  };

  /* ---------- Step navigation ---------- */
  const TOTAL_STEPS = 3;
  function setStep(n) {
    state.step = n;
    $$('.form-step').forEach((el) => {
      el.classList.toggle('active', +el.dataset.step === n);
    });
    $$('.progress-steps .step').forEach((el) => {
      const s = +el.dataset.step;
      el.classList.toggle('active', s === n);
      el.classList.toggle('done', s < n);
    });
    $('#progressFill').style.width = (n / TOTAL_STEPS * 100) + '%';
    $('#prevBtn').disabled = n === 1;
    $('#nextBtn').style.display = n < TOTAL_STEPS ? '' : 'none';
    $('#submitBtn').style.display = n === TOTAL_STEPS ? '' : 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  $('#prevBtn').addEventListener('click', () => {
    if (state.step > 1) setStep(state.step - 1);
  });
  $('#nextBtn').addEventListener('click', () => {
    if (state.step === 1 && !validateData()) return;
    if (state.step === 2 && !validateScale()) return;
    if (state.step < TOTAL_STEPS) setStep(state.step + 1);
  });
  $('#submitBtn').addEventListener('click', runAnalysis);

  /* ---------- Sample / file / preview ---------- */
  const SAMPLE = `Q1,Q2,Q3,Q4,Q5,Q6,Q7,Q8,Q9,Q10
4,5,4,2,5,4,5,4,2,4
3,4,4,3,4,4,4,4,3,3
5,5,5,1,5,5,5,5,1,5
4,4,3,2,4,4,4,3,2,4
2,3,3,4,3,2,3,3,4,2
5,5,4,1,5,5,5,4,1,5
3,3,3,3,3,3,3,3,3,3
4,5,5,2,4,4,5,5,2,4
4,4,4,2,5,4,4,4,2,4
3,4,3,3,3,3,4,3,3,3
5,4,5,1,5,5,4,5,1,5
2,3,2,4,3,2,3,2,4,2
4,4,4,2,4,4,4,4,2,4
5,5,5,1,4,5,5,5,1,5
3,3,4,3,4,3,3,4,3,3
4,4,4,2,5,4,4,4,2,4
4,5,4,2,4,4,5,4,2,4
3,4,4,3,3,3,4,4,3,3
5,5,5,1,5,5,5,5,1,5
4,4,3,2,4,4,4,3,2,4
2,2,3,4,3,2,2,3,4,2
5,5,4,1,5,5,5,4,1,5
3,4,3,3,4,3,4,3,3,3
4,4,5,2,4,4,4,5,2,4
4,5,4,2,5,4,5,4,2,4
3,3,3,3,3,3,3,3,3,3
5,4,5,1,4,5,4,5,1,5
4,4,4,2,4,4,4,4,2,4
2,3,3,4,2,2,3,3,4,2
4,5,4,2,5,4,5,4,2,4`;

  $('#loadSample').addEventListener('click', () => {
    $('#dataInput').value = SAMPLE;
    parseAndPreview();
  });
  $('#clearData').addEventListener('click', () => {
    $('#dataInput').value = '';
    parseAndPreview();
  });
  $('#fileInput').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      $('#dataInput').value = ev.target.result;
      parseAndPreview();
    };
    reader.readAsText(f, 'utf-8');
  });
  $('#dataInput').addEventListener('input', parseAndPreview);
  $('#sep').addEventListener('change', parseAndPreview);
  $$('input[name="hasHeader"]').forEach((el) => el.addEventListener('change', parseAndPreview));

  /* ---------- Parsing ---------- */
  function detectSep(text) {
    const head = text.split(/\r?\n/).slice(0, 3).join('\n');
    const candidates = [
      { c: '\t', n: (head.match(/\t/g) || []).length },
      { c: ',',  n: (head.match(/,/g) || []).length },
      { c: ';',  n: (head.match(/;/g) || []).length },
      { c: ' ',  n: (head.match(/ +/g) || []).length }
    ];
    candidates.sort((a, b) => b.n - a.n);
    return candidates[0].n > 0 ? candidates[0].c : ',';
  }

  function parseData(text) {
    let sep = $('#sep').value;
    if (sep === 'auto') sep = detectSep(text);
    if (sep === '\\t') sep = '\t';
    const hasHeader = $('input[name="hasHeader"]:checked').value === 'yes';

    const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '');
    if (lines.length === 0) return { headers: [], rows: [], errors: ['未檢測到任何數據。'] };

    let headers = [];
    let dataLines = lines;
    if (hasHeader) {
      headers = splitLine(lines[0], sep).map((s) => s.trim());
      dataLines = lines.slice(1);
    }

    const rows = [];
    const errors = [];
    let colCount = headers.length || splitLine(lines[0], sep).length;

    dataLines.forEach((line, idx) => {
      const parts = splitLine(line, sep);
      if (parts.length !== colCount) {
        errors.push(`第 ${idx + 1} 行列數 (${parts.length}) 與表頭 (${colCount}) 不一致，已忽略。`);
        return;
      }
      const row = parts.map((v) => {
        const t = v.trim();
        if (t === '' || /^(na|null|nan|\.)$/i.test(t)) return null;
        const n = parseFloat(t);
        return Number.isFinite(n) ? n : null;
      });
      rows.push(row);
    });

    if (!hasHeader) {
      headers = Array.from({ length: colCount }, (_, i) => 'Q' + (i + 1));
    }
    return { headers, rows, errors };
  }

  function splitLine(line, sep) {
    if (sep === ' ') return line.split(/\s+/).filter((x) => x !== '');
    return line.split(sep);
  }

  function parseAndPreview() {
    const text = $('#dataInput').value.trim();
    const box = $('#preview');
    if (!text) {
      box.textContent = '尚未輸入數據。';
      state.headers = []; state.rows = [];
      renderItemChips();
      return;
    }
    const { headers, rows, errors } = parseData(text);
    state.headers = headers;
    state.rows = rows;
    let html = `<div class="ok">✓ 解析成功：${rows.length} 列受訪者 × ${headers.length} 道題目</div>`;
    html += `<div style="margin-top:6px;color:#888;">題目：${headers.join(' · ')}</div>`;
    if (errors.length) {
      html += `<div class="err" style="margin-top:6px;">⚠ ${errors.length} 行錯誤：${errors.slice(0, 3).join(' / ')}${errors.length > 3 ? ' …' : ''}</div>`;
    }
    box.innerHTML = html;
    renderItemChips();
  }

  /* ---------- Reverse-item chips ---------- */
  function renderItemChips() {
    const box = $('#itemChips');
    if (!state.headers.length) {
      box.innerHTML = '<span style="color:#999;font-size:13px;">請先在第一步輸入數據。</span>';
      return;
    }
    box.innerHTML = state.headers
      .map((h, i) => `<span class="chip${state.reverseSet.has(i) ? ' on' : ''}" data-i="${i}">${escapeHtml(h)}</span>`)
      .join('');
    box.querySelectorAll('.chip').forEach((el) => {
      el.addEventListener('click', () => {
        const i = +el.dataset.i;
        if (state.reverseSet.has(i)) state.reverseSet.delete(i);
        else state.reverseSet.add(i);
        el.classList.toggle('on');
      });
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---------- Validation ---------- */
  function validateData() {
    parseAndPreview();
    if (!state.rows.length || !state.headers.length) {
      alert('請先輸入或載入數據。');
      return false;
    }
    if (state.headers.length < 2) {
      alert('量表至少需要 2 道題目。');
      return false;
    }
    if (state.rows.length < 3) {
      alert('樣本量過少（至少需要 3 名受訪者）。');
      return false;
    }
    return true;
  }
  function validateScale() {
    const min = parseFloat($('#scaleMin').value);
    const max = parseFloat($('#scaleMax').value);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
      alert('量表最小值與最大值無效。');
      return false;
    }
    return true;
  }

  /* ---------- Subscale parser ---------- */
  function parseSubscale(text, k) {
    const t = (text || '').trim();
    if (!t) return Array.from({ length: k }, (_, i) => i);
    const idxs = new Set();
    t.split(/[,，]/).forEach((part) => {
      const p = part.trim();
      if (!p) return;
      const m = p.match(/^(\d+)\s*-\s*(\d+)$/);
      if (m) {
        const a = +m[1], b = +m[2];
        for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
          if (i >= 1 && i <= k) idxs.add(i - 1);
        }
      } else if (/^\d+$/.test(p)) {
        const i = +p;
        if (i >= 1 && i <= k) idxs.add(i - 1);
      }
    });
    return Array.from(idxs).sort((a, b) => a - b);
  }

  /* =========================================================
   * Statistics
   * ========================================================= */
  function mean(arr) {
    const v = arr.filter((x) => x !== null && Number.isFinite(x));
    if (!v.length) return NaN;
    return v.reduce((a, b) => a + b, 0) / v.length;
  }
  function variance(arr, sample = true) {
    const v = arr.filter((x) => x !== null && Number.isFinite(x));
    const n = v.length;
    if (n < 2) return 0;
    const m = v.reduce((a, b) => a + b, 0) / n;
    const ss = v.reduce((s, x) => s + (x - m) ** 2, 0);
    return ss / (sample ? n - 1 : n);
  }
  function sd(arr, sample = true) { return Math.sqrt(variance(arr, sample)); }

  function pearson(x, y) {
    const pairs = [];
    for (let i = 0; i < x.length; i++) {
      if (x[i] !== null && y[i] !== null && Number.isFinite(x[i]) && Number.isFinite(y[i])) {
        pairs.push([x[i], y[i]]);
      }
    }
    const n = pairs.length;
    if (n < 2) return NaN;
    const mx = pairs.reduce((s, p) => s + p[0], 0) / n;
    const my = pairs.reduce((s, p) => s + p[1], 0) / n;
    let num = 0, dx = 0, dy = 0;
    for (const [a, b] of pairs) {
      num += (a - mx) * (b - my);
      dx += (a - mx) ** 2;
      dy += (b - my) ** 2;
    }
    if (dx === 0 || dy === 0) return NaN;
    return num / Math.sqrt(dx * dy);
  }

  /* ---------- Build matrix (apply reverse + missing handling) ---------- */
  function buildMatrix() {
    const idxs = parseSubscale($('#subscale').value, state.headers.length);
    const min = parseFloat($('#scaleMin').value);
    const max = parseFloat($('#scaleMax').value);
    const headers = idxs.map((i) => state.headers[i]);
    const reverseFlags = idxs.map((i) => state.reverseSet.has(i));

    // columns: [item][respondent]
    const cols = idxs.map((colIdx, j) => state.rows.map((r) => {
      const v = r[colIdx];
      if (v === null || !Number.isFinite(v)) return null;
      return reverseFlags[j] ? (min + max - v) : v;
    }));

    const missingMode = $('#missing').value;
    let validRowIdx;
    if (missingMode === 'listwise') {
      validRowIdx = [];
      const N = state.rows.length;
      for (let r = 0; r < N; r++) {
        let ok = true;
        for (let c = 0; c < cols.length; c++) {
          if (cols[c][r] === null) { ok = false; break; }
        }
        if (ok) validRowIdx.push(r);
      }
    } else {
      validRowIdx = state.rows.map((_, i) => i);
    }

    return { headers, cols, reverseFlags, validRowIdx, missingMode };
  }

  /* ---------- Cronbach's α ---------- */
  function cronbachAlpha(cols, validRowIdx) {
    const k = cols.length;
    const itemValues = cols.map((c) => validRowIdx.map((i) => c[i]).filter((v) => v !== null));
    const sumItemVar = cols.reduce((s, c) => s + variance(validRowIdx.map((i) => c[i])), 0);
    const totals = validRowIdx
      .filter((i) => cols.every((c) => c[i] !== null))
      .map((i) => cols.reduce((s, c) => s + c[i], 0));
    const totalVar = variance(totals);
    if (totalVar === 0) return NaN;
    return (k / (k - 1)) * (1 - sumItemVar / totalVar);
  }

  /* ---------- Standardized α from correlation matrix ---------- */
  function standardizedAlpha(cols) {
    const k = cols.length;
    let rSum = 0, count = 0;
    for (let i = 0; i < k; i++) {
      for (let j = i + 1; j < k; j++) {
        const r = pearson(cols[i], cols[j]);
        if (Number.isFinite(r)) { rSum += r; count++; }
      }
    }
    const meanR = count ? rSum / count : NaN;
    if (!Number.isFinite(meanR)) return { alpha: NaN, meanR: NaN };
    const alpha = (k * meanR) / (1 + (k - 1) * meanR);
    return { alpha, meanR };
  }

  /* ---------- Split-half (odd-even) with Spearman-Brown ---------- */
  function splitHalf(cols, validRowIdx) {
    if (cols.length < 2) return NaN;
    const oddIdx = cols.map((_, i) => i).filter((i) => i % 2 === 0);
    const evenIdx = cols.map((_, i) => i).filter((i) => i % 2 === 1);
    const oddTot = [], evenTot = [];
    for (const r of validRowIdx) {
      let a = 0, b = 0, ok = true;
      for (const i of oddIdx) { if (cols[i][r] === null) { ok = false; break; } a += cols[i][r]; }
      if (!ok) continue;
      for (const i of evenIdx) { if (cols[i][r] === null) { ok = false; break; } b += cols[i][r]; }
      if (!ok) continue;
      oddTot.push(a); evenTot.push(b);
    }
    const r = pearson(oddTot, evenTot);
    if (!Number.isFinite(r)) return NaN;
    return (2 * r) / (1 + r);
  }

  /* ---------- Guttman lambda 6 ----------
   * λ6 = 1 - Σ e²_j / σ²_X
   * e²_j = item variance × (1 - R²_j)
   * 用「平均項間相關平方」近似 R²_j（簡化做法）
   */
  function guttmanLambda6(cols, validRowIdx) {
    const k = cols.length;
    const totals = validRowIdx
      .filter((i) => cols.every((c) => c[i] !== null))
      .map((i) => cols.reduce((s, c) => s + c[i], 0));
    const totVar = variance(totals);
    if (totVar === 0) return NaN;

    // R²_j approx: 1 - 1/(1 + Σ r²/(1-r²)) is too heavy; use squared multiple correlation approximation
    // Simpler: use 1 - (1 / VIF) where VIF approximated; here we use mean r² with other items.
    let sumE2 = 0;
    for (let j = 0; j < k; j++) {
      const itemVar = variance(cols[j].filter((_, i) => validRowIdx.includes(i)));
      let rSum2 = 0, cnt = 0;
      for (let m = 0; m < k; m++) {
        if (m === j) continue;
        const r = pearson(cols[j], cols[m]);
        if (Number.isFinite(r)) { rSum2 += r * r; cnt++; }
      }
      const r2 = cnt ? rSum2 / cnt : 0;
      sumE2 += itemVar * (1 - r2);
    }
    return 1 - sumE2 / totVar;
  }

  /* ---------- Item analysis ---------- */
  function itemAnalysis(cols, validRowIdx, headers, reverseFlags) {
    const k = cols.length;
    const overallAlpha = cronbachAlpha(cols, validRowIdx);
    const totalsAll = validRowIdx
      .filter((i) => cols.every((c) => c[i] !== null))
      .map((i) => cols.reduce((s, c) => s + c[i], 0));

    const items = [];
    for (let j = 0; j < k; j++) {
      const colVals = validRowIdx.map((i) => cols[j][i]);
      const m = mean(colVals);
      const s = sd(colVals);

      // Corrected item-total: total minus this item
      const totalRest = [];
      const itemRest = [];
      for (const r of validRowIdx) {
        if (cols.some((c) => c[r] === null)) continue;
        let tot = 0;
        for (let q = 0; q < k; q++) if (q !== j) tot += cols[q][r];
        totalRest.push(tot);
        itemRest.push(cols[j][r]);
      }
      const itr = pearson(itemRest, totalRest);

      // Alpha if deleted
      const reduced = cols.filter((_, idx) => idx !== j);
      const alphaDel = reduced.length >= 2 ? cronbachAlpha(reduced, validRowIdx) : NaN;

      items.push({
        name: headers[j],
        reversed: reverseFlags[j],
        mean: m,
        sd: s,
        itr: itr,
        alphaDel: alphaDel,
        improve: Number.isFinite(alphaDel) && alphaDel > overallAlpha + 0.005
      });
    }
    return { items, overallAlpha };
  }

  /* =========================================================
   * Run analysis & render
   * ========================================================= */
  function runAnalysis() {
    if (!validateData() || !validateScale()) return;

    const { headers, cols, reverseFlags, validRowIdx, missingMode } = buildMatrix();
    if (cols.length < 2) {
      alert('子量表中至少需要 2 道題目。');
      return;
    }
    if (validRowIdx.length < 3) {
      alert('有效樣本不足（< 3）。');
      return;
    }

    const alpha = cronbachAlpha(cols, validRowIdx);
    const { alpha: stdAlpha, meanR } = standardizedAlpha(cols);
    const split = splitHalf(cols, validRowIdx);
    const lambda6 = guttmanLambda6(cols, validRowIdx);

    // total score stats
    const totals = validRowIdx
      .filter((i) => cols.every((c) => c[i] !== null))
      .map((i) => cols.reduce((s, c) => s + c[i], 0));
    const totMean = mean(totals);
    const totSd = sd(totals);

    const { items } = itemAnalysis(cols, validRowIdx, headers, reverseFlags);

    renderResult({
      alpha, stdAlpha, split, lambda6, meanR,
      n: totals.length, k: cols.length,
      totMean, totSd,
      items, alphaOverall: alpha,
      missingMode
    });
  }

  function fmt(x, d = 3) {
    if (!Number.isFinite(x)) return '—';
    return x.toFixed(d);
  }

  function alphaTier(a) {
    if (!Number.isFinite(a)) return { tag: '無法估計', tone: 'bad', desc: '無法估計信度。' };
    if (a >= 0.9) return { tag: '極佳', tone: 'good', desc: '信度極佳，量表內部一致性非常高。' };
    if (a >= 0.8) return { tag: '良好', tone: 'good', desc: '信度良好，量表可放心用於研究與決策。' };
    if (a >= 0.7) return { tag: '可接受', tone: 'good', desc: '信度可接受，達到大多數研究的最低標準。' };
    if (a >= 0.6) return { tag: '勉強可用', tone: 'warn', desc: '信度勉強可用，建議優化量表後再應用。' };
    if (a >= 0.5) return { tag: '較低', tone: 'warn', desc: '信度較低，量表結構需要重大修訂。' };
    return { tag: '不足', tone: 'bad', desc: '信度不足，量表內部一致性較差，不建議直接使用。' };
  }

  function renderResult(R) {
    $('#result').style.display = 'block';

    // Top score card
    $('#alphaVal').textContent = fmt(R.alpha);
    const fillPct = Math.max(0, Math.min(100, R.alpha * 100));
    setTimeout(() => { $('#alphaFill').style.width = fillPct + '%'; }, 50);
    const tier = alphaTier(R.alpha);
    $('#alphaVerdict').innerHTML = `<strong style="color:#c9a961;">${tier.tag}</strong>　${tier.desc}`;

    // Metrics
    $('#mAlpha').textContent = fmt(R.alpha);
    $('#mStdAlpha').textContent = fmt(R.stdAlpha);
    $('#mSplit').textContent = fmt(R.split);
    $('#mLambda').textContent = fmt(R.lambda6);
    $('#mIIC').textContent = fmt(R.meanR);
    $('#mN').textContent = R.n;
    $('#mK').textContent = R.k;
    $('#mTotMean').textContent = fmt(R.totMean, 2);
    $('#mTotSd').textContent = fmt(R.totSd, 2);

    // Item table
    const tbody = $('#itemTable');
    tbody.innerHTML = R.items.map((it) => {
      const flags = [];
      if (it.reversed) flags.push('<span class="flag rev">REV</span>');
      if (it.improve) flags.push('<span class="flag">DEL ↑</span>');
      if (Number.isFinite(it.itr) && it.itr < 0.30) flags.push('<span class="flag">低相關</span>');
      return `
        <tr>
          <td>${escapeHtml(it.name)}</td>
          <td class="num">${fmt(it.mean, 2)}</td>
          <td class="num">${fmt(it.sd, 2)}</td>
          <td class="num">${fmt(it.itr)}</td>
          <td class="num">${fmt(it.alphaDel)}</td>
          <td>${flags.join(' ') || '—'}</td>
        </tr>`;
    }).join('');

    // Alpha-if-deleted bar chart
    const chart = $('#alphaDelChart');
    const overall = R.alphaOverall;
    const minVal = Math.min(...R.items.map((i) => i.alphaDel).filter(Number.isFinite), overall) - 0.02;
    const maxVal = Math.max(...R.items.map((i) => i.alphaDel).filter(Number.isFinite), overall) + 0.02;
    const range = Math.max(0.001, maxVal - minVal);
    chart.innerHTML = R.items.map((it) => {
      const val = it.alphaDel;
      if (!Number.isFinite(val)) return '';
      const pct = ((val - minVal) / range) * 100;
      const cls = val > overall + 0.005 ? 'warn' : '';
      return `
        <div class="bar-row">
          <span class="name">${escapeHtml(it.name)}</span>
          <div class="bar-track"><div class="bar-fill ${cls}" style="width:${pct}%"></div></div>
          <span class="val">${fmt(val)}</span>
        </div>`;
    }).join('') + `
      <div style="margin-top:14px;font-size:12px;color:#888;letter-spacing:.3px;">
        ↑ 整體 α = <b style="color:#c9a961;">${fmt(overall)}</b>；高於此值的條目為「刪除後 α 上升」候選。
      </div>`;

    // Interpretation
    const lowCorr = R.items.filter((i) => Number.isFinite(i.itr) && i.itr < 0.30);
    const improveItems = R.items.filter((i) => i.improve);
    const interpretParts = [
      `本量表共 <b>${R.k}</b> 道題目，有效樣本 <b>${R.n}</b> 人（缺失值處理：${R.missingMode === 'listwise' ? '整列刪除' : '成對刪除'}）。`,
      `Cronbach's α = <b>${fmt(R.alpha)}</b>，屬於「<b>${tier.tag}</b>」水平，${tier.desc}`,
      `Spearman-Brown 折半信度為 ${fmt(R.split)}，Guttman λ6 為 ${fmt(R.lambda6)}，平均項間相關 ${fmt(R.meanR)}。`,
      lowCorr.length
        ? `共 <b>${lowCorr.length}</b> 道題目的校正項目-總分相關低於 .30（${lowCorr.map((i) => i.name).join('、')}），表明這些題目與整體量表的同質性較弱。`
        : `所有題目的校正項目-總分相關均達 .30 以上，整體題項與量表方向一致。`,
      improveItems.length
        ? `刪除題目 <b>${improveItems.map((i) => i.name).join('、')}</b> 後，α 將進一步提升，可考慮在進一步驗證後修訂或移除。`
        : `當前無題目刪除後可提升 α，量表結構相對穩定。`
    ];
    $('#interpretation').innerHTML = interpretParts.join(' ');

    // Recommendations
    const recs = [];
    if (R.alpha < 0.7) {
      recs.push('整體 α 未達 .70，建議檢查題目語義是否清晰、選項是否平衡，必要時補充題目以提高信度。');
    } else if (R.alpha >= 0.95) {
      recs.push('α 過高（≥ .95）可能提示題目存在冗餘或表述高度重複，可審視是否合併題項。');
    } else {
      recs.push('整體信度處於可接受範圍，可進一步通過驗證性因子分析 (CFA) 與 McDonald\'s ω 補充驗證。');
    }
    if (lowCorr.length) {
      recs.push(`針對校正項目-總分相關偏低的題目（${lowCorr.map((i) => i.name).join('、')}），重新審視其題幹是否與構念契合，並檢查是否需要反向計分。`);
    }
    if (improveItems.length) {
      recs.push(`對於「刪除後 α 上升」的題目，建議結合理論意義謹慎決策，避免單純為提高 α 而剔除核心題項。`);
    }
    if (R.n < R.k * 5) {
      recs.push(`當前樣本量 (${R.n}) 不足題目數 (${R.k}) 的 5 倍，估計穩定性有限，建議擴大樣本後重複分析。`);
    }
    if (R.meanR < 0.15) {
      recs.push('平均項間相關較低（< .15），題目間共享方差有限，量表可能涵蓋多個維度，建議進行因子分析。');
    } else if (R.meanR > 0.50) {
      recs.push('平均項間相關偏高（> .50），題目可能存在語義冗餘，可結合內容專家判斷適度精簡。');
    }
    $('#recommendations').innerHTML = recs.map((r) => `<li>${r}</li>`).join('');

    // Scroll to result
    $('#result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

})();
