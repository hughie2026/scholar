/* =========================================================
   Qualitative Research Toolkit · Hughie's Online Lab
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  bindModuleTabs();
  bindDesign();
  bindInterview();
  bindFGD();
  bindSampling();
  bindIP();
  buildChecklist('coreq', COREQ_DATA);
  buildChecklist('srqr', SRQR_DATA);
  buildChecklist('casp', CASP_DATA, ['Yes', "Can't tell", 'No']);
  buildChecklist('jbi', JBI_DATA, ['Yes', 'No', 'Unclear', 'NA']);
  buildChecklist('entreq', ENTREQ_DATA);
  bindChecklistActions();
  bindCERQual();
});

/* ---------- helpers ---------- */
function $(s, c) { return (c || document).querySelector(s); }
function $$(s, c) { return Array.from((c || document).querySelectorAll(s)); }
function showToast(msg) {
  const t = $('#toast'); t.textContent = msg || '已複製到剪貼板';
  t.classList.add('show'); clearTimeout(window._tt);
  window._tt = setTimeout(() => t.classList.remove('show'), 1800);
}
function copy(text) {
  navigator.clipboard.writeText(text).then(() => showToast('已複製到剪貼板'))
    .catch(() => { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); showToast('已複製到剪貼板'); });
}
function getRadio(name) { const e = document.querySelector(`input[name="${name}"]:checked`); return e ? e.value : ''; }

/* ---------- Module switcher ---------- */
function bindModuleTabs() {
  $$('.module-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const m = btn.dataset.module;
      $$('.module-tab').forEach(b => b.classList.toggle('active', b === btn));
      $$('.module-panel').forEach(p => p.classList.toggle('active', p.id === `m-${m}`));
      window.scrollTo({ top: $('.tool-section').offsetTop - 20, behavior: 'smooth' });
    });
  });
}

/* =========================================================
   MODULE 1 · Research Design
   ========================================================= */
const DESIGNS = {
  phenomenology: {
    name: '現象學（含 IPA）', en: 'Phenomenology / Interpretative Phenomenological Analysis',
    summary: '探討個體如何理解某一生活經驗的本質與意義，常見於健康、教育、心理領域。',
    features: [
      '焦點：經驗的本質結構（Husserl）或經驗的詮釋意義（Heidegger / IPA）',
      '採訪深入主觀經驗，常為 1–2 次深入訪談',
      '研究者需「懸置」（bracketing）或反思自身前見',
      '小樣本，常 6–10 位參與者'
    ],
    methods: [
      '深度訪談 / 文本（日記、書信）',
      '描述式現象學分析（Colaizzi、Giorgi）或 IPA（Smith）',
      '逐字稿閱讀 → 提取意義單位 → 形成主題 → 建構本質結構',
      '常用工具：NVivo、ATLAS.ti、手工編碼'
    ],
    pitfalls: ['將參與者敘述當作客觀事實', '主題過於描述、未進入詮釋層次', '忽略研究者反思（reflexivity）']
  },
  grounded: {
    name: '紮根理論', en: 'Grounded Theory (Glaser/Strauss/Charmaz)',
    summary: '由資料中歸納建構解釋過程或機制的中程理論，特別適合尚無理論的領域。',
    features: ['核心：常數比較（constant comparison）', '理論抽樣（theoretical sampling）至理論飽和', '同步進行資料蒐集與分析', '分析步驟：開放編碼 → 主軸/聚焦編碼 → 理論編碼'],
    methods: ['Charmaz 建構主義版本：聚焦編碼、備忘錄、情境圖', 'Strauss & Corbin：條件矩陣、典範模型', '備忘錄（memo）為理論建構核心', '可結合訪談、觀察、文件'],
    pitfalls: ['未進行理論抽樣、樣本一次到位', '只到主題層次未抽象為理論', '忽略備忘錄寫作']
  },
  ethnography: {
    name: '民族誌', en: 'Ethnography',
    summary: '透過長時間融入場域，描述群體的文化模式、實踐與意義系統。',
    features: ['長期參與觀察（fieldwork）', '研究者為主要工具', '厚描述（thick description, Geertz）', '聚焦文化共享意義'],
    methods: ['參與觀察 + 田野筆記', '關鍵報導人訪談', '文件、照片、文物', '可加入焦點民族誌（focused ethnography）以縮短時程'],
    pitfalls: ['參與時間過短未深入文化', '田野筆記不夠細膩', '研究者位置（positionality）未交代']
  },
  case: {
    name: '個案研究', en: 'Case Study (Yin / Stake)',
    summary: '在真實脈絡中深入探究有界系統（個人、組織、事件）的多面向。',
    features: ['有界系統（bounded system）', '多元資料來源三角檢證', '單一個案 vs. 多個案、整體 vs. 嵌入', 'Yin 強調命題與驗證；Stake 強調本質個案'],
    methods: ['訪談 + 檔案 + 觀察', '個案資料庫（case study database）', '命題對照、跨個案分析', '邏輯模式、解釋建構'],
    pitfalls: ['資料來源單一缺乏三角檢證', '個案邊界不清', '結論超出個案能支持的範圍']
  },
  narrative: {
    name: '敘事研究', en: 'Narrative Inquiry',
    summary: '聚焦個人如何透過故事建構自我與經驗，分析「故事是怎麼被說的」。',
    features: ['故事為核心分析單位', '結構/內容/表演分析並行（Riessman）', '時間性、情節、轉折', '常為 1–3 位深度敘事'],
    methods: ['生命史訪談、口述歷史', '主題式、結構式、互動式、表演式分析', '重述（restorying, Clandinin & Connelly）'],
    pitfalls: ['只摘要故事而未分析敘事結構', '忽略敘述脈絡（為誰說、何時說）', '未交代研究者與敘事者關係']
  },
  qd: {
    name: '質性描述', en: 'Qualitative Description',
    summary: '低推論、貼近資料的直接描述，適合臨床與政策研究中迅速回答「what / how」問題。',
    features: ['Sandelowski (2000) 提出', '不深入詮釋、不建構理論', '常用內容分析或主題分析'],
    methods: ['半結構化訪談、焦點團體', '常規內容分析（conventional content analysis）', '重視「資料聲音」（data near）'],
    pitfalls: ['誤用為「弱版」現象學或紮根理論', '主題過淺未呈現變異']
  },
  action: {
    name: '行動研究', en: 'Action Research / Participatory Action Research',
    summary: '研究者與參與者共同診斷問題、設計介入、評估改變的循環。',
    features: ['循環：規劃 → 行動 → 觀察 → 反思', '研究者為共同改變者', '參與者具知識生產夥伴地位'],
    methods: ['工作坊、共創會議', '行動日誌、影像聲音資料', '多輪反饋與調整'],
    pitfalls: ['循環不足或只完成一輪', '權力關係未反思', '結果可信度依賴清楚的決策軌跡']
  },
  discourse: {
    name: '批判論述分析', en: 'Critical Discourse Analysis (Fairclough / Foucault)',
    summary: '分析語言、文本與社會結構間的權力關係，揭示意識形態如何被生產與再製。',
    features: ['語言不只是描述，而是行動', '聚焦權力、意識形態、話語策略', 'Fairclough 三維模型：文本-論述實踐-社會實踐'],
    methods: ['媒體文本、政策文件、訪談轉錄', '詞彙、語法、互文、敘事策略分析', 'Foucault 譜系學分析'],
    pitfalls: ['僅做語言分析未連結社會脈絡', '研究者立場未交代']
  }
};

function bindDesign() {
  $('#dRunBtn').addEventListener('click', runDesign);
  $('#dResetBtn').addEventListener('click', () => { $$('input[name^="d_"]').forEach(i => i.checked = false); $('#dResult').style.display = 'none'; });
  $('#dCopyBtn').addEventListener('click', () => copy($('#dResult').innerText));
}
function runDesign() {
  const purpose = getRadio('d_purpose');
  if (!purpose) { showToast('請至少選擇研究目的'); return; }
  const epistem = getRadio('d_epistem');
  const unit = getRadio('d_unit');
  const time = getRadio('d_time');
  const role = getRadio('d_role');

  // primary by purpose
  const map = { phenomenon: 'phenomenology', theory: 'grounded', culture: 'ethnography', case: 'case', narrative: 'narrative', describe: 'qd', action: 'action', discourse: 'discourse' };
  let primary = map[purpose];
  // adjust by other dimensions
  if (purpose === 'phenomenon' && epistem === 'critical') primary = 'discourse';
  if (purpose === 'culture' && time === 'short') { /* keep ethnography but flag focused */ }
  if (purpose === 'case' && role === 'participant') primary = 'action';

  const d = DESIGNS[primary];

  // alternatives: nearby reasonable options
  const altMap = {
    phenomenology: ['narrative', 'qd'],
    grounded: ['qd', 'case'],
    ethnography: ['case', 'discourse'],
    case: ['ethnography', 'grounded'],
    narrative: ['phenomenology', 'discourse'],
    qd: ['phenomenology', 'grounded'],
    action: ['case', 'ethnography'],
    discourse: ['narrative', 'ethnography']
  };
  const alts = altMap[primary].map(k => DESIGNS[k].name);

  $('#dName').textContent = d.name;
  $('#dEn').textContent = d.en;
  $('#dSummary').textContent = d.summary;
  $('#dAlts').innerHTML = '<span class="tag">替代取向</span>' + alts.map(a => `<span class="tag">${a}</span>`).join('');

  const labelMap = {
    phenomenon: '主觀經驗', theory: '建構理論', culture: '群體文化', case: '個案探究',
    narrative: '個人敘事', describe: '質性描述', action: '行動改變', discourse: '論述分析',
    constructivist: '建構主義', interpretivist: '詮釋主義', postpositivist: '後實證', critical: '批判理論', pragmatist: '實用主義',
    individual: '個體', group: '群體', process: '過程', bounded: '個案', text: '文本', setting: '場域',
    short: '≤6 月', medium: '6-12 月', long: '>12 月',
    outside: '外部', engaged: '互動', participant: '參與'
  };
  $('#dSummary2').innerHTML = [
    ['研究目的', labelMap[purpose] || '-'],
    ['哲學立場', labelMap[epistem] || '未填'],
    ['分析單位', labelMap[unit] || '未填'],
    ['時間規模', labelMap[time] || '未填'],
    ['研究者角色', labelMap[role] || '未填']
  ].map(([k, v]) => `<div class="summary-item"><div class="summary-label">${k}</div><div class="summary-value">${v}</div></div>`).join('');

  $('#dFeatures').innerHTML = d.features.map(x => `<li>${x}</li>`).join('');
  $('#dMethods').innerHTML = d.methods.map(x => `<li>${x}</li>`).join('');
  $('#dPitfalls').innerHTML = d.pitfalls.map(x => `<li>${x}</li>`).join('');

  $('#dResult').style.display = 'block';
  $('#dResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* =========================================================
   MODULE 2 · Interview Guide
   ========================================================= */
function bindInterview() {
  $('#ivRunBtn').addEventListener('click', runInterview);
  $('#ivResetBtn').addEventListener('click', () => {
    ['iv_topic', 'iv_rq', 'iv_pop', 'iv_themes', 'iv_theory'].forEach(id => $('#' + id).value = '');
    $('#ivResult').style.display = 'none';
  });
  $('#ivCopyBtn').addEventListener('click', () => copy($('#ivOutput').innerText));
}
function runInterview() {
  const topic = $('#iv_topic').value.trim() || '【請填入研究主題】';
  const rqs = $('#iv_rq').value.trim().split(/\n+/).filter(Boolean);
  const pop = $('#iv_pop').value.trim() || '【受訪者特徵】';
  const type = getRadio('iv_type');
  const dur = getRadio('iv_dur');
  const themes = $('#iv_themes').value.trim().split(/\n+/).filter(Boolean);
  const theory = $('#iv_theory').value.trim();

  if (!themes.length) { showToast('請至少輸入一個核心主題'); return; }

  const typeMap = { semi: '半結構化', struct: '結構化', unstruct: '非結構化' };
  const probes = ['可以再多談一點嗎？', '當時你的感受是什麼？', '能舉一個具體例子嗎？', '為什麼你會這麼說？', '這對你來說意味著什麼？', '有沒有不同的時候？'];

  let out = '';
  out += `═══════════════════════════════════════\n`;
  out += `訪談大綱｜${topic}\n`;
  out += `對象：${pop}　｜　類型：${typeMap[type]}　｜　時長：約 ${dur} 分鐘\n`;
  if (theory) out += `理論框架：${theory}\n`;
  out += `═══════════════════════════════════════\n\n`;

  out += `【研究問題】\n`;
  rqs.forEach((r, i) => out += `${i + 1}. ${r}\n`);
  out += `\n`;

  out += `【一、開場（5 分鐘）】\n`;
  out += `1. 自我介紹與研究說明：\n   「您好，我是〇〇大學的研究者，我們正在進行一項關於『${topic}』的研究，想了解像您這樣的【${pop}】的真實經驗與想法。」\n`;
  out += `2. 知情同意：說明研究目的、保密原則、自願參與、退出權利、錄音同意（簽署知情同意書）。\n`;
  out += `3. 確認受訪者準備好：「我們是否可以開始？您可以隨時暫停或選擇不回答。」\n\n`;

  out += `【二、暖身問題（5–10 分鐘）】\n`;
  out += `1. 可以先請您簡單介紹一下您的背景嗎？例如目前的工作/角色與年資？\n`;
  out += `2. 您一般在什麼樣的情境下會接觸到「${topic}」？\n\n`;

  out += `【三、核心問題（${dur === '90' ? '60' : dur === '60' ? '40' : '15'} 分鐘）】\n`;
  themes.forEach((t, i) => {
    out += `\n● 主題 ${i + 1}：${t}\n`;
    out += `  主問題：談談您對「${t}」的經驗或看法。\n`;
    out += `  追問探究：\n`;
    probes.slice(0, 4).forEach(p => out += `    – ${p}\n`);
  });

  out += `\n【四、整合與反思（5–10 分鐘）】\n`;
  out += `1. 回顧今天的對話，您覺得對您而言最重要的是什麼？\n`;
  out += `2. 還有什麼是我沒有問到、但您希望我了解的？\n`;
  out += `3. 如果讓您給其他【${pop}】一個建議，您會說什麼？\n\n`;

  out += `【五、結束（3–5 分鐘）】\n`;
  out += `1. 感謝參與，說明後續流程（轉錄、成員確認、研究結果回饋方式）。\n`;
  out += `2. 提供研究者聯絡方式與心理支持資源（如主題敏感）。\n`;
  out += `3. 詢問是否願意接受第二次訪談或推薦其他可能受訪者。\n`;

  $('#ivOutput').textContent = out;

  $('#ivTips').innerHTML = [
    `${typeMap[type]}訪談的特性：${type === 'semi' ? '依大綱靈活調整順序與追問' : type === 'struct' ? '所有受訪者依相同題序，便於比較' : '由參與者主導，研究者僅輕度引導'}`,
    '訪談前應進行至少 1 次預訪（pilot），檢驗題目清晰度與時間配置',
    '主問題避免使用「為什麼」開頭，改為「請談談…」「能不能描述一下…」',
    '探究問題要保持中立（avoid leading），先用沉默或重複關鍵詞引導',
    '錄音同時做田野筆記，記錄非語言訊息與情境',
    '訪談後立刻寫 24 小時備忘錄（debrief memo），記錄印象與後續可調整題目'
  ].map(x => `<li>${x}</li>`).join('');

  $('#ivResult').style.display = 'block';
  $('#ivResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* =========================================================
   MODULE 3 · Focus Group
   ========================================================= */
function bindFGD() {
  $('#fgRunBtn').addEventListener('click', runFGD);
  $('#fgResetBtn').addEventListener('click', () => {
    ['fg_topic', 'fg_rq', 'fg_themes'].forEach(id => $('#' + id).value = '');
    $('#fgResult').style.display = 'none';
  });
  $('#fgCopyBtn').addEventListener('click', () => copy($('#fgOutput').innerText));
}
function runFGD() {
  const topic = $('#fg_topic').value.trim() || '【請填入研究主題】';
  const rqs = $('#fg_rq').value.trim().split(/\n+/).filter(Boolean);
  const n = getRadio('fg_n');
  const homo = getRadio('fg_homo');
  const themes = $('#fg_themes').value.trim().split(/\n+/).filter(Boolean);
  const act = getRadio('fg_act');

  if (!themes.length) { showToast('請至少輸入一個討論議題'); return; }

  let out = '';
  out += `═══════════════════════════════════════\n`;
  out += `焦點團體主持指南｜${topic}\n`;
  out += `規模：${n} 人　｜　組成：${homo === 'homo' ? '同質' : '異質'}\n`;
  out += `預估時長：90–120 分鐘\n`;
  out += `═══════════════════════════════════════\n\n`;

  out += `【主持人準備】\n`;
  out += `· 主持人 1 位 + 紀錄人/觀察員 1 位\n`;
  out += `· 場地：圓桌或 U 形排列、安靜、不被打擾\n`;
  out += `· 設備：錄音設備 ×2（備援）、紀錄白板/海報紙、便利貼、計時器\n`;
  out += `· 紀念禮物 / 餐點 / 交通補助（依倫理委員會規範）\n\n`;

  out += `【研究問題】\n`;
  rqs.forEach((r, i) => out += `${i + 1}. ${r}\n`);
  out += `\n`;

  out += `【一、開場與規則（10 分鐘）】\n`;
  out += `1. 主持人自我介紹、紀錄員角色說明。\n`;
  out += `2. 研究目的、錄音說明、保密原則、自願參與。\n`;
  out += `3. 簽署知情同意。\n`;
  out += `4. 共同訂立基本規則：\n`;
  out += `   · 沒有對錯答案，每個觀點都重要\n`;
  out += `   · 一次一人發言，請彼此尊重\n`;
  out += `   · 對事不對人，可以同意也可以不同意\n`;
  out += `   · 出了這個房間，請保密成員與發言內容\n`;
  out += `   · 手機請靜音，可隨時休息\n\n`;

  out += `【二、暖身活動（10 分鐘）】\n`;
  out += `· 每人輪流自我介紹（姓名/暱稱、與主題的關聯）。\n`;
  out += `· 暖身題：「當你聽到『${topic}』時，腦中浮現的第一個詞或畫面是什麼？」（每人一張便利貼，貼到牆上）\n\n`;

  out += `【三、核心討論（60–80 分鐘）】\n`;
  themes.forEach((t, i) => {
    out += `\n◆ 議題 ${i + 1}：${t}\n`;
    out += `  · 引導語：「接下來我想請大家談談關於『${t}』的經驗或想法。」\n`;
    out += `  · 主問題：在你們的經驗中，${t} 是什麼樣的情況？\n`;
    out += `  · 追問：\n`;
    out += `    – 有沒有人想接著補充或有不同的看法？\n`;
    out += `    – 能舉一個具體的例子嗎？\n`;
    out += `    – 大家覺得這當中最關鍵的點是什麼？\n`;
    out += `    – 不同人的處境會不會有差別？\n`;
  });

  if (act === 'yes') {
    out += `\n【四、排序 / 投票活動（10–15 分鐘）】\n`;
    out += `· 將所有議題討論中提到的關鍵點寫到便利貼。\n`;
    out += `· 邀請每位成員拿 3 點貼紙，貼在他認為「最重要」「最迫切」的點上。\n`;
    out += `· 主持人帶領討論：為什麼這些點得票最高？是否有意外？\n`;
  }

  out += `\n【五、整合與結束（10 分鐘）】\n`;
  out += `1. 主持人摘要剛才的主要觀點，請成員確認、補充或修正。\n`;
  out += `2. 提問：「今天有沒有什麼還沒被討論到，但你覺得很重要的？」\n`;
  out += `3. 感謝參與，發放禮物，說明後續資料處理流程與成員回饋管道。\n`;

  $('#fgOutput').textContent = out;

  $('#fgTips').innerHTML = [
    `${homo === 'homo' ? '同質群體有助於敏感議題的開放討論' : '異質群體能呈現觀點差異與互動張力'}`,
    '每位成員平均發言時間應控制在合理範圍，主持人需柔性介入過於主導者',
    '注意「群體迷思」（groupthink）——當意見一致時主動詢問是否有不同看法',
    '紀錄員應記錄發言序列、互動方向（誰回應誰）、肢體語言與沉默時刻',
    '建議錄音 + 錄影並用，便於辨識說話者；事後盡快撰寫團體摘要備忘錄',
    '若主題敏感，事先準備支持資源清單，並於結束時提供'
  ].map(x => `<li>${x}</li>`).join('');

  $('#fgResult').style.display = 'block';
  $('#fgResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* =========================================================
   MODULE 4 · Sampling
   ========================================================= */
const SAMPLINGS = {
  rich: { name: '立意抽樣', en: 'Purposive Sampling', summary: '依研究目的刻意挑選最能提供豐富資訊的個案。最廣泛使用、彈性高。',
    steps: ['依研究問題訂出「資訊豐富」的標準（如資歷、經驗類型）', '建立納入/排除清單', '透過專家、機構、社群等多管道接觸', '隨資料蒐集調整標準（emergent sampling）'],
    cautions: ['須清楚交代抽樣標準與決策過程', '避免落入便利樣本而冠名為立意']
  },
  variation: { name: '最大差異抽樣', en: 'Maximum Variation Sampling', summary: '刻意涵蓋差異維度（年齡、地區、嚴重度等），呈現現象的廣度與共通主題。',
    steps: ['界定 2–4 個差異維度', '在每個維度的兩端與中段各取若干個案', '檢驗在差異中是否仍有共同主題', '記錄差異與共通的對照'],
    cautions: ['差異維度需有理論依據而非任意', '小樣本要小心不過度推論']
  },
  similar: { name: '同質抽樣', en: 'Homogeneous Sampling', summary: '聚焦於某一特定次群體，深入該群體的共同經驗。',
    steps: ['明確界定同質特徵', '排除其他變異來源', '以小而深的訪談取得豐厚資料', '可作為對照另一同質群體'],
    cautions: ['結論不能推及群體之外', '同質界定要可操作']
  },
  theory: { name: '理論抽樣', en: 'Theoretical Sampling (Grounded Theory)', summary: '由初步分析浮現的概念決定下一個要找的個案，直至理論飽和。',
    steps: ['先以立意取得初步個案', '同步分析、撰寫備忘錄', '依概念缺口決定下一批個案', '持續對照（constant comparison）至飽和'],
    cautions: ['必須記錄每次抽樣決策的理論依據', '飽和並非個案數量門檻而是理論充分性']
  },
  hidden: { name: '雪球 / 網絡抽樣', en: 'Snowball / Chain Sampling', summary: '透過已參與者推薦其他符合條件者，特別適用於難以接觸的族群。',
    steps: ['選擇 2–3 位起點種子個案', '訪談結束時請其推薦', '盡量平行多條鏈，避免單一網絡偏差', '評估網絡同質性'],
    cautions: ['樣本可能高度同質，缺乏網絡外的觀點', '須保護推薦者匿名性']
  },
  critical: { name: '關鍵 / 極端個案抽樣', en: 'Critical / Extreme Case Sampling', summary: '選擇能戲劇性彰顯現象的關鍵或極端個案，從而推論一般機制。',
    steps: ['依文獻與經驗界定何為關鍵或極端', '選 1–3 個個案深入分析', '與典型個案做對照分析'],
    cautions: ['關鍵性需事先論證', '不可將極端推論為平均']
  },
  typical: { name: '典型個案抽樣', en: 'Typical Case Sampling', summary: '選擇對外行讀者最能代表「一般情況」的個案，幫助理解現象本質。',
    steps: ['與利害關係人討論何為「典型」', '依共識選擇 1–3 例', '描述其代表性的依據'],
    cautions: ['須交代典型的判準', '不適用於追求變異的研究']
  },
  convenient: { name: '便利抽樣', en: 'Convenience Sampling', summary: '以可及性高為主要考量。研究價值有限，需有正當理由。',
    steps: ['說明選擇便利樣本的研究限制', '盡量結合其他抽樣（如便利+立意）', '清楚交代抽樣偏差'],
    cautions: ['是質性研究中最薄弱的抽樣方式', '建議只在預試或不可避免時使用']
  }
};

function bindSampling() {
  $('#sRunBtn').addEventListener('click', runSampling);
  $('#sResetBtn').addEventListener('click', () => {
    $$('input[name^="s_"]').forEach(i => i.checked = false);
    ['s_pop', 's_in', 's_ex'].forEach(id => $('#' + id).value = '');
    $('#sResult').style.display = 'none';
  });
  $('#sCopyBtn').addEventListener('click', () => copy($('#sResult').innerText));
}
function runSampling() {
  const aim = getRadio('s_aim');
  const design = getRadio('s_design');
  if (!aim) { showToast('請選擇抽樣意圖'); return; }

  let primary = aim;
  // design override
  if (design === 'grounded' && aim !== 'theory') primary = 'theory';
  if (design === 'phenomenology' && (aim === 'rich' || aim === 'similar')) primary = 'similar';

  const s = SAMPLINGS[primary];
  const altKeys = Object.keys(SAMPLINGS).filter(k => k !== primary).slice(0, 3);

  $('#sName').textContent = s.name;
  $('#sEn').textContent = s.en;
  $('#sSummary').textContent = s.summary;
  $('#sAlts').innerHTML = '<span class="tag">可組合策略</span>' + altKeys.map(k => `<span class="tag">${SAMPLINGS[k].name}</span>`).join('');
  $('#sSteps').innerHTML = s.steps.map(x => `<li>${x}</li>`).join('');
  $('#sCautions').innerHTML = s.cautions.map(x => `<li>${x}</li>`).join('');

  const pop = $('#s_pop').value.trim() || '【符合納入標準的對象】';
  const incs = $('#s_in').value.trim().split(/\n+/).filter(Boolean);
  const exs = $('#s_ex').value.trim().split(/\n+/).filter(Boolean);

  let invite = '';
  invite += `主旨｜誠摯邀請您參與「${pop}」研究訪談\n\n`;
  invite += `您好，我是〇〇大學/機構的研究者〇〇〇。我們正在進行一項聚焦於「【研究主題】」的研究，希望深入了解像您這樣的【${pop}】的經驗與看法。\n\n`;
  if (incs.length) invite += `納入條件：\n${incs.map((x, i) => `· ${x}`).join('\n')}\n\n`;
  if (exs.length) invite += `排除條件：\n${exs.map((x, i) => `· ${x}`).join('\n')}\n\n`;
  invite += `若您願意參與，將進行一次約 60–90 分鐘的個別訪談，地點與時間依您方便調整。所有資料將匿名處理，您可以隨時退出而不影響任何權益。\n\n`;
  invite += `如有意願或疑問，請聯絡：【姓名／電話／Email】\n本研究已通過【XX 倫理委員會】審查，編號：【XXXX-XXX】。\n\n誠摯邀請您的參與。\n`;

  $('#sInvite').textContent = invite;
  $('#sResult').style.display = 'block';
  $('#sResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* =========================================================
   MODULE 5 · Information Power
   ========================================================= */
function bindIP() {
  for (let i = 1; i <= 5; i++) {
    const sl = $('#ip' + i), out = $('#ip' + i + 'v');
    sl.addEventListener('input', () => out.textContent = sl.value);
  }
  $('#ipRunBtn').addEventListener('click', runIP);
  $('#ipResetBtn').addEventListener('click', () => {
    for (let i = 1; i <= 5; i++) { $('#ip' + i).value = 3; $('#ip' + i + 'v').textContent = 3; }
    $('#ipResult').style.display = 'none';
  });
  $('#ipCopyBtn').addEventListener('click', () => copy($('#ipNarrative').innerText));
}
function runIP() {
  const v = [1, 2, 3, 4, 5].map(i => +$('#ip' + i).value);
  const total = v.reduce((a, b) => a + b, 0); // 5–25
  const dim = ['研究目的', '樣本特異性', '理論背景', '對話品質', '分析策略'];

  // mapping: high score → less needed
  let range, level;
  if (total >= 22) { range = '5 – 10 位'; level = '極高資訊力'; }
  else if (total >= 18) { range = '8 – 15 位'; level = '高資訊力'; }
  else if (total >= 13) { range = '15 – 25 位'; level = '中等資訊力'; }
  else if (total >= 9) { range = '25 – 40 位'; level = '較低資訊力'; }
  else { range = '40 位以上 或 重新檢視研究設計'; level = '低資訊力'; }

  $('#ipSummary').innerHTML = dim.map((d, i) =>
    `<div class="summary-item"><div class="summary-label">${d}</div><div class="summary-value">${v[i]} / 5</div></div>`
  ).join('') + `<div class="summary-item"><div class="summary-label">總分</div><div class="summary-value">${total} / 25 · ${level}</div></div>`;

  $('#ipRange').textContent = `建議樣本量範圍：${range}\n\n（範圍為起始估計，實際需依資料蒐集中的資訊力動態調整）`;

  let nar = '';
  nar += `本研究以 Malterud, Siersma & Guassora (2016) 提出的「資訊力」(information power) 模型評估樣本充足性。`;
  nar += `綜合考量：(1) 研究目的的聚焦程度（${v[0]}/5）、(2) 樣本相對於研究問題的特異性（${v[1]}/5）、`;
  nar += `(3) 既有理論對研究的支持程度（${v[2]}/5）、(4) 研究者—參與者對話的品質（${v[3]}/5）、`;
  nar += `(5) 分析策略的取向（${v[4]}/5），整體資訊力評估為「${level}」。`;
  nar += `初步預估招募 ${range}，並於資料蒐集過程中持續評估資訊力，以決定是否需擴大樣本。`;
  nar += `\n\n參考文獻：Malterud K, Siersma VD, Guassora AD. (2016). Sample Size in Qualitative Interview Studies: Guided by Information Power. Qualitative Health Research, 26(13), 1753–1760.`;

  $('#ipNarrative').textContent = nar;
  $('#ipResult').style.display = 'block';
  $('#ipResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* =========================================================
   CHECKLIST DATA · COREQ / SRQR / CASP / JBI / ENTREQ
   ========================================================= */
const COREQ_DATA = {
  '研究團隊與反思性 (Domain 1)': [
    [1, '訪談員/主持人', '哪一位作者進行訪談或主持焦點團體？'],
    [2, '學經歷', '研究者的學經歷與研究訓練背景'],
    [3, '職業', '研究進行時研究者的職業'],
    [4, '性別', '研究者的性別'],
    [5, '經驗與訓練', '研究者的相關經驗與訓練'],
    [6, '已建立關係', '在研究開始前研究者是否與參與者已建立關係？'],
    [7, '參與者對訪談員的認識', '參與者對訪談員了解多少（如目標、原因）？'],
    [8, '訪談員特質', '研究主題、研究興趣、假設、研究動機等是否被報告？']
  ],
  '研究設計 (Domain 2)': [
    [9, '方法論取向與理論', '採用何種方法論及其理論依據（如紮根理論、現象學）？'],
    [10, '抽樣', '採用何種抽樣方法（立意、雪球、便利、連續）？'],
    [11, '接觸方式', '如何與參與者取得聯繫（面對面、電話、信件、Email）？'],
    [12, '樣本量', '參與者人數是多少？'],
    [13, '不參與率', '有多少人拒絕或退出？原因為何？'],
    [14, '資料蒐集場域', '資料在何處蒐集（家中、診所、職場）？'],
    [15, '在場的非參與者', '除研究者與參與者外，是否還有其他人在場？'],
    [16, '樣本描述', '樣本的重要特徵（如人口學、日期）？'],
    [17, '訪談大綱', '是否提供問題大綱、提示問題？是否經試訪修訂？'],
    [18, '重複訪談', '是否進行多次訪談？若是，幾次？'],
    [19, '錄音 / 錄影', '研究者是否錄音/錄影以蒐集資料？'],
    [20, '田野筆記', '在訪談 / 焦點團體中或之後是否做田野筆記？'],
    [21, '訪談時長', '訪談或焦點團體的時長為何？'],
    [22, '資料飽和', '是否討論資料飽和？'],
    [23, '逐字稿回饋', '是否將逐字稿提供參與者修正？']
  ],
  '分析與發現 (Domain 3)': [
    [24, '編碼者人數', '有多少資料編碼者？'],
    [25, '編碼樹說明', '作者是否提供編碼樹的描述？'],
    [26, '主題的形成', '主題是預先設定還是由資料浮現？'],
    [27, '分析軟體', '使用了何種軟體（NVivo、ATLAS.ti）管理資料？'],
    [28, '參與者回饋', '參與者是否就研究發現提供回饋？'],
    [29, '引用呈現', '是否使用參與者的直接引述以說明主題或發現？'],
    [30, '資料與發現的一致性', '呈現的資料是否與發現一致？'],
    [31, '主要主題清晰度', '研究發現中主要主題是否清楚？'],
    [32, '次要主題清晰度', '是否描述了多元觀點與次要主題？']
  ]
};

const SRQR_DATA = {
  '標題與摘要': [
    [1, '標題', '簡明指出研究性質、設計與主題'],
    [2, '摘要', '研究問題、方法、結果與意義的簡要摘要']
  ],
  '導論': [
    [3, '問題的形成', '描述問題的重要性、相關概念與理論基礎'],
    [4, '研究目的或研究問題', '明確陳述研究目的或研究問題']
  ],
  '方法': [
    [5, '取向與研究典範', '說明取向（如民族誌、紮根理論）及其哲學基礎'],
    [6, '研究者特質與反思性', '研究者背景、與主題關係，並反思如何影響研究'],
    [7, '脈絡', '研究場域與脈絡的描述（地點、時程、文化）'],
    [8, '抽樣策略', '如何挑選參與者與資料來源，及其依據'],
    [9, '倫理議題', '倫理委員會審查、知情同意、保密、參與者保護'],
    [10, '資料蒐集方法', '使用的方法（訪談、觀察、文件）及其為何適合'],
    [11, '資料蒐集工具與技術', '如訪談大綱、錄音設備、田野筆記如何使用'],
    [12, '研究單位', '參與者、案例、文件、事件等研究單位的描述'],
    [13, '資料處理', '資料管理、轉錄、匿名化等流程'],
    [14, '資料分析', '分析步驟、編碼方法、主題形成過程'],
    [15, '可信度技術', '採用了哪些技術（成員確認、三角檢證、同儕審視）']
  ],
  '結果': [
    [16, '綜合與詮釋', '呈現的主要發現、主題、模式或理論'],
    [17, '與資料的連結', '使用具體引述、田野筆記摘錄等支持發現']
  ],
  '討論': [
    [18, '與既有文獻整合', '研究結果與既有文獻、理論的整合與貢獻'],
    [19, '研究限制', '可信度、轉移性、一致性、確認性的限制']
  ],
  '其他': [
    [20, '利益衝突', '揭露利益衝突'],
    [21, '經費來源', '說明研究資助來源及其在研究中的角色']
  ]
};

const CASP_DATA = {
  'Section A：研究結果是否有效？': [
    [1, '研究目的是否清楚？', '研究目標、為何重要、相關性是否明確？'],
    [2, '質性方法是否適合？', '研究問題是否適合用質性方法回答？'],
    [3, '研究設計是否適切於目的？', '研究者是否說明選擇此設計的理由？'],
    [4, '招募策略是否適切？', '所選參與者是否最能回答研究問題？是否討論未參與者？'],
    [5, '資料蒐集方式是否能回答研究問題？', '蒐集場域、方法、工具、修正過程是否清楚？'],
    [6, '研究者與參與者關係是否被充分考慮？', '研究者位置（positionality）對資料蒐集與分析的影響']
  ],
  'Section B：結果為何？': [
    [7, '是否考量倫理議題？', '知情同意、保密、倫理委員會核准等'],
    [8, '資料分析是否夠嚴謹？', '是否有清楚的分析過程描述、是否考慮對立資料、是否反思研究者角色'],
    [9, '研究結果是否清楚？', '主要發現是否清楚、是否有充分的引述支持']
  ],
  'Section C：研究的價值？': [
    [10, '研究價值為何？', '結果對既有知識、實務、政策的貢獻；後續研究方向']
  ]
};

const JBI_DATA = {
  '質性研究嚴謹性 (10 題)': [
    [1, '哲學立場與方法論一致', '陳述的哲學取向與所使用方法論之間是否一致？'],
    [2, '方法論與研究問題一致', '方法論與研究問題或目的是否一致？'],
    [3, '方法論與資料蒐集方式一致', '方法論與資料蒐集方法是否一致？'],
    [4, '方法論與資料呈現分析一致', '方法論與資料的表徵與分析方式是否一致？'],
    [5, '方法論與結果詮釋一致', '方法論與結果的詮釋方式是否一致？'],
    [6, '研究者文化或理論立場', '是否陳述了研究者的文化或理論位置？'],
    [7, '研究者影響的反思', '是否討論研究者對研究、以及研究對研究者的影響？'],
    [8, '參與者聲音被代表', '參與者及其觀點是否被充分代表？'],
    [9, '研究倫理', '是否符合現行倫理標準，是否有倫理委員會核准的證據？'],
    [10, '結論與分析的關聯', '研究結論是否來自資料的分析或詮釋？']
  ]
};

const ENTREQ_DATA = {
  'A. 導論與目的': [
    [1, '目的（Aim）', '研究目的或回顧目的'],
    [2, '綜合方法論（Synthesis methodology）', '採用何種綜合方法論（meta-ethnography、meta-aggregation、thematic synthesis 等）']
  ],
  'B. 文獻搜尋': [
    [3, '搜尋取向', '說明採用何種搜尋取向（如全面、迭代、立意）'],
    [4, '納入標準', '納入/排除研究的標準'],
    [5, '資料來源', '使用的資料來源（資料庫、灰色文獻、手檢）'],
    [6, '電子搜尋策略', '提供至少一個資料庫的完整搜尋字串'],
    [7, '篩選方法', '研究篩選流程（標題/摘要/全文）']
  ],
  'C. 研究選擇': [
    [8, '研究特徵', '納入研究的特徵（國家、年份、設計）'],
    [9, '篩選結果', '篩選流程圖（PRISMA-style）']
  ],
  'D. 品質評估': [
    [10, '評估的合理性', '是否評估、為何評估或不評估'],
    [11, '評估項目', '使用何種品質評估工具'],
    [12, '評估流程', '誰評估、是否獨立評估'],
    [13, '評估結果', '各研究的品質評估結果']
  ],
  'E. 資料萃取與分析': [
    [14, '資料萃取', '萃取了哪些資料及流程'],
    [15, '使用的軟體', '使用的軟體（NVivo、ATLAS.ti）'],
    [16, '評閱者人數', '進行萃取/分析的人數'],
    [17, '編碼', '編碼流程的描述'],
    [18, '研究比較', '研究間如何比較']
  ],
  'F. 綜合結果': [
    [19, '主題的形成', '主題或範疇如何形成'],
    [20, '引述', '使用原研究中的引述以支持綜合主題'],
    [21, '綜合產出', '最終綜合產出（理論、模型、新主題）']
  ]
};

/* =========================================================
   Generic Checklist Builder
   ========================================================= */
function buildChecklist(key, data, options) {
  const opts = options || ['Yes', 'Partial', 'No', 'NA'];
  const yesValue = opts[0];
  const container = $('#' + key + 'List');
  const totalItems = Object.values(data).reduce((s, arr) => s + arr.length, 0);

  let html = '';
  Object.keys(data).forEach(domain => {
    html += `<div class="checklist-domain"><div class="checklist-domain-title">${domain}</div>`;
    data[domain].forEach(([num, title, hint]) => {
      html += `<div class="cl-item" data-num="${num}">
        <div class="cl-item-head">
          <div class="cl-num">${num}.</div>
          <div class="cl-text">${title}${hint ? `<small>${hint}</small>` : ''}</div>
        </div>
        <div class="cl-controls">
          ${opts.map(o => `<label class="cl-radio"><input type="radio" name="${key}_${num}" value="${o}"><span>${o}</span></label>`).join('')}
        </div>
        <div class="cl-note"><textarea name="${key}_note_${num}" placeholder="補充說明、頁碼、引用片段（選填）"></textarea></div>
      </div>`;
    });
    html += `</div>`;
  });
  container.innerHTML = html;

  container.addEventListener('change', () => updateChecklistScore(key, totalItems, yesValue));
  // store config
  container._config = { key, data, opts, yesValue, totalItems };
}

function updateChecklistScore(key, totalItems, yesValue) {
  let answered = 0, yes = 0;
  Object.values(window['_' + key + 'Data'] || {}).forEach(() => { });
  $$(`#${key}List .cl-item`).forEach(item => {
    const num = item.dataset.num;
    const checked = document.querySelector(`input[name="${key}_${num}"]:checked`);
    if (checked) { answered++; if (checked.value === yesValue) yes++; }
  });
  $('#' + key + 'Answered').textContent = answered;
  $('#' + key + 'Yes').textContent = yes;
}

function bindChecklistActions() {
  $$('.score-bar button[data-cl]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cl = btn.dataset.cl, act = btn.dataset.act;
      if (act === 'reset') {
        $$(`#${cl}List input[type=radio]`).forEach(i => i.checked = false);
        $$(`#${cl}List textarea`).forEach(t => t.value = '');
        $('#' + cl + 'Answered').textContent = 0;
        $('#' + cl + 'Yes').textContent = 0;
        showToast('已清空');
      } else if (act === 'copy') {
        copy(buildChecklistSummary(cl));
      }
    });
  });
}

function buildChecklistSummary(key) {
  const dataMap = { coreq: COREQ_DATA, srqr: SRQR_DATA, casp: CASP_DATA, jbi: JBI_DATA, entreq: ENTREQ_DATA };
  const titleMap = { coreq: 'COREQ 32 項', srqr: 'SRQR 21 項', casp: 'CASP 質性版 10 項', jbi: 'JBI 質性版 10 項', entreq: 'ENTREQ 21 項' };
  const data = dataMap[key];
  let total = 0, answered = 0, yes = 0;
  let lines = [`═══ ${titleMap[key]}　評估摘要 ═══\n`];
  Object.keys(data).forEach(domain => {
    lines.push(`\n【${domain}】`);
    data[domain].forEach(([num, title]) => {
      total++;
      const sel = document.querySelector(`input[name="${key}_${num}"]:checked`);
      const note = document.querySelector(`textarea[name="${key}_note_${num}"]`).value.trim();
      if (sel) {
        answered++;
        if (sel.value === 'Yes' || sel.value.toLowerCase() === 'yes') yes++;
      }
      lines.push(`${num}. [${sel ? sel.value : '－'}] ${title}${note ? '\n   ➜ ' + note : ''}`);
    });
  });
  lines.unshift(`已回答：${answered} / ${total}　｜　Yes：${yes} 項\n`);
  return lines.join('\n');
}

/* =========================================================
   MODULE 11 · GRADE-CERQual
   ========================================================= */
const CQ_DOMAINS = [
  { key: 'meth', name: '方法論限制', en: 'Methodological Limitations', desc: '納入研究本身在設計或執行上的問題對發現的影響程度' },
  { key: 'coh', name: '一致性', en: 'Coherence', desc: '資料與發現之間是否清楚、合理且充分連結' },
  { key: 'adq', name: '資料充分性', en: 'Adequacy of Data', desc: '支持發現的資料量與資料豐富度（rich, thick）是否足夠' },
  { key: 'rel', name: '相關性', en: 'Relevance', desc: '納入研究的脈絡（人群、現象、場域）與回顧問題的契合度' }
];

function bindCERQual() {
  let html = '';
  CQ_DOMAINS.forEach(d => {
    html += `<div class="field">
      <label>${d.name} <small>${d.en} · ${d.desc}</small></label>
      <div class="radio-row">
        <label class="radio-btn"><input type="radio" name="cq_${d.key}" value="0"><span>無顧慮</span></label>
        <label class="radio-btn"><input type="radio" name="cq_${d.key}" value="1"><span>輕微顧慮</span></label>
        <label class="radio-btn"><input type="radio" name="cq_${d.key}" value="2"><span>中度顧慮</span></label>
        <label class="radio-btn"><input type="radio" name="cq_${d.key}" value="3"><span>嚴重顧慮</span></label>
      </div>
      <textarea id="cq_${d.key}_note" placeholder="說明此面向的判斷依據（選填但建議填寫）" style="margin-top:8px;width:100%;padding:8px 10px;font-size:13px;border:1px solid #ece5d3;background:#fff;font-family:inherit;outline:none;min-height:50px;resize:vertical;"></textarea>
    </div>`;
  });
  $('#cqDomains').innerHTML = html;

  $('#cqRunBtn').addEventListener('click', runCQ);
  $('#cqResetBtn').addEventListener('click', () => {
    $$('#m-cerqual input').forEach(i => { if (i.type === 'radio') i.checked = false; else i.value = ''; });
    $$('#m-cerqual textarea').forEach(t => t.value = '');
    $('#cqResult').style.display = 'none';
  });
  $('#cqCopyBtn').addEventListener('click', () => copy($('#cqProfile').innerText));
}

function runCQ() {
  const finding = $('#cq_finding').value.trim();
  if (!finding) { showToast('請先填入綜合發現'); return; }
  const n = $('#cq_n').value || '－';

  const scores = {};
  let unanswered = false;
  CQ_DOMAINS.forEach(d => {
    const v = getRadio('cq_' + d.key);
    if (v === '') { unanswered = true; }
    scores[d.key] = v === '' ? null : +v;
  });
  if (unanswered) { showToast('請完成所有四個面向的評估'); return; }

  // overall: highest concern dominates, with nuance
  const max = Math.max(...Object.values(scores));
  const seriousCount = Object.values(scores).filter(x => x === 3).length;
  const moderateCount = Object.values(scores).filter(x => x === 2).length;
  let level, levelEn, desc;
  if (max === 0) { level = '高度信心'; levelEn = 'HIGH confidence'; desc = '高度可能此綜合發現能合理代表研究現象。'; }
  else if (max === 1 && seriousCount === 0 && moderateCount === 0) { level = '中度信心'; levelEn = 'MODERATE confidence'; desc = '此綜合發現可能合理代表研究現象，存在部分輕微顧慮。'; }
  else if (max <= 2 && seriousCount === 0) { level = '低度信心'; levelEn = 'LOW confidence'; desc = '此綜合發現可能或可能不合理代表研究現象，存在多項中度顧慮。'; }
  else { level = '極低信心'; levelEn = 'VERY LOW confidence'; desc = '此綜合發現是否合理代表研究現象高度不確定，存在嚴重顧慮。'; }

  $('#cqLevel').textContent = level;
  $('#cqLevelEn').textContent = levelEn;
  $('#cqLevelDesc').textContent = desc;

  const tier = ['無顧慮', '輕微顧慮', '中度顧慮', '嚴重顧慮'];
  let report = '';
  report += `═══ GRADE-CERQual 信心評估摘要 ═══\n\n`;
  report += `綜合發現：${finding}\n`;
  report += `納入研究數：${n}\n\n`;
  report += `┌─ 證據概況表 ──────────────────────────\n`;
  CQ_DOMAINS.forEach(d => {
    const note = $('#cq_' + d.key + '_note').value.trim();
    report += `│ ${d.name} (${d.en}): ${tier[scores[d.key]]}\n`;
    if (note) report += `│   依據：${note}\n`;
  });
  report += `└────────────────────────────────────\n\n`;
  report += `總體信心：${level}（${levelEn}）\n`;
  report += `說明：${desc}\n\n`;
  report += `參考：Lewin S, et al. (2018). Applying GRADE-CERQual to qualitative evidence synthesis findings. Implementation Science 13(Suppl 1).`;

  $('#cqProfile').textContent = report;
  $('#cqResult').style.display = 'block';
  $('#cqResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
