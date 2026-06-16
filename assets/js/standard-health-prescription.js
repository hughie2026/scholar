/* ============================================================
 * Standard Health Prescription · Hughie Lab
 * --------------------------------------------------------------
 * 用途：根據 standard-health-assessment.html 的評估結果，
 *      生成 4 週生活方式處方 + 7 天行動清單。
 *
 * 處方知識來源（教學參考，非醫療指引）：
 *  - WHO Global Recommendations on Physical Activity (2020)
 *  - American College of Lifestyle Medicine (ACLM) 6 Pillars
 *  - DASH / Mediterranean Diet 基本原則
 *  - AASM Sleep Hygiene Recommendations
 *  - WHO 飲酒指南；CDC / 各地戒菸資源
 *
 * ⚠ 本工具僅供教學、研究訓練、健康教育用途，
 *   不構成醫療診斷、治療建議或用藥建議。
 *   PHQ-9 / GAD-7 / PSQI / PSS-10 / STOP-Bang 等量表的版權與授權
 *   歸原作者／機構所有，使用者應自行確認其使用情境符合原量表
 *   授權、引用與版權要求。
 * ============================================================ */

const ASSESS_KEY = 'hughie_health_assessment_v1';
const RX_KEY     = 'hughie_health_prescription_v1';

let _report = null;   // 評估結果
let _rx     = null;   // 處方物件
let _rxText = '';     // Markdown 文字

/* ============================================================
 * 1. 來源切換 (auto / json / manual)
 * ============================================================ */

document.querySelectorAll('.src-tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.src-tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.src-pane').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    document.querySelector(`.src-pane[data-pane="${t.dataset.pane}"]`).classList.add('active');
  });
});

function tryAutoLoad() {
  const raw = localStorage.getItem(ASSESS_KEY);
  if (!raw) {
    document.getElementById('autoStatus').innerHTML =
      '⚠ 本機沒有評估結果。請先到評估工具完成測評，或改用「貼入 JSON」/「手動輸入」。';
    return;
  }
  try {
    const r = JSON.parse(raw);
    document.getElementById('autoStatus').innerHTML =
      `✓ 找到評估記錄（${new Date(r.meta?.generatedAt || Date.now()).toLocaleString('zh-Hant')}），點擊下方按鈕生成處方。`;
  } catch (e) {
    document.getElementById('autoStatus').innerHTML = '⚠ 評估記錄解析失敗，可能格式有誤。';
  }
}

/* ============================================================
 * 2. 載入動作（auto / json / manual）
 * ============================================================ */

document.getElementById('btnAutoLoad').addEventListener('click', () => {
  const raw = localStorage.getItem(ASSESS_KEY);
  if (!raw) return showToast('沒有找到評估記錄');
  try {
    _report = JSON.parse(raw);
    generateAndRender();
    showToast('✓ 已讀取並產生處方');
  } catch (e) {
    showToast('解析失敗：' + e.message);
  }
});

document.getElementById('btnJsonLoad').addEventListener('click', () => {
  const txt = document.getElementById('jsonInput').value.trim();
  if (!txt) return showToast('請先貼入 JSON');
  try {
    _report = JSON.parse(txt);
    generateAndRender();
    showToast('✓ JSON 解析完成');
  } catch (e) {
    showToast('JSON 解析失敗：' + e.message);
  }
});

document.getElementById('btnManualLoad').addEventListener('click', () => {
  const g = id => document.getElementById(id).value;
  const num = id => { const v = g(id); return v === '' ? null : +v; };

  const m_height = num('m_height'), m_weight = num('m_weight');
  const bmi = (m_height && m_weight) ? +(m_weight / Math.pow(m_height / 100, 2)).toFixed(1) : null;
  const bmiTag = bmi == null ? null
              : bmi < 18.5 ? '體重過低'
              : bmi < 24   ? '正常'
              : bmi < 28   ? '超重' : '肥胖';
  const waist = num('m_waist');
  const whtr = (waist && m_height) ? +(waist / m_height).toFixed(2) : null;
  const whtrTag = whtr == null ? null : whtr >= 0.5 ? '中心型肥胖風險' : '正常';

  const gender   = g('m_gender') || null;
  const auditC   = num('m_auditc') ?? 0;
  const cAtRisk  = (gender === 'male'   && auditC >= 4)
               || (gender === 'female' && auditC >= 3);

  // 構造一個最小可用的 report 物件
  _report = {
    meta: { generatedAt: new Date().toISOString(), source: 'manual' },
    raw: {
      age: num('m_age'),
      gender,
      height: m_height,
      weight: m_weight,
      waist,
      sbp: num('m_sbp'),
      dbp: num('m_dbp'),
      fpg: num('m_fpg'),
      hba1c: num('m_hba1c'),
      hx_smoke: g('m_smoke'),
      willing_intensity: g('m_intensity') || '標準',
    },
    anthro: { bmi, bmiTag, whtr, whtrTag },
    cm: [],
    scales: {
      ipaq:     { category: g('m_ipaq') || 'low', sit: num('m_sit') || 0, total: 0,
                  walkMET: 0, modMET: 0, vigMET: 0 },
      who5:     { pct: num('m_who5')  ?? 60, raw: 0,  tag: '' },
      phq9:     { total: num('m_phq9') ?? 0,  q9: 0,  tag: '', safetyAlert: false },
      gad7:     { total: num('m_gad7') ?? 0,  tag: '' },
      audit:    { auditC, cAtRisk, cTag: cAtRisk ? '飲酒風險升高' : '低風險',
                  auditFull: null, fullTag: null },
      psqi:     { total: num('m_psqi') ?? 0,  c1:0, c2:0, c3:0, c4:0, c5:0, c6:0, c7:0,
                  efficiency: 0, tag: '' },
      pss10:    { total: num('m_pss10') ?? 0, tag: '' },
      stopbang: { total: num('m_stopbang') ?? 0, tag: '' },
    },
    concerns: [],
    priority: [],
    actions: [],
  };
  generateAndRender();
  showToast('✓ 已產生處方');
});

/* ============================================================
 * 3. 處方核心 - 主入口
 * ============================================================ */

function generateAndRender() {
  if (!_report) return;
  _rx     = buildPrescription(_report);
  _rxText = buildMarkdown(_rx, _report);
  renderRx(_rx);
}

function buildPrescription(report) {
  const r = report;
  const d = r.raw    || {};
  const a = r.anthro || {};
  const s = r.scales || {};
  const intensity = d.willing_intensity || '標準';

  // 主要關注點 / 優先順序：優先用評估給的，否則自動推導
  const concerns = (r.concerns && r.concerns.length) ? r.concerns : autoConcerns(d, a, s);
  const priority = (r.priority && r.priority.length) ? r.priority : autoPriority(concerns);

  return {
    intensity,
    concerns,
    priority,
    weeks:     build4Weeks(s, a, d, intensity),
    days:      build7Days(s, a, d, intensity),
    diet:      buildDietRx(s, a, d, intensity),
    exercise:  buildExerciseRx(s, a, d, intensity),
    sleep:     buildSleepRx(s, d, intensity),
    stress:    buildStressRx(s, intensity),
    sedentary: buildSedentaryRx(s, d, intensity),
    substance: buildSubstanceRx(s, d),
    osa:       buildOsaRx(s),
    tracking:  buildTracking(a, s),
    refer:     buildReferral(s, a, d),
  };
}

/* ============================================================
 * 4. 主要關注點 / 優先順序自動推導
 * ============================================================ */

function autoConcerns(d, a, s) {
  const c = [];
  if (a.bmi >= 28)                       c.push({ tag: '肥胖',           area: '體重管理' });
  else if (a.bmi >= 24)                  c.push({ tag: '超重',           area: '體重管理' });
  if (a.whtrTag === '中心型肥胖風險')     c.push({ tag: '中心型肥胖',     area: '腰圍管理' });
  if ((+d.sbp >= 130) || (+d.dbp >= 85)) c.push({ tag: '血壓偏高',       area: '血壓管理' });
  if (+d.fpg >= 6.1 || +d.hba1c >= 5.7)  c.push({ tag: '血糖代謝邊緣',   area: '血糖管理' });
  if (s.ipaq?.category === 'low')        c.push({ tag: '身體活動不足',   area: '運動' });
  if ((s.who5?.pct ?? 100) < 50)         c.push({ tag: '幸福感偏低',     area: '心理健康' });
  if ((s.phq9?.total ?? 0) >= 5)         c.push({ tag: `抑鬱症狀（${s.phq9.tag || '輕度以上'}）`, area: '心理健康' });
  if ((s.gad7?.total ?? 0) >= 5)         c.push({ tag: `焦慮症狀（${s.gad7.tag || '輕度以上'}）`, area: '心理健康' });
  if (s.audit?.cAtRisk)                  c.push({ tag: '飲酒風險升高',   area: '飲酒管理' });
  if ((s.psqi?.total ?? 0) > 5)          c.push({ tag: '睡眠品質不佳',   area: '睡眠' });
  if ((s.pss10?.total ?? 0) >= 14)       c.push({ tag: '壓力中等以上',   area: '壓力管理' });
  if ((s.stopbang?.total ?? 0) >= 3)     c.push({ tag: 'OSA 風險升高',   area: '呼吸睡眠' });
  if ((s.ipaq?.sit ?? 0) >= 480)         c.push({ tag: '久坐時間過長',   area: '久坐' });
  if (d.hx_smoke === '是' || d.smoke === '是') c.push({ tag: '吸菸',     area: '戒菸' });
  return c;
}

function autoPriority(concerns) {
  const seen = new Set();
  const out = [];
  concerns.forEach(c => {
    if (!seen.has(c.area)) { seen.add(c.area); out.push(c.area); }
  });
  return out;
}

/* ============================================================
 * 5. 4 週處方
 * ============================================================ */

function build4Weeks(s, a, d, intensity) {
  const focus = primaryFocus(s, a, d, intensity);
  return [
    { week: 'Week 1', title: '建立基線',     body: composeWeek(focus.w1Theme, focus.w1Goals) },
    { week: 'Week 2', title: '飲食結構優化', body: composeWeek(focus.w2Theme, focus.w2Goals) },
    { week: 'Week 3', title: '運動與壓力雙提升', body: composeWeek(focus.w3Theme, focus.w3Goals) },
    { week: 'Week 4', title: '回顧與固化',   body: composeWeek(focus.w4Theme, focus.w4Goals) },
  ];
}

function composeWeek(theme, goals) {
  return `🎯 主題：${theme}\n• ${goals.join('\n• ')}`;
}

function primaryFocus(s, a, d, intensity) {
  const isHeavy   = (a.bmi || 0) >= 28;
  const isOver    = (a.bmi || 0) >= 24;
  const lowAct    = s.ipaq?.category === 'low';
  const poorSleep = (s.psqi?.total || 0) > 5;
  const stressed  = (s.pss10?.total || 0) >= 14;
  const lowMood   = (s.phq9?.total || 0) >= 5 || (s.who5?.pct || 100) < 50;
  const drink     = s.audit?.cAtRisk;
  const smoke     = d.hx_smoke === '是' || d.smoke === '是';
  const osa       = (s.stopbang?.total || 0) >= 3;
  const inten     = intensity || '標準';

  // Week 1：低門檻啟動
  const w1Goals = [
    lowAct ? '每天累計 6000 步，先求每天動 20 分鐘' : '每天累計 8000 步',
    '記錄三餐、睡眠時段、情緒（簡易日誌即可）',
    poorSleep ? '固定就寢與起床時間（誤差 ≤30 分鐘）' : '保持就寢時間規律',
    stressed  ? '每天 5 分鐘呼吸練習（4-7-8 呼吸法）'  : '每天 3 分鐘正念暫停',
  ];
  if (smoke) w1Goals.push('紀錄每日吸菸支數，找出觸發情境（高峰時段／情緒）');
  if (drink) w1Goals.push('紀錄每日飲酒份量，設定本週至少 2 個「無酒日」');

  // Week 2：飲食結構
  const w2Goals = [
    '每餐 1/2 蔬菜 + 1/4 蛋白質 + 1/4 全穀',
    '飲料改為白開水或無糖茶；杜絕含糖飲料',
    isHeavy ? '減少精緻碳水 1 餐/日；避免油炸與加工食品'
            : '主食至少 1/3 為全穀',
    '每週 ≥1 次魚類或豆類取代紅肉',
  ];
  if (d.willing_eatout === '是') w2Goals.push('外食技巧：先點蔬菜湯、要求少油少鹽、主食減 1/3');
  if (isOver) w2Goals.push('每日總熱量稍微下調（-300 至 -500 kcal），優先減精緻碳水');

  // Week 3：運動與壓力提升
  const targetMin = inten === '溫和' ? 90 : inten === '積極' ? 200 : 150;
  const w3Goals = [
    `中等強度有氧 ≥${targetMin} 分鐘/週（拆 4–5 次完成）`,
    '加入 2 次抗阻力訓練（自重深蹲／伏地挺身／彈力帶）',
    '每天 10 分鐘冥想或步行靜心',
    '每坐 50 分鐘起身活動 3 分鐘',
  ];
  if (lowMood) w3Goals.push('每天安排 1 件「為快樂而做」的小活動（音樂、烹飪、創作、戶外）');
  if (osa)     w3Goals.push('側睡訓練：用枕頭或網球縫於睡衣後方避免仰睡');

  // Week 4：固化
  const w4Goals = [
    '比較 W1 與 W4 的體重、腰圍、睡眠時數、PHQ-2 簡測',
    '保留 2 個最容易維持的習慣作為「終身行為」',
    '計劃下一個 4 週的微調目標',
    '若指標未改善 2 週以上，考慮諮詢專業人員',
  ];

  return {
    w1Theme: lowAct ? '輕量啟動，建立節奏' : '建立基線，掌握資料',
    w1Goals,
    w2Theme: '飲食結構優化',
    w2Goals,
    w3Theme: '運動與壓力雙提升',
    w3Goals,
    w4Theme: '回顧、再校正、長期化',
    w4Goals,
  };
}

/* ============================================================
 * 6. 7 天行動清單（第 1 週）
 * ============================================================ */

function build7Days(s, a, d, intensity) {
  const lowAct = s.ipaq?.category === 'low';
  const isHeavy = (a.bmi || 0) >= 28;

  const base = [
    { d: 'Day 1', items: [
      '填寫今日飲食/睡眠日誌',
      lowAct ? '快走 15 分（含暖身）' : '快走 20 分（含暖身）',
      '寢前 1 小時不看手機，調暗室內燈光',
    ] },
    { d: 'Day 2', items: [
      '白開水 ≥ 1500ml',
      '5 分鐘 4-7-8 深呼吸（早晨 + 睡前）',
      '無糖飲料日',
    ] },
    { d: 'Day 3', items: [
      '全穀主食 ≥ 1 餐（糙米／燕麥／全麥麵包）',
      '抗阻訓練 15 分（自重：深蹲／伏地挺身／橋式）',
      '11 點前上床',
    ] },
    { d: 'Day 4', items: [
      '蔬菜 ≥ 300g（雙拳份量）',
      lowAct ? '快走 25 分' : '中等強度運動 30 分',
      '寫下 1 件感謝的小事',
    ] },
    { d: 'Day 5', items: [
      '魚或豆類取代紅肉',
      '正念散步 10 分（不看手機）',
      '無酒日 1（替換為氣泡水）',
    ] },
    { d: 'Day 6', items: [
      '週中回顧：體重 / 步數 / 睡眠時數',
      '中等到劇烈強度運動 30 分（爬山／游泳／騎車）',
      '與家人/朋友散步 20 分',
    ] },
    { d: 'Day 7', items: [
      '做 1 餐自己烹調（多蔬菜、少油）',
      '伸展或瑜伽 15 分',
      '寢前冥想 5 分，整理下週計劃',
    ] },
  ];

  // 依重點微調
  if (isHeavy) base[0].items.push('體重秤重（同一時段、晨起空腹）');
  if (s.audit?.cAtRisk) base[1].items.push('開始飲酒紀錄表');
  if ((s.psqi?.total || 0) > 5) base[2].items.push('臥室溫度調整至 18–22°C');
  return base;
}

/* ============================================================
 * 7. 各領域處方
 * ============================================================ */

/* ---------- 飲食 ---------- */
function buildDietRx(s, a, d, intensity) {
  const arr = [
    '採用「我的餐盤」原則：1/2 蔬菜＋1/4 蛋白質（魚／豆／瘦肉）＋1/4 全穀',
    '主食至少 1/3 替換為全穀（糙米、燕麥、全麥麵包）',
    '每週 ≥2 次魚類；植物性蛋白（豆製品、堅果）每天有',
    '飲料：白開水 1500–1700ml；含糖飲料、酒精飲料盡量避免',
    '鹽 < 5g/日，添加糖 < 25g/日（WHO 建議）',
    '進食順序：先蔬菜湯/水 → 蛋白質 → 主食，有助控制血糖與飽足',
  ];
  if ((a.bmi || 0) >= 24)
    arr.push('總熱量稍微下調（每日 -300 至 -500 kcal），優先減精緻碳水與含糖飲料');
  if ((+d.sbp >= 130) || (d.hx_htn === '是'))
    arr.push('採 DASH 方向：高鉀蔬果（深色蔬菜、香蕉）、低鈉、堅果、低脂奶製品');
  if ((+d.fpg >= 5.6) || (d.hx_dm === '是'))
    arr.push('低升糖飲食：減少白米白麵；用全穀、豆類、蔬菜替換 1/3 主食');
  if ((d.hx_lipid === '是') || (+d.ldl >= 3.4))
    arr.push('減飽和脂肪、反式脂肪：避免油炸、加工肉；增 ω-3（鯖魚、鮭魚、亞麻籽）');
  if (d.hx_fattyliver === '是')
    arr.push('脂肪肝者：戒含糖飲料與酒精；採地中海飲食方向，配合每週 -0.5kg 減重');
  if (d.willing_eatout === '是')
    arr.push('外食技巧：先點蔬菜湯、要求少油少鹽、主食減 1/3、避免醬料淋');
  if (d.willing_cook === '否')
    arr.push('準備技巧：採購即食蔬菜包、冷凍蔬菜、蒸蛋、即食雞胸肉，降低做飯成本');
  if (d.willing_lowcost === '是')
    arr.push('低成本選擇：當季蔬菜、雞蛋、豆腐、糙米、冷凍鯖魚（單價低、營養密度高）');
  if (d.willing_diet === '是')
    arr.push('有飲食禁忌：請依個人禁忌調整本表，必要時諮詢營養師獲得個人化方案');
  if (d.willing_family === '是')
    arr.push('家人共同參與：採購、備餐、用餐一起，建立家庭健康飲食氛圍');
  return arr;
}

/* ---------- 運動 ---------- */
function buildExerciseRx(s, a, d, intensity) {
  const cat = s.ipaq?.category || 'low';
  const targetMin = intensity === '溫和' ? 90 : intensity === '積極' ? 200 : 150;
  const arr = [
    `本期目標：每週中等強度有氧 ${targetMin} 分鐘（拆 4–5 次完成）`,
    '抗阻力訓練：每週 2 次，覆蓋上下肢與軀幹（自重深蹲／伏地挺身／彈力帶）',
    '柔韌：每天動態伸展 5 分鐘；每週 1 次瑜伽或長伸展 20 分鐘',
    '訓練升級原則：時間先延長 → 強度再提升 → 最後加頻率',
    '若體能很低：先從每天累計 6000 步開始，2 週後再加抗阻',
    '熱身 5–10 分鐘 + 主項 + 緩和 5 分鐘，避免突發運動傷害',
  ];
  if (d.willing_limit === '是')
    arr.push('有運動限制者：以游泳、橢圓機、室內單車、水中運動為主，避免高衝擊跳躍');
  if ((a.bmi || 0) >= 28)
    arr.push('肥胖期優先「低衝擊有氧 + 抗阻」，避免長距離跑步傷膝');
  if ((+d.sbp >= 140) || (d.hx_htn === '是'))
    arr.push('高血壓者：避免暴力屏氣負重（瓦氏動作）；以中等強度有氧為主');
  if (d.hx_cvd === '是')
    arr.push('有心血管疾病史：執行任何運動處方前，先與主治醫師討論運動禁忌');
  if ((s.stopbang?.total || 0) >= 3)
    arr.push('OSA 風險者：減重 5–10% 對改善打鼾與夜間血氧顯著');
  if (cat === 'low')
    arr.push('啟動策略：用「2 分鐘規則」——只承諾運動 2 分鐘，多半會自動延長');
  if (d.willing_lowcost === '是')
    arr.push('低成本方案：步行、自重訓練、爬樓梯、線上免費運動影片');
  return arr;
}

/* ---------- 睡眠 ---------- */
function buildSleepRx(s, d, intensity) {
  const arr = [
    '固定上床／起床時間（含週末，誤差 ≤30 分鐘）',
    '寢前 1 小時：弱光、無強光螢幕（手機調暗或開夜覽模式）',
    '寢前 6 小時禁咖啡因、3 小時禁進食、2 小時禁酒精',
    '臥室只用於睡眠：溫度 18–22°C、安靜、暗',
    '若 20 分鐘未入睡：起身到別處做平靜活動（讀紙本書），有睡意再回床',
    '每天日間光照 ≥30 分鐘（早晨更佳），有助穩定生理時鐘',
  ];
  if ((s.psqi?.c2 || 0) >= 2)
    arr.push('入睡困難：睡前 1 小時嘗試 4-7-8 呼吸、漸進式肌肉放鬆，或 10 分鐘正念');
  if ((s.psqi?.c3 || 0) >= 2)
    arr.push('睡眠時長不足：先延長就寢窗口 30 分鐘，起床時間優先固定');
  if ((s.psqi?.c4 || 0) >= 2)
    arr.push('睡眠效率低：實踐「睡眠限制」——僅在感到困倦時上床，建立床=睡的條件反射');
  if ((s.psqi?.c5 || 0) >= 2)
    arr.push('睡眠中斷多：檢查臥室環境（噪音、光線、溫度、寢具），減少夜間飲水');
  if ((s.psqi?.c6 || 0) >= 2)
    arr.push('助眠藥物使用較頻繁：建議與醫師重新評估必要性與替代方案');
  if ((s.psqi?.c7 || 0) >= 2)
    arr.push('日間嗜睡明顯：午間小睡 ≤20 分鐘；避免下午 3 點後攝取咖啡因');
  if ((s.stopbang?.total || 0) >= 3)
    arr.push('考慮側睡而非仰睡；若每日嗜睡明顯，建議睡眠專科評估多導睡眠監測 (PSG)');
  return arr;
}

/* ---------- 壓力 / 情緒 ---------- */
function buildStressRx(s, intensity) {
  const arr = [
    '每天 5 分鐘呼吸練習（4-7-8 或盒式呼吸 4-4-4-4）',
    '每週 1 次 30 分鐘自然接觸（公園、近郊、海邊）',
    '寫「3 件好事」日記：每晚寫下今天 3 件值得感謝的小事',
    '建立邊界：明確「能做什麼／不做什麼」，學會適度說「不」',
    '社交支持：每週至少 1 次與信任的人深度對話 30 分鐘以上',
    '螢幕排毒：每天設定 1 小時無社交媒體時間',
  ];
  if ((s.pss10?.total || 0) >= 27)
    arr.push('高壓力期：考慮短期專業心理諮詢（CBT 或正念為實證有效方法）');
  if ((s.who5?.pct ?? 100) < 50)
    arr.push('幸福感偏低：每天安排 1 件「為了快樂而做」的小活動（音樂、烹飪、創作）');
  if ((s.phq9?.total || 0) >= 10 || (s.gad7?.total || 0) >= 10)
    arr.push('PHQ-9 / GAD-7 達中度以上：建議盡快諮詢心理或精神科專業人員，CBT、運動、藥物可能均為選項');
  if (s.phq9?.safetyAlert)
    arr.push('⚠ PHQ-9 第 9 題有非零回答：請立即聯繫當地急救電話、危機熱線或可信任的人，並盡快尋求專業幫助。中國大陸 120／010-82951332｜香港 2389 2222｜台灣 1925。');
  return arr;
}

/* ---------- 久坐 ---------- */
function buildSedentaryRx(s, d, intensity) {
  const sit = s.ipaq?.sit || 0;
  const arr = [
    '每坐 50 分鐘起身活動 3 分鐘（喝水、伸展、走動）',
    '善用站立會議、電話會議站著進行',
    '通勤：能走就走、能爬樓梯就爬',
    '工作場所放置彈力帶／小啞鈴，碎片時間做 5–10 下',
    '看劇/開會時穿插「廣告時段微運動」：深蹲／提踵／伸展',
  ];
  if (sit >= 480)
    arr.push('每日久坐 ≥8 小時：強烈建議每小時必有 1 次站立或步行 ≥3 分鐘；可使用站立辦公桌');
  if (sit >= 600)
    arr.push('久坐極多：晚間額外加 1 次 20 分鐘步行作為「補償運動」');
  if (d.occupation === 'office')
    arr.push('辦公室策略：設置鬧鐘提醒、與同事走路會議、午餐後短走 10 分鐘');
  return arr;
}

/* ---------- 飲酒 / 吸菸 ---------- */
function buildSubstanceRx(s, d) {
  const arr = [];
  const cAtRisk = s.audit?.cAtRisk;
  const auditFull = s.audit?.auditFull;

  // 飲酒
  if (cAtRisk) {
    arr.push('飲酒：本週起設定「每週 ≥2 個無酒日」，逐步減量');
    arr.push('紀錄每天飲酒份數，目標男 ≤2 份/日、女 ≤1 份/日，並控制週總量');
    arr.push('替代策略：聚會選氣泡水或無酒精飲料；避免在情緒低落時飲酒');
    if ((auditFull || 0) >= 16)
      arr.push('AUDIT 達到有害飲酒以上：建議至成癮或精神科諮詢，必要時可考慮藥物與心理治療');
  } else {
    arr.push('飲酒：維持低風險飲酒模式，注意「無酒日」常態化（每週 ≥2 天）');
  }

  // 吸菸
  if (d.hx_smoke === '是' || d.smoke === '是') {
    arr.push('吸菸：戒菸是目前獲益最高的單一行為改變。可採 5A 模式（Ask, Advise, Assess, Assist, Arrange）');
    arr.push('設定「戒菸日」：選一個低壓力日，提前清理菸具、告知親友尋求支持');
    arr.push('善用尼古丁替代療法 (NRT)、戒菸專線（台灣 0800-636363；香港 1833 183；中國大陸 400-888-5531）');
    arr.push('避免高風險場景（飲酒、聚會、情緒低落）；建立「以行為替代行為」策略：喝水、嚼無糖口香糖、深呼吸');
  } else {
    arr.push('吸菸：保持不吸菸狀態；主動避免二手菸與三手菸暴露');
  }
  return arr;
}

/* ---------- OSA ---------- */
function buildOsaRx(s) {
  const sb = s.stopbang?.total || 0;
  if (sb < 3) return null;
  const arr = [
    'STOP-Bang 提示存在 OSA 風險：屬於「篩查」結果，**不等於診斷**',
    '減重 5–10%、戒酒戒菸、避免鎮靜安眠藥可顯著改善打鼾與夜間缺氧',
    '優先側睡；可使用網球縫於睡衣後背防止仰睡',
    '減少寢前重餐、酒精；睡前避免使用鎮靜類藥物（除非醫師處方）',
    '若伴有日間嗜睡明顯、晨起頭痛、目擊呼吸暫停：建議至睡眠專科進行多導睡眠監測 (PSG)',
  ];
  if (sb >= 5) arr.push('STOP-Bang ≥ 5（高風險）：強烈建議盡快至睡眠醫學門診評估，可能需要 CPAP 等治療');
  return arr;
}

/* ---------- 追蹤指標 ---------- */
function buildTracking(a, s) {
  const arr = [
    '每週測量：體重、腰圍（同一時間，最好早晨空腹）',
    '每天記錄：步數、就寢/起床時間、情緒分（1–10）',
    '每 4 週：重做 PHQ-2、PHQ-9 或 GAD-7（簡測）',
    '每 3 個月：血壓、空腹血糖（如有條件）',
    '每 6–12 個月：血脂、HbA1c（依醫師建議）',
  ];
  if ((a.bmi || 0) >= 24)
    arr.push('體重每週減 0.3–0.5 kg 為合理速率；避免一週減 >1 kg 的快速減重');
  if ((s.psqi?.total || 0) > 5)
    arr.push('睡眠：每週填寫一次主觀睡眠 1–10 分；2 週後評估是否需要建立詳細睡眠日誌');
  if ((s.audit?.auditC || 0) > 0)
    arr.push('飲酒：每週統計總份數與「無酒日」數量');
  if ((s.stopbang?.total || 0) >= 3)
    arr.push('OSA 風險：紀錄打鼾頻率、晨起精神、白日嗜睡程度（Epworth 嗜睡量表可作參考）');
  return arr;
}

/* ---------- 何時就醫 ---------- */
function buildReferral(s, a, d) {
  const arr = [
    '出現胸痛、呼吸困難、暈厥、肢體無力、面部不對稱、口齒不清 → **立即就醫或撥打急救電話**',
    '血壓持續 ≥140/90 mmHg（多次測量）→ 諮詢內科或心血管專科',
    '空腹血糖 ≥7 mmol/L 或 HbA1c ≥6.5%（多次）→ 諮詢內分泌或家醫科',
    '本處方執行 4–8 週後關鍵指標仍無改善，或出現新症狀 → 諮詢專業人員',
  ];
  if (s.phq9?.safetyAlert)
    arr.push('⚠ PHQ-9 Q9 ≥1（自傷意念）→ **立即聯繫當地急救電話、危機熱線或可信任的人**');
  if ((s.phq9?.total || 0) >= 10 || (s.gad7?.total || 0) >= 10)
    arr.push('PHQ-9 ≥10 或 GAD-7 ≥10（中度以上）→ 諮詢心理或精神科專業人員');
  if ((s.audit?.auditFull || 0) >= 16)
    arr.push('AUDIT ≥16（有害飲酒以上）→ 諮詢成癮或精神科');
  if ((s.stopbang?.total || 0) >= 5)
    arr.push('STOP-Bang ≥5（OSA 高風險）→ 諮詢睡眠醫學門診');
  if (d.hx_renal === '是' || d.hx_cvd === '是')
    arr.push('有腎臟或心血管疾病史 → 任何處方執行前先與主治醫師討論');
  if (d.sx_recent === '是')
    arr.push('近 1 個月有明顯不適（胸痛、頭暈、嚴重失眠等）→ 安排門診評估');
  if (d.age && +d.age >= 40 && (a.bmi || 0) >= 24)
    arr.push('40 歲以上 + 超重/肥胖：建議完整成人健檢，含心血管、代謝、癌症篩查');
  return arr;
}

/* ============================================================
 * 8. DOM 渲染
 * ============================================================ */

function renderRx(rx) {
  const $ = id => document.getElementById(id);

  // ① 主要關注點
  $('rxConcerns').innerHTML = rx.concerns.length
    ? rx.concerns.map(c => `<li><strong>${c.tag}</strong> · 領域：${c.area}</li>`).join('')
    : '<li>未識別主要關注點。</li>';

  // ② 優先順序
  $('rxPriority').innerHTML = rx.priority.length
    ? rx.priority.map(p => `<li>${p}</li>`).join('')
    : '<li>未產生優先順序。</li>';

  // ③ 4 週處方
  $('rxWeeks').innerHTML = rx.weeks.map(w =>
    `<div class="week-cell">
       <h4>${w.week} · ${w.title}</h4>
       <p>${escapeHtml(w.body).replace(/\n/g, '<br>')}</p>
     </div>`
  ).join('');

  // ④ 7 天行動清單
  $('rxDays').innerHTML = rx.days.map(d =>
    `<div class="day-cell">
       <h5>${d.d}</h5>
       ${d.items.map(x => `• ${escapeHtml(x)}`).join('<br>')}
     </div>`
  ).join('');

  // ⑤–⑩ 各領域處方
  $('rxDiet').innerHTML      = rx.diet.map(x => `<li>${x}</li>`).join('');
  $('rxExercise').innerHTML  = rx.exercise.map(x => `<li>${x}</li>`).join('');
  $('rxSleep').innerHTML     = rx.sleep.map(x => `<li>${x}</li>`).join('');
  $('rxStress').innerHTML    = rx.stress.map(x => `<li>${x}</li>`).join('');
  $('rxSedentary').innerHTML = rx.sedentary.map(x => `<li>${x}</li>`).join('');
  $('rxSubstance').innerHTML = rx.substance.map(x => `<li>${x}</li>`).join('');

  // ⑪ OSA（風險低時隱藏）
  if (rx.osa) {
    $('rxOsaCard').style.display = 'block';
    $('rxOsa').innerHTML = rx.osa.map(x => `<li>${x}</li>`).join('');
  } else {
    $('rxOsaCard').style.display = 'none';
  }

  // ⑫ 追蹤
  $('rxTracking').innerHTML = rx.tracking.map(x => `<li>${x}</li>`).join('');

  // ⑬ 何時諮詢
  $('rxRefer').innerHTML = rx.refer.map(x => `<li>${x}</li>`).join('');

  $('rxOutput').style.display = 'block';
  $('rxOutput').scrollIntoView({ behavior: 'smooth' });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ============================================================
 * 9. Markdown 報告
 * ============================================================ */

function buildMarkdown(rx, report) {
  const date = new Date().toLocaleString('zh-Hant');
  const r = report || {};
  const a = r.anthro || {};
  const s = r.scales || {};
  const list = arr => arr.map(x => `- ${x}`).join('\n');

  let md = `# 標準健康處方
> 生成時間：${date}
> 工具：Hughie Lab Standard Health Prescription
> 方案強度：**${rx.intensity}**

---

## 評估摘要
- BMI：${a.bmi ?? '--'}（${a.bmiTag || '--'}）　WHtR：${a.whtr ?? '--'}（${a.whtrTag || '--'}）
- IPAQ：${s.ipaq?.category || '--'}　久坐：${s.ipaq?.sit ?? '--'} 分/日
- WHO-5：${s.who5?.pct ?? '--'} / 100
- PHQ-9：${s.phq9?.total ?? '--'} / 27　GAD-7：${s.gad7?.total ?? '--'} / 21
- PSQI：${s.psqi?.total ?? '--'} / 21　PSS-10：${s.pss10?.total ?? '--'} / 40
- AUDIT-C：${s.audit?.auditC ?? '--'} / 12${s.audit?.auditFull != null ? `　·　AUDIT 全題：${s.audit.auditFull}` : ''}
- STOP-Bang：${s.stopbang?.total ?? '--'} / 8

## ① 主要健康關注點
${rx.concerns.length ? rx.concerns.map(c => `- **${c.tag}**（${c.area}）`).join('\n') : '- 未識別主要關注點'}

## ② 優先改善順序
${rx.priority.map((p, i) => `${i + 1}. ${p}`).join('\n')}

## ③ 4 週生活方式處方
${rx.weeks.map(w => `### ${w.week} · ${w.title}\n${w.body}`).join('\n\n')}

## ④ 第 1 週 · 7 天具體行動清單
${rx.days.map(d => `**${d.d}**\n${d.items.map(x => `- ${x}`).join('\n')}`).join('\n\n')}

## ⑤ 飲食改善處方
${list(rx.diet)}

## ⑥ 運動改善處方
${list(rx.exercise)}

## ⑦ 睡眠改善處方
${list(rx.sleep)}

## ⑧ 壓力與情緒管理處方
${list(rx.stress)}

## ⑨ 久坐改善處方
${list(rx.sedentary)}

## ⑩ 飲酒 / 吸菸風險改善建議
${list(rx.substance)}
`;

  if (rx.osa) {
    md += `
## ⑪ 睡眠呼吸暫停風險提示
${list(rx.osa)}
`;
  }

  md += `
## ⑫ 建議追蹤指標
${list(rx.tracking)}

## ⑬ 何時需要諮詢專業人員
${list(rx.refer)}

---

### 安全與合規聲明
- 本工具僅供教學、研究訓練、健康教育與自我管理參考，**不構成醫療診斷、治療建議或用藥建議**。
- 如有不適、指標異常、慢性疾病、孕期、術後恢復期，或正在接受治療，請諮詢合格醫療專業人員。
- PHQ-9、GAD-7 僅供症狀篩查，**不構成心理疾病診斷**。如近期情緒困擾明顯、影響生活，或出現傷害自己/他人的想法，請立即聯繫當地急救電話、危機熱線或可信任的人。
- PSQI、PSS-10、STOP-Bang 等量表的版權與授權歸原作者／機構所有，使用者應自行確認其使用情境符合原量表授權、引用與版權要求，**不得擅自修改標準題項與計分規則**。
`;
  return md;
}

/* ============================================================
 * 10. 工具列：複製 / 下載 / 保存 / 清空
 * ============================================================ */

document.getElementById('btnCopy').addEventListener('click', async () => {
  if (!_rxText) return showToast('尚未生成處方');
  try {
    await navigator.clipboard.writeText(_rxText);
    showToast('✓ 已複製到剪貼簿');
  } catch (e) {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = _rxText;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast('✓ 已複製'); }
    catch (_) { showToast('複製失敗，請手動選取'); }
    ta.remove();
  }
});

document.getElementById('btnDownloadMd').addEventListener('click', () => {
  if (!_rxText) return showToast('尚未生成處方');
  download(`health-prescription-${Date.now()}.md`, _rxText, 'text/markdown;charset=utf-8');
});

document.getElementById('btnSave').addEventListener('click', () => {
  if (!_rx) return showToast('尚未生成處方');
  const payload = {
    meta: { savedAt: new Date().toISOString() },
    sourceMeta: _report?.meta || null,
    rx: _rx,
    markdown: _rxText,
  };
  localStorage.setItem(RX_KEY, JSON.stringify(payload));
  showToast('✓ 已保存到本機 localStorage');
});

document.getElementById('btnClear').addEventListener('click', () => {
  if (!confirm('確定要清空當前處方並移除本機保存？')) return;
  localStorage.removeItem(RX_KEY);
  _report = null;
  _rx = null;
  _rxText = '';
  document.getElementById('rxOutput').style.display = 'none';
  document.getElementById('jsonInput').value = '';
  document.querySelectorAll('#m_age,#m_gender,#m_height,#m_weight,#m_waist,#m_sbp,#m_dbp,#m_fpg,#m_hba1c,#m_who5,#m_phq9,#m_gad7,#m_psqi,#m_pss10,#m_stopbang,#m_auditc,#m_sit')
    .forEach(el => el.value = '');
  document.getElementById('autoStatus').innerHTML = '已清空。';
  tryAutoLoad();
  showToast('已清空');
});

/* ============================================================
 * 11. Toast / 下載輔助
 * ============================================================ */

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

function download(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

/* ============================================================
 * 12. 啟動
 * ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  tryAutoLoad();

  // 若本機已保存過處方，提示用戶可恢復（同時保留可重新生成的能力）
  const saved = localStorage.getItem(RX_KEY);
  if (saved) {
    try {
      const p = JSON.parse(saved);
      if (p?.rx) {
        _rx = p.rx;
        _rxText = p.markdown || '';
        renderRx(_rx);
      }
    } catch (e) { /* ignore */ }
  }
});
