/* =========================================================
 * 學術熱點推薦器
 * 多學科支援：公共衛生 / 健康管理 / 款待科學 /
 *           會展管理 / 食品與營養 / 旅遊科學
 * 資料源：OpenAlex Works API（免費、無需 key，使用 mailto polite pool）
 * ========================================================= */

// ====== 內建 API 設定（不需用戶輸入）======
// OpenAlex 免費使用，僅需提供聯絡郵箱進入 polite pool 以獲得更穩定的速率
const OPENALEX_MAILTO = 'hughietao@utm.edu.mo';
// 若未來要改用付費或私有 endpoint，可在此填寫；留空即使用公開 API
const OPENALEX_API_KEY = '';
const OPENALEX_BASE = 'https://api.openalex.org/works';

// ====== 學科分支定義 ======
const BRANCHES = {
  publicHealth: {
    id: 'publicHealth',
    name: '公共衛生',
    nameEn: 'Public Health',
    icon: '🏥',
    keywords: [
      'public health', 'epidemiology', 'health policy',
      'health equity', 'disease prevention', 'global health',
      'health communication', 'health behavior intervention'
    ]
  },
  healthMgmt: {
    id: 'healthMgmt',
    name: '健康管理',
    nameEn: 'Health Management',
    icon: '💊',
    keywords: [
      'health management', 'wellness program', 'chronic disease management',
      'preventive healthcare', 'health informatics', 'patient experience',
      'digital health', 'mHealth'
    ]
  },
  hospitality: {
    id: 'hospitality',
    name: '款待科學',
    nameEn: 'Hospitality Science',
    icon: '🏨',
    keywords: [
      'hospitality management', 'hotel industry', 'guest experience',
      'service quality', 'hospitality marketing', 'lodging',
      'hospitality technology', 'restaurant management'
    ]
  },
  mice: {
    id: 'mice',
    name: '會展管理',
    nameEn: 'MICE / Event Management',
    icon: '🎪',
    keywords: [
      'MICE industry', 'event management', 'convention tourism',
      'exhibition management', 'business events', 'meetings industry',
      'festival management', 'trade show'
    ]
  },
  foodNutrition: {
    id: 'foodNutrition',
    name: '食品與營養科學',
    nameEn: 'Food & Nutrition Science',
    icon: '🥗',
    keywords: [
      'food science', 'nutrition', 'dietary intake',
      'food safety', 'functional food', 'nutraceutical',
      'food technology', 'sustainable diet'
    ]
  },
  tourism: {
    id: 'tourism',
    name: '旅遊科學',
    nameEn: 'Tourism Science',
    icon: '✈️',
    keywords: [
      'tourism management', 'tourist behavior', 'destination management',
      'sustainable tourism', 'travel experience', 'cultural tourism',
      'smart tourism', 'tourism marketing'
    ]
  }
};

// ====== 停用詞（用於補充關鍵詞抽取，目前已用 OpenAlex topics，故僅作備援）======
const STOPWORDS = new Set([
  'the','a','an','and','or','of','in','on','at','to','for','with','by','from','as',
  'is','are','was','were','be','been','being','this','that','these','those','it','its',
  'study','research','analysis','approach','based','using','use','used','case','effect',
  'effects','impact','role','among','between','during','after','before','through','via',
  'we','our','their','they','can','may','also','more','most','than','such','into','one',
  'two','three','new','findings','results','paper','review','article','data'
]);

// ====== 狀態 ======
const state = {
  selectedBranch: 'hospitality',
  lastResult: null
};

// ====== DOM 引用 ======
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
  ideaList: $('ideaList'),
  paperList: $('paperList'),
  branchSummary: $('branchSummary')
};

// ====== 初始化 ======
function init() {
  renderBranchTabs();
  els.runBtn.addEventListener('click', () => runSingle());
  els.allBtn.addEventListener('click', () => runAll());
}

function renderBranchTabs() {
  els.branchTabs.innerHTML = Object.values(BRANCHES).map(b => `
    <button class="branch-tab ${b.id === state.selectedBranch ? 'active' : ''}"
            data-id="${b.id}" type="button">
      <span class="icon">${b.icon}</span>
      <span class="label">
        ${b.name}
        <small>${b.nameEn}</small>
      </span>
    </button>
  `).join('');
  els.branchTabs.querySelectorAll('.branch-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedBranch = btn.dataset.id;
      els.branchTabs.querySelectorAll('.branch-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

// ====== 狀態提示 ======
function setStatus(msg, type = '') {
  els.statusBox.className = 'status-box show ' + type;
  els.statusBox.textContent = msg;
}
function clearStatus() {
  els.statusBox.className = 'status-box';
  els.statusBox.textContent = '';
}
function setLoading(loading) {
  els.runBtn.disabled = loading;
  els.allBtn.disabled = loading;
  els.runBtn.textContent = loading ? '檢索中…' : '檢索熱點';
}

// ====== Skeleton ======
function showSkeletons() {
  const skel = (lines = 3) => `
    <div class="skeleton-card">
      ${Array.from({ length: lines }, (_, i) =>
        `<div class="skeleton skeleton-line ${i === lines - 1 ? 'w-50' : i === 0 ? 'w-30' : 'w-80'}"></div>`
      ).join('')}
    </div>`;
  els.hotspotList.innerHTML = skel(3) + skel(3) + skel(3);
  els.paperList.innerHTML = skel(4) + skel(4);
  els.ideaList.innerHTML = skel(2) + skel(2);
}

// ====== OpenAlex 檢索 ======
async function fetchWorks(branch, years, sortMode, customExtra = '') {
  // 構造 search query：分支關鍵詞 OR 連接，並可附加自定義詞
  const baseTerms = branch.keywords.map(k => `"${k}"`).join(' OR ');
  const extraTerms = customExtra
    .split(/[\s,;，；]+/)
    .filter(Boolean)
    .map(w => `"${w}"`)
    .join(' OR ');
  const searchQuery = extraTerms ? `(${baseTerms}) AND (${extraTerms})` : baseTerms;

  const fromYear = new Date().getFullYear() - parseInt(years, 10);
  const sortParam = sortMode === 'date'
    ? 'publication_date:desc'
    : sortMode === 'citation'
      ? 'cited_by_count:desc'
      : 'relevance_score:desc';

  const params = new URLSearchParams({
    search: searchQuery,
    filter: `from_publication_date:${fromYear}-01-01,is_paratext:false,type:article`,
    sort: sortParam,
    'per-page': '40',
    mailto: OPENALEX_MAILTO
  });
  const url = `${OPENALEX_BASE}?${params.toString()}`;

  const headers = { 'Accept': 'application/json' };
  if (OPENALEX_API_KEY) headers['Authorization'] = `Bearer ${OPENALEX_API_KEY}`;

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`OpenAlex 檢索失敗（HTTP ${res.status}）`);
  const data = await res.json();
  return data.results || [];
}

// ====== Abstract 還原 ======
function rebuildAbstract(invertedIndex) {
  if (!invertedIndex) return '';
  const arr = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    positions.forEach(pos => arr.push([pos, word]));
  }
  arr.sort((a, b) => a[0] - b[0]);
  let txt = arr.map(p => p[1]).join(' ');
  if (txt.length > 280) txt = txt.slice(0, 280) + '…';
  return txt;
}

// ====== 熱點抽取 ======
function extractHotspots(works) {
  const topicMap = new Map(); // key -> { name, count, citations, latestYear, weighted }

  const currentYear = new Date().getFullYear();
  works.forEach(w => {
    const year = w.publication_year || currentYear;
    const recency = Math.max(0.4, 1 - (currentYear - year) * 0.15);
    const cited = w.cited_by_count || 0;
    const citationBoost = 1 + Math.log10(1 + cited) * 0.3;

    // 主來源：OpenAlex topics
    const topics = (w.topics || []).slice(0, 3);
    topics.forEach((t, idx) => {
      if (!t || !t.display_name) return;
      const key = t.display_name.toLowerCase();
      const slot = topicMap.get(key) || {
        name: t.display_name,
        field: t.field?.display_name || '',
        count: 0, citations: 0, latestYear: 0, weighted: 0
      };
      slot.count += 1;
      slot.citations += cited;
      slot.latestYear = Math.max(slot.latestYear, year);
      const positionWeight = 1 - idx * 0.18;
      slot.weighted += recency * citationBoost * positionWeight;
      topicMap.set(key, slot);
    });
  });

  const all = [...topicMap.values()];
  if (all.length === 0) return [];
  const max = Math.max(...all.map(t => t.weighted), 1);
  return all
    .map(t => ({ ...t, score: Math.round((t.weighted / max) * 100) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

// ====== 研究選題生成 ======
function generateIdeas(branch, hotspots) {
  if (hotspots.length === 0) return [];
  const ideas = [];
  const top = hotspots.slice(0, 5);

  if (top[0] && top[1]) {
    ideas.push({
      title: `${top[0].name} 與 ${top[1].name} 的交互作用`,
      desc: `在「${branch.name}」情境下，探究 ${top[0].name} 對 ${top[1].name} 的影響機制，可採用問卷調查、實驗法或文本挖掘進行驗證。`
    });
  }
  if (top[0]) {
    ideas.push({
      title: `${top[0].name} 的系統性綜述與元分析`,
      desc: `針對近 5 年內 ${top[0].name} 的相關研究進行系統性回顧，整合不同情境下的效應量，識別研究缺口。`
    });
  }
  if (top[2]) {
    ideas.push({
      title: `${top[2].name} 在 ${branch.name} 中的本土化應用`,
      desc: `結合區域脈絡（如大灣區、東南亞），探索 ${top[2].name} 的落地路徑、影響因素與實證效果。`
    });
  }
  if (top[3] && top[4]) {
    ideas.push({
      title: `跨主題整合：${top[3].name} × ${top[4].name}`,
      desc: `從多理論視角審視兩個熱點的協同效應，建構整合性概念框架，並提出可檢驗的命題。`
    });
  }
  if (top[0]) {
    ideas.push({
      title: `${top[0].name} 的方法論創新`,
      desc: `將機器學習、社會網絡分析或縱向追蹤方法引入 ${top[0].name} 研究，補足傳統橫斷面設計的不足。`
    });
  }
  return ideas.slice(0, 5);
}

// ====== 渲染 ======
function renderHotspots(hotspots, branch) {
  if (hotspots.length === 0) {
    els.hotspotList.innerHTML = `<div class="empty-hint">未檢索到足夠資料以生成熱點，建議放寬時間範圍。</div>`;
    return;
  }
  els.hotspotList.innerHTML = hotspots.map((h, i) => `
    <div class="hotspot-card fade-in">
      <div class="hotspot-rank">${String(i + 1).padStart(2, '0')}</div>
      <div class="hotspot-body">
        <h4>${escapeHtml(h.name)}</h4>
        <p>${branch.name}領域中該主題出現於 <strong>${h.count}</strong> 篇近期文獻，累計被引 <strong>${h.citations}</strong> 次，最新年份 ${h.latestYear || '—'}。</p>
        <div class="hotspot-meta">
          <span class="score-pill">熱度 ${h.score}</span>
          ${h.field ? `<span class="tag">${escapeHtml(h.field)}</span>` : ''}
          <span class="tag">${h.count} 篇</span>
        </div>
      </div>
    </div>
  `).join('');
}

function renderPapers(works, sortMode) {
  if (works.length === 0) {
    els.paperList.innerHTML = `<div class="empty-hint">未檢索到符合條件的文獻。</div>`;
    return;
  }
  // 取前 10 篇展示
  const top = works.slice(0, 10);
  els.paperList.innerHTML = top.map(w => {
    const authors = (w.authorships || []).slice(0, 3)
      .map(a => a.author?.display_name).filter(Boolean).join(', ');
    const venue = w.primary_location?.source?.display_name || w.host_venue?.display_name || '';
    const abstract = rebuildAbstract(w.abstract_inverted_index);
    const url = w.doi ? `https://doi.org/${w.doi.replace('https://doi.org/','')}` : (w.id || '#');
    const tags = (w.topics || []).slice(0, 3).map(t => t.display_name).filter(Boolean);

    return `
      <div class="paper-card fade-in">
        <div class="paper-meta">
          <span>${w.publication_year || '—'}</span>
          ${venue ? `<span>${escapeHtml(venue)}</span>` : ''}
          <span>${w.cited_by_count || 0} citations</span>
        </div>
        <h4><a href="${url}" target="_blank" rel="noopener">${escapeHtml(w.title || '(no title)')}</a></h4>
        ${authors ? `<p class="paper-authors">${escapeHtml(authors)}${(w.authorships || []).length > 3 ? ' et al.' : ''}</p>` : ''}
        ${abstract ? `<p>${escapeHtml(abstract)}</p>` : ''}
        ${tags.length ? `<div class="hotspot-meta">${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
      </div>
    `;
  }).join('');
}

function renderIdeas(ideas) {
  if (ideas.length === 0) {
    els.ideaList.innerHTML = `<div class="empty-hint">尚無研究選題建議。</div>`;
    return;
  }
  els.ideaList.innerHTML = ideas.map((idea, i) => `
    <div class="idea-card fade-in">
      <div class="idea-num">IDEA ${String(i + 1).padStart(2, '0')}</div>
      <h4>${escapeHtml(idea.title)}</h4>
      <p>${escapeHtml(idea.desc)}</p>
    </div>
  `).join('');
}

function renderBranchSummary(summary) {
  if (!summary || summary.length === 0) {
    els.branchSummary.innerHTML = `<div class="empty-hint">點擊「分析全部分支」即可查看跨學科熱度比較。</div>`;
    return;
  }
  const max = Math.max(...summary.map(s => s.score), 1);
  els.branchSummary.innerHTML = summary
    .sort((a, b) => b.score - a.score)
    .map(s => {
      const pct = Math.round((s.score / max) * 100);
      return `
        <div class="branch-card fade-in">
          <div class="icon">${s.icon}</div>
          <div class="branch-card-body">
            <h4>${s.name} <span class="tag" style="margin-left:6px;">${s.works} 篇</span></h4>
            <p>Top hotspot: ${escapeHtml(s.topHotspot || '—')}</p>
            <div class="branch-bar"><div class="branch-bar-fill" style="width:${pct}%"></div></div>
          </div>
        </div>`;
    }).join('');
}

function updateMetrics({ works, hotspots, medianYear, topBranch }) {
  els.metricWorks.textContent = works ?? '—';
  els.metricHotspots.textContent = hotspots ?? '—';
  els.metricLatestYear.textContent = medianYear ?? '—';
  els.metricTopBranch.innerHTML = topBranch
    ? `<span style="font-size:18px;">${topBranch}</span>`
    : '—';
}

// ====== 入口：單分支 ======
async function runSingle() {
  const branch = BRANCHES[state.selectedBranch];
  if (!branch) return;
  const years = els.yearRange.value;
  const sortMode = els.sortMode.value;
  const customExtra = els.customQuery.value.trim();

  setLoading(true);
  setStatus(`正在檢索 ${branch.name}（${branch.nameEn}）近 ${years} 年的文獻…`);
  showSkeletons();

  try {
    const works = await fetchWorks(branch, years, sortMode, customExtra);
    if (works.length === 0) {
      setStatus('未檢索到任何文獻，建議拉長時間範圍或調整關鍵詞。', 'warning');
      els.resultTitle.textContent = '無結果。';
      els.resultLead.textContent = '可嘗試切換到其他分支或放寬時間範圍。';
      updateMetrics({ works: 0, hotspots: 0, medianYear: '—', topBranch: branch.icon + ' ' + branch.name });
      els.hotspotList.innerHTML = `<div class="empty-hint">無熱點可推薦。</div>`;
      els.paperList.innerHTML = `<div class="empty-hint">無文獻可顯示。</div>`;
      els.ideaList.innerHTML = `<div class="empty-hint">無研究選題建議。</div>`;
      return;
    }

    const hotspots = extractHotspots(works);
    const ideas = generateIdeas(branch, hotspots);
    const years_arr = works.map(w => w.publication_year).filter(Boolean).sort();
    const medianYear = years_arr[Math.floor(years_arr.length / 2)] || '—';

    els.resultTitle.textContent = `${branch.name}學術熱點。`;
    els.resultLead.textContent = `共檢索到 ${works.length} 篇文獻，識別出 ${hotspots.length} 個熱點主題，下方列出排名前 ${Math.min(10, works.length)} 篇代表性文獻。`;
    updateMetrics({
      works: works.length,
      hotspots: hotspots.length,
      medianYear,
      topBranch: branch.icon + ' ' + branch.name
    });

    renderHotspots(hotspots, branch);
    renderIdeas(ideas);
    renderPapers(works, sortMode);
    state.lastResult = { branch, works, hotspots };
    clearStatus();
  } catch (err) {
    console.error(err);
    setStatus('檢索失敗：' + err.message + '。請稍後再試，或檢查網路。', 'error');
    els.hotspotList.innerHTML = `<div class="empty-hint">檢索異常，請稍後再試。</div>`;
    els.paperList.innerHTML = '';
    els.ideaList.innerHTML = '';
  } finally {
    setLoading(false);
  }
}

// ====== 入口：分析全部分支 ======
async function runAll() {
  const years = els.yearRange.value;
  const sortMode = els.sortMode.value;
  const customExtra = els.customQuery.value.trim();

  setLoading(true);
  els.allBtn.textContent = '分析中…';
  showSkeletons();
  els.branchSummary.innerHTML = '';

  const summary = [];
  let totalWorks = 0;
  let allHotspotCount = 0;
  let bestBranch = null;
  let bestScore = -1;

  try {
    for (const branch of Object.values(BRANCHES)) {
      setStatus(`正在分析：${branch.name} (${branch.nameEn})…`);
      try {
        const works = await fetchWorks(branch, years, sortMode, customExtra);
        const hotspots = extractHotspots(works);
        totalWorks += works.length;
        allHotspotCount += hotspots.length;
        const branchScore = hotspots.reduce((s, h) => s + h.score, 0);
        const item = {
          ...branch,
          works: works.length,
          hotspotCount: hotspots.length,
          score: branchScore,
          topHotspot: hotspots[0]?.name || '—'
        };
        summary.push(item);
        if (branchScore > bestScore) {
          bestScore = branchScore;
          bestBranch = branch;
        }
        // 漸進渲染
        renderBranchSummary([...summary]);
      } catch (e) {
        console.warn(`${branch.name} 檢索失敗`, e);
        summary.push({ ...branch, works: 0, hotspotCount: 0, score: 0, topHotspot: '檢索失敗' });
        renderBranchSummary([...summary]);
      }
      // 速率友好
      await new Promise(r => setTimeout(r, 350));
    }

    // 拿表現最強分支去填充上方主結果區
    if (bestBranch) {
      const top = summary.find(s => s.id === bestBranch.id);
      els.resultTitle.textContent = `跨學科熱度排行。`;
      els.resultLead.textContent = `已遍歷 6 個分支，當前最活躍的是「${top.name}」，下面同步展示其代表熱點與選題建議。`;
      updateMetrics({
        works: totalWorks,
        hotspots: allHotspotCount,
        medianYear: new Date().getFullYear(),
        topBranch: bestBranch.icon + ' ' + bestBranch.name
      });
      // 重新拉一次 best branch 來填熱點與文獻
      const works = await fetchWorks(bestBranch, years, sortMode, customExtra);
      const hotspots = extractHotspots(works);
      const ideas = generateIdeas(bestBranch, hotspots);
      renderHotspots(hotspots, bestBranch);
      renderIdeas(ideas);
      renderPapers(works, sortMode);
    }

    clearStatus();
  } catch (err) {
    console.error(err);
    setStatus('全分支分析失敗：' + err.message, 'error');
  } finally {
    setLoading(false);
    els.allBtn.textContent = '分析全部分支';
  }
}

// ====== 工具：HTML escape ======
function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

// 啟動
document.addEventListener('DOMContentLoaded', init);
