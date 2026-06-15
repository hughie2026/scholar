/*
  Public Health Research Trends Recommender
  公共衛生研究熱點推薦器

  Data source:
  - OpenAlex Works API

  Deployment note:
  - 正式公開部署時，建議使用後端代理或 Cloudflare Worker 隱藏 API key。
  - 如使用純前端，使用者可以在頁面輸入 OpenAlex API key；key 只存於瀏覽器 localStorage。
*/

(function () {
  "use strict";

  const OPENALEX_BASE = "https://api.openalex.org/works";

  /*
    可選：如果你使用後端代理，填入代理地址。
    例如：
    const OPENALEX_PROXY_URL = "https://your-worker.example.workers.dev/openalex/works";
    代理需要接受 query string 並轉發到 OpenAlex。
  */
  const OPENALEX_PROXY_URL = "";

  /*
    不建議在公開前端直接填 API key。
    若只是本地測試，可以臨時填入。
  */
  const OPENALEX_API_KEY = "";

  const DEFAULT_PER_PAGE = 25;

  const branches = [
    {
      id: "public-health-general",
      title: "公共衛生總覽",
      subtitle: "Public Health Overview",
      query: "public health population health epidemiology prevention health promotion global health",
      short: "總覽"
    },
    {
      id: "epidemiology",
      title: "流行病學與疾病監測",
      subtitle: "Epidemiology & Surveillance",
      query: "epidemiology disease surveillance outbreak infectious disease incidence prevalence cohort study",
      short: "流病"
    },
    {
      id: "health-policy",
      title: "健康政策與衛生系統",
      subtitle: "Health Policy & Systems",
      query: "health policy health system universal health coverage health services research healthcare access",
      short: "政策"
    },
    {
      id: "global-health",
      title: "全球健康與健康治理",
      subtitle: "Global Health",
      query: "global health global health governance international health pandemic preparedness health security",
      short: "全球"
    },
    {
      id: "environmental-health",
      title: "環境健康與氣候變化",
      subtitle: "Environmental Health & Climate",
      query: "environmental health climate change air pollution heat exposure environmental exposure public health",
      short: "環境"
    },
    {
      id: "chronic-disease",
      title: "慢性病與健康促進",
      subtitle: "NCDs & Health Promotion",
      query: "noncommunicable disease chronic disease diabetes cardiovascular obesity health promotion lifestyle intervention",
      short: "慢病"
    },
    {
      id: "mental-health",
      title: "心理健康與社會福祉",
      subtitle: "Mental Health",
      query: "public mental health depression anxiety wellbeing loneliness suicide prevention community mental health",
      short: "心理"
    },
    {
      id: "health-equity",
      title: "健康公平與社會決定因素",
      subtitle: "Health Equity & SDOH",
      query: "health equity social determinants of health disparities inequality vulnerable populations minority health",
      short: "公平"
    },
    {
      id: "digital-health",
      title: "數字健康、AI 與大數據",
      subtitle: "Digital Health & AI",
      query: "digital health artificial intelligence public health big data machine learning mobile health telehealth",
      short: "數字"
    },
    {
      id: "maternal-child",
      title: "婦幼健康與生命早期",
      subtitle: "Maternal & Child Health",
      query: "maternal health child health adolescent health pregnancy birth outcomes early life public health",
      short: "婦幼"
    },
    {
      id: "nutrition",
      title: "營養、食品安全與肥胖",
      subtitle: "Nutrition & Food Systems",
      query: "public health nutrition food security food safety obesity dietary behavior ultra processed food",
      short: "營養"
    },
    {
      id: "aging",
      title: "老齡化與長期照護",
      subtitle: "Aging & Long-term Care",
      query: "aging public health healthy aging long-term care dementia frailty older adults social care",
      short: "老齡"
    }
  ];

  const hotspotTerms = [
    {
      id: "ai-digital-health",
      label: "AI、數字健康與公共衛生智能化",
      terms: [
        "artificial intelligence",
        "machine learning",
        "deep learning",
        "digital health",
        "mobile health",
        "mhealth",
        "telehealth",
        "big data",
        "predictive model",
        "algorithm",
        "wearable",
        "chatgpt",
        "large language model"
      ],
      why: "關注 AI、大數據、移動健康與遠程醫療如何改變疾病監測、健康干預與公共衛生決策。"
    },
    {
      id: "climate-health",
      label: "氣候變化與健康風險",
      terms: [
        "climate change",
        "heat exposure",
        "heatwave",
        "air pollution",
        "wildfire",
        "extreme weather",
        "environmental exposure",
        "carbon",
        "adaptation",
        "climate resilience"
      ],
      why: "聚焦氣候變化、空氣污染、極端高溫與環境暴露對人群健康的影響。"
    },
    {
      id: "pandemic-preparedness",
      label: "疫情防控、監測與健康安全",
      terms: [
        "pandemic",
        "outbreak",
        "surveillance",
        "preparedness",
        "infectious disease",
        "vaccination",
        "vaccine",
        "covid-19",
        "health security",
        "contact tracing"
      ],
      why: "關注疫情後時代的監測系統、疫苗接種、風險溝通與公共衛生應急能力。"
    },
    {
      id: "health-equity-sdoh",
      label: "健康公平與社會決定因素",
      terms: [
        "health equity",
        "social determinants",
        "health disparities",
        "inequality",
        "poverty",
        "minority",
        "vulnerable population",
        "structural racism",
        "access to care",
        "migrant"
      ],
      why: "分析收入、教育、族群、地理與制度因素如何塑造健康差異。"
    },
    {
      id: "mental-health",
      label: "心理健康、孤獨與社會福祉",
      terms: [
        "mental health",
        "depression",
        "anxiety",
        "wellbeing",
        "well-being",
        "loneliness",
        "suicide",
        "stress",
        "burnout",
        "community mental health"
      ],
      why: "關注心理健康負擔、孤獨感、壓力、社區干預與公共心理健康服務。"
    },
    {
      id: "ncd-prevention",
      label: "慢性病預防與生活方式干預",
      terms: [
        "noncommunicable disease",
        "chronic disease",
        "diabetes",
        "cardiovascular",
        "obesity",
        "hypertension",
        "physical activity",
        "diet",
        "lifestyle intervention",
        "prevention"
      ],
      why: "聚焦慢病負擔、肥胖、心血管疾病、糖尿病與健康行為改變。"
    },
    {
      id: "health-systems",
      label: "衛生系統韌性與醫療可及性",
      terms: [
        "health system",
        "healthcare access",
        "universal health coverage",
        "primary care",
        "health services",
        "health workforce",
        "system resilience",
        "quality of care",
        "care delivery"
      ],
      why: "研究衛生系統能力、醫療服務可及性、基層醫療與服務品質。"
    },
    {
      id: "maternal-child",
      label: "婦幼健康與生命歷程",
      terms: [
        "maternal health",
        "child health",
        "adolescent health",
        "pregnancy",
        "birth outcome",
        "early life",
        "breastfeeding",
        "child development",
        "reproductive health"
      ],
      why: "關注孕產婦、兒童、青少年與生命早期健康風險。"
    },
    {
      id: "nutrition-food",
      label: "營養、食品系統與食品安全",
      terms: [
        "nutrition",
        "food security",
        "food safety",
        "dietary",
        "ultra-processed food",
        "malnutrition",
        "obesity",
        "food environment",
        "sugar-sweetened beverage"
      ],
      why: "涉及膳食行為、食品安全、食物環境、營養不良與肥胖防控。"
    },
    {
      id: "aging-longterm-care",
      label: "老齡化、失智與長期照護",
      terms: [
        "aging",
        "healthy aging",
        "older adults",
        "dementia",
        "frailty",
        "long-term care",
        "caregiving",
        "social isolation",
        "age-friendly"
      ],
      why: "聚焦人口老齡化、長期照護、失智、衰弱與老年友善社區。"
    }
  ];

  const state = {
    selectedBranchId: "public-health-general",
    lastWorks: [],
    lastHotspots: [],
    lastBranchSummaries: []
  };

  const branchTabsEl = document.getElementById("branchTabs");
  const runBtn = document.getElementById("runBtn");
  const allBtn = document.getElementById("allBtn");
  const statusBox = document.getElementById("statusBox");

  const resultTitle = document.getElementById("resultTitle");
  const resultLead = document.getElementById("resultLead");

  const metricWorks = document.getElementById("metricWorks");
  const metricHotspots = document.getElementById("metricHotspots");
  const metricLatestYear = document.getElementById("metricLatestYear");
  const metricTopBranch = document.getElementById("metricTopBranch");

  const hotspotList = document.getElementById("hotspotList");
  const paperList = document.getElementById("paperList");
  const branchSummary = document.getElementById("branchSummary");
  const ideaList = document.getElementById("ideaList");

  const yearRangeEl = document.getElementById("yearRange");
  const sortModeEl = document.getElementById("sortMode");
  const customQueryEl = document.getElementById("customQuery");
  const apiKeyInputEl = document.getElementById("apiKeyInput");

  function init() {
    if (!branchTabsEl || !runBtn || !allBtn) {
      console.warn("Public health trends page elements not found.");
      return;
    }

    renderBranchTabs();
    restoreApiKey();
    renderEmptyState();

    runBtn.addEventListener("click", runSelectedBranch);
    allBtn.addEventListener("click", runAllBranches);

    if (apiKeyInputEl) {
      apiKeyInputEl.addEventListener("change", function () {
        const value = apiKeyInputEl.value.trim();

        if (value) {
          localStorage.setItem("openalex_api_key", value);
        } else {
          localStorage.removeItem("openalex_api_key");
        }
      });
    }
  }

  function restoreApiKey() {
    if (!apiKeyInputEl) return;

    const stored = localStorage.getItem("openalex_api_key");

    if (stored) {
      apiKeyInputEl.value = stored;
    }
  }

  function renderBranchTabs() {
    branchTabsEl.innerHTML = branches.map(function (branch) {
      const active = branch.id === state.selectedBranchId ? "active" : "";

      return `
        <button class="branch-tab ${active}" type="button" data-branch="${escapeHtml(branch.id)}">
          ${escapeHtml(branch.title)}
          <span>${escapeHtml(branch.subtitle)}</span>
        </button>
      `;
    }).join("");

    branchTabsEl.querySelectorAll(".branch-tab").forEach(function (button) {
      button.addEventListener("click", function () {
        state.selectedBranchId = button.dataset.branch;
        renderBranchTabs();
      });
    });
  }

  async function runSelectedBranch() {
    const branch = branches.find(function (item) {
      return item.id === state.selectedBranchId;
    });

    if (!branch) return;

    const apiKeyMessage = validateApiAccess();
    if (apiKeyMessage) {
      setStatus(apiKeyMessage, "warning");
      return;
    }

    setLoading(`正在檢索「${branch.title}」近年文獻……`);

    try {
      const works = await fetchWorksForBranch(branch);
      const enrichedWorks = enrichWorks(works, branch);
      const hotspots = rankHotspots(enrichedWorks);
      const ideas = generateIdeas(hotspots, branch);
      const summary = summarizeBranch(branch, enrichedWorks, hotspots);

      state.lastWorks = enrichedWorks;
      state.lastHotspots = hotspots;
      state.lastBranchSummaries = [summary];

      renderResults({
        title: branch.title,
        lead: `以下結果基於「${branch.title}」分支的即時檢索。熱點分數由關鍵詞命中、發表時間與引用情況共同估算。`,
        works: enrichedWorks,
        hotspots: hotspots,
        ideas: ideas,
        branchSummaries: [summary]
      });

      setStatus(`已完成檢索：共獲取 ${enrichedWorks.length} 條相關文獻記錄。`, "normal");
    } catch (error) {
      console.error(error);
      setStatus(getFriendlyError(error), "warning");
    }
  }

  async function runAllBranches() {
    const apiKeyMessage = validateApiAccess();
    if (apiKeyMessage) {
      setStatus(apiKeyMessage, "warning");
      return;
    }

    setLoading("正在逐一檢索全部公共衛生分支……");

    const allWorks = [];
    const summaries = [];

    try {
      for (const branch of branches) {
        setLoading(`正在檢索：${branch.title}……`);

        const works = await fetchWorksForBranch(branch);
        const enrichedWorks = enrichWorks(works, branch);
        const hotspots = rankHotspots(enrichedWorks);
        const summary = summarizeBranch(branch, enrichedWorks, hotspots);

        allWorks.push(...enrichedWorks);
        summaries.push(summary);

        await sleep(180);
      }

      const dedupedWorks = dedupeWorks(allWorks);
      const hotspots = rankHotspots(dedupedWorks);

      const topBranch = summaries
        .slice()
        .sort(function (a, b) {
          return b.totalScore - a.totalScore;
        })[0];

      const ideas = generateIdeas(hotspots, {
        title: "公共衛生整體",
        short: topBranch ? topBranch.branchShort : "總覽"
      });

      state.lastWorks = dedupedWorks;
      state.lastHotspots = hotspots;
      state.lastBranchSummaries = summaries;

      renderResults({
        title: "公共衛生整體熱點掃描",
        lead: "以下結果綜合流行病學、健康政策、全球健康、環境健康、慢病、心理健康、健康公平、數字健康、婦幼健康、營養與老齡化等分支生成。",
        works: dedupedWorks,
        hotspots: hotspots,
        ideas: ideas,
        branchSummaries: summaries
      });

      setStatus(`全部分支檢索完成：去重後共 ${dedupedWorks.length} 條文獻記錄。`, "normal");
    } catch (error) {
      console.error(error);
      setStatus(getFriendlyError(error), "warning");
    }
  }

  function validateApiAccess() {
    if (OPENALEX_PROXY_URL) return "";

    const userKey = apiKeyInputEl ? apiKeyInputEl.value.trim() : "";
    const key = userKey || OPENALEX_API_KEY;

    if (!key) {
      return "請先輸入 OpenAlex API Key，或在 JS 中配置 OPENALEX_PROXY_URL 後端代理地址。";
    }

    return "";
  }

  async function fetchWorksForBranch(branch) {
    const years = Number(yearRangeEl.value || 2);
    const currentYear = new Date().getFullYear();
    const fromYear = currentYear - years + 1;

    const fromDate = `${fromYear}-01-01`;
    const toDate = todayDateString();

    const customQuery = customQueryEl ? customQueryEl.value.trim() : "";
    const query = customQuery ? `${branch.query} ${customQuery}` : branch.query;

    const params = new URLSearchParams();

    params.set("search", query);
    params.set("per_page", String(DEFAULT_PER_PAGE));

    params.set("filter", [
      `from_publication_date:${fromDate}`,
      `to_publication_date:${toDate}`,
      "type:article",
      "is_retracted:false"
    ].join(","));

    params.set("select", [
      "id",
      "display_name",
      "publication_year",
      "publication_date",
      "doi",
      "cited_by_count",
      "primary_location",
      "authorships",
      "topics",
      "keywords",
      "abstract_inverted_index"
    ].join(","));

    const sortMode = sortModeEl ? sortModeEl.value : "relevance";

    if (sortMode === "date") {
      params.set("sort", "publication_date:desc");
    } else if (sortMode === "citation") {
      params.set("sort", "cited_by_count:desc");
    } else {
      params.set("sort", "cited_by_count:desc");
    }

    let url;

    if (OPENALEX_PROXY_URL) {
      url = `${OPENALEX_PROXY_URL}?${params.toString()}`;
    } else {
      const userKey = apiKeyInputEl ? apiKeyInputEl.value.trim() : "";
      const key = userKey || OPENALEX_API_KEY;

      params.set("api_key", key);
      url = `${OPENALEX_BASE}?${params.toString()}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`OpenAlex request failed: ${response.status}`);
    }

    const data = await response.json();

    return Array.isArray(data.results) ? data.results : [];
  }

  function enrichWorks(works, branch) {
    return works.map(function (work) {
      const title = work.display_name || "Untitled work";
      const abstractText = abstractFromInvertedIndex(work.abstract_inverted_index);
      const topics = Array.isArray(work.topics) ? work.topics : [];
      const keywords = Array.isArray(work.keywords) ? work.keywords : [];
      const sourceName = getSourceName(work);
      const authors = getAuthors(work);

      const link = work.doi
        ? `https://doi.org/${String(work.doi).replace(/^https:\/\/doi.org\//, "")}`
        : work.id;

      const searchableText = [
        title,
        abstractText,
        topics.map(function (item) {
          return item.display_name || "";
        }).join(" "),
        keywords.map(function (item) {
          return item.display_name || item.keyword || "";
        }).join(" ")
      ].join(" ").toLowerCase();

      return {
        id: work.id,
        title: title,
        abstractText: abstractText,
        year: work.publication_year || "",
        date: work.publication_date || "",
        citations: Number(work.cited_by_count || 0),
        topics: topics,
        keywords: keywords,
        sourceName: sourceName,
        authors: authors,
        link: link,
        branchId: branch.id,
        branchTitle: branch.title,
        branchShort: branch.short,
        searchableText: searchableText,
        relevanceScore: calculateWorkScore(work, searchableText)
      };
    }).sort(function (a, b) {
      const sortMode = sortModeEl ? sortModeEl.value : "relevance";

      if (sortMode === "date") {
        return String(b.date).localeCompare(String(a.date));
      }

      if (sortMode === "citation") {
        return b.citations - a.citations;
      }

      return b.relevanceScore - a.relevanceScore;
    });
  }

  function calculateWorkScore(work, text) {
    const currentYear = new Date().getFullYear();
    const year = Number(work.publication_year || currentYear);

    const recency = Math.max(0, 6 - Math.max(0, currentYear - year));
    const citationScore = Math.log1p(Number(work.cited_by_count || 0));

    let keywordScore = 0;

    hotspotTerms.forEach(function (hotspot) {
      hotspot.terms.forEach(function (term) {
        if (text.includes(term.toLowerCase())) {
          keywordScore += 1.8;
        }
      });
    });

    return recency * 2 + citationScore * 1.4 + keywordScore;
  }

  function rankHotspots(works) {
    const ranked = hotspotTerms.map(function (hotspot) {
      let score = 0;
      let matchedWorks = 0;
      let citationSum = 0;
      let latestYear = 0;

      const matchedTerms = new Set();
      const examplePapers = [];

      works.forEach(function (work) {
        let localHits = 0;

        hotspot.terms.forEach(function (term) {
          const normalized = term.toLowerCase();

          if (work.searchableText.includes(normalized)) {
            localHits += 1;
            matchedTerms.add(term);
          }
        });

        if (localHits > 0) {
          matchedWorks += 1;
          citationSum += work.citations;
          latestYear = Math.max(latestYear, Number(work.year || 0));

          const currentYear = new Date().getFullYear();
          const recencyBoost = Math.max(
            0,
            5 - Math.max(0, currentYear - Number(work.year || currentYear))
          );

          score += localHits * 8 + Math.log1p(work.citations) * 1.2 + recencyBoost;

          if (examplePapers.length < 3) {
            examplePapers.push(work);
          }
        }
      });

      return {
        id: hotspot.id,
        label: hotspot.label,
        why: hotspot.why,
        score: Number(score.toFixed(1)),
        matchedWorks: matchedWorks,
        citationSum: citationSum,
        latestYear: latestYear || "—",
        matchedTerms: Array.from(matchedTerms).slice(0, 8),
        examplePapers: examplePapers
      };
    });

    return ranked
      .filter(function (item) {
        return item.score > 0 && item.matchedWorks > 0;
      })
      .sort(function (a, b) {
        return b.score - a.score;
      })
      .slice(0, 8);
  }

  function summarizeBranch(branch, works, hotspots) {
    const totalScore = hotspots.reduce(function (sum, item) {
      return sum + item.score;
    }, 0);

    const topHotspot = hotspots[0];

    return {
      branchId: branch.id,
      branchTitle: branch.title,
      branchShort: branch.short,
      worksCount: works.length,
      totalScore: Number(totalScore.toFixed(1)),
      topHotspot: topHotspot ? topHotspot.label : "暫無明顯熱點",
      latestYear: getLatestYear(works)
    };
  }

  function generateIdeas(hotspots, branch) {
    if (!hotspots.length) {
      return [
        {
          title: "暫無足夠資料生成選題",
          text: "可以擴大檢索年限、切換其他分支，或加入更寬泛的英文關鍵詞後重新檢索。"
        }
      ];
    }

    return hotspots.slice(0, 4).map(function (hotspot, index) {
      const questionTemplates = [
        `在${branch.title}中，${hotspot.label}如何改變人群健康風險識別與干預策略？`,
        `${hotspot.label}是否會重塑公共衛生服務、政策制定與資源分配方式？`,
        `不同年齡、地區、社會經濟地位或文化背景下，${hotspot.label}的影響是否存在差異？`,
        `${hotspot.label}如何與健康公平、數字化轉型、氣候變化或慢病防控形成交叉研究機會？`
      ];

      return {
        title: `選題建議 ${index + 1}：${hotspot.label}`,
        text: questionTemplates[index % questionTemplates.length]
      };
    });
  }

  function renderResults(payload) {
    resultTitle.textContent = payload.title;
    resultLead.textContent = payload.lead;

    metricWorks.textContent = String(payload.works.length);
    metricHotspots.textContent = String(payload.hotspots.length);
    metricLatestYear.textContent = String(getLatestYear(payload.works) || "—");
    metricTopBranch.textContent = getTopBranchLabel(payload.branchSummaries);

    renderHotspots(payload.hotspots);
    renderIdeas(payload.ideas);
    renderPapers(payload.works.slice(0, 10));
    renderBranchSummary(payload.branchSummaries);
  }

  function renderHotspots(hotspots) {
    if (!hotspots.length) {
      hotspotList.innerHTML = emptyCard(
        "暫無明顯熱點",
        "請嘗試擴大時間範圍，或加入更寬泛的英文關鍵詞。"
      );
      return;
    }

    hotspotList.innerHTML = hotspots.map(function (hotspot) {
      const terms = hotspot.matchedTerms.length
        ? hotspot.matchedTerms.map(function (term) {
            return `<span class="tag">${escapeHtml(term)}</span>`;
          }).join("")
        : `<span class="tag">No keyword listed</span>`;

      const examples = hotspot.examplePapers.map(function (paper) {
        return `<span class="tag">${escapeHtml(String(paper.year || "—"))} · ${escapeHtml(truncate(paper.title, 46))}</span>`;
      }).join("");

      return `
        <article class="hotspot-card">
          <div class="hotspot-top">
            <div>
              <h4>${escapeHtml(hotspot.label)}</h4>
              <p>${escapeHtml(hotspot.why)}</p>
            </div>
            <span class="score-pill">Score ${escapeHtml(String(hotspot.score))}</span>
          </div>

          <div class="tag-row">
            <span class="tag">${hotspot.matchedWorks} 篇命中文獻</span>
            <span class="tag">${hotspot.latestYear} 最新年份</span>
            <span class="tag">${hotspot.citationSum} 總引用</span>
          </div>

          <div class="tag-row">${terms}</div>
          <div class="tag-row">${examples}</div>
        </article>
      `;
    }).join("");
  }

  function renderIdeas(ideas) {
    ideaList.innerHTML = ideas.map(function (idea) {
      return `
        <div class="idea-box">
          <h4>${escapeHtml(idea.title)}</h4>
          <p>${escapeHtml(idea.text)}</p>
        </div>
      `;
    }).join("");
  }

  function renderPapers(works) {
    if (!works.length) {
      paperList.innerHTML = emptyCard(
        "暫無文獻",
        "請修改關鍵詞或擴大檢索年份後重試。"
      );
      return;
    }

    paperList.innerHTML = works.map(function (paper) {
      const abstractText = paper.abstractText
        ? truncate(paper.abstractText, 280)
        : "OpenAlex 暫未提供該文獻摘要。";

      const topicTags = paper.topics
        .slice(0, 3)
        .map(function (topic) {
          return `<span class="tag">${escapeHtml(topic.display_name || "Topic")}</span>`;
        }).join("");

      return `
        <article class="paper-card">
          <h4>
            <a href="${escapeAttr(paper.link)}" target="_blank" rel="noopener noreferrer">
              ${escapeHtml(paper.title)}
            </a>
          </h4>

          <div class="paper-meta">
            <span>${escapeHtml(String(paper.year || "—"))}</span>
            <span>·</span>
            <span>${escapeHtml(paper.sourceName || "Unknown source")}</span>
            <span>·</span>
            <span>${escapeHtml(String(paper.citations))} citations</span>
            <span>·</span>
            <span>${escapeHtml(paper.branchShort)}</span>
          </div>

          <p>${escapeHtml(abstractText)}</p>

          <div class="tag-row">${topicTags}</div>
        </article>
      `;
    }).join("");
  }

  function renderBranchSummary(summaries) {
    if (!summaries.length) {
      branchSummary.innerHTML = emptyCard(
        "暫無分支概覽",
        "完成檢索後會在此顯示不同公共衛生分支的熱度比較。"
      );
      return;
    }

    const sorted = summaries.slice().sort(function (a, b) {
      return b.totalScore - a.totalScore;
    });

    branchSummary.innerHTML = sorted.map(function (summary) {
      return `
        <article class="branch-card">
          <div class="hotspot-top">
            <div>
              <h4>${escapeHtml(summary.branchTitle)}</h4>
              <p>最突出熱點：${escapeHtml(summary.topHotspot)}</p>
            </div>
            <span class="score-pill">Score ${escapeHtml(String(summary.totalScore))}</span>
          </div>

          <div class="tag-row">
            <span class="tag">${summary.worksCount} 篇文獻</span>
            <span class="tag">${summary.latestYear || "—"} 最新年份</span>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderEmptyState() {
    metricWorks.textContent = "—";
    metricHotspots.textContent = "—";
    metricLatestYear.textContent = "—";
    metricTopBranch.textContent = "—";

    hotspotList.innerHTML = emptyCard(
      "等待檢索",
      "選擇分支後點擊「檢索熱點」。"
    );

    ideaList.innerHTML = emptyCard(
      "等待生成",
      "完成檢索後會自動生成研究選題建議。"
    );

    paperList.innerHTML = emptyCard(
      "等待文獻",
      "代表性文獻將在此顯示。"
    );

    branchSummary.innerHTML = emptyCard(
      "等待分析",
      "點擊「分析全部分支」可生成分支熱度概覽。"
    );
  }

  function emptyCard(title, text) {
    return `
      <article class="paper-card">
        <h4>${escapeHtml(title)}</h4>
        <p>${escapeHtml(text)}</p>
      </article>
    `;
  }

  function setLoading(message) {
    runBtn.disabled = true;
    allBtn.disabled = true;

    statusBox.textContent = message;
    statusBox.className = "status-box show";
  }

  function setStatus(message, type) {
    runBtn.disabled = false;
    allBtn.disabled = false;

    statusBox.textContent = message;
    statusBox.className = type === "warning"
      ? "status-box show warning"
      : "status-box show";
  }

  function getFriendlyError(error) {
    const message = String(error && error.message ? error.message : error);

    if (message.includes("401") || message.includes("403")) {
      return "OpenAlex 拒絕了本次請求。請檢查 API key，或改用後端代理轉發請求。";
    }

    if (message.includes("429")) {
      return "請求過於頻繁。請稍後再試，或減少一次性檢索的分支數量。";
    }

    return "即時檢索失敗。可能是網路、API key、瀏覽器 CORS 或 OpenAlex 服務限制導致。";
  }

  function abstractFromInvertedIndex(index) {
    if (!index || typeof index !== "object") return "";

    const words = [];

    Object.keys(index).forEach(function (word) {
      const positions = index[word];

      if (Array.isArray(positions)) {
        positions.forEach(function (position) {
          words[position] = word;
        });
      }
    });

    return words.filter(Boolean).join(" ");
  }

  function getSourceName(work) {
    const location = work.primary_location;

    if (
      location &&
      location.source &&
      location.source.display_name
    ) {
      return location.source.display_name;
    }

    return "Unknown source";
  }

  function getAuthors(work) {
    if (!Array.isArray(work.authorships)) return [];

    return work.authorships
      .slice(0, 4)
      .map(function (item) {
        return item.author && item.author.display_name
          ? item.author.display_name
          : "";
      })
      .filter(Boolean);
  }

  function getLatestYear(works) {
    return works.reduce(function (latest, work) {
      return Math.max(latest, Number(work.year || 0));
    }, 0);
  }

  function getTopBranchLabel(summaries) {
    if (!summaries || !summaries.length) return "—";

    const top = summaries.slice().sort(function (a, b) {
      return b.totalScore - a.totalScore;
    })[0];

    return top ? top.branchShort : "—";
  }

  function dedupeWorks(works) {
    const map = new Map();

    works.forEach(function (work) {
      const key = work.id || work.title;

      if (!map.has(key)) {
        map.set(key, work);
      }
    });

    return Array.from(map.values()).sort(function (a, b) {
      return b.relevanceScore - a.relevanceScore;
    });
  }

  function todayDateString() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  function truncate(text, length) {
    if (!text) return "";

    return text.length > length
      ? `${text.slice(0, length)}…`
      : text;
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
