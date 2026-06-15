/*
  Hospitality Research Trends Recommender
  款待學科學術熱點推薦器

  Data source:
  - OpenAlex Works API

  Notes:
  - 本工具會在瀏覽器中即時檢索 OpenAlex 公開學術資料。
  - 不需要後端也可以運行。
  - 正式部署時，如果你有 OpenAlex API key，建議用後端代理隱藏 key。
*/

(function () {
  "use strict";

  const OPENALEX_BASE = "https://api.openalex.org/works";

  /*
    可選：
    如果你申請了 OpenAlex API key，可以填在這裡。
    但如果網站公開部署，前端 JS 裡的 key 會被看到。
    更正式的做法是用 Cloudflare Worker / Vercel Function / Netlify Function 做後端代理。
  */
  const OPENALEX_API_KEY = "";

  /*
    OpenAlex 建議加 mailto，方便進入 polite pool。
    可以改成你的郵箱。
  */
  const CONTACT_EMAIL = "hughietao@utm.edu.mo";

  const DEFAULT_PER_PAGE = 25;

  const branches = [
    {
      id: "hospitality-general",
      title: "款待管理總覽",
      subtitle: "Hospitality Management",
      query: "hospitality management hotel restaurant tourism service experience",
      short: "總覽"
    },
    {
      id: "hotel",
      title: "酒店與住宿管理",
      subtitle: "Hotel & Lodging",
      query: "hotel management lodging accommodation hospitality revenue management hotel performance",
      short: "酒店"
    },
    {
      id: "tourism",
      title: "旅遊與目的地管理",
      subtitle: "Tourism & Destination",
      query: "tourism destination management tourist behavior smart tourism destination image",
      short: "旅遊"
    },
    {
      id: "foodservice",
      title: "餐飲與食品服務",
      subtitle: "Restaurant & Foodservice",
      query: "restaurant foodservice dining hospitality food waste food tourism service quality",
      short: "餐飲"
    },
    {
      id: "mice-events",
      title: "會展、節事與事件管理",
      subtitle: "MICE & Events",
      query: "MICE event management convention exhibition festival tourism hospitality",
      short: "會展"
    },
    {
      id: "digital-ai",
      title: "數字化、AI 與智慧服務",
      subtitle: "Digitalization & AI",
      query: "artificial intelligence hospitality tourism smart hotel service robot digital transformation ChatGPT",
      short: "AI"
    },
    {
      id: "sustainability",
      title: "可持續款待與 ESG",
      subtitle: "Sustainability & ESG",
      query: "sustainable hospitality sustainable tourism ESG climate change carbon green hotel circular economy",
      short: "ESG"
    },
    {
      id: "consumer",
      title: "消費者行為與體驗",
      subtitle: "Consumer Behavior",
      query: "hospitality consumer behavior tourist experience customer experience satisfaction loyalty online reviews",
      short: "體驗"
    },
    {
      id: "hrm",
      title: "人力資源與員工福祉",
      subtitle: "HRM & Well-being",
      query: "hospitality human resource employee wellbeing burnout turnover labor shortage emotional labor",
      short: "人力"
    },
    {
      id: "revenue",
      title: "收益管理與需求預測",
      subtitle: "Revenue Management",
      query: "hospitality revenue management dynamic pricing demand forecasting hotel occupancy pricing",
      short: "收益"
    }
  ];

  const hotspotTerms = [
    {
      id: "generative-ai",
      label: "生成式 AI 與智能服務",
      terms: [
        "generative ai",
        "chatgpt",
        "large language model",
        "artificial intelligence",
        "machine learning",
        "service robot",
        "robot",
        "automation",
        "smart hotel",
        "smart tourism",
        "digital transformation"
      ],
      why: "聚焦 AI、服務機器人與智能化工具如何改變款待服務、顧客互動與營運效率。"
    },
    {
      id: "sustainability-esg",
      label: "可持續發展與 ESG",
      terms: [
        "sustainability",
        "sustainable",
        "ESG",
        "carbon",
        "climate change",
        "green",
        "net zero",
        "circular economy",
        "corporate social responsibility",
        "food waste"
      ],
      why: "關注低碳、綠色酒店、食品浪費、ESG 治理與負責任旅遊。"
    },
    {
      id: "customer-experience",
      label: "顧客體驗與幸福感",
      terms: [
        "customer experience",
        "tourist experience",
        "memorable tourism",
        "experience economy",
        "well-being",
        "wellbeing",
        "emotion",
        "satisfaction",
        "loyalty",
        "value co-creation"
      ],
      why: "探索體驗品質、情緒、滿意度、忠誠度與主觀幸福感之間的關係。"
    },
    {
      id: "online-reviews",
      label: "線上評論、社交媒體與 eWOM",
      terms: [
        "online review",
        "user-generated content",
        "social media",
        "eWOM",
        "electronic word of mouth",
        "sentiment analysis",
        "influencer",
        "platform",
        "rating"
      ],
      why: "使用平台資料、評論文本與社交媒體內容理解消費者決策與品牌聲譽。"
    },
    {
      id: "employee-wellbeing",
      label: "員工福祉、短缺與組織韌性",
      terms: [
        "employee wellbeing",
        "employee well-being",
        "burnout",
        "turnover",
        "labor shortage",
        "human resource",
        "workforce",
        "emotional labor",
        "organizational resilience",
        "job satisfaction"
      ],
      why: "聚焦款待業人力短缺、工作壓力、離職傾向與服務組織韌性。"
    },
    {
      id: "risk-resilience",
      label: "危機、風險與韌性",
      terms: [
        "risk perception",
        "crisis",
        "resilience",
        "pandemic",
        "safety",
        "security",
        "recovery",
        "uncertainty",
        "disaster"
      ],
      why: "討論疫情後復甦、風險感知、安全信任與目的地 / 企業韌性。"
    },
    {
      id: "destination-management",
      label: "目的地治理與智慧目的地",
      terms: [
        "destination image",
        "destination management",
        "smart destination",
        "place attachment",
        "overtourism",
        "resident attitude",
        "destination competitiveness",
        "tourism governance"
      ],
      why: "面向旅遊目的地品牌、智慧治理、過度旅遊與居民態度。"
    },
    {
      id: "food-and-restaurant",
      label: "餐飲創新與食品系統",
      terms: [
        "food waste",
        "plant-based",
        "local food",
        "food tourism",
        "restaurant technology",
        "delivery",
        "menu",
        "dining experience",
        "food safety"
      ],
      why: "涵蓋餐飲技術、外送、地方食物、食品安全與可持續餐飲。"
    },
    {
      id: "events-mice",
      label: "會展、節事與體驗設計",
      terms: [
        "MICE",
        "event management",
        "event legacy",
        "mega event",
        "festival",
        "conference",
        "exhibition",
        "event experience",
        "event tourism"
      ],
      why: "關注會展活動、節事體驗、事件遺產與旅遊帶動效應。"
    },
    {
      id: "revenue-demand",
      label: "收益管理、定價與需求預測",
      terms: [
        "revenue management",
        "dynamic pricing",
        "demand forecasting",
        "occupancy",
        "pricing",
        "hotel performance",
        "RevPAR",
        "forecasting",
        "booking"
      ],
      why: "聚焦酒店價格策略、需求波動、收益管理與營運績效。"
    }
  ];

  const state = {
    selectedBranchId: "hospitality-general",
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
      console.warn("Hospitality trends page elements not found.");
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
    setLoading("正在逐一檢索全部款待學科分支……");

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
        title: "款待學科整體",
        short: topBranch ? topBranch.branchShort : "總覽"
      });

      state.lastWorks = dedupedWorks;
      state.lastHotspots = hotspots;
      state.lastBranchSummaries = summaries;

      renderResults({
        title: "款待學科整體熱點掃描",
        lead: "以下結果綜合酒店、旅遊、餐飲、會展、AI、ESG、消費者行為、人力資源與收益管理等分支生成。",
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

    const userKey = apiKeyInputEl ? apiKeyInputEl.value.trim() : "";
    const key = userKey || OPENALEX_API_KEY;

    if (key) {
      params.set("api_key", key);
    } else if (CONTACT_EMAIL) {
      params.set("mailto", CONTACT_EMAIL);
    }

    const url = `${OPENALEX_BASE}?${params.toString()}`;
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
        `在${branch.title}中，${hotspot.label}如何改變顧客體驗與服務品質？`,
        `${hotspot.label}是否會重塑${branch.title}的營運績效、組織能力與競爭優勢？`,
        `不同文化、世代或市場情境下，消費者如何感知${hotspot.label}相關創新？`,
        `${hotspot.label}如何與可持續發展、數字化轉型或員工福祉形成交叉研究機會？`
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
        "完成檢索後會在此顯示不同學科分支的熱度比較。"
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
