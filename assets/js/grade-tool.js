/* =========================================================
 * GRADE Evidence Quality Summary Generator
 * Hughie's Online Lab — 教學/初稿用途，非 GRADEpro 替代
 * ========================================================= */

(function () {
  'use strict';

  /* ---------- 常量映射 ---------- */
  const QUALITY_LABEL = {
    4: { zh: '高',   en: 'High',     cls: 'high',     symbol: '⊕⊕⊕⊕' },
    3: { zh: '中',   en: 'Moderate', cls: 'moderate', symbol: '⊕⊕⊕○' },
    2: { zh: '低',   en: 'Low',      cls: 'low',      symbol: '⊕⊕○○' },
    1: { zh: '極低', en: 'Very low', cls: 'verylow',  symbol: '⊕○○○' }
  };

  const DOWNGRADE_LABEL = {
    rob: '偏倚風險 (Risk of bias)',
    inc: '不一致性 (Inconsistency)',
    ind: '間接性 (Indirectness)',
    imp: '不精確性 (Imprecision)',
    pub: '發表偏倚 (Publication bias)'
  };

  const UPGRADE_LABEL = {
    large: '效應量大 (Large effect)',
    dose:  '劑量-反應關係 (Dose-response)',
    conf:  '殘餘混雜傾向減弱效應 (Plausible confounding)'
  };

  const SEVERITY_OPTIONS = [
    { v: 0,  t: '無 / 不嚴重 (0)' },
    { v: -1, t: '嚴重 (-1)' },
    { v: -2, t: '非常嚴重 (-2)' }
  ];

  const UPGRADE_OPTIONS = [
    { v: 0, t: '無 (0)' },
    { v: 1, t: '存在 (+1)' },
    { v: 2, t: '存在 · 強 (+2)' }
  ];

  const INITIAL_OPTIONS = [
    { v: 4, t: '高 · RCT 起評 (4)' },
    { v: 3, t: '中 (3)' },
    { v: 2, t: '低 · 觀察性研究起評 (2)' },
    { v: 1, t: '極低 (1)' }
  ];

  /* ---------- DOM ---------- */
  const outcomeList = document.getElementById('outcomeList');
  const addBtn = document.getElementById('addOutcomeBtn');
  const generateBtn = document.getElementById('generateBtn');
  const resultPanel = document.getElementById('result');
  const toast = document.getElementById('toast');

  let outcomeCount = 0;

  /* ---------- 工具函數 ---------- */
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1800);
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ---------- 結局指標模板 ---------- */
  function buildOutcomeBlock(idx) {
    const id = 'oc_' + idx;
    const sevOpts = SEVERITY_OPTIONS.map(o => `<option value="${o.v}">${o.t}</option>`).join('');
    const upOpts  = UPGRADE_OPTIONS.map(o => `<option value="${o.v}">${o.t}</option>`).join('');
    const initOpts = INITIAL_OPTIONS.map(o => `<option value="${o.v}" ${o.v === 4 ? 'selected' : ''}>${o.t}</option>`).join('');

    const wrap = document.createElement('div');
    wrap.className = 'outcome-block';
    wrap.dataset.id = id;
    wrap.innerHTML = `
      <div class="outcome-head">
        <div class="outcome-tag">Outcome #${idx}</div>
        <button type="button" class="outcome-remove" data-action="remove">移除此結局</button>
      </div>

      <div class="field">
        <label>結局名稱</label>
        <input type="text" data-k="name" placeholder="例：全因死亡（隨訪 2 年）">
      </div>

      <div class="field-row-3">
        <div class="field">
          <label>研究數量</label>
          <input type="number" min="0" step="1" data-k="studies" placeholder="例：8">
        </div>
        <div class="field">
          <label>總樣本量</label>
          <input type="number" min="0" step="1" data-k="sample" placeholder="例：12450">
        </div>
        <div class="field">
          <label>初始證據等級</label>
          <select data-k="initial">${initOpts}</select>
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label>效應量（含類型）</label>
          <input type="text" data-k="effect" placeholder="例：RR 0.78 / MD -2.4 / OR 1.20">
        </div>
        <div class="field">
          <label>95% CI</label>
          <input type="text" data-k="ci" placeholder="例：0.66 to 0.92">
        </div>
      </div>

      <div class="subgroup-title">▼ 降級因素 Downgrading</div>
      <div class="field-row-3">
        <div class="field">
          <label>偏倚風險</label>
          <select data-k="rob">${sevOpts}</select>
        </div>
        <div class="field">
          <label>不一致性</label>
          <select data-k="inc">${sevOpts}</select>
        </div>
        <div class="field">
          <label>間接性</label>
          <select data-k="ind">${sevOpts}</select>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>不精確性</label>
          <select data-k="imp">${sevOpts}</select>
        </div>
        <div class="field">
          <label>發表偏倚</label>
          <select data-k="pub">${sevOpts}</select>
        </div>
      </div>

      <div class="subgroup-title">▲ 升級因素 Upgrading（通常僅用於觀察性研究）</div>
      <div class="field-row-3">
        <div class="field">
          <label>效應量大</label>
          <select data-k="up_large">${upOpts}</select>
        </div>
        <div class="field">
          <label>劑量 - 反應</label>
          <select data-k="up_dose">${upOpts}</select>
        </div>
        <div class="field">
          <label>殘餘混雜傾向減弱效應</label>
          <select data-k="up_conf">${upOpts}</select>
        </div>
      </div>

      <div class="field">
        <label>備註 / 說明（可選）</label>
        <textarea data-k="note" placeholder="可填寫絕對效應、I²、異質性說明、其他補充"></textarea>
      </div>
    `;
    return wrap;
  }

  function addOutcome(prefill) {
    outcomeCount += 1;
    const block = buildOutcomeBlock(outcomeCount);
    outcomeList.appendChild(block);

    if (prefill) {
      Object.keys(prefill).forEach(k => {
        const el = block.querySelector(`[data-k="${k}"]`);
        if (el) el.value = prefill[k];
      });
    }
  }

  outcomeList.addEventListener('click', function (e) {
    const t = e.target;
    if (t.dataset.action === 'remove') {
      const block = t.closest('.outcome-block');
      if (block) {
        if (outcomeList.children.length <= 1) {
          showToast('至少保留一個結局');
          return;
        }
        block.remove();
      }
    }
  });

  addBtn.addEventListener('click', () => addOutcome());

  /* ---------- GRADE 計算 ---------- */
  function gradeOf(initial, downgrades, upgrades) {
    const downSum = Object.values(downgrades).reduce((a, b) => a + Number(b || 0), 0); // 已是負值
    const upSum   = Object.values(upgrades).reduce((a, b) => a + Number(b || 0), 0);
    let final = Number(initial) + downSum + upSum;
    if (final > 4) final = 4;
    if (final < 1) final = 1;
    return final;
  }

  function collectOutcomes() {
    const blocks = outcomeList.querySelectorAll('.outcome-block');
    const result = [];
    blocks.forEach((b, i) => {
      const get = k => {
        const el = b.querySelector(`[data-k="${k}"]`);
        return el ? el.value : '';
      };
      const num = k => {
        const v = get(k);
        return v === '' ? null : Number(v);
      };

      const downgrades = {
        rob: num('rob') || 0,
        inc: num('inc') || 0,
        ind: num('ind') || 0,
        imp: num('imp') || 0,
        pub: num('pub') || 0
      };
      const upgrades = {
        large: num('up_large') || 0,
        dose:  num('up_dose')  || 0,
        conf:  num('up_conf')  || 0
      };
      const initial = num('initial') || 4;
      const final = gradeOf(initial, downgrades, upgrades);

      result.push({
        idx: i + 1,
        name: get('name') || `結局 ${i + 1}`,
        studies: get('studies'),
        sample: get('sample'),
        effect: get('effect'),
        ci: get('ci'),
        initial,
        downgrades,
        upgrades,
        final,
        note: get('note') || ''
      });
    });
    return result;
  }

  function collectPico() {
    return {
      P: document.getElementById('picoP').value.trim(),
      I: document.getElementById('picoI').value.trim(),
      C: document.getElementById('picoC').value.trim(),
      O: document.getElementById('picoO').value.trim(),
      design: document.getElementById('picoDesign').value,
      setting: document.getElementById('picoSetting').value.trim()
    };
  }

  /* ---------- 渲染結果 ---------- */
  function severityText(v) {
    v = Number(v);
    if (v === 0) return '不嚴重';
    if (v === -1) return '嚴重 (-1)';
    if (v === -2) return '非常嚴重 (-2)';
    if (v === 1) return '存在 (+1)';
    if (v === 2) return '存在 · 強 (+2)';
    return '—';
  }

  function buildReason(o) {
    const parts = [];
    Object.keys(o.downgrades).forEach(k => {
      const v = Number(o.downgrades[k]);
      if (v < 0) parts.push(`${DOWNGRADE_LABEL[k]} ${v}`);
    });
    Object.keys(o.upgrades).forEach(k => {
      const v = Number(o.upgrades[k]);
      if (v > 0) parts.push(`${UPGRADE_LABEL[k]} +${v}`);
    });
    if (!parts.length) return '無降級 / 升級';
    return parts.join('；');
  }

  function renderResult() {
    const outcomes = collectOutcomes();
    if (!outcomes.length) {
      showToast('請至少新增一個結局');
      return false;
    }

    const pico = collectPico();

    /* Subtitle */
    const subtitleParts = [];
    if (pico.P) subtitleParts.push(`P: ${pico.P}`);
    if (pico.I) subtitleParts.push(`I: ${pico.I}`);
    if (pico.C) subtitleParts.push(`C: ${pico.C}`);
    document.getElementById('resultSubtitle').textContent =
      subtitleParts.join(' ｜ ') || '請於上方填寫 PICO 以獲得完整標題';

    /* Metric grid: 統計各等級結局數 */
    const tally = { 4: 0, 3: 0, 2: 0, 1: 0 };
    outcomes.forEach(o => tally[o.final]++);
    const metricGrid = document.getElementById('metricGrid');
    metricGrid.innerHTML = `
      <div class="metric">
        <div class="metric-label">結局總數</div>
        <div class="metric-value">${outcomes.length}</div>
        <div class="metric-note">Outcomes</div>
      </div>
      <div class="metric">
        <div class="metric-label">高 High</div>
        <div class="metric-value">${tally[4]}</div>
        <div class="metric-note">⊕⊕⊕⊕</div>
      </div>
      <div class="metric">
        <div class="metric-label">中 Moderate</div>
        <div class="metric-value">${tally[3]}</div>
        <div class="metric-note">⊕⊕⊕○</div>
      </div>
      <div class="metric">
        <div class="metric-label">低 Low</div>
        <div class="metric-value">${tally[2]}</div>
        <div class="metric-note">⊕⊕○○</div>
      </div>
      <div class="metric">
        <div class="metric-label">極低 Very Low</div>
        <div class="metric-value">${tally[1]}</div>
        <div class="metric-note">⊕○○○</div>
      </div>
    `;

    /* SoF Table */
    const tbody = document.getElementById('sofTbody');
    tbody.innerHTML = outcomes.map(o => {
      const q = QUALITY_LABEL[o.final];
      const studiesCell = `${o.studies || '—'}${o.sample ? `<br><span style="color:#888;font-size:11px;">(n=${o.sample})</span>` : ''}`;
      const effectCell = o.effect
        ? `<span class="effect">${escapeHtml(o.effect)}</span>${o.ci ? `<br><span style="color:#888;font-size:11px;">95% CI: ${escapeHtml(o.ci)}</span>` : ''}`
        : '—';
      const reason = buildReason(o);
      const noteHtml = o.note ? `<br><span style="color:#888;font-size:11.5px;">${escapeHtml(o.note)}</span>` : '';
      return `
        <tr>
          <td class="out-name">${escapeHtml(o.name)}</td>
          <td>${studiesCell}</td>
          <td>${effectCell}</td>
          <td>
            <span class="qbadge ${q.cls}">${q.zh} · ${q.en}</span>
            <div style="font-family:'Encode Sans',sans-serif;font-size:13px;color:#c9a961;margin-top:6px;">${q.symbol}</div>
          </td>
          <td>${escapeHtml(reason)}${noteHtml}</td>
        </tr>
      `;
    }).join('');

    /* Detail */
    const detailWrap = document.getElementById('detailWrap');
    detailWrap.innerHTML = outcomes.map(o => {
      const q = QUALITY_LABEL[o.final];
      const downRows = Object.keys(o.downgrades).map(k => `
        <tr><td>${DOWNGRADE_LABEL[k]}</td><td>${severityText(o.downgrades[k])}</td></tr>
      `).join('');
      const upRows = Object.keys(o.upgrades).map(k => `
        <tr><td>${UPGRADE_LABEL[k]}</td><td>${severityText(o.upgrades[k])}</td></tr>
      `).join('');
      const downSum = Object.values(o.downgrades).reduce((a, b) => a + Number(b), 0);
      const upSum   = Object.values(o.upgrades).reduce((a, b) => a + Number(b), 0);

      return `
        <div class="out-detail">
          <div class="out-detail-head">
            <h4>#${o.idx} · ${escapeHtml(o.name)}</h4>
            <span class="qbadge ${q.cls}">${q.zh} · ${q.en} · ${q.symbol}</span>
          </div>
          <table class="out-detail-table">
            <tr><td>研究數 / 樣本量</td><td>${escapeHtml(o.studies || '—')} 項研究${o.sample ? ` / 共 ${escapeHtml(o.sample)} 例` : ''}</td></tr>
            <tr><td>效應量 (95% CI)</td><td>${escapeHtml(o.effect || '—')}${o.ci ? ` (${escapeHtml(o.ci)})` : ''}</td></tr>
            <tr><td>初始等級</td><td>${QUALITY_LABEL[o.initial].zh} (${o.initial} 分)</td></tr>
            ${downRows}
            ${upRows}
            <tr><td>合計變動</td><td>${downSum}（降級） ${upSum >= 0 ? '+' : ''}${upSum}（升級）</td></tr>
            <tr><td>最終等級</td><td><b style="color:#c9a961;">${q.zh} · ${q.en}（${o.final} 分）${q.symbol}</b></td></tr>
            ${o.note ? `<tr><td>備註</td><td>${escapeHtml(o.note)}</td></tr>` : ''}
          </table>
        </div>
      `;
    }).join('');

    /* Markdown */
    const md = buildMarkdown(pico, outcomes);
    document.getElementById('mdPreview').textContent = md;

    resultPanel.style.display = 'block';
    setTimeout(() => {
      resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);

    return true;
  }

  /* ---------- Markdown 生成 ---------- */
  function buildMarkdown(pico, outcomes) {
    const lines = [];
    lines.push('# GRADE 證據質量摘要表（Summary of Findings）');
    lines.push('');
    lines.push('> 本表格由 GRADE 教學工具自動生成，僅供論文 / 報告初稿整理。');
    lines.push('> 正式發表前請以 GRADEpro GDT 與方法學專家覆核。');
    lines.push('');

    lines.push('## 1. 研究問題（PICO）');
    lines.push('');
    lines.push(`- **Population**: ${pico.P || '—'}`);
    lines.push(`- **Intervention / Exposure**: ${pico.I || '—'}`);
    lines.push(`- **Comparison**: ${pico.C || '—'}`);
    lines.push(`- **Outcome（概述）**: ${pico.O || '—'}`);
    const designText = { rct: '隨機對照試驗 (RCT)', obs: '觀察性研究', mixed: '混合 / 不一致' }[pico.design] || '—';
    lines.push(`- **研究設計**: ${designText}`);
    if (pico.setting) lines.push(`- **背景**: ${pico.setting}`);
    lines.push('');

    lines.push('## 2. Summary of Findings');
    lines.push('');
    lines.push('| 結局 Outcome | 研究數 (樣本量) | 效應量 (95% CI) | 證據等級 | 降級 / 升級理由 |');
    lines.push('|---|---|---|---|---|');
    outcomes.forEach(o => {
      const q = QUALITY_LABEL[o.final];
      const sample = o.sample ? ` (n=${o.sample})` : '';
      const eff = o.effect ? `${o.effect}${o.ci ? ` (95% CI: ${o.ci})` : ''}` : '—';
      const reason = buildReason(o).replace(/\|/g, '\\|');
      lines.push(`| ${o.name} | ${o.studies || '—'}${sample} | ${eff} | **${q.zh} / ${q.en}** ${q.symbol} | ${reason} |`);
    });
    lines.push('');

    lines.push('## 3. 證據評估詳情');
    lines.push('');
    outcomes.forEach(o => {
      const q = QUALITY_LABEL[o.final];
      lines.push(`### #${o.idx} · ${o.name}`);
      lines.push('');
      lines.push(`- **初始等級**: ${QUALITY_LABEL[o.initial].zh}（${o.initial}）`);
      Object.keys(o.downgrades).forEach(k => {
        lines.push(`- **${DOWNGRADE_LABEL[k]}**: ${severityText(o.downgrades[k])}`);
      });
      Object.keys(o.upgrades).forEach(k => {
        lines.push(`- **${UPGRADE_LABEL[k]}**: ${severityText(o.upgrades[k])}`);
      });
      lines.push(`- **最終等級**: **${q.zh} / ${q.en}（${o.final}） ${q.symbol}**`);
      if (o.note) lines.push(`- **備註**: ${o.note}`);
      lines.push('');
    });

    lines.push('---');
    lines.push('');
    lines.push('**證據等級說明**');
    lines.push('');
    lines.push('- **High（高）⊕⊕⊕⊕**: 進一步研究極不可能改變對效應估計的信心。');
    lines.push('- **Moderate（中）⊕⊕⊕○**: 進一步研究可能對估計值產生重要影響並可能改變估計值。');
    lines.push('- **Low（低）⊕⊕○○**: 進一步研究很可能對估計值產生重要影響並可能改變估計值。');
    lines.push('- **Very Low（極低）⊕○○○**: 對效應估計很不確定。');
    lines.push('');
    lines.push(`*Generated at ${new Date().toLocaleString()} by Hughie\'s Online Lab — GRADE Tool（教學用途）*`);

    return lines.join('\n');
  }

  /* ---------- 純文字 SoF ---------- */
  function buildPlainTable(outcomes) {
    const headers = ['Outcome', 'Studies (n)', 'Effect (95% CI)', 'Quality', 'Reason'];
    const rows = outcomes.map(o => {
      const q = QUALITY_LABEL[o.final];
      const sample = o.sample ? ` (n=${o.sample})` : '';
      const eff = o.effect ? `${o.effect}${o.ci ? ` (95% CI: ${o.ci})` : ''}` : '—';
      return [o.name, `${o.studies || '—'}${sample}`, eff, `${q.zh}/${q.en} ${q.symbol}`, buildReason(o)];
    });
    const all = [headers].concat(rows);
    const widths = headers.map((_, i) => Math.max(...all.map(r => String(r[i]).length)));
    const fmtRow = r => r.map((c, i) => String(c).padEnd(widths[i])).join('  ');
    const sep = widths.map(w => '-'.repeat(w)).join('  ');
    return [fmtRow(headers), sep].concat(rows.map(fmtRow)).join('\n');
  }

  /* ---------- 複製 / 下載 ---------- */
  function copyText(text, msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => showToast(msg || '已複製'),
        () => fallbackCopy(text, msg)
      );
    } else {
      fallbackCopy(text, msg);
    }
  }
  function fallbackCopy(text, msg) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast(msg || '已複製'); }
    catch (e) { showToast('複製失敗，請手動複製'); }
    document.body.removeChild(ta);
  }

  function download(filename, text) {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  /* ---------- 事件綁定 ---------- */
  generateBtn.addEventListener('click', () => {
    renderResult();
  });

  document.getElementById('copyMdBtn').addEventListener('click', () => {
    const md = document.getElementById('mdPreview').textContent;
    if (!md) return showToast('請先生成結果');
    copyText(md, 'Markdown 已複製');
  });

  document.getElementById('downloadMdBtn').addEventListener('click', () => {
    const md = document.getElementById('mdPreview').textContent;
    if (!md) return showToast('請先生成結果');
    const ts = new Date().toISOString().slice(0, 10);
    download(`GRADE-Summary-${ts}.md`, md);
    showToast('檔案下載中…');
  });

  document.getElementById('copyTableBtn').addEventListener('click', () => {
    const outcomes = collectOutcomes();
    if (!outcomes.length) return showToast('請先生成結果');
    copyText(buildPlainTable(outcomes), '純文字 SoF 已複製');
  });

  /* ---------- 初始化：載入示例數據 ---------- */
  function bootstrap() {
    document.getElementById('picoP').value = '成年 2 型糖尿病患者（HbA1c 7.0–9.0%）';
    document.getElementById('picoI').value = 'SGLT2 抑制劑 + 標準治療';
    document.getElementById('picoC').value = '安慰劑 + 標準治療';
    document.getElementById('picoO').value = '心血管死亡、全因死亡、嚴重低血糖、腎功能惡化';
    document.getElementById('picoSetting').value = '基於 12 項 RCT 的系統綜述';

    addOutcome({
      name: '心血管死亡（隨訪 2.5 年）',
      studies: 8, sample: 24500,
      effect: 'RR 0.82', ci: '0.71 to 0.95',
      initial: 4, rob: -1, inc: 0, ind: 0, imp: 0, pub: 0,
      up_large: 0, up_dose: 0, up_conf: 0,
      note: 'I² = 18%；異質性低。'
    });
    addOutcome({
      name: '嚴重低血糖事件',
      studies: 10, sample: 28100,
      effect: 'RR 1.05', ci: '0.88 to 1.25',
      initial: 4, rob: 0, inc: 0, ind: 0, imp: -1, pub: 0,
      up_large: 0, up_dose: 0, up_conf: 0,
      note: '事件數較少，CI 跨越無效線。'
    });
  }

  bootstrap();
})();
