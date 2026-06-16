/* =====================================================
 * PRISMA 2020 Flow Diagram Generator
 * Hughie's Online Lab · 本地運算，資料不上傳
 * ===================================================== */
(function () {
  'use strict';

  // ---------- DOM 引用 ----------
  const inputs = {
    dbRecords:             document.getElementById('dbRecords'),
    otherRecords:          document.getElementById('otherRecords'),
    afterDedup:            document.getElementById('afterDedup'),
    titleAbstractExcluded: document.getElementById('titleAbstractExcluded'),
    fullTextAssessed:      document.getElementById('fullTextAssessed'),
    fullTextExcluded:      document.getElementById('fullTextExcluded'),
    qualitativeIncluded:   document.getElementById('qualitativeIncluded'),
    metaIncluded:          document.getElementById('metaIncluded')
  };

  const generateBtn = document.getElementById('generateBtn');
  const demoBtn     = document.getElementById('demoBtn');
  const clearBtn    = document.getElementById('clearBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const copyBtn     = document.getElementById('copyBtn');
  const copySvgBtn  = document.getElementById('copySvgBtn');
  const diagramWrap = document.getElementById('diagramWrap');
  const placeholder = document.getElementById('placeholder');
  const alertBox    = document.getElementById('alertBox');
  const toast       = document.getElementById('toast');

  // 當前資料快取（用於 PNG / 文字輸出）
  let currentData = null;

  // ---------- 事件綁定 ----------
  generateBtn.addEventListener('click', handleGenerate);
  Object.values(inputs).forEach(el => {
    el.addEventListener('input', () => {
      // 即時更新（若已有圖則重繪）
      if (currentData) handleGenerate(true);
    });
  });

  demoBtn.addEventListener('click', fillDemo);
  clearBtn.addEventListener('click', clearAll);
  downloadBtn.addEventListener('click', downloadPNG);
  copyBtn.addEventListener('click', copySummary);
  copySvgBtn.addEventListener('click', copySVG);

  // ---------- 主要流程 ----------
  function handleGenerate(silent) {
    const data = readInputs();

    // 至少要有「去重後剩餘文獻數」才有意義
    if (data.afterDedup === null && data.dbRecords === null) {
      if (!silent) shake(generateBtn);
      return;
    }

    currentData = data;
    renderDiagram(data);
    renderAlerts(validate(data));
    enableActions(true);
  }

  function readInputs() {
    const d = {};
    for (const key in inputs) {
      const v = inputs[key].value.trim();
      d[key] = v === '' ? null : Math.max(0, parseInt(v, 10) || 0);
    }
    return d;
  }

  // ---------- 驗證 ----------
  function validate(d) {
    const warns = [];

    const idTotal = (d.dbRecords ?? 0) + (d.otherRecords ?? 0);
    if (d.afterDedup !== null && d.dbRecords !== null && d.otherRecords !== null) {
      if (d.afterDedup > idTotal) {
        warns.push(`「去重後剩餘文獻數」(${d.afterDedup}) 大於識別階段總和 (${idTotal})，請確認。`);
      }
    }

    if (d.afterDedup !== null && d.titleAbstractExcluded !== null && d.fullTextAssessed !== null) {
      const sum = d.titleAbstractExcluded + d.fullTextAssessed;
      if (sum !== d.afterDedup) {
        warns.push(`篩選階段不平衡：題名／摘要排除 (${d.titleAbstractExcluded}) + 全文評估 (${d.fullTextAssessed}) = ${sum}，與去重後 (${d.afterDedup}) 不一致。`);
      }
    }

    if (d.fullTextAssessed !== null && d.fullTextExcluded !== null && d.qualitativeIncluded !== null) {
      const sum = d.fullTextExcluded + d.qualitativeIncluded;
      if (sum !== d.fullTextAssessed) {
        warns.push(`全文階段不平衡：全文排除 (${d.fullTextExcluded}) + 納入定性綜述 (${d.qualitativeIncluded}) = ${sum}，與全文評估 (${d.fullTextAssessed}) 不一致。`);
      }
    }

    if (d.metaIncluded !== null && d.qualitativeIncluded !== null && d.metaIncluded > d.qualitativeIncluded) {
      warns.push(`「納入 Meta 分析數」(${d.metaIncluded}) 不應大於「納入定性綜述數」(${d.qualitativeIncluded})。`);
    }

    return warns;
  }

  function renderAlerts(warns) {
    if (!warns.length) { alertBox.innerHTML = ''; return; }
    alertBox.innerHTML = warns
      .map(w => `<div class="alert"><b>提醒　</b>${w}</div>`)
      .join('');
  }

  // ---------- SVG 繪圖 ----------
  function renderDiagram(d) {
    const svg = buildSVG(d);
    diagramWrap.innerHTML = svg;
    if (placeholder) placeholder.style.display = 'none';
  }

  function fmt(n) { return n === null || n === undefined ? '—' : n.toLocaleString('zh-Hant'); }

  function buildSVG(d) {
    /* 佈局常數（單位 px） */
    const W = 820, H = 820;
    const cx = 300;                // 主軸中心
    const mainW = 320, mainH = 86;
    const mainX = cx - mainW / 2;  // 140

    const sideW = 230, sideH = 70;
    const sideX = 540;

    const topW = 290, topH = 88;
    const topX1 = 10, topX2 = 320;
    const top1cx = topX1 + topW / 2;  // 155
    const top2cx = topX2 + topW / 2;  // 465

    /* Y 座標 */
    const yIdLab = 20;
    const yTop = 42;
    const yMerge = yTop + topH + 24;          // 154
    const yScrLab = yMerge + 14;              // 168
    const yDedup = yScrLab + 22;              // 190
    const gap = 36;
    const yScreen = yDedup + mainH + gap;     // 312
    const yFull   = yScreen + mainH + gap;    // 434
    const yIncLab = yFull + mainH + 18;       // 538
    const yQual   = yIncLab + 22;             // 560
    const yMeta   = yQual + mainH + gap;      // 682

    const colors = {
      fillBox:  '#ffffff',
      fillSide: '#faf7f0',
      stroke:   '#ece5d3',
      accent:   '#c9a961',
      text:     '#1a1a1a',
      sub:      '#888888',
      line:     '#1a1a1a'
    };

    /* ----- helpers ----- */
    const stageLabel = (y, text) => `
      <g>
        <rect x="0" y="${y - 2}" width="3" height="22" fill="${colors.accent}"/>
        <text x="14" y="${y + 14}" font-family="'Encode Sans','Open Sans',sans-serif"
              font-size="11" letter-spacing="2.2" font-weight="700" fill="${colors.text}">${text}</text>
      </g>`;

    const box = (x, y, w, h, lines, opts = {}) => {
      const fill = opts.fill || colors.fillBox;
      const accentColor = opts.accent === false ? null : (opts.accentColor || colors.accent);
      const lineHeight = opts.lineHeight || 17;
      const fontSize = opts.fontSize || 13;
      const total = lines.length;
      const startY = y + h / 2 - ((total - 1) * lineHeight) / 2 + fontSize * 0.35;

      const accentBar = accentColor
        ? `<rect x="${x}" y="${y}" width="3" height="${h}" fill="${accentColor}"/>`
        : '';

      const tspans = lines.map((l, i) => {
        const cls = l.bold ? `font-weight="700" fill="${colors.text}"` : `fill="${l.muted ? colors.sub : colors.text}"`;
        return `<text x="${x + w / 2}" y="${startY + i * lineHeight}" text-anchor="middle"
                      font-family="'Open Sans','Microsoft JhengHei','PingFang TC',sans-serif"
                      font-size="${fontSize}" ${cls}>${escapeXml(l.text)}</text>`;
      }).join('');

      return `
        <g>
          <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${colors.stroke}" stroke-width="1"/>
          ${accentBar}
          ${tspans}
        </g>`;
    };

    const arrow = (x1, y1, x2, y2) =>
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
             stroke="${colors.line}" stroke-width="1.4" marker-end="url(#arr)" />`;

    const lineSeg = (x1, y1, x2, y2) =>
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
             stroke="${colors.line}" stroke-width="1.4" />`;

    /* ----- 內容文本 ----- */
    const idTotal = (d.dbRecords ?? 0) + (d.otherRecords ?? 0);

    const top1 = box(topX1, yTop, topW, topH, [
      { text: '資料庫檢索獲得文獻', bold: true },
      { text: `n = ${fmt(d.dbRecords)}` }
    ]);

    const top2 = box(topX2, yTop, topW, topH, [
      { text: '其他來源獲得文獻', bold: true },
      { text: `n = ${fmt(d.otherRecords)}` }
    ]);

    const dedup = box(mainX, yDedup, mainW, mainH, [
      { text: '去重後剩餘文獻', bold: true },
      { text: `n = ${fmt(d.afterDedup)}` },
      { text: `（識別總數 n = ${fmt(idTotal || null)}）`, muted: true }
    ]);

    const screen = box(mainX, yScreen, mainW, mainH, [
      { text: '題名／摘要篩選', bold: true },
      { text: `n = ${fmt(d.afterDedup)}` }
    ]);

    const screenExcl = box(sideX, yScreen + (mainH - sideH) / 2, sideW, sideH, [
      { text: '篩選階段排除', bold: true },
      { text: `n = ${fmt(d.titleAbstractExcluded)}` }
    ], { fill: colors.fillSide });

    const full = box(mainX, yFull, mainW, mainH, [
      { text: '進入全文評估', bold: true },
      { text: `n = ${fmt(d.fullTextAssessed)}` }
    ]);

    const fullExcl = box(sideX, yFull + (mainH - sideH) / 2, sideW, sideH, [
      { text: '全文評估排除', bold: true },
      { text: `n = ${fmt(d.fullTextExcluded)}` }
    ], { fill: colors.fillSide });

    const qual = box(mainX, yQual, mainW, mainH, [
      { text: '納入定性綜述', bold: true },
      { text: `n = ${fmt(d.qualitativeIncluded)}` }
    ]);

    const meta = box(mainX, yMeta, mainW, mainH, [
      { text: '納入 Meta 分析', bold: true },
      { text: `n = ${fmt(d.metaIncluded)}` }
    ]);

    /* ----- 連接線 ----- */
    // Top 兩個方塊往下匯流
    const top1Bot = yTop + topH;
    const top2Bot = yTop + topH;
    const merge = `
      ${lineSeg(top1cx, top1Bot, top1cx, yMerge)}
      ${lineSeg(top2cx, top2Bot, top2cx, yMerge)}
      ${lineSeg(top1cx, yMerge, top2cx, yMerge)}
      ${arrow(cx, yMerge, cx, yDedup)}
    `;

    // Dedup → Screen
    const a1 = arrow(cx, yDedup + mainH, cx, yScreen);
    // Screen → ScreenExcl
    const a2 = arrow(mainX + mainW, yScreen + mainH / 2, sideX, yScreen + mainH / 2);
    // Screen → Full
    const a3 = arrow(cx, yScreen + mainH, cx, yFull);
    // Full → FullExcl
    const a4 = arrow(mainX + mainW, yFull + mainH / 2, sideX, yFull + mainH / 2);
    // Full → Qual
    const a5 = arrow(cx, yFull + mainH, cx, yQual);
    // Qual → Meta
    const a6 = arrow(cx, yQual + mainH, cx, yMeta);

    /* ----- 組裝 SVG ----- */
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="PRISMA 流程圖">
  <defs>
    <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="strokeWidth"
            markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="${colors.line}"/>
    </marker>
  </defs>

  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>

  <!-- 標題 -->
  <text x="${cx}" y="${H - 18}" text-anchor="middle"
        font-family="'Encode Sans','Open Sans',sans-serif"
        font-size="11" letter-spacing="2" fill="${colors.sub}">
    PRISMA 2020 FLOW DIAGRAM · Generated by Hughie's Online Lab
  </text>

  <!-- 階段標籤 -->
  ${stageLabel(yIdLab,  '識別 IDENTIFICATION')}
  ${stageLabel(yScrLab, '篩選 SCREENING')}
  ${stageLabel(yIncLab, '納入 INCLUDED')}

  <!-- 連接線 -->
  ${merge}
  ${a1}${a2}${a3}${a4}${a5}${a6}

  <!-- 方塊 -->
  ${top1}${top2}
  ${dedup}
  ${screen}${screenExcl}
  ${full}${fullExcl}
  ${qual}
  ${meta}
</svg>`.trim();
  }

  function escapeXml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // ---------- 互動操作 ----------
  function enableActions(on) {
    [downloadBtn, copyBtn, copySvgBtn].forEach(b => b.disabled = !on);
  }

  function fillDemo() {
    inputs.dbRecords.value = 1240;
    inputs.otherRecords.value = 35;
    inputs.afterDedup.value = 980;
    inputs.titleAbstractExcluded.value = 820;
    inputs.fullTextAssessed.value = 160;
    inputs.fullTextExcluded.value = 125;
    inputs.qualitativeIncluded.value = 35;
    inputs.metaIncluded.value = 22;
    handleGenerate();
  }

  function clearAll() {
    Object.values(inputs).forEach(el => el.value = '');
    diagramWrap.innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">≡</div>
        <p>請先在左側填入各階段文獻數量<br>再點擊「生成流程圖」即可預覽</p>
      </div>`;
    alertBox.innerHTML = '';
    enableActions(false);
    currentData = null;
  }

  // ---------- 下載 PNG ----------
  function downloadPNG() {
    const svgEl = diagramWrap.querySelector('svg');
    if (!svgEl) return;

    // 取得 SVG 字串（內聯字體保險：嵌入到 SVG 內）
    const clone = svgEl.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const svgString = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob(
      ['<?xml version="1.0" encoding="UTF-8"?>\n', svgString],
      { type: 'image/svg+xml;charset=utf-8' }
    );
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const scale = 2; // 2x 解析度
      const vb = svgEl.viewBox.baseVal;
      const w = (vb.width  || svgEl.width.baseVal.value) * scale;
      const h = (vb.height || svgEl.height.baseVal.value) * scale;

      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(blob => {
        if (!blob) { showToast('匯出失敗，請重試'); return; }
        const a = document.createElement('a');
        a.download = `prisma-flow-${stamp()}.png`;
        a.href = URL.createObjectURL(blob);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        URL.revokeObjectURL(url);
        showToast('已下載 PNG');
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      showToast('圖片轉換失敗');
    };
    img.src = url;
  }

  // ---------- 複製文字摘要 ----------
  function copySummary() {
    if (!currentData) return;
    const d = currentData;
    const idTotal = (d.dbRecords ?? 0) + (d.otherRecords ?? 0);

    const lines = [
      'PRISMA 2020 文獻篩選流程摘要',
      '────────────────────────────',
      '【識別 Identification】',
      `  ・資料庫檢索獲得文獻：${fmt(d.dbRecords)} 篇`,
      `  ・其他來源獲得文獻：${fmt(d.otherRecords)} 篇`,
      `  ・識別合計：${fmt(idTotal || null)} 篇`,
      '',
      '【篩選 Screening】',
      `  ・去重後剩餘文獻：${fmt(d.afterDedup)} 篇`,
      `  ・題名／摘要篩選排除：${fmt(d.titleAbstractExcluded)} 篇`,
      `  ・進入全文評估：${fmt(d.fullTextAssessed)} 篇`,
      `  ・全文評估排除：${fmt(d.fullTextExcluded)} 篇`,
      '',
      '【納入 Included】',
      `  ・最終納入定性綜述：${fmt(d.qualitativeIncluded)} 篇`,
      `  ・最終納入 Meta 分析：${fmt(d.metaIncluded)} 篇`,
      '────────────────────────────',
      `生成時間：${new Date().toLocaleString('zh-Hant')}`,
      '由 Hughie\'s Online Lab · PRISMA Flow Generator 生成（本地計算）'
    ].join('\n');

    copyText(lines).then(() => showToast('已複製文字摘要'));
  }

  // ---------- 複製 SVG 原始碼 ----------
  function copySVG() {
    const svgEl = diagramWrap.querySelector('svg');
    if (!svgEl) return;
    const svgString = new XMLSerializer().serializeToString(svgEl);
    copyText(svgString).then(() => showToast('已複製 SVG 原始碼'));
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(resolve => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      resolve();
    });
  }

  // ---------- 工具 ----------
  function stamp() {
    const d = new Date(), pad = n => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  }

  let toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  function shake(el) {
    el.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' },
       { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
      { duration: 280 }
    );
  }
})();
