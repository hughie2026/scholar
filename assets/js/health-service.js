/* ============================================================
 * Health Service Analysis Toolkit
 * Hughie's Online Lab
 * ============================================================ */
(function () {
  'use strict';

  // ---------- Tab switching ----------
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tool-panel');
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    t.classList.add('active');
    document.querySelector(`.tool-panel[data-panel="${t.dataset.tab}"]`).classList.add('active');
    window.scrollTo({ top: document.querySelector('.tools-section').offsetTop - 60, behavior: 'smooth' });
  }));

  // ---------- Toast ----------
  const toast = document.getElementById('toast');
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  // ---------- Helpers ----------
  function num(id, def = 0) {
    const v = parseFloat(document.getElementById(id).value);
    return isNaN(v) ? def : v;
  }
  function val(id) { return document.getElementById(id).value; }
  function getRadio(name) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : null;
  }
  function getChecks(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(e => e.value);
  }
  function fmt(n, d = 0) {
    if (!isFinite(n)) return '--';
    return Number(n).toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function pct(n) { return (n * 100).toFixed(1) + '%'; }

  // Render a result block (common skeleton)
  function renderResult(containerId, html) {
    const el = document.getElementById(containerId);
    el.innerHTML = html + `
      <div class="form-nav" style="margin-top:8px;">
        <button type="button" class="btn-ghost-dark copy-btn">📋 一鍵複製報告</button>
        <button type="button" class="btn-ghost-dark" onclick="window.print()">🖨️ 打印 / PDF</button>
      </div>`;
    el.classList.add('show');
    el.querySelector('.copy-btn').addEventListener('click', () => {
      const text = el.querySelector('.report-block')?.innerText || el.innerText;
      navigator.clipboard.writeText(text).then(() => showToast('已複製到剪貼板'));
    });
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ============================================================
  // 01 需求分析
  // ============================================================
  function analyzeNeeds() {
    const pop = num('n_population');
    const region = val('n_region');
    const elderly = num('n_elderly');
    const chronic = num('n_chronic');
    const coverage = num('n_coverage');
    const issues = getChecks('n_issue');
    const econ = getRadio('n_econ');

    if (!pop || pop < 1) return showToast('請輸入目標人群規模');
    if (issues.length === 0) return showToast('請至少選擇 1 項主要健康問題');

    // 区域系数：偏远 / 农村人群相对需求更高
    const regionFactor = { urban: 1.0, rural: 1.15, mixed: 1.05, remote: 1.25 }[region];
    const econFactor = { low: 1.2, medium: 1.0, high: 0.9 }[econ];
    const gap = Math.max(0, (100 - coverage) / 100); // 服务缺口
    const burdenIndex = (chronic * 0.5 + elderly * 0.5) / 100; // 疾病负担指数 0-1

    // 综合需求评分（0-100）
    const score = Math.min(100, Math.round((30 + burdenIndex * 50 + gap * 25 + (issues.length - 1) * 3) * regionFactor * econFactor));
    let level = '低', levelColor = '';
    if (score >= 75) { level = '高'; levelColor = 'danger'; }
    else if (score >= 55) { level = '中-高'; levelColor = 'warn'; }
    else if (score >= 35) { level = '中等'; }
    else { level = '較低'; }

    // 估算服务量（基于经验系数）
    const chronicPatients = Math.round(pop * chronic / 100);
    const elderlyPop = Math.round(pop * elderly / 100);
    const annualVisits = Math.round(pop * (1.5 + burdenIndex * 3) * regionFactor); // 年门诊量估计
    const followupVisits = Math.round(chronicPatients * 4); // 慢病随访量
    const educationSessions = Math.max(12, Math.round(pop / 1000) * 4); // 健康教育场次

    // 优先级排序逻辑
    const priorityMap = {
      '慢病管理': chronic * 1.2 + elderly * 0.5,
      '老年照護': elderly * 1.5,
      '婦幼保健': econ === 'low' ? 25 : 15,
      '心理健康': 18,
      '傳染病防控': region === 'remote' || region === 'rural' ? 22 : 14,
      '健康行為': 15
    };
    const priorities = issues.map(i => ({ name: i, weight: priorityMap[i] || 10 }))
      .sort((a, b) => b.weight - a.weight);

    const recommendedPackage = [];
    if (issues.includes('慢病管理')) recommendedPackage.push('家庭醫生簽約 + 慢病分級隨訪');
    if (issues.includes('老年照護')) recommendedPackage.push('老年人健康體檢（每年 1 次） + 失能評估');
    if (issues.includes('婦幼保健')) recommendedPackage.push('孕產婦系統管理 + 0-6 歲兒童保健');
    if (issues.includes('心理健康')) recommendedPackage.push('社區心理篩查 + 轉診綠色通道');
    if (issues.includes('傳染病防控')) recommendedPackage.push('預防接種 + 傳染病監測上報');
    if (issues.includes('健康行為')) recommendedPackage.push('健康促進活動 + 健康自管理小組');

    const html = `
      <div class="method-card">
        <div class="method-eyebrow">RECOMMENDED PRIORITY</div>
        <h3 class="method-name">綜合需求等級：${level}</h3>
        <div class="method-en">Comprehensive Need Score = ${score} / 100</div>
        <p class="method-summary">
          基於人群規模 ${fmt(pop)} 人、慢病患病率 ${chronic}%、老年比例 ${elderly}%、
          現有服務覆蓋率 ${coverage}% 的綜合測算，該人群的健康服務需求等級為
          <strong>${level}</strong>。建議將「<strong>${priorities[0].name}</strong>」作為首要服務方向。
        </p>
        <div class="alt-list">
          ${priorities.map((p, i) => `<span class="tag ${i === 0 ? 'gold' : ''}">${i + 1}. ${p.name}</span>`).join('')}
        </div>
      </div>

      <div class="result-section">
        <h3>🧾 你的選擇摘要</h3>
        <div class="summary-grid">
          <div class="summary-item"><div class="summary-label">人群規模</div><div class="summary-value">${fmt(pop)} 人</div></div>
          <div class="summary-item"><div class="summary-label">區域類型</div><div class="summary-value">${{urban:'城市',rural:'農村',mixed:'城鄉結合',remote:'偏遠'}[region]}</div></div>
          <div class="summary-item"><div class="summary-label">慢病患者估計</div><div class="summary-value">${fmt(chronicPatients)} 人</div></div>
          <div class="summary-item"><div class="summary-label">老年人口估計</div><div class="summary-value">${fmt(elderlyPop)} 人</div></div>
          <div class="summary-item"><div class="summary-label">服務缺口</div><div class="summary-value">${(gap * 100).toFixed(0)}%</div></div>
        </div>
      </div>

      <div class="result-section">
        <h3>📊 年度服務量估算</h3>
        <ul>
          <li>預計年門診量：<code>${fmt(annualVisits)}</code> 人次</li>
          <li>慢病隨訪量：<code>${fmt(followupVisits)}</code> 人次（${fmt(chronicPatients)} 人 × 4 次/年）</li>
          <li>健康教育場次：<code>${fmt(educationSessions)}</code> 場/年</li>
          <li>建議重點覆蓋人群：老年人（${fmt(elderlyPop)} 人）+ 慢病患者（${fmt(chronicPatients)} 人）</li>
        </ul>
      </div>

      <div class="result-section">
        <h3>✅ 推薦服務包</h3>
        <ul>
          ${recommendedPackage.map(p => `<li>${p}</li>`).join('')}
          <li><em>所有服務均應結合家庭醫生簽約服務開展，並建立電子健康檔案。</em></li>
        </ul>
      </div>

      <div class="result-section">
        <h3>📋 需求分析報告（可複製）</h3>
        <div class="report-block">【健康服務需求分析報告】
目標人群規模：${fmt(pop)} 人 | 區域類型：${{urban:'城市',rural:'農村',mixed:'城鄉結合',remote:'偏遠'}[region]}
人群結構：≥65 歲 ${elderly}% | 慢病患病率 ${chronic}% | 現有服務覆蓋 ${coverage}%
————————————————————————
綜合需求評分：${score} / 100（${level} 需求）
首要服務方向：${priorities[0].name}
次要方向：${priorities.slice(1).map(p => p.name).join('、') || '無'}
————————————————————————
年度服務量估算：
- 門診量：${fmt(annualVisits)} 人次
- 慢病隨訪：${fmt(followupVisits)} 人次
- 健康教育：${fmt(educationSessions)} 場
————————————————————————
建議服務包：
${recommendedPackage.map((p, i) => (i + 1) + '. ' + p).join('\n')}</div>
      </div>

      <div class="result-section">
        <h3>⚠️ 注意事項</h3>
        <ul>
          <li>實際需求應結合<strong>實地調查</strong>（KAP 調查、入戶訪談）進一步確認</li>
          <li>慢病患病率建議使用最近 3 年的監測數據而非自報數據</li>
          <li>服務量估算為參考值，受季節、突發公共衛生事件影響較大</li>
          <li>應關注<em>未診斷</em>的潛在患者群體，建議開展機會性篩查</li>
        </ul>
      </div>

      <div class="result-section disclaimer">
        <strong>免責聲明　</strong>本工具基於常用公衛經驗系數估算，實際規劃應結合本地衛生統計年鑑、財政能力及上級主管部門指導意見。
      </div>
    `;
    renderResult('needsResult', html);
  }

  // ============================================================
  // 02 慢病随访
  // ============================================================
  function analyzeFollowup() {
    const disease = getRadio('f_disease');
    const grade = getRadio('f_grade');
    const control = getRadio('f_control');
    const patients = num('f_patients');
    const age = val('f_age');
    const comorb = getChecks('f_comorb').filter(c => c !== 'none');

    if (!patients || patients < 1) return showToast('請輸入患者人數');

    const diseaseInfo = {
      hypertension: { name: '高血壓', en: 'Hypertension Management',
        items: ['測量血壓（每次 2 次取均值）', '心率', '體重 / BMI', '用藥依從性詢問', '生活方式詢問（鈉攝入、運動、煙酒）'],
        annualLab: '血脂、空腹血糖、尿常規、心電圖（每年 1 次）'
      },
      diabetes: { name: '2 型糖尿病', en: 'Type 2 Diabetes Management',
        items: ['空腹血糖 / 隨機血糖', '症狀詢問（多飲、多尿、低血糖事件）', '體重 / 腰圍', '用藥情況', '足部檢查'],
        annualLab: 'HbA1c（每 3-6 個月）、血脂、肝腎功、尿微量白蛋白、眼底（每年）'
      },
      chd: { name: '冠心病', en: 'Coronary Heart Disease Management',
        items: ['心絞痛發作頻率', '血壓 / 心率', '用藥依從性（抗血小板、他汀）', '活動耐力評估'],
        annualLab: '血脂（每 3 個月直至達標）、心電圖、必要時 BNP'
      },
      copd: { name: '慢阻肺', en: 'COPD Management',
        items: ['咳嗽 / 咳痰 / 氣促評估（mMRC）', 'CAT 評分', '急性加重次數', '吸入裝置使用培訓'],
        annualLab: '肺功能（每年 1 次）、血氧飽和度'
      },
      stroke: { name: '腦卒中後管理', en: 'Post-Stroke Management',
        items: ['神經功能評估（NIHSS / mRS）', '吞嚥功能', '血壓 / 血糖 / 血脂', '康復進展', '抗血小板用藥'],
        annualLab: '頸動脈超聲、心電圖、凝血功能'
      },
      ckd: { name: '慢性腎病', en: 'Chronic Kidney Disease',
        items: ['血壓', '水腫情況', '尿量', '飲食依從性（低鹽低蛋白）', '用藥（避免腎毒性藥物）'],
        annualLab: 'eGFR、尿蛋白定量、電解質、血紅蛋白（每 3-6 個月）'
      }
    }[disease];

    // 随访频率（次/年）
    let freqMap = {
      '1': { good: 4, poor: 6, unstable: 8 },
      '2': { good: 6, poor: 10, unstable: 12 },
      '3': { good: 12, poor: 16, unstable: 24 }
    };
    let freq = freqMap[grade][control];
    if (age === 'elderly') freq = Math.round(freq * 1.15);
    if (comorb.length >= 2) freq += 2;

    const intervalDays = Math.round(365 / freq);
    const totalVisits = patients * freq;
    const referralRate = control === 'unstable' ? 0.15 : control === 'poor' ? 0.08 : 0.03;
    const referrals = Math.round(patients * referralRate);

    // 干预措施
    const interventions = ['規範用藥指導與依從性監測', '生活方式干預（飲食、運動、戒煙限酒）', '健康自管理技能培訓'];
    if (comorb.includes('hyperlipidemia')) interventions.push('血脂管理：他汀類藥物 + 低脂飲食');
    if (comorb.includes('obesity')) interventions.push('體重管理：BMI 目標 18.5-23.9，腰圍男&lt;90cm 女&lt;85cm');
    if (comorb.includes('smoking')) interventions.push('戒煙干預：5A 法（詢問、勸告、評估、幫助、安排）');
    if (comorb.includes('depression')) interventions.push('心理篩查（PHQ-9）+ 必要時轉診');
    if (comorb.includes('kidney')) interventions.push('腎功能保護：避免 NSAIDs、控制蛋白攝入');

    const transferCriteria = {
      hypertension: ['血壓持續 ≥180/110 mmHg', '出現靶器官損害', '懷疑繼發性高血壓', '妊娠合併高血壓'],
      diabetes: ['空腹血糖 ≥16.7 mmol/L 或反復低血糖', 'DKA / 高滲狀態', '足部潰瘍 / 視網膜病變進展', '腎功能急劇惡化'],
      chd: ['心絞痛頻發或加重', '心衰加重', '心電圖新發改變', '懷疑急性冠脈綜合徵'],
      copd: ['急性加重需住院', '呼吸衰竭', 'SpO₂ &lt; 90%', '咯血'],
      stroke: ['症狀復發或加重', '深靜脈血栓', '癲癇發作', '吞嚥障礙加重致誤吸'],
      ckd: ['eGFR 急劇下降', '高鉀血症', '頑固性高血壓', '需腎臟替代治療評估']
    }[disease];

    const html = `
      <div class="method-card">
        <div class="method-eyebrow">FOLLOW-UP PLAN</div>
        <h3 class="method-name">${diseaseInfo.name} · ${grade} 級 · ${{good:'達標',poor:'未達標',unstable:'不穩定'}[control]}</h3>
        <div class="method-en">${diseaseInfo.en} | Visit Frequency: ${freq} times/year</div>
        <p class="method-summary">
          建議每 <strong>${intervalDays} 天</strong>隨訪 1 次，全年 <strong>${freq} 次</strong>。
          全人群（${fmt(patients)} 人）年隨訪總量約 <strong>${fmt(totalVisits)}</strong> 人次，
          預計需轉診上級醫院約 <strong>${fmt(referrals)}</strong> 人次。
        </p>
      </div>

      <div class="result-section">
        <h3>🧾 你的選擇摘要</h3>
        <div class="summary-grid">
          <div class="summary-item"><div class="summary-label">病種</div><div class="summary-value">${diseaseInfo.name}</div></div>
          <div class="summary-item"><div class="summary-label">分級 / 控制</div><div class="summary-value">${grade} 級 / ${{good:'達標',poor:'未達標',unstable:'不穩定'}[control]}</div></div>
          <div class="summary-item"><div class="summary-label">患者數</div><div class="summary-value">${fmt(patients)} 人</div></div>
          <div class="summary-item"><div class="summary-label">隨訪間隔</div><div class="summary-value">${intervalDays} 天</div></div>
          <div class="summary-item"><div class="summary-label">年隨訪量</div><div class="summary-value">${fmt(totalVisits)} 人次</div></div>
          <div class="summary-item"><div class="summary-label">合併症</div><div class="summary-value">${comorb.length || '無'}</div></div>
        </div>
      </div>

      <div class="result-section">
        <h3>📋 每次隨訪內容清單</h3>
        <ul>
          ${diseaseInfo.items.map(i => `<li>${i}</li>`).join('')}
          <li><em>每年體檢項目：${diseaseInfo.annualLab}</em></li>
        </ul>
      </div>

      <div class="result-section">
        <h3>💡 干預措施</h3>
        <ul>${interventions.map(i => `<li>${i}</li>`).join('')}</ul>
      </div>

      <div class="result-section">
        <h3>🚑 轉診指徵</h3>
        <ul>${transferCriteria.map(i => `<li>${i}</li>`).join('')}</ul>
      </div>

      <div class="result-section">
        <h3>📋 隨訪計劃報告（可複製）</h3>
        <div class="report-block">【${diseaseInfo.name} 隨訪計劃】
病情分級：${grade} 級 | 控制狀態：${{good:'達標',poor:'未達標',unstable:'不穩定'}[control]}
管理人數：${fmt(patients)} 人 | 主要年齡段：${{adult:'中青年',elderly:'老年',mixed:'混合'}[age]}
合併症：${comorb.length ? comorb.join('、') : '無'}
————————————————————————
隨訪頻率：每 ${intervalDays} 天 1 次（全年 ${freq} 次）
年隨訪總量：${fmt(totalVisits)} 人次
預計轉診：${fmt(referrals)} 人次（${(referralRate * 100).toFixed(1)}%）
————————————————————————
隨訪內容：
${diseaseInfo.items.map((i, idx) => (idx + 1) + '. ' + i).join('\n')}
年度檢查：${diseaseInfo.annualLab}
————————————————————————
干預重點：
${interventions.map((i, idx) => (idx + 1) + '. ' + i.replace(/&lt;/g, '<')).join('\n')}</div>
      </div>

      <div class="result-section disclaimer">
        <strong>免責聲明　</strong>本方案基於國家基本公共衛生服務規範與相關指南要點，臨床決策需結合個體化評估，重症與不穩定患者應及時轉診。
      </div>
    `;
    renderResult('followupResult', html);
  }

  // ============================================================
  // 03 健康教育
  // ============================================================
  function analyzeEducation() {
    const audience = val('e_audience');
    const duration = val('e_duration');
    const topic = getRadio('e_topic');
    const size = num('e_size');
    const budget = num('e_budget');
    const staff = val('e_staff');
    const channels = getChecks('e_channel');

    if (!size || size < 1) return showToast('請輸入覆蓋人數');

    const topicInfo = {
      diet: { name: '合理膳食干預', en: 'Healthy Diet Intervention',
        core: ['每日蔬菜 ≥300g、水果 200-350g', '減鹽（&lt; 5g/日）、減油（25-30g/日）', '全穀物雜豆 50-150g/日', '優質蛋白：魚禽蛋瘦肉 120-200g/日'],
        kpi: ['知曉率 ≥85%', '行為改變率 ≥40%', '高鹽飲食比例下降 15%']
      },
      exercise: { name: '身體活動促進', en: 'Physical Activity Promotion',
        core: ['每週中等強度有氧運動 ≥150 分鐘', '每週 2 次抗阻訓練', '減少久坐：每小時起身活動', '老年人增加平衡訓練'],
        kpi: ['規律運動者比例 ≥30%', 'BMI 改善率', '步數監測達標率']
      },
      smoking: { name: '戒煙限酒', en: 'Tobacco & Alcohol Control',
        core: ['5A 法戒煙干預（詢問、勸告、評估、幫助、安排）', '尼古丁替代治療轉介', '男性飲酒 &lt; 25g 純酒精/日', '孕婦、青少年絕對戒酒'],
        kpi: ['戒煙嘗試率 ≥30%', '6 個月持續戒煙率 ≥10%', '飲酒控制達標率']
      },
      chronic: { name: '慢病自管理', en: 'Chronic Disease Self-Management',
        core: ['用藥依從性培訓', '症狀識別與應對', '家庭血壓 / 血糖監測技能', '應急聯絡與就醫指引'],
        kpi: ['自管理小組覆蓋率', '依從性提升 20%', '急診就診次數下降']
      },
      mental: { name: '心理健康促進', en: 'Mental Health Promotion',
        core: ['壓力應對技巧訓練', 'PHQ-9 / GAD-7 篩查', '社會支持網絡建立', '專業轉介綠色通道'],
        kpi: ['篩查覆蓋率 ≥60%', '主動求助意願提升', '輕中度症狀緩解率']
      },
      infection: { name: '傳染病預防', en: 'Infectious Disease Prevention',
        core: ['手衛生 + 咳嗽禮儀', '疫苗接種知識', '高風險場所防護', '可疑症狀及時就醫'],
        kpi: ['知曉率 ≥90%', '疫苗接種率提升', '聚集性事件下降']
      }
    }[topic];

    // 策略组合（根据预算与人员调整）
    const budgetPerPerson = budget / size;
    let strategy;
    if (budgetPerPerson >= 100 && staff !== 'low') {
      strategy = { mass: 30, group: 40, individual: 30, label: '深度組合（個體 + 小組為主）' };
    } else if (budgetPerPerson >= 30) {
      strategy = { mass: 50, group: 35, individual: 15, label: '均衡組合' };
    } else {
      strategy = { mass: 70, group: 25, individual: 5, label: '大眾傳播為主' };
    }

    // 频率
    const freqByDuration = {
      short: { mass: '每週 1 次', group: '每 2 週 1 次', individual: '按需' },
      medium: { mass: '每月 2 次', group: '每月 1 次', individual: '每月 1 次重點對象' },
      long: { mass: '每月 1-2 次', group: '每月 1 次', individual: '每季度 1 次' }
    }[duration];

    // 渠道建议
    const recommendedChannels = [];
    if (channels.includes('wechat')) recommendedChannels.push('微信群推送：每週 2-3 條圖文，固定時間');
    else recommendedChannels.push('🆕 建議建立微信群作為日常推送渠道');
    if (channels.includes('lecture')) recommendedChannels.push('講座：每月 1 場，主題遞進，提前 1 週宣傳');
    else recommendedChannels.push('🆕 建議每月組織 1 場專題講座');
    if (channels.includes('peer')) recommendedChannels.push('同伴小組：8-12 人/組，培養患者領袖');
    if (channels.includes('video')) recommendedChannels.push('短視頻：1-3 分鐘為主，方言版本提升老年人接受度');
    if (channels.includes('onsite')) recommendedChannels.push('入戶 / 義診：重點覆蓋失能、獨居老人');
    if (channels.includes('leaflet')) recommendedChannels.push('宣傳冊：作為入戶時的留存材料');

    const eventPlan = {
      short: '第 1 月：基線調查 + 啟動 → 第 2 月：核心知識普及 → 第 3 月：技能培訓 + 終末評估',
      medium: '第 1 月：基線調查 + 啟動會 → 第 2-3 月：核心知識普及（大眾傳播） → 第 4-6 月：技能培訓（小組） → 第 7-9 月：行為強化 → 第 10-11 月：個體化指導 → 第 12 月：終末評估',
      long: '採用螺旋式設計：每 6 個月為一週期，包含「啟動 - 知識 - 技能 - 行為 - 評估」5 個階段，週期間進行教材迭代'
    }[duration];

    const html = `
      <div class="method-card">
        <div class="method-eyebrow">EDUCATION DESIGN</div>
        <h3 class="method-name">${topicInfo.name}</h3>
        <div class="method-en">${topicInfo.en} | ${{short:'短期',medium:'中期',long:'長期'}[duration]}干預 · ${strategy.label}</div>
        <p class="method-summary">
          面向 <strong>${{general:'一般居民',elderly:'老年人',chronic:'慢病患者',women:'育齡婦女',children:'兒童青少年',workplace:'職業人群'}[audience]}</strong>
          （${fmt(size)} 人）的健康教育干預，建議採用「<strong>${strategy.mass}% 大眾傳播 + ${strategy.group}% 小組活動 + ${strategy.individual}% 個體咨詢</strong>」的組合策略。
          人均預算 <strong>${fmt(budgetPerPerson, 1)} 元</strong>，整體屬於${budgetPerPerson >= 100 ? '充足' : budgetPerPerson >= 30 ? '常規' : '緊縮'}水平。
        </p>
      </div>

      <div class="result-section">
        <h3>🧾 你的選擇摘要</h3>
        <div class="summary-grid">
          <div class="summary-item"><div class="summary-label">主題</div><div class="summary-value">${topicInfo.name}</div></div>
          <div class="summary-item"><div class="summary-label">目標人群</div><div class="summary-value">${{general:'一般居民',elderly:'老年人',chronic:'慢病患者',women:'育齡婦女',children:'兒童青少年',workplace:'職業人群'}[audience]}</div></div>
          <div class="summary-item"><div class="summary-label">覆蓋規模</div><div class="summary-value">${fmt(size)} 人</div></div>
          <div class="summary-item"><div class="summary-label">總預算</div><div class="summary-value">¥ ${fmt(budget)}</div></div>
          <div class="summary-item"><div class="summary-label">人均預算</div><div class="summary-value">¥ ${fmt(budgetPerPerson, 1)}</div></div>
          <div class="summary-item"><div class="summary-label">週期</div><div class="summary-value">${{short:'1-3 月',medium:'3-12 月',long:'&gt;12 月'}[duration]}</div></div>
        </div>
      </div>

      <div class="result-section">
        <h3>📊 策略組合與頻率</h3>
        <div class="bar-row"><div class="bar-label">大眾傳播</div><div class="bar-track"><div class="bar-fill" style="width:${strategy.mass}%"></div></div><div class="bar-value">${strategy.mass}%</div></div>
        <div class="bar-row"><div class="bar-label">小組活動</div><div class="bar-track"><div class="bar-fill" style="width:${strategy.group}%"></div></div><div class="bar-value">${strategy.group}%</div></div>
        <div class="bar-row"><div class="bar-label">個體咨詢</div><div class="bar-track"><div class="bar-fill" style="width:${strategy.individual}%"></div></div><div class="bar-value">${strategy.individual}%</div></div>
        <ul style="margin-top:18px;">
          <li>大眾傳播頻率：<code>${freqByDuration.mass}</code></li>
          <li>小組活動頻率：<code>${freqByDuration.group}</code></li>
          <li>個體咨詢頻率：<code>${freqByDuration.individual}</code></li>
        </ul>
      </div>

      <div class="result-section">
        <h3>📚 核心知識要點</h3>
        <ul>${topicInfo.core.map(i => `<li>${i}</li>`).join('')}</ul>
      </div>

      <div class="result-section">
        <h3>📡 渠道組合建議</h3>
        <ul>${recommendedChannels.map(i => `<li>${i}</li>`).join('')}</ul>
      </div>

      <div class="result-section">
        <h3>📅 階段實施計劃</h3>
        <ul>
          <li>${eventPlan}</li>
          <li><em>每階段結束需進行小型評估，根據反饋調整內容與形式</em></li>
        </ul>
      </div>

      <div class="result-section">
        <h3>🎯 評估指標 (KPI)</h3>
        <ul>
          ${topicInfo.kpi.map(i => `<li>${i}</li>`).join('')}
          <li>覆蓋率：實際參與人數 / 計劃覆蓋 × 100%</li>
          <li>滿意度：≥80% 對干預內容滿意</li>
          <li>知識測驗：前後對比平均分提升 ≥20%</li>
        </ul>
      </div>

      <div class="result-section">
        <h3>📋 干預方案報告（可複製）</h3>
        <div class="report-block">【${topicInfo.name} 干預方案】
目標人群：${{general:'一般居民',elderly:'老年人',chronic:'慢病患者',women:'育齡婦女',children:'兒童青少年',workplace:'職業人群'}[audience]} | 規模：${fmt(size)} 人
週期：${{short:'1-3 月',medium:'3-12 月',long:'>12 月'}[duration]} | 預算：¥${fmt(budget)}（人均 ¥${fmt(budgetPerPerson, 1)}）
————————————————————————
策略組合：大眾傳播 ${strategy.mass}% + 小組活動 ${strategy.group}% + 個體咨詢 ${strategy.individual}%
實施頻率：大眾 ${freqByDuration.mass} | 小組 ${freqByDuration.group} | 個體 ${freqByDuration.individual}
————————————————————————
核心信息：
${topicInfo.core.map((c, i) => (i + 1) + '. ' + c.replace(/&lt;/g, '<')).join('\n')}
————————————————————————
階段計劃：
${eventPlan}
————————————————————————
評估 KPI：
${topicInfo.kpi.map((k, i) => (i + 1) + '. ' + k).join('\n')}</div>
      </div>

      <div class="result-section disclaimer">
        <strong>免責聲明　</strong>方案參考《全民健康生活方式行動》《WS/T 公衛系列規範》編制，具體實施需結合本地文化、語言、宗教習慣調整。
      </div>
    `;
    renderResult('educationResult', html);
  }

  // ============================================================
  // 04 满意度
  // ============================================================
  function analyzeSatisfaction() {
    const n = num('s_n');
    const response = num('s_response');
    const complaint = num('s_complaint');
    const dimensions = [
      { key: 'access', label: '可及性', val: num('s_access') },
      { key: 'response', label: '響應性', val: num('s_response_d') },
      { key: 'tech', label: '技術質量', val: num('s_tech') },
      { key: 'care', label: '人文關懷', val: num('s_care') },
      { key: 'env', label: '環境設施', val: num('s_env') },
      { key: 'price', label: '價格費用', val: num('s_price') }
    ];

    if (!n || n < 1) return showToast('請輸入調查樣本量');
    if (dimensions.some(d => d.val < 1 || d.val > 5)) return showToast('請輸入所有維度評分（1-5 分）');

    // 加权平均（默认权重）
    const weights = { access: 0.15, response: 0.15, tech: 0.25, care: 0.20, env: 0.10, price: 0.15 };
    const overall = dimensions.reduce((s, d) => s + d.val * weights[d.key], 0);
    const simple = dimensions.reduce((s, d) => s + d.val, 0) / dimensions.length;

    let level, levelEn;
    if (overall >= 4.5) { level = '優秀'; levelEn = 'Excellent'; }
    else if (overall >= 4.0) { level = '良好'; levelEn = 'Good'; }
    else if (overall >= 3.5) { level = '一般'; levelEn = 'Fair'; }
    else { level = '待改進'; levelEn = 'Needs Improvement'; }

    // 排序找强项与短板
    const sorted = [...dimensions].sort((a, b) => b.val - a.val);
    const strengths = sorted.slice(0, 2);
    const weaknesses = sorted.slice(-2).reverse();

    // 改进优先级（短板 + 高权重）
    const priority = dimensions.map(d => ({
      ...d, gap: 5 - d.val, urgency: (5 - d.val) * weights[d.key] * 100
    })).sort((a, b) => b.urgency - a.urgency);

    // NPS
    const promoter = num('s_promoter');
    const detractor = num('s_detractor');
    const nps = promoter - detractor;
    let npsLevel = '尚可';
    if (nps >= 50) npsLevel = '優秀';
    else if (nps >= 30) npsLevel = '良好';
    else if (nps < 0) npsLevel = '較差';

    // 投诉率评估
    let complaintAssess = '正常';
    if (complaint > 5) complaintAssess = '偏高，需重點關注';
    else if (complaint > 2) complaintAssess = '中等，建議分析投訴內容';

    const html = `
      <div class="method-card">
        <div class="method-eyebrow">SATISFACTION REPORT</div>
        <h3 class="method-name">綜合滿意度 ${overall.toFixed(2)} / 5.00</h3>
        <div class="method-en">Overall Satisfaction = ${level} (${levelEn}) | NPS = ${nps.toFixed(0)} (${npsLevel})</div>
        <p class="method-summary">
          基於 ${fmt(n)} 份有效問卷的加權測算，整體滿意度為 <strong>${overall.toFixed(2)}</strong> 分，
          屬於<strong>「${level}」</strong>水平。其中強項為「<strong>${strengths.map(s => s.label).join('、')}</strong>」，
          需重點改進的維度為「<strong>${weaknesses.map(w => w.label).join('、')}</strong>」。
        </p>
        <div class="alt-list">
          <span class="tag gold">加權均分 ${overall.toFixed(2)}</span>
          <span class="tag">算術均分 ${simple.toFixed(2)}</span>
          <span class="tag">NPS ${nps.toFixed(0)}</span>
          <span class="tag">投訴率 ${complaint.toFixed(2)}‰</span>
        </div>
      </div>

      <div class="result-section">
        <h3>🧾 調查概覽</h3>
        <div class="summary-grid">
          <div class="summary-item"><div class="summary-label">樣本量</div><div class="summary-value">${fmt(n)}</div></div>
          <div class="summary-item"><div class="summary-label">回收率</div><div class="summary-value">${response}%</div></div>
          <div class="summary-item"><div class="summary-label">投訴率</div><div class="summary-value">${complaint.toFixed(2)}‰<br><small style="color:#888;font-weight:400;">(${complaintAssess})</small></div></div>
          <div class="summary-item"><div class="summary-label">滿意度等級</div><div class="summary-value">${level}</div></div>
          <div class="summary-item"><div class="summary-label">NPS 等級</div><div class="summary-value">${npsLevel}</div></div>
        </div>
      </div>

      <div class="result-section">
        <h3>📊 各維度評分對比</h3>
        ${dimensions.map(d => `
          <div class="bar-row">
            <div class="bar-label">${d.label}</div>
            <div class="bar-track"><div class="bar-fill ${d.val < 3.5 ? 'danger' : d.val < 4 ? 'warn' : ''}" style="width:${(d.val / 5 * 100).toFixed(1)}%"></div></div>
            <div class="bar-value">${d.val.toFixed(2)} / 5.00</div>
          </div>
        `).join('')}
        <p style="margin-top:14px;font-size:12px;color:#888;">權重：技術質量 25% | 人文關懷 20% | 可及性 15% | 響應性 15% | 價格 15% | 環境 10%</p>
      </div>

      <div class="result-section">
        <h3>💪 強項維度</h3>
        <ul>${strengths.map(s => `<li><strong>${s.label}</strong>（${s.val.toFixed(2)} 分）：建議保持並提煉為服務亮點對外宣傳</li>`).join('')}</ul>
      </div>

      <div class="result-section">
        <h3>⚠️ 短板維度與改進優先級</h3>
        <ul>
          ${priority.slice(0, 3).map((p, i) => `<li><strong>P${i + 1}　${p.label}</strong>（當前 ${p.val.toFixed(2)} / 差距 ${p.gap.toFixed(2)} / 緊迫度指數 ${p.urgency.toFixed(1)}）：${getImprovementSuggestion(p.key)}</li>`).join('')}
        </ul>
      </div>

      <div class="result-section">
        <h3>📋 滿意度報告（可複製）</h3>
        <div class="report-block">【健康服務質量滿意度分析報告】
樣本量：${fmt(n)} | 回收率：${response}% | 投訴率：${complaint.toFixed(2)}‰
————————————————————————
綜合加權滿意度：${overall.toFixed(2)} / 5.00（${level}）
算術平均：${simple.toFixed(2)}
NPS：${nps.toFixed(0)}（推薦者 ${promoter}% - 貶損者 ${detractor}%）
————————————————————————
各維度評分：
${dimensions.map(d => '- ' + d.label + '：' + d.val.toFixed(2)).join('\n')}
————————————————————————
強項：${strengths.map(s => s.label + '(' + s.val.toFixed(2) + ')').join('、')}
短板：${weaknesses.map(w => w.label + '(' + w.val.toFixed(2) + ')').join('、')}
————————————————————————
改進優先級（前 3）：
${priority.slice(0, 3).map((p, i) => 'P' + (i + 1) + ' ' + p.label + '（緊迫度 ' + p.urgency.toFixed(1) + '）').join('\n')}</div>
      </div>

      <div class="result-section">
        <h3>💡 通用改進建議</h3>
        <ul>
          <li>建立「滿意度月報」制度，將數據納入績效考核</li>
          <li>針對短板維度設立 PDCA 改進小組，3 個月為一週期</li>
          <li>低分問卷（總分 &lt; 3）100% 回訪，分析具體原因</li>
          <li>NPS &lt; 30 時應啟動專項服務體驗優化計劃</li>
          <li>定期召開患者代表座談會，獲取定性反饋補充量化數據</li>
        </ul>
      </div>

      <div class="result-section disclaimer">
        <strong>免責聲明　</strong>權重設置可結合機構戰略調整，建議至少每年複核一次。樣本量 &lt; 100 時結果不夠穩健，應擴大調查或合併分析。
      </div>
    `;
    renderResult('satisfactionResult', html);
  }

  function getImprovementSuggestion(key) {
    return {
      access: '優化排班、增設預約渠道、設立綠色通道、改善交通指引',
      response: '建立投訴 24 小時響應機制、設置首問負責制、定期開展溝通培訓',
      tech: '加強繼續醫學教育、引入臨床路徑、開展疑難病例討論、定期質控檢查',
      care: '推行「以患者為中心」溝通培訓、保護患者隱私、增加陪伴與心理支持',
      env: '改善候診環境、增加休息設施、加強清潔消毒、設置便民措施',
      price: '加強費用公示、推進醫保政策宣傳、提供費用預估、開展醫療救助對接'
    }[key];
  }

  // ============================================================
  // 05 成本人资
  // ============================================================
  function analyzeCost() {
    const name = val('c_name') || '本健康項目';
    const target = num('c_target');
    const months = num('c_months');
    const freq = num('c_freq');
    const duration = num('c_duration');
    const material = num('c_material');

    const docN = num('c_doc_n'), docS = num('c_doc_s');
    const nurN = num('c_nur_n'), nurS = num('c_nur_s');
    const phN = num('c_ph_n'), phS = num('c_ph_s');
    const mgrN = num('c_mgr_n'), mgrS = num('c_mgr_s');
    const vol = num('c_vol');

    const equip = num('c_equip');
    const rent = num('c_rent');
    const train = num('c_train');

    if (!target || !months) return showToast('請填寫服務對象人數與項目週期');
    if (docN + nurN + phN + mgrN === 0) return showToast('請至少配置 1 名專業人員');

    // 成本计算
    const laborCost = (docN * docS + nurN * nurS + phN * phS + mgrN * mgrS + vol) * months;
    const totalServices = target * freq; // 总服务人次（如果 freq 未填 = 0 则忽略）
    const materialCost = freq > 0 ? totalServices * material : target * material; // 兜底
    const rentCost = rent * months;
    const directCost = laborCost + materialCost + equip + rentCost + train;
    const indirectCost = directCost * 0.10; // 管理费用按 10%
    const contingency = directCost * 0.05;  // 不可预见 5%
    const totalCost = directCost + indirectCost + contingency;

    const perCapita = totalCost / target;
    const totalStaff = docN + nurN + phN + mgrN;
    const personMonths = totalStaff * months;
    const workMinutesNeeded = totalServices * duration; // 总服务时长（分钟）
    const availableMinutes = personMonths * 22 * 8 * 60 * 0.7; // 22工作日×8小时×0.7有效工时
    const utilization = availableMinutes > 0 ? workMinutesNeeded / availableMinutes : 0;

    // 成本结构（占总成本比例）
    const structure = [
      { label: '人力成本', value: laborCost, color: '' },
      { label: '物資成本', value: materialCost, color: '' },
      { label: '設備投入', value: equip, color: '' },
      { label: '場地租金', value: rentCost, color: '' },
      { label: '培訓宣傳', value: train, color: '' },
      { label: '管理費用', value: indirectCost, color: 'warn' },
      { label: '不可預見', value: contingency, color: 'warn' }
    ];

    // 风险与建议
    const risks = [];
    if (utilization > 0.95) risks.push('⚠️ 人力負荷過高（>95%），存在加班風險，建議增加 ' + Math.ceil(totalStaff * (utilization - 0.85)) + ' 人或減少服務頻次');
    else if (utilization > 0.85) risks.push('🟡 人力使用率較高（>85%），需注意排班與輪休');
    else if (utilization < 0.5 && utilization > 0) risks.push('💡 人力使用率偏低（<50%），可優化人員結構或擴大服務範圍');

    const laborRatio = laborCost / totalCost;
    if (laborRatio < 0.4) risks.push('💡 人力成本佔比偏低（<40%），健康服務通常為勞動密集型，請覆核人員配置是否充足');
    if (laborRatio > 0.75) risks.push('🟡 人力成本佔比偏高（>75%），可考慮引入志願者、信息化降本');

    if (perCapita > 500) risks.push('💰 人均成本偏高，建議優化服務流程或擴大覆蓋規模以攤薄成本');
    if (equip > directCost * 0.3) risks.push('💡 設備投入佔比較高，可考慮租賃、合作或分期採購');

    const html = `
      <div class="method-card">
        <div class="method-eyebrow">COST ESTIMATION</div>
        <h3 class="method-name">¥ ${fmt(totalCost, 0)}</h3>
        <div class="method-en">${name} | ${months} 個月 | ${fmt(target)} 人 | 人均 ¥${fmt(perCapita, 1)}</div>
        <p class="method-summary">
          項目總成本估算 <strong>¥ ${fmt(totalCost, 0)}</strong>，其中直接成本 ¥${fmt(directCost, 0)}、管理費用 ¥${fmt(indirectCost, 0)}、不可預見費 ¥${fmt(contingency, 0)}。
          人月需求 <strong>${fmt(personMonths)}</strong>，當前人力使用率 <strong>${pct(utilization)}</strong>，
          ${utilization > 0.95 ? '<strong style="color:#c46b4d;">已超負荷</strong>' : utilization > 0.85 ? '接近上限' : utilization > 0.5 ? '處於合理區間' : '較為寬鬆'}。
        </p>
      </div>

      <div class="result-section">
        <h3>🧾 項目概覽</h3>
        <div class="summary-grid">
          <div class="summary-item"><div class="summary-label">總成本</div><div class="summary-value">¥ ${fmt(totalCost, 0)}</div></div>
          <div class="summary-item"><div class="summary-label">人均成本</div><div class="summary-value">¥ ${fmt(perCapita, 1)}</div></div>
          <div class="summary-item"><div class="summary-label">總人月</div><div class="summary-value">${fmt(personMonths)} 人月</div></div>
          <div class="summary-item"><div class="summary-label">總服務量</div><div class="summary-value">${fmt(totalServices)} 人次</div></div>
          <div class="summary-item"><div class="summary-label">人力使用率</div><div class="summary-value">${pct(utilization)}</div></div>
          <div class="summary-item"><div class="summary-label">人力佔比</div><div class="summary-value">${pct(laborRatio)}</div></div>
        </div>
      </div>

      <div class="result-section">
        <h3>📊 成本結構分解</h3>
        ${structure.map(s => `
          <div class="bar-row">
            <div class="bar-label">${s.label}</div>
            <div class="bar-track"><div class="bar-fill ${s.color}" style="width:${(s.value / totalCost * 100).toFixed(1)}%"></div></div>
            <div class="bar-value">¥${fmt(s.value, 0)} (${(s.value / totalCost * 100).toFixed(1)}%)</div>
          </div>
        `).join('')}
      </div>

      <div class="result-section">
        <h3>👥 人員配置明細</h3>
        <ul>
          ${docN > 0 ? `<li>醫生：${docN} 人 × ¥${fmt(docS)}/月 × ${months} 月 = <code>¥${fmt(docN * docS * months, 0)}</code></li>` : ''}
          ${nurN > 0 ? `<li>護士：${nurN} 人 × ¥${fmt(nurS)}/月 × ${months} 月 = <code>¥${fmt(nurN * nurS * months, 0)}</code></li>` : ''}
          ${phN > 0 ? `<li>公衛人員：${phN} 人 × ¥${fmt(phS)}/月 × ${months} 月 = <code>¥${fmt(phN * phS * months, 0)}</code></li>` : ''}
          ${mgrN > 0 ? `<li>管理人員：${mgrN} 人 × ¥${fmt(mgrS)}/月 × ${months} 月 = <code>¥${fmt(mgrN * mgrS * months, 0)}</code></li>` : ''}
          ${vol > 0 ? `<li>志願者/兼職補助：¥${fmt(vol)}/月 × ${months} 月 = <code>¥${fmt(vol * months, 0)}</code></li>` : ''}
          <li><em>專業人員合計：${totalStaff} 人</em></li>
        </ul>
      </div>

      <div class="result-section">
        <h3>⚠️ 風險與優化建議</h3>
        <ul>
          ${risks.length ? risks.map(r => `<li>${r}</li>`).join('') : '<li>✅ 各項指標處於合理區間，建議按計劃推進並預留至少 5% 機動經費</li>'}
          <li><em>建議按月進行成本-產出復盤，動態調整人員與物資投入</em></li>
        </ul>
      </div>

      <div class="result-section">
        <h3>📋 成本估算報告（可複製）</h3>
        <div class="report-block">【${name} · 成本與人資估算】
項目週期：${months} 個月 | 服務對象：${fmt(target)} 人 | 人均年服務頻次：${freq} 次
————————————————————————
總成本：¥ ${fmt(totalCost, 0)}
  直接成本：¥ ${fmt(directCost, 0)}
    - 人力成本：¥ ${fmt(laborCost, 0)} (${(laborCost / totalCost * 100).toFixed(1)}%)
    - 物資成本：¥ ${fmt(materialCost, 0)} (${(materialCost / totalCost * 100).toFixed(1)}%)
    - 設備投入：¥ ${fmt(equip, 0)}
    - 場地租金：¥ ${fmt(rentCost, 0)}
    - 培訓宣傳：¥ ${fmt(train, 0)}
  管理費用 (10%)：¥ ${fmt(indirectCost, 0)}
  不可預見 (5%)：¥ ${fmt(contingency, 0)}
————————————————————————
關鍵指標：
- 人均成本：¥ ${fmt(perCapita, 2)}
- 總服務量：${fmt(totalServices)} 人次
- 單次服務成本：¥ ${freq > 0 ? fmt(totalCost / totalServices, 2) : '--'}
- 人力使用率：${pct(utilization)}
- 總人月需求：${fmt(personMonths)} 人月
————————————————————————
人員配置：
- 醫生 ${docN} | 護士 ${nurN} | 公衛 ${phN} | 管理 ${mgrN}
- 合計 ${totalStaff} 人，專業人員配比 1 : ${totalStaff > 0 ? Math.round(target / totalStaff) : '--'}（人員 : 服務對象）</div>
      </div>

      <div class="result-section disclaimer">
        <strong>免責聲明　</strong>本估算基於輸入參數的線性測算，未考慮通脹、季節性波動、突發事件等因素。正式預算編制請結合本地物價、財務制度與審計要求。
      </div>
    `;
    renderResult('costResult', html);
  }

  // ============================================================
  // Bind actions
  // ============================================================
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      try {
        if (action === 'needs') analyzeNeeds();
        else if (action === 'followup') analyzeFollowup();
        else if (action === 'education') analyzeEducation();
        else if (action === 'satisfaction') analyzeSatisfaction();
        else if (action === 'cost') analyzeCost();
      } catch (e) {
        console.error(e);
        showToast('計算出錯：請檢查輸入');
      }
    });
  });

  // Reset
  document.querySelectorAll('[data-reset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.closest('.tool-panel');
      panel.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.type === 'radio' || el.type === 'checkbox') el.checked = el.defaultChecked;
        else el.value = el.defaultValue || '';
      });
      const result = panel.querySelector('.tool-result');
      if (result) {
        result.classList.remove('show');
        result.innerHTML = '';
      }
      showToast('已清空');
    });
  });

})();
