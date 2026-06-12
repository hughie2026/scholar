(function () {
  'use strict';

  // ============ 維度與題目映射 ============
  const DIMENSIONS = {
    1: { name: '健康知識', questions: ['q1','q2','q3','q4','q5'], type: 'binary', max: 20 },
    2: { name: '疾病預防', questions: ['q6','q7','q8','q9','q10'], type: 'binary', max: 20 },
    3: { name: '生活方式', questions: ['q11','q12','q13','q14','q15'], type: 'likert', max: 20 },
    4: { name: '信息素養', questions: ['q16','q17','q18','q19','q20'], type: 'binary', max: 20 },
    5: { name: '急救就醫', questions: ['q21','q22','q23','q24','q25'], type: 'binary', max: 20 }
  };

  // ============ 步驟切換 ============
  let currentStep = 1;
  const totalSteps = 6;
  const form = document.getElementById('assessmentForm');
  const steps = document.querySelectorAll('.form-step');
  const stepTags = document.querySelectorAll('.progress-steps .step');
  const progressFill = document.getElementById('progressFill');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');

  function updateUI() {
    steps.forEach(s => s.classList.toggle('active', +s.dataset.step === currentStep));
    stepTags.forEach(s => {
      const n = +s.dataset.step;
      s.classList.toggle('active', n === currentStep);
      s.classList.toggle('done', n < currentStep);
    });
    progressFill.style.width = ((currentStep / totalSteps) * 100) + '%';
    prevBtn.disabled = currentStep === 1;
    nextBtn.style.display = currentStep === totalSteps ? 'none' : '';
    submitBtn.style.display = currentStep === totalSteps ? '' : 'none';
    window.scrollTo({ top: document.querySelector('.progress-wrap').offsetTop - 80, behavior: 'smooth' });
  }

  function validateStep(step) {
    const stepEl = document.querySelector(`.form-step[data-step="${step}"]`);
    const fields = stepEl.querySelectorAll('input[required], select[required]');
    let valid = true;
    let firstInvalid = null;
    fields.forEach(f => {
      if (f.type === 'radio') {
        const group = stepEl.querySelectorAll(`input[name="${f.name}"]`);
        if (![...group].some(r => r.checked)) { valid = false; if (!firstInvalid) firstInvalid = f; }
      } else if (!f.value) {
        valid = false;
        if (!firstInvalid) firstInvalid = f;
      }
    });
    if (!valid) {
      alert('請完成本步驟的所有必填項。');
      if (firstInvalid && firstInvalid.focus) firstInvalid.focus();
    }
    return valid;
  }

  prevBtn.addEventListener('click', () => {
    if (currentStep > 1) { currentStep--; updateUI(); }
  });
  nextBtn.addEventListener('click', () => {
    if (validateStep(currentStep) && currentStep < totalSteps) { currentStep++; updateUI(); }
  });
  submitBtn.addEventListener('click', () => {
    if (validateStep(currentStep)) calculateAndShow();
  });

  // ============ 計分 ============
  function getValue(name) {
    const el = form.elements[name];
    if (!el) return 0;
    return parseFloat(el.value) || 0;
  }

  function calculateDimension(dimKey) {
    const dim = DIMENSIONS[dimKey];
    let raw = 0;
    if (dim.type === 'binary') {
      // 每題 0 或 1，5 題滿分 5
      dim.questions.forEach(q => raw += getValue(q));
      return (raw / dim.questions.length) * dim.max; // 歸一到 0-20
    } else if (dim.type === 'likert') {
      // 每題 1-5，5 題滿分 25
      dim.questions.forEach(q => raw += getValue(q));
      const min = dim.questions.length * 1;
      const max = dim.questions.length * 5;
      return ((raw - min) / (max - min)) * dim.max;
    }
    return 0;
  }

  function getLevel(score) {
    if (score >= 90) return { label: '優秀', class: 'level-excellent' };
    if (score >= 75) return { label: '良好', class: 'level-good' };
    if (score >= 60) return { label: '中等', class: 'level-medium' };
    return { label: '待提升', class: 'level-low' };
  }

  function getDimTag(score, max) {
    const ratio = score / max;
    if (ratio >= 0.85) return '優勢領域';
    if (ratio >= 0.6) return '基本達標';
    return '需要關注';
  }

  // ============ 雷達圖 (純 SVG) ============
  function renderRadar(scores) {
    const labels = ['健康知識', '疾病預防', '生活方式', '信息素養', '急救就醫'];
    const max = 20;
    const size = 380;
    const cx = size / 2, cy = size / 2;
    const radius = 130;
    const N = scores.length;

    const angle = (i) => (Math.PI * 2 * i / N) - Math.PI / 2;
    const point = (i, r) => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];

    let svg = `<svg viewBox="0 0 ${size} ${size}" width="100%" style="max-width:380px" xmlns="http://www.w3.org/2000/svg">`;

    // 同心多邊形（4層）
    for (let layer = 1; layer <= 4; layer++) {
      const r = radius * layer / 4;
      const pts = [];
      for (let i = 0; i < N; i++) {
        const [x, y] = point(i, r);
        pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
      svg += `<polygon points="${pts.join(' ')}" fill="none" stroke="#E5E7EB" stroke-width="1"/>`;
    }
    // 軸線
    for (let i = 0; i < N; i++) {
      const [x, y] = point(i, radius);
      svg += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#E5E7EB" stroke-width="1"/>`;
    }
    // 數據區
    const dataPts = scores.map((s, i) => {
      const [x, y] = point(i, radius * (s / max));
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    svg += `<polygon points="${dataPts.join(' ')}" fill="rgba(108,58,237,0.25)" stroke="#6C3AED" stroke-width="2" stroke-linejoin="round"/>`;
    // 數據點
    scores.forEach((s, i) => {
      const [x, y] = point(i, radius * (s / max));
      svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#6C3AED"/>`;
    });
    // 標籤
    labels.forEach((label, i) => {
      const [x, y] = point(i, radius + 24);
      svg += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="13" font-weight="600" fill="#1F2937">${label}</text>`;
    });

    svg += `</svg>`;
    document.getElementById('radarWrap').innerHTML = svg;
  }

  // ============ 建議生成 ============
  function buildRecommendations(dimScores) {
    const tips = {
      1: [
        '系統學習基礎健康知識，可參考國家衛健委發布的《公民健康素養 66 條》。',
        '定期關注權威健康科普平台（如國家衛健委、WHO 中文網站）。',
        '建議掌握體溫、血壓、BMI 等核心健康指標的正常範圍。'
      ],
      2: [
        '了解傳染病的主要傳播途徑與防護方式，按時完成預防接種。',
        '關注高血壓、糖尿病等慢性病的早期信號，定期測量並記錄。',
        '重視心理健康，學會識別焦慮、抑鬱的常見徵兆並及時尋求支持。'
      ],
      3: [
        '逐步建立每週 ≥ 150 分鐘中等強度運動的習慣。',
        '參考《中國居民膳食指南》調整飲食結構，增加蔬果、全穀物攝入。',
        '保持規律作息，每晚 7 – 9 小時優質睡眠對代謝與情緒都至關重要。',
        '不吸菸、限酒，主動避開二手菸環境。'
      ],
      4: [
        '優先選擇政府衛健部門、醫療機構及同行評議期刊作為信息來源。',
        '對網絡上的「神奇療法」「特效偏方」等內容保持警惕，多源比對。',
        '提升閱讀藥品說明書、檢驗報告的能力，與醫生溝通時提供完整信息。'
      ],
      5: [
        '建議學習基本心肺復甦術 (CPR) 和海姆立克急救法。',
        '熟記中國大陸急救電話 120、火警 119、報警 110。',
        '了解燙傷、出血、中毒等常見家庭意外的初步處置原則。',
        '家中可常備急救包，包含創可貼、消毒用品、體溫計等。'
      ]
    };
    const out = [];
    Object.keys(dimScores).forEach(k => {
      const ratio = dimScores[k] / 20;
      if (ratio < 0.85) {
        // 該維度未達優秀，給對應建議
        const arr = tips[k];
        // 越低分給越多條
        const n = ratio < 0.5 ? Math.min(arr.length, 3) : ratio < 0.7 ? 2 : 1;
        for (let i = 0; i < n; i++) out.push(`【${DIMENSIONS[k].name}】${arr[i]}`);
      }
    });
    if (out.length === 0) {
      out.push('你的健康素養水平整體優秀，建議繼續保持當前狀態，並樂於分享給家人朋友。');
    }
    out.push('培養健康素養是一個長期過程，建議每 6 – 12 個月重新評估一次以追蹤變化。');
    return out;
  }

  function buildInterpretation(total, dimScores) {
    const level = getLevel(total);
    let str = `你的健康素養綜合得分為 <strong>${total.toFixed(1)} / 100</strong>，整體水平為 <strong>${level.label}</strong>。`;

    // 找出最高與最低維度
    const arr = Object.entries(dimScores).map(([k, v]) => ({ k: +k, v, name: DIMENSIONS[k].name }));
    arr.sort((a, b) => b.v - a.v);
    const top = arr[0], low = arr[arr.length - 1];
    str += ` 在五個評估維度中，<strong>${top.name}</strong>（${top.v.toFixed(1)} 分）是你的相對優勢領域`;
    if (top.v - low.v > 4) {
      str += `，而 <strong>${low.name}</strong>（${low.v.toFixed(1)} 分）相對較弱，建議優先提升。`;
    } else {
      str += `，各維度發展較為均衡。`;
    }
    if (total < 60) {
      str += ' 健康素養是健康行為與健康結局的重要保護因素，建議從最薄弱的維度入手，循序漸進地建立健康知識與技能。';
    } else if (total < 75) {
      str += ' 你已具備一定的健康素養基礎，繼續鞏固薄弱環節，將有助於形成更穩定的健康行為模式。';
    } else {
      str += ' 你的健康素養水平在人群中處於較好位置，可以將你掌握的知識與技能傳播給家人和朋友。';
    }
    return str;
  }

  // ============ 結果展示 ============
  function calculateAndShow() {
    const dimScores = {};
    Object.keys(DIMENSIONS).forEach(k => { dimScores[k] = calculateDimension(k); });
    const total = Object.values(dimScores).reduce((a, b) => a + b, 0);

    // 隱藏表單
    form.style.display = 'none';
    document.querySelector('.progress-wrap').style.display = 'none';

    // 總分
    const level = getLevel(total);
    const card = document.getElementById('scoreCard');
    ['level-excellent', 'level-good', 'level-medium', 'level-low'].forEach(c => card.classList.remove(c));
    card.classList.add(level.class);
    document.getElementById('totalScore').textContent = total.toFixed(1);
    document.getElementById('scoreLabel').textContent = level.label;
    setTimeout(() => {
      document.getElementById('scoreFill').style.width = Math.min(total, 100) + '%';
    }, 100);

    // 各維度
    [1, 2, 3, 4, 5].forEach(k => {
      document.getElementById(`dim${k}Val`).textContent = dimScores[k].toFixed(1);
      document.getElementById(`dim${k}Tag`).textContent = getDimTag(dimScores[k], 20);
    });

    // 雷達圖
    renderRadar([1, 2, 3, 4, 5].map(k => dimScores[k]));

    // 解讀
    document.getElementById('interpretation').innerHTML = buildInterpretation(total, dimScores);

    // 建議
    const recs = buildRecommendations(dimScores);
    document.getElementById('recommendations').innerHTML =
      recs.map(t => `<li>${t}</li>`).join('');

    // 顯示結果
    const result = document.getElementById('result');
    result.style.display = 'block';
    setTimeout(() => result.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  // 初始化
  updateUI();
})();
