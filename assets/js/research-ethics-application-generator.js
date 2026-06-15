/*
  Research Ethics Application Generator
  研究倫理申請生成器

  Purpose:
  - Generate a draft IRB / REC / Research Ethics application.
  - Generate participant information and consent form draft.
  - All processing is local in the browser.
*/

(function () {
  "use strict";

  const form = document.getElementById("ethicsForm");
  const warningBox = document.getElementById("formWarning");

  const resultTitle = document.getElementById("resultTitle");
  const resultLead = document.getElementById("resultLead");
  const riskPill = document.getElementById("riskPill");

  const metricRisk = document.getElementById("metricRisk");
  const metricSections = document.getElementById("metricSections");
  const metricConsent = document.getElementById("metricConsent");
  const metricData = document.getElementById("metricData");

  const recommendList = document.getElementById("recommendList");
  const generatedOutput = document.getElementById("generatedOutput");

  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const printBtn = document.getElementById("printBtn");

  function init() {
    if (!form) return;

    renderEmptyState();

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearWarning();

      const data = getFormData();
      const validationMessage = validateInputs(data);

      if (validationMessage) {
        showWarning(validationMessage);
        return;
      }

      const assessment = assessEthicsRisk(data);
      const recommendations = buildRecommendations(data, assessment);
      const draft = buildEthicsDraft(data, assessment, recommendations);

      renderResult(data, assessment, recommendations, draft);
    });

    form.addEventListener("reset", function () {
      window.setTimeout(renderEmptyState, 0);
    });

    copyBtn.addEventListener("click", copyDraft);
    downloadBtn.addEventListener("click", downloadDraft);
    printBtn.addEventListener("click", function () {
      window.print();
    });
  }

  function getValue(id) {
    const element = document.getElementById(id);
    return element ? element.value.trim() : "";
  }

  function getCheckedValues(name) {
    return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`))
      .map(function (input) {
        return input.value;
      });
  }

  function getFormData() {
    return {
      projectTitle: getValue("projectTitle"),
      piName: getValue("piName"),
      institution: getValue("institution"),
      department: getValue("department"),
      discipline: getValue("discipline"),
      reviewType: getValue("reviewType"),

      summary: getValue("summary"),
      objectives: getValue("objectives"),
      researchQuestions: getValue("researchQuestions"),
      studyDesign: getValue("studyDesign"),
      studyDuration: getValue("studyDuration"),

      participants: getValue("participants"),
      sampleSize: getValue("sampleSize"),
      inclusionCriteria: getValue("inclusionCriteria"),
      exclusionCriteria: getValue("exclusionCriteria"),
      vulnerableGroups: getCheckedValues("vulnerableGroups"),
      recruitment: getValue("recruitment"),

      methods: getCheckedValues("methods"),
      procedure: getValue("procedure"),
      timeBurden: getValue("timeBurden"),
      incentive: getValue("incentive"),

      dataTypes: getCheckedValues("dataTypes"),
      privacyMeasures: getCheckedValues("privacyMeasures"),
      retention: getValue("retention"),
      dataStorage: getValue("dataStorage"),
      aiUse: getValue("aiUse"),
      crossBorder: getValue("crossBorder"),

      consentMode: getValue("consentMode"),
      withdrawal: getValue("withdrawal"),
      riskFlags: getCheckedValues("riskFlags"),
      riskMitigation: getValue("riskMitigation"),
      benefits: getValue("benefits"),
      dissemination: getValue("dissemination")
    };
  }

  function validateInputs(data) {
    if (!data.projectTitle) return "請填寫研究項目標題。";
    if (!data.piName) return "請填寫主要研究者姓名。";
    if (!data.institution) return "請填寫所屬機構。";
    if (!data.summary) return "請填寫研究摘要。";
    if (!data.objectives) return "請填寫研究目的。";
    if (!data.participants) return "請填寫研究對象。";

    if (!data.methods.length) {
      return "請至少選擇一種資料收集方法。";
    }

    if (!data.dataTypes.length) {
      return "請至少選擇一種可能收集的資料類型。";
    }

    if (!data.privacyMeasures.length) {
      return "請至少選擇一項資料保護措施。";
    }

    return "";
  }

  function assessEthicsRisk(data) {
    let score = 0;
    const reasons = [];

    const vulnerableWithoutNone = data.vulnerableGroups.filter(function (item) {
      return item !== "無";
    });

    if (vulnerableWithoutNone.length > 0) {
      score += 3;
      reasons.push("研究涉及特殊或脆弱群體。");
    }

    if (
      containsAny(data.dataTypes, [
        "健康相關資料",
        "心理或情緒資料",
        "聯絡資料",
        "音頻 / 視頻資料",
        "網絡行為或社交媒體資料"
      ])
    ) {
      score += 2;
      reasons.push("研究可能收集敏感或可識別資料。");
    }

    if (
      containsAny(data.methods, [
        "實驗 / 干預",
        "錄音 / 錄像",
        "焦點小組",
        "網絡公開資料 / 社交媒體資料"
      ])
    ) {
      score += 2;
      reasons.push("研究方法可能增加隱私、心理或資料再識別風險。");
    }

    if (
      containsAny(data.riskFlags, [
        "涉及欺瞞或不完全告知",
        "涉及干預或實驗操作",
        "涉及跨境資料傳輸",
        "存在權力關係或招募壓力"
      ])
    ) {
      score += 3;
      reasons.push("研究包含需額外倫理說明的高關注情境。");
    }

    if (data.aiUse !== "不使用 AI 工具") {
      score += 1;
      reasons.push("研究涉及 AI 工具，需說明資料輸入、輸出核查與隱私控制。");
    }

    if (data.crossBorder !== "否") {
      score += 2;
      reasons.push("資料可能涉及跨境傳輸或跨司法管轄區處理。");
    }

    const sampleSizeNumber = Number(data.sampleSize);
    if (Number.isFinite(sampleSizeNumber) && sampleSizeNumber >= 500) {
      score += 1;
      reasons.push("樣本量較大，需注意資料安全與訪問權限管理。");
    }

    let level;

    if (score <= 3) {
      level = {
        label: "低風險",
        short: "低",
        reviewHint: "可能適合豁免審查或快速審查，但最終應由機構倫理委員會判定。"
      };
    } else if (score <= 7) {
      level = {
        label: "中等風險",
        short: "中",
        reviewHint: "通常需要較完整的資料保護、知情同意與風險控制說明。"
      };
    } else {
      level = {
        label: "較高風險",
        short: "高",
        reviewHint: "建議在正式提交前與倫理委員會、導師或機構研究辦公室預先溝通。"
      };
    }

    return {
      score: score,
      level: level,
      reasons: reasons
    };
  }

  function buildRecommendations(data, assessment) {
    const recommendations = [];

    recommendations.push({
      title: "按機構模板核對",
      text: "不同院校、醫療機構、期刊與資助方的倫理申請格式不同。請將本工具生成內容轉貼到正式模板後逐項核對。",
      tags: ["正式模板", "機構要求"]
    });

    if (assessment.level.short !== "低") {
      recommendations.push({
        title: "補充風險控制細節",
        text: "本項目存在一定倫理風險，建議明確說明如何減少心理不適、招募壓力、資料洩露、再識別與跨境傳輸風險。",
        tags: ["風險控制", "補充說明"]
      });
    }

    if (
      containsAny(data.vulnerableGroups, [
        "未成年人",
        "孕婦",
        "患者或醫療服務使用者",
        "員工 / 學生等可能存在權力關係者",
        "低收入或弱勢社群"
      ])
    ) {
      recommendations.push({
        title: "脆弱群體保護",
        text: "涉及特殊或脆弱群體時，需說明額外保護措施，例如監護人同意、避免不當誘導、提供退出機制與支援資源。",
        tags: ["脆弱群體", "額外保護"]
      });
    }

    if (data.methods.includes("錄音 / 錄像") || data.dataTypes.includes("音頻 / 視頻資料")) {
      recommendations.push({
        title: "錄音錄像需單獨說明",
        text: "建議在知情同意書中明確列出錄音 / 錄像目的、保存期限、訪問權限、轉錄後是否刪除原始文件，以及是否允許引用匿名逐字稿。",
        tags: ["錄音錄像", "知情同意"]
      });
    }

    if (
      data.methods.includes("網絡公開資料 / 社交媒體資料") ||
      data.dataTypes.includes("網絡行為或社交媒體資料")
    ) {
      recommendations.push({
        title: "網絡資料需評估合理期待隱私",
        text: "即使資料公開可見，也應評估使用者是否合理期待其內容被研究使用，並採取去識別化、避免直接引用可搜索文本等措施。",
        tags: ["網絡研究", "再識別風險"]
      });
    }

    if (data.aiUse !== "不使用 AI 工具") {
      recommendations.push({
        title: "AI 使用透明化",
        text: "建議說明 AI 工具用途、是否輸入原始資料、是否包含個人資料、如何驗證輸出、以及研究者如何承擔最終分析與寫作責任。",
        tags: ["AI", "透明度"]
      });
    }

    if (data.crossBorder !== "否") {
      recommendations.push({
        title: "跨境資料傳輸說明",
        text: "若資料需跨境處理或儲存，建議說明資料流向、儲存地點、訪問權限、加密方式與適用法規或機構政策。",
        tags: ["跨境資料", "資料治理"]
      });
    }

    if (!data.riskMitigation) {
      recommendations.push({
        title: "補充風險控制措施",
        text: "目前未填寫風險控制措施。正式提交前建議具體說明如何處理不適、退出、投訴、資料洩露與危機情況。",
        tags: ["待補充", "風險控制"]
      });
    }

    return recommendations;
  }

  function buildEthicsDraft(data, assessment, recommendations) {
    const today = formatDate(new Date());

    const methodsText = listOrDefault(data.methods, "未具體說明");
    const vulnerableText = listOrDefault(data.vulnerableGroups, "未具體說明");
    const dataTypesText = listOrDefault(data.dataTypes, "未具體說明");
    const privacyText = listOrDefault(data.privacyMeasures, "未具體說明");
    const riskFlagsText = listOrDefault(data.riskFlags, "未具體說明");
    const sampleText = data.sampleSize ? `${data.sampleSize} 人` : "待定";
    const timeBurdenText = data.timeBurden || "待定";
    const incentiveText = data.incentive || "無或待定";
    const withdrawalText = data.withdrawal || "參與者可在不受懲罰或不利影響的情況下自由退出研究。";
    const dataStorageText = data.dataStorage || "由研究團隊以加密方式保存於受限制訪問的設備或機構授權平台。";

    return `研究倫理申請草稿
Research Ethics / IRB Application Draft

生成日期：${today}
重要提示：本文件為草稿，需依照所在機構 IRB / REC / 研究倫理委員會正式模板修改後提交。

============================================================
一、項目基本信息
============================================================

研究項目名稱：
${data.projectTitle}

主要研究者：
${data.piName}

所屬機構：
${data.institution}

學院 / 部門：
${data.department || "未填寫"}

研究領域：
${data.discipline}

研究設計：
${data.studyDesign}

預期審查類型：
${data.reviewType}

研究週期：
${data.studyDuration || "待定"}

倫理風險初步評估：
${assessment.level.label}（分數：${assessment.score}）
${assessment.level.reviewHint}

主要風險提示：
${assessment.reasons.length ? assessment.reasons.map(numberedLine).join("\n") : "1. 暫未識別出明顯高於日常生活的風險，但仍需由倫理委員會確認。"}

============================================================
二、研究背景與摘要
============================================================

${data.summary}

============================================================
三、研究目的與研究問題
============================================================

研究目的：
${data.objectives}

研究問題 / 假設：
${data.researchQuestions || "本研究將根據研究目的進一步提出具體研究問題或假設。"}

============================================================
四、研究對象、樣本量與招募方式
============================================================

研究對象：
${data.participants}

預計樣本量：
${sampleText}

納入標準：
${data.inclusionCriteria || "研究者將根據研究目的設定明確納入標準，例如年齡、身份、語言能力與自願參與條件。"}

排除標準：
${data.exclusionCriteria || "研究者將排除無法提供有效知情同意、資料明顯無效或不符合研究條件的參與者。"}

特殊或脆弱群體：
${vulnerableText}

招募方式：
${data.recruitment || "研究者將通過合適渠道發布招募資訊。招募材料將清楚說明研究目的、參與內容、自願性、退出權利與聯絡方式。"}

避免不當誘導與權力壓力：
研究者將確保參與完全自願，不因拒絕或退出研究而受到任何不利影響。如研究涉及學生、員工、患者或其他可能存在權力關係的群體，研究者將採取額外措施降低招募壓力，例如由非直接管理或評分人員進行招募、避免在課堂或工作考核情境中直接施壓。

============================================================
五、研究方法與研究程序
============================================================

資料收集方法：
${methodsText}

研究程序：
${data.procedure || "參與者將先閱讀研究資訊與知情同意內容，在確認自願參與後完成相應資料收集程序。研究者將盡量減少對參與者日常生活、學習或工作的干擾。"}

參與所需時間：
${timeBurdenText}

參與補償 / 獎勵：
${incentiveText}

補償合理性說明：
如提供補償，補償金額或形式將保持適度，目的在於感謝參與者投入時間，而非對其形成不當誘導。參與者即使中途退出，也不應因此受到不合理損失。

============================================================
六、知情同意程序
============================================================

知情同意方式：
${data.consentMode}

知情同意內容將包括：
1. 研究目的與研究者身份；
2. 參與者需要完成的事項與所需時間；
3. 可能風險、不適與應對措施；
4. 預期利益；
5. 資料收集、保存、使用與保密方式；
6. 自願參與與退出權利；
7. 是否錄音、錄像或使用 AI 工具；
8. 聯絡方式與投訴渠道；
9. 研究成果發布方式。

退出機制：
${withdrawalText}

對於無法自行提供完整知情同意的參與者，研究者將根據機構要求取得監護人或合法代表同意，並在可能情況下取得參與者本人同意或知情確認。

============================================================
七、潛在風險與風險控制
============================================================

潛在倫理風險：
${riskFlagsText}

風險控制措施：
${data.riskMitigation || "研究者將採取必要措施降低風險，包括但不限於：清楚說明自願參與與退出權利、避免收集不必要個人資料、對資料進行匿名化或去識別化處理、限制資料訪問權限、只報告匯總結果，並在參與者感到不適時提供退出或求助資訊。"}

心理不適處理：
若研究問題可能引起心理不適，參與者可跳過不願回答的問題或隨時退出。研究者將提供適當支援資訊或建議其尋求專業協助。

隱私與再識別風險控制：
研究者將避免在報告中呈現可識別個人身份的細節。質性引用將進行匿名化處理，必要時改寫可能導致再識別的細節。

============================================================
八、預期利益
============================================================

${data.benefits || "本研究可能不會為參與者帶來直接個人利益，但有助於增進相關領域知識，並為未來實踐、教育、服務或政策制定提供參考。"}

============================================================
九、資料管理、保密與保存
============================================================

可能收集的資料類型：
${dataTypesText}

資料保護措施：
${privacyText}

資料儲存位置：
${dataStorageText}

資料保存期限：
${data.retention}

資料訪問權限：
只有經授權的研究團隊成員可以訪問研究資料。研究團隊將使用密碼保護、加密儲存、限制訪問權限等措施保護資料安全。

匿名化 / 去識別化：
研究者將在可行情況下移除姓名、電話、電郵、學號、員工編號、精確地理位置等直接識別資訊。若需保留聯絡方式，將與研究資料分開保存。

資料銷毀：
保存期滿後，電子資料將以安全方式刪除，紙本資料將以碎紙或其他安全方式銷毀。

跨境資料傳輸：
${data.crossBorder === "否" ? "本研究目前不涉及跨境資料傳輸。" : data.crossBorder + "。研究者需在正式申請中補充資料流向、儲存地點、保護措施與適用政策。"}

============================================================
十、AI 工具使用說明
============================================================

AI 使用情況：
${data.aiUse}

AI 使用原則：
如研究過程使用 AI 工具，研究者將避免向第三方 AI 平台輸入可識別個人身份的原始資料，除非已取得明確授權並符合機構資料保護要求。AI 生成內容僅作輔助，研究者將對研究設計、分析、解釋與最終文本承擔責任。

============================================================
十一、研究成果發布
============================================================

${data.dissemination || "研究成果可能以學術論文、會議報告、課題報告或教學材料形式發布。所有結果將以匿名或匯總形式呈現，不披露可識別個人身份的資料。"}

============================================================
十二、研究者聲明
============================================================

研究者聲明：
1. 本研究將在獲得倫理批准後開始資料收集；
2. 研究者將遵守所在機構研究倫理與資料保護要求；
3. 如研究設計、招募方式、資料收集方法或風險情況發生重要變更，研究者將按規定提交修訂申請；
4. 研究者將保障參與者自願參與、知情同意、隱私與退出權利；
5. 研究者將誠實報告研究結果，避免捏造、篡改或不當使用資料。

主要研究者簽名：____________________

日期：____________________

============================================================
附錄 A：參與者資訊說明書草稿
============================================================

研究項目名稱：
${data.projectTitle}

研究者：
${data.piName}，${data.institution}

研究目的：
${data.objectives}

你為什麼被邀請？
你被邀請是因為你符合本研究的研究對象條件：${data.participants}。

你需要做什麼？
${data.procedure || "如果你同意參與，將完成研究者提供的資料收集程序，例如問卷、訪談或其他研究活動。"}

需要多長時間？
${timeBurdenText}

是否必須參與？
否。參與完全自願。你可以拒絕參與，也可以在研究過程中退出，而不會受到任何不利影響。

可能風險：
${riskFlagsText}

風險控制：
${data.riskMitigation || "研究者將盡量減少風險，並保護你的隱私與資料安全。"}

資料如何被保護？
研究資料將採取以下保護措施：${privacyText}。研究成果將以匿名或匯總形式呈現。

是否有補償？
${incentiveText}

聯絡方式：
如你對本研究有任何問題，請聯絡研究者：${data.piName}。
如需正式提交，請在此加入研究者電郵、電話及倫理委員會聯絡方式。

============================================================
附錄 B：知情同意書草稿
============================================================

請在確認以下內容後表示同意：

□ 我已閱讀並理解本研究的參與者資訊說明。
□ 我有機會提出問題，並已獲得滿意解答。
□ 我理解參與本研究是自願的，可以在不受懲罰的情況下退出。
□ 我理解研究者將收集並使用與本研究相關的資料。
□ 我理解研究者將採取措施保護我的個人資料與隱私。
□ 我同意參與本研究。

參與者姓名：____________________

參與者簽名：____________________

日期：____________________

如為線上知情同意，可改為：
「我已閱讀上述資訊，並自願同意參與本研究。」【同意 / 不同意】

============================================================
附錄 C：正式提交前核對清單
============================================================

${recommendations.map(function (item, index) {
  return `${index + 1}. ${item.title}：${item.text}`;
}).join("\n")}

請確認是否已附上：
□ 研究計畫書
□ 問卷 / 訪談提綱 / 實驗材料
□ 招募海報或招募文本
□ 參與者資訊說明書
□ 知情同意書
□ 資料管理計畫
□ 風險控制與支援資源說明
□ 研究團隊利益衝突聲明
□ 其他機構要求附件
`;
  }

  function renderResult(data, assessment, recommendations, draft) {
    resultTitle.textContent = "倫理申請草稿已生成。";
    resultLead.textContent = `項目：「${data.projectTitle}」。請根據所在機構模板進一步修改、補充附件並提交正式審查。`;
    riskPill.textContent = `初步風險層級：${assessment.level.label}｜${assessment.level.reviewHint}`;

    metricRisk.textContent = assessment.level.short;
    metricSections.textContent = "12+";
    metricConsent.textContent = consentShortLabel(data.consentMode);
    metricData.textContent = data.dataTypes.length ? String(data.dataTypes.length) : "—";

    renderRecommendations(recommendations);
    generatedOutput.value = draft;
  }

  function renderRecommendations(items) {
    recommendList.innerHTML = items.map(function (item) {
      const tags = item.tags.map(function (tag) {
        return `<span class="tag">${escapeHtml(tag)}</span>`;
      }).join("");

      return `
        <article class="recommend-card">
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.text)}</p>
          <div class="tag-row">${tags}</div>
        </article>
      `;
    }).join("");
  }

  function renderEmptyState() {
    clearWarning();

    resultTitle.textContent = "等待生成。";
    resultLead.textContent = "完成左側表單後，這裡會顯示倫理風險層級、補充建議與完整申請草稿。";
    riskPill.textContent = "尚未評估";

    metricRisk.textContent = "—";
    metricSections.textContent = "—";
    metricConsent.textContent = "—";
    metricData.textContent = "—";

    recommendList.innerHTML = `
      <article class="recommend-card">
        <h4>等待生成</h4>
        <p>請填寫研究項目信息並點擊「生成倫理申請草稿」。</p>
      </article>
    `;

    generatedOutput.value = "";
  }

  async function copyDraft() {
    const text = generatedOutput.value.trim();

    if (!text) {
      showWarning("尚未生成草稿，請先完成表單。");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      showTemporaryNotice("草稿已複製到剪貼簿。");
    } catch (error) {
      generatedOutput.select();
      document.execCommand("copy");
      showTemporaryNotice("草稿已複製。");
    }
  }

  function downloadDraft() {
    const text = generatedOutput.value.trim();

    if (!text) {
      showWarning("尚未生成草稿，請先完成表單。");
      return;
    }

    const projectTitle = getValue("projectTitle") || "research-ethics-application";
    const safeName = projectTitle
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 60);

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${safeName}-ethics-application-draft.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function consentShortLabel(value) {
    if (!value) return "—";
    if (value.includes("線上")) return "線上";
    if (value.includes("書面")) return "書面";
    if (value.includes("口頭")) return "口頭";
    if (value.includes("豁免")) return "豁免";
    return "其他";
  }

  function containsAny(array, targets) {
    return targets.some(function (target) {
      return array.includes(target);
    });
  }

  function listOrDefault(array, fallback) {
    if (!array || !array.length) return fallback;
    return array.join("；");
  }

  function numberedLine(text, index) {
    return `${index + 1}. ${text}`;
  }

  function formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function showWarning(message) {
    warningBox.textContent = message;
    warningBox.classList.add("show");
  }

  function clearWarning() {
    warningBox.textContent = "";
    warningBox.classList.remove("show");
  }

  function showTemporaryNotice(message) {
    showWarning(message);
    window.setTimeout(clearWarning, 2400);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  init();
})();
