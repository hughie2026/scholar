/* =====================================================================
 * Effect Size Converter
 * Hughie's Online Lab
 *
 * 支援以下轉換：
 *   - Cohen's d ↔ r
 *   - Cohen's d ↔ OR
 *   - OR ↔ log OR
 *   - RR ↔ log RR
 *   - η² / partial η² ↔ Cohen's f
 *   - t → r
 *   - F → η² (partial η²)
 * ===================================================================== */

(function () {
  'use strict';

  /* ---------- Helper: 數值格式化 ---------- */
  function fmt(x, digits) {
    if (!isFinite(x)) return '—';
    digits = (digits == null) ? 4 : digits;
    if (Math.abs(x) >= 1000 || (Math.abs(x) < 0.0001 && x !== 0)) {
      return x.toExponential(3);
    }
    return parseFloat(x.toFixed(digits)).toString();
  }

  /* ---------- Cohen 基準解讀 ---------- */
  function tierBy(value, breakpoints) {
    // breakpoints: [smallStart, mediumStart, largeStart]
    var v = Math.abs(value);
    if (v < breakpoints[0]) return { tier: '可忽略', note: '低於小效應切點' };
    if (v < breakpoints[1]) return { tier: '小效應',  note: '≈ ' + breakpoints[0] };
    if (v < breakpoints[2]) return { tier: '中等效應', note: '≈ ' + breakpoints[1] };
    return { tier: '大效應', note: '≥ ' + breakpoints[2] };
  }

  var interpret = {
    d:    function (v) { return tierBy(v, [0.2, 0.5, 0.8]); },
    r:    function (v) { return tierBy(v, [0.1, 0.3, 0.5]); },
    f:    function (v) { return tierBy(v, [0.1, 0.25, 0.4]); },
    eta:  function (v) { return tierBy(v, [0.01, 0.06, 0.14]); },
    or:   function (v) {
      if (!isFinite(v) || v <= 0) return { tier: '—', note: 'OR 須大於 0' };
      // 對稱於 1：將 OR < 1 折算成 1/OR
      var ratio = v >= 1 ? v : 1 / v;
      var t = tierBy(ratio, [1.5, 2.5, 4.3]);
      // 因 ratio 已 ≥ 1，需要重新比對
      if (ratio < 1.5) t = { tier: '可忽略', note: '低於小效應切點' };
      else if (ratio < 2.5) t = { tier: '小效應',  note: '≈ 1.5' };
      else if (ratio < 4.3) t = { tier: '中等效應', note: '≈ 2.5' };
      else t = { tier: '大效應', note: '≥ 4.3' };
      return t;
    },
    rr: function (v) {
      if (!isFinite(v) || v <= 0) return { tier: '—', note: 'RR 須大於 0' };
      var ratio = v >= 1 ? v : 1 / v;
      if (ratio < 1.2) return { tier: '可忽略', note: '差異很小' };
      if (ratio < 1.5) return { tier: '小效應', note: '輕度風險改變' };
      if (ratio < 3.0) return { tier: '中等效應', note: '明顯風險改變' };
      return { tier: '大效應', note: '極大風險改變' };
    },
    log: function () {
      return { tier: '見原指標', note: '請以 OR / RR 量級判斷' };
    }
  };

  /* ---------- 轉換定義 ---------- */
  // 每個 conversion 定義：title / desc / inputs / formula / compute / outputLabel / outputUnit / interpret
  var conversions = {

    /* ===== Cohen's d ↔ r ===== */
    d_to_r: {
      title: '輸入 Cohen\'s d',
      desc: '將兩組均值差的標準化效應量 d 換算為 Pearson 相關係數 r。預設假設兩組樣本量相等。',
      inputs: [
        { name: 'd', label: 'Cohen\'s d', placeholder: '例：0.50', step: 'any' }
      ],
      formula: 'r = d / √(d² + 4)',
      outputLabel: 'r (correlation)',
      outputUnit: 'Pearson 相關係數',
      compute: function (v) {
        var d = v.d;
        var r = d / Math.sqrt(d * d + 4);
        return { value: r, interpret: interpret.r(r) };
      }
    },

    r_to_d: {
      title: '輸入相關係數 r',
      desc: '將 Pearson 相關 r 換算回 Cohen\'s d。要求 |r| < 1。',
      inputs: [
        { name: 'r', label: '相關係數 r', placeholder: '例：0.30', step: 'any', min: -0.9999, max: 0.9999 }
      ],
      formula: 'd = 2r / √(1 − r²)',
      outputLabel: 'Cohen\'s d',
      outputUnit: '標準化均值差',
      validate: function (v) {
        if (Math.abs(v.r) >= 1) return 'r 必須介於 −1 與 1 之間。';
        return null;
      },
      compute: function (v) {
        var r = v.r;
        var d = (2 * r) / Math.sqrt(1 - r * r);
        return { value: d, interpret: interpret.d(d) };
      }
    },

    /* ===== Cohen's d ↔ OR ===== */
    d_to_or: {
      title: '輸入 Cohen\'s d',
      desc: '採用 Hasselblad & Hedges / Chinn 邏輯分布近似，將連續變項的 d 換算成二分結果的 OR。',
      inputs: [
        { name: 'd', label: 'Cohen\'s d', placeholder: '例：0.50', step: 'any' }
      ],
      formula: 'OR = exp( d × π / √3 )   ≈ exp( d × 1.8138 )',
      outputLabel: 'Odds Ratio',
      outputUnit: '勝算比',
      compute: function (v) {
        var or = Math.exp(v.d * Math.PI / Math.sqrt(3));
        return { value: or, interpret: interpret.or(or) };
      }
    },

    or_to_d: {
      title: '輸入 Odds Ratio',
      desc: '由二分結果的 OR 換算為連續尺度的 Cohen\'s d。OR 須為正數。',
      inputs: [
        { name: 'or', label: 'Odds Ratio (OR)', placeholder: '例：2.50', step: 'any', min: 0.0001 }
      ],
      formula: 'd = ln(OR) × √3 / π   ≈ ln(OR) × 0.5513',
      outputLabel: 'Cohen\'s d',
      outputUnit: '標準化均值差',
      validate: function (v) {
        if (!(v.or > 0)) return 'OR 必須大於 0。';
        return null;
      },
      compute: function (v) {
        var d = Math.log(v.or) * Math.sqrt(3) / Math.PI;
        return { value: d, interpret: interpret.d(d) };
      }
    },

    /* ===== OR ↔ log OR ===== */
    or_to_logor: {
      title: '輸入 Odds Ratio',
      desc: 'meta-analysis 常以 ln(OR) 進行加總，因其抽樣分布更接近常態。',
      inputs: [
        { name: 'or', label: 'Odds Ratio (OR)', placeholder: '例：2.50', step: 'any', min: 0.0001 }
      ],
      formula: 'log OR = ln(OR)',
      outputLabel: 'log OR',
      outputUnit: '自然對數 OR',
      validate: function (v) { return v.or > 0 ? null : 'OR 必須大於 0。'; },
      compute: function (v) {
        var lnor = Math.log(v.or);
        return { value: lnor, interpret: interpret.log() };
      }
    },

    logor_to_or: {
      title: '輸入 log OR',
      desc: '把彙總後的 ln(OR) 還原為原始 OR。',
      inputs: [
        { name: 'logor', label: 'log OR (ln OR)', placeholder: '例：0.92', step: 'any' }
      ],
      formula: 'OR = exp(log OR)',
      outputLabel: 'Odds Ratio',
      outputUnit: '勝算比',
      compute: function (v) {
        var or = Math.exp(v.logor);
        return { value: or, interpret: interpret.or(or) };
      }
    },

    /* ===== RR ↔ log RR ===== */
    rr_to_logrr: {
      title: '輸入 Risk Ratio',
      desc: 'RR 需取自然對數後再進行 meta-analysis 合併。',
      inputs: [
        { name: 'rr', label: 'Risk Ratio (RR)', placeholder: '例：1.80', step: 'any', min: 0.0001 }
      ],
      formula: 'log RR = ln(RR)',
      outputLabel: 'log RR',
      outputUnit: '自然對數 RR',
      validate: function (v) { return v.rr > 0 ? null : 'RR 必須大於 0。'; },
      compute: function (v) {
        var lnrr = Math.log(v.rr);
        return { value: lnrr, interpret: interpret.log() };
      }
    },

    logrr_to_rr: {
      title: '輸入 log RR',
      desc: '把 ln(RR) 還原為原始 RR。',
      inputs: [
        { name: 'logrr', label: 'log RR (ln RR)', placeholder: '例：0.59', step: 'any' }
      ],
      formula: 'RR = exp(log RR)',
      outputLabel: 'Risk Ratio',
      outputUnit: '相對風險',
      compute: function (v) {
        var rr = Math.exp(v.logrr);
        return { value: rr, interpret: interpret.rr(rr) };
      }
    },

    /* ===== η² / partial η² ↔ Cohen's f ===== */
    eta_to_f: {
      title: '輸入 η² 或 partial η²',
      desc: 'Cohen\'s f 用於 ANOVA 的功效分析（如 G*Power）。',
      inputs: [
        { name: 'eta', label: 'η² 或 partial η²', placeholder: '例：0.06', step: 'any', min: 0, max: 0.9999 }
      ],
      formula: 'f = √( η² / (1 − η²) )',
      outputLabel: 'Cohen\'s f',
      outputUnit: 'ANOVA 效應量',
      validate: function (v) {
        if (v.eta < 0 || v.eta >= 1) return 'η² 必須介於 0 與 1 之間（不含 1）。';
        return null;
      },
      compute: function (v) {
        var f = Math.sqrt(v.eta / (1 - v.eta));
        return { value: f, interpret: interpret.f(f) };
      }
    },

    f_to_eta: {
      title: '輸入 Cohen\'s f',
      desc: '將 Cohen\'s f 換算為 η² 或 partial η²。',
      inputs: [
        { name: 'f', label: 'Cohen\'s f', placeholder: '例：0.25', step: 'any', min: 0 }
      ],
      formula: 'η² = f² / (1 + f²)',
      outputLabel: 'η² (或 partial η²)',
      outputUnit: '解釋變異比例',
      validate: function (v) {
        if (v.f < 0) return 'Cohen\'s f 不可為負。';
        return null;
      },
      compute: function (v) {
        var eta = (v.f * v.f) / (1 + v.f * v.f);
        return { value: eta, interpret: interpret.eta(eta) };
      }
    },

    /* ===== t → r ===== */
    t_to_r: {
      title: '輸入 t 值與自由度',
      desc: '常用於將 t 檢定（含獨立樣本與相依樣本）的結果換算為效應量 r。',
      inputs: [
        { name: 't',  label: 't 值',         placeholder: '例：2.45', step: 'any' },
        { name: 'df', label: '自由度 df',    placeholder: '例：58',   step: 'any', min: 1 }
      ],
      formula: 'r = √( t² / (t² + df) )',
      outputLabel: 'r (effect size)',
      outputUnit: '由 t 換算所得',
      validate: function (v) {
        if (!(v.df > 0)) return '自由度 df 必須大於 0。';
        return null;
      },
      compute: function (v) {
        var r = Math.sqrt((v.t * v.t) / (v.t * v.t + v.df));
        // 保留符號方向
        if (v.t < 0) r = -r;
        return { value: r, interpret: interpret.r(r) };
      }
    },

    /* ===== F → η² (partial η²) ===== */
    F_to_eta: {
      title: '輸入 F 值與兩個自由度',
      desc: '由 ANOVA 的 F 與自由度換算 η²；當為單因子 ANOVA 時即等於 partial η²。',
      inputs: [
        { name: 'F',   label: 'F 值',                  placeholder: '例：5.32', step: 'any', min: 0 },
        { name: 'df1', label: '組間自由度 df₁',         placeholder: '例：2',     step: '1',   min: 1 },
        { name: 'df2', label: '組內 / 誤差自由度 df₂',  placeholder: '例：87',    step: '1',   min: 1 }
      ],
      formula: 'η² = (df₁ × F) / (df₁ × F + df₂)',
      outputLabel: 'η² (或 partial η²)',
      outputUnit: '解釋變異比例',
      validate: function (v) {
        if (!(v.F >= 0))   return 'F 值必須 ≥ 0。';
        if (!(v.df1 > 0))  return 'df₁ 必須大於 0。';
        if (!(v.df2 > 0))  return 'df₂ 必須大於 0。';
        return null;
      },
      compute: function (v) {
        var num = v.df1 * v.F;
        var eta = num / (num + v.df2);
        return { value: eta, interpret: interpret.eta(eta) };
      }
    }
  };

  /* ---------- DOM ---------- */
  var $type        = document.getElementById('conversionType');
  var $inputFields = document.getElementById('inputFields');
  var $inputTitle  = document.getElementById('inputTitle');
  var $inputDesc   = document.getElementById('inputDesc');
  var $inputError  = document.getElementById('inputError');

  var $resultArea  = document.getElementById('resultArea');
  var $resultLabel = document.getElementById('resultLabel');
  var $resultValue = document.getElementById('resultValue');
  var $resultUnit  = document.getElementById('resultUnit');
  var $resultTier  = document.getElementById('resultTier');
  var $resultTierNote = document.getElementById('resultTierNote');
  var $formula     = document.getElementById('formulaText');
  var $interpret   = document.getElementById('interpretationText');

  var $clearBtn = document.getElementById('clearBtn');
  var $copyBtn  = document.getElementById('copyBtn');
  var $toast    = document.getElementById('toast');

  /* ---------- Render dynamic inputs ---------- */
  function renderInputs(key) {
    var conv = conversions[key];
    if (!conv) return;

    $inputTitle.textContent = conv.title;
    $inputDesc.textContent  = conv.desc;
    $formula.textContent    = conv.formula;

    var html = '';
    if (conv.inputs.length === 1) {
      var inp = conv.inputs[0];
      html = renderField(inp);
    } else {
      html = '<div class="field-row">';
      conv.inputs.forEach(function (inp) {
        html += renderField(inp);
      });
      html += '</div>';
    }
    $inputFields.innerHTML = html;

    // bind
    conv.inputs.forEach(function (inp) {
      var el = document.getElementById('inp_' + inp.name);
      if (el) {
        el.addEventListener('input', compute);
        el.addEventListener('change', compute);
      }
    });

    resetResult();
    // 若已有預填值（例如剛切換時），嘗試計算一次
    compute();
  }

  function renderField(inp) {
    var attrs = 'type="number" id="inp_' + inp.name + '" name="' + inp.name + '"';
    if (inp.step != null) attrs += ' step="' + inp.step + '"';
    if (inp.min  != null) attrs += ' min="'  + inp.min  + '"';
    if (inp.max  != null) attrs += ' max="'  + inp.max  + '"';
    attrs += ' placeholder="' + (inp.placeholder || '') + '"';
    attrs += ' autocomplete="off"';
    return (
      '<div class="field">' +
        '<label>' + inp.label + '</label>' +
        '<input ' + attrs + '>' +
      '</div>'
    );
  }

  /* ---------- Compute ---------- */
  function compute() {
    var key = $type.value;
    var conv = conversions[key];
    if (!conv) return;

    // 收集數值
    var values = {};
    var allFilled = true;
    conv.inputs.forEach(function (inp) {
      var el = document.getElementById('inp_' + inp.name);
      var raw = el ? el.value.trim() : '';
      if (raw === '') {
        allFilled = false;
        values[inp.name] = NaN;
      } else {
        var n = Number(raw);
        values[inp.name] = isNaN(n) ? NaN : n;
      }
    });

    if (!allFilled) {
      hideError();
      resetResult();
      return;
    }

    // 數值有效性
    for (var k in values) {
      if (isNaN(values[k])) {
        showError('請輸入有效的數值。');
        resetResult();
        return;
      }
    }

    // 自訂驗證
    if (typeof conv.validate === 'function') {
      var err = conv.validate(values);
      if (err) {
        showError(err);
        resetResult();
        return;
      }
    }
    hideError();

    // 計算
    var out;
    try {
      out = conv.compute(values);
    } catch (e) {
      showError('計算失敗：' + e.message);
      resetResult();
      return;
    }

    if (out == null || !isFinite(out.value)) {
      showError('計算結果無效，請檢查輸入值。');
      resetResult();
      return;
    }

    // 顯示
    $resultArea.classList.remove('empty');
    $resultLabel.textContent = (conv.outputLabel || 'RESULT').toUpperCase();
    $resultValue.textContent = fmt(out.value);
    $resultUnit.textContent  = conv.outputUnit || '';

    var tier = out.interpret || { tier: '—', note: '' };
    $resultTier.textContent     = tier.tier;
    $resultTierNote.textContent = tier.note;

    // 解讀文字
    $interpret.innerHTML = buildInterpretation(conv, out, values);
  }

  function buildInterpretation(conv, out, values) {
    var inputDesc = conv.inputs.map(function (i) {
      return '<strong>' + i.label + '</strong> = ' + fmt(values[i.name]);
    }).join('；');

    var v = fmt(out.value);
    var tier = (out.interpret && out.interpret.tier) || '—';

    return (
      '輸入：' + inputDesc + '。' +
      '依公式 <code style="background:#fff;border:1px solid #ece5d3;padding:2px 6px;">' + conv.formula + '</code> ' +
      '計算所得結果為 <strong>' + v + '</strong>，在 Cohen 經典基準下對應 <strong>' + tier + '</strong>。' +
      '<br><br><em style="color:#888;">提醒：效應量解讀需結合研究設計、樣本特性與所在學科的常見量級，避免機械套用。</em>'
    );
  }

  function resetResult() {
    $resultArea.classList.add('empty');
    $resultValue.textContent    = '--';
    $resultTier.textContent     = '--';
    $resultTierNote.textContent = '依 Cohen 經典基準';
    $resultUnit.textContent     = '輸入後自動計算';
    $interpret.textContent      = '輸入有效數值後，此處會顯示效應量大小的初步解讀。';
  }

  /* ---------- Error ---------- */
  function showError(msg) {
    $inputError.textContent = msg;
    $inputError.classList.add('show');
  }
  function hideError() {
    $inputError.textContent = '';
    $inputError.classList.remove('show');
  }

  /* ---------- Buttons ---------- */
  $clearBtn.addEventListener('click', function () {
    var conv = conversions[$type.value];
    if (!conv) return;
    conv.inputs.forEach(function (inp) {
      var el = document.getElementById('inp_' + inp.name);
      if (el) el.value = '';
    });
    hideError();
    resetResult();
    var first = document.querySelector('#inputFields input');
    if (first) first.focus();
  });

  $copyBtn.addEventListener('click', function () {
    var key = $type.value;
    var conv = conversions[key];
    if (!conv || $resultArea.classList.contains('empty')) {
      toast('請先輸入有效數值');
      return;
    }
    var values = conv.inputs.map(function (inp) {
      var el = document.getElementById('inp_' + inp.name);
      return inp.label + ' = ' + (el ? el.value : '');
    }).join('；');

    var text =
      '【效應量轉換結果】\n' +
      '轉換類型：' + ($type.options[$type.selectedIndex].text) + '\n' +
      '輸入：' + values + '\n' +
      '公式：' + conv.formula + '\n' +
      '結果：' + ($resultLabel.textContent.trim()) + ' = ' + $resultValue.textContent + '\n' +
      '量級：' + $resultTier.textContent + '（' + $resultTierNote.textContent + '）\n' +
      '— 來源：Hughie\'s Online Lab · Effect Size Converter';

    copyToClipboard(text).then(function (ok) {
      toast(ok ? '已複製到剪貼簿' : '複製失敗，請手動選取');
    });
  });

  function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(text); });
    }
    return Promise.resolve(fallback(text));
  }
  function fallback(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  function toast(msg) {
    $toast.textContent = msg;
    $toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { $toast.classList.remove('show'); }, 1800);
  }

  /* ---------- Init ---------- */
  $type.addEventListener('change', function () {
    renderInputs($type.value);
  });

  // 初始
  renderInputs($type.value);
})();
