/* =====================================================================
 * Research Reporting Checklist Checker
 * Supports: STROBE / CONSORT 2010 / PRISMA 2020
 * ===================================================================*/

(function () {
  'use strict';

  /* ---------- Checklist Data ---------- */
  const CHECKLISTS = {
    STROBE: {
      label: '觀察性研究 STROBE',
      fullName: 'STROBE Statement (Strengthening the Reporting of Observational Studies in Epidemiology)',
      groups: [
        {
          id: 'title', name: 'Title and Abstract', items: [
            { id: '1a', title: '研究設計（標題或摘要）', desc: '在標題或摘要中以常用術語標明研究設計（如 cohort study、case-control study、cross-sectional study）。' },
            { id: '1b', title: '結構化摘要', desc: '在摘要中提供資訊量充足且平衡的研究內容摘要。' }
          ]
        },
        {
          id: 'intro', name: 'Introduction', items: [
            { id: '2', title: '背景與理論依據', desc: '解釋研究的科學背景與研究依據。' },
            { id: '3', title: '研究目標', desc: '闡述具體研究目標，包括所有預先設定的研究假設。' }
          ]
        },
        {
          id: 'methods', name: 'Methods', items: [
            { id: '4', title: '研究設計', desc: '在文章前面部分介紹研究設計的關鍵內容。' },
            { id: '5', title: '研究機構', desc: '描述研究機構、地點、暴露、隨訪和數據收集的相關時間範圍。' },
            { id: '6', title: '研究對象', desc: '描述納入排除標準、來源與選擇方法；隨訪研究需描述隨訪細節。' },
            { id: '7', title: '變量定義', desc: '明確定義所有結局、暴露、預測因子、潛在混雜因子及效應修飾因子，必要時給出診斷標準。' },
            { id: '8', title: '資料來源／測量', desc: '對於每個感興趣的變量，給出資料來源細節、評估與測量方法。' },
            { id: '9', title: '偏倚控制', desc: '描述針對潛在偏倚來源的處理方法。' },
            { id: '10', title: '研究樣本量', desc: '解釋如何確定本研究的樣本量。' },
            { id: '11', title: '定量變量處理', desc: '解釋分析中如何處理定量變量；如進行了分組，描述分組依據和理由。' },
            { id: '12', title: '統計學方法', desc: '描述使用的所有統計學方法，包括控制混雜的方法、亞組分析與交互作用分析、缺失值處理、敏感性分析等。' }
          ]
        },
        {
          id: 'results', name: 'Results', items: [
            { id: '13', title: '研究對象', desc: '報告各階段研究對象的數量（如可能納入、確認合格、納入研究、完成隨訪、納入分析的人數），並使用流程圖。' },
            { id: '14', title: '描述性數據', desc: '描述研究對象的特徵（人口學、臨床、社會等）以及各暴露的暴露程度與潛在混雜因子的資訊。' },
            { id: '15', title: '結局數據', desc: '報告結局事件數或匯總指標。' },
            { id: '16', title: '主要結果', desc: '給出未調整及調整混雜後的估計值及其精度（如 95% CI），明確說明調整了哪些混雜因素及選擇理由。' },
            { id: '17', title: '其他分析', desc: '報告其他分析（如亞組分析、交互作用分析及敏感性分析）。' }
          ]
        },
        {
          id: 'discussion', name: 'Discussion', items: [
            { id: '18', title: '主要結果概述', desc: '概括與研究目標相關的主要結果。' },
            { id: '19', title: '局限性', desc: '討論研究的局限性，包括潛在偏倚或不精確的來源；討論偏倚的方向和大小。' },
            { id: '20', title: '結果解釋', desc: '結合研究目標、局限性、多重分析、相似研究的結果及其他相關證據，謹慎且全面地解釋結果。' },
            { id: '21', title: '可推廣性', desc: '討論研究結果的外推性（generalisability）。' }
          ]
        },
        {
          id: 'other', name: 'Other Information', items: [
            { id: '22', title: '研究經費', desc: '提供研究的資金來源以及資助者在研究中的作用；如可能，亦提及本研究所基於的原始研究的資助。' }
          ]
        }
      ]
    },

    CONSORT: {
      label: '隨機對照試驗 CONSORT 2010',
      fullName: 'CONSORT 2010 Statement: updated guidelines for reporting parallel group randomised trials',
      groups: [
        {
          id: 'title', name: 'Title and Abstract', items: [
            { id: '1a', title: '標題標明隨機', desc: '標題中標明該研究為隨機試驗（randomised trial）。' },
            { id: '1b', title: '結構化摘要', desc: '採用結構式摘要描述試驗設計、方法、結果與結論（參見 CONSORT for abstracts）。' }
          ]
        },
        {
          id: 'intro', name: 'Introduction', items: [
            { id: '2a', title: '背景依據', desc: '科學背景與依據說明。' },
            { id: '2b', title: '研究目標', desc: '具體目標或假設。' }
          ]
        },
        {
          id: 'methods', name: 'Methods', items: [
            { id: '3a', title: '試驗設計', desc: '描述試驗設計類型（如平行、析因設計），各組分配比例。' },
            { id: '3b', title: '方法的重要修改', desc: '試驗開始後對方法的重要修改（如合格標準）及原因。' },
            { id: '4a', title: '受試者合格標準', desc: '受試者納入及排除標準。' },
            { id: '4b', title: '研究地點', desc: '數據收集場所及地點。' },
            { id: '5', title: '干預措施', desc: '詳細描述各組干預措施，包括如何及何時實施，使其可被重複。' },
            { id: '6a', title: '主要與次要結局', desc: '完整、預先指定的主要與次要結局指標，包括測量時間點與方法。' },
            { id: '6b', title: '結局變更', desc: '試驗開始後對結局的任何變更及原因。' },
            { id: '7a', title: '樣本量計算', desc: '樣本量是如何確定的。' },
            { id: '7b', title: '中期分析', desc: '必要時解釋中期分析及試驗終止標準。' },
            { id: '8a', title: '隨機序列產生', desc: '產生隨機分配序列的方法。' },
            { id: '8b', title: '隨機化類型', desc: '隨機化類型，限制細節（如區組隨機化及區組大小）。' },
            { id: '9', title: '分配隱藏機制', desc: '用於執行隨機分配序列的機制（如按序編號的容器），描述任何在分配前使序列保密的步驟。' },
            { id: '10', title: '隨機化實施', desc: '由誰生成分配序列、招募受試者及將受試者分配至各干預組。' },
            { id: '11a', title: '盲法', desc: '若實施了盲法，分配後對誰設盲（如受試者、護理人員、結局評估者）以及如何設盲。' },
            { id: '11b', title: '干預措施相似性', desc: '若有相關，描述干預措施的相似性。' },
            { id: '12a', title: '統計方法（主次結局）', desc: '比較主次結局所用的統計方法。' },
            { id: '12b', title: '統計方法（額外分析）', desc: '額外分析方法，如亞組分析及調整分析。' }
          ]
        },
        {
          id: 'results', name: 'Results', items: [
            { id: '13a', title: '受試者流向', desc: '各組隨機分配、接受預定治療、納入主要結局分析的受試者人數（強烈建議使用流程圖）。' },
            { id: '13b', title: '失訪與排除', desc: '各組隨機後失訪及排除人數及原因。' },
            { id: '14a', title: '招募日期', desc: '招募和隨訪的起止日期。' },
            { id: '14b', title: '試驗終止原因', desc: '試驗終止或暫停的原因。' },
            { id: '15', title: '基線特徵', desc: '一個表格列出各組基線人口學及臨床特徵。' },
            { id: '16', title: '分析人數', desc: '每組分析人數，是否按原始分組分析。' },
            { id: '17a', title: '結局與估計', desc: '各組主次結局的結果以及效應量估計值（含精度，如 95% CI）。' },
            { id: '17b', title: '絕對與相對效應', desc: '對於二分類結局，建議同時報告絕對與相對效應量。' },
            { id: '18', title: '輔助分析', desc: '進行的其他分析，包括亞組分析及調整分析，區分預先指定及探索性分析。' },
            { id: '19', title: '不良反應', desc: '各組所有重要傷害或非預期效應。' }
          ]
        },
        {
          id: 'discussion', name: 'Discussion', items: [
            { id: '20', title: '局限性', desc: '試驗局限性，討論潛在偏倚來源、不精確、（若有）多重分析。' },
            { id: '21', title: '可推廣性', desc: '試驗結果的普遍適用性（外部效度）。' },
            { id: '22', title: '結果解釋', desc: '結合結果、利弊權衡及其他相關證據的解釋。' }
          ]
        },
        {
          id: 'other', name: 'Other Information', items: [
            { id: '23', title: '註冊資訊', desc: '註冊號和試驗註冊機構名稱。' },
            { id: '24', title: '試驗方案', desc: '完整試驗方案的可獲得性（如可獲得）。' },
            { id: '25', title: '資金來源', desc: '資金來源與其他支持（如藥品供給）以及資助者作用。' }
          ]
        }
      ]
    },

    PRISMA: {
      label: '系統綜述與 Meta 分析 PRISMA 2020',
      fullName: 'PRISMA 2020 Statement: updated guideline for reporting systematic reviews',
      groups: [
        {
          id: 'title', name: 'Title', items: [
            { id: '1', title: '標題標明系統綜述', desc: '在標題中明確標明本報告為系統綜述。' }
          ]
        },
        {
          id: 'abstract', name: 'Abstract', items: [
            { id: '2', title: '結構化摘要', desc: '見 PRISMA 2020 for Abstracts checklist。' }
          ]
        },
        {
          id: 'intro', name: 'Introduction', items: [
            { id: '3', title: '理論依據', desc: '在現有知識的基礎上描述綜述的理論依據。' },
            { id: '4', title: '研究目的', desc: '對綜述目的或所要解答的問題給出明確陳述（PICO 等）。' }
          ]
        },
        {
          id: 'methods', name: 'Methods', items: [
            { id: '5', title: '納入排除標準', desc: '詳細列出綜述納入和排除的標準，及其在合成過程中的分組方式。' },
            { id: '6', title: '資訊來源', desc: '詳細列出檢索的所有資料庫、註冊庫、網站、組織、文獻列表及聯繫專家等資訊來源；給出最後一次檢索日期。' },
            { id: '7', title: '檢索策略', desc: '至少完整呈現一個資料庫的檢索策略，包括所用過濾器與限制條件。' },
            { id: '8', title: '研究篩選', desc: '對研究篩選方法的詳細說明，包括幾位審查者、是否獨立篩選、若使用自動工具請說明。' },
            { id: '9', title: '數據提取', desc: '描述數據提取的方法（人數、是否獨立、與作者聯繫獲取資料的過程、是否使用自動工具）。' },
            { id: '10a', title: '結局指標', desc: '列出並定義從每一研究中尋找的所有結局指標，包括結局領域和時間點等。' },
            { id: '10b', title: '其他變量', desc: '列出並定義所有其他從每一研究中尋找的變量（如資金來源、研究設計、地點等）。' },
            { id: '11', title: '研究偏倚評估', desc: '描述評估納入研究中偏倚風險所用方法（工具名稱、人數、獨立性、自動工具等）。' },
            { id: '12', title: '效應量指標', desc: '詳述每一個結局所使用的效應量指標（如 RR、MD）。' },
            { id: '13a', title: '合成資格判定', desc: '描述決定哪些研究適合每個合成的過程（比較研究干預特徵與計劃合成組）。' },
            { id: '13b', title: '數據處理方法', desc: '描述用於展示或統計合成所準備的數據處理方法（如缺失統計值處理、轉換等）。' },
            { id: '13c', title: '數據可視化', desc: '描述用於可視化展示研究結果或結果合併的方法。' },
            { id: '13d', title: '統計合成方法', desc: '描述用於統計合成的方法及其理由（含統計模型、軟體、處理異質性的方法）。' },
            { id: '13e', title: '異質性探索', desc: '描述用於探索異質性原因的方法（如亞組、Meta 回歸）。' },
            { id: '13f', title: '敏感性分析', desc: '描述用於評估合成結果穩健性的任何敏感性分析。' },
            { id: '14', title: '報告偏倚評估', desc: '描述評估報告偏倚（如缺失或選擇性報告）的方法。' },
            { id: '15', title: '證據確信度', desc: '描述評估證據確信度的方法（如 GRADE）。' }
          ]
        },
        {
          id: 'results', name: 'Results', items: [
            { id: '16a', title: '研究篩選結果', desc: '描述研究篩選結果，從檢索得到的記錄數到納入綜述的研究數，理想情況以流程圖展示。' },
            { id: '16b', title: '排除研究說明', desc: '引用看似符合納入標準但被排除的研究，並說明排除原因。' },
            { id: '17', title: '納入研究特徵', desc: '詳細列出每一個納入研究的特徵與引用文獻。' },
            { id: '18', title: '研究偏倚風險', desc: '呈現對各納入研究的偏倚風險評估結果。' },
            { id: '19', title: '單個研究結果', desc: '對所有結局，呈現每一研究的(a)效應量及精確度（如 95% CI），理想以結構化表格或圖示。' },
            { id: '20a', title: '合成簡要總結', desc: '簡要總結每個合成所納入研究的特徵及偏倚風險。' },
            { id: '20b', title: '統計合成結果', desc: '呈現所有統計合併的結果，含合併效應量、精確度及異質性度量。' },
            { id: '20c', title: '異質性研究結果', desc: '呈現對因果關係或差異的研究結果（如亞組分析）。' },
            { id: '20d', title: '敏感性結果', desc: '呈現對結果穩健性的所有研究結果。' },
            { id: '21', title: '報告偏倚評估', desc: '呈現對各合成結果中報告偏倚風險的評估結果。' },
            { id: '22', title: '證據確信度結果', desc: '呈現對每個結局之證據確信度的評估結果。' }
          ]
        },
        {
          id: 'discussion', name: 'Discussion', items: [
            { id: '23a', title: '結果整體解讀', desc: '在其他證據背景下對結果進行整體解讀。' },
            { id: '23b', title: '證據局限', desc: '討論納入研究中所提供證據的任何局限性。' },
            { id: '23c', title: '綜述過程局限', desc: '討論在綜述過程中的任何局限性。' },
            { id: '23d', title: '對實踐與研究的意義', desc: '討論結果對實踐、政策和未來研究的意義。' }
          ]
        },
        {
          id: 'other', name: 'Other Information', items: [
            { id: '24a', title: '註冊資訊', desc: '提供註冊資訊（註冊號、註冊網站）；若未註冊，請說明。' },
            { id: '24b', title: '方案可獲取', desc: '指出方案是否準備、是否可獲取，及如何獲取。' },
            { id: '24c', title: '註冊／方案修改', desc: '描述及解釋對註冊或方案中所提供資訊的任何修改。' },
            { id: '25', title: '資金支持', desc: '描述財務或非財務資金支持，及資助者或贊助商在綜述過程中的作用。' },
            { id: '26', title: '利益衝突', desc: '聲明作者的任何利益衝突。' },
            { id: '27', title: '數據／代碼可獲取性', desc: '報告以下內容是否可獲取以及在哪可獲取：模板表格、提取數據、用於分析的數據、分析代碼及其他材料。' }
          ]
        }
      ]
    }
  };

  /* ---------- State ---------- */
  const STORAGE_KEY = 'rpc_checker_state_v1';
  let state = {
    type: null,
    items: {} // { itemId: { checked: bool, notes: string } }
  };

  /* ---------- DOM helpers ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- Persistence ---------- */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) state = JSON.parse(raw);
    } catch (e) { /* ignore */ }
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  /* ---------- Render ---------- */
  function renderType(type) {
    state.type = type;
    if (!state.items) state.items = {};

    const data = CHECKLISTS[type];
    $('#currentTypeLabel').textContent = `PART 02 · ${data.label} 清單`;
    $('#checklistArea').classList.remove('is-hidden');

    // Highlight active card
    $$('.type-card').forEach(c => c.classList.toggle('active', c.dataset.type === type));
    $$('.type-card input').forEach(i => { i.checked = i.value === type; });

    const wrap = $('#groupsWrap');
    wrap.innerHTML = '';

    data.groups.forEach(group => {
      const groupEl = document.createElement('div');
      groupEl.className = 'check-group';
      groupEl.dataset.groupId = group.id;

      groupEl.innerHTML = `
        <button type="button" class="group-head">
          <span class="group-title">${group.name}</span>
          <span class="group-stat" data-group-stat>0 / ${group.items.length}</span>
          <span class="group-toggle">−</span>
        </button>
        <div class="group-body"></div>
      `;

      const body = $('.group-body', groupEl);
      group.items.forEach(item => {
        const stored = state.items[item.id] || { checked: false, notes: '' };
        const itemEl = document.createElement('div');
        itemEl.className = 'check-item' + (stored.checked ? ' done' : '');
        itemEl.dataset.itemId = item.id;
        itemEl.innerHTML = `
          <div class="check-row">
            <label class="check-toggle">
              <input type="checkbox" ${stored.checked ? 'checked' : ''}>
              <span class="check-mark"></span>
            </label>
            <div class="check-body">
              <div class="check-head">
                <span class="check-id">${item.id}</span>
                <span class="check-title">${item.title}</span>
                <span class="miss-flag">⚠ 缺漏</span>
              </div>
              <p class="check-desc">${item.desc}</p>
              <textarea class="check-notes" placeholder="備註（可選）：例如所在段落、頁碼或具體寫法說明">${escapeHtml(stored.notes)}</textarea>
            </div>
          </div>
        `;
        body.appendChild(itemEl);
      });

      // Group head click → toggle collapse
      $('.group-head', groupEl).addEventListener('click', () => {
        groupEl.classList.toggle('collapsed');
        $('.group-toggle', groupEl).textContent = groupEl.classList.contains('collapsed') ? '+' : '−';
      });

      wrap.appendChild(groupEl);
    });

    bindItemEvents();
    updateStats();
  }

  function bindItemEvents() {
    $$('.check-item').forEach(itemEl => {
      const id = itemEl.dataset.itemId;
      const cb = $('input[type="checkbox"]', itemEl);
      const ta = $('.check-notes', itemEl);

      cb.addEventListener('change', () => {
        if (!state.items[id]) state.items[id] = { checked: false, notes: '' };
        state.items[id].checked = cb.checked;
        itemEl.classList.toggle('done', cb.checked);
        saveState();
        updateStats();
      });

      ta.addEventListener('input', () => {
        if (!state.items[id]) state.items[id] = { checked: false, notes: '' };
        state.items[id].notes = ta.value;
        saveState();
      });
    });
  }

  /* ---------- Stats ---------- */
  function calcStats() {
    const data = CHECKLISTS[state.type];
    let total = 0, done = 0;
    const groupStats = {};
    data.groups.forEach(g => {
      groupStats[g.id] = { done: 0, total: g.items.length };
      g.items.forEach(it => {
        total += 1;
        const s = state.items[it.id];
        if (s && s.checked) {
          done += 1;
          groupStats[g.id].done += 1;
        }
      });
    });
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, done, miss: total - done, pct, groupStats };
  }

  function updateStats() {
    if (!state.type) return;
    const s = calcStats();

    $('#ratePct').textContent = s.pct;
    $('#doneCount').textContent = s.done;
    $('#totalCount').textContent = s.total;
    $('#missCount').textContent = s.miss;
    $('#rateFill').style.width = s.pct + '%';

    // Tier badge & hint
    const tier = $('#tierBadge');
    const banner = $('#hintBanner');
    const ht = $('#hintTitle');
    const hb = $('#hintBody');
    tier.classList.remove('warn', 'danger');
    banner.classList.remove('warn', 'danger');

    if (s.pct >= 80) {
      tier.textContent = '基本完整';
      ht.textContent = '✓ 基本完整';
      hb.textContent = '報告整體完整度良好。建議重點檢查少數未完成項目，並請導師或共同作者再做最後審核，比對目標期刊的具體投稿要求。';
    } else if (s.pct >= 50) {
      tier.textContent = '仍需補充';
      tier.classList.add('warn');
      banner.classList.add('warn');
      ht.textContent = '⚠ 仍需補充';
      hb.textContent = '主要框架已具備，但仍有相當比例條目未完成。建議優先補齊「Methods」與「Results」部分的關鍵條目（樣本量、偏倚控制、統計方法、結局報告），再進入語言潤色階段。';
    } else {
      tier.textContent = '建議系統修訂';
      tier.classList.add('danger');
      banner.classList.add('danger');
      ht.textContent = '✗ 建議系統修訂';
      hb.textContent = '當前完成度較低，許多核心條目尚未滿足。建議按照清單從 Title／Abstract 開始系統地補充內容，避免投稿後因報告規範性問題被直接拒稿或大修。';
    }

    // Per-group stat
    const data = CHECKLISTS[state.type];
    data.groups.forEach(g => {
      const gs = s.groupStats[g.id];
      const groupEl = document.querySelector(`.check-group[data-group-id="${g.id}"]`);
      if (groupEl) {
        $('[data-group-stat]', groupEl).textContent = `${gs.done} / ${gs.total}`;
      }
    });
  }

  /* ---------- Markdown export ---------- */
  function buildMarkdown() {
    const data = CHECKLISTS[state.type];
    const s = calcStats();
    const tier = s.pct >= 80 ? '基本完整' : s.pct >= 50 ? '仍需補充' : '建議系統修訂';
    const date = new Date().toISOString().slice(0, 10);

    let md = `# 研究報告清單檢查 · ${data.label}\n\n`;
    md += `> ${data.fullName}\n\n`;
    md += `- **檢查日期**：${date}\n`;
    md += `- **完成情況**：${s.done} / ${s.total}（${s.pct}%）\n`;
    md += `- **缺漏條目**：${s.miss} 條\n`;
    md += `- **整體評級**：${tier}\n\n`;
    md += `---\n\n`;

    data.groups.forEach(g => {
      const gs = s.groupStats[g.id];
      md += `## ${g.name}　_(${gs.done}/${gs.total})_\n\n`;
      g.items.forEach(it => {
        const st = state.items[it.id] || { checked: false, notes: '' };
        const box = st.checked ? '[x]' : '[ ]';
        const flag = st.checked ? '' : ' ⚠️ **缺漏**';
        md += `- ${box} **${it.id}** ${it.title}${flag}\n`;
        md += `  - _${it.desc}_\n`;
        if (st.notes && st.notes.trim()) {
          const note = st.notes.split('\n').map(l => '    > ' + l).join('\n');
          md += `${note}\n`;
        }
      });
      md += `\n`;
    });

    md += `---\n\n`;
    md += `**免責聲明**：本檢查清單僅為投稿前的自查輔助，不能替代期刊投稿指南、報告聲明的官方原文，以及導師、同行與編輯的專業審核。\n`;
    return md;
  }

  function downloadMarkdown() {
    const md = buildMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checklist_${state.type}_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Markdown 已匯出');
  }

  async function copyMarkdown() {
    const md = buildMarkdown();
    try {
      await navigator.clipboard.writeText(md);
      showToast('已複製到剪貼簿');
    } catch (e) {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = md;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); showToast('已複製到剪貼簿'); }
      catch (_) { showToast('複製失敗，請手動匯出'); }
      document.body.removeChild(ta);
    }
  }

  /* ---------- Clear ---------- */
  function clearAll() {
    if (!confirm('確定要清空當前清單的所有勾選與備註嗎？此操作無法復原。')) return;
    state.items = {};
    saveState();
    renderType(state.type);
    showToast('已清空');
  }

  /* ---------- Toast ---------- */
  let toastTimer = null;
  function showToast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
  }

  /* ---------- Utilities ---------- */
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------- Init ---------- */
  function init() {
    loadState();

    // Type cards
    $$('.type-card').forEach(card => {
      card.addEventListener('click', e => {
        e.preventDefault();
        const type = card.dataset.type;
        if (state.type !== type) {
          // Switching: warn if has any progress
          if (state.type && Object.values(state.items).some(v => v.checked || (v.notes && v.notes.trim()))) {
            if (!confirm('切換研究類型將清空當前清單的勾選與備註，是否繼續？')) return;
            state.items = {};
          }
        }
        renderType(type);
        saveState();
      });
    });

    // Action buttons
    $('#btnExport').addEventListener('click', downloadMarkdown);
    $('#btnCopy').addEventListener('click', copyMarkdown);
    $('#btnClear').addEventListener('click', clearAll);
    $('#btnCollapseAll').addEventListener('click', () => {
      $$('.check-group').forEach(g => {
        g.classList.add('collapsed');
        $('.group-toggle', g).textContent = '+';
      });
    });
    $('#btnExpandAll').addEventListener('click', () => {
      $$('.check-group').forEach(g => {
        g.classList.remove('collapsed');
        $('.group-toggle', g).textContent = '−';
      });
    });

    // Restore previous session
    if (state.type && CHECKLISTS[state.type]) {
      renderType(state.type);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
