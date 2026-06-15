/*
  International Travel Health Planner
  國際旅行保健行前評估器

  Purpose:
  - Generate a browser-based pre-travel health checklist.
  - No personal data is uploaded.
  - This is informational only and not medical advice.
*/

(function () {
  "use strict";

  const form = document.getElementById("travelHealthForm");
  const warningBox = document.getElementById("formWarning");

  const resultTitle = document.getElementById("resultTitle");
  const resultLead = document.getElementById("resultLead");
  const riskPill = document.getElementById("riskPill");

  const metricDays = document.getElementById("metricDays");
  const metricRisk = document.getElementById("metricRisk");
  const metricItems = document.getElementById("metricItems");
  const metricRegion = document.getElementById("metricRegion");

  const recommendList = document.getElementById("recommendList");
  const timelineList = document.getElementById("timelineList");
  const officialLinks = document.getElementById("officialLinks");

  const regionLabels = {
    "east-asia": "東亞",
    "southeast-asia": "東南亞",
    "south-asia": "南亞",
    "middle-east": "中東",
    "africa": "非洲",
    "europe": "歐洲",
    "north-america": "北美",
    "latin-america": "拉丁美洲 / 加勒比",
    "oceania": "大洋洲 / 太平洋島國",
    "multi": "多國 / 多區域"
  };

  const purposeLabels = {
    tourism: "觀光 / 休閒",
    business: "商務 / 會議",
    study: "留學 / 交流",
    vfr: "探親訪友",
    work: "工作 / 長期派駐",
    fieldwork: "田野調查 / 志願服務 / 醫療援助",
    cruise: "郵輪旅行"
  };

  const ageLabels = {
    adult: "成人",
    child: "兒童 / 青少年",
    older: "65 歲及以上"
  };

  const regionRiskHints = {
    "southeast-asia": {
      score: 3,
      tags: ["蚊媒疾病", "旅行者腹瀉", "部分地區可能需瘧疾評估"],
      text: "東南亞旅行常需重點考慮蚊蟲叮咬防護、飲食飲水安全、甲肝 / 傷寒等旅行相關疫苗，以及偏遠或叢林地區的瘧疾風險評估。"
    },
    "south-asia": {
      score: 4,
      tags: ["飲食飲水", "疫苗核對", "空氣污染 / 高溫"],
      text: "南亞旅行需特別重視飲食飲水安全、旅行者腹瀉預防、常規疫苗核對，以及根據目的地與行程評估甲肝、傷寒、狂犬病、瘧疾等風險。"
    },
    "africa": {
      score: 5,
      tags: ["黃熱病核對", "瘧疾評估", "蚊媒疾病"],
      text: "非洲不同國家風險差異很大。請重點核對黃熱病疫苗要求、瘧疾預防、蚊媒疾病、飲食飲水安全與偏遠地區就醫安排。"
    },
    "latin-america": {
      score: 4,
      tags: ["登革熱 / 寨卡", "黃熱病核對", "食水安全"],
      text: "拉丁美洲與加勒比地區需考慮登革熱、寨卡、基孔肯雅熱等蚊媒疾病；部分地區還需要核對黃熱病疫苗建議或入境要求。"
    },
    "middle-east": {
      score: 3,
      tags: ["高溫", "呼吸道感染", "大型聚集活動"],
      text: "中東旅行需注意高溫、脫水、呼吸道感染風險；若參加大型宗教或群體活動，應提前核對疫苗與健康要求。"
    },
    "east-asia": {
      score: 2,
      tags: ["常規疫苗", "食品安全", "季節性流感"],
      text: "東亞旅行通常需重點核對常規疫苗、季節性流感與食品安全；鄉村、戶外或長期旅行者可再評估其他疫苗需求。"
    },
    "europe": {
      score: 1,
      tags: ["常規疫苗", "醫療保險", "慢病用藥"],
      text: "歐洲旅行多數情境以常規疫苗、旅行保險、慢病用藥與突發疾病就醫安排為重點。"
    },
    "north-america": {
      score: 1,
      tags: ["常規疫苗", "醫療保險", "處方藥攜帶"],
      text: "北美旅行通常重點在常規疫苗、旅行醫療保險、處方藥攜帶與緊急就醫安排。"
    },
    "oceania": {
      score: 2,
      tags: ["戶外活動", "防曬 / 防蚊", "海洋活動"],
      text: "大洋洲與太平洋島國旅行需注意戶外與海洋活動安全、防曬、防蚊，以及偏遠島嶼醫療可及性。"
    },
    "multi": {
      score: 5,
      tags: ["多國要求", "證件核對", "轉機風險"],
      text: "多國或多區域旅行需要逐一核對每個目的地與轉機地的疫苗、入境健康要求、疫情通知與藥品攜帶規定。"
    }
  };

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

      const assessment = buildAssessment(data);
      renderAssessment(data, assessment);
    });

    form.addEventListener("reset", function () {
      window.setTimeout(renderEmptyState, 0);
    });
  }

  function getCheckedValues(name) {
    return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`))
      .map(function (input) {
        return input.value;
      });
  }

  function getFormData() {
    return {
      destination: document.getElementById("destination").value.trim(),
      region: document.getElementById("region").value,
      departureDate: document.getElementById("departureDate").value,
      duration: Number(document.getElementById("duration").value),
      purpose: document.getElementById("purpose").value,
      travelerAge: document.getElementById("travelerAge").value,
      itinerary: getCheckedValues("itinerary"),
      health: getCheckedValues("health"),
      notes: document.getElementById("notes").value.trim()
    };
  }

  function validateInputs(data) {
    if (!data.destination) return "請輸入目的地。";
    if (!data.region) return "請選擇目的地區域。";
    if (!data.departureDate) return "請選擇出發日期。";
    if (!Number.isFinite(data.duration) || data.duration < 1) return "請輸入有效的旅行天數。";
    if (!data.purpose) return "請選擇旅行目的。";
    if (!data.travelerAge) return "請選擇旅行者年齡組。";

    const departure = new Date(`${data.departureDate}T00:00:00`);
    if (Number.isNaN(departure.getTime())) return "出發日期格式無效。";

    return "";
  }

  function buildAssessment(data) {
    const daysToGo = getDaysToDeparture(data.departureDate);
    let riskScore = 0;

    const recommendations = [];
    const timeline = [];

    const regionHint = regionRiskHints[data.region];
    if (regionHint) {
      riskScore += regionHint.score;
      recommendations.push({
        title: "目的地區域風險核對",
        text: regionHint.text,
        tags: regionHint.tags
      });
    }

    if (daysToGo < 14) {
      riskScore += 2;
      recommendations.push({
        title: "出發時間較近：優先處理高收益事項",
        text: "距離出發不足兩週，建議優先核對目的地疫情通知、常規疫苗狀態、旅行保險、處方藥與基礎急救用品。部分疫苗可能來不及完成完整免疫程序，但仍值得諮詢旅行醫學門診。",
        tags: ["緊急準備", "疫苗核對", "保險"]
      });
    } else if (daysToGo <= 42) {
      recommendations.push({
        title: "適合安排旅行醫學諮詢",
        text: "距離出發約 2–6 週，適合進行目的地風險評估、疫苗安排、慢病用藥準備與保險核對。",
        tags: ["4–6 週", "旅行門診", "清單準備"]
      });
    } else {
      recommendations.push({
        title: "時間充足：可以完整規劃",
        text: "距離出發仍有較充足時間，建議先查目的地官方健康建議，安排必要疫苗，並根據行程準備藥物、保險與應急計畫。",
        tags: ["提前規劃", "疫苗", "應急計畫"]
      });
    }

    if (data.duration >= 30) {
      riskScore += 2;
      recommendations.push({
        title: "長期停留：提高健康準備層級",
        text: "旅行時間達 30 天或以上，建議核對長期居留地醫療資源、處方藥供應、慢病複診安排、疫苗補種與當地傳染病風險。",
        tags: ["長期旅行", "慢病管理", "藥物供應"]
      });
    }

    if (data.itinerary.includes("rural") || data.itinerary.includes("remote-care")) {
      riskScore += 2;
      recommendations.push({
        title: "偏遠或就醫不便地區：準備更完整的醫療方案",
        text: "偏遠地區旅行應提前了解最近醫療機構位置、緊急轉運方式、旅行保險是否含醫療轉運，並準備更完整的旅行急救包。",
        tags: ["偏遠地區", "醫療轉運", "急救包"]
      });
    }

    if (data.itinerary.includes("outdoor")) {
      riskScore += 1;
      recommendations.push({
        title: "戶外活動：防曬、防蚊與外傷處理",
        text: "徒步、露營、潛水或戶外活動需要準備防曬、防蚊用品、傷口處理用品、補水用品，並評估高溫、溺水、外傷與動物接觸風險。",
        tags: ["戶外安全", "防曬", "外傷"]
      });
    }

    if (data.itinerary.includes("animal")) {
      riskScore += 2;
      recommendations.push({
        title: "可能接觸動物：評估狂犬病與咬傷處理",
        text: "若可能接觸犬、蝙蝠、猴或其他哺乳動物，建議提前了解狂犬病暴露後處理資源，避免觸摸或餵食動物，並諮詢是否需要暴露前疫苗。",
        tags: ["動物接觸", "狂犬病", "暴露後處理"]
      });
    }

    if (data.itinerary.includes("high-altitude")) {
      riskScore += 1;
      recommendations.push({
        title: "高海拔旅行：預防高山病",
        text: "若行程包含高海拔地區，應規劃漸進式上升、避免過度飲酒與劇烈活動，並與醫療專業人員討論高山病預防方案。",
        tags: ["高海拔", "高山病", "行程節奏"]
      });
    }

    if (data.purpose === "vfr") {
      riskScore += 1;
      recommendations.push({
        title: "探親訪友旅行：不要低估熟悉環境的風險",
        text: "探親訪友者可能停留更久、進入非旅遊區、與當地生活方式更接近，因此更應核對疫苗、食品飲水、蚊蟲與慢病管理風險。",
        tags: ["探親訪友", "長時間停留", "本地暴露"]
      });
    }

    if (data.purpose === "fieldwork" || data.purpose === "work") {
      riskScore += 2;
      recommendations.push({
        title: "工作、田野或志願服務：需做更細的職業暴露評估",
        text: "如涉及醫療、動物、野外、災害或社區工作，建議進行職業暴露評估，包括針刺傷、血液體液暴露、動物咬傷、交通與安全風險。",
        tags: ["職業暴露", "田野工作", "安全計畫"]
      });
    }

    if (data.purpose === "cruise") {
      riskScore += 1;
      recommendations.push({
        title: "郵輪旅行：注意呼吸道與胃腸道感染",
        text: "郵輪旅行需注意手衛生、呼吸道症狀、胃腸道感染與暈船問題；若有慢性病，應攜帶足量藥物與醫療資料。",
        tags: ["郵輪", "手衛生", "胃腸道感染"]
      });
    }

    if (data.travelerAge === "child" || data.travelerAge === "older") {
      riskScore += 1;
      recommendations.push({
        title: "特殊年齡組：確認疫苗、用藥與保險限制",
        text: "兒童、青少年與高齡旅行者應特別核對常規疫苗、適用藥物劑量、脫水與發熱處理、保險覆蓋範圍與照護安排。",
        tags: [ageLabels[data.travelerAge], "疫苗核對", "保險"]
      });
    }

    if (data.health.includes("pregnant")) {
      riskScore += 3;
      recommendations.push({
        title: "懷孕或備孕：出行前必須個別評估",
        text: "懷孕或備孕者應與醫療專業人員討論目的地感染風險、蚊媒疾病、疫苗適用性、飛行安全與孕期急症處理方案。",
        tags: ["懷孕", "備孕", "個別評估"]
      });
    }

    if (data.health.includes("chronic") || data.health.includes("medication")) {
      riskScore += 2;
      recommendations.push({
        title: "慢性病或長期用藥：準備醫療摘要與足量藥物",
        text: "建議攜帶英文版病情摘要、藥物清單、處方副本與足量藥物；藥物應放在隨身行李，不要只放托運行李。",
        tags: ["慢性病", "處方藥", "隨身行李"]
      });
    }

    if (data.health.includes("immune")) {
      riskScore += 3;
      recommendations.push({
        title: "免疫功能低下：需專業評估疫苗與感染風險",
        text: "免疫功能低下者應提前諮詢醫師或旅行醫學門診，特別是活疫苗適用性、感染暴露風險、抗感染藥物與目的地醫療資源。",
        tags: ["免疫低下", "活疫苗", "感染風險"]
      });
    }

    if (data.health.includes("allergy")) {
      riskScore += 1;
      recommendations.push({
        title: "過敏史：準備過敏資訊與應急用品",
        text: "建議攜帶過敏資訊卡、常用抗過敏藥物；嚴重過敏者應與醫師確認是否需要腎上腺素自動注射器及目的地攜帶規定。",
        tags: ["過敏", "應急用品", "醫療資訊卡"]
      });
    }

    recommendations.push({
      title: "飲食飲水安全",
      text: "優先選擇安全飲用水、熟食與衛生條件可靠的餐飲。避免不明來源冰塊、生食海鮮、未削皮生果蔬與衛生風險較高的食物。",
      tags: ["飲用水", "熟食", "旅行者腹瀉"]
    });

    recommendations.push({
      title: "蚊蟲與媒介傳播疾病防護",
      text: "前往熱帶、亞熱帶或蚊媒疾病流行地區時，應使用驅蚊劑、穿長袖長褲、選擇有紗窗或空調的住宿，並按目的地評估瘧疾預防需求。",
      tags: ["防蚊", "登革熱", "瘧疾評估"]
    });

    recommendations.push({
      title: "旅行保險與緊急聯絡",
      text: "建議購買涵蓋境外醫療、急診、住院、醫療轉運與行程延誤的旅行保險，並保存當地緊急電話、使領館與保險公司聯絡方式。",
      tags: ["旅行保險", "醫療轉運", "緊急聯絡"]
    });

    timeline.push({
      title: "出發前 6–8 週",
      text: "查詢 CDC / WHO / 目的地官方建議，安排旅行醫學諮詢，核對常規疫苗與目的地相關疫苗。"
    });

    timeline.push({
      title: "出發前 4–6 週",
      text: "完成主要疫苗安排、慢病複診、處方藥準備、旅行保險購買與高風險行程調整。"
    });

    timeline.push({
      title: "出發前 1–2 週",
      text: "整理藥物與急救包，保存保險、醫療摘要、緊急聯絡與官方健康建議截圖或離線副本。"
    });

    timeline.push({
      title: "旅行期間",
      text: "注意手衛生、飲食飲水安全、防蚊防曬、交通安全、規律服藥與症狀監測。"
    });

    timeline.push({
      title: "返程後",
      text: "若出現發熱、皮疹、持續腹瀉、呼吸困難、黃疸或被動物咬傷等情況，應及時就醫並告知旅行史。"
    });

    const riskLevel = classifyRisk(riskScore);

    return {
      daysToGo: daysToGo,
      riskScore: riskScore,
      riskLevel: riskLevel,
      recommendations: recommendations,
      timeline: timeline
    };
  }

  function classifyRisk(score) {
    if (score <= 3) {
      return {
        label: "基礎準備",
        short: "低",
        text: "以常規疫苗、保險、用藥與目的地官方資訊核對為主。"
      };
    }

    if (score <= 7) {
      return {
        label: "中等準備",
        short: "中",
        text: "建議提前安排旅行醫學諮詢，並根據目的地與行程核對疫苗、蚊媒疾病與藥物準備。"
      };
    }

    return {
      label: "高度準備",
      short: "高",
      text: "建議盡早諮詢旅行醫學或相關專科，尤其需核對疫苗、瘧疾預防、慢病管理與緊急就醫安排。"
    };
  }

  function renderAssessment(data, assessment) {
    const destination = data.destination;
    const regionText = regionLabels[data.region] || "—";

    resultTitle.textContent = `${destination} 行前保健清單`;
    resultLead.textContent = `目的地區域：${regionText}；旅行目的：${purposeLabels[data.purpose]}；旅行天數：${data.duration} 天。${assessment.riskLevel.text}`;
    riskPill.textContent = `準備層級：${assessment.riskLevel.label}`;

    metricDays.textContent = assessment.daysToGo >= 0 ? String(assessment.daysToGo) : "已過";
    metricRisk.textContent = assessment.riskLevel.short;
    metricItems.textContent = String(assessment.recommendations.length);
    metricRegion.textContent = regionText;

    renderRecommendations(assessment.recommendations);
    renderTimeline(assessment.timeline);
    renderOfficialLinks(data);
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

  function renderTimeline(items) {
    timelineList.innerHTML = items.map(function (item) {
      return `
        <article class="timeline-card">
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.text)}</p>
        </article>
      `;
    }).join("");
  }

  function renderOfficialLinks(data) {
    const query = encodeURIComponent(data.destination);

    const links = [
      {
        title: "CDC Travelers’ Health：目的地健康建議",
        text: "查詢目的地疫苗、疾病風險、用藥與旅行健康建議。",
        url: "https://wwwnc.cdc.gov/travel/destinations/list"
      },
      {
        title: "CDC Travel Health Notices：最新旅行健康通知",
        text: "查詢全球疫情、特殊活動、自然災害與旅行健康風險通知。",
        url: `https://wwwnc.cdc.gov/travel/notices?query=${query}`
      },
      {
        title: "WHO Travel Advice：國際旅行健康資訊",
        text: "查看世界衛生組織提供的旅行相關傳染病與疫苗要求資訊。",
        url: "https://www.who.int/travel-advice"
      },
      {
        title: "IATA Travel Centre：入境與證件要求",
        text: "核對目的地簽證、入境、健康與文件要求。請以航空公司與目的地政府資訊為準。",
        url: "https://www.iatatravelcentre.com/"
      }
    ];

    officialLinks.innerHTML = links.map(function (link) {
      return `
        <a class="link-card" href="${escapeAttr(link.url)}" target="_blank" rel="noopener noreferrer">
          <strong>${escapeHtml(link.title)}</strong>
          <span>${escapeHtml(link.text)}</span>
        </a>
      `;
    }).join("");
  }

  function renderEmptyState() {
    clearWarning();

    resultTitle.textContent = "等待評估。";
    resultLead.textContent = "完成左側表單後，這裡會生成行前保健重點、準備時間線與官方查詢入口。";
    riskPill.textContent = "尚未評估";

    metricDays.textContent = "—";
    metricRisk.textContent = "—";
    metricItems.textContent = "—";
    metricRegion.textContent = "—";

    recommendList.innerHTML = emptyCard("等待生成", "請輸入旅行資訊並點擊「生成行前清單」。");
    timelineList.innerHTML = emptyCard("等待生成", "行前準備時間線會根據出發日期顯示。");
    officialLinks.innerHTML = emptyLinkCard();
  }

  function emptyCard(title, text) {
    return `
      <article class="recommend-card">
        <h4>${escapeHtml(title)}</h4>
        <p>${escapeHtml(text)}</p>
      </article>
    `;
  }

  function emptyLinkCard() {
    return `
      <a class="link-card" href="https://wwwnc.cdc.gov/travel/destinations/list" target="_blank" rel="noopener noreferrer">
        <strong>CDC Travelers’ Health</strong>
        <span>完成評估後，這裡會列出更多官方查詢入口。</span>
      </a>
    `;
  }

  function getDaysToDeparture(dateString) {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const departure = new Date(`${dateString}T00:00:00`);
    const diff = departure.getTime() - todayStart.getTime();

    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  function showWarning(message) {
    warningBox.textContent = message;
    warningBox.classList.add("show");
  }

  function clearWarning() {
    warningBox.textContent = "";
    warningBox.classList.remove("show");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll("`", "&#096;");
  }

  init();
})();
