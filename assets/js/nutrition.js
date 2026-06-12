(function () {
  const form = document.getElementById('assessmentForm');
  const steps = form.querySelectorAll('.form-step');
  const stepLabels = document.querySelectorAll('.progress-steps .step');
  const progressFill = document.getElementById('progressFill');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');
  const resultPanel = document.getElementById('result');

  let current = 1;
  const total = steps.length;

  function updateUI() {
    steps.forEach(s => s.classList.toggle('active', +s.dataset.step === current));
    stepLabels.forEach(l => l.classList.toggle('active', +l.dataset.step === current));
    progressFill.style.width = (current / total * 100) + '%';
    prevBtn.disabled = current === 1;
    nextBtn.style.display = current === total ? 'none' : 'inline-block';
    submitBtn.style.display = current === total ? 'inline-block' : 'none';
  }

  function validateStep(step) {
    const node = form.querySelector(`.form-step[data-step="${step}"]`);
    const required = node.querySelectorAll('[required]');
    for (const el of required) {
      if (el.type === 'radio') {
        const group = node.querySelectorAll(`[name="${el.name}"]`);
        if (![...group].some(r => r.checked)) {
          alert('請完成本頁所有必填項。');
          return false;
        }
      } else if (!el.value) {
        alert('請完成本頁所有必填項。');
        el.focus();
        return false;
      }
    }
    return true;
  }

  nextBtn.addEventListener('click', () => {
    if (!validateStep(current)) return;
    if (current < total) { current++; updateUI(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  });
  prevBtn.addEventListener('click', () => {
    if (current > 1) { current--; updateUI(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  });
  submitBtn.addEventListener('click', () => {
    if (!validateStep(current)) return;
    calculate();
  });

  updateUI();

  function calculate() {
    const data = new FormData(form);
    const get = k => data.get(k);
    const getAll = k => data.getAll(k);

    const age = +get('age');
    const height = +get('height') / 100;
    const weight = +get('weight');
    const bmi = weight / (height * height);

    let bmiScore = 0, bmiCat = '';
    if (bmi < 16) { bmiScore = 5; bmiCat = '嚴重消瘦'; }
    else if (bmi < 18.5) { bmiScore = 12; bmiCat = '偏瘦'; }
    else if (bmi < 24) { bmiScore = 25; bmiCat = '正常範圍'; }
    else if (bmi < 28) { bmiScore = 17; bmiCat = '超重'; }
    else if (bmi < 32) { bmiScore = 10; bmiCat = '肥胖'; }
    else { bmiScore = 5; bmiCat = '嚴重肥胖'; }

    const wc = get('weightChange');
    const wcAdj = { stable: 0, mildLoss: -2, moderateLoss: -4, severeLoss: -7, gain: -2 }[wc] || 0;
    bmiScore = Math.max(0, bmiScore + wcAdj);

    const groups = getAll('foodGroups');
    const diversityScore = Math.min(25, Math.round(groups.length / 8 * 25));

    let habitScore = 0;
    habitScore += { '3': 7, '2': 4, '1': 2, irregular: 1 }[get('mealCount')] || 0;
    habitScore += { good: 6, fair: 4, poor: 2, veryPoor: 0 }[get('appetite')] || 0;
    habitScore += { rare: 4, some: 3, often: 1, veryOften: 0 }[get('eatOut')] || 0;
    habitScore += { rare: 3, some: 2, often: 1, daily: 0 }[get('sugar')] || 0;

    let lifestyleScore = 0;
    lifestyleScore += { high: 6, medium: 4, low: 2, none: 0 }[get('exercise')] || 0;
    lifestyleScore += { ideal: 6, short: 3, veryShort: 1, long: 3 }[get('sleep')] || 0;
    lifestyleScore += { never: 4, former: 3, light: 2, heavy: 0 }[get('smoke')] || 0;
    lifestyleScore += { never: 4, occasional: 3, weekly: 2, daily: 0 }[get('alcohol')] || 0;

    const symptoms = getAll('symptoms');
    const hasNone = symptoms.includes('none');
    let healthScore = 10;
    if (!hasNone) {
      const negatives = symptoms.filter(s => s !== 'none').length;
      healthScore = Math.max(0, 10 - negatives * 2);
    }

    const totalScore = Math.round(bmiScore + diversityScore + habitScore + lifestyleScore + healthScore);

    renderResult({
      total: totalScore, bmi, bmiCat,
      bmiScore, diversityScore, habitScore, lifestyleScore, healthScore,
      groups, age, gender: get('gender'),
      flags: { wc, appetite: get('appetite'), exercise: get('exercise'),
               sleep: get('sleep'), smoke: get('smoke'), alcohol: get('alcohol'),
               sugar: get('sugar'), eatOut: get('eatOut'), symptoms }
    });
  }

  function renderResult(r) {
    document.getElementById('totalScore').textContent = r.total;
    document.getElementById('bmiVal').textContent = r.bmi.toFixed(1);
    document.getElementById('bmiCat').textContent = r.bmiCat;
    document.getElementById('diversityVal').textContent = r.groups.length + '/8';
    document.getElementById('habitVal').textContent = r.habitScore + '/20';
    document.getElementById('lifestyleVal').textContent = r.lifestyleScore + '/20';

    setTimeout(() => {
      document.getElementById('scoreFill').style.width = r.total + '%';
    }, 100);

    let label = '';
    if (r.total >= 85) label = 'EXCELLENT　優秀';
    else if (r.total >= 70) label = 'GOOD　良好';
    else if (r.total >= 55) label = 'FAIR　一般';
    else if (r.total >= 40) label = 'NEEDS IMPROVEMENT　需改善';
    else label = 'POOR　較差';
    document.getElementById('scoreLabel').textContent = label;

    const recs = [];
    if (r.bmi < 18.5) recs.push('BMI 偏低，建議在保證營養均衡的前提下適度增加總能量攝入，重點補充優質蛋白和健康脂肪。');
    else if (r.bmi >= 24 && r.bmi < 28) recs.push('BMI 處於超重範圍，建議減少精製糖與飽和脂肪攝入，配合規律運動逐步減重。');
    else if (r.bmi >= 28) recs.push('BMI 達到肥胖標準，建議在專業人員指導下制定減重方案，並關注血糖、血脂、血壓等指標。');
    else recs.push('BMI 處於健康範圍，請繼續保持當前體重管理習慣。');

    if (r.flags.wc === 'severeLoss' || r.flags.wc === 'moderateLoss')
      recs.push('近期出現明顯體重下降，建議排查是否有疾病、心理或飲食結構問題，必要時就醫。');

    const labelMap = { grains:'穀類', vegetables:'蔬菜', fruits:'水果', protein:'優質蛋白',
                       dairy:'奶製品', legumes:'豆類', nuts:'堅果', water:'充足飲水' };
    const missing = [];
    Object.keys(labelMap).forEach(k => { if (!r.groups.includes(k)) missing.push(labelMap[k]); });
    if (missing.length >= 4)
      recs.push('膳食多樣性不足，建議增加以下食物類別：' + missing.join('、') + '。');
    else if (missing.length >= 1)
      recs.push('可進一步補充：' + missing.join('、') + '，使每日食物種類達到 12 種以上。');

    if (r.flags.appetite === 'poor' || r.flags.appetite === 'veryPoor')
      recs.push('食慾不振可能與壓力、睡眠或潛在疾病有關，建議少食多餐並關注情緒狀態。');
    if (r.flags.eatOut === 'often' || r.flags.eatOut === 'veryOften')
      recs.push('外食頻率較高，注意控制油鹽糖攝入，主動選擇蒸、煮、燉等低脂烹飪方式。');
    if (r.flags.sugar === 'often' || r.flags.sugar === 'daily')
      recs.push('含糖飲料和甜點攝入偏多，建議用水、無糖茶或新鮮水果替代。');
    if (r.flags.exercise === 'none' || r.flags.exercise === 'low')
      recs.push('身體活動不足，建議每週至少進行 150 分鐘中等強度有氧運動，並結合 2 次力量訓練。');
    if (r.flags.sleep === 'veryShort' || r.flags.sleep === 'short')
      recs.push('睡眠時間偏短可能影響食慾調節激素，建議保持每晚 7 – 9 小時規律睡眠。');
    if (r.flags.smoke === 'heavy' || r.flags.smoke === 'light')
      recs.push('吸菸會降低多種微量營養素的吸收，建議盡早戒菸或尋求戒菸支持。');
    if (r.flags.alcohol === 'daily' || r.flags.alcohol === 'weekly')
      recs.push('長期飲酒會影響 B 族維生素和礦物質代謝，建議減少飲酒頻率與單次量。');

    if (r.flags.symptoms.includes('chronic'))
      recs.push('已有慢性疾病，飲食方案應結合具體病情，建議在醫生或註冊營養師指導下進行調整。');
    if (r.flags.symptoms.includes('medication'))
      recs.push('長期用藥可能影響某些營養素吸收，可諮詢醫生評估是否需要補充。');

    if (recs.length === 0)
      recs.push('整體狀況良好，請繼續保持當前的飲食與生活習慣，並定期進行健康體檢。');

    document.getElementById('recommendations').innerHTML = recs.map(t => `<li>${t}</li>`).join('');

    form.style.display = 'none';
    document.querySelector('.progress-wrap').style.display = 'none';
    resultPanel.style.display = 'block';
    window.scrollTo({ top: resultPanel.offsetTop - 40, behavior: 'smooth' });
  }
})();
