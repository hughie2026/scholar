/*
  ASCVD Risk Calculator
  Model: 2013 ACC/AHA Pooled Cohort Equations, Goff et al.
  Purpose: 10-year primary prevention ASCVD risk estimate.

  Important:
  - For educational use only.
  - Not medical advice.
  - Calculation runs locally in the browser.
*/

(function () {
  "use strict";

  const form = document.getElementById("ascvdForm");
  const warningBox = document.getElementById("formWarning");

  const riskPercentEl = document.getElementById("riskPercent");
  const riskCategoryEl = document.getElementById("riskCategory");
  const riskMeterFillEl = document.getElementById("riskMeterFill");
  const resultNarrativeEl = document.getElementById("resultNarrative");
  const inputEchoEl = document.getElementById("inputEcho");

  /*
    Coefficients for 2013 ACC/AHA Pooled Cohort Equations.
    Four groups: female_black, female_white, male_black, male_white.
    For "other / non-Black" groups, this tool uses the white coefficient set.
  */
  const COEFFS = {
    female_black: {
      baseSurv: 0.95334,
      mean: 86.6081,
      lnAge: 17.1141,
      lnAgeSq: 0,
      lnTotalChol: 0.9396,
      lnAgeTotalChol: 0,
      lnHdl: -18.9196,
      lnAgeHdl: 4.4748,
      lnTreatedSbp: 29.2907,
      lnAgeTreatedSbp: -6.4321,
      lnUntreatedSbp: 27.8197,
      lnAgeUntreatedSbp: -6.0873,
      smoker: 0.6908,
      lnAgeSmoker: 0,
      diabetes: 0.8738
    },

    female_white: {
      baseSurv: 0.96652,
      mean: -29.1817,
      lnAge: -29.799,
      lnAgeSq: 4.884,
      lnTotalChol: 13.54,
      lnAgeTotalChol: -3.114,
      lnHdl: -13.578,
      lnAgeHdl: 3.149,
      lnTreatedSbp: 2.019,
      lnAgeTreatedSbp: 0,
      lnUntreatedSbp: 1.957,
      lnAgeUntreatedSbp: 0,
      smoker: 7.574,
      lnAgeSmoker: -1.665,
      diabetes: 0.661
    },

    male_black: {
      baseSurv: 0.89536,
      mean: 19.5425,
      lnAge: 2.469,
      lnAgeSq: 0,
      lnTotalChol: 0.302,
      lnAgeTotalChol: 0,
      lnHdl: -0.307,
      lnAgeHdl: 0,
      lnTreatedSbp: 1.916,
      lnAgeTreatedSbp: 0,
      lnUntreatedSbp: 1.809,
      lnAgeUntreatedSbp: 0,
      smoker: 0.549,
      lnAgeSmoker: 0,
      diabetes: 0.645
    },

    male_white: {
      baseSurv: 0.91436,
      mean: 61.1816,
      lnAge: 12.344,
      lnAgeSq: 0,
      lnTotalChol: 11.853,
      lnAgeTotalChol: -2.664,
      lnHdl: -7.99,
      lnAgeHdl: 1.769,
      lnTreatedSbp: 1.797,
      lnAgeTreatedSbp: 0,
      lnUntreatedSbp: 1.764,
      lnAgeUntreatedSbp: 0,
      smoker: 7.837,
      lnAgeSmoker: -1.795,
      diabetes: 0.658
    }
  };

  function getRadioValue(name) {
    const checked = form.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : "";
  }

  function toNumber(id) {
    const value = document.getElementById(id).value.trim();
    return value === "" ? NaN : Number(value);
  }

  function showWarning(message) {
    warningBox.textContent = message;
    warningBox.classList.add("show");
  }

  function clearWarning() {
    warningBox.textContent = "";
    warningBox.classList.remove("show");
  }

  function validateInputs(data) {
    if (data.knownAscvd === "yes") {
      return "此工具主要適用於沒有已知臨床 ASCVD 的一級預防人群。若曾有心肌梗死、中風、冠脈介入或其他 ASCVD，請與醫師討論二級預防管理。";
    }

    const requiredFields = [
      ["年齡", data.age],
      ["總膽固醇", data.totalChol],
      ["HDL-C", data.hdl],
      ["收縮壓", data.sbp]
    ];

    for (const [label, value] of requiredFields) {
      if (!Number.isFinite(value)) {
        return `請填寫有效的「${label}」。`;
      }
    }

    if (!data.sex) return "請選擇生理性別。";
    if (!data.race) return "請選擇族群 / Race。";
    if (!data.bpMeds) return "請選擇是否正在使用降壓藥。";
    if (!data.diabetes) return "請選擇是否有糖尿病。";
    if (!data.smoker) return "請選擇目前是否吸菸。";

    if (data.age < 40 || data.age > 79) {
      return "PCE 10 年 ASCVD 風險估算通常適用於 40–79 歲。";
    }

    if (data.totalChol < 130 || data.totalChol > 320) {
      return "總膽固醇建議輸入範圍為 130–320 mg/dL。";
    }

    if (data.hdl < 20 || data.hdl > 100) {
      return "HDL-C 建議輸入範圍為 20–100 mg/dL。";
    }

    if (data.sbp < 90 || data.sbp > 200) {
      return "收縮壓建議輸入範圍為 90–200 mmHg。";
    }

    if (data.hdl >= data.totalChol) {
      return "HDL-C 通常不應高於或等於總膽固醇。請確認輸入值。";
    }

    return "";
  }

  function getFormData() {
    return {
      knownAscvd: getRadioValue("knownAscvd"),
      age: toNumber("age"),
      sex: document.getElementById("sex").value,
      race: document.getElementById("race").value,
      totalChol: toNumber("totalChol"),
      hdl: toNumber("hdl"),
      sbp: toNumber("sbp"),
      bpMeds: document.getElementById("bpMeds").value,
      diabetes: document.getElementById("diabetes").value,
      smoker: document.getElementById("smoker").value
    };
  }

  function calculateAscvdRisk(data) {
    const raceForEquation = data.race === "black" ? "black" : "white";
    const key = `${data.sex}_${raceForEquation}`;
    const c = COEFFS[key];

    if (!c) {
      throw new Error("No coefficient set found for selected sex/race.");
    }

    const lnAge = Math.log(data.age);
    const lnAgeSq = lnAge * lnAge;
    const lnTotalChol = Math.log(data.totalChol);
    const lnHdl = Math.log(data.hdl);
    const lnSbp = Math.log(data.sbp);

    const treated = data.bpMeds === "yes" ? 1 : 0;
    const untreated = treated === 1 ? 0 : 1;
    const smoker = data.smoker === "yes" ? 1 : 0;
    const diabetes = data.diabetes === "yes" ? 1 : 0;

    const individualSum =
      c.lnAge * lnAge +
      c.lnAgeSq * lnAgeSq +
      c.lnTotalChol * lnTotalChol +
      c.lnAgeTotalChol * lnAge * lnTotalChol +
      c.lnHdl * lnHdl +
      c.lnAgeHdl * lnAge * lnHdl +
      c.lnTreatedSbp * lnSbp * treated +
      c.lnAgeTreatedSbp * lnAge * lnSbp * treated +
      c.lnUntreatedSbp * lnSbp * untreated +
      c.lnAgeUntreatedSbp * lnAge * lnSbp * untreated +
      c.smoker * smoker +
      c.lnAgeSmoker * lnAge * smoker +
      c.diabetes * diabetes;

    const risk = 1 - Math.pow(c.baseSurv, Math.exp(individualSum - c.mean));

    return Math.max(0, Math.min(1, risk));
  }

  function classifyRisk(riskPercent) {
    if (riskPercent < 5) {
      return {
        label: "低風險",
        tone: "low",
        text: "估算結果屬於低風險範圍。仍建議維持健康飲食、規律運動、避免吸菸並定期追蹤血壓與血脂。"
      };
    }

    if (riskPercent < 7.5) {
      return {
        label: "邊緣風險",
        tone: "borderline",
        text: "估算結果屬於邊緣風險範圍。建議與醫療專業人員討論個人風險增強因子與生活方式介入。"
      };
    }

    if (riskPercent < 20) {
      return {
        label: "中等風險",
        tone: "intermediate",
        text: "估算結果屬於中等風險範圍。通常需要更完整的醫病討論，以評估降脂、血壓控制與其他預防策略。"
      };
    }

    return {
      label: "高風險",
      tone: "high",
      text: "估算結果屬於高風險範圍。建議盡快與醫療專業人員討論個人化預防與治療方案。"
    };
  }

  function formatPercent(risk) {
    const percent = risk * 100;

    if (percent < 1) {
      return percent.toFixed(2);
    }

    return percent.toFixed(1);
  }

  function labelYesNo(value) {
    return value === "yes" ? "是" : "否";
  }

  function labelSex(value) {
    return value === "female" ? "女性" : "男性";
  }

  function labelRace(value) {
    return value === "black" ? "黑人 / African American" : "非黑人 / 其他族群";
  }

  function updateResult(data, risk) {
    const percentText = formatPercent(risk);
    const percentValue = risk * 100;
    const category = classifyRisk(percentValue);

    riskPercentEl.textContent = percentText;
    riskCategoryEl.textContent = category.label;
    resultNarrativeEl.textContent = `你的估算 10 年 ASCVD 風險約為 ${percentText}%。${category.text}`;

    /*
      Meter display cap:
      30% and above fills the bar. This avoids a nearly empty visual for common
      low-to-moderate values while still showing directionality.
    */
    const meterWidth = Math.min(100, (percentValue / 30) * 100);
    riskMeterFillEl.style.width = `${meterWidth}%`;

    riskCategoryEl.dataset.tone = category.tone;

    inputEchoEl.innerHTML = `
      <div class="status-item"><span>年齡</span><strong>${data.age} 歲</strong></div>
      <div class="status-item"><span>生理性別</span><strong>${labelSex(data.sex)}</strong></div>
      <div class="status-item"><span>族群</span><strong>${labelRace(data.race)}</strong></div>
      <div class="status-item"><span>總膽固醇</span><strong>${data.totalChol} mg/dL</strong></div>
      <div class="status-item"><span>HDL-C</span><strong>${data.hdl} mg/dL</strong></div>
      <div class="status-item"><span>收縮壓</span><strong>${data.sbp} mmHg</strong></div>
      <div class="status-item"><span>降壓藥</span><strong>${labelYesNo(data.bpMeds)}</strong></div>
      <div class="status-item"><span>糖尿病</span><strong>${labelYesNo(data.diabetes)}</strong></div>
      <div class="status-item"><span>目前吸菸</span><strong>${labelYesNo(data.smoker)}</strong></div>
    `;
  }

  function resetResult() {
    clearWarning();

    riskPercentEl.textContent = "—";
    riskCategoryEl.textContent = "等待輸入";
    riskCategoryEl.removeAttribute("data-tone");
    riskMeterFillEl.style.width = "0%";
    resultNarrativeEl.textContent = "完成左側表單後，這裡會顯示估算的 10 年 ASCVD 風險與分層結果。";
    inputEchoEl.innerHTML = "";
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    clearWarning();

    const data = getFormData();
    const validationMessage = validateInputs(data);

    if (validationMessage) {
      showWarning(validationMessage);
      return;
    }

    try {
      const risk = calculateAscvdRisk(data);
      updateResult(data, risk);
    } catch (error) {
      showWarning("計算時發生錯誤，請檢查輸入資料後再試一次。");
      console.error(error);
    }
  });

  form.addEventListener("reset", function () {
    window.setTimeout(resetResult, 0);
  });
})();
