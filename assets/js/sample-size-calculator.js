/* =========================================================
 * Sample Size & Power Calculator
 * Hughie's Online Lab
 * ========================================================= */
(function () {
  'use strict';

  /* ---------- 統計輔助函數 ---------- */
  function erf(x) {
    const s = x < 0 ? -1 : 1;
    x = Math.abs(x);
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741,
          a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return s * y;
  }
  function normCDF(z) { return 0.5 * (1 + erf(z / Math.SQRT2)); }
  // Acklam's algorithm — inverse standard-normal CDF
  function normInv(p) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    const a = [-3.969683028665376e+1, 2.209460984245205e+2, -2.759285104469687e+2,
               1.383577518672690e+2, -3.066479806614716e+1, 2.506628277459239];
    const b = [-5.447609879822406e+1, 1.615858368580409e+2, -1.556989798598866e+2,
               6.680131188771972e+1, -1.328068155288572e+1];
    const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
               -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [7.784695709041462e-3, 3.224671290700398e-1,
               2.445134137142996, 3.754408661907416];
    const plow = 0.02425, phigh = 1 - plow;
    let q, r;
    if (p < plow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
             ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    }
    if (p <= phigh) {
      q = p - 0.5; r = q * q;
      return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5]) * q /
             (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
    }
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
            ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }

  /* ---------- 各檢定的計算引擎 ----------
   * 統一介面: state -> 結果物件
   * 結果物件可能包含: n, n1, n2, total, power, df
   */
  function calc2SampleMean(s) {
    const za = s.sided === 2 ? normInv(1 - s.alpha / 2) : normInv(1 - s.alpha);
    if (s.mode === 'size') {
      const zb = normInv(s.power);
      const n1 = Math.ceil((1 + 1 / s.k) * Math.pow((za + zb) / Math.abs(s.d), 2));
      const n2 = Math.ceil(n1 * s.k);
      return { n1, n2, total: n1 + n2, df: n1 + n2 - 2 };
    } else {
      const n1 = s.n1, n2 = Math.max(2, Math.round(n1 * s.k));
      const ncp = Math.abs(s.d) / Math.sqrt(1 / n1 + 1 / n2);
      const power = s.sided === 2
        ? normCDF(ncp - za) + normCDF(-ncp - za)
        : normCDF(ncp - za);
      return { n1, n2, total: n1 + n2, power, df: n1 + n2 - 2 };
    }
  }

  function calc1SampleMean(s) {
    const za = s.sided === 2 ? normInv(1 - s.alpha / 2) : normInv(1 - s.alpha);
    if (s.mode === 'size') {
      const zb = normInv(s.power);
      const n = Math.ceil(Math.pow((za + zb) / Math.abs(s.d), 2));
      return { n, df: n - 1 };
    } else {
      const ncp = Math.abs(s.d) * Math.sqrt(s.n);
      const power = s.sided === 2
        ? normCDF(ncp - za) + normCDF(-ncp - za)
        : normCDF(ncp - za);
      return { n: s.n, power, df: s.n - 1 };
    }
  }

  function calc2SampleProp(s) {
    const za = s.sided === 2 ? normInv(1 - s.alpha / 2) : normInv(1 - s.alpha);
    const diff = Math.abs(s.p1 - s.p2);
    if (s.mode === 'size') {
      const zb = normInv(s.power);
      const pbar = (s.p1 + s.k * s.p2) / (1 + s.k);
      const num = za * Math.sqrt((1 + 1 / s.k) * pbar * (1 - pbar)) +
                  zb * Math.sqrt(s.p1 * (1 - s.p1) + s.p2 * (1 - s.p2) / s.k);
      const n1 = Math.ceil(Math.pow(num / diff, 2));
      const n2 = Math.ceil(n1 * s.k);
      return { n1, n2, total: n1 + n2 };
    } else {
      const n1 = s.n1, n2 = Math.max(2, Math.round(n1 * s.k));
      const pbar = (n1 * s.p1 + n2 * s.p2) / (n1 + n2);
      const seNull = Math.sqrt(pbar * (1 - pbar) * (1 / n1 + 1 / n2));
      const seAlt = Math.sqrt(s.p1 * (1 - s.p1) / n1 + s.p2 * (1 - s.p2) / n2);
      const z = (diff - za * seNull) / seAlt;
      let power = normCDF(z);
      if (s.sided === 2) power += normCDF((-diff - za * seNull) / seAlt);
      return { n1, n2, total: n1 + n2, power };
    }
  }

  function calc1SampleProp(s) {
    const za = s.sided === 2 ? normInv(1 - s.alpha / 2) : normInv(1 - s.alpha);
    const diff = Math.abs(s.p1 - s.p0);
    if (s.mode === 'size') {
      const zb = normInv(s.power);
      const num = za * Math.sqrt(s.p0 * (1 - s.p0)) + zb * Math.sqrt(s.p1 * (1 - s.p1));
      const n = Math.ceil(Math.pow(num / diff, 2));
      return { n };
    } else {
      const seNull = Math.sqrt(s.p0 * (1 - s.p0) / s.n);
      const seAlt = Math.sqrt(s.p1 * (1 - s.p1) / s.n);
      const z = (diff - za * seNull) / seAlt;
      let power = normCDF(z);
      if (s.sided === 2) power += normCDF((-diff - za * seNull) / seAlt);
      return { n: s.n, power };
    }
  }

  function calcCorrelation(s) {
    const za = s.sided === 2 ? normInv(1 - s.alpha / 2) : normInv(1 - s.alpha);
    const r = Math.abs(s.r);
    const zr = 0.5 * Math.log((1 + r) / (1 - r)); // Fisher Z
    if (s.mode === 'size') {
      const zb = normInv(s.power);
      const n = Math.ceil(Math.pow((za + zb) / zr, 2) + 3);
      return { n, df: n - 2 };
    } else {
      const ncp = zr * Math.sqrt(s.n - 3);
      const power = s.sided === 2
        ? normCDF(ncp - za) + normCDF(-ncp - za)
        : normCDF(ncp - za);
      return { n: s.n, power, df: s.n - 2 };
    }
  }

  const ENGINES = {
    '2mean': calc2SampleMean,
    '1mean': calc1SampleMean,
    '2prop': calc2SampleProp,
    '1prop': calc1SampleProp,
    'corr':  calcCorrelation
  };

  function calculate(state) {
    return ENGINES[state.test](state);
  }

  /* ---------- DOM 引用 ---------- */
  const form        = document.getElementById('calcForm');
  const steps       = form.querySelectorAll('.form-step');
  const stepLabels  = document.querySelectorAll('.progress-steps .step');
  const progressEl  = document.getElementById('progressFill');
  const prevBtn     = document.getElementById('prevBtn');
  const nextBtn     = document.getElementById('nextBtn');
  const submitBtn   = document.getElementById('submitBtn');
  const resultPanel = document.getElementById('result');
  const TOTAL_STEPS = steps.length;
  let currentStep = 1;

  /* ---------- 條件欄位顯示控制 ---------- */
  function updateConditionalFields() {
    const mode = form.querySelector('input[name="mode"]:checked').value;
    const test = form.querySelector('input[name="test"]:checked').value;

    // mode 條件
    document.querySelectorAll('[data-cond]').forEach(el => {
      const want = el.getAttribute('data-cond');
      if (want === 'size' || want === 'power') {
        el.classList.toggle('active', want === mode);
      }
    });

    // test 條件
    document.querySelectorAll('[data-cond-test]').forEach(el => {
      const tests = el.getAttribute('data-cond-test').split(',').map(s => s.trim());
      el.classList.toggle('active', tests.includes(test));
    });
  }

  /* ---------- 進度與導航 ---------- */
  function showStep(n) {
    steps.forEach(s => s.classList.toggle('active', +s.dataset.step === n));
    stepLabels.forEach(s => {
      const k = +s.dataset.step;
      s.classList.toggle('active', k === n);
      s.classList.toggle('done', k < n);
    });
    progressEl.style.width = (n / TOTAL_STEPS * 100) + '%';
    prevBtn.disabled = n === 1;
    if (n === TOTAL_STEPS) {
      nextBtn.style.display = 'none';
      submitBtn.style.display = '';
    } else {
      nextBtn.style.display = '';
      submitBtn.style.display = 'none';
    }
    currentStep = n;
    window.scrollTo({ top: form.offsetTop - 60, behavior: 'smooth' });
  }

  function validateStep(n) {
    const stepEl = steps[n - 1];
    // 只校驗目前可見的輸入
    const inputs = stepEl.querySelectorAll('input, select');
    for (const input of inputs) {
      // 隱藏的條件區塊不校驗
      if (input.closest('.cond') && !input.closest('.cond').classList.contains('active')) continue;
      if (input.type === 'radio') continue; // radio 透過 group 校驗
      if (input.value === '' || input.value == null) {
        flash(input);
        return false;
      }
      if (input.type === 'number') {
        const v = parseFloat(input.value);
        if (!isFinite(v)) { flash(input); return false; }
      }
    }
    // 第二步：必須選 test
    if (n === 2 && !form.querySelector('input[name="test"]:checked')) return false;
    return true;
  }

  function flash(el) {
    el.style.borderColor = '#c9534a';
    el.focus();
    setTimeout(() => { el.style.borderColor = ''; }, 1200);
  }

  /* ---------- 收集表單狀態 ---------- */
  function collectState() {
    const fd = new FormData(form);
    const state = {
      mode:  fd.get('mode'),
      test:  fd.get('test'),
      alpha: parseFloat(fd.get('alpha')),
      sided: parseInt(fd.get('sided'), 10),
      power: parseFloat(fd.get('power') || 0.8),
      k:     parseFloat(fd.get('k') || 1)
    };

    // size vs power 的條件輸入
    if (state.mode === 'power') {
      if (state.test === '2mean' || state.test === '2prop') {
        state.n1 = parseInt(fd.get('n1'), 10);
      } else {
        state.n = parseInt(fd.get('n'), 10);
      }
    }

    // 效應量
    switch (state.test) {
      case '2mean':
      case '1mean':
        state.d = parseFloat(fd.get('d')); break;
      case '2prop':
        state.p1 = parseFloat(fd.get('p1'));
        state.p2 = parseFloat(fd.get('p2')); break;
      case '1prop':
        state.p0 = parseFloat(fd.get('p0'));
        state.p1 = parseFloat(fd.get('p1s')); break;
      case 'corr':
        state.r = parseFloat(fd.get('r')); break;
    }
    return state;
  }

  /* ---------- 結果渲染 ---------- */
  const TEST_NAME = {
    '2mean': '雙樣本均數比較（獨立 t 檢定）',
    '1mean': '單樣本 / 配對均數（單樣本 t 檢定）',
    '2prop': '雙樣本比例比較（z 檢定）',
    '1prop': '單樣本比例（z 檢定）',
    'corr':  'Pearson 相關係數'
  };

  function fmtPct(x) { return (x * 100).toFixed(1) + '%'; }
  function fmtNum(x, d = 3) { return Number(x).toFixed(d); }

  function buildMetrics(state, res) {
    const m = [];
    m.push({ label: '檢定類型', value: shortTestName(state.test), unit: '' });
    m.push({ label: '顯著水準 α', value: fmtNum(state.alpha, 3), unit: '' });
    m.push({ label: '檢定方向', value: state.sided === 2 ? '雙側' : '單側', unit: '' });

    if (state.mode === 'size') {
      m.push({ label: '目標檢定力', value: fmtPct(state.power), unit: '' });
      if (res.total != null) {
        m.push({ label: '第一組 n₁', value: res.n1, unit: '' });
        m.push({ label: '第二組 n₂', value: res.n2, unit: '' });
        m.push({ label: '總樣本量', value: res.total, unit: '' });
      } else {
        m.push({ label: '所需樣本量', value: res.n, unit: '' });
      }
    } else {
      if (res.n1 != null) {
        m.push({ label: '第一組 n₁', value: res.n1, unit: '' });
        m.push({ label: '第二組 n₂', value: res.n2, unit: '' });
        m.push({ label: '總樣本量', value: res.total, unit: '' });
      } else {
        m.push({ label: '樣本量 n', value: res.n, unit: '' });
      }
      m.push({ label: '計算所得檢定力', value: fmtPct(res.power), unit: '' });
    }

    // 效應量
    switch (state.test) {
      case '2mean':
      case '1mean':
        m.push({ label: "Cohen's d", value: fmtNum(state.d, 2), unit: '', note: dQual(state.d) });
        break;
      case '2prop':
        m.push({ label: 'p₁ vs p₂', value: fmtNum(state.p1,2)+' / '+fmtNum(state.p2,2), unit: '' });
        break;
      case '1prop':
        m.push({ label: 'p₀ vs p₁', value: fmtNum(state.p0,2)+' / '+fmtNum(state.p1,2), unit: '' });
        break;
      case 'corr':
        m.push({ label: '相關係數 r', value: fmtNum(state.r,2), unit: '', note: rQual(state.r) });
        break;
    }
    return m;
  }

  function shortTestName(t) {
    return ({ '2mean':'2-mean','1mean':'1-mean','2prop':'2-prop','1prop':'1-prop','corr':'Corr' })[t];
  }
  function dQual(d) {
    const a = Math.abs(d);
    if (a < 0.2) return '極小效應';
    if (a < 0.5) return '小效應';
    if (a < 0.8) return '中等效應';
    return '大效應';
  }
  function rQual(r) {
    const a = Math.abs(r);
    if (a < 0.1) return '極弱';
    if (a < 0.3) return '弱';
    if (a < 0.5) return '中';
    return '強';
  }

  function buildFormula(state, res) {
    const za = state.sided === 2
      ? `z<sub>α/2</sub>=${fmtNum(normInv(1-state.alpha/2),3)}`
      : `z<sub>α</sub>=${fmtNum(normInv(1-state.alpha),3)}`;
    const zb = state.mode === 'size' ? `z<sub>β</sub>=${fmtNum(normInv(state.power),3)}` : '';

    let formula = '';
    switch (state.test) {
      case '2mean':
        formula = `n₁ = (1 + 1/k) · (z<sub>α/2</sub> + z<sub>β</sub>)² / d²`;
        break;
      case '1mean':
        formula = `n = (z<sub>α/2</sub> + z<sub>β</sub>)² / d²`;
        break;
      case '2prop':
        formula = `n₁ = [ z<sub>α/2</sub>·√((1+1/k)·p̄(1−p̄)) + z<sub>β</sub>·√(p₁(1−p₁) + p₂(1−p₂)/k) ]² / (p₁−p₂)²`;
        break;
      case '1prop':
        formula = `n = [ z<sub>α/2</sub>·√(p₀(1−p₀)) + z<sub>β</sub>·√(p₁(1−p₁)) ]² / (p₁−p₀)²`;
        break;
      case 'corr':
        formula = `n = [ (z<sub>α/2</sub> + z<sub>β</sub>) / z<sub>r</sub> ]² + 3,&nbsp;&nbsp; z<sub>r</sub> = ½·ln((1+r)/(1−r))`;
        break;
    }

    return `
      <div><span class="lab">FORMULA</span> ${formula}</div>
      <div style="margin-top:8px;"><span class="lab">VALUES</span> ${za}${zb ? '，' + zb : ''}</div>
    `;
  }

  function buildInterpretation(state, res) {
    const test = TEST_NAME[state.test];
    if (state.mode === 'size') {
      const total = res.total != null ? res.total : res.n;
      let s = `在 α = ${state.alpha}（${state.sided===2?'雙側':'單側'}）、目標檢定力 1−β = ${fmtPct(state.power)} 的條件下，`;
      s += `${test} 至少需要 <strong>總樣本量 ${total}</strong>`;
      if (res.n1 != null && res.n2 != null) s += `（第一組 ${res.n1}，第二組 ${res.n2}）`;
      s += `，方能在預期效應下偵測到統計顯著差異。`;
      return s;
    } else {
      let s = `在當前樣本量與效應量設定下，${test} 的統計檢定力約為 <strong>${fmtPct(res.power)}</strong>。`;
      if (res.power < 0.8) s += ` 此檢定力低於常見的 0.80 標準，研究發現「無顯著差異」時可能有第二型錯誤的風險。`;
      else if (res.power < 0.95) s += ` 已達到一般學術發表所要求的水平。`;
      else s += ` 屬於高檢定力設計，發現真實效應的把握很大。`;
      return s;
    }
  }

  function buildRecommendations(state, res) {
    const recs = [];
    if (state.mode === 'size') {
      const total = res.total != null ? res.total : res.n;
      recs.push(`本估算為理論最小值，實務上建議再加 <em>10–20%</em> 以應對失訪、無效問卷或剔除個案。`);
      if (total < 30) recs.push(`樣本量較小，t 分佈與正態近似差異會比較明顯，建議用 G*Power 或 R 的 <code>pwr</code> 套件做精確計算。`);
      if (state.test === '2mean' || state.test === '1mean') {
        if (Math.abs(state.d) < 0.2) recs.push(`效應量 d &lt; 0.2 為極小效應，所需樣本量會非常龐大，請評估其臨床或實務意義。`);
      }
      if ((state.test === '2prop' || state.test === '1prop')) {
        const p = state.test === '2prop' ? Math.abs(state.p1 - state.p2) : Math.abs(state.p1 - state.p0);
        if (p < 0.05) recs.push(`兩比例差小於 0.05，所需樣本量會迅速放大，請確認預期差距是否合理。`);
      }
      if (state.test === '2mean' || state.test === '2prop') {
        if (state.k !== 1) recs.push(`你採用了非等比例設計（k=${state.k}）。等比例設計（k=1）通常更具統計效率，除非有實務或倫理上的限制。`);
      }
    } else {
      if (res.power < 0.8) {
        recs.push(`檢定力不足（&lt;0.80）。可考慮 <em>增加樣本量</em>、<em>提高效應量精度</em> 或 <em>放寬 α</em>（不建議盲目放寬）。`);
        recs.push(`若實驗已經完成，可在報告中說明檢定力限制並進行區間估計，避免僅依賴 p 值結論。`);
      } else if (res.power > 0.99) {
        recs.push(`檢定力非常高（&gt;0.99），樣本量可能過剩，可考慮 <em>縮小樣本量</em> 以降低成本。`);
      } else {
        recs.push(`當前設計已達到合理的檢定力水準，可按計畫執行研究。`);
      }
    }
    recs.push(`建議在正式分析前 <em>預先註冊</em> 樣本量與檢定力假設，以提升研究透明度。`);
    return recs;
  }

  /* ---------- 檢定力曲線 ---------- */
  function buildPowerCurve(state, res) {
    let baseN;
    if (state.mode === 'size') {
      baseN = res.total != null ? res.total : res.n;
    } else {
      baseN = res.total != null ? res.total : res.n;
    }
    if (!baseN || !isFinite(baseN)) baseN = 100;
    const minN = Math.max(4, Math.floor(baseN * 0.15));
    const maxN = Math.ceil(baseN * 2.5);
    const STEPS = 60;
    const points = [];
    for (let i = 0; i <= STEPS; i++) {
      const N = Math.max(4, Math.round(minN + (maxN - minN) * i / STEPS));
      const ps = Object.assign({}, state, { mode: 'power' });
      if (state.test === '2mean' || state.test === '2prop') {
        ps.n1 = Math.max(2, Math.round(N / (1 + state.k)));
      } else {
        ps.n = N;
      }
      const r = calculate(ps);
      let p = r.power;
      if (!isFinite(p)) p = 0;
      p = Math.max(0, Math.min(1, p));
      points.push([N, p]);
    }
    return { points, currentN: baseN };
  }

  function renderChart(container, curve) {
    const { points, currentN } = curve;
    const W = 580, H = 260, padL = 46, padR = 16, padT = 18, padB = 40;
    const xMin = points[0][0], xMax = points[points.length - 1][0];
    const xS = x => padL + (x - xMin) / (xMax - xMin) * (W - padL - padR);
    const yS = y => padT + (1 - y) * (H - padT - padB);
    const path = points.map((p, i) => (i ? 'L' : 'M') + xS(p[0]).toFixed(1) + ',' + yS(p[1]).toFixed(1)).join(' ');

    // closest current point
    let cur = points[0];
    let best = Infinity;
    for (const p of points) {
      const d = Math.abs(p[0] - currentN);
      if (d < best) { best = d; cur = p; }
    }

    const yTicks = [0, 0.25, 0.5, 0.75, 1];
    const yTickEls = yTicks.map(v => `
      <line x1="${padL}" x2="${W-padR}" y1="${yS(v)}" y2="${yS(v)}" stroke="#ece5d3" stroke-dasharray="${v===0||v===1?'0':'3 4'}"/>
      <text x="${padL-8}" y="${yS(v)+3}" text-anchor="end" font-size="10" fill="#888">${v.toFixed(2)}</text>
    `).join('');

    const xTicks = [xMin, Math.round((xMin+xMax)/2), xMax];
    const xTickEls = xTicks.map(v => `
      <line x1="${xS(v)}" x2="${xS(v)}" y1="${H-padB}" y2="${H-padB+4}" stroke="#1a1a1a"/>
      <text x="${xS(v)}" y="${H-padB+18}" text-anchor="middle" font-size="10" fill="#555">${v}</text>
    `).join('');

    container.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%;max-width:${W}px;height:auto;">
        ${yTickEls}
        <line x1="${padL}" x2="${W-padR}" y1="${yS(0.8)}" y2="${yS(0.8)}" stroke="#c9a961" stroke-dasharray="5 4" stroke-opacity=".7"/>
        <text x="${W-padR-2}" y="${yS(0.8)-4}" text-anchor="end" font-size="10" fill="#c9a961">power = 0.80</text>

        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H-padB}" stroke="#1a1a1a"/>
        <line x1="${padL}" y1="${H-padB}" x2="${W-padR}" y2="${H-padB}" stroke="#1a1a1a"/>
        ${xTickEls}

        <text x="${(padL+W-padR)/2}" y="${H-6}" text-anchor="middle" font-size="11" fill="#1a1a1a" font-weight="600">總樣本量 N</text>
        <text x="14" y="${H/2}" text-anchor="middle" font-size="11" fill="#1a1a1a" font-weight="600" transform="rotate(-90 14 ${H/2})">檢定力 1−β</text>

        <path d="${path}" fill="none" stroke="#c9a961" stroke-width="2.2"/>

        <line x1="${xS(cur[0])}" x2="${xS(cur[0])}" y1="${yS(cur[1])}" y2="${H-padB}" stroke="#c9a961" stroke-dasharray="2 3" stroke-opacity=".5"/>
        <circle cx="${xS(cur[0])}" cy="${yS(cur[1])}" r="6" fill="#c9a961" stroke="#fff" stroke-width="2"/>
        <text x="${xS(cur[0])+10}" y="${yS(cur[1])-8}" font-size="11" fill="#1a1a1a" font-weight="700">N=${cur[0]}, 1−β=${cur[1].toFixed(2)}</text>
      </svg>
    `;
  }

  /* ---------- 結果面板渲染 ---------- */
  function renderResult(state, res) {
    // 主要數字
    const isSize = state.mode === 'size';
    const primaryValue = document.getElementById('primaryValue');
    const primaryUnit  = document.getElementById('primaryUnit');
    const primaryLabel = document.getElementById('primaryLabel');
    const scoreFill    = document.getElementById('scoreFill');
    const scoreHint    = document.getElementById('scoreHint');
    const resultTitle  = document.getElementById('resultTitle');
    const resultSub    = document.getElementById('resultSubtitle');

    if (isSize) {
      const total = res.total != null ? res.total : res.n;
      primaryValue.textContent = total;
      primaryUnit.textContent = '';
      primaryLabel.textContent = res.total != null ? 'TOTAL SAMPLE SIZE' : 'REQUIRED SAMPLE SIZE';
      // bar：以 power 目標當參考，這個 case 直接顯示 power=設定值
      scoreFill.style.width = (state.power * 100) + '%';
      scoreHint.innerHTML = `當前計算對應目標檢定力 <strong>${fmtPct(state.power)}</strong>。`;
      resultTitle.textContent = '所需樣本量';
      resultSub.textContent = '為達到指定的檢定力，研究設計所需的最小樣本估算結果。';
    } else {
      primaryValue.textContent = (res.power * 100).toFixed(1);
      primaryUnit.textContent = ' %';
      primaryLabel.textContent = 'STATISTICAL POWER';
      scoreFill.style.width = (Math.max(0, Math.min(1, res.power)) * 100) + '%';
      const tag = res.power >= 0.95 ? '高檢定力'
                : res.power >= 0.80 ? '充分'
                : res.power >= 0.50 ? '不足，建議加大樣本' : '嚴重不足';
      scoreHint.innerHTML = `當前設計：<strong>${tag}</strong>（一般研究以 0.80 為門檻）。`;
      resultTitle.textContent = '統計檢定力';
      resultSub.textContent = '在當前樣本量與效應量下，正確拒絕原假設的機率。';
    }

    // 指標
    const grid = document.getElementById('metricGrid');
    grid.innerHTML = '';
    buildMetrics(state, res).forEach(m => {
      const div = document.createElement('div');
      div.className = 'metric';
      div.innerHTML = `
        <div class="metric-label">${m.label}</div>
        <div class="metric-value">${m.value}${m.unit ? '<small>'+m.unit+'</small>' : ''}</div>
        ${m.note ? `<div class="metric-note">${m.note}</div>` : ''}
      `;
      grid.appendChild(div);
    });

    // 公式 & 解讀
    document.getElementById('formulaBox').innerHTML = buildFormula(state, res);
    document.getElementById('interpretation').innerHTML = buildInterpretation(state, res);

    // 建議
    const rec = document.getElementById('recommendations');
    rec.innerHTML = '';
    buildRecommendations(state, res).forEach(t => {
      const li = document.createElement('li');
      li.innerHTML = t;
      rec.appendChild(li);
    });

    // 曲線
    renderChart(document.getElementById('chartWrap'), buildPowerCurve(state, res));

    // 顯示
    form.style.display = 'none';
    document.querySelector('.progress-wrap').style.display = 'none';
    resultPanel.style.display = '';
    window.scrollTo({ top: resultPanel.offsetTop - 60, behavior: 'smooth' });
  }

  /* ---------- 事件 ---------- */
  prevBtn.addEventListener('click', () => {
    if (currentStep > 1) showStep(currentStep - 1);
  });
  nextBtn.addEventListener('click', () => {
    if (validateStep(currentStep)) showStep(currentStep + 1);
  });
  submitBtn.addEventListener('click', () => {
    if (!validateStep(currentStep)) return;
    const state = collectState();

    // 邏輯校驗
    if (state.test === '2prop' && state.p1 === state.p2) {
      alert('p₁ 與 p₂ 不能相等，否則無差異可偵測。');
      return;
    }
    if (state.test === '1prop' && state.p0 === state.p1) {
      alert('p₀ 與 p₁ 不能相等。');
      return;
    }
    if ((state.test === '2mean' || state.test === '1mean') && (!state.d || state.d === 0)) {
      alert('Cohen\'s d 不能為 0。');
      return;
    }
    if (state.test === 'corr' && (!state.r || state.r === 0)) {
      alert('相關係數 r 不能為 0。');
      return;
    }
    if (state.alpha <= 0 || state.alpha >= 1) { alert('α 必須介於 0 與 1 之間。'); return; }
    if (state.mode === 'size' && (state.power <= 0 || state.power >= 1)) {
      alert('檢定力必須介於 0 與 1 之間。'); return;
    }

    const res = calculate(state);
    renderResult(state, res);
  });

  document.getElementById('restartBtn').addEventListener('click', () => {
    location.reload();
  });

  // 動態欄位
  form.addEventListener('change', (e) => {
    if (e.target.name === 'mode' || e.target.name === 'test') {
      updateConditionalFields();
    }
  });

  // 初始化
  updateConditionalFields();
  showStep(1);
})();
