/* ============================================================
 * Hughie's Online Lab — Academic Hotspot Recommender
 * Public data source: OpenAlex Works API (https://api.openalex.org/works)
 * ============================================================ */
(function () {
  'use strict';

  // ===== 一級學科設定 =====
  // key 必須與內聯腳本中 SUB_BRANCHES 的 key 完全一致
  const BRANCHES = {
    '公共衛生': {
      en: 'Public Health',
      icon: '🏥',
      keywords: ['public health', 'epidemiology', 'health policy']
    },
    '健康管理': {
      en: 'Health Management',
      icon: '💊',
      keywords: ['health management', 'health promotion', 'chronic disease']
    },
    '款待科學': {
      en: 'Hospitality',
      icon: '🏨',
      keywords: ['hospitality management', 'hotel management', 'guest experience']
    },
    '會展管理': {
      en: 'MICE',
      icon: '🎪',
      keywords: ['MICE industry', 'event management', 'exhibition management']
    },
    '食品與營養': {
      en: 'Food & Nutrition',
      icon: '🥗',
      keywords: ['food science', 'nutrition', 'dietary behavior']
    },
    '旅遊科學': {
      en: 'Tourism',
      icon: '✈️',
      keywords: ['tourism research', 'destination management', 'tourist behavior']
    }
  };

  const OPENALEX_BASE = 'https://api.openalex.org/works';
  const MAILTO = 'hughietao@utm.edu.mo'; // OpenAlex polite pool
  const PER_PAGE = 50;

  // 通用詞過濾，避免熱點被頂層學科 concept 佔據
  const GENERIC_CONCEPTS = new Set([
    'Medicine', 'Business', 'Computer science', 'Sociology', 'Economics',
    'Psychology', 'Engineering', 'Political science', 'Geography', 'History',
    'Biology', 'Mathematics', 'Philosophy', 'Art', 'Chemistry', 'Physics',
    'Materials science', 'Environmental science', 'Pathology', 'Biochemistry',
    'Marketing', 'Management', 'Public administration', 'Operations research',
    'Statistics', 'Data science', 'Public relations', 'Knowledge management'
  ]);

  // ===== State =====
  const state = {
    primary: null,
    isLoading: false
  };

  // ===== DOM =====
  const $ = (id) => document.getElementById(id);
  const els = {
    branchTabs: $('branchTabs'),
    yearRange: $('yearRange'),
    sortMode: $('sortMode'),
    customQuery: $('customQuery'),
    runBtn: $('runBtn'),
    allBtn: $('allBtn'),
    statusBox: $('statusBox'),
    resultTitle: $('resultTitle'),
    resultLead: $('resultLead'),
    metricWorks: $('metricWorks'),
    metricHotspots: $('metricHotspots'),
    metricLatestYear: $('metricLatestYear'),
    metricTopBranch: $('metricTopBranch'),
    hotspotList: $('hotspotList'),
    paperList: $('paperList'),
    ideaList: $('ideaList'),
    branchSummary: $('branchSummary')
  };

  // ===== 一級學科 Tabs =====
  function renderPrimaryTabs() {
    const keys = Object.keys(BRANCHES);
    els.branchTabs.innerHTML = keys.map((key, i) => {
      const cfg = BRANCHES[key];
      return `
        <button type="button" class="branch-tab${i === 0 ? ' active' : ''}" data-key="${key}">
          <div class="icon">${cfg.icon}</div>
          <div class="label">${key}<small>${cfg.en}</small></div>
        </button>
      `;
    }).join('');
    state.primary = keys[0];
  }

  els.branchTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.branch-tab');
    if (!tab) return;
    els.branchTabs.querySelectorAll('.branch-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    state.primary = tab.dataset.key;
    // 切換一級學科時，同步清空二級分支選擇
    window.clearSubBranchSelection?.();
  });

  // ===== Status =====
  function setStatus(msg, level) {
    const box = els.statusBox;
    box.classList.remove('show', 'warning', 'error');
    if (!msg) {
      box.textContent = '';
      return;
    }
    box.textContent = msg;
    box.classList.add('show');
    if (level === 'warning') box.classList.add('warning');
    if (level === 'error') box.classList.add('error');
  }

  // ===== Skeletons =====
  function skeletonCard() {
    return `
      <div class="skeleton-card">
        <div class="skeleton skeleton-line w-30"></div>
        <div class="skeleton skeleton-line w-80"></div>
        <div class="skeleton skeleton-line w-50"></div>
      </div>`;
  }
  function showSkeletons() {
    els.hotspotList.innerHTML = skeletonCard() + skeletonCard() + skeletonCard();
    els.paperList.innerHTML   = skeletonCard() + skeletonCard();
    els.ideaList.innerHTML    = skeletonCard() + skeletonCard();
  }

  // ===== 關鍵詞構建 =====
  function buildKeywordList() {
    const cfg = BRANCHES[state.primary];
    if (!cfg) return [];
    const subs = (window.getSelectedSubBranches?.() || []).map(s => s.en);
    const custom = els.customQuery.value
      .split(/[,;·、，。\n]+/)
      .map(s => s.trim())
      .filter(Boolean);

    // 優先使用「二級分支 + 補充關鍵詞」；否則 fallback 到一級基礎詞
    const merged = [...subs, ...custom];
    return merged.length ? merged : cfg.keywords;
  }

  // ===== OpenAlex URL =====
  function buildOpenAlexUrl(keywords, opts = {}) {
    const yearRange = parseInt(els.yearRange.value, 10) || 2;
    const fromYear = new Date().getFullYear() - yearRange;
    const sortMode = els.sortMode.value;

    const params = new URLSearchParams();
    // OpenAlex `search` 參數對自然語言關鍵詞有較好的相關度排序
    params.set('search', keywords.join(' '));
    params.set('per-page', String(opts.perPage || PER_PAGE));
    params.set('filter', `from_publication_date:${fromYear}-01-01,is_paratext:false,language:en`);
    params.set('mailto', MAILTO);

    if (sortMode === 'date') {
      params.set('sort', 'publication_date:desc');
    } else if (sortMode === 'citation') {
      params.set('sort', 'cited_by_count:desc');
    } else {
      params.set('sort', 'relevance_score:desc');
    }
    return `${OPENALEX_BASE}?${params.toString()}`;
  }

  async function fetchWorks(keywords, opts = {}) {
    const url = buildOpenAlexUrl(keywords, opts);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OpenAlex ${res.status}`);
    const data = await res.json();
    return Array.isArray(data.results) ? data.results : [];
  }

  // ===== Inverted Abstract → 文本 =====
  function reconstructAbstract(inv) {
    if (!inv || typeof inv !== 'object') return '';
    const positions = [];
    Object.entries(inv).forEach(([word, idxs]) => {
      idxs.forEach(i => positions[i] = word);
    });
    return positions.filter(Boolean).join(' ').trim();
  }

  // ===== 熱點計分 =====
  function computeHotspots(works) {
    const stats = new Map();
    const currentYear = new Date().getFullYear();

    works.forEach(w => {
      const year = w.publication_year || currentYear;
      const cites = w.cited_by_count || 0;

      (w.concepts || []).forEach(c => {
        if (c.level == null || c.level < 1 || c.level > 3) return;
        if ((c.score || 0) < 0.3) return;
        if (GENERIC_CONCEPTS.has(c.display_name)) return;

        const name = c.display_name;
        if (!stats.has(name)) {
          stats.set(name, { name, count: 0, cites: 0, years: [], level: c.level });
        }
        const s = stats.get(name);
        s.count += 1;
        s.cites += cites;
        s.years.push(year);
      });
    });

    const scored = Array.from(stats.values())
      .filter(s => s.count >= 2)
      .map(s => {
        const avgYear = s.years.reduce((a, b) => a + b, 0) / s.years.length;
        const recency = Math.max(0, 1 - (currentYear - avgYear) * 0.2); // 越新權重越高
        const freqScore = Math.log2(1 + s.count) * 18;
        const citeScore = Math.log10(1 + s.cites) * 12;
        const recScore  = recency * 25;
        return { ...s, avgYear, raw: freqScore + citeScore + recScore };
      });

    if (!scored.length) return [];
    const max = Math.max(...scored.map(s => s.raw)) || 1;
    scored.forEach(s => s.score = Math.round((s.raw / max) * 99) + 1);
    return scored.sort((a, b) => b.score - a.score).slice(0, 6);
  }

  // ===== 渲染：熱點 =====
  function renderHotspots(hotspots) {
    if (!hotspots.length) {
      els.hotspotList.innerHTML = '<div class="empty-hint">未發現顯著熱點，請嘗試擴大時間範圍或更換關鍵詞。</div>';
      return;
    }
    els.hotspotList.innerHTML = hotspots.map((h, i) => `
      <div class="hotspot-card fade-in">
        <div class="hotspot-rank">${String(i + 1).padStart(2, '0')}</div>
        <div class="hotspot-body">
          <h4>${escapeHtml(h.name)}</h4>
          <p>近 ${h.count} 篇文獻提及，累計被引 ${h.cites} 次，平均發表年份 ${Math.round(h.avgYear)}。</p>
          <div class="hotspot-meta">
            <span class="score-pill">熱度 ${h.score}</span>
            <span class="tag">${h.count} 篇</span>
            <span class="tag">${h.cites} 引用</span>
            <span class="tag">L${h.level}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  // ===== 渲染：文獻 =====
  function renderPapers(works) {
    const top = works.slice(0, 8);
    if (!top.length) {
      els.paperList.innerHTML = '<div class="empty-hint">未檢索到符合條件的文獻。</div>';
      return;
    }
    els.paperList.innerHTML = top.map(w => {
      const authors = (w.authorships || []).slice(0, 3)
        .map(a => a.author?.display_name).filter(Boolean);
      const more = (w.authorships || []).length > 3 ? ' et al.' : '';
      const venue = w.primary_location?.source?.display_name
                 || w.host_venue?.display_name
                 || '—';
      const abstract = reconstructAbstract(w.abstract_inverted_index);
      const url = w.doi
        ? (w.doi.startsWith('http') ? w.doi : `https://doi.org/${w.doi}`)
        : (w.id || '#');
      return `
        <div class="paper-card fade-in">
          <div class="paper-meta">
            <span>${w.publication_year || '—'}</span>
            <span>${escapeHtml(venue)}</span>
            <span>${w.cited_by_count || 0} 引用</span>
          </div>
          <h4><a href="${url}" target="_blank" rel="noopener">${escapeHtml(w.title || w.display_name || 'Untitled')}</a></h4>
          ${authors.length ? `<p class="paper-authors">${escapeHtml(authors.join(', ') + more)}</p>` : ''}
          ${abstract ? `<p>${escapeHtml(truncate(abstract, 220))}</p>` : ''}
        </div>
      `;
    }).join('');
  }

  // ===== 渲染：研究選題 =====
  function generateIdeas(hotspots) {
    if (!hotspots.length) {
      els.ideaList.innerHTML = '<div class="empty-hint">需要熱點輸入才能生成研究選題。</div>';
      return;
    }
    const subs = (window.getSelectedSubBranches?.() || []).map(s => s.zh);
    const context = subs.length ? subs.join('、') : state.primary;

    const templates = [
      (h) => ({
        title: `${h} 在「${context}」場景下的影響機制與調節變量`,
        lead:  `以 ${h} 為核心構念，建構結構方程或實驗設計，考察其在 ${context} 中的中介路徑與群體差異。`
      }),
      (h) => ({
        title: `從文獻計量看 ${h} 的研究演化與知識結構`,
        lead:  `以近五年文獻為樣本，繪製關鍵詞共現與作者合作網絡，識別 ${h} 的子主題與研究缺口。`
      }),
      (h) => ({
        title: `${h} 對受眾行為意向的差異化效應`,
        lead:  `比較不同年齡、文化或消費水平的群體在 ${h} 觸達下的反應，探索異質性與調節機制。`
      }),
      (h) => ({
        title: `${h} 與「${context}」可持續發展的耦合路徑`,
        lead:  `從 ESG、碳排或社區層面，探討 ${h} 如何促進可持續成果，並設計可衡量的指標體系。`
      }),
      (h) => ({
        title: `${h} 的混合方法研究：質性訪談 + 量化驗證`,
        lead:  `先以紮根理論訪談梳理構念邊界，再以調研或實驗檢驗假設，提升 ${h} 的解釋力與外部效度。`
      })
    ];

    const ideas = hotspots.slice(0, 5).map((h, i) => templates[i % templates.length](h.name));
    els.ideaList.innerHTML = ideas.map((it, i) => `
      <div class="idea-card fade-in">
        <div class="idea-num">IDEA ${String(i + 1).padStart(2, '0')}</div>
        <h4>${escapeHtml(it.title)}</h4>
        <p>${escapeHtml(it.lead)}</p>
      </div>
    `).join('');
  }

  // ===== 指標 =====
  function updateMetrics({ works, hotspots, topBranch }) {
    els.metricWorks.innerHTML    = `${works.length}<small>retrieved</small>`;
    els.metricHotspots.innerHTML = `${hotspots.length}<small>concepts</small>`;

    if (works.length) {
      const years = works.map(w => w.publication_year).filter(Boolean).sort((a, b) => a - b);
      const median = years[Math.floor(years.length / 2)];
      els.metricLatestYear.innerHTML = `${median || '—'}<small>median year</small>`;
    } else {
      els.metricLatestYear.textContent = '—';
    }

    if (topBranch) {
      els.metricTopBranch.innerHTML = `${escapeHtml(truncate(topBranch.name, 14))}<small>score ${topBranch.score}</small>`;
    } else {
      els.metricTopBranch.textContent = '—';
    }
  }

  // ===== 單分支檢索 =====
  async function runSingle() {
    if (state.isLoading) return;
    if (!state.primary) {
      setStatus('請先選擇一級學科。', 'warning');
      return;
    }

    const keywords = buildKeywordList();
    if (!keywords.length) {
      setStatus('未獲取到有效關鍵詞，請檢查輸入。', 'warning');
      return;
    }

    const subSel = window.getSelectedSubBranches?.() || [];
    const subDesc = subSel.length ? `（${subSel.map(s => s.zh).join('、')}）` : '';

    state.isLoading = true;
    els.runBtn.disabled = true;
    els.allBtn.disabled = true;
    setStatus('正在檢索 OpenAlex …');
    showSkeletons();
    els.resultTitle.textContent = `${state.primary}${subDesc} · 檢索中`;

    try {
      const works = await fetchWorks(keywords);
      const hotspots = computeHotspots(works);

      els.resultTitle.textContent = `${state.primary}${subDesc}`;
      els.resultLead.textContent  = `共檢索到 ${works.length} 篇近期文獻，識別出 ${hotspots.length} 個值得追蹤的熱點主題。`;

      updateMetrics({
        works,
        hotspots,
        topBranch: hotspots[0] ? { name: hotspots[0].name, score: hotspots[0].score } : null
      });
      renderHotspots(hotspots);
      renderPapers(works);
      generateIdeas(hotspots);

      setStatus(`完成。檢索 ${works.length} 篇文獻，識別 ${hotspots.length} 個熱點主題。`);
    } catch (err) {
      console.error('[hotspot]', err);
      setStatus('檢索失敗：' + (err?.message || '未知錯誤') + '。請稍後重試。', 'error');
      els.hotspotList.innerHTML = '<div class="empty-hint">檢索失敗，請稍後重試。</div>';
      els.paperList.innerHTML   = '<div class="empty-hint">—</div>';
      els.ideaList.innerHTML    = '<div class="empty-hint">—</div>';
    } finally {
      state.isLoading = false;
      els.runBtn.disabled = false;
      els.allBtn.disabled = false;
    }
  }

  // ===== 全部分支掃描 =====
  async function runAll() {
    if (state.isLoading) return;

    state.isLoading = true;
    els.runBtn.disabled = true;
    els.allBtn.disabled = true;
    els.branchSummary.innerHTML = skeletonCard() + skeletonCard() + skeletonCard();

    const summary = [];
    const entries = Object.entries(BRANCHES);
    let i = 0;

    for (const [key, cfg] of entries) {
      i++;
      setStatus(`正在分析 ${key}（${i}/${entries.length}）…`);
      try {
        const works = await fetchWorks(cfg.keywords, { perPage: 30 });
        const hotspots = computeHotspots(works);
        summary.push({
          key, en: cfg.en, icon: cfg.icon,
          count: works.length,
          hotspots: hotspots.length,
          topScore: hotspots[0]?.score || 0,
          topName:  hotspots[0]?.name  || '—'
        });
      } catch (err) {
        summary.push({
          key, en: cfg.en, icon: cfg.icon,
          count: 0, hotspots: 0, topScore: 0, topName: '—', error: true
        });
      }
    }

    summary.sort((a, b) => b.topScore - a.topScore);
    renderBranchSummary(summary);
    setStatus('全部一級學科分析完成。');

    state.isLoading = false;
    els.runBtn.disabled = false;
    els.allBtn.disabled = false;
  }

  function renderBranchSummary(summary) {
    if (!summary.length) {
      els.branchSummary.innerHTML = '<div class="empty-hint">無可用結果。</div>';
      return;
    }
    const max = Math.max(...summary.map(s => s.topScore), 1);
    els.branchSummary.innerHTML = summary.map(s => `
      <div class="branch-card fade-in">
        <div class="branch-card-head">
          <div class="icon">${s.icon}</div>
          <div class="branch-card-body">
            <h4>${escapeHtml(s.key)}</h4>
            <p>${s.error
                ? '檢索失敗'
                : `${s.count} 篇 · ${s.hotspots} 熱點 · 首位：${escapeHtml(s.topName)}`}</p>
          </div>
        </div>
        <div class="branch-bar">
          <div class="branch-bar-fill" style="width:${((s.topScore / max) * 100).toFixed(0)}%"></div>
        </div>
      </div>
    `).join('');
  }

  // ===== Utils =====
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function truncate(str, n) {
    if (!str) return '';
    return str.length > n ? str.slice(0, n - 1) + '…' : str;
  }

  // ===== Init =====
  renderPrimaryTabs();
  els.runBtn.addEventListener('click', runSingle);
  els.allBtn.addEventListener('click', runAll);
})();
