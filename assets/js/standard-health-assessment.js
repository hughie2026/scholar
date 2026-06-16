/* ============================================================
 * Standard Health Assessment · Hughie Lab
 * --------------------------------------------------------------
 * 量表來源與授權說明：
 *  - IPAQ-SF      : Craig et al. (2003). IPAQ Scoring Protocol v2.0
 *  - WHO-5        : WHO Regional Office for Europe (1998, version II)
 *  - PHQ-9        : Kroenke, Spitzer & Williams (2001)
 *  - GAD-7        : Spitzer, Kroenke, Williams & Löwe (2006)
 *  - AUDIT-C/AUDIT: Bush et al. (1998) / Saunders et al. (1993). WHO
 *  - PSQI         : Buysse et al. (1989). © University of Pittsburgh
 *  - PSS-10       : Cohen et al. (1983). © Sheldon Cohen
 *  - STOP-Bang    : Chung et al. (2008). © University of Toronto
 *
 * 本檔僅實作標準計分邏輯，未對題項或計分作任何修改。
 * 使用者必須自行確認其使用情境符合原量表授權、引用與版權要求。
 * ============================================================ */

const STORAGE_KEY = 'hughie_health_assessment_v1';
const TOTAL_STEPS = 12;
let currentStep = 1;

/* ============================================================
 * 1. 量表題庫定義
 * ============================================================ */

// 既往史 / 家族史
const HISTORY_ITEMS = [
  { key: 'hx_htn',        label: '是否曾被醫生告知有高血壓？' },
  { key: 'hx_dm',         label: '是否曾被醫生告知有糖尿病或糖尿病前期？' },
  { key: 'hx_lipid',      label: '是否曾被醫生告知有血脂異常？' },
  { key: 'hx_fattyliver', label: '是否有脂肪肝？' },
  { key: 'hx_cvd',        label: '是否有心血管疾病史（心梗、心絞痛、中風等）？' },
  { key: 'hx_renal',      label: '是否有腎臟疾病？' },
  { key: 'hx_osa',        label: '是否有睡眠呼吸暫停或嚴重打鼾？' },
  { key: 'hx_meds',       label: '是否正在服用長期藥物？' },
  { key: 'fhx_cardio',    label: '一級親屬是否有高血壓、糖尿病或早發心血管疾病？' },
  { key: 'sx_recent',     label: '最近 1 個月是否有明顯不適（胸痛、頭暈、嚴重失眠等）？' },
];

// WHO-5 (0–5 分制)
const WHO5_ITEMS = [
  '我感到開心，心情愉快',
  '我感到平靜，輕鬆放鬆',
  '我感到精力充沛，活力旺盛',
  '我醒來時感到精神舒暢，得到良好休息',
  '我的日常生活充滿了讓我感興趣的事物',
];
const WHO5_OPTIONS = [
  { v: 5, t: '所有時間' },
  { v: 4, t: '大部分時間' },
  { v: 3, t: '一半以上時間' },
  { v: 2, t: '一半以下時間' },
  { v: 1, t: '少部分時間' },
  { v: 0, t: '從未' },
];

// PHQ-9
const PHQ9_ITEMS = [
  '做事時提不起勁或沒有興趣',
  '感到心情低落、沮喪或絕望',
  '入睡困難、睡不安穩或睡眠過多',
  '感覺疲倦或沒有活力',
  '食慾不振或吃太多',
  '覺得自己很糟，或覺得自己是個失敗者，或讓家人失望',
  '對事物專注有困難，例如閱讀報紙或看電視時',
  '行動或說話速度緩慢到別人察覺，或正好相反——煩躁不安到無法靜下來',
  '想到死亡或傷害自己，或認為自己活著不如死了好',
];
// GAD-7
const GAD7_ITEMS = [
  '感覺緊張、焦慮或煩躁',
  '無法停止或控制擔心',
  '對各種各樣的事情擔心過多',
  '難以放鬆',
  '坐立不安，難以保持平靜',
  '容易煩惱或易怒',
  '害怕將會有可怕的事情發生',
];
const PHQ_GAD_OPTIONS = [
  { v: 0, t: '完全不會' },
  { v: 1, t: '幾天' },
  { v: 2, t: '超過一半天數' },
  { v: 3, t: '幾乎每天' },
];

// AUDIT-C (前 3 題) + AUDIT 全 10 題
const AUDIT_ITEMS = [
  { q: '1. 你多久喝一次含酒精飲料？', opts: ['從不','每月一次或更少','每月 2–4 次','每週 2–3 次','每週 4 次或以上'] },
  { q: '2. 在你飲酒的日子，你通常喝幾份標準飲？', opts: ['1–2 份','3–4 份','5–6 份','7–9 份','10 份或更多'] },
  { q: '3. 你多久一次在一個場合喝 6 份或以上？', opts: ['從不','每月不到一次','每月一次','每週一次','幾乎每天'] },
  { q: '4. 過去一年，你發現一旦開始喝酒就無法停止的頻率？', opts: ['從不','每月不到一次','每月一次','每週一次','幾乎每天'] },
  { q: '5. 過去一年，因飲酒而無法做你應做之事的頻率？', opts: ['從不','每月不到一次','每月一次','每週一次','幾乎每天'] },
  { q: '6. 過去一年，需要在早晨喝酒以提神或解宿醉的頻率？', opts: ['從不','每月不到一次','每月一次','每週一次','幾乎每天'] },
  { q: '7. 過去一年，因飲酒感到內疚或自責的頻率？', opts: ['從不','每月不到一次','每月一次','每週一次','幾乎每天'] },
  { q: '8. 過去一年，因飲酒而無法回憶前一晚事件的頻率？', opts: ['從不','每月不到一次','每月一次','每週一次','幾乎每天'] },
  { q: '9. 你或他人是否曾因你飲酒而受傷？', opts: ['沒有','','過去一年內沒發生','','過去一年內發生過'], scoreMap: [0,0,2,0,4] },
  { q: '10. 親友、醫師或他人是否曾關切你的飲酒情況或建議你減量？', opts: ['沒有','','過去一年內沒發生','','過去一年內發生過'], scoreMap: [0,0,2,0,4] },
];

// PSQI 第 5 題子項 (b–j)
const PSQI5_ITEMS = [
  '無法在 30 分鐘內入睡',
  '夜間或清晨醒來',
  '需起床上廁所',
  '呼吸不順暢',
  '咳嗽或大聲打鼾',
  '感覺太冷',
  '感覺太熱',
  '做惡夢',
  '感覺疼痛',
];

// PSS-10  (4,5,7,8 反向計分)
const PSS10_ITEMS = [
  { q: '1. 因為某些意外事件而困擾',                               reverse: false },
  { q: '2. 覺得無法控制生活中重要的事情',                           reverse: false },
  { q: '3. 感到緊張和有壓力',                                     reverse: false },
  { q: '4. 對自己處理個人問題的能力感到有信心',                     reverse: true  },
  { q: '5. 覺得事情按照自己希望的方向發展',                         reverse: true  },
  { q: '6. 發現無法應付所有必須完成的事情',                         reverse: false },
  { q: '7. 能夠控制生活中令人煩惱的事情',                           reverse: true  },
  { q: '8. 感到自己掌控了局面',                                   reverse: true  },
  { q: '9. 因為超出自己掌控的事情而生氣',                           reverse: false },
  { q: '10. 覺得困難愈積愈多，無法克服',                            reverse: false },
];
const PSS_OPTIONS = [
  { v: 0, t: '從未' }, { v: 1, t: '幾乎沒有' }, { v: 2, t: '有時' },
  { v: 3, t: '時常' }, { v: 4, t: '經常' },
];

// STOP-Bang
const STOPBANG_ITEMS = [
  { key: 'sb_snore', q: 'S - 你打鼾很大聲嗎（隔壁房間都聽得到）？' },
  { key: 'sb_tired', q: 'T - 你白天經常感到疲倦、嗜睡？' },
  { key: 'sb_obs',   q: 'O - 是否曾有人觀察到你睡眠時呼吸暫停？' },
  { key: 'sb_bp',    q: 'P - 你被告知或正在治療高血壓？' },
  { key: 'sb_bmi',   q: 'B - BMI 是否 > 35 kg/m²？' },
  { key: 'sb_age',   q: 'A - 年齡是否 > 50 歲？' },
  { key: 'sb_neck',  q: 'N - 頸圍是否 > 40 cm？' },
  { key: 'sb_male',  q: 'G - 性別為男性？' },
];

/* ============================================================
 * 2. DOM 動態渲染
 * ============================================================ */

function radioRow(name, options, required = true) {
  return `<div class="radio-row" data-name="${name}">` + options.map(o =>
    `<label class="radio-btn"><input type="radio" name="${name}" value="${o.v}" ${required?'required':''}><span>${o.t}</span></label>`
  ).join('') + `</div>`;
}

function yesNoRow(name) {
  return `<div class="radio-row">
    <label class="radio-btn"><input type="radio" name="${name}" value="是" required><span>是</span></label>
    <label class="radio-btn"><input type="radio" name="${name}" value="否"><span>否</span></label>
    <label class="radio-btn"><input type="radio" name="${name}" value="不確定"><span>不確定</span></label>
  </div>`;
}

function renderHistory() {
  document.getElementById('historyBox').innerHTML = HISTORY_ITEMS.map(it =>
    `<div class="field"><label>${it.label}</label>${yesNoRow(it.key)}</div>`
  ).join('');
}

function renderLikertGroup(boxId, items, optsTpl, namePrefix) {
  const box = document.getElementById(boxId);
  box.style.setProperty('--cols', optsTpl.length);
  box.innerHTML = items.map((q, i) => {
    const text = (typeof q === 'string') ? q : q.q;
    return `<div class="likert-q">
      <div class="q-label">${i+1}. ${text}</div>
      ${radioRow(`${namePrefix}_${i+1}`, optsTpl)}
    </div>`;
  }).join('');
}

function renderAudit() {
  // AUDIT-C : 前 3 題
  const cBox = document.getElementById('auditCBox');
  cBox.innerHTML = AUDIT_ITEMS.slice(0, 3).map((it, i) => {
    const opts = it.opts.map((t, idx) => ({ v: idx, t }));
    return `<div class="likert-q"><div class="q-label">${it.q}</div>${radioRow(`audit_${i+1}`, opts)}</div>`;
  }).join('');
  // AUDIT 全題
  const fullBox = document.getElementById('auditFullBox');
  fullBox.innerHTML = AUDIT_ITEMS.slice(3).map((it, i) => {
    const opts = (it.scoreMap)
      ? it.opts.map((t, idx) => ({ v: idx, t })).filter(o => o.t !== '')
      : it.opts.map((t, idx) => ({ v: idx, t }));
    return `<div class="likert-q"><div class="q-label">${it.q}</div>${radioRow(`audit_${i+4}`, opts, false)}</div>`;
  }).join('');
}

function renderPsqi5() {
  const box = document.getElementById('psqi5Box');
  const opts = [{v:0,t:'從未'},{v:1,t:'每週<1次'},{v:2,t:'每週1–2次'},{v:3,t:'每週≥3次'}];
  box.innerHTML = PSQI5_ITEMS.map((q, i) =>
    `<div class="likert-q"><div class="q-label">${'5' + String.fromCharCode(98+i)}. ${q}</div>${radioRow(`psqi5_${i+1}`, opts)}</div>`
  ).join('');
}

function renderStopBang() {
  document.getElementById('stopBangBox').innerHTML = STOPBANG_ITEMS.map(it =>
    `<div class="field"><label>${it.q}</label>
      <div class="radio-row">
        <label class="radio-btn"><input type="radio" name="${it.key}" value="1" required><span>是 (Yes)</span></label>
        <label class="radio-btn"><input type="radio" name="${it.key}" value="0"><span>否 (No)</span></label>
      </div></div>`
  ).join('');
}

/* ============================================================
 * 3. 步驟導航
 * ============================================================ */

function goStep(n) {
  if (n < 1 || n > TOTAL_STEPS) return;
  if (n > currentStep && !validateStep(currentStep)) return;
  document.querySelectorAll('.form-step').forEach(el => el.classList.remove('active'));
  const next = document.querySelector(`.form-step[data-step="${n}"]`);
  next.classList.add('active');
  currentStep = n;
  updateProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProgress() {
  document.getElementById('progressFill').style.width = (currentStep / TOTAL_STEPS * 100) + '%';
  document.getElementById('stepCurrent').textContent = currentStep;
  document.getElementById('stepTotal').textContent = TOTAL_STEPS;
  const t = document.querySelector(`.form-step[data-step="${currentStep}"]`).dataset.title;
  document.getElementById('stepLabel').innerHTML = `<b>STEP ${String(currentStep).padStart(2,'0')}</b> · ${t}`;
  document.getElementById('prevBtn').disabled = currentStep === 1;
  document.getElementById('nextBtn').style.display = currentStep === TOTAL_STEPS ? 'none' : '';
  document.getElementById('submitBtn').style.display = currentStep === TOTAL_STEPS ? '' : 'none';
}

function validateStep(step) {
  // 對非必填模組（部分量表）採取寬鬆驗證；必填欄位由 HTML required 把關
  const stepEl = document.querySelector(`.form-step[data-step="${step}"]`);
  const inputs = stepEl.querySelectorAll('input[required], select[required]');
  for (const input of inputs) {
    if (input.type === 'radio') {
      if (!stepEl.querySelector(`input[name="${input.name}"]:checked`)) {
        showToast('請完成本步驟的必填項目');
        input.focus();
        return false;
      }
    } else if (!input.value) {
      showToast('請完成本步驟的必填項目');
      input.focus();
      return false;
    }
  }
  return true;
}

/* ============================================================
 * 4. 表單收集
 * ============================================================ */

function collectFormData() {
  const fd = new FormData(document.getElementById('assessmentForm'));
  const data = {};
  for (const [k, v] of fd.entries()) {
    if (k === 'goals') {
      data.goals = data.goals || []; data.goals.push(v);
    } else {
      data[k] = v;
    }
  }
  // checkbox not in fd if unchecked: ensure goals at least empty
  data.goals = data.goals || [];
  data.auditFull = document.getElementById('auditFullToggle').checked;
  return data;
}

/* ============================================================
 * 5. 計分函式
 * ============================================================ */

// 5.1 體格指標
function calcAnthro(d) {
  const h = parseFloat(d.height), w = parseFloat(d.weight);
  const waist = parseFloat(d.waist), hip = parseFloat(d.hip);
  const out = {};
  if (h > 0 && w > 0) out.bmi = +(w / Math.pow(h/100, 2)).toFixed(1);
  if (waist && h > 0) out.whtr = +(waist / h).toFixed(2);
  if (waist && hip)  out.whr  = +(waist / hip).toFixed(2);
  // BMI 分級 (WHO Asia-Pacific)
  if (out.bmi != null) {
    out.bmiTag = out.bmi < 18.5 ? '體重過低'
              : out.bmi < 24    ? '正常'
              : out.bmi < 28    ? '超重' : '肥胖';
  }
  // WHtR 風險：> 0.5 中心型肥胖
  if (out.whtr != null) out.whtrTag = out.whtr >= 0.5 ? '中心型肥胖風險' : '正常';
  if (out.whr != null) {
    const m = d.gender === 'male';
    out.whrTag = (m && out.whr >= 0.9) || (!m && out.whr >= 0.85) ? '中心型肥胖' : '正常';
  }
  return out;
}

// 5.2 心血管代謝指標提示
function calcCardiometabolic(d) {
  const list = [];
  const sbp = +d.sbp, dbp = +d.dbp;
  if (sbp || dbp) {
    if (sbp >= 140 || dbp >= 90)      list.push({k:'血壓', v:`${sbp||'-'}/${dbp||'-'} mmHg`, tag:'高', note:'達高血壓診斷標準範圍'});
    else if (sbp >= 130 || dbp >= 85) list.push({k:'血壓', v:`${sbp}/${dbp} mmHg`, tag:'中', note:'血壓偏高'});
    else                              list.push({k:'血壓', v:`${sbp||'-'}/${dbp||'-'} mmHg`, tag:'低', note:'正常範圍'});
  }
  const fpg = +d.fpg;
  if (fpg) {
    if (fpg >= 7)         list.push({k:'空腹血糖', v:`${fpg} mmol/L`, tag:'高', note:'達糖尿病診斷範圍'});
    else if (fpg >= 6.1)  list.push({k:'空腹血糖', v:`${fpg} mmol/L`, tag:'中', note:'空腹血糖受損'});
    else                  list.push({k:'空腹血糖', v:`${fpg} mmol/L`, tag:'低', note:'正常範圍'});
  }
  const a1c = +d.hba1c;
  if (a1c) {
    if (a1c >= 6.5)      list.push({k:'HbA1c', v:`${a1c}%`, tag:'高', note:'達糖尿病診斷範圍'});
    else if (a1c >= 5.7) list.push({k:'HbA1c', v:`${a1c}%`, tag:'中', note:'糖尿病前期'});
    else                 list.push({k:'HbA1c', v:`${a1c}%`, tag:'低', note:'正常範圍'});
  }
  const ldl = +d.ldl, tg = +d.tg, hdl = +d.hdl, tc = +d.tc;
  if (ldl) list.push({k:'LDL-C', v:`${ldl} mmol/L`, tag: ldl>=4.1?'高':ldl>=3.4?'中':'低', note: ldl>=3.4?'偏高':'正常範圍'});
  if (tg)  list.push({k:'TG',    v:`${tg} mmol/L`,  tag: tg>=2.3?'高':tg>=1.7?'中':'低',   note: tg>=1.7?'偏高':'正常範圍'});
  if (hdl) {
    const m = d.gender === 'male';
    const low = (m && hdl<1.0) || (!m && hdl<1.3);
    list.push({k:'HDL-C', v:`${hdl} mmol/L`, tag: low?'高':'低', note: low?'偏低（保護不足）':'良好'});
  }
  if (tc)  list.push({k:'總膽固醇', v:`${tc} mmol/L`, tag: tc>=6.2?'高':tc>=5.2?'中':'低', note: tc>=5.2?'偏高':'正常範圍'});
  return list;
}

// 5.3 IPAQ-SF
function scoreIPAQ(d) {
  const vd = +d.ipaq_vig_days||0,  vm = +d.ipaq_vig_min ||0;
  const md = +d.ipaq_mod_days||0,  mm = +d.ipaq_mod_min ||0;
  const wd = +d.ipaq_walk_days||0, wm = +d.ipaq_walk_min||0;
  const sit = +d.ipaq_sit_min||0;
  // METs: walking 3.3, mod 4.0, vig 8.0 (cap each at 180 min/day per protocol; we only cap 3h)
  const cap = m => Math.min(m, 180);
  const walkMET = 3.3 * cap(wm) * wd;
  const modMET  = 4.0 * cap(mm) * md;
  const vigMET  = 8.0 * cap(vm) * vd;
  const total   = walkMET + modMET + vigMET;
  const totalDays = vd + md + wd;
  let cat = 'low';
  if (vd >= 3 && vigMET >= 1500) cat = 'high';
  else if (totalDays >= 7 && total >= 3000) cat = 'high';
  else if (vd >= 3 && (vm >= 20)) cat = 'moderate';
  else if ((md + wd) >= 5 && (mm >= 30 || wm >= 30)) cat = 'moderate';
  else if (totalDays >= 5 && total >= 600) cat = 'moderate';
  return { walkMET: Math.round(walkMET), modMET: Math.round(modMET), vigMET: Math.round(vigMET),
           total: Math.round(total), category: cat, sit };
}

// 5.4 WHO-5
function scoreWHO5(d) {
  let raw = 0;
  for (let i = 1; i <= 5; i++) raw += +(d[`who5_${i}`] || 0);
  const pct = raw * 4;
  return { raw, pct, tag: pct < 50 ? '幸福感偏低，建議關注' : '幸福感良好' };
}

// 5.5 PHQ-9
function scorePHQ9(d) {
  let total = 0;
  for (let i = 1; i <= 9; i++) total += +(d[`phq9_${i}`] || 0);
  const q9 = +(d.phq9_9 || 0);
  let tag;
  if (total <= 4) tag = '無明顯症狀';
  else if (total <= 9) tag = '輕度抑鬱症狀';
  else if (total <= 14) tag = '中度抑鬱症狀';
  else if (total <= 19) tag = '中重度抑鬱症狀';
  else tag = '重度抑鬱症狀';
  return { total, q9, tag, safetyAlert: q9 > 0 };
}

// 5.6 GAD-7
function scoreGAD7(d) {
  let total = 0;
  for (let i = 1; i <= 7; i++) total += +(d[`gad7_${i}`] || 0);
  let tag;
  if (total <= 4) tag = '無明顯焦慮';
  else if (total <= 9) tag = '輕度焦慮';
  else if (total <= 14) tag = '中度焦慮';
  else tag = '重度焦慮';
  return { total, tag };
}

// 5.7 AUDIT-C / AUDIT
function scoreAUDIT(d) {
  let auditC = 0;
  for (let i = 1; i <= 3; i++) auditC += +(d[`audit_${i}`] || 0);
  const isMale = d.gender === 'male';
  const cAtRisk = (isMale && auditC >= 4) || (!isMale && auditC >= 3);
  let auditFull = null, fullTag = null;
  if (d.auditFull) {
    let total = auditC;
    for (let i = 4; i <= 8; i++) total += +(d[`audit_${i}`] || 0);
    // Q9, Q10 use special map (0/2/4)
    const q9 = +(d.audit_9 || 0), q10 = +(d.audit_10 || 0);
    total += [0,0,2,0,4][q9] + [0,0,2,0,4][q10];
    if (total <= 7) fullTag = '低風險';
    else if (total <= 15) fullTag = '危害飲酒（hazardous）';
    else if (total <= 19) fullTag = '有害飲酒（harmful）';
    else fullTag = '可能依賴';
    auditFull = total;
  }
  return { auditC, cAtRisk, cTag: cAtRisk ? '飲酒風險升高' : '低風險', auditFull, fullTag };
}

// 5.8 PSQI（標準 7 成分）
function scorePSQI(d) {
  // C1 主觀睡眠品質 = Q9
  const c1 = +(d.psqi_q9 || 0);

  // C2 入睡時間 = Q2 + Q5a
  const lat = +(d.psqi_latency || 0);
  const q2s = lat <= 15 ? 0 : lat <= 30 ? 1 : lat <= 60 ? 2 : 3;
  const q5a = +(d.psqi5_1 || 0);
  const sumLatency = q2s + q5a;
  const c2 = sumLatency === 0 ? 0 : sumLatency <= 2 ? 1 : sumLatency <= 4 ? 2 : 3;

  // C3 睡眠時間 = Q4
  const dur = +(d.psqi_duration || 0);
  const c3 = dur > 7 ? 0 : dur >= 6 ? 1 : dur >= 5 ? 2 : 3;

  // C4 睡眠效率 = (實際睡眠 / 床上時間) * 100
  let eff = 0, c4 = 3;
  if (d.psqi_bed && d.psqi_wake && dur > 0) {
    const [bh, bm] = d.psqi_bed.split(':').map(Number);
    const [wh, wm] = d.psqi_wake.split(':').map(Number);
    let bedMin = bh * 60 + bm, wakeMin = wh * 60 + wm;
    let inBed = wakeMin - bedMin;
    if (inBed <= 0) inBed += 24 * 60;
    eff = (dur * 60 / inBed) * 100;
    c4 = eff >= 85 ? 0 : eff >= 75 ? 1 : eff >= 65 ? 2 : 3;
  }

  // C5 睡眠障礙 = Q5b–Q5j 之和 (psqi5_2..psqi5_9)
  let sum5 = 0;
  for (let i = 2; i <= 9; i++) sum5 += +(d[`psqi5_${i}`] || 0);
  const c5 = sum5 === 0 ? 0 : sum5 <= 9 ? 1 : sum5 <= 18 ? 2 : 3;

  // C6 助眠藥物 = Q6
  const c6 = +(d.psqi_q6 || 0);

  // C7 日間功能障礙 = Q7 + Q8
  const sum7 = +(d.psqi_q7 || 0) + +(d.psqi_q8 || 0);
  const c7 = sum7 === 0 ? 0 : sum7 <= 2 ? 1 : sum7 <= 4 ? 2 : 3;

  const total = c1 + c2 + c3 + c4 + c5 + c6 + c7;
  const tag = total <= 5 ? '睡眠品質良好' : total <= 10 ? '睡眠品質一般' : '睡眠品質較差';
  return { c1, c2, c3, c4, c5, c6, c7, total, efficiency: +eff.toFixed(1), tag };
}

// 5.9 PSS-10
function scorePSS10(d) {
  let total = 0;
  PSS10_ITEMS.forEach((it, i) => {
    const v = +(d[`pss10_${i+1}`] || 0);
    total += it.reverse ? (4 - v) : v;
  });
  let tag;
  if (total <= 13) tag = '低壓力水平';
  else if (total <= 26) tag = '中等壓力水平';
  else tag = '高壓力水平';
  return { total, tag };
}

// 5.10 STOP-Bang
function scoreSTOPBang(d) {
  let s = 0;
  STOPBANG_ITEMS.forEach(it => { s += +(d[it.key] || 0); });
  let tag;
  if (s <= 2) tag = '低風險';
  else if (s <= 4) tag = '中等風險';
  else tag = '高風險';
  return { total: s, tag };
}

// 5.11 綜合健康支持分數（自定義合成指標，用於教學與整體呈現）
function calcHealthSupportScore(scales) {
  // 每個面向化為 0–100，再加權平均
  const ipaq = { low: 30, moderate: 70, high: 95 }[scales.ipaq.category];
  const who5 = scales.who5.pct;                              // 0–100
  const phq9 = Math.max(0, 100 - scales.phq9.total / 27 * 100);
  const gad7 = Math.max(0, 100 - scales.gad7.total / 21 * 100);
  const psqi = Math.max(0, 100 - scales.psqi.total / 21 * 100);
  const pss  = Math.max(0, 100 - scales.pss10.total / 40 * 100);
  const sb   = Math.max(0, 100 - scales.stopbang.total / 8 * 100);
  const aud  = scales.audit.cAtRisk ? 50 : 90;
  // 權重：身體活動 .15 / 心理幸福 .15 / 抑鬱 .15 / 焦慮 .10 / 睡眠 .15 / 壓力 .15 / OSA .05 / 飲酒 .10
  const score = ipaq*.15 + who5*.15 + phq9*.15 + gad7*.10 + psqi*.15 + pss*.15 + sb*.05 + aud*.10;
  const v = Math.round(score);
  const tag = v >= 80 ? '健康支持良好' : v >= 60 ? '中等支持' : v >= 40 ? '需加強支持' : '健康支持薄弱';
  return { value: v, tag };
}

// 5.12 主要關注點 / 優先順序 / 行動建議
function buildPriority(d, anthro, cm, scales) {
  const concerns = [];
  // 體格與代謝
  if (anthro.bmi >= 28)            concerns.push({ tag:'肥胖', area:'體重管理', weight: 8 });
  else if (anthro.bmi >= 24)       concerns.push({ tag:'超重', area:'體重管理', weight: 5 });
  if (anthro.whtrTag === '中心型肥胖風險') concerns.push({ tag:'中心型肥胖', area:'腰圍管理', weight: 6 });
  cm.forEach(c => { if (c.tag === '高') concerns.push({ tag:`${c.k} 偏高`, area:'代謝管理', weight: 7 });
                    else if (c.tag === '中') concerns.push({ tag:`${c.k} 邊緣`, area:'代謝管理', weight: 4 }); });
  // 既往史
  if (d.hx_htn === '是')        concerns.push({ tag:'高血壓史', area:'血壓管理', weight: 8 });
  if (d.hx_dm === '是')         concerns.push({ tag:'糖代謝異常史', area:'血糖管理', weight: 8 });
  if (d.hx_lipid === '是')      concerns.push({ tag:'血脂異常史', area:'血脂管理', weight: 6 });
  if (d.hx_fattyliver === '是') concerns.push({ tag:'脂肪肝', area:'肝臟與代謝', weight: 5 });
  if (d.hx_cvd === '是')        concerns.push({ tag:'心血管疾病史', area:'心血管管理', weight: 9 });
  if (d.hx_renal === '是')      concerns.push({ tag:'腎臟疾病史', area:'腎臟管理', weight: 7 });
  if (d.hx_osa === '是')        concerns.push({ tag:'打鼾/睡眠呼吸暫停', area:'呼吸睡眠', weight: 6 });
  if (d.sx_recent === '是')     concerns.push({ tag:'近期不適', area:'就醫評估', weight: 9 });
  // 量表
  if (scales.ipaq.category === 'low') concerns.push({ tag:'身體活動不足', area:'運動', weight: 6 });
  if (scales.who5.pct < 50)           concerns.push({ tag:'幸福感偏低', area:'心理健康', weight: 5 });
  if (scales.phq9.total >= 10)        concerns.push({ tag:'抑鬱症狀（中度以上）', area:'心理健康', weight: 8 });
  else if (scales.phq9.total >= 5)    concerns.push({ tag:'輕度抑鬱症狀', area:'心理健康', weight: 4 });
  if (scales.phq9.q9 > 0)             concerns.push({ tag:'自傷意念（PHQ-9 Q9 ≥1）', area:'危機支援', weight: 12 });
  if (scales.gad7.total >= 10)        concerns.push({ tag:'焦慮症狀（中度以上）', area:'心理健康', weight: 7 });
  else if (scales.gad7.total >= 5)    concerns.push({ tag:'輕度焦慮症狀', area:'心理健康', weight: 3 });
  if (scales.audit.cAtRisk)           concerns.push({ tag:'飲酒風險升高', area:'飲酒管理', weight: 6 });
  if (scales.psqi.total > 5)          concerns.push({ tag:'睡眠品質不佳', area:'睡眠', weight: 6 });
  if (scales.pss10.total >= 27)       concerns.push({ tag:'高壓力水平', area:'壓力管理', weight: 7 });
  else if (scales.pss10.total >= 14)  concerns.push({ tag:'中等壓力水平', area:'壓力管理', weight: 4 });
  if (scales.stopbang.total >= 5)     concerns.push({ tag:'OSA 高風險', area:'呼吸睡眠', weight: 8 });
  else if (scales.stopbang.total >= 3) concerns.push({ tag:'OSA 中等風險', area:'呼吸睡眠', weight: 4 });
  if (scales.ipaq.sit >= 480)         concerns.push({ tag:'久坐時間過長 (≥8h/日)', area:'久坐', weight: 4 });

  concerns.sort((a, b) => b.weight - a.weight);

  // 優先改善 (合併同類)
  const priorityMap = new Map();
  concerns.forEach(c => {
    if (!priorityMap.has(c.area)) priorityMap.set(c.area, c.weight);
    else priorityMap.set(c.area, priorityMap.get(c.area) + c.weight*0.5);
  });
  const priority = [...priorityMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([area]) => area);

  // 3 個小行動
  const actions = [];
  if (scales.ipaq.category === 'low' && actions.length < 3)
    actions.push('每天快走 20 分鐘（先設定鬧鐘提醒）');
  if (scales.psqi.total > 5 && actions.length < 3)
    actions.push('固定就寢與起床時間（誤差不超過 30 分鐘）');
  if (scales.pss10.total >= 14 && actions.length < 3)
    actions.push('每天 5 分鐘呼吸練習（4-7-8 呼吸法）');
  if (anthro.bmi >= 24 && actions.length < 3)
    actions.push('每餐多 1 拳蔬菜，飲料改為白開水或無糖茶');
  if (scales.audit.cAtRisk && actions.length < 3)
    actions.push('紀錄每天飲酒份量，先設「無酒日」每週 ≥2 天');
  if (scales.ipaq.sit >= 480 && actions.length < 3)
    actions.push('每坐 50 分鐘起身活動 3 分鐘');
  if (scales.who5.pct < 50 && actions.length < 3)
    actions.push('每天記錄 1 件「今天讓我感謝的小事」');
  while (actions.length < 3) actions.push('每天累計 8000 步以上');

  return { concerns: concerns.slice(0, 10), priority: priority.slice(0, 6), actions };
}

/* ============================================================
 * 6. 結果渲染
 * ============================================================ */

let _lastReport = null;

function buildReport(d) {
  const anthro   = calcAnthro(d);
  const cm       = calcCardiometabolic(d);
  const ipaq     = scoreIPAQ(d);
  const who5     = scoreWHO5(d);
  const phq9     = scorePHQ9(d);
  const gad7     = scoreGAD7(d);
  const audit    = scoreAUDIT(d);
  const psqi     = scorePSQI(d);
  const pss10    = scorePSS10(d);
  const stopbang = scoreSTOPBang(d);
  const scales   = { ipaq, who5, phq9, gad7, audit, psqi, pss10, stopbang };
  const hss      = calcHealthSupportScore(scales);
  const prio     = buildPriority(d, anthro, cm, scales);
  return { meta: { generatedAt: new Date().toISOString() }, raw: d, anthro, cm, scales, hss, ...prio };
}

function tagBadge(t) {
  return t === '低' ? `<span class="badge badge-low">低</span>`
       : t === '中' ? `<span class="badge badge-mid">中</span>`
       : t === '高' ? `<span class="badge badge-high">高</span>`
       : `<span class="badge badge-info">${t}</span>`;
}

function renderResult(report) {
  _lastReport = report;
  const r = report;
  // ① demographics
  const d = r.raw;
  document.getElementById('rDemo').innerHTML = `
    <div class="metric-grid">
      <div class="metric"><div class="metric-label">年齡</div><div class="metric-value">${d.age||'--'}<small>歲</small></div></div>
      <div class="metric"><div class="metric-label">性別</div><div class="metric-value" style="font-size:18px;">${d.gender==='male'?'男':d.gender==='female'?'女':'--'}</div></div>
      <div class="metric"><div class="metric-label">職業</div><div class="metric-value" style="font-size:14px;">${d.occupation||'--'}</div></div>
      <div class="metric"><div class="metric-label">教育</div><div class="metric-value" style="font-size:14px;">${d.education||'--'}</div></div>
      <div class="metric"><div class="metric-label">居住</div><div class="metric-value" style="font-size:14px;">${d.marital||'--'}</div></div>
    </div>
    <p style="margin-top:14px;color:var(--c-text-mid);font-size:13px;"><strong>主要健康目標：</strong>${(d.goals||[]).join('、')||'未填寫'}</p>
  `;
  // ② anthro
  const a = r.anthro;
  document.getElementById('rAnthro').innerHTML = `
    <div class="metric"><div class="metric-label">BMI</div><div class="metric-value">${a.bmi??'--'}</div><div class="metric-note">${a.bmiTag||''}</div></div>
    <div class="metric"><div class="metric-label">腰高比</div><div class="metric-value">${a.whtr??'--'}</div><div class="metric-note">${a.whtrTag||''}</div></div>
    <div class="metric"><div class="metric-label">腰臀比</div><div class="metric-value">${a.whr??'--'}</div><div class="metric-note">${a.whrTag||''}</div></div>
  `;
  // ③ cardiometabolic
  const cmHtml = r.cm.length
    ? r.cm.map(c => `<div class="scale-row"><div class="scale-name">${c.k}<small>${c.note}</small></div><div class="scale-score">${c.v} ${tagBadge(c.tag)}</div></div>`).join('')
    : '<p style="color:var(--c-text-light);">未填寫體檢指標。</p>';
  document.getElementById('rCardiometabolic').innerHTML = cmHtml;

  // ④ scales
  const s = r.scales;
  document.getElementById('rScales').innerHTML = `
    <div class="scale-row"><div class="scale-name">IPAQ-SF<small>身體活動水平</small></div>
      <div class="scale-score">${s.ipaq.total} <small>MET-min/週</small> ${tagBadge(s.ipaq.category==='low'?'高':s.ipaq.category==='moderate'?'中':'低')}<small>類別：${s.ipaq.category} · 久坐 ${s.ipaq.sit} 分/日</small></div></div>
    <div class="scale-row"><div class="scale-name">WHO-5<small>心理幸福感</small></div>
      <div class="scale-score">${s.who5.pct}<small>/100 (raw ${s.who5.raw}/25) · ${s.who5.tag}</small></div></div>
    <div class="scale-row"><div class="scale-name">PHQ-9<small>抑鬱症狀</small></div>
      <div class="scale-score">${s.phq9.total}<small>/27 · ${s.phq9.tag}</small></div></div>
    <div class="scale-row"><div class="scale-name">GAD-7<small>焦慮症狀</small></div>
      <div class="scale-score">${s.gad7.total}<small>/21 · ${s.gad7.tag}</small></div></div>
    <div class="scale-row"><div class="scale-name">AUDIT-C<small>飲酒風險</small></div>
      <div class="scale-score">${s.audit.auditC}<small>${s.audit.cTag}${s.audit.auditFull!=null?` · 全題分 ${s.audit.auditFull} (${s.audit.fullTag})`:''}</small></div></div>
    <div class="scale-row"><div class="scale-name">PSQI<small>睡眠品質（成分分 C1–C7）</small></div>
      <div class="scale-score">${s.psqi.total}<small>/21 · ${s.psqi.tag} · 效率 ${s.psqi.efficiency||'--'}%</small></div></div>
    <div class="scale-row"><div class="scale-name">PSS-10<small>感知壓力</small></div>
      <div class="scale-score">${s.pss10.total}<small>/40 · ${s.pss10.tag}</small></div></div>
    <div class="scale-row"><div class="scale-name">STOP-Bang<small>OSA 風險</small></div>
      <div class="scale-score">${s.stopbang.total}<small>/8 · ${s.stopbang.tag}</small></div></div>
    <details style="margin-top:14px;font-size:12px;color:var(--c-text-light);"><summary style="cursor:pointer;">PSQI 七成分分明細</summary>
      <p style="margin-top:8px;">C1 主觀品質: ${s.psqi.c1} | C2 入睡時間: ${s.psqi.c2} | C3 睡眠時長: ${s.psqi.c3} | C4 效率: ${s.psqi.c4} | C5 睡眠障礙: ${s.psqi.c5} | C6 助眠藥物: ${s.psqi.c6} | C7 日間功能: ${s.psqi.c7}</p>
    </details>
  `;
  // ⑤ HSS
  document.getElementById('rHss').textContent = r.hss.value;
  document.getElementById('rHssTag').textContent = r.hss.tag;
  // ⑥ concerns
  document.getElementById('rConcerns').innerHTML = r.concerns.length
    ? r.concerns.map(c => `<li><strong>${c.tag}</strong> · 領域：${c.area}</li>`).join('')
    : '<li>未發現主要關注點。</li>';
  // ⑦ priority
  document.getElementById('rPriority').innerHTML = r.priority.map(p => `<li>${p}</li>`).join('') || '<li>未產生優先順序。</li>';
  // ⑧ actions
  document.getElementById('rActions').innerHTML = r.actions.map(a => `<li>${a}</li>`).join('');

  // 安全提示
  if (s.phq9.safetyAlert) document.getElementById('phq9Safety').style.display = 'block';

  document.getElementById('result').style.display = 'block';
  document.getElementById('result').scrollIntoView({ behavior: 'smooth' });
}

/* ============================================================
 * 7. Markdown / JSON 匯出
 * ============================================================ */

function buildMarkdown(r) {
  const d = r.raw, a = r.anthro, s = r.scales;
  const date = new Date().toLocaleString('zh-Hant');
  return `# 標準健康評估報告
> 生成時間：${date}　·　工具：Hughie Lab Standard Health Assessment

## ① 人口學資料
- 年齡：${d.age||'--'}　性別：${d.gender==='male'?'男':d.gender==='female'?'女':'--'}
- 職業：${d.occupation||'--'}　教育：${d.education||'--'}　居住：${d.marital||'--'}
- 主要健康目標：${(d.goals||[]).join('、')||'未填寫'}

## ② 體格指標
- 身高 ${d.height||'--'} cm　體重 ${d.weight||'--'} kg
- BMI: **${a.bmi??'--'}** (${a.bmiTag||''})
- 腰高比 WHtR: ${a.whtr??'--'} (${a.whtrTag||''})
- 腰臀比 WHR: ${a.whr??'--'} (${a.whrTag||''})

## ③ 心血管代謝指標
${r.cm.length ? r.cm.map(c => `- ${c.k}: ${c.v} → ${c.tag === '高'?'**偏高**':c.tag === '中'?'邊緣':'正常'}（${c.note}）`).join('\n') : '_未填寫_'}

## ④ 國際標準量表結果
| 量表 | 原始分 | 提示 |
|---|---|---|
| IPAQ-SF | ${s.ipaq.total} MET-min/週（W:${s.ipaq.walkMET} M:${s.ipaq.modMET} V:${s.ipaq.vigMET}） | 類別：**${s.ipaq.category}**　久坐 ${s.ipaq.sit} 分/日 |
| WHO-5 | ${s.who5.pct}/100 (raw ${s.who5.raw}/25) | ${s.who5.tag} |
| PHQ-9 | ${s.phq9.total}/27 | ${s.phq9.tag}${s.phq9.safetyAlert?'　⚠ Q9 ≥1，請見安全提示':''} |
| GAD-7 | ${s.gad7.total}/21 | ${s.gad7.tag} |
| AUDIT-C | ${s.audit.auditC}/12 | ${s.audit.cTag}${s.audit.auditFull!=null?`　·　AUDIT 總分 ${s.audit.auditFull} (${s.audit.fullTag})`:''} |
| PSQI | ${s.psqi.total}/21（C1:${s.psqi.c1} C2:${s.psqi.c2} C3:${s.psqi.c3} C4:${s.psqi.c4} C5:${s.psqi.c5} C6:${s.psqi.c6} C7:${s.psqi.c7}） | ${s.psqi.tag} · 睡眠效率 ${s.psqi.efficiency||'--'}% |
| PSS-10 | ${s.pss10.total}/40 | ${s.pss10.tag} |
| STOP-Bang | ${s.stopbang.total}/8 | ${s.stopbang.tag} |

## ⑤ 綜合健康支持分數
**${r.hss.value} / 100**　·　${r.hss.tag}

## ⑥ 主要健康關注點
${r.concerns.map(c => `- **${c.tag}**（${c.area}）`).join('\n')}

## ⑦ 優先改善順序
${r.priority.map((p, i) => `${i+1}. ${p}`).join('\n')}

## ⑧ 最值得先做的 3 個小行動
${r.actions.map((x, i) => `${i+1}. ${x}`).join('\n')}

## 🚀 下一步
建議導入「**標準健康處方工具 (standard-health-prescription.html)**」生成 4 週生活方式處方與 7 天行動清單。

---
### 安全與合規聲明
- 本工具僅供教學、研究訓練、健康教育與自我管理參考，**不構成醫療診斷、治療建議或用藥建議**。如有不適、指標異常、慢性疾病、孕期、術後恢復期，或正在接受治療，請諮詢合格醫療專業人員。
- PHQ-9 / GAD-7 僅供症狀篩查，**不構成心理疾病診斷**。${s.phq9.safetyAlert?'\n- ⚠ 你在 PHQ-9 第 9 題上有非零回答。如近期有傷害自己或結束生命的想法，請**立即聯繫當地急救電話、危機熱線或可信任的人**，並盡快尋求專業幫助。':''}
- PSQI、PSS-10、STOP-Bang 模組僅供教學與研究使用。使用者應確認其使用情境符合原量表授權、引用與版權要求，**不得擅自修改標準題項與計分規則**。
`;
}

function download(filename, content, type='text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

/* ============================================================
 * 8. localStorage / Toast
 * ============================================================ */

function saveLocal(report) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(report));
  showToast('✓ 已保存到本機 localStorage');
}
function loadLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return showToast('沒有找到上次評估記錄');
  try {
    const report = JSON.parse(raw);
    fillFormFromData(report.raw);
    showToast('✓ 已讀取上次評估');
  } catch(e) { showToast('讀取失敗，資料可能已損壞'); }
}
function clearAll() {
  if (!confirm('確定要清空所有作答與本機保存資料？')) return;
  localStorage.removeItem(STORAGE_KEY);
  document.getElementById('assessmentForm').reset();
  document.getElementById('auditFullBox').style.display = 'none';
  document.getElementById('result').style.display = 'none';
  goStep(1);
  showToast('已清空');
}
function fillFormFromData(d) {
  const form = document.getElementById('assessmentForm');
  Object.entries(d).forEach(([k, v]) => {
    if (k === 'goals' && Array.isArray(v)) {
      v.forEach(g => { const c = form.querySelector(`input[name="goals"][value="${g}"]`); if (c) c.checked = true; });
      return;
    }
    const els = form.querySelectorAll(`[name="${k}"]`);
    if (els.length === 0) return;
    if (els[0].type === 'radio') {
      els.forEach(el => { if (el.value === String(v)) el.checked = true; });
    } else {
      els[0].value = v;
    }
  });
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

/* ============================================================
 * 9. 啟動
 * ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // 渲染各模組
  renderHistory();
  renderLikertGroup('who5Box', WHO5_ITEMS, WHO5_OPTIONS, 'who5');
  renderLikertGroup('phq9Box', PHQ9_ITEMS, PHQ_GAD_OPTIONS, 'phq9');
  renderLikertGroup('gad7Box', GAD7_ITEMS, PHQ_GAD_OPTIONS, 'gad7');
  renderAudit();
  renderPsqi5();
  renderLikertGroup('pss10Box', PSS10_ITEMS, PSS_OPTIONS, 'pss10');
  renderStopBang();

  // AUDIT toggle
  document.getElementById('auditFullToggle').addEventListener('change', e => {
    document.getElementById('auditFullBox').style.display = e.target.checked ? 'block' : 'none';
  });

  // 限制 goals 最多 3 項
  document.getElementById('goalsBox').addEventListener('change', () => {
    const checked = document.querySelectorAll('input[name="goals"]:checked');
    if (checked.length > 3) { event.target.checked = false; showToast('最多選擇 3 項'); }
  });

  // 導航
  document.getElementById('nextBtn').addEventListener('click', () => goStep(currentStep + 1));
  document.getElementById('prevBtn').addEventListener('click', () => goStep(currentStep - 1));
  document.getElementById('saveBtn').addEventListener('click', () => {
    const data = collectFormData();
    localStorage.setItem(STORAGE_KEY + '_draft', JSON.stringify({ raw: data, _draft: true }));
    showToast('✓ 進度已暫存');
  });
  document.getElementById('btnLoadLast').addEventListener('click', () => {
    // 優先讀完整報告，否則讀草稿
    const draft = localStorage.getItem(STORAGE_KEY + '_draft');
    if (localStorage.getItem(STORAGE_KEY)) loadLocal();
    else if (draft) { fillFormFromData(JSON.parse(draft).raw); showToast('✓ 已讀取暫存草稿'); }
    else showToast('沒有找到任何記錄');
  });
  document.getElementById('btnClearAll').addEventListener('click', clearAll);

  // 提交
  document.getElementById('submitBtn').addEventListener('click', () => {
    if (!validateStep(currentStep)) return;
    const data = collectFormData();
    const report = buildReport(data);
    renderResult(report);
    // 自動保存
    localStorage.setItem(STORAGE_KEY, JSON.stringify(report));
  });

  // 匯出
  document.getElementById('btnDownloadJson').addEventListener('click', () => {
    if (!_lastReport) return;
    download(`health-assessment-${Date.now()}.json`, JSON.stringify(_lastReport, null, 2), 'application/json');
  });
  document.getElementById('btnDownloadMd').addEventListener('click', () => {
    if (!_lastReport) return;
    download(`health-assessment-${Date.now()}.md`, buildMarkdown(_lastReport), 'text/markdown;charset=utf-8');
  });
  document.getElementById('btnPreviewMd').addEventListener('click', () => {
    if (!_lastReport) return;
    const el = document.getElementById('mdPreview');
    el.textContent = buildMarkdown(_lastReport);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  });
  document.getElementById('btnSaveLocal').addEventListener('click', () => { if (_lastReport) saveLocal(_lastReport); });

  updateProgress();
});
