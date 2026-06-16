/* ============================================================
   Health Service & Management Toolkit
   Hughie's Online Lab
   ------------------------------------------------------------
   所有計算在本地完成；不收集、上傳、保存任何個人資料。
   報告語氣使用「風險提示／服務需求／建議諮詢專業人員」，
   不使用診斷性語氣，不提供藥物或治療建議。
   ============================================================ */

/* ============================================================
   一、通用工具函數
   ============================================================ */

// 顯示工具包首頁，隱藏所有工具面板
function showToolkitHome(){
  document.getElementById('toolkit-home').classList.remove('hidden');
  document.querySelectorAll('.tool-panel').forEach(el=>el.classList.add('hidden'));
  window.scrollTo({top:0,behavior:'smooth'});
}

// 打開指定工具
function openTool(toolId){
  document.getElementById('toolkit-home').classList.add('hidden');
  document.querySelectorAll('.tool-panel').forEach(el=>el.classList.add('hidden'));
  const panel = document.getElementById('tool-'+toolId);
  if(panel) panel.classList.remove('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
}

// 當前日期時間字串
function getCurrentDateTime(){
  const d = new Date();
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 顯示表單錯誤
function showError(formEl, message){
  const box = formEl.querySelector('.error-msg');
  if(box){ box.textContent = message; box.style.display='block'; }
}
// 清除表單錯誤
function clearError(formEl){
  const box = formEl.querySelector('.error-msg');
  if(box){ box.textContent=''; box.style.display='none'; }
}

// 限制分數 0-100
function clampScore(score){ return Math.max(0, Math.min(100, Math.round(score))); }

// 風險等級標籤（4 級）
function getRiskLevelLabel(score){
  if(score < 25) return {level:'A 層',label:'低需求 / 自我管理型',cls:'alert'};
  if(score < 50) return {level:'B 層',label:'中等 / 健康教育支持型',cls:'alert'};
  if(score < 75) return {level:'C 層',label:'較高 / 行為干預強化型',cls:'alert-warning'};
  return {level:'D 層',label:'高需求 / 建議專業評估型',cls:'alert-danger'};
}

// 收集表單數據（支持多選 checkbox）
function collectFormData(formId){
  const form = document.getElementById(formId);
  if(!form) return {};
  const data = {};
  const fd = new FormData(form);
  // 先拿單值
  for(const [k,v] of fd.entries()){
    if(data[k] === undefined) data[k] = v;
    else if(Array.isArray(data[k])) data[k].push(v);
    else data[k] = [data[k], v];
  }
  // 確保 checkbox 多選一律為陣列
  form.querySelectorAll('input[type="checkbox"]').forEach(cb=>{
    if(!Array.isArray(data[cb.name])){
      // 若該 name 有多個 checkbox，但目前不是陣列，轉為陣列
      const all = form.querySelectorAll(`input[type="checkbox"][name="${cb.name}"]`);
      if(all.length > 1){
        const checked = Array.from(all).filter(x=>x.checked).map(x=>x.value);
        data[cb.name] = checked;
      }
    }
  });
  return data;
}

// 重置工具
function resetTool(formId, resultId){
  const form = document.getElementById(formId);
  if(form){ form.reset(); clearError(form); }
  const r = document.getElementById(resultId);
  if(r){ r.innerHTML=''; r.classList.add('hidden'); }
}

// 列印報告（隱藏其他工具面板，僅打印當前報告）
function printReport(resultId){
  const el = document.getElementById(resultId);
  if(!el || el.classList.contains('hidden')){
    alert('請先生成報告');
    return;
  }
  window.print();
}

// 匯出 JSON
function exportJSON(data, filename){
  const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
}

// 匯出 CSV（rows: array of arrays, 第一行為表頭）
function exportCSV(rows, filename){
  const csv = rows.map(r =>
    r.map(c => {
      const s = (c===null||c===undefined)?'':String(c);
      return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
    }).join(',')
  ).join('\n');
  // 加 BOM 以兼容中文 Excel
  const blob = new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
}

// 渲染結果到指定容器
function renderResult(resultId, html){
  const el = document.getElementById(resultId);
  if(!el) return;
  el.innerHTML = html;
  el.classList.remove('hidden');
  el.scrollIntoView({behavior:'smooth', block:'start'});
}

// 取分數最高的 N 個風險因素
function getTopFactors(factors, limit){
  return factors
    .filter(f=>f.score>0)
    .sort((a,b)=>b.score-a.score)
    .slice(0, limit);
}

// 報告基本元信息
function createReportMeta(toolName){
  return {
    toolName,
    generatedAt: getCurrentDateTime(),
    disclaimer: '本報告僅供健康教育、健康服務規劃和自我管理參考，不構成醫療診斷或治療建議。'
  };
}

// 共用：報告頭
function reportHeadHTML(toolName){
  return `
    <div class="result-card">
      <div class="result-head">
        <div class="eyebrow">REPORT</div>
        <h3>${toolName} · 報告</h3>
        <div class="meta">生成時間：${getCurrentDateTime()}</div>
      </div>`;
}
function reportTailHTML(){
  return `
      <div class="alert alert-warning" style="margin-top:24px;">
        <strong>⚠ 免責聲明　</strong>本報告由本地工具生成，僅供健康教育、健康服務規劃和自我管理參考，不構成醫療診斷、治療或藥物建議。如有急性症狀、嚴重不適、自我傷害想法，請立即尋求專業醫療、心理健康或當地緊急服務（如中國大陸 120）幫助。
      </div>
    </div>`;
}
function listHTML(items){
  return '<ul>'+items.map(i=>`<li>${i}</li>`).join('')+'</ul>';
}

// 上次的報告數據（用於匯出）
const _lastReportData = {};

/* ============================================================
   二、計算函數：Tool 01 健康服務需求分層
   ============================================================ */
function calculateHealthServiceStratifier(d){
  const factors = [];
  let score = 0;

  // 年齡
  const ageMap = {'18-29':0,'30-44':4,'45-59':8,'60-74':12,'75+':16};
  const ageS = ageMap[d.age_group]||0;
  score += ageS; factors.push({name:'年齡因素', score:ageS});

  // 慢病
  const cMap = {'0':0,'1':6,'2':12,'3':18};
  const cS = cMap[d.chronic_count]||0;
  score += cS; factors.push({name:'慢性病負擔', score:cS});

  // 體檢
  if(d.recent_checkup==='no') score += 3;
  if(d.recent_checkup==='unknown') score += 2;

  // BMI
  const bmiMap = {'normal':0,'under':3,'over':4,'obese':8,'unknown':2};
  const bmiS = bmiMap[d.bmi]||0;
  score += bmiS; factors.push({name:'體重風險', score:bmiS});

  // 血壓
  const bpMap = {'normal':0,'elevated':5,'known_htn':8,'unknown':3};
  const bpS = bpMap[d.bp]||0;
  score += bpS; factors.push({name:'血壓風險', score:bpS});

  // 血糖
  const gMap = {'normal':0,'elevated':5,'known_dm':8,'unknown':3};
  const gS = gMap[d.glucose]||0;
  score += gS; factors.push({name:'血糖風險', score:gS});

  // 血脂
  const lMap = {'normal':0,'abnormal':4,'unknown':2};
  score += lMap[d.lipid]||0;

  // 運動
  const exMap = {'0':6,'1-74':4,'75-149':2,'150+':0};
  const exS = exMap[d.exercise]||0;
  score += exS; factors.push({name:'運動不足', score:exS});

  // 久坐
  const sedMap = {'lt4':0,'4-8':3,'gt8':6};
  const sedS = sedMap[d.sedentary]||0;
  score += sedS; factors.push({name:'久坐行為', score:sedS});

  // 睡眠/飲食
  const slMap={'good':0,'medium':3,'poor':6};
  score += slMap[d.sleep]||0;
  factors.push({name:'睡眠質量', score:slMap[d.sleep]||0});
  const diMap={'regular':0,'medium':2,'irregular':5};
  score += diMap[d.diet]||0;
  factors.push({name:'飲食規律', score:diMap[d.diet]||0});

  // 吸菸
  const smMap={'no':0,'occasional':3,'daily':7};
  score += smMap[d.smoke]||0;
  factors.push({name:'吸菸', score:smMap[d.smoke]||0});

  // 飲酒
  const alMap={'no':0,'low':1,'frequent':5};
  score += alMap[d.alcohol]||0;

  // 壓力 / 情緒
  const stMap={'low':0,'medium':3,'high':6};
  score += stMap[d.stress]||0;
  factors.push({name:'壓力水平', score:stMap[d.stress]||0});
  const moMap={'none':0,'mild':3,'severe':7};
  score += moMap[d.mood]||0;
  factors.push({name:'情緒困擾', score:moMap[d.mood]||0});

  // 健康素養
  const liMap={'good':0,'medium':3,'poor':6};
  score += liMap[d.literacy]||0;
  factors.push({name:'健康素養', score:liMap[d.literacy]||0});

  // 隨訪能力
  const fMap={'yes':0,'unsure':3,'no':6};
  score += fMap[d.followup]||0;

  // 支持
  const suMap={'good':0,'medium':3,'poor':6};
  score += suMap[d.support]||0;
  factors.push({name:'社會支持', score:suMap[d.support]||0});

  // 數位能力
  const dgMap={'good':0,'medium':2,'poor':4};
  score += dgMap[d.digital]||0;

  // 自傷想法 -> 強制 D 層
  const selfHarm = d.self_harm==='yes';
  if(selfHarm){ score = Math.max(score, 90); }

  score = clampScore(score);
  const level = getRiskLevelLabel(score);
  const top = getTopFactors(factors, 3);

  // 服務包
  let pkg = '基礎健康教育包：自評工具 + 月度健康提醒 + 健康資訊推送';
  let freq = '每 6 個月復評一次';
  if(score>=25 && score<50){ pkg='健康教育支持包：自評 + 個性化建議 + 季度復評'; freq='每 3 個月復評'; }
  if(score>=50 && score<75){ pkg='行為干預強化包：分層干預 + 月度隨訪 + 小組支持'; freq='每 1 個月隨訪'; }
  if(score>=75){ pkg='高支持包：建議專業評估 + 個案管理 + 多專業團隊支持'; freq='每 2-4 週密集隨訪 + 建議專業評估'; }

  // 30 天路徑
  const pathway = [
    'Day 1-7：完成基線記錄（體重、血壓/血糖如有設備、生活方式日誌）',
    'Day 8-14：選擇 1-2 個最容易改善的目標（如每日 7000 步、規律早餐）',
    'Day 15-21：加入週小結，遇阻礙時調整微目標',
    'Day 22-30：自我復評，決定是否升級服務包或尋求專業支持'
  ];

  // 觀察指標
  const monitor = ['體重 / BMI','靜息血壓（如有設備）','空腹血糖（如已知異常）','睡眠時間與質量','每週運動分鐘數','情緒與壓力水平'];

  return {
    score, level, factors, top, pkg, freq, pathway, monitor, selfHarm,
    raw: d
  };
}

function renderHealthServiceStratifier(r){
  const lv = r.level;
  let alertHtml = '';
  if(r.selfHarm){
    alertHtml = `<div class="alert alert-danger"><strong>🚨 緊急風險提示　</strong>您表示存在自我傷害想法。請立即尋求即時支持：
      <ul style="margin-top:8px;">
        <li>中國大陸：撥打 12320 衛生熱線 / 北京心理危機研究與干預中心 010-82951332 / 緊急情況撥 120</li>
        <li>立即聯繫信任的家人朋友陪伴在身邊</li>
        <li>儘快前往就近精神科或綜合醫院心理科尋求專業評估</li>
      </ul></div>`;
  }
  const topHtml = r.top.length ? listHTML(r.top.map(t=>`${t.name}（風險權重 ${t.score}）`)) : '<p>未識別到顯著風險來源。</p>';

  return reportHeadHTML('健康服務需求分層工具') + alertHtml + `
    <div class="score-card">
      <div>
        <div class="score-num">${r.score}<small> / 100</small></div>
        <div class="score-label">${lv.level} · ${lv.label}</div>
      </div>
      <div>
        <div class="progress-bar"><div class="progress-fill" style="width:${r.score}%"></div></div>
        <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11px;color:#888;">
          <span>0</span><span>25 (B)</span><span>50 (C)</span><span>75 (D)</span><span>100</span>
        </div>
      </div>
    </div>

    <div class="result-section">
      <h4>結果解釋</h4>
      <p>本次評估顯示您的健康服務需求屬於 <strong>${lv.level}（${lv.label})</strong>。該分層基於健康狀態、生活方式、心理壓力、健康素養與社會支持綜合計算，用於規劃適合您當前情況的健康管理路徑。</p>
    </div>

    <div class="result-section">
      <h4>主要風險來源（前 3 項）</h4>
      ${topHtml}
    </div>

    <div class="result-section">
      <h4>建議服務包</h4>
      <p>${r.pkg}</p>
    </div>

    <div class="result-section">
      <h4>30 天健康服務管理路徑</h4>
      ${listHTML(r.pathway)}
    </div>

    <div class="result-section">
      <h4>建議隨訪頻率</h4>
      <p>${r.freq}</p>
    </div>

    <div class="result-section">
      <h4>建議觀察的健康指標</h4>
      ${listHTML(r.monitor)}
    </div>
  ` + reportTailHTML();
}

/* ============================================================
   三、計算函數：Tool 02 個人健康路徑生成器
   ============================================================ */
function calculatePersonalHealthPathway(d){
  let intensity = 1; // 1=低，2=中，3=高

  if(d.priority==='high') intensity++;
  if(d.chronic==='2+') intensity+=2;
  else if(d.chronic==='1') intensity++;
  if(d.stress==='high') intensity++;
  if(d.sleep==='poor') intensity++;
  if(d.weight==='obese') intensity++;
  else if(d.weight==='over') intensity+=0.5;
  if(d.exercise_level==='none') intensity++;
  if(d.confidence==='low') intensity++;
  intensity = Math.min(3, Math.max(1, Math.round(intensity)));

  const intensityLabel = ['低強度','中強度','高強度'][intensity-1];

  // SMART 目標
  const goalMap = {
    weight:'每週體重變化保持在合理範圍（如 0.3-0.5 公斤），透過行為改變持續 12 週',
    exercise:'每週累計中等強度運動 ≥ 150 分鐘，分 4-5 次完成',
    sleep:'每天 23:00 前準備就寢，睡眠時長維持 7-8 小時',
    stress:'每天進行 10 分鐘減壓練習（呼吸/正念/伸展）',
    diet:'每天三餐規律 + 蔬菜 ≥ 300g + 少量加工食品',
    chronic:'維持監測指標在個人目標範圍內（請與專業人員確認目標值）',
    comprehensive:'同時改善運動、飲食、睡眠基礎習慣，每週復盤一次'
  };
  const smart = goalMap[d.goal] || '建立可量化、可達成的健康改善目標';

  // 投入時間
  const timeMap = {
    'lt10':['每天 5 分鐘呼吸或拉伸','每天記錄一條健康觀察','每週 1 次自我復盤'],
    '10-20':['每天 10-15 分鐘步行/運動','每天記錄飲食與睡眠','每週 1 次小組或家庭支持'],
    '20-40':['每天 20-30 分鐘運動','每天 10 分鐘減壓練習','每週 2 次飲食記錄'],
    'gt40':['每天 30-45 分鐘有氧+力量交替','每天 15 分鐘正念或閱讀','每週 1 次完整健康復盤']
  };
  const dailyMicro = timeMap[d.time] || [];

  // 階段計劃
  const period = parseInt(d.period||'30',10);
  const stages = [];
  if(period>=30) stages.push({range:'第 1-30 天 · 啟動期', tasks:['建立基線（體重、活動、睡眠）','選 1-2 個微目標','養成記錄習慣']});
  if(period>=60) stages.push({range:'第 31-60 天 · 鞏固期', tasks:['擴展行為（增加 1 個新目標）','處理首批障礙','建立支持網絡']});
  if(period>=90) stages.push({range:'第 61-90 天 · 維持期', tasks:['將行為標準化','防復發策略','總結並設定下一輪目標']});

  // 週任務
  const weekly = ['每週復盤一次本週進展','每週記錄主觀感受 1-10 分','每週設定下週一個調整點'];

  // 監測指標
  const monitor = ['體重 / 圍度（如目標相關）','運動分鐘數','睡眠時長與質量','主觀壓力 0-10 分','飲食規律性'];

  // 障礙對策
  const barrierMap = {
    time:'採用 5/10/15 分鐘微行動，把運動嵌入通勤、午休、家務時段',
    motivation:'尋找夥伴或支持小組；用「最小行動」啟動而非追求完美',
    knowledge:'每週學習一個專題（運動、飲食、睡眠），記錄三個要點',
    pressure:'設定 2 個非協商時段（如清晨 15 分鐘）；尋求家人協作分擔',
    economic:'選擇免費或低成本資源（步行、家庭飲食、線上免費課程）',
    physical:'從低衝擊活動開始（散步、伸展），如有不適請先諮詢專業人員'
  };
  const barrierAdvice = barrierMap[d.barrier] || '與健康管理師或社區資源溝通制定可持續方案';

  // 何時諮詢專業
  const proAdvice = [
    '出現持續胸痛、嚴重呼吸困難、突然肢體無力或意識變化 → 立即就醫',
    '已知慢病指標明顯惡化 → 儘快聯繫主治醫師',
    '情緒持續低落、睡眠長期受影響或有自我傷害想法 → 尋求專業心理健康支持',
    '行為改變嘗試多次失敗 → 考慮聯繫健康管理師或專科門診'
  ];

  return {
    intensity, intensityLabel, smart, stages, weekly, dailyMicro, monitor,
    barrierAdvice, proAdvice, raw: d
  };
}

function renderPersonalHealthPathway(r){
  return reportHeadHTML('個人健康管理路徑生成器') + `
    <div class="score-card">
      <div>
        <div class="score-num">${r.intensity}<small> / 3</small></div>
        <div class="score-label">${r.intensityLabel}</div>
      </div>
      <div>
        <div class="progress-bar"><div class="progress-fill" style="width:${r.intensity*33.3}%"></div></div>
        <div style="margin-top:8px;font-size:13px;color:#555;">建議按此強度執行 ${r.raw.period} 天計劃。</div>
      </div>
    </div>

    <div class="result-section"><h4>SMART 目標</h4><p>${r.smart}</p></div>

    <div class="result-section"><h4>分階段計劃</h4>
      ${r.stages.map(s=>`<p><strong>${s.range}</strong></p>${listHTML(s.tasks)}`).join('')}
    </div>

    <div class="result-section"><h4>每週任務清單</h4>${listHTML(r.weekly)}</div>
    <div class="result-section"><h4>每日微行動</h4>${listHTML(r.dailyMicro)}</div>
    <div class="result-section"><h4>監測指標</h4>${listHTML(r.monitor)}</div>
    <div class="result-section"><h4>行為障礙對策</h4><p>${r.barrierAdvice}</p></div>
    <div class="result-section"><h4>復評提醒</h4><p>建議在 ${Math.round(parseInt(r.raw.period||30)/2)} 天和 ${r.raw.period} 天分別進行進度復評，視情況調整強度。</p></div>
    <div class="result-section"><h4>何時建議諮詢專業人員</h4>${listHTML(r.proAdvice)}</div>
  ` + reportTailHTML();
}

/* ============================================================
   四、計算函數：Tool 03 慢病隨訪計劃
   ============================================================ */
function calculateChronicFollowupPlanner(d){
  const conds = Array.isArray(d.conditions) ? d.conditions : (d.conditions ? [d.conditions] : []);
  let score = 0;

  score += conds.filter(c=>c!=='unknown').length * 6;
  if(conds.includes('unknown')) score += 3;
  if(d.control==='occasional') score += 5;
  if(d.control==='frequent') score += 12;
  if(d.control==='unknown') score += 6;
  if(d.device==='partial') score += 2;
  if(d.device==='no') score += 5;
  if(d.record==='occasional') score += 2;
  if(d.record==='no') score += 5;
  if(d.understand==='medium') score += 3;
  if(d.understand==='unclear') score += 6;
  if(d.visit==='unsure') score += 3;
  if(d.visit==='no') score += 7;
  if(d.exercise==='poor') score += 4;
  if(d.diet==='unhealthy') score += 4;
  if(d.sleep==='poor') score += 3;
  if(d.stress==='high') score += 3;

  const redFlag = d.red_flag==='yes';
  if(redFlag) score = Math.max(score, 90);

  let intensity, freq;
  if(score < 30){ intensity='低強度'; freq='每 3-6 個月健康管理復盤'; }
  else if(score < 60){ intensity='中強度'; freq='每 1-3 個月隨訪一次'; }
  else { intensity='高強度'; freq='建議儘快接受專業評估，並建立 2-4 週密集隨訪'; }

  // 自我監測清單（按疾病）
  const monitor = [];
  if(conds.includes('htn')) monitor.push('每週至少測量血壓 2-3 次（晨起與晚間，記錄前 5 分鐘安靜坐位）');
  if(conds.includes('dm')) monitor.push('按醫囑頻率測空腹/餐後血糖，記錄飲食與用藥時間');
  if(conds.includes('lipid')) monitor.push('依專業建議定期復查血脂；維持規律飲食');
  if(conds.includes('obesity')) monitor.push('每週固定時間測體重 1 次，記錄變化趨勢');
  if(conds.includes('cv')) monitor.push('注意胸悶、心悸、運動耐力下降，必要時就醫');
  if(conds.includes('resp')) monitor.push('記錄呼吸困難、咳嗽變化，注意誘發因素');
  if(monitor.length===0) monitor.push('體重、活動量、睡眠、主觀感受');

  // 就醫前準備
  const visitPrep = [
    '近期測量數據（血壓/血糖/體重/症狀記錄）',
    '當前服用藥物清單（不含劑量調整需求由醫師判斷）',
    '症狀變化時間線與誘發因素',
    '希望提問的問題清單',
    '既往檢查報告（影像、化驗）',
    '家屬或照護者陪同（如能）'
  ];

  const lifestyle = [
    '飲食：減鹽、控糖、增加蔬菜與全穀，按專業建議調整',
    '運動：每週中等強度 ≥ 150 分鐘，避免久坐',
    '睡眠：規律作息，目標 7-8 小時',
    '減壓：每日 10 分鐘呼吸或正念練習',
    '戒菸限酒'
  ];

  const family = [
    '幫助規律記錄監測數據',
    '陪同就醫並協助記錄醫囑',
    '提醒服藥時間（不替代專業判斷）',
    '關注情緒變化，及時溝通'
  ];

  const redFlags = [
    '突發胸痛、胸悶、放射至左肩或背部',
    '嚴重呼吸困難或呼吸急促',
    '突然一側肢體無力、口齒不清、面部不對稱',
    '意識模糊、極度疲倦、出冷汗',
    '嚴重低血糖症狀（顫抖、出汗、意識下降）',
    '出現上述任一情況，請立即撥打急救電話'
  ];

  return {score, intensity, freq, conds, monitor, visitPrep, lifestyle, family, redFlags, redFlag, raw:d};
}

function renderChronicFollowupPlanner(r){
  let alert = '';
  if(r.redFlag){
    alert = `<div class="alert alert-danger"><strong>🚨 紅旗症狀提示　</strong>您表示出現可能的緊急症狀，請立即就醫或撥打急救電話（中國大陸：120）。本工具不提供診斷或治療建議。</div>`;
  }
  return reportHeadHTML('慢病隨訪計劃生成器') + alert + `
    <div class="score-card">
      <div>
        <div class="score-num">${r.intensity}</div>
        <div class="score-label">隨訪強度</div>
      </div>
      <div>
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100,r.score)}%"></div></div>
        <div style="margin-top:8px;font-size:13px;color:#555;">建議隨訪頻率：${r.freq}</div>
      </div>
    </div>
    <div class="result-section"><h4>自我監測清單</h4>${listHTML(r.monitor)}</div>
    <div class="result-section"><h4>就醫前準備清單</h4>${listHTML(r.visitPrep)}</div>
    <div class="result-section"><h4>生活方式支持建議</h4>${listHTML(r.lifestyle)}</div>
    <div class="result-section"><h4>家庭支持建議</h4>${listHTML(r.family)}</div>
    <div class="result-section"><h4>紅旗症狀提示</h4>${listHTML(r.redFlags)}</div>
    <div class="result-section"><h4>可列印隨訪計劃表</h4>
      <table class="table">
        <thead><tr><th>項目</th><th>頻率</th><th>備注</th></tr></thead>
        <tbody>
          <tr><td>自我監測</td><td>每天/每週</td><td>按上方清單</td></tr>
          <tr><td>復盤記錄</td><td>每週</td><td>5 分鐘總結</td></tr>
          <tr><td>專業隨訪</td><td>${r.freq}</td><td>含就醫前準備</td></tr>
          <tr><td>生活方式調整</td><td>持續</td><td>逐項落實</td></tr>
        </tbody>
      </table>
    </div>
  ` + reportTailHTML();
}

/* ============================================================
   五、計算函數：Tool 04 服務包配置
   ============================================================ */
function calculateServicePackageConfigurator(d){
  const issues = Array.isArray(d.issues)?d.issues:(d.issues?[d.issues]:[]);
  const goals = Array.isArray(d.goals)?d.goals:(d.goals?[d.goals]:[]);
  const staff = Array.isArray(d.staff)?d.staff:(d.staff?[d.staff]:[]);
  const pop = parseInt(d.population||'0',10);

  // 風險與資源評分
  let risk = issues.length;
  let resource = (d.budget==='high'?2:d.budget==='medium'?1:0) + Math.min(2, Math.floor(staff.length/3));
  let need = risk - resource + (parseInt(d.period)>=6?1:0);

  let pkg, modules, hoursPer100;
  if(need <= 1){
    pkg = '基礎服務包';
    modules = ['健康教育講座（每月 1-2 次）','自評工具與健康提示','月度健康提醒','基礎健康資訊推送'];
    hoursPer100 = '4-6 小時/月';
  } else if(need <= 3){
    pkg = '強化服務包';
    modules = ['健康評估與分層','小組干預（每 2-4 週）','個性化提示與隨訪','季度復評','基礎心理健康教育'];
    hoursPer100 = '10-16 小時/月';
  } else {
    pkg = '綜合服務包';
    modules = ['多專業團隊評估','個案管理','一對一隨訪','小組干預 + 家庭支持','定期復評（每月）','心理健康支持','轉介路徑'];
    hoursPer100 = '20-35 小時/月';
  }

  // 人力配置
  const staffing = [];
  staffing.push('健康管理師（核心）：負責協調、評估、隨訪');
  if(staff.includes('nurse')||need>=2) staffing.push('護士/醫務人員：協助測量與健康宣教');
  if(staff.includes('diet')||issues.includes('obesity')) staffing.push('營養師：飲食評估與指導');
  if(staff.includes('sport')||issues.includes('exercise')) staffing.push('運動指導員：運動處方與小組課');
  if(staff.includes('psy')||issues.includes('stress')||issues.includes('loneliness')) staffing.push('心理諮詢師：壓力與情緒支持');
  if(staff.includes('vol')) staffing.push('志願者：行政協助、活動組織');

  // 服務頻率
  const periodNum = parseInt(d.period||'1',10);
  const freq = periodNum<=1 ? '每月 2-4 次活動 + 每週提醒' :
               periodNum<=3 ? '每月 2-3 次活動 + 季度復評' :
               periodNum<=6 ? '每月 1-2 次活動 + 半年期初/期末評估' :
                              '每月 1-2 次活動 + 季度復評 + 年中年末總結';

  // KPI
  const kpi = [];
  if(goals.includes('literacy')) kpi.push('健康素養前後測提升 ≥ 10 分（百分制）');
  if(goals.includes('lifestyle')) kpi.push('每週 ≥ 150 分鐘運動人群比例提升 ≥ 15 個百分點');
  if(goals.includes('chronic')) kpi.push('血壓/體重控制率改善（按既定目標）');
  if(goals.includes('satisfaction')) kpi.push('滿意度評分 ≥ 4.0/5.0，淨推薦值 ≥ 30');
  if(goals.includes('followup')) kpi.push('隨訪率 ≥ 80%，干預完成率 ≥ 70%');
  if(kpi.length===0) kpi.push('參與率 ≥ 70%，滿意度 ≥ 4.0/5.0');

  // 風險與限制
  const risks = [
    '本工具不提供診斷與治療方案',
    '高需求人群應由專業醫療衛生人員評估',
    '人力估算為基準參考，實際需依當地工資水平與情況調整',
    '隱私保護：避免收集個人敏感資料'
  ];

  // 實施清單
  const checklist = [
    '明確服務目標與覆蓋人群（匿名化）',
    '組建項目組與分工',
    '制定詳細時間表與課程大綱',
    '準備自評與評估工具',
    '建立隱私保護流程',
    '基線評估（前測）',
    '按計劃推進活動',
    '中期復盤與調整',
    '末期評估（後測）與總結報告'
  ];

  return {pkg, modules, hoursPer100, staffing, freq, kpi, risks, checklist, pop, raw:d};
}

function renderServicePackageConfigurator(r){
  return reportHeadHTML('健康服務包配置器') + `
    <div class="score-card">
      <div><div class="score-num" style="font-size:32px;">${r.pkg}</div>
      <div class="score-label">推薦服務包</div></div>
      <div>
        <div style="font-size:14px;color:#555;line-height:1.85;">
          <strong>覆蓋人群：</strong>${r.pop} 人<br>
          <strong>人力估算：</strong>${r.hoursPer100}<br>
          <strong>建議服務頻率：</strong>${r.freq}
        </div>
      </div>
    </div>
    <div class="result-section"><h4>服務內容模塊</h4>${listHTML(r.modules)}</div>
    <div class="result-section"><h4>人力配置建議</h4>${listHTML(r.staffing)}</div>
    <div class="result-section"><h4>預期 KPI</h4>${listHTML(r.kpi)}</div>
    <div class="result-section"><h4>風險與限制</h4>${listHTML(r.risks)}</div>
    <div class="result-section"><h4>實施清單</h4>${listHTML(r.checklist)}</div>
  ` + reportTailHTML();
}

/* ============================================================
   六、計算函數：Tool 05 健康管理儀表板（CSV 解析）
   ============================================================ */
function parseCSVText(text){
  const lines = text.trim().split(/\r?\n/).filter(l=>l.trim().length>0);
  if(lines.length<2) return null;
  const headers = lines[0].split(',').map(h=>h.trim().toLowerCase());
  const rows = [];
  for(let i=1;i<lines.length;i++){
    const cells = lines[i].split(',').map(c=>c.trim());
    if(cells.length<headers.length) continue;
    const obj = {};
    headers.forEach((h,idx)=>obj[h]=cells[idx]);
    rows.push(obj);
  }
  return {headers, rows};
}

function calculateHealthManagementDashboard(d){
  const parsed = parseCSVText(d.csv||'');
  if(!parsed) return {error:'CSV 數據格式無效或為空。請確認包含表頭與至少 1 行數據。'};
  const rows = parsed.rows;
  const total = rows.length;
  if(total===0) return {error:'未解析到任何有效數據行。'};

  // 計數函數
  const count = (key, predicate) => rows.filter(r => predicate(r[key]||'')).length;
  const pct = n => total ? Math.round(n/total*1000)/10 : 0;

  const overweight = count('bmi_category', v=>['overweight','obese'].includes(v.toLowerCase()));
  const bpHigh = count('bp_risk', v=>v.toLowerCase()==='high');
  const lowAct = count('activity_level', v=>v.toLowerCase()==='low');
  const sleepRisk = count('sleep_risk', v=>['medium','high'].includes(v.toLowerCase()));
  const highStress = count('stress_risk', v=>v.toLowerCase()==='high');
  const lowLit = count('health_literacy', v=>v.toLowerCase()==='low');

  // 慢病分布
  const chronicDist = {'0':0,'1':0,'2':0,'3+':0};
  rows.forEach(r=>{
    const c = parseInt(r.chronic_count||'0',10);
    if(isNaN(c)) return;
    if(c===0) chronicDist['0']++;
    else if(c===1) chronicDist['1']++;
    else if(c===2) chronicDist['2']++;
    else chronicDist['3+']++;
  });

  // 年齡段分布
  const ageDist = {};
  rows.forEach(r=>{
    const a = (r.age_group||'unknown').toLowerCase();
    ageDist[a] = (ageDist[a]||0)+1;
  });

  // 風險指標及百分比
  const metrics = [
    {label:'超重/肥胖比例', n:overweight, pct:pct(overweight), key:'overweight'},
    {label:'血壓高風險比例', n:bpHigh, pct:pct(bpHigh), key:'bp_high'},
    {label:'運動不足比例', n:lowAct, pct:pct(lowAct), key:'low_activity'},
    {label:'睡眠風險比例', n:sleepRisk, pct:pct(sleepRisk), key:'sleep_risk'},
    {label:'高壓力比例', n:highStress, pct:pct(highStress), key:'high_stress'},
    {label:'健康素養低比例', n:lowLit, pct:pct(lowLit), key:'low_literacy'}
  ];

  // 前 3 管理優先級（按比例最高）
  const top = [...metrics].sort((a,b)=>b.pct-a.pct).slice(0,3);

  // 群體風險摘要
  let summary = `本群體共 ${total} 人；`;
  if(top[0].pct>30) summary += `${top[0].label}達 ${top[0].pct}%，建議優先干預。`;
  else summary += '各維度均在中低風險範圍。';

  // 服務策略
  const strategy = [];
  top.forEach(t=>{
    if(t.key==='overweight') strategy.push('體重管理：營養指導 + 規律運動小組');
    if(t.key==='bp_high') strategy.push('血壓管理：監測支持 + 限鹽教育 + 建議專業評估');
    if(t.key==='low_activity') strategy.push('運動促進：步數挑戰 + 工間操 + 環境改造');
    if(t.key==='sleep_risk') strategy.push('睡眠教育 + 作息工作坊');
    if(t.key==='high_stress') strategy.push('壓力管理 + 心理健康講座 + EAP 資源');
    if(t.key==='low_literacy') strategy.push('健康素養基礎課程 + 易讀健康資訊');
  });
  if(strategy.length===0) strategy.push('保持目前的健康教育與例行體檢，定期復評');

  // 教育主題
  const topics = [];
  if(top.some(t=>t.key==='overweight')) topics.push('健康飲食 / 體重管理');
  if(top.some(t=>t.key==='bp_high')) topics.push('血壓監測與生活方式');
  if(top.some(t=>t.key==='low_activity')) topics.push('日常活動與運動處方');
  if(top.some(t=>t.key==='sleep_risk')) topics.push('睡眠衛生');
  if(top.some(t=>t.key==='high_stress')) topics.push('壓力與情緒管理');
  if(top.some(t=>t.key==='low_literacy')) topics.push('健康資訊識讀與就醫溝通');
  if(topics.length===0) topics.push('一般健康促進與年度體檢');

  return {total, metrics, chronicDist, ageDist, summary, top, strategy, topics, raw:d};
}

function renderHealthManagementDashboard(r){
  if(r.error){
    return reportHeadHTML('社區/企業健康管理儀表板') +
      `<div class="alert alert-danger"><strong>數據解析錯誤：</strong>${r.error}</div>` +
      reportTailHTML();
  }
  const barRows = r.metrics.map(m=>`
    <div class="bar-row">
      <div class="bar-label">${m.label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${m.pct}%"></div></div>
      <div class="bar-val">${m.pct}% (${m.n})</div>
    </div>`).join('');

  const chronicRows = Object.entries(r.chronicDist).map(([k,v])=>`<tr><td>${k} 種</td><td>${v}</td><td>${r.total?Math.round(v/r.total*1000)/10:0}%</td></tr>`).join('');
  const ageRows = Object.entries(r.ageDist).map(([k,v])=>`<tr><td>${k}</td><td>${v}</td><td>${r.total?Math.round(v/r.total*1000)/10:0}%</td></tr>`).join('');

  return reportHeadHTML('社區/企業健康管理儀表板') + `
    <div class="score-card">
      <div><div class="score-num">${r.total}</div><div class="score-label">總人數</div></div>
      <div><p style="font-size:14px;color:#555;line-height:1.8;">${r.summary}</p></div>
    </div>

    <div class="result-section"><h4>群體健康風險指標</h4>${barRows}</div>

    <div class="result-section"><h4>慢病數量分布</h4>
      <table class="table"><thead><tr><th>慢病數量</th><th>人數</th><th>佔比</th></tr></thead><tbody>${chronicRows}</tbody></table>
    </div>

    <div class="result-section"><h4>年齡段分布</h4>
      <table class="table"><thead><tr><th>年齡段</th><th>人數</th><th>佔比</th></tr></thead><tbody>${ageRows}</tbody></table>
    </div>

    <div class="result-section"><h4>前 3 個管理優先級</h4>${listHTML(r.top.map(t=>`${t.label}（${t.pct}%）`))}</div>
    <div class="result-section"><h4>建議服務策略</h4>${listHTML(r.strategy)}</div>
    <div class="result-section"><h4>建議健康教育主題</h4>${listHTML(r.topics)}</div>
  ` + reportTailHTML();
}

/* ============================================================
   七、計算函數：Tool 06 健康教育干預設計
   ============================================================ */
function calculateHealthEducationDesigner(d){
  const periodMap = {single:1,'2w':2,'4w':4,'8w':8,'12w':12};
  const sessions = periodMap[d.period]||1;

  const topicMap = {
    exercise:{name:'運動促進',msg:'運動是長期健康的關鍵投資',targets:['每週中等強度 ≥ 150 分鐘','減少久坐']},
    diet:{name:'健康飲食',msg:'規律、多樣、適量是飲食的基礎',targets:['每日蔬菜 ≥ 300g','減少加工食品']},
    sleep:{name:'睡眠改善',msg:'規律作息能改善多種健康指標',targets:['每晚 7-8 小時','睡前 1 小時遠離螢幕']},
    stress:{name:'壓力管理',msg:'學習辨識壓力信號並使用簡單放鬆技巧',targets:['每天 10 分鐘呼吸/正念','建立支持網絡']},
    chronic:{name:'慢病風險認知',msg:'慢病可預防，重點在生活方式與監測',targets:['理解主要監測指標','建立生活方式基礎']},
    literacy:{name:'健康素養',msg:'會獲取、判斷與運用健康資訊',targets:['識別權威信息源','學會與醫護有效溝通']},
    weight:{name:'體重管理',msg:'結合飲食、活動、行為改變持續推進',targets:['每週稱重 1 次','學會閱讀食品標籤']},
    mental:{name:'心理健康促進',msg:'情緒健康與身體健康同等重要',targets:['識別情緒信號','建立求助路徑']}
  };
  const topic = topicMap[d.topic] || topicMap.literacy;

  const audienceMap = {
    teen:'青少年（中學）',college:'大學生',worker:'職場人群',older:'中老年',
    chronic:'慢病風險人群',caregiver:'照護者',mixed:'混合人群'
  };
  const settingMap = {
    community:'社區', school:'學校', enterprise:'企業',
    checkup:'體檢中心', elder:'養老機構', online:'線上社群'
  };

  // 課程語言難度
  const tone = d.literacy==='low' ? '使用簡明日常語言、生活化案例與圖示' :
               d.literacy==='high' ? '可加入科學證據與數據解讀' :
               '兼用案例與要點圖示，避免過度專業術語';

  // 課程表
  const schedule = [];
  for(let i=1;i<=sessions;i++){
    let title;
    if(i===1) title = '導入與基線：認識主題、自評、設定個人目標';
    else if(i===sessions) title = '回顧與行動：總結、後測、行動承諾';
    else title = `主題 ${i-1}：${topic.name}核心知識 + 互動實踐`;
    schedule.push({n:i, title, duration:d.duration+' 分鐘'});
  }

  // 互動活動
  const activities = [
    '小組討論：自身經驗分享',
    '行為記錄挑戰（為期 1 週）',
    '健康知識小測驗（即時反饋）',
    '案例分析與角色扮演',
    '同伴打卡 / 配對支持',
    '工具實操（如測量、記錄、APP 演示）'
  ];

  // 前測 / 後測題
  const preQs = [
    `您是否清楚 ${topic.name} 的核心目標？（1-5 分）`,
    `過去一個月，您做到目標行為的頻率？（從不-總是）`,
    `您是否知道權威的健康資訊來源？`,
    `您對自己改善 ${topic.name} 的信心是？（1-10 分）`,
    `當前最大的障礙是什麼？`
  ];
  const postQs = [
    `經過本次干預，您對 ${topic.name} 核心知識的掌握程度？（1-5 分）`,
    `您過去一週是否實踐了相關行為？多少次？`,
    `您是否能識別兩個權威資訊來源？`,
    `您改善 ${topic.name} 的信心變化（1-10 分）`,
    `下一階段最想做出的具體改變是？`
  ];

  // 行為改變任務
  const tasks = topic.targets.map(t=>`執行：${t}（每週復盤 1 次）`);

  // KPI
  const kpi = [
    `出席率 ≥ 80%`,
    `前後測知識正確率提升 ≥ 20%`,
    `行為改變率 ≥ 30%（目標行為達成）`,
    `滿意度 ≥ 4.0/5.0`,
    `60 天後行為保持率 ≥ 50%`
  ];

  // 材料清單
  const materials = [
    '課件（PPT 或卡片）',
    '參與者手冊（包含核心知識、自評、行動表）',
    '前測 / 後測問卷',
    '記錄表格（行為日誌）',
    '簽到表（匿名化）',
    '活動道具（按互動形式而定）'
  ];

  // 障礙對策
  const barrierMap = {
    time:'活動精簡、提供回看資料、彈性場次',
    interest:'結合遊戲化、實物激勵、生活案例',
    knowledge:'分層課程，先建立基礎概念再進階',
    env:'線上+線下混合、提供資源包',
    pressure:'與管理者溝通排期；微行動策略',
    support:'引入同伴小組、建立社群'
  };
  const barrierAdvice = barrierMap[d.barrier] || '靈活調整內容形式以提升參與度';

  const risks = [
    '心理健康相關內容應由專業人員設計與帶領',
    '避免使用標籤化或診斷性語言',
    '尊重個體差異，不強制公開個人健康資訊',
    '為高風險個案提供轉介路徑'
  ];

  return {
    name:`${settingMap[d.setting]}場景｜${audienceMap[d.audience]}｜${topic.name} 干預方案`,
    target:`提升 ${topic.name} 相關知識、態度與行為，降低相關健康風險`,
    coreMsg:topic.msg, tone, schedule, activities, preQs, postQs, tasks, kpi,
    materials, barrierAdvice, risks, raw:d
  };
}

function renderHealthEducationDesigner(r){
  const scheduleTable = `<table class="table">
    <thead><tr><th>場次</th><th>內容</th><th>時長</th></tr></thead>
    <tbody>${r.schedule.map(s=>`<tr><td>${s.n}</td><td>${s.title}</td><td>${s.duration}</td></tr>`).join('')}</tbody>
  </table>`;

  return reportHeadHTML('健康教育干預設計器') + `
    <div class="result-section"><h4>干預名稱</h4><p><strong>${r.name}</strong></p></div>
    <div class="result-section"><h4>干預目標</h4><p>${r.target}</p></div>
    <div class="result-section"><h4>核心信息</h4><p>${r.coreMsg}</p>
      <p style="margin-top:8px;color:#888;font-size:13px;">語言策略：${r.tone}</p>
    </div>
    <div class="result-section"><h4>課程/活動安排表</h4>${scheduleTable}</div>
    <div class="result-section"><h4>每次活動內容（每場通用結構）</h4>${listHTML([
      '0-5 分鐘：簽到 + 暖場',
      `5-${Math.max(15, parseInt(r.raw.duration)-15)} 分鐘：核心內容講解（${r.tone}）`,
      `中段：互動活動（小組討論 / 案例 / 演示）`,
      '末段：要點回顧 + 行動承諾',
      '結束 5 分鐘：問答 + 下次預告'
    ])}</div>
    <div class="result-section"><h4>互動活動建議</h4>${listHTML(r.activities)}</div>
    <div class="result-section"><h4>前測題（共 5 題）</h4>${listHTML(r.preQs)}</div>
    <div class="result-section"><h4>後測題（共 5 題）</h4>${listHTML(r.postQs)}</div>
    <div class="result-section"><h4>行為改變任務</h4>${listHTML(r.tasks)}</div>
    <div class="result-section"><h4>KPI 指標</h4>${listHTML(r.kpi)}</div>
    <div class="result-section"><h4>材料清單</h4>${listHTML(r.materials)}</div>
    <div class="result-section"><h4>障礙對策</h4><p>${r.barrierAdvice}</p></div>
    <div class="result-section"><h4>風險與注意事項</h4>${listHTML(r.risks)}</div>
  ` + reportTailHTML();
}

/* ============================================================
   八、計算函數：Tool 07 服務質量分析
   ============================================================ */
function calculateServiceQualityAnalyzer(d){
  const dims = [
    {key:'d1', label:'服務可及性', items:['d1_1','d1_2','d1_3']},
    {key:'d2', label:'服務效率',   items:['d2_1','d2_2','d2_3']},
    {key:'d3', label:'溝通質量',   items:['d3_1','d3_2','d3_3']},
    {key:'d4', label:'專業信任',   items:['d4_1','d4_2','d4_3']},
    {key:'d5', label:'健康管理效果', items:['d5_1','d5_2','d5_3']},
    {key:'d6', label:'隱私與體驗', items:['d6_1','d6_2','d6_3']}
  ];

  const scores = dims.map(dim=>{
    const vals = dim.items.map(k=>parseInt(d[k]||'0',10));
    const avg = vals.reduce((a,b)=>a+b,0)/vals.length;
    return {key:dim.key, label:dim.label, avg:Math.round(avg*100)/100, pct:Math.round(avg/5*100)};
  });

  const overallPct = Math.round(scores.reduce((a,b)=>a+b.pct,0)/scores.length);
  let level = '重點改進', cls='alert-danger';
  if(overallPct>=90){ level='優秀'; cls='alert'; }
  else if(overallPct>=75){ level='良好'; cls='alert'; }
  else if(overallPct>=60){ level='需改進'; cls='alert-warning'; }

  const weakest = [...scores].sort((a,b)=>a.avg-b.avg).slice(0,3);

  // PDSA
  const pdsa = weakest.map(w=>({
    dim:w.label,
    plan:`針對「${w.label}」設定 4 週改進計劃，明確目標分數提升 ≥ 0.5 分`,
    do:`實施改進措施：流程調整、工作人員培訓、信息公開或環境改造`,
    study:`收集改進前後 2 個月的滿意度數據與用戶反饋對比`,
    act:`如達成目標則制度化，否則重新分析根因並啟動下一輪 PDSA`
  }));

  return {scores, overallPct, level, cls, weakest, pdsa, raw:d};
}

function renderServiceQualityAnalyzer(r){
  const dimRows = r.scores.map(s=>`
    <div class="bar-row">
      <div class="bar-label">${s.label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${s.pct}%"></div></div>
      <div class="bar-val">${s.avg} / 5</div>
    </div>`).join('');

  const pdsaHTML = r.pdsa.map(p=>`
    <div style="margin-bottom:14px;padding:14px;background:#faf7f0;border-left:3px solid #c9a961;">
      <strong>${p.dim}</strong>
      <ul style="margin-top:8px;">
        <li><b>Plan：</b>${p.plan}</li>
        <li><b>Do：</b>${p.do}</li>
        <li><b>Study：</b>${p.study}</li>
        <li><b>Act：</b>${p.act}</li>
      </ul>
    </div>`).join('');

  return reportHeadHTML('健康服務質量與滿意度分析工具') + `
    <div class="score-card">
      <div><div class="score-num">${r.overallPct}<small> / 100</small></div>
      <div class="score-label">${r.level}</div></div>
      <div>
        <div class="progress-bar"><div class="progress-fill" style="width:${r.overallPct}%"></div></div>
        <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11px;color:#888;">
          <span>0</span><span>60</span><span>75</span><span>90</span><span>100</span>
        </div>
      </div>
    </div>
    <div class="result-section"><h4>各維度得分</h4>${dimRows}</div>
    <div class="result-section"><h4>最弱維度（前 3）</h4>${listHTML(r.weakest.map(w=>`${w.label}（${w.avg} / 5）`))}</div>
    <div class="result-section"><h4>服務改進優先級</h4><p>建議按弱項由低到高分輪次改進，每次聚焦 1-2 個維度。</p></div>
    <div class="result-section"><h4>PDSA 改進方案</h4>${pdsaHTML}</div>
    <div class="result-section"><h4>下次評估建議</h4>
      <p>建議 ${r.overallPct<60?'4 週內':'8-12 週內'}進行下一輪滿意度評估，比較改進措施效果。</p>
    </div>
  ` + reportTailHTML();
}

/* ============================================================
   九、計算函數：Tool 08 老年健康支持評估
   ============================================================ */
function calculateOlderAdultSupportAssessment(d){
  let score = 0;
  const factors = [];

  const ageMap = {'60-69':4,'70-79':10,'80+':16};
  score += ageMap[d.age]||0; factors.push({name:'高齡', score:ageMap[d.age]||0});

  if(d.living==='alone') { score+=8; factors.push({name:'獨居',score:8}); }
  if(d.caregiver==='no'){ score+=8; factors.push({name:'缺乏照護者',score:8}); }
  else if(d.caregiver==='occasional'){ score+=4; factors.push({name:'照護不穩定',score:4}); }

  const fallMap={'0':0,'1':6,'2+':12};
  score += fallMap[d.fall]||0; factors.push({name:'跌倒史', score:fallMap[d.fall]||0});

  const gMap={'no':0,'occasional':4,'frequent':8};
  score += gMap[d.gait]||0; factors.push({name:'步態不穩', score:gMap[d.gait]||0});

  if(d.aid==='occasional') score+=2;
  if(d.aid==='frequent') score+=4;

  const hsMap={'yes':0,'partial':3,'no':7};
  score += hsMap[d.home_safe]||0; factors.push({name:'居家安全', score:hsMap[d.home_safe]||0});

  const apMap={'good':0,'medium':3,'poor':7};
  score += apMap[d.appetite]||0; factors.push({name:'食慾差', score:apMap[d.appetite]||0});
  if(d.weight_loss==='yes'){ score+=8; factors.push({name:'體重下降',score:8}); }
  if(d.weight_loss==='unsure') score+=3;

  const dMap={'regular':0,'medium':2,'irregular':5};
  score += dMap[d.diet]||0;
  const slMap={'good':0,'medium':3,'poor':6};
  score += slMap[d.sleep]||0; factors.push({name:'睡眠差', score:slMap[d.sleep]||0});

  const medMap={'0':0,'1-2':2,'3-4':5,'5+':10};
  score += medMap[d.meds]||0; factors.push({name:'多重用藥', score:medMap[d.meds]||0});
  const fgMap={'no':0,'occasional':3,'frequent':7};
  score += fgMap[d.forget]||0; factors.push({name:'忘記服藥', score:fgMap[d.forget]||0});

  const puMap={'clear':0,'medium':3,'unclear':6};
  score += puMap[d.plan_understand]||0;

  const lonMap={'no':0,'occasional':4,'frequent':8};
  score += lonMap[d.lonely]||0; factors.push({name:'孤獨感', score:lonMap[d.lonely]||0});
  const ctMap={'frequent':0,'occasional':3,'rare':6};
  score += ctMap[d.contact]||0;
  const moMap={'no':0,'occasional':4,'frequent':8};
  score += moMap[d.mood]||0; factors.push({name:'情緒低落', score:moMap[d.mood]||0});

  const redFlag = d.red_flag==='yes';
  if(redFlag) score = Math.max(score, 90);

  score = clampScore(score);
  let level, label;
  if(score<25){ level='低支持需求'; label='以自我管理 + 家庭支持為主'; }
  else if(score<50){ level='中等支持需求'; label='增加社區資源與定期關注'; }
  else if(score<75){ level='較高支持需求'; label='建議加強照護安排與專業評估'; }
  else { level='高支持需求'; label='建議專業評估與多方協作支持'; }

  const top = getTopFactors(factors, 4);

  // 建議
  const home = [
    '安裝防滑地墊、扶手、夜燈',
    '清除地面雜物、固定地毯',
    '浴室增加防滑設施',
    '常用物品放在容易拿取的高度'
  ];
  const nutrition = [
    '少量多餐，保證蛋白質攝入',
    '注意水分與纖維',
    '若有吞咽困難請及時告知照護者或醫護',
    '記錄體重變化趨勢'
  ];
  const social = [
    '保持與家人朋友規律聯繫（電話/視頻/見面）',
    '參加社區活動或興趣小組',
    '使用照護者協助維持外出與交流'
  ];
  const caregiverList = [
    '健康狀況變化（食慾、體力、情緒）',
    '近期跌倒或行動變化',
    '服藥情況與不良反應觀察',
    '醫療隨訪安排',
    '居家安全清單檢查'
  ];
  const seekHelp = [
    '突發胸痛、嚴重呼吸困難 → 立即急救',
    '突然肢體無力、口齒不清 → 立即急救（疑似卒中）',
    '嚴重跌倒後劇痛、無法活動 → 立即就醫',
    '意識混亂、行為突變 → 立即就醫',
    '情緒持續低落或有自我傷害想法 → 尋求心理健康專業支持'
  ];

  return {score, level, label, factors, top, home, nutrition, social, caregiverList, seekHelp, redFlag, raw:d};
}

function renderOlderAdultSupportAssessment(r){
  let alert = '';
  if(r.redFlag){
    alert = `<div class="alert alert-danger"><strong>🚨 緊急情況提示　</strong>您表示存在可能的緊急症狀。請立即聯繫家屬並撥打急救電話（中國大陸：120），或前往最近的醫院急診。</div>`;
  }
  return reportHeadHTML('老年健康支持評估工具') + alert + `
    <div class="score-card">
      <div><div class="score-num">${r.score}<small> / 100</small></div>
      <div class="score-label">${r.level}</div></div>
      <div>
        <div class="progress-bar"><div class="progress-fill" style="width:${r.score}%"></div></div>
        <div style="margin-top:8px;font-size:13px;color:#555;">${r.label}</div>
      </div>
    </div>
    <div class="result-section"><h4>主要問題（前 4 項）</h4>${listHTML(r.top.map(t=>`${t.name}（風險權重 ${t.score}）`))}</div>
    <div class="result-section"><h4>居家安全建議</h4>${listHTML(r.home)}</div>
    <div class="result-section"><h4>營養與活動建議</h4>${listHTML(r.nutrition)}</div>
    <div class="result-section"><h4>社會支持建議</h4>${listHTML(r.social)}</div>
    <div class="result-section"><h4>照護者溝通清單</h4>${listHTML(r.caregiverList)}</div>
    <div class="result-section"><h4>建議尋求專業幫助的情況</h4>${listHTML(r.seekHelp)}</div>
  ` + reportTailHTML();
}

/* ============================================================
   十、計算函數：Tool 09 轉介與服務導航
   ============================================================ */
function calculateReferralNavigationTool(d){
  const concerns = Array.isArray(d.concerns)?d.concerns:(d.concerns?[d.concerns]:[]);
  const urgent = Array.isArray(d.urgent)?d.urgent:(d.urgent?[d.urgent]:[]);
  const resources = Array.isArray(d.resources)?d.resources:(d.resources?[d.resources]:[]);

  const realUrgent = urgent.filter(u=>u && u!=='none');
  const hasSelfHarm = realUrgent.includes('self_harm');

  // 緊急優先
  if(realUrgent.length>0){
    return {
      level:'緊急服務優先',
      cls:'alert-danger',
      reason:'您報告了可能的緊急風險信號，需要立即尋求專業幫助。',
      types:[
        '撥打急救電話（中國大陸：120 / 報警 110）',
        '前往最近醫院急診科',
        hasSelfHarm ? '心理危機熱線（如北京 010-82951332）/ 24 小時心理援助' : '聯繫信任的家人朋友陪同就醫'
      ],
      prep:[
        '攜帶身份證、醫保卡、近期病歷或用藥清單',
        '保留現場狀態，避免擅自移動嚴重傷患',
        '盡量描述發病時間、前驅症狀、伴隨表現'
      ],
      monitor:[
        '症狀加重、意識變化',
        '出血、呼吸或循環變化',
        '情緒進一步惡化'
      ],
      escalate:[
        '症狀持續或加劇、出現新症狀',
        '家屬無法陪同或被拒絕就醫',
        '心理危機未能緩解'
      ],
      hasSelfHarm,
      raw:d
    };
  }

  // 非緊急分級
  let score = concerns.length;
  if(d.duration==='gt1m') score+=2;
  if(d.duration==='years') score+=3;
  if(d.impact==='moderate') score+=2;
  if(d.impact==='severe') score+=4;
  if(concerns.includes('mood')||concerns.includes('stress')) score+=1;
  if(resources.includes('none')||resources.includes('unsure')) score+=1;

  let level, cls, reason, types;
  if(score<=2){
    level='自我管理與健康教育';
    cls='alert';
    reason='問題持續時間較短、影響有限，可優先嘗試自我管理與健康教育資源。';
    types=['本工具包中的個人健康路徑生成器','社區健康教育活動','權威健康資訊網站'];
  } else if(score<=5){
    level='常規健康服務';
    cls='alert';
    reason='問題具有一定持續性或影響，建議使用常規健康服務獲取進一步支持。';
    types=['社區衛生服務中心','體檢中心或健康管理機構','線上健康諮詢（合規平台）','慢病門診（如已知慢病）'];
  } else if(score<=8){
    level='建議專業評估';
    cls='alert-warning';
    reason='問題持續時間長或對生活有明顯影響，建議由專業人員進行評估。';
    types=['綜合醫院相關專科','心理健康專業機構（如涉及情緒/壓力）','慢病管理專科','營養/運動專科診所'];
  } else {
    level='多方支持與個案管理建議';
    cls='alert-warning';
    reason='您的情況涉及多個維度且影響較大，建議建立多方協作的支持體系。';
    types=['由健康管理師或個案管理師統籌','多專業團隊（醫療 + 心理 + 社工）','家庭支持會議','建立持續隨訪計劃'];
  }

  // 心理健康謹慎標注
  const mentalCaution = concerns.includes('mood')||concerns.includes('stress');

  const prep = [
    '記錄症狀出現時間、頻率、誘發因素',
    '準備既往病史、檢查報告、用藥清單',
    '寫下 3-5 個希望解答的問題',
    '盡量由家屬或朋友陪同'
  ];
  const monitor = [
    '症狀變化（強度、頻率）',
    '對工作/學習/家庭的影響程度',
    '睡眠、食慾、情緒變化',
    '出現緊急風險信號時立即升級'
  ];
  const escalate = [
    '症狀加重或持續超過 2 週仍無改善',
    '影響擴大至基本生活',
    '出現本工具列出的緊急風險信號',
    '心理困擾出現自我傷害想法'
  ];

  return {level, cls, reason, types, prep, monitor, escalate, mentalCaution, hasSelfHarm:false, raw:d};
}

function renderReferralNavigationTool(r){
  let alert = '';
  if(r.cls==='alert-danger'){
    alert = `<div class="alert alert-danger"><strong>🚨 緊急服務優先　</strong>${r.reason}</div>`;
  } else if(r.mentalCaution){
    alert = `<div class="alert alert-warning"><strong>💙 心理健康提示　</strong>您的困擾涉及壓力或情緒，請特別留意自身狀態。如出現自我傷害想法或情緒急劇惡化，請立即尋求專業心理健康支持或撥打心理援助熱線。</div>`;
  }

  return reportHeadHTML('轉介與服務導航工具') + alert + `
    <div class="score-card">
      <div><div class="score-num" style="font-size:24px;">${r.level}</div>
      <div class="score-label">建議服務導航級別</div></div>
      <div><p style="font-size:14px;color:#555;line-height:1.85;">${r.reason}</p></div>
    </div>
    <div class="result-section"><h4>為什麼得到這個建議</h4><p>${r.reason}</p></div>
    <div class="result-section"><h4>可考慮的服務類型</h4>${listHTML(r.types)}</div>
    <div class="result-section"><h4>就診或諮詢前準備清單</h4>${listHTML(r.prep)}</div>
    <div class="result-section"><h4>自我管理期間需要觀察的信號</h4>${listHTML(r.monitor)}</div>
    <div class="result-section"><h4>何時升級求助</h4>${listHTML(r.escalate)}</div>
  ` + reportTailHTML();
}

/* ============================================================
   十一、計算函數：Tool 10 成本與人力估算
   ============================================================ */
/*
  成本估算公式（可調整）：
  -----------------------------------------------
  N = 參與人數
  P = 項目週期（月）
  intensity_factor: low=0.7, medium=1.0, high=1.4

  健康管理師工時（小時）:
    base = 0.5 * N (含初始評估、隨訪協調)
    if initial=yes: + 0.5 * N
    if final=yes:   + 0.4 * N
    if report=yes:  + 0.3 * N
    if reminder=yes:+ 0.05 * N * P
    + 一對一隨訪人力（若 oneone=yes）：N * sessions * (duration/60)

  護士/醫務人員工時：
    if initial=yes: 0.3 * N
    if chronic 類項目額外加 0.2 * N * P

  專家工時：
    if group=yes: group_sessions * (group_duration/60) * 1（一名專家帶課）
    + 0.1 * N (材料/方案審核)

  行政工時：
    0.3 * N + 5 * P （日常運營）

  全部乘以 intensity_factor
  -----------------------------------------------
*/
function calculateHealthProgramCostEstimator(d){
  const N = parseInt(d.participants||'0',10) || 0;
  const P = parseInt(d.period||'1',10) || 1;
  const intensityFactor = d.intensity==='low'?0.7:d.intensity==='high'?1.4:1.0;
  const yes = v => v==='yes';

  // 工時計算
  let mgrHrs = 0.5 * N;
  if(yes(d.initial)) mgrHrs += 0.5 * N;
  if(yes(d.final))   mgrHrs += 0.4 * N;
  if(yes(d.report))  mgrHrs += 0.3 * N;
  if(yes(d.reminder))mgrHrs += 0.05 * N * P;
  if(yes(d.oneone)){
    const oo_d = parseInt(d.oneone_duration||'0',10);
    const oo_s = parseInt(d.oneone_sessions||'0',10);
    mgrHrs += N * oo_s * (oo_d/60);
  }

  let nurseHrs = 0;
  if(yes(d.initial)) nurseHrs += 0.3 * N;
  if(d.program_type==='chronic') nurseHrs += 0.2 * N * P;

  let expertHrs = 0;
  if(yes(d.group)){
    const g_d = parseInt(d.group_duration||'0',10);
    const g_s = parseInt(d.group_sessions||'0',10);
    expertHrs += g_s * (g_d/60);
  }
  expertHrs += 0.1 * N;

  let adminHrs = 0.3 * N + 5 * P;

  // 強度乘子
  mgrHrs *= intensityFactor;
  nurseHrs *= intensityFactor;
  expertHrs *= intensityFactor;
  adminHrs *= intensityFactor;

  // 成本
  const r_mgr = parseFloat(d.rate_manager||'0');
  const r_nurse = parseFloat(d.rate_nurse||'0');
  const r_expert = parseFloat(d.rate_expert||'0');
  const r_admin = parseFloat(d.rate_admin||'0');

  const cost_mgr = mgrHrs * r_mgr;
  const cost_nurse = nurseHrs * r_nurse;
  const cost_expert = expertHrs * r_expert;
  const cost_admin = adminHrs * r_admin;

  const personnel = cost_mgr + cost_nurse + cost_expert + cost_admin;
  const material = parseFloat(d.material||'0');
  const venue = parseFloat(d.venue||'0');
  const other = parseFloat(d.other||'0');
  const nonPersonnel = material + venue + other;
  const total = personnel + nonPersonnel;
  const perPerson = N>0 ? total/N : 0;

  // 三種情景
  const scenarios = [
    {name:'保守情景', factor:0.85},
    {name:'基準情景', factor:1.00},
    {name:'充足情景', factor:1.20}
  ].map(s=>({...s, total: total*s.factor, perPerson: perPerson*s.factor}));

  const round = n => Math.round(n*100)/100;

  // 人力配置建議
  const staffing = [
    `健康管理師工時：${round(mgrHrs)} 小時（成本 ${round(cost_mgr)}）`,
    `護士/醫務人員工時：${round(nurseHrs)} 小時（成本 ${round(cost_nurse)}）`,
    `專家或顧問工時：${round(expertHrs)} 小時（成本 ${round(cost_expert)}）`,
    `行政人員工時：${round(adminHrs)} 小時（成本 ${round(cost_admin)}）`
  ];

  // 控本建議
  const tips = [
    '小組課程比一對一隨訪更具成本效益，可優先考慮',
    '使用線上提醒可顯著降低人力成本',
    '材料數位化可降低印刷與物流費用',
    '與其他健康項目共享場地與行政資源',
    '志願者與同伴支持可作為低成本補充（注意培訓與督導）'
  ];

  return {
    N, P, intensity:d.intensity, intensityFactor,
    hours:{
      manager:round(mgrHrs), nurse:round(nurseHrs),
      expert:round(expertHrs), admin:round(adminHrs)
    },
    costs:{
      manager:round(cost_mgr), nurse:round(cost_nurse),
      expert:round(cost_expert), admin:round(cost_admin),
      personnel:round(personnel), material, venue, other,
      nonPersonnel:round(nonPersonnel),
      total:round(total), perPerson:round(perPerson)
    },
    scenarios:scenarios.map(s=>({...s, total:round(s.total), perPerson:round(s.perPerson)})),
    staffing, tips, raw:d
  };
}

function renderHealthProgramCostEstimator(r){
  const c = r.costs;
  const fmt = n => n.toLocaleString('zh-CN', {maximumFractionDigits:2});

  const scenarioRows = r.scenarios.map(s=>`
    <tr><td>${s.name} (×${s.factor})</td><td>${fmt(s.total)}</td><td>${fmt(s.perPerson)}</td></tr>
  `).join('');

  const costRows = `
    <tr><td>健康管理師</td><td>${r.hours.manager}</td><td>${fmt(c.manager)}</td></tr>
    <tr><td>護士/醫務</td><td>${r.hours.nurse}</td><td>${fmt(c.nurse)}</td></tr>
    <tr><td>專家/顧問</td><td>${r.hours.expert}</td><td>${fmt(c.expert)}</td></tr>
    <tr><td>行政</td><td>${r.hours.admin}</td><td>${fmt(c.admin)}</td></tr>
    <tr style="font-weight:700;background:#faf7f0;"><td>人力小計</td><td>—</td><td>${fmt(c.personnel)}</td></tr>
    <tr><td>材料</td><td>—</td><td>${fmt(c.material)}</td></tr>
    <tr><td>平台/場地</td><td>—</td><td>${fmt(c.venue)}</td></tr>
    <tr><td>其他固定</td><td>—</td><td>${fmt(c.other)}</td></tr>
    <tr style="font-weight:700;background:#faf7f0;"><td>非人力小計</td><td>—</td><td>${fmt(c.nonPersonnel)}</td></tr>
  `;

  return reportHeadHTML('健康項目成本與人力估算器') + `
    <div class="score-card">
      <div><div class="score-num">${fmt(c.total)}</div>
      <div class="score-label">項目總成本（基準）</div></div>
      <div>
        <div style="font-size:14px;color:#555;line-height:1.9;">
          <strong>每名參與者成本：</strong>${fmt(c.perPerson)}<br>
          <strong>參與人數：</strong>${r.N} 人<br>
          <strong>項目週期：</strong>${r.P} 個月<br>
          <strong>服務強度：</strong>${r.intensity}（×${r.intensityFactor}）
        </div>
      </div>
    </div>

    <div class="result-section"><h4>各類人員工時與成本構成</h4>
      <table class="table">
        <thead><tr><th>類別</th><th>工時 (小時)</th><th>金額</th></tr></thead>
        <tbody>${costRows}
          <tr style="font-weight:800;background:#fdfaf0;"><td>項目總成本</td><td>—</td><td>${fmt(c.total)}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="result-section"><h4>三種預算情景</h4>
      <table class="table">
        <thead><tr><th>情景</th><th>總成本</th><th>每人成本</th></tr></thead>
        <tbody>${scenarioRows}</tbody>
      </table>
    </div>

    <div class="result-section"><h4>人力配置建議</h4>${listHTML(r.staffing)}</div>
    <div class="result-section"><h4>成本控制建議</h4>${listHTML(r.tips)}</div>
  ` + reportTailHTML();
}

/* ============================================================
   十二、表單事件綁定（DOMContentLoaded）
   ============================================================ */
document.addEventListener('DOMContentLoaded', ()=>{

  // ---- 工具註冊表 ----
  const tools = [
    {id:'health-service-stratifier',     calc:calculateHealthServiceStratifier,     render:renderHealthServiceStratifier,     name:'健康服務需求分層工具'},
    {id:'personal-health-pathway',       calc:calculatePersonalHealthPathway,       render:renderPersonalHealthPathway,       name:'個人健康管理路徑生成器'},
    {id:'chronic-followup-planner',      calc:calculateChronicFollowupPlanner,      render:renderChronicFollowupPlanner,      name:'慢病隨訪計劃生成器'},
    {id:'service-package-configurator',  calc:calculateServicePackageConfigurator,  render:renderServicePackageConfigurator,  name:'健康服務包配置器'},
    {id:'health-management-dashboard',   calc:calculateHealthManagementDashboard,   render:renderHealthManagementDashboard,   name:'社區/企業健康管理儀表板'},
    {id:'health-education-designer',     calc:calculateHealthEducationDesigner,     render:renderHealthEducationDesigner,     name:'健康教育干預設計器'},
    {id:'service-quality-analyzer',      calc:calculateServiceQualityAnalyzer,      render:renderServiceQualityAnalyzer,      name:'健康服務質量與滿意度分析工具'},
    {id:'older-adult-support-assessment',calc:calculateOlderAdultSupportAssessment, render:renderOlderAdultSupportAssessment, name:'老年健康支持評估工具'},
    {id:'referral-navigation-tool',      calc:calculateReferralNavigationTool,      render:renderReferralNavigationTool,      name:'轉介與服務導航工具'},
    {id:'health-program-cost-estimator', calc:calculateHealthProgramCostEstimator,  render:renderHealthProgramCostEstimator,  name:'健康項目成本與人力估算器'}
  ];

  tools.forEach(t=>{
    const formId = 'form-'+t.id;
    const resultId = 'result-'+t.id;
    const form = document.getElementById(formId);
    if(!form) return;

    form.addEventListener('submit', e=>{
      e.preventDefault();
      clearError(form);
      const data = collectFormData(formId);
      try{
        const result = t.calc(data);
        const html = t.render(result);
        renderResult(resultId, html);
        _lastReportData[t.id] = {meta:createReportMeta(t.name), input:data, result};
      }catch(err){
        console.error(err);
        showError(form, '計算發生錯誤：'+err.message);
      }
    });

    // 匯出 JSON
    const jsonBtn = form.querySelector('[data-export-json]');
    if(jsonBtn){
      jsonBtn.addEventListener('click', ()=>{
        const data = _lastReportData[t.id];
        if(!data){ alert('請先生成報告'); return; }
        exportJSON(data, `${t.id}-${getCurrentDateTime().replace(/[: ]/g,'-')}.json`);
      });
    }

    // 匯出 CSV（針對工具 5 / 10）
    const csvBtn = form.querySelector('[data-export-csv]');
    if(csvBtn){
      csvBtn.addEventListener('click', ()=>{
        const data = _lastReportData[t.id];
        if(!data){ alert('請先生成報告'); return; }
        if(t.id==='health-management-dashboard'){
          const r = data.result;
          if(r.error){ alert('當前無有效數據可匯出'); return; }
          const rows = [
            ['指標','人數','百分比(%)']
          ];
          r.metrics.forEach(m=>rows.push([m.label, m.n, m.pct]));
          rows.push(['---','---','---']);
          rows.push(['慢病數量','人數','百分比(%)']);
          Object.entries(r.chronicDist).forEach(([k,v])=>{
            rows.push([k+'種', v, r.total?Math.round(v/r.total*1000)/10:0]);
          });
          rows.push(['---','---','---']);
          rows.push(['年齡段','人數','百分比(%)']);
          Object.entries(r.ageDist).forEach(([k,v])=>{
            rows.push([k, v, r.total?Math.round(v/r.total*1000)/10:0]);
          });
          exportCSV(rows, `health-dashboard-${getCurrentDateTime().replace(/[: ]/g,'-')}.csv`);
        } else if(t.id==='health-program-cost-estimator'){
          const r = data.result;
          const c = r.costs;
          const rows = [
            ['類別','工時(小時)','金額'],
            ['健康管理師', r.hours.manager, c.manager],
            ['護士/醫務', r.hours.nurse, c.nurse],
            ['專家/顧問', r.hours.expert, c.expert],
            ['行政', r.hours.admin, c.admin],
            ['人力小計','—', c.personnel],
            ['材料','—', c.material],
            ['平台/場地','—', c.venue],
            ['其他固定','—', c.other],
            ['非人力小計','—', c.nonPersonnel],
            ['項目總成本','—', c.total],
            ['每人成本','—', c.perPerson],
            ['---','---','---'],
            ['情景','總成本','每人成本']
          ];
          r.scenarios.forEach(s=>rows.push([s.name+' (×'+s.factor+')', s.total, s.perPerson]));
          exportCSV(rows, `health-program-cost-${getCurrentDateTime().replace(/[: ]/g,'-')}.csv`);
        }
      });
    }
  });

  // 載入儀表板示例數據
  const sampleBtn = document.getElementById('dashboard-load-sample');
  if(sampleBtn){
    sampleBtn.addEventListener('click', ()=>{
      const sample = `age_group,bmi_category,bp_risk,activity_level,sleep_risk,stress_risk,health_literacy,chronic_count
30-44,normal,low,medium,low,medium,medium,0
45-59,overweight,high,low,medium,high,low,1
45-59,obese,high,low,high,high,low,2
30-44,overweight,medium,low,medium,medium,medium,0
60-74,overweight,high,low,medium,medium,low,2
60-74,normal,medium,medium,medium,low,medium,1
18-29,normal,low,high,low,medium,high,0
30-44,obese,high,low,high,high,low,1
45-59,overweight,medium,low,medium,high,medium,1
60-74,overweight,high,low,high,medium,low,3
75+,normal,high,low,medium,low,low,2
45-59,normal,low,medium,medium,medium,high,0
30-44,overweight,medium,medium,medium,high,medium,0
60-74,obese,high,low,high,high,low,2
45-59,overweight,high,low,medium,high,low,1`;
      const ta = document.querySelector('#form-health-management-dashboard textarea[name="csv"]');
      if(ta) ta.value = sample;
    });
  }

  // 預設顯示首頁
  showToolkitHome();
});
