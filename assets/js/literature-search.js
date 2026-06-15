/* ============================================================
 * Literature Search Strategy Builder
 * Hughie's Online Lab
 * ============================================================ */

(function () {
  'use strict';

  /* ---------- 状态 ---------- */
  const state = {
    step: 1,
    totalSteps: 3,
    concepts: [],     // {id, label, field, op, terms:[]}
    docTypes: new Set(),
    languages: new Set(),
    excludes: new Set(),
  };
  let conceptId = 0;

  /* ---------- 字段映射表 ---------- */
  // field key: basic | title | tiab | mesh
  const FIELD_LABEL = {
    basic: '主題 / 全字段',
    title: '標題',
    tiab: '標題 + 摘要',
    mesh: '主題詞 (MeSH/Emtree)',
  };

  const FIELD_MAP = {
    pubmed: {
      basic: '',
      title: '[Title]',
      tiab: '[Title/Abstract]',
      mesh: '[MeSH Terms]',
    },
    wos: { basic: 'TS', title: 'TI', tiab: 'TS', mesh: 'TS' },
    scopus: {
      basic: 'ALL',
      title: 'TITLE',
      tiab: 'TITLE-ABS',
      mesh: 'INDEXTERMS',
    },
    embase: {
      basic: ':ab,ti,kw',
      title: ':ti',
      tiab: ':ab,ti',
      mesh: '/exp',
    },
    cochrane: {
      basic: ':ti,ab,kw',
      title: ':ti',
      tiab: ':ti,ab',
      mesh: ':ti,ab,kw',
    },
    cnki: { basic: 'SU', title: 'TI', tiab: 'SU', mesh: 'KY' },
  };

  /* ---------- 文献类型 / 语言映射 ---------- */
  const DOCTYPE_MAP = {
    pubmed: {
      review: 'Review[Publication Type]',
      systematic: 'Systematic Review[Publication Type]',
      meta: 'Meta-Analysis[Publication Type]',
      rct: 'Randomized Controlled Trial[Publication Type]',
      clinical: 'Clinical Trial[Publication Type]',
      cohort: '"Cohort Studies"[MeSH Terms]',
      'case-control': '"Case-Control Studies"[MeSH Terms]',
      article: 'Journal Article[Publication Type]',
      conference: '',
    },
    wos: {
      review: 'DT=("Review")',
      systematic: 'DT=("Review")',
      meta: 'DT=("Review")',
      rct: '',
      clinical: '',
      cohort: '',
      'case-control': '',
      article: 'DT=("Article")',
      conference: 'DT=("Proceedings Paper")',
    },
    scopus: {
      review: 'DOCTYPE(re)',
      systematic: 'DOCTYPE(re)',
      meta: 'DOCTYPE(re)',
      rct: '',
      clinical: '',
      cohort: '',
      'case-control': '',
      article: 'DOCTYPE(ar)',
      conference: 'DOCTYPE(cp)',
    },
    embase: {
      review: "[review]/lim",
      systematic: "[systematic review]/lim",
      meta: "[meta analysis]/lim",
      rct: "[randomized controlled trial]/lim",
      clinical: "[controlled clinical trial]/lim",
      cohort: '',
      'case-control': '',
      article: "[article]/lim",
      conference: "[conference paper]/lim",
    },
    cochrane: {},
    cnki: {},
  };

  const LANG_MAP = {
    pubmed: {
      english: 'English[Language]',
      chinese: 'Chinese[Language]',
      japanese: 'Japanese[Language]',
      german: 'German[Language]',
      french: 'French[Language]',
      spanish: 'Spanish[Language]',
    },
    wos: {
      english: 'LA=(English)',
      chinese: 'LA=(Chinese)',
      japanese: 'LA=(Japanese)',
      german: 'LA=(German)',
      french: 'LA=(French)',
      spanish: 'LA=(Spanish)',
    },
    scopus: {
      english: 'LANGUAGE(english)',
      chinese: 'LANGUAGE(chinese)',
      japanese: 'LANGUAGE(japanese)',
      german: 'LANGUAGE(german)',
      french: 'LANGUAGE(french)',
      spanish: 'LANGUAGE(spanish)',
    },
    embase: {
      english: "[english]/lim",
      chinese: "[chinese]/lim",
      japanese: "[japanese]/lim",
      german: "[german]/lim",
      french: "[french]/lim",
      spanish: "[spanish]/lim",
    },
    cochrane: {},
    cnki: {},
  };

  /* ---------- 数据库元信息 ---------- */
  const DB_INFO = {
    pubmed: {
      name: 'PubMed',
      url: 'https://pubmed.ncbi.nlm.nih.gov/advanced/',
      note: '美國國立醫學圖書館 · 生物醫學文獻。粘貼進「Advanced Search Builder」可直接執行。',
    },
    wos: {
      name: 'Web of Science',
      url: 'https://www.webofscience.com/',
      note: 'Clarivate · 多學科核心合集。在「Advanced Search」中粘貼即可；TS= 涵蓋標題/摘要/作者關鍵詞。',
    },
    scopus: {
      name: 'Scopus',
      url: 'https://www.scopus.com/search/form.uri?display=advanced',
      note: 'Elsevier · 多學科。在「Advanced document search」中粘貼。',
    },
    embase: {
      name: 'Embase',
      url: 'https://www.embase.com/',
      note: 'Elsevier · 藥學/生物醫學，含 Emtree 受控詞表。/exp 表示主題詞 explode。',
    },
    cochrane: {
      name: 'Cochrane Library',
      url: 'https://www.cochranelibrary.com/advanced-search',
      note: '系統評價與 CENTRAL 對照試驗註冊庫。在「Search Manager」中粘貼。',
    },
    cnki: {
      name: 'CNKI 中國知網',
      url: 'https://kns.cnki.net/kns8s/AdvSearch',
      note: '中文文獻 · 進入「專業檢索」（不是高級檢索）粘貼下方語法；萬方 / 維普 語法基本相同。',
    },
  };

  /* ============================================================
   * DOM 引用
   * ============================================================ */
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));

  const els = {
    progressFill: $('#progressFill'),
    steps: $$('.progress-steps .step'),
    formSteps: $$('.form-step'),
    prevBtn: $('#prevBtn'),
    nextBtn: $('#nextBtn'),
    genBtn: $('#generateBtn'),
    backBtn: $('#backToEditBtn'),
    form: $('#builderForm'),
    result: $('#result'),
    conceptList: $('#conceptList'),
    summaryGrid: $('#summaryGrid'),
    dbTabs: $('#dbTabs'),
    dbPanes: $('#dbPanes'),
    tipList: $('#tipList'),
    picoToggle: $('#picoToggle'),
    picoBox: $('#picoBox'),
  };

  /* ============================================================
   * 步骤切换
   * ============================================================ */
  function showStep(n) {
    state.step = n;
    els.formSteps.forEach((el) => el.classList.toggle('active', +el.dataset.step === n));
    els.steps.forEach((el) => {
      const s = +el.dataset.step;
      el.classList.toggle('active', s === n);
      el.classList.toggle('done', s < n);
    });
    els.progressFill.style.width = (n / state.totalSteps) * 100 + '%';
    els.prevBtn.disabled = n === 1;
    if (n === state.totalSteps) {
      els.nextBtn.style.display = 'none';
      els.genBtn.style.display = '';
    } else {
      els.nextBtn.style.display = '';
      els.genBtn.style.display = 'none';
    }
    window.scrollTo({ top: $('.builder-section').offsetTop - 40, behavior: 'smooth' });
  }

  els.prevBtn.addEventListener('click', () => state.step > 1 && showStep(state.step - 1));
  els.nextBtn.addEventListener('click', () => {
    if (state.step === 2 && !validateConcepts()) return;
    if (state.step < state.totalSteps) showStep(state.step + 1);
  });

  /* ============================================================
   * PICO 折叠
   * ============================================================ */
  els.picoToggle.addEventListener('click', () => {
    const open = els.picoBox.classList.toggle('open');
    els.picoToggle.textContent = (open ? '−' : '＋') + ' 使用 PICO / PEO 框架拆解概念';
  });

  /* ============================================================
   * Chip 多选
   * ============================================================ */
  function bindChips(containerId, store) {
    $$('#' + containerId + ' .chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const v = chip.dataset.val;
        if (chip.classList.toggle('on')) store.add(v);
        else store.delete(v);
      });
    });
  }
  bindChips('docTypeChips', state.docTypes);
  bindChips('langChips', state.languages);
  bindChips('excludeChips', state.excludes);

  /* ============================================================
   * 概念组管理
   * ============================================================ */
  function addConcept(data = {}) {
    const id = ++conceptId;
    const concept = {
      id,
      label: data.label || '',
      field: data.field || 'tiab',
      op: data.op || 'AND',
      terms: data.terms || '',
    };
    state.concepts.push(concept);
    renderConcepts();
  }

  function removeConcept(id) {
    state.concepts = state.concepts.filter((c) => c.id !== id);
    renderConcepts();
  }

  function renderConcepts() {
    if (state.concepts.length === 0) {
      els.conceptList.innerHTML = `
        <div class="alert-warn">
          ⚠ 尚未添加概念組。點擊「＋ 添加概念組」開始，或使用「載入示例」快速體驗。
        </div>`;
      return;
    }

    els.conceptList.innerHTML = state.concepts
      .map((c, idx) => {
        const fieldOptions = Object.entries(FIELD_LABEL)
          .map(([k, v]) => `<option value="${k}" ${c.field === k ? 'selected' : ''}>${v}</option>`)
          .join('');

        const opSelect = idx === 0
          ? `<span class="term-count" style="margin:0;">主概念</span>`
          : `<select class="mini-select" data-id="${c.id}" data-key="op">
               <option value="AND" ${c.op === 'AND' ? 'selected' : ''}>AND（與）</option>
               <option value="OR" ${c.op === 'OR' ? 'selected' : ''}>OR（或）</option>
               <option value="NOT" ${c.op === 'NOT' ? 'selected' : ''}>NOT（非）</option>
             </select>`;

        const count = parseTerms(c.terms).length;

        return `
          <div class="concept-card">
            <div class="concept-head">
              <span class="concept-title">概念組 ${String(idx + 1).padStart(2, '0')}</span>
              <div class="concept-actions">
                ${opSelect}
                <select class="mini-select" data-id="${c.id}" data-key="field">${fieldOptions}</select>
                <button type="button" class="btn-mini danger" data-remove="${c.id}">✕ 移除</button>
              </div>
            </div>
            <div class="field" style="margin-bottom:14px;">
              <label style="font-size:12px;color:#888;">概念名稱（備註用，不參與檢索）</label>
              <input type="text" data-id="${c.id}" data-key="label" value="${escapeHtml(c.label)}" placeholder="例：Diabetes Mellitus">
            </div>
            <div class="field" style="margin-bottom:0;">
              <label style="font-size:12px;color:#888;">同義詞 / 關鍵詞</label>
              <textarea data-id="${c.id}" data-key="terms" placeholder="每行一個，或用逗號分隔。例如：&#10;Diabetes Mellitus&#10;Type 2 Diabetes&#10;T2DM&#10;diabet*">${escapeHtml(c.terms)}</textarea>
              <div class="term-count">已解析 <b>${count}</b> 個檢索詞</div>
            </div>
          </div>`;
      })
      .join('');

    // bind events
    $$('#conceptList input, #conceptList textarea, #conceptList select').forEach((el) => {
      el.addEventListener('input', onConceptChange);
      el.addEventListener('change', onConceptChange);
    });
    $$('#conceptList [data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => removeConcept(+btn.dataset.remove));
    });
  }

  function onConceptChange(e) {
    const id = +e.target.dataset.id;
    const key = e.target.dataset.key;
    const c = state.concepts.find((x) => x.id === id);
    if (!c) return;
    c[key] = e.target.value;
    if (key === 'terms') {
      // 仅更新计数，避免重渲染丢焦点
      const card = e.target.closest('.concept-card');
      const cnt = card.querySelector('.term-count b');
      if (cnt) cnt.textContent = parseTerms(c.terms).length;
    }
  }

  $('#addConceptBtn').addEventListener('click', () => addConcept());

  $('#clearAllBtn').addEventListener('click', () => {
    if (state.concepts.length && !confirm('確定要清空全部概念組？')) return;
    state.concepts = [];
    renderConcepts();
  });

  $('#loadDemoBtn').addEventListener('click', () => {
    state.concepts = [];
    addConcept({
      label: 'Diabetes Mellitus',
      field: 'tiab',
      terms: 'Diabetes Mellitus\nType 2 Diabetes\nT2DM\nNIDDM\ndiabet*',
    });
    addConcept({
      label: 'Aerobic Exercise',
      field: 'tiab',
      op: 'AND',
      terms: 'Exercise\nPhysical Activity\nAerobic Exercise\nResistance Training\nWorkout',
    });
    addConcept({
      label: 'Glycemic Control',
      field: 'tiab',
      op: 'AND',
      terms: 'Glycemic Control\nHbA1c\nHemoglobin A1c\nBlood Glucose\nFasting Plasma Glucose',
    });
  });

  $('#loadPicoBtn').addEventListener('click', () => {
    const p = $('#pico_p').value.trim();
    const i = $('#pico_i').value.trim();
    const c = $('#pico_c').value.trim();
    const o = $('#pico_o').value.trim();
    if (!p && !i && !c && !o) {
      alert('請先在第 1 步填寫 PICO 內容。');
      return;
    }
    state.concepts = [];
    if (p) addConcept({ label: 'P · 對象', field: 'tiab', terms: p });
    if (i) addConcept({ label: 'I · 干預', field: 'tiab', op: 'AND', terms: i });
    if (c) addConcept({ label: 'C · 對照', field: 'tiab', op: 'AND', terms: c });
    if (o) addConcept({ label: 'O · 結局', field: 'tiab', op: 'AND', terms: o });
  });

  /* ============================================================
   * 工具函数
   * ============================================================ */
  function parseTerms(raw) {
    if (!raw) return [];
    return raw
      .split(/[\n,，;；]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[m]);
  }

  function quoteIfNeeded(t, db) {
    // 含空格 / 连字符 加引号；CNKI 用单引号
    const needsQuote = /\s|-/.test(t);
    if (!needsQuote) return t;
    return db === 'cnki' ? `'${t}'` : `"${t}"`;
  }

  function validateConcepts() {
    if (state.concepts.length === 0) {
      alert('請至少添加一個概念組。');
      return false;
    }
    const empty = state.concepts.find((c) => parseTerms(c.terms).length === 0);
    if (empty) {
      alert('每個概念組至少需要 1 個檢索詞。');
      return false;
    }
    return true;
  }

  /* ============================================================
   * 各数据库语法生成
   * ============================================================ */
  function buildGroupExpr(concept, db) {
    const terms = parseTerms(concept.terms);
    const fieldKey = concept.field;
    const fieldTag = FIELD_MAP[db][fieldKey];

    const wrapped = terms.map((t) => {
      const q = quoteIfNeeded(t, db);
      switch (db) {
        case 'pubmed':
          return fieldTag ? `${q}${fieldTag}` : q;
        case 'wos':
          // WoS 整组用 字段=( ... OR ... )，每个词不重复字段
          return q;
        case 'scopus':
          return q;
        case 'embase':
          if (fieldKey === 'mesh') return `'${t.toLowerCase()}'/exp`;
          return `${q}${fieldTag}`;
        case 'cochrane':
          return `${q}${fieldTag}`;
        case 'cnki':
          return q;
      }
    });

    const joined = wrapped.join(' OR ');

    switch (db) {
      case 'wos':
        return `${fieldTag}=(${joined})`;
      case 'scopus':
        return `${fieldTag}(${joined})`;
      case 'cnki':
        return `${fieldTag}=(${joined.replace(/ OR /g, ' + ')})`;
      default:
        return `(${joined})`;
    }
  }

  function combineGroups(db) {
    if (state.concepts.length === 0) return '';
    let out = buildGroupExpr(state.concepts[0], db);
    for (let i = 1; i < state.concepts.length; i++) {
      const c = state.concepts[i];
      const expr = buildGroupExpr(c, db);
      const op = c.op || 'AND';
      const cnkiOp = { AND: '*', OR: '+', NOT: '-' };
      const sep = db === 'cnki' ? ` ${cnkiOp[op]} ` : `\nAND${op === 'NOT' ? ' NOT' : op === 'OR' ? ' OR' : ''} `;
      // 修正：op 已经包含 AND/OR/NOT
      let connector;
      if (db === 'cnki') {
        connector = ` ${cnkiOp[op]} `;
      } else {
        connector = `\n${op} `;
      }
      out += connector + expr;
    }
    return out;
  }

  function appendFilters(query, db) {
    let q = query;

    // 年份
    const yf = $('#yearFrom').value.trim();
    const yt = $('#yearTo').value.trim();
    if (yf || yt) {
      const a = yf || '1900';
      const b = yt || '2099';
      switch (db) {
        case 'pubmed':
          q += `\nAND ("${a}"[Date - Publication] : "${b}"[Date - Publication])`;
          break;
        case 'wos':
          q += `\nAND PY=(${a}-${b})`;
          break;
        case 'scopus':
          q += `\nAND PUBYEAR > ${parseInt(a) - 1} AND PUBYEAR < ${parseInt(b) + 1}`;
          break;
        case 'embase':
          q += `\nAND [${a}-${b}]/py`;
          break;
        case 'cochrane':
          q += `\nAND (${a}:${b})`;
          break;
        case 'cnki':
          q += ` AND YE BETWEEN ('${a}','${b}')`;
          break;
      }
    }

    // 文献类型
    if (state.docTypes.size && DOCTYPE_MAP[db]) {
      const items = Array.from(state.docTypes)
        .map((t) => DOCTYPE_MAP[db][t])
        .filter(Boolean);
      if (items.length) {
        q += `\nAND (${items.join(' OR ')})`;
      }
    }

    // 语言
    if (state.languages.size && LANG_MAP[db]) {
      const items = Array.from(state.languages)
        .map((t) => LANG_MAP[db][t])
        .filter(Boolean);
      if (items.length) {
        q += `\nAND (${items.join(' OR ')})`;
      }
    }

    // 排除项
    if (state.excludes.has('human') && db === 'pubmed') {
      q += `\nAND Humans[MeSH Terms]`;
    }
    if (state.excludes.has('preprint')) {
      if (db === 'pubmed') q += `\nNOT preprint[Publication Type]`;
      if (db === 'wos') q += `\nNOT DT=(Preprint)`;
    }
    if (state.excludes.has('retracted')) {
      if (db === 'pubmed') q += `\nNOT Retracted Publication[Publication Type]`;
    }

    return q;
  }

  function buildAll() {
    const dbs = ['pubmed', 'wos', 'scopus', 'embase', 'cochrane', 'cnki'];
    const result = {};
    dbs.forEach((db) => {
      let q = combineGroups(db);
      q = appendFilters(q, db);
      result[db] = q;
    });
    return result;
  }

  /* ============================================================
   * 渲染结果
   * ============================================================ */
  function renderResult() {
    const queries = buildAll();

    // Summary
    const totalTerms = state.concepts.reduce((s, c) => s + parseTerms(c.terms).length, 0);
    const filters =
      (state.docTypes.size ? 1 : 0) +
      (state.languages.size ? 1 : 0) +
      (($('#yearFrom').value || $('#yearTo').value) ? 1 : 0) +
      (state.excludes.size ? 1 : 0);

    els.summaryGrid.innerHTML = `
      <div class="summary-card"><div class="summary-label">概念組</div><div class="summary-value">${state.concepts.length}</div></div>
      <div class="summary-card"><div class="summary-label">檢索詞</div><div class="summary-value">${totalTerms}</div></div>
      <div class="summary-card"><div class="summary-label">限定條件</div><div class="summary-value">${filters}</div></div>
      <div class="summary-card"><div class="summary-label">數據庫</div><div class="summary-value">6</div></div>
    `;

    // Tabs
    const dbs = Object.keys(DB_INFO);
    els.dbTabs.innerHTML = dbs
      .map((db, i) => `<button type="button" class="db-tab ${i === 0 ? 'active' : ''}" data-db="${db}">${DB_INFO[db].name}</button>`)
      .join('');

    els.dbPanes.innerHTML = dbs
      .map((db, i) => {
        const info = DB_INFO[db];
        const q = queries[db];
        const highlighted = highlight(q);
        return `
          <div class="db-pane ${i === 0 ? 'active' : ''}" data-db="${db}">
            <div class="db-meta">
              <strong style="color:#1a1a1a;">${info.name}</strong> · ${info.note}
              <br>官方入口：<a href="${info.url}" target="_blank" rel="noopener">${info.url}</a>
            </div>
            <div class="query-box">
              <button type="button" class="btn-copy" data-copy="${db}">📋 複製</button>
              <span class="query-content">${highlighted}</span>
            </div>
          </div>`;
      })
      .join('');

    $$('.db-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        $$('.db-tab').forEach((t) => t.classList.remove('active'));
        $$('.db-pane').forEach((p) => p.classList.remove('active'));
        tab.classList.add('active');
        $(`.db-pane[data-db="${tab.dataset.db}"]`).classList.add('active');
      });
    });

    $$('.btn-copy').forEach((btn) => {
      btn.addEventListener('click', () => {
        const db = btn.dataset.copy;
        navigator.clipboard.writeText(queries[db]).then(() => {
          btn.textContent = '✓ 已複製';
          btn.classList.add('done');
          setTimeout(() => {
            btn.textContent = '📋 複製';
            btn.classList.remove('done');
          }, 1800);
        });
      });
    });

    // Tips
    renderTips(totalTerms);
  }

  function highlight(q) {
    return escapeHtml(q)
      .replace(/\b(AND|OR|NOT)\b/g, '<span class="op">$1</span>')
      .replace(/(\[[^\]]+\])/g, '<span class="field-tag">$1</span>')
      .replace(/(:ti,ab(?:,kw)?|:ab,ti(?:,kw)?|:ti|\/exp)/g, '<span class="field-tag">$1</span>')
      .replace(/(&quot;[^&]*?&quot;)/g, '<span class="quote">$1</span>')
      .replace(/(TS=|TI=|AB=|AU=|PY=|DT=|LA=|SU=|KY=|FT=)/g, '<span class="field-tag">$1</span>')
      .replace(/\b(TITLE-ABS-KEY|TITLE-ABS|TITLE|ABS|KEY|ALL|DOCTYPE|LANGUAGE|PUBYEAR|INDEXTERMS|AUTH)\b/g, '<span class="field-tag">$1</span>');
  }

  function renderTips(totalTerms) {
    const tips = [];

    if (state.concepts.length < 2) {
      tips.push('當前只有 1 個概念組，召回會非常寬泛；建議至少構建 2–4 個概念組以收斂主題。');
    }
    if (state.concepts.length >= 5) {
      tips.push('概念組超過 4 個容易過度收斂導致漏檢；考慮合併語義相近的組或將次要概念作為篩選條件。');
    }

    const minTerms = Math.min(...state.concepts.map((c) => parseTerms(c.terms).length));
    if (minTerms < 3) {
      tips.push(`存在同義詞較少的概念組（最少 ${minTerms} 個）；建議補充同近義詞、縮寫、舊稱、英美拼寫差異及 MeSH/Emtree 受控詞。`);
    }
    if (totalTerms >= 10) {
      tips.push('同義詞覆蓋良好。建議再用截詞符（如 <code>diabet*</code>）覆蓋詞形變化以進一步提升召回。');
    }

    const hasMesh = state.concepts.some((c) => c.field === 'mesh');
    if (!hasMesh) {
      tips.push('未使用主題詞（MeSH / Emtree）。系統評價建議將至少一個概念組設為「主題詞」字段，並與 [Title/Abstract] 自由詞並列以提升精度與召回的平衡。');
    }

    if (!state.docTypes.size && !state.languages.size && !$('#yearFrom').value && !$('#yearTo').value) {
      tips.push('未設置任何篩選條件（年份/類型/語言）。完整檢索可先不限定，待確定基線命中後再逐步收緊。');
    }

    if (state.excludes.has('preprint') === false) {
      tips.push('如果做正式系統評價，可考慮在 PubMed/WoS 中排除預印本（Preprint）以保證已同行評議。');
    }

    tips.push('建議將最終策略提交給專業圖書館員進行 PRESS 同行評議；報告系統評價時請按 PRISMA-S 規範完整披露各庫檢索式、執行日期與命中數。');
    tips.push('檢索詞數量很多時，PubMed 自動「Term mapping」可能改變語義；可在每個詞後追加 [tiab] 鎖定為自由詞。');

    els.tipList.innerHTML = tips.map((t) => `<li>${t}</li>`).join('');
  }

  /* ============================================================
   * 生成 / 返回
   * ============================================================ */
  els.genBtn.addEventListener('click', () => {
    if (!validateConcepts()) {
      showStep(2);
      return;
    }
    renderResult();
    els.form.style.display = 'none';
    $('.progress-wrap').style.display = 'none';
    els.result.style.display = 'block';
    window.scrollTo({ top: $('.builder-section').offsetTop - 40, behavior: 'smooth' });
  });

  els.backBtn.addEventListener('click', () => {
    els.form.style.display = '';
    $('.progress-wrap').style.display = '';
    els.result.style.display = 'none';
    showStep(state.totalSteps);
  });

  /* ============================================================
   * 初始化
   * ============================================================ */
  renderConcepts();
  showStep(1);
})();
