/* =======================================================
 * ASCVD Risk Calculator
 * Based on 2013 ACC/AHA Pooled Cohort Equations
 * Goff DC Jr, et al. Circulation. 2014;129(25 Suppl 2):S49-73.
 * ======================================================= */

(function () {
  "use strict";

  // ---------- Coefficients (PCE) ----------
  const COEF = {
    white_female: {
      lnAge: -29.799, lnAgeSq: 4.884,
      lnTC: 13.540, lnAge_lnTC: -3.114,
      lnHDL: -13.578, lnAge_lnHDL: 3.149,
      lnTreatedSBP: 2.019, lnUntreatedSBP: 1.957,
      lnAge_lnTreatedSBP: 0, lnAge_lnUntreatedSBP: 0,
      smoker: 7.574, lnAge_smoker: -1.665,
      diabetes: 0.661,
      meanTerms: -29.18, baselineSurvival: 0.9665,
    },
    black_female: {
      lnAge: 17.114, lnAgeSq: 0,
      lnTC: 0.940, lnAge_lnTC: 0,
      lnHDL: -18.920, lnAge_lnHDL: 4.475,
      lnTreatedSBP: 29.291, lnUntreatedSBP: 27.820,
      lnAge_lnTreatedSBP: -6.432, lnAge_lnUntreatedSBP: -6.087,
      smoker: 0.691, lnAge_smoker: 0,
      diabetes: 0.874,
      meanTerms: 86.61, baselineSurvival: 0.9533,
    },
    white_male: {
      lnAge: 12.344, lnAgeSq: 0,
      lnTC: 11.853, lnAge_lnTC: -2.664,
      lnHDL: -7.990, lnAge_lnHDL: 1.769,
      lnTreatedSBP: 1.797, lnUntreatedSBP: 1.764,
      lnAge_lnTreatedSBP: 0, lnAge_lnUntreatedSBP: 0,
      smoker: 7.837, lnAge_smoker: -1.795,
      diabetes: 0.658,
      meanTerms: 61.18, baselineSurvival: 0.9144,
    },
    black_male: {
      lnAge: 2.469, lnAgeSq: 0,
      lnTC: 0.302, lnAge_lnTC: 0,
      lnHDL: -0.307, lnAge_lnHDL: 0,
      lnTreatedSBP: 1.916, lnUntreatedSBP: 1.809,
      lnAge_lnTreatedSBP: 0, lnAge_lnUntreatedSBP: 0,
      smoker: 0.549, lnAge_smoker: 0,
      diabetes: 0.645,
      meanTerms: 19.54, baselineSurvival: 0.8954,
    },
  };

  // ---------- Helpers ----------
  function ln(x) { return Math.log(x); }

  function getKey(sex, race) {
    const r = race === "black" ? "black" : "white";
    const s = sex === "male" ? "male" : "female";
    return `${r}_${s}`;
  }

  function calcASCVD(input) {
    const c = COEF[getKey(input.sex, input.race)];
    const age = input.age;
    const tc = input.totalChol;
    const hdl = input.hdl;
    const sbp = input.sbp;
    const treated = input.bpMeds === "yes";
    const smoker = input.smoker === "yes" ? 1 : 0;
    const diab = input.diabetes === "yes" ? 1 : 0;

    const lnAge = ln(age);
    const lnAgeSq = lnAge * lnAge;
    const lnTC = ln(tc);
    const lnHDL = ln(hdl);
    const lnSBP = ln(sbp);

    let sum = 0;
    sum += c.lnAge * lnAge;
    sum += c.lnAgeSq * lnAgeSq;
    sum += c.lnTC * lnTC;
    sum += c.lnAge_lnTC * lnAge * lnTC;
    sum += c.lnHDL * lnHDL;
    sum += c.lnAge_lnHDL * lnAge * lnHDL;

    if (treated) {
      sum += c.lnTreatedSBP * lnSBP;
      sum += c.lnAge_lnTreatedSBP * lnAge * lnSBP;
    } else {
      sum += c.lnUntreatedSBP * lnSBP;
      sum += c.lnAge_lnUntreatedSBP * lnAge * lnSBP;
    }

    sum += c.smoker * smoker;
    sum += c.lnAge_smoker * lnAge * smoker;
    sum += c.diabetes * diab;

    const risk = 1 - Math.pow(c.baselineSurvival, Math.exp(sum - c.meanTerms));
    return Math.max(0, Math.min(1, risk));
  }

  // ---------- Risk stratification ----------
  function classifyRisk(p) {
    const pct = p * 100;
    if (pct < 5)   return { key: "low",          label: "Low · 低風險",         tone: "is-low" };
    if (pct < 7.5) return { key: "borderline",   label: "Borderline · 邊緣",    tone: "is-borderline" };
    if (pct < 20)  return { key: "intermediate", label: "Intermediate · 中度",  tone: "is-intermediate" };
    return            { key: "high",          label: "High · 高風險",        tone: "is-high" };
  }

  function narrativeFor(category, pct) {
    const text = pct.toFixed(1);
    switch (category.key) {
      case "low":
        return `估算 10 年 ASCVD 事件風險約為 ${text}%，屬於低風險區間。請持續維持健康生活型態（運動、飲食、控制體重、不吸菸），並依年齡層定期追蹤血壓與血脂。`;
      case "borderline":
        return `估算 10 年 ASCVD 事件風險約為 ${text}%，落在邊緣區間。建議與醫師討論是否存在加成風險因子（如家族史、慢性發炎、CAC 評分等），以決定是否加強生活型態或藥物介入。`;
      case "intermediate":
        return `估算 10 年 ASCVD 事件風險約為 ${text}%，屬於中度風險。臨床上常會討論是否啟動 statin 治療、加強血壓與糖尿病控制，並評估是否輔助 CAC 等檢查。`;
      case "high":
        return `估算 10 年 ASCVD 事件風險約為 ${text}%，屬於高風險。建議儘速與醫師討論完整的心血管風險管理方案，包括藥物、生活型態與後續追蹤。`;
    }
  }

  // ---------- DOM ----------
  const form = document.getElementById("ascvdForm");
  const warning = document.getElementById("formWarning");
  const riskPercentEl = document.getElementById("riskPercent");
  const riskCategoryEl = document.getElementById("riskCategory");
  const meterFill = document.getElementById("riskMeterFill");
  const narrativeEl = document.getElementById("resultNarrative");
  const echoEl = document.getElementById("inputEcho");

  function showWarning(msg) {
    if (!msg) {
      warning.classList.remove("show");
      warning.textContent = "";
      return;
    }
    warning.textContent = msg;
    warning.classList.add("show");
  }

  function setInvalid(el, on) {
    if (!el) return;
    el.classList.toggle("invalid", !!on);
  }

  function readForm() {
    const fd = new FormData(form);
    return {
      knownAscvd: fd.get("knownAscvd"),
      age: parseFloat(fd.get("age")),
      sex: fd.get("sex"),
      race: fd.get("race"),
      totalChol: parseFloat(fd.get("totalChol")),
      hdl: parseFloat(fd.get("hdl")),
      sbp: parseFloat(fd.get("sbp")),
      bpMeds: fd.get("bpMeds"),
      diabetes: fd.get("diabetes"),
      smoker: fd.get("smoker"),
    };
  }

  function validate(d) {
    const errors = [];
    const fields = ["age", "sex", "race", "totalChol", "hdl", "sbp", "bpMeds", "diabetes", "smoker"];
    fields.forEach(f => setInvalid(form.elements[f], false));

    if (d.knownAscvd === "yes") {
      errors.push("你已選擇有臨床 ASCVD。本工具是初級預防的風險估算，請與醫師討論二級預防方案。");
    }

    if (!d.sex)  { errors.push("請選擇生理性別。"); setInvalid(form.elements.sex, true); }
    if (!d.race) { errors.push("請選擇族群。"); setInvalid(form.elements.race, true); }
    if (!d.bpMeds) { errors.push("請選擇是否使用降壓藥。"); setInvalid(form.elements.bpMeds, true); }
    if (!d.diabetes) { errors.push("請選擇糖尿病狀態。"); setInvalid(form.elements.diabetes, true); }
    if (!d.smoker) { errors.push("請選擇吸菸狀態。"); setInvalid(form.elements.smoker, true); }

    if (!Number.isFinite(d.age) || d.age < 40 || d.age > 79) {
      errors.push("年齡需介於 40–79 歲（PCE 適用範圍）。");
      setInvalid(form.elements.age, true);
    }
    if (!Number.isFinite(d.totalChol) || d.totalChol < 130 || d.totalChol > 320) {
      errors.push("總膽固醇 TC 需介於 130–320 mg/dL。");
      setInvalid(form.elements.totalChol, true);
    }
    if (!Number.isFinite(d.hdl) || d.hdl < 20 || d.hdl > 100) {
      errors.push("HDL-C 需介於 20–100 mg/dL。");
      setInvalid(form.elements.hdl, true);
    }
    if (!Number.isFinite(d.sbp) || d.sbp < 90 || d.sbp > 200) {
      errors.push("收縮壓 SBP 需介於 90–200 mmHg。");
      setInvalid(form.elements.sbp, true);
    }

    return errors;
  }

  function renderEcho(d) {
    const map = {
      female: "女性", male: "男性",
      white: "非黑人 / 其他", black: "黑人",
      yes: "是", no: "否",
    };
    const items = [
      ["年齡", `${d.age} 歲`],
      ["性別", map[d.sex] || "—"],
      ["族群", map[d.race] || "—"],
      ["TC", `${d.totalChol} mg/dL`],
      ["HDL-C", `${d.hdl} mg/dL`],
      ["SBP", `${d.sbp} mmHg`],
      ["降壓藥", map[d.bpMeds] || "—"],
      ["糖尿病", map[d.diabetes] || "—"],
      ["吸菸", map[d.smoker] || "—"],
    ];
    echoEl.innerHTML = items.map(([k, v]) => `
      <div class="status-item">
        <span class="k">${k}</span>
        <strong>${v}</strong>
      </div>
    `).join("");
  }

  function setMeter(pct) {
    // Map 0–20%+ → 0–100% bar width
    const width = Math.max(0, Math.min(100, (pct / 20) * 100));
    meterFill.style.width = `${width}%`;
  }

  function setCategory(cat) {
    riskCategoryEl.textContent = cat.label;
    riskCategoryEl.classList.remove("is-low", "is-borderline", "is-intermediate", "is-high");
    riskCategoryEl.classList.add(cat.tone);
  }

  function resetResult() {
    riskPercentEl.textContent = "—";
    riskCategoryEl.textContent = "等待輸入";
    riskCategoryEl.classList.remove("is-low", "is-borderline", "is-intermediate", "is-high");
    meterFill.style.width = "0%";
    narrativeEl.textContent = "完成左側表單後，這裡會顯示估算的 10 年 ASCVD 風險與分層結果。";
    echoEl.innerHTML = "";
    showWarning("");
  }

  // ---------- Events ----------
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const data = readForm();
    const errors = validate(data);

    if (errors.length) {
      showWarning(errors.join(" "));
      // 嚴重前置條件：已有 ASCVD 直接停止
      if (data.knownAscvd === "yes") return;
      // 其他驗證錯誤也停止
      if (errors.some(msg => !msg.includes("二級預防"))) return;
    } else {
      showWarning("");
    }

    const p = calcASCVD(data);
    const pct = p * 100;
    const cat = classifyRisk(p);

    riskPercentEl.textContent = pct.toFixed(1);
    setCategory(cat);
    setMeter(pct);
    narrativeEl.textContent = narrativeFor(cat, pct);
    renderEcho(data);
  });

  form.addEventListener("reset", function () {
    // 等待原生 reset 完成後再清掉狀態
    setTimeout(resetResult, 0);
    ["age", "sex", "race", "totalChol", "hdl", "sbp", "bpMeds", "diabetes", "smoker"]
      .forEach(f => setInvalid(form.elements[f], false));
  });

  // 即時消除 invalid 視覺
  form.addEventListener("input", function (e) {
    if (e.target && e.target.classList.contains("invalid")) {
      e.target.classList.remove("invalid");
    }
  });
})();
