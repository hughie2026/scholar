/* =========================================================
 * Researcher Growth Roadmap
 * 從 0 基礎到獨立研究學者的 5 階段成長指導
 * ========================================================= */

const STAGES = [
  /* ---------- STAGE 1 ---------- */
  {
    code: 'STAGE 01',
    name: '探索定向期',
    nameEn: 'Orientation & Exploration',
    period: 'M0 – M6  ·  入學第 0–6 個月',
    position:
      '從學生到研究者的身份切換。研究的核心不是"學會多少"，而是"能提出什麼問題"。這個階段最重要的事，是適應「沒有標準答案、沒有人告訴你下一步」的工作模式，並把研究的基礎設施搭建起來。',
    goals: [
      '熟悉領域版圖，能說出 3-5 個關鍵研究問題',
      '與導師建立穩定的溝通節奏',
      '配齊基礎研究工具鏈與個人工作流'
    ],
    deliverables: [
      '一份方向調研報告 v1.0',
      '一套個人文獻管理 + 筆記系統',
      '至少 30 篇文獻的閱讀記錄'
    ],
    pitfalls: [
      '盲目追熱點，忽略基礎',
      '害怕和導師溝通，閉門造車',
      '過早把方向寫死，沒給自己留迭代空間'
    ],
    abilityTargets: [3, 2, 1, 1, 1], // 文獻 / 方法 / 寫作 / 表達 / 獨立
    tasks: [
      '與導師約定每週或每兩週一次的固定 meeting',
      '完成領域近 5 年 3-5 篇高引綜述精讀',
      '配置 Zotero / EndNote 並建立分類體系',
      '掌握 LaTeX / Markdown / Git 基礎使用',
      '搭建個人科研筆記系統（Obsidian / Notion / Logseq）',
      '列出領域頂會 / 頂刊清單並訂閱 RSS 或郵件提醒',
      '參加 1 次組會，觀察組內討論與研究風格',
      '完成領域方向調研報告 v1.0（5-10 頁）'
    ],
    actions: [
      '把"讀論文"做成每天的固定動作，不是任務——像吃飯一樣。',
      '導師問什麼都先說"讓我想想"，回去查清楚再認真回，不要當場拍腦袋。',
      '把領域當作一張地圖：先看全景輪廓，再決定鑽到哪個區域。',
      '主動暴露自己的無知。承認"不會"是這個階段最高級的能力。'
    ],
    resources: [
      '<strong>S. Keshav</strong> — How to Read a Paper（必讀，3 頁紙改變閱讀效率）',
      '<strong>Nature / Science / Cell</strong> 子刊綜述、領域頂會 keynote 演講',
      '<strong>導師組過往畢業生的學位論文</strong>（最快摸清組內研究脈絡的方法）',
      'arXiv / Google Scholar Alerts、Connected Papers、Research Rabbit'
    ]
  },

  /* ---------- STAGE 2 ---------- */
  {
    code: 'STAGE 02',
    name: '基礎奠定期',
    nameEn: 'Foundation Building',
    period: 'M6 – M18  ·  第 6–18 個月',
    position:
      '研究模式正式啟動。這個階段的關鍵動作是「把學生模式徹底切換成研究者模式」——精讀經典、復現工作、建立自己的方法論基礎。沒有這一階段紮實的基礎，後面的"突破"都會是空中樓閣。',
    goals: [
      '深度掌握領域核心方法與工具',
      '能複述、批判、復現經典工作',
      '形成自己的研究筆記體系與知識結構'
    ],
    deliverables: [
      '20-30 篇核心論文精讀筆記',
      '至少 1 個經典工作的代碼/實驗復現',
      '第一次正式組會匯報 slides',
      '一篇課程論文 / mini 綜述'
    ],
    pitfalls: [
      '只看不寫，知識變不成自己的',
      '只追 SOTA，不讀經典源頭',
      '陷入"工具崇拜"，忘了工具是為問題服務'
    ],
    abilityTargets: [4, 3, 2, 2, 2],
    tasks: [
      '精讀領域 20-30 篇核心 / 經典論文（不只是新論文）',
      '完整復現至少 1 篇經典工作的代碼或實驗',
      '系統學習領域核心方法（統計 / 編程 / 實驗設計 / 理論）',
      '建立個人研究筆記 Wiki（按主題、按方法、按論文三種索引）',
      '完成 1 次組會匯報，主動接受批評',
      '參加 1 個系統性課程或暑期學校',
      '寫一篇課程論文或迷你綜述',
      '開始追蹤 3-5 位領域 active researcher 的工作'
    ],
    actions: [
      '"讀過"和"懂了"是兩回事——能用自己的話講清楚，才算懂。',
      '復現別人的工作比讀懂他更難，也更值得。',
      '建立"批判性閱讀"的習慣：每篇論文找 1 個值得質疑的點。',
      '把基礎打深一點，未來才能站得高。寧願少讀，不要讀得淺。'
    ],
    resources: [
      '領域內公認的經典教材（向導師、師兄師姐要書單）',
      'MIT OCW / Stanford 公開課 / Coursera 系統課程',
      '<strong>Strunk & White</strong> — The Elements of Style（學術英語入門）',
      '<strong>Paul Halmos</strong> — How to Write Mathematics（即使非數學系也值得讀）'
    ]
  },

  /* ---------- STAGE 3 ---------- */
  {
    code: 'STAGE 03',
    name: '深度積累期',
    nameEn: 'Active Production',
    period: 'M18 – M30  ·  第 18–30 個月',
    position:
      '從"執行者"走向"問題提出者"。這個階段的核心是完成第一個完整的研究循環：問題 → 方法 → 實驗 → 寫作 → 投稿 → 反饋。投出的第一篇論文可能會被拒，但這個過程本身就是訓練的核心。',
    goals: [
      '完成第一個從頭到尾的完整研究',
      '掌握學術寫作的基本範式',
      '經歷一次完整的投稿與 review 循環'
    ],
    deliverables: [
      '至少 1 篇一作或二作論文（投稿即算）',
      '1 次學術會議的參與或海報展示',
      '個人研究主頁 / Google Scholar 頁面'
    ],
    pitfalls: [
      '把"工程實現"當作"研究貢獻"',
      '害怕被拒，遲遲不敢投稿',
      '迴避失敗，不和導師同步真實困境'
    ],
    abilityTargets: [4, 4, 3, 3, 3],
    tasks: [
      '在導師指導下完成 1 個完整研究',
      '系統學習論文寫作（IMRaD 結構、英文學術寫作）',
      '完成第一次論文投稿（會議或期刊均可）',
      '參加 1 次學術會議（線上或線下）',
      '學習擔任審稿人（subreviewer）的工作流程',
      '建立個人主頁 / 更新 Google Scholar / GitHub',
      '在學術社交平台（X、LinkedIn、ResearchGate）有意識地建立存在感',
      '寫一份"我的研究興趣陳述"（1 頁，每半年迭代一次）'
    ],
    actions: [
      '寫作是最好的思考方式——卡住的時候，動手寫，不要繼續想。',
      '投稿被拒不是失敗，是研究進入"被同行檢驗"的階段。',
      '會議的價值 80% 在 coffee break，不在 talk。逼自己去和陌生人說話。',
      '把"做出工作"和"講好故事"看作同等重要的兩件事。'
    ],
    resources: [
      '<strong>Joshua Schimel</strong> — Writing Science（學術寫作首選書）',
      '<strong>Steven Pinker</strong> — The Sense of Style',
      '<strong>Simon Peyton Jones</strong> — How to Write a Great Research Paper（演講視頻）',
      '領域頂會的 author guidelines / reviewer guidelines'
    ]
  },

  /* ---------- STAGE 4 ---------- */
  {
    code: 'STAGE 04',
    name: '獨立突破期',
    nameEn: 'Independent Breakthrough',
    period: 'M30 – M42  ·  第 30–42 個月',
    position:
      '從"導師驅動"轉向"自我驅動"的關鍵期。這個階段你需要證明：給你一個方向，你能自己走完；甚至——你能自己選方向。研究品味（research taste）開始形成，這比技術更稀缺、更值錢。',
    goals: [
      '主導 1-2 篇高質量一作論文',
      '能獨立提出研究問題，不再完全依賴導師指派',
      '形成個人的研究品味與議題偏好'
    ],
    deliverables: [
      '1-2 篇一作論文（已發表或在投）',
      '一份自己提出的、未被導師指派的研究計劃',
      '至少指導過 1 名實習生 / 本科生'
    ],
    pitfalls: [
      '陷入內耗與拖延，研究停滯',
      '與導師關係僵化，失去溝通',
      '為發文而發文，丟掉研究志趣'
    ],
    abilityTargets: [5, 4, 4, 4, 4],
    tasks: [
      '主導完成 1-2 篇一作論文（從 idea 到投稿）',
      '提出至少 1 個原創研究問題（非導師指派）',
      '指導 1 名師弟師妹 / 實習生 / 本科生',
      '系統學習項目管理與時間管理（Notion / Toggl / OKR）',
      '主動拓展跨領域閱讀（每月 1 本書）',
      '在會議或 seminar 做一次正式 talk',
      '審稿至少 3 篇論文（向導師申請 review 機會）',
      '建立外部學術人脈（其他組的同齡人 + 行業前輩各 5 人）'
    ],
    actions: [
      '研究品味來自「讀很多 + 對自己誠實」。問自己：哪些工作真正打動了我？為什麼？',
      '當你能批評自己的論文時，才算真正進入了獨立期。',
      '帶實習生，是逼自己把"我會做"變成"我能教會別人做"。',
      '別把博士後期的焦慮當作能力不足——這是責任邊界擴大的正常反應。'
    ],
    resources: [
      '<strong>Richard Hamming</strong> — You and Your Research（演講原文，必讀）',
      '<strong>Cal Newport</strong> — Deep Work / So Good They Can\'t Ignore You',
      '跨領域經典（讓你跳出自己的小圈子）',
      '領域內獨立學者的個人博客（往往比論文更誠實）'
    ]
  },

  /* ---------- STAGE 5 ---------- */
  {
    code: 'STAGE 05',
    name: '學者成型期',
    nameEn: 'Becoming an Independent Scholar',
    period: 'M42+  ·  畢業前後',
    position:
      '從"博士生"轉變為"junior researcher"。這個階段的關鍵不再是某一篇論文，而是：你想以一個怎樣的研究者被記住？你未來 5-10 年想推進的是什麼問題？這時候，你需要的是研究議程（research agenda），不是 to-do list。',
    goals: [
      '完成博士論文與答辯',
      '形成 3-5 年的個人研究議程',
      '為下一階段（faculty / 工業研究 / 獨立研究）做好過渡'
    ],
    deliverables: [
      '博士學位論文',
      '個人 research statement（2-3 頁）',
      '完整的學術 CV / 個人主頁 / 代表作清單'
    ],
    pitfalls: [
      '只看畢業，不看畢業之後',
      '忽視學術社交與推薦信網絡',
      '臨近答辯才開始想未來'
    ],
    abilityTargets: [5, 5, 5, 5, 5],
    tasks: [
      '完成博士學位論文寫作',
      '撰寫 research statement，明確 3-5 年研究方向',
      '建立完整的學術主頁與作品集',
      '主動經營至少 3 位推薦人關係（導師 + 領域前輩 2 人）',
      '參與基金申請或合作研究項目',
      '準備 job talk / academic CV / teaching statement（如有需要）',
      '至少 1 次以「主辦方」身份參與學術活動（workshop、reading group）',
      '思考並書寫："我希望以什麼樣的研究者被記住？"'
    ],
    actions: [
      '研究議程不是一個 idea，是一組相互連接的問題——它讓你的工作"聚成一個形狀"。',
      '推薦信的質量遠比數量重要。讓 3 個人能講清楚"你是誰、做了什麼、好在哪"。',
      '答辯不是終點，是換一個身份重新出發。',
      '不要把"找到工作"當作博士的終極目標。終極目標是「成為那個你會佩服的研究者」。'
    ],
    resources: [
      '<strong>Peter Feibelman</strong> — A PhD Is Not Enough!（給未來學者的職業指南）',
      '<strong>Karen Kelsky</strong> — The Professor Is In（如果走學術路徑）',
      '本領域 5 位你欣賞的學者的 research statement / CV',
      '與已畢業的師兄師姐做幾次 1-on-1 對話'
    ]
  }
];

/* ============ Ability dimensions ============ */
const ABILITIES = ['文獻', '方法', '寫作', '表達', '獨立'];
const ABILITY_MAX = 5;

/* ============ Storage ============ */
const STORAGE_KEY = 'researcher-growth-progress-v1';

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}
function saveProgress(p) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch (e) {
    /* ignore */
  }
}

/* ============ State ============ */
let currentStage = 0; // index 0..4
let progress = loadProgress();
// progress shape: { "0": [true,false,...], "1": [...], ... , "_stage": 0 }
if (typeof progress._stage === 'number') {
  currentStage = Math.max(0, Math.min(STAGES.length - 1, progress._stage));
}

/* ============ Renderers ============ */
function renderTimeline() {
  const wrap = document.getElementById('timelineSteps');
  wrap.innerHTML = '';
  STAGES.forEach((s, i) => {
    const el = document.createElement('span');
    el.className = 'step';
    if (i === currentStage) el.classList.add('active');
    if (i < currentStage) el.classList.add('done');
    el.dataset.idx = i;
    el.innerHTML = `
      <b>${String(i + 1).padStart(2, '0')}</b>
      ${s.name}
      <span class="t-period">${s.period.split('·')[0].trim()}</span>
    `;
    el.addEventListener('click', () => {
      currentStage = i;
      progress._stage = i;
      saveProgress(progress);
      renderAll();
      window.scrollTo({ top: document.querySelector('.roadmap-section').offsetTop - 60, behavior: 'smooth' });
    });
    wrap.appendChild(el);
  });
  // timeline fill
  const pct = ((currentStage + 1) / STAGES.length) * 100;
  document.getElementById('timelineFill').style.width = pct + '%';
}

function renderStageInfo() {
  const s = STAGES[currentStage];
  document.getElementById('stageTag').textContent = s.code;
  document.getElementById('stageName').textContent = s.name;
  document.getElementById('stageNameEn').textContent = s.nameEn;
  document.getElementById('stagePeriod').textContent = s.period;
  document.getElementById('stagePosition').textContent = s.position;

  const fill = (id, arr, isHTML = false) => {
    const el = document.getElementById(id);
    el.innerHTML = '';
    arr.forEach(item => {
      const li = document.createElement('li');
      if (isHTML) li.innerHTML = item;
      else li.textContent = item;
      el.appendChild(li);
    });
  };
  fill('stageGoals', s.goals);
  fill('stageDeliverables', s.deliverables);
  fill('stagePitfalls', s.pitfalls);

  const fillGold = (id, arr) => {
    const el = document.getElementById(id);
    el.innerHTML = '';
    arr.forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = item;
      el.appendChild(li);
    });
  };
  fillGold('stageActions', s.actions);
  fillGold('stageResources', s.resources);
}

function renderTasks() {
  const s = STAGES[currentStage];
  const list = document.getElementById('taskList');
  list.innerHTML = '';
  const checks = progress[currentStage] || new Array(s.tasks.length).fill(false);

  s.tasks.forEach((t, i) => {
    const li = document.createElement('li');
    if (checks[i]) li.classList.add('checked');
    li.innerHTML = `
      <span class="task-checkbox" aria-hidden="true"></span>
      <span class="task-text">${t}</span>
    `;
    li.addEventListener('click', () => {
      checks[i] = !checks[i];
      progress[currentStage] = checks;
      saveProgress(progress);
      renderTasks();
      renderRadar();
      renderOverall();
    });
    list.appendChild(li);
  });

  const done = checks.filter(Boolean).length;
  document.getElementById('taskCount').textContent =
    `${done} / ${s.tasks.length} 已完成`;
}

/* ============ Radar Chart (SVG) ============ */
function renderRadar() {
  const svg = document.getElementById('radarSvg');
  const cx = 150, cy = 150, R = 100;
  const N = ABILITIES.length;

  // points helper
  const pt = (idx, r) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * idx) / N;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  // grid polygons (5 levels)
  let svgHTML = '';
  for (let lvl = 1; lvl <= ABILITY_MAX; lvl++) {
    const r = (R * lvl) / ABILITY_MAX;
    const pts = [];
    for (let i = 0; i < N; i++) pts.push(pt(i, r).join(','));
    svgHTML += `<polygon points="${pts.join(' ')}" fill="none" stroke="#ece5d3" stroke-width="1"/>`;
  }
  // axes
  for (let i = 0; i < N; i++) {
    const [x, y] = pt(i, R);
    svgHTML += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#ece5d3" stroke-width="1"/>`;
  }

  // current ability (estimated by task completion of this stage scaled to target)
  const s = STAGES[currentStage];
  const checks = progress[currentStage] || [];
  const completion = checks.length ? checks.filter(Boolean).length / s.tasks.length : 0;

  // current values: mix of accumulated progress from previous stages + this stage's completion
  // simpler: each ability's current = target of stage * completion + previousStageTarget * 1
  const prevTarget = currentStage > 0 ? STAGES[currentStage - 1].abilityTargets : [0,0,0,0,0];
  const curTarget = s.abilityTargets;
  const current = curTarget.map((t, i) => {
    const prev = prevTarget[i];
    return Math.max(prev, prev + (t - prev) * completion);
  });

  // target polygon (dashed dark)
  const tarPts = curTarget.map((v, i) => pt(i, (R * v) / ABILITY_MAX).join(',')).join(' ');
  svgHTML += `<polygon points="${tarPts}" fill="rgba(26,26,26,0.04)" stroke="#1a1a1a" stroke-width="1.2" stroke-dasharray="4 4"/>`;

  // current polygon (gold filled)
  const curPts = current.map((v, i) => pt(i, (R * v) / ABILITY_MAX).join(',')).join(' ');
  svgHTML += `<polygon points="${curPts}" fill="rgba(201,169,97,0.25)" stroke="#c9a961" stroke-width="2"/>`;

  // labels
  ABILITIES.forEach((label, i) => {
    const [x, y] = pt(i, R + 22);
    svgHTML += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle"
                  font-family="Encode Sans, sans-serif" font-size="12" fill="#1a1a1a"
                  font-weight="600" letter-spacing="1">${label}</text>`;
  });

  svg.innerHTML = svgHTML;
}

/* ============ Overall progress ============ */
function renderOverall() {
  let total = 0, done = 0;
  STAGES.forEach((s, i) => {
    total += s.tasks.length;
    const ck = progress[i] || [];
    done += ck.filter(Boolean).length;
  });
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('overallPct').textContent = pct;
  document.getElementById('overallFill').style.width = pct + '%';
}

/* ============ Navigation ============ */
function bindNav() {
  document.getElementById('prevStageBtn').addEventListener('click', () => {
    if (currentStage > 0) {
      currentStage--;
      progress._stage = currentStage;
      saveProgress(progress);
      renderAll();
      window.scrollTo({ top: document.querySelector('.roadmap-section').offsetTop - 60, behavior: 'smooth' });
    }
  });
  document.getElementById('nextStageBtn').addEventListener('click', () => {
    if (currentStage < STAGES.length - 1) {
      currentStage++;
      progress._stage = currentStage;
      saveProgress(progress);
      renderAll();
      window.scrollTo({ top: document.querySelector('.roadmap-section').offsetTop - 60, behavior: 'smooth' });
    }
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('確定要清空所有進度嗎？此操作不可恢復。')) {
      localStorage.removeItem(STORAGE_KEY);
      progress = {};
      currentStage = 0;
      renderAll();
    }
  });
}

/* ============ Render All ============ */
function renderAll() {
  renderTimeline();
  renderStageInfo();
  renderTasks();
  renderRadar();
  renderOverall();

  // button states
  document.getElementById('prevStageBtn').disabled = currentStage === 0;
  const nextBtn = document.getElementById('nextStageBtn');
  if (currentStage === STAGES.length - 1) {
    nextBtn.disabled = true;
    nextBtn.textContent = '已到最終階段';
  } else {
    nextBtn.disabled = false;
    nextBtn.textContent = '下一階段 →';
  }
}

/* ============ Init ============ */
document.addEventListener('DOMContentLoaded', () => {
  bindNav();
  renderAll();
});
