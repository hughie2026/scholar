/* ============================================================
 * Data Anonymization & DMP Generator
 * Hughie's Online Lab
 * ============================================================ */

(function () {
  'use strict';

  const TOTAL_STEPS = 6;
  let currentStep = 1;

  const form = document.getElementById('dmpForm');
  const steps = document.querySelectorAll('.form-step');
  const stepIndicators = document.querySelectorAll('.progress-steps .step');
  const progressFill = document.getElementById('progressFill');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');

  /* ---------- Navigation ---------- */
  function showStep(n) {
    steps.forEach(s => s.classList.toggle('active', +s.dataset.step === n));
    stepIndicators.forEach(s => {
      const num = +s.dataset.step;
      s.classList.toggle('active', num === n);
      s.classList.toggle('done', num < n);
    });
    progressFill.style.width = (n / TOTAL_STEPS * 100) + '%';

    prevBtn.disabled = n === 1;
    nextBtn.style.display = n === TOTAL_STEPS ? 'none' : 'inline-block';
    submitBtn.style.display = n === TOTAL_STEPS ? 'inline-block' : 'none';

    window.scrollTo({ top: document.querySelector('.assessment-section').offsetTop - 20, behavior: 'smooth' });
  }

  function validateCurrentStep() {
    const stepEl = document.querySelector(`.form-step[data-step="${currentStep}"]`);
    const requireds = stepEl.querySelectorAll('[required]');
    for (const f of requireds) {
      if (!f.value) {
        f.focus();
        f.style.borderColor = '#a85a4f';
        setTimeout(() => (f.style.borderColor = ''), 1500);
        return false;
      }
    }
    // Step 2 must check at least one data type
    if (currentStep === 2) {
      const checked = stepEl.querySelectorAll('[data-group="dataTypes"] input:checked');
      if (checked.length === 0) {
        alert('請至少勾選一項資料類型');
        return false;
      }
    }
    return true;
  }

  prevBtn.addEventListener('click', () => {
    if (currentStep > 1) { currentStep--; showStep(currentStep); }
  });
  nextBtn.addEventListener('click', () => {
    if (validateCurrentStep() && currentStep < TOTAL_STEPS) {
      currentStep++; showStep(currentStep);
    }
  });
  stepIndicators.forEach(s => {
    s.addEventListener('click', () => {
      const target = +s.dataset.step;
      if (target < currentStep) { currentStep = target; showStep(currentStep); }
    });
  });

  /* ---------- Submit & Score ---------- */
  submitBtn.addEventListener('click', () => {
    if (!validateCurrentStep()) return;
    const data = collectData();
    const result = computeResult(data);
    renderResult(data, result);
  });

  function collectData() {
    const fd = new FormData(form);
    const obj = {};
    // simple text fields
    ['projectName','piName','institution','startDate','endDate','domain','objective',
     'collectionMethod','sampleSize','tools','kValue','storage','dpo','sharing','license',
     'retention','destruction','irb'].forEach(k => obj[k] = fd.get(k) || '');

    // sensitivity questions
    obj.s1 = +fd.get('s1') || 0;
    obj.s2 = +fd.get('s2') || 0;
    obj.s3 = +fd.get('s3') || 0;
    obj.s4 = +fd.get('s4') || 0;
    obj.s5 = +fd.get('s5') || 0;

    // data types (checkboxes)
    obj.dataTypes = [];
    obj.dataTypeScore = 0;
    document.querySelectorAll('[data-group="dataTypes"] input:checked').forEach(c => {
      obj.dataTypes.push({ key: c.name.replace('dt_',''), score: +c.value, label: c.parentNode.querySelector('span').firstChild.textContent.trim() });
      obj.dataTypeScore += +c.value;
    });

    // techs
    obj.techs = [];
    obj.techScore = 0;
    document.querySelectorAll('[data-group="techs"] input:checked').forEach(c => {
      obj.techs.push({ key: c.name.replace('tech_',''), score: +c.value, label: c.parentNode.querySelector('span').firstChild.textContent.trim() });
      obj.techScore += +c.value;
    });

    // security
    obj.security = [];
    obj.securityScore = 0;
    document.querySelectorAll('[data-group="security"] input:checked').forEach(c => {
      obj.security.push({ key: c.name.replace('sec_',''), score: +c.value, label: c.parentNode.querySelector('span').firstChild.textContent.trim() });
      obj.securityScore += +c.value;
    });

    return obj;
  }

  /* ---------- Scoring engine ---------- */
  function computeResult(d) {
    // 1. 資料敏感度 (0-25): 基於 dataTypeScore (越高越敏感)
    const dimSens = clamp(Math.round((d.dataTypeScore / 28) * 25), 0, 25);

    // 2. 識別風險 (0-25): 基於 s1+s2+s3 (PII / 傷害 / 鏈接)
    const dimId = clamp(Math.round(((d.s1 + d.s2 + d.s3) / 15) * 25), 0, 25);

    // 3. 匿名化充分性 (0-25): tech score 越高越充分（反向）
    //   要求隨敏感度提高
    const requiredTech = (dimSens >= 18) ? 18 : (dimSens >= 12) ? 12 : 6;
    const dimAnonRaw = Math.min(d.techScore, requiredTech * 1.4);
    const dimAnon = clamp(Math.round((dimAnonRaw / (requiredTech * 1.4)) * 25), 0, 25);
    // adequacy
    const anonAdequate = d.techScore >= requiredTech;

    // 4. 儲存安全 (0-25): securityScore 範圍 0-22
    const dimSec = clamp(Math.round((d.securityScore / 22) * 25), 0, 25);

    // 5. 合規完備性 (0-25): IRB + DPO + 同意 + 跨境 + license + retention + destruction
    let comp = 0;
    if (d.irb === 'approved') comp += 6;
    else if (d.irb === 'pending' || d.irb === 'exempt') comp += 3;
    if (d.dpo === 'appointed') comp += 5;
    else if (d.dpo === 'dual' || d.dpo === 'committee') comp += 3;
    if (d.s5 === 0) comp += 5; else if (d.s5 === 2) comp += 3; else if (d.s5 === 3) comp += 2;
    if (d.s4 === 0) comp += 3; else if (d.s4 === 2) comp += 2; else if (d.s4 === 4) comp += 1;
    if (d.license && d.license !== '' && d.license !== 'na') comp += 2;
    if (d.retention) comp += 2;
    if (d.destruction && d.destruction !== 'undecided') comp += 2;
    const dimComp = clamp(comp, 0, 25);

    // 風險總分（越高越穩健）
    // sensitivity & id_risk 是負向因素，其他是正向
    const protectionScore = dimAnon + dimSec + dimComp; // 0-75
    const exposureScore = dimSens + dimId; // 0-50

    // overall safety 0-100: 用 protectionScore 加權，敏感度越高要求越多
    const required = 30 + (exposureScore * 0.6); // higher exposure → higher requirement
    let safety = (protectionScore / required) * 100;
    safety = clamp(Math.round(safety), 0, 100);

    let label, narrative;
    if (safety >= 85) {
      label = 'WELL PROTECTED';
      narrative = '整體保護措施充分，匿名化策略與儲存控制與資料敏感度匹配良好。建議持續維護日誌與定期復審。';
    } else if (safety >= 70) {
      label = 'ADEQUATE';
      narrative = '措施基本充分，仍有 1–2 項可加強的環節，建議參考下方改進建議。';
    } else if (safety >= 50) {
      label = 'NEEDS IMPROVEMENT';
      narrative = '當前措施與資料敏感度尚有差距。建議加強匿名化深度或補強安全控制後再正式採集 / 共享。';
    } else {
      label = 'HIGH RISK';
      narrative = '目前計畫存在重大保護缺口，不建議直接採集或共享。應優先補齊匿名化、安全與合規環節。';
    }

    return { dimSens, dimId, dimAnon, dimSec, dimComp, safety, label, narrative, anonAdequate, requiredTech };
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- Render ---------- */
  function renderResult(d, r) {
    document.getElementById('dmpForm').style.display = 'none';
    document.querySelector('.progress-wrap').style.display = 'none';
    const result = document.getElementById('result');
    result.style.display = 'block';

    // Score
    document.getElementById('riskScore').textContent = r.safety;
    document.getElementById('riskLabel').textContent = r.label;
    document.getElementById('riskNarrative').textContent = r.narrative;
    setTimeout(() => { document.getElementById('scoreFill').style.width = r.safety + '%'; }, 100);

    // Dimensions
    setDim('Sens', r.dimSens, ['過於暴露','偏高','適中','可控']);
    setDim('Id', r.dimId, ['極高風險','偏高','中等','低']);
    setDim('Anon', r.dimAnon, ['不足','基本','充分','優秀']);
    setDim('Sec', r.dimSec, ['薄弱','一般','良好','穩健']);
    setDim('Comp', r.dimComp, ['不完整','部分','基本完備','完備']);

    // Anonymization advice
    renderAnonAdvice(d, r);

    // Compliance
    renderCompliance(d, r);

    // Recommendations
    renderRecommendations(d, r);

    // DMP doc
    const dmp = buildDMP(d, r);
    document.getElementById('dmpDoc').innerHTML = formatDMPHtml(dmp);

    // Download buttons
    document.getElementById('downloadMd').addEventListener('click', () => downloadFile(dmp, 'DMP_' + sanitize(d.projectName) + '.md', 'text/markdown'));
    document.getElementById('downloadTxt').addEventListener('click', () => downloadFile(stripMarkdown(dmp), 'DMP_' + sanitize(d.projectName) + '.txt', 'text/plain'));
    document.getElementById('copyDoc').addEventListener('click', () => {
      navigator.clipboard.writeText(dmp).then(() => {
        const btn = document.getElementById('copyDoc');
        const orig = btn.textContent;
        btn.textContent = '已複製 ✓';
        setTimeout(() => btn.textContent = orig, 1800);
      });
    });

    window.scrollTo({ top: result.offsetTop - 30, behavior: 'smooth' });
  }

  function setDim(name, val, tiers) {
    document.getElementById('dim' + name + 'Val').textContent = val;
    let tag;
    if (val < 8) tag = tiers[0];
    else if (val < 14) tag = tiers[1];
    else if (val < 20) tag = tiers[2];
    else tag = tiers[3];
    document.getElementById('dim' + name + 'Tag').textContent = tag;
  }

  /* ---------- Anonymization advice ---------- */
  function renderAnonAdvice(d, r) {
    const el = document.getElementById('anonAdvice');
    const badges = document.getElementById('anonBadges');
    const recommended = recommendTechs(d);
    const userKeys = d.techs.map(t => t.key);

    let advice = '';
    if (r.anonAdequate) {
      advice = `已選擇的匿名化組合（${d.techs.length} 項技術）對於目前資料敏感度等級基本充分。`;
    } else {
      advice = `已選擇的匿名化技術強度不足以匹配本研究的資料敏感度，建議補充以下技術：`;
    }
    el.textContent = advice;

    const html = recommended.map(t => {
      const used = userKeys.includes(t.key);
      const cls = used ? 'badge ok' : 'badge warn';
      const mark = used ? ' ✓' : ' ＋';
      return `<span class="${cls}">${t.label}${mark}</span>`;
    }).join('');
    badges.innerHTML = html || '<span class="badge">無強制要求</span>';
  }

  function recommendTechs(d) {
    const list = [];
    const types = d.dataTypes.map(t => t.key);
    // baseline
    list.push({ key: 'remove', label: '直接識別欄位移除' });
    if (types.includes('id') || types.includes('contact') || types.includes('demographic'))
      list.push({ key: 'pseudo', label: '假名化' });
    if (types.includes('demographic') || types.includes('location'))
      list.push({ key: 'generalize', label: '泛化' });
    if (types.includes('health') || types.includes('genetic') || types.includes('sensitive'))
      list.push({ key: 'kanon', label: 'k-匿名（k≥5）' });
    if (types.includes('health') || types.includes('sensitive'))
      list.push({ key: 'ldiv', label: 'l-多樣性' });
    if (d.s4 >= 4 || types.includes('genetic') || (d.s2 >= 4))
      list.push({ key: 'dp', label: '差分隱私' });
    if (d.sharing === 'open')
      list.push({ key: 'synthetic', label: '合成資料' });
    if (d.s4 >= 4)
      list.push({ key: 'federated', label: '聯邦學習' });
    return list;
  }

  /* ---------- Compliance ---------- */
  function renderCompliance(d, r) {
    const ul = document.getElementById('complianceList');
    const items = [];
    // GDPR
    if (d.s4 >= 4) {
      items.push({ ok: false, text: 'GDPR 第 44–49 條：跨境傳輸至非充分性地區需簽訂 SCCs 或進行 TIA 評估。' });
    } else {
      items.push({ ok: true, text: 'GDPR 跨境傳輸要求：當前未涉及高風險跨境，符合。' });
    }
    if (d.s5 === 0) items.push({ ok: true, text: 'GDPR 第 6 / 7 條：已取得明確同意，符合合法處理基礎。' });
    else items.push({ ok: false, text: 'GDPR 第 6 / 7 條：建議補強同意憑證或確認其他合法處理基礎。' });

    // PIPL
    if (d.dataTypes.some(t => ['health','genetic','sensitive','id','minor'].includes(t.key))) {
      items.push({ ok: d.irb === 'approved', text: 'PIPL 第 28–32 條：涉及敏感個人資訊，需單獨同意與必要性論證。' + (d.irb === 'approved' ? '已通過倫理審查。' : '建議補充倫理審查與單獨同意書。') });
    }
    if (d.dataTypes.some(t => t.key === 'minor')) {
      items.push({ ok: false, text: 'PIPL 第 31 條：處理 14 歲以下未成年人資訊需取得監護人同意，並制定專門處理規則。' });
    }
    // HIPAA
    if (d.dataTypes.some(t => t.key === 'health')) {
      items.push({ ok: d.techs.some(t => ['kanon','generalize','remove'].includes(t.key)), text: 'HIPAA Safe Harbor：涉及健康資料，需移除 18 類識別符 (姓名、地址、日期、ID 等)。' });
    }
    // Security baseline
    if (!d.security.find(s => s.key === 'encrypt_rest')) items.push({ ok: false, text: 'ISO 27001 / NIST：缺少靜態加密，建議啟用 AES-256。' });
    if (!d.security.find(s => s.key === 'access')) items.push({ ok: false, text: 'ISO 27001：缺少分級存取控制，建議部署 RBAC。' });
    if (!d.security.find(s => s.key === 'audit')) items.push({ ok: false, text: 'ISO 27001：缺少稽核日誌，建議啟用所有讀寫操作可追溯。' });
    // Retention
    if (d.retention === '1y') items.push({ ok: false, text: '多數資助機構（如 NIH、Horizon Europe）要求至少保留 5–10 年。' });
    // Sharing
    if (d.sharing === 'open' && !d.techs.some(t => ['dp','synthetic','kanon'].includes(t.key))) {
      items.push({ ok: false, text: '開放共享前必須完成強匿名化（k-匿名 / DP / 合成資料），否則違反 GDPR Recital 26。' });
    }

    ul.innerHTML = items.map(i => `<li>${i.ok ? '✅' : '⚠️'} ${i.text}</li>`).join('');
  }

  /* ---------- Recommendations ---------- */
  function renderRecommendations(d, r) {
    const ul = document.getElementById('recommendations');
    const recs = [];

    if (r.dimAnon < 14) recs.push('當前匿名化策略強度不足，建議至少組合「直接識別移除 + 假名化 + 泛化 + k-匿名 (k≥5)」。');
    if (r.dimSec < 14) recs.push('安全控制薄弱，至少補強：靜態加密 + 傳輸加密 + 分級存取控制三項基線。');
    if (d.dpo === 'none') recs.push('指定資料保護負責人 (DPO) 或由 PI 兼任，並登記於專案文件。');
    if (d.irb !== 'approved' && d.irb !== 'exempt') recs.push('在採集資料前完成倫理委員會審查，特別是涉及敏感屬性的研究。');
    if (d.s5 >= 3) recs.push('完善知情同意流程，確保受試者可隨時撤回同意（GDPR 第 7(3) 條）。');
    if (d.sharing === 'open' && r.dimAnon < 18) recs.push('開放共享前先升級到 t-接近或差分隱私級別，必要時改用合成資料。');
    if (d.destruction === 'undecided') recs.push('明確資料銷毀方式（建議多次覆寫 + 硬碟消磁），並在 DMP 中載明銷毀責任人。');
    if (!d.security.find(s => s.key === 'mfa')) recs.push('為所有資料存取帳號啟用多因素認證 (MFA)。');
    if (!d.security.find(s => s.key === 'backup')) recs.push('採用 3-2-1 備份原則：3 份副本、2 種媒介、1 份異地。');
    if (d.dataTypes.some(t => t.key === 'genetic')) recs.push('基因資料建議採用聯邦學習或本地計算，避免原始資料離開受控環境。');
    if (recs.length === 0) recs.push('當前計畫已較為完善，建議在執行階段定期復審（建議每 6 個月）並更新 DMP。');

    ul.innerHTML = recs.map(r => `<li>${r}</li>`).join('');
  }

  /* ---------- Build DMP document (Markdown) ---------- */
  function buildDMP(d, r) {
    const today = new Date().toISOString().slice(0, 10);
    const domainMap = { medical:'醫療 / 臨床研究', 'public-health':'公共衛生', social:'社會科學', education:'教育', business:'商業', tech:'資訊科學', gov:'政府研究', other:'其他' };
    const collectMap = { survey:'問卷 / 訪談', device:'儀器 / 感測器', ehr:'既有系統導出', web:'網路抓取', experiment:'實驗測量', public:'公開資料集', mixed:'混合多種' };
    const sampleMap = { small:'< 100', medium:'100 – 1,000', large:'1,000 – 10,000', xlarge:'10,000 – 100,000', huge:'> 100,000' };
    const storageMap = { local:'本地受控伺服器', institution:'機構雲端', 'public-cloud':'商業公有雲', hybrid:'混合架構' };
    const dpoMap = { appointed:'已指定專職資料保護長 (DPO)', dual:'PI 兼任資料保護負責人', committee:'倫理 / 資安委員會集中管理', none:'尚未指定' };
    const sharingMap = { open:'開放共享', restricted:'受限共享 (DUA)', internal:'機構內共享', closed:'不對外共享' };
    const licenseMap = { cc0:'CC0 公共領域', ccby:'CC BY 署名', ccbync:'CC BY-NC 署名 · 非商業', custom:'自訂 DUA', na:'不適用', '':'未指定' };
    const retentionMap = { '1y':'≤ 1 年', '3y':'3 年', '5y':'5 年', '10y':'10 年', permanent:'永久 / 長期保存' };
    const destructionMap = { overwrite:'多次軟體覆寫', degauss:'消磁 / 物理破壞', shred:'紙本碎紙', archive:'轉為長期匿名化檔案', undecided:'尚未確定' };
    const irbMap = { approved:'已通過', pending:'審查中', exempt:'已豁免', none:'無' };

    const dataTypeStr = d.dataTypes.map(t => t.label).join('、') || '未指定';
    const techStr = d.techs.map(t => t.label).join('、') || '無';
    const securityStr = d.security.map(s => s.label).join('、') || '無';

    return `# 資料管理計畫 (Data Management Plan)

> 自動生成於 ${today} ｜ Hughie's Online Lab DMP Generator
> 風險評估綜合得分：**${r.safety} / 100**（${r.label}）

---

## 1. 專案資訊

- **專案名稱**：${d.projectName}
- **負責人 (PI)**：${d.piName}
- **所屬機構**：${d.institution}
- **執行期間**：${d.startDate} 至 ${d.endDate}
- **研究領域**：${domainMap[d.domain] || '—'}
- **研究目標**：${d.objective || '（未填寫）'}

## 2. 資料說明

- **資料類型**：${dataTypeStr}
- **採集方式**：${collectMap[d.collectionMethod] || '—'}
- **預估樣本量**：${sampleMap[d.sampleSize] || '—'}
- **資料格式**：依採集工具決定（建議優先使用開放格式：CSV、JSON、Parquet）
- **元資料標準**：建議採用 DataCite / Dublin Core / DDI 中適合本領域者

## 3. 倫理與法規依據

- **倫理審查狀態**：${irbMap[d.irb]}
- **同意取得**：${['已獲明確、具體、可撤回的書面同意','—','已獲一般性同意','使用既有資料 / 倫理豁免','—','未獲取或無法追溯'][d.s5] || '—'}
- **適用法規**：GDPR (歐盟) · PIPL (中國大陸) · 機構倫理規範 · ${d.dataTypes.some(t=>t.key==='health')?'HIPAA (若涉美國健康資料)':''}
- **資料主體權利**：保障訪問、更正、刪除、可攜、撤回同意等權利。

## 4. 資料敏感度與識別風險評估

| 維度 | 得分 / 25 | 等級 |
| --- | --- | --- |
| 資料敏感度 | ${r.dimSens} | ${tagFor(r.dimSens)} |
| 識別風險 | ${r.dimId} | ${tagFor(r.dimId)} |
| 匿名化充分性 | ${r.dimAnon} | ${tagFor(r.dimAnon)} |
| 儲存安全 | ${r.dimSec} | ${tagFor(r.dimSec)} |
| 合規完備性 | ${r.dimComp} | ${tagFor(r.dimComp)} |

**綜合風險評估**：${r.narrative}

## 5. 匿名化與去識別策略

採用的技術組合：${techStr}

${d.kValue ? `- **k-匿名 k 值**：${d.kValue}` : ''}
${d.tools ? `- **工具 / 函式庫**：${d.tools}` : ''}

**處理流程**：
1. 採集後立即移除直接識別欄位（姓名、ID、聯絡方式）；
2. 對準識別符進行泛化 / 抑制；
3. 依據敏感屬性實施 k-匿名 / l-多樣性 / t-接近；
4. 對外發布前使用差分隱私或合成資料技術進一步保護；
5. 假名映射表單獨加密儲存，與分析資料物理隔離。

## 6. 資料儲存與安全控制

- **儲存位置**：${storageMap[d.storage] || '—'}
- **資料保護負責人**：${dpoMap[d.dpo]}
- **採用的安全措施**：${securityStr}
- **存取原則**：最小化授權、需知必要 (need-to-know)、所有操作可稽核。
- **事件回應**：發生疑似資料外洩須在 72 小時內通報資料保護負責人並啟動回應流程（GDPR 第 33 條）。

## 7. 資料共享與重用

- **共享級別**：${sharingMap[d.sharing] || '—'}
- **授權方式**：${licenseMap[d.license]}
- **FAIR 原則落實**：
  - **Findable**：在公開資料庫（如 Zenodo、Dryad）登錄並指派 DOI；
  - **Accessible**：經審查後可透過資料使用協議 (DUA) 申請；
  - **Interoperable**：使用開放格式與標準元資料；
  - **Reusable**：附完整說明文件與授權聲明。

## 8. 資料保留與銷毀

- **保留期限**：${retentionMap[d.retention] || '—'}
- **保留期滿處理**：${destructionMap[d.destruction]}
- **銷毀記錄**：填寫銷毀證明書並由 PI 與 DPO 簽署存檔。

## 9. 角色與責任

| 角色 | 職責 |
| --- | --- |
| PI / 計畫主持人 | 整體資料治理與倫理合規 |
| 資料保護負責人 (DPO) | 隱私風險評估、事件回應、合規諮詢 |
| 研究助理 / 分析人員 | 依授權存取資料、執行去識別流程 |
| 機構資安單位 | 提供基礎設施、稽核與備份 |

## 10. 預算與資源

- 匿名化軟體授權與雲端儲存費用須納入計畫預算；
- 安全控制升級（MFA、稽核系統）建議與機構資訊單位共同分攤。

## 11. 復審與更新

本 DMP 將於：(a) 計畫中期；(b) 資料類型或共享方式變更時；(c) 法規更新時，由 PI 與 DPO 共同復審並更新版本號。

---

*本文件由 Hughie's Online Lab — Data Anonymization & DMP Generator 自動生成，僅供參考，不構成法律意見。*
`;
  }

  function tagFor(v) {
    if (v < 8) return '⚠ 不足';
    if (v < 14) return '基本';
    if (v < 20) return '良好';
    return '優秀';
  }

  /* ---------- Format DMP markdown to simple HTML preview ---------- */
  function formatDMPHtml(md) {
    let html = md;
    // strip blockquote
    html = html.replace(/^> (.*)$/gm, '<p style="color:#888;font-style:italic;margin:8px 0;">$1</p>');
    // headers
    html = html.replace(/^# (.*)$/gm, '<h2 style="font-size:22px;color:#1a1a1a;margin:0 0 14px;">$1</h2>');
    html = html.replace(/^## (.*)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.*)$/gm, '<p style="font-weight:700;margin:12px 0 4px;">$1</p>');
    // bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    // italics
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // tables
    html = html.replace(/((?:^\|.*\|\s*\n)+)/gm, function (table) {
      const rows = table.trim().split('\n');
      const thead = rows[0].split('|').slice(1, -1).map(c => `<th style="text-align:left;padding:6px 10px;border-bottom:1px solid #ece5d3;font-size:12px;color:#c9a961;letter-spacing:.5px;">${c.trim()}</th>`).join('');
      const body = rows.slice(2).map(r => '<tr>' + r.split('|').slice(1, -1).map(c => `<td style="padding:6px 10px;border-bottom:1px solid #f4eedb;">${c.trim()}</td>`).join('') + '</tr>').join('');
      return `<table style="width:100%;border-collapse:collapse;margin:10px 0 16px;font-size:13px;"><thead><tr>${thead}</tr></thead><tbody>${body}</tbody></table>`;
    });
    // unordered list
    html = html.replace(/((?:^- .*\n?)+)/gm, function (list) {
      const items = list.trim().split('\n').map(l => `<li>${l.replace(/^- /, '')}</li>`).join('');
      return `<ul style="padding-left:20px;margin:8px 0 14px;line-height:1.85;">${items}</ul>`;
    });
    // ordered list
    html = html.replace(/((?:^\d+\. .*\n?)+)/gm, function (list) {
      const items = list.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('');
      return `<ol style="padding-left:20px;margin:8px 0 14px;line-height:1.85;">${items}</ol>`;
    });
    // hr
    html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #ece5d3;margin:20px 0;">');
    // paragraphs (line breaks between content blocks)
    html = html.replace(/\n\n/g, '</p><p style="margin:6px 0 10px;">');
    return '<p>' + html + '</p>';
  }

  function stripMarkdown(md) {
    return md.replace(/^#{1,6}\s+/gm, '')
             .replace(/\*\*(.+?)\*\*/g, '$1')
             .replace(/\*(.+?)\*/g, '$1')
             .replace(/^>\s+/gm, '')
             .replace(/^\|.*\|$/gm, function (line) {
               return line.replace(/\|/g, '\t').trim();
             })
             .replace(/^---$/gm, '——————————————————————');
  }

  function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }

  function sanitize(s) {
    return (s || 'project').replace(/[^\w\u4e00-\u9fa5-]/g, '_').slice(0, 40);
  }

})();
