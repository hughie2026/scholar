<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>學術熱點推薦器 | Hughie's Online Lab</title>
  <link rel="stylesheet" href="assets/css/style.css">
  <link href="https://fonts.googleapis.com/css2?family=Encode+Sans:wght@300;400;500;600;700;800&family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet">

  <style>
    /* ============================================================
       Hero
       ============================================================ */
    .tool-hero { min-height: 480px; }
    .tool-hero .hero-lead { max-width: 780px; }
    .hero-discipline-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 22px 0 26px;
    }
    .hero-discipline-row span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border: 1px solid rgba(255,255,255,0.22);
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      color: rgba(255,255,255,0.86);
      backdrop-filter: blur(6px);
    }

    /* ============================================================
       Discovery Console（全寬步驟式控制台）
       ============================================================ */
    .console-section {
      background: linear-gradient(180deg, #f7f5ef 0%, #f1ede2 100%);
      padding: 70px 0 40px;
    }
    .console-shell {
      background: #ffffff;
      border: 1px solid rgba(16, 34, 53, 0.06);
      border-radius: 28px;
      box-shadow: 0 30px 90px rgba(15, 23, 42, 0.08);
      overflow: hidden;
    }
    .console-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      padding: 24px 32px;
      gap: 16px;
      border-bottom: 1px solid rgba(16, 34, 53, 0.05);
      background: linear-gradient(90deg, #fbfaf7 0%, #ffffff 100%);
    }
    .console-head .title-block .eyebrow { margin: 0 0 4px; }
    .console-head h2 {
      margin: 0;
      font-size: 22px;
      letter-spacing: -0.03em;
      color: #102235;
    }
    .console-head .head-meta {
      color: #5f6b75;
      font-size: 13px;
      max-width: 380px;
      line-height: 1.55;
    }

    .step-block {
      padding: 28px 32px;
      border-bottom: 1px solid rgba(16, 34, 53, 0.05);
    }
    .step-block:last-child { border-bottom: none; }
    .step-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 18px;
    }
    .step-number {
      width: 32px; height: 32px;
      display: grid; place-items: center;
      background: #102235;
      color: #ffffff;
      border-radius: 50%;
      font-family: "Encode Sans", sans-serif;
      font-weight: 800;
      font-size: 14px;
      letter-spacing: 0;
    }
    .step-title {
      font-family: "Encode Sans", sans-serif;
      font-weight: 800;
      color: #102235;
      font-size: 16px;
      letter-spacing: -0.01em;
    }
    .step-title small {
      display: inline-block;
      margin-left: 10px;
      font-weight: 600;
      color: #7d8790;
      font-size: 12px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    /* ---------- Step 1: Discipline cards ---------- */
    .discipline-grid {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 12px;
    }
    .discipline-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
      padding: 18px 16px;
      background: #fbfaf7;
      border: 1px solid rgba(16, 34, 53, 0.08);
      border-radius: 18px;
      cursor: pointer;
      text-align: left;
      transition: all 0.22s ease;
    }
    .discipline-card .icon {
      width: 38px; height: 38px;
      display: grid; place-items: center;
      background: #ffffff;
      border: 1px solid rgba(16, 34, 53, 0.08);
      border-radius: 11px;
      font-size: 20px;
      transition: all 0.22s ease;
    }
    .discipline-card .name {
      font-weight: 800;
      color: #102235;
      font-size: 14.5px;
      line-height: 1.3;
    }
    .discipline-card .name small {
      display: block;
      font-size: 11px;
      font-weight: 600;
      color: #7d8790;
      margin-top: 3px;
      letter-spacing: 0.04em;
    }
    .discipline-card:hover {
      border-color: rgba(201, 163, 90, 0.55);
      transform: translateY(-2px);
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
    }
    .discipline-card.active {
      background: linear-gradient(180deg, #ffffff 0%, #fbf4e4 100%);
      border-color: #c9a35a;
      box-shadow: 0 12px 30px rgba(201, 163, 90, 0.22);
    }
    .discipline-card.active .icon {
      background: #c9a35a;
      border-color: #c9a35a;
      color: #ffffff;
    }
    .discipline-card.active::after {
      content: '';
      position: absolute;
      top: 12px; right: 12px;
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #c9a35a;
    }

    /* ---------- Step 2: Sub-field chips ---------- */
    .subfield-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .chip {
      padding: 9px 16px;
      border: 1px solid rgba(16, 34, 53, 0.12);
      background: #ffffff;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
      color: #334155;
      cursor: pointer;
      transition: all 0.18s ease;
      letter-spacing: 0;
    }
    .chip:hover {
      border-color: rgba(201, 163, 90, 0.55);
      color: #102235;
      background: #fbf6e9;
    }
    .chip.active {
      background: #102235;
      color: #ffffff;
      border-color: #102235;
    }
    .chip.chip-all {
      border-style: dashed;
    }
    .chip.chip-all.active {
      background: #c9a35a;
      border-color: #c9a35a;
      color: #ffffff;
      border-style: solid;
    }

    /* ---------- Step 3: Filters ---------- */
    .filter-row {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 16px;
      align-items: end;
    }
    .filter-cell { grid-column: span 3; }
    .filter-cell.cell-textarea { grid-column: span 6; }
    .filter-cell.cell-actions {
      grid-column: span 12;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: flex-end;
      padding-top: 6px;
      border-top: 1px dashed rgba(16, 34, 53, 0.08);
      margin-top: 6px;
    }
    .filter-label {
      display: block;
      font-family: "Encode Sans", "Open Sans", sans-serif;
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #102235;
      font-weight: 800;
      margin-bottom: 8px;
    }
    .filter-input {
      width: 100%;
      border: 1px solid rgba(16, 34, 53, 0.14);
      background: #fbfaf7;
      color: #102235;
      border-radius: 12px;
      padding: 12px 14px;
      font: inherit;
      outline: none;
      transition: all 0.2s ease;
    }
    textarea.filter-input { min-height: 60px; resize: vertical; line-height: 1.6; }
    .filter-input:focus {
      border-color: #c9a35a;
      background: #ffffff;
      box-shadow: 0 0 0 4px rgba(201, 163, 90, 0.16);
    }
    .filter-hint {
      color: #7d8790;
      font-size: 12px;
      margin-top: 6px;
      line-height: 1.55;
    }

    .btn-reset {
      border: 1px solid rgba(16, 34, 53, 0.16);
      background: transparent;
      color: #102235;
      border-radius: 999px;
      padding: 12px 22px;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-reset:hover { background: rgba(16, 34, 53, 0.06); }
    .btn-gold[disabled],
    .btn-reset[disabled] { opacity: 0.55; cursor: not-allowed; }

    /* Status box */
    .status-box {
      display: none;
      margin: 0 32px 28px;
      border-radius: 14px;
      padding: 13px 16px;
      background: #fbfaf7;
      color: #5f6b75;
      border: 1px solid rgba(16, 34, 53, 0.08);
      font-size: 13.5px;
      line-height: 1.6;
    }
    .status-box.show { display: block; }
    .status-box.warning { background: #fff7e6; color: #8a5a11; border-color: rgba(201, 163, 90, 0.3); }
    .status-box.error { background: #fdecec; color: #9a2929; border-color: rgba(154, 41, 41, 0.25); }

    /* ============================================================
       Results
       ============================================================ */
    .results-section {
      background: #f7f5ef;
      padding: 24px 0 100px;
    }

    .results-headline {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 18px;
      margin: 24px 0 22px;
    }
    .results-headline h2 {
      margin: 0;
      color: #102235;
      font-size: 30px;
      letter-spacing: -0.04em;
    }
    .results-headline p {
      margin: 6px 0 0;
      color: #5f6b75;
      max-width: 640px;
      line-height: 1.65;
    }

    /* Metrics row */
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 32px;
    }
    .metric-card {
      background: #ffffff;
      border: 1px solid rgba(16, 34, 53, 0.06);
      border-radius: 18px;
      padding: 20px 22px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04);
    }
    .metric-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0;
      width: 36px; height: 3px;
      background: #c9a35a;
      border-radius: 0 0 4px 0;
    }
    .metric-label {
      color: #7d8790;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .metric-value {
      font-family: "Encode Sans", "Open Sans", sans-serif;
      color: #102235;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.04em;
      line-height: 1.1;
    }
    .metric-value small {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #7d8790;
      margin-top: 4px;
      letter-spacing: 0;
    }

    /* Result grid */
    .result-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
      gap: 22px;
      margin-bottom: 22px;
    }
    .module {
      background: #ffffff;
      border: 1px solid rgba(16, 34, 53, 0.06);
      border-radius: 22px;
      box-shadow: 0 18px 50px rgba(15, 23, 42, 0.06);
      padding: 26px 28px 28px;
    }
    .module + .module-fullwidth { margin-top: 0; }
    .module-fullwidth { margin-bottom: 22px; }

    .module-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 18px;
    }
    .module-title {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #102235;
      font-size: 19px;
      letter-spacing: -0.02em;
      font-weight: 800;
      margin: 0;
    }
    .module-title::before {
      content: '';
      display: inline-block;
      width: 4px; height: 18px;
      background: #c9a35a;
      border-radius: 2px;
    }
    .module-count {
      font-size: 12px;
      font-weight: 700;
      color: #7d8790;
      padding: 4px 10px;
      background: #fbfaf7;
      border-radius: 999px;
      border: 1px solid rgba(16, 34, 53, 0.06);
    }

    /* Hotspot Card */
    .hotspot-list { display: grid; gap: 12px; }
    .hotspot-card {
      background: #fbfaf7;
      border: 1px solid rgba(16, 34, 53, 0.06);
      border-radius: 16px;
      padding: 16px 18px;
      display: grid;
      grid-template-columns: 40px 1fr;
      gap: 14px;
      transition: all 0.2s ease;
    }
    .hotspot-card:hover {
      background: #ffffff;
      border-color: rgba(201, 163, 90, 0.45);
      transform: translateY(-2px);
      box-shadow: 0 14px 28px rgba(15, 23, 42, 0.07);
    }
    .hotspot-rank {
      font-family: "Encode Sans", sans-serif;
      font-size: 24px;
      font-weight: 800;
      color: #c9a35a;
      letter-spacing: -0.04em;
      line-height: 1;
    }
    .hotspot-body h4 {
      color: #102235;
      margin: 0 0 6px;
      font-size: 16px;
      line-height: 1.4;
    }
    .hotspot-body p {
      color: #5f6b75;
      margin: 0;
      font-size: 13.2px;
      line-height: 1.65;
    }
    .hotspot-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
      align-items: center;
    }
    .score-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 999px;
      padding: 4px 11px;
      background: linear-gradient(135deg, #f1eadc 0%, #e8dcb9 100%);
      color: #6b4a16;
      font-size: 11.5px;
      font-weight: 800;
    }
    .score-pill::before {
      content: '';
      width: 5px; height: 5px;
      background: #c9a35a;
      border-radius: 50%;
    }
    .tag {
      display: inline-flex;
      border-radius: 999px;
      padding: 4px 10px;
      background: #ffffff;
      color: #102235;
      font-size: 11.5px;
      font-weight: 700;
      border: 1px solid rgba(16, 34, 53, 0.08);
    }

    /* Idea Card */
    .idea-list { display: grid; gap: 12px; }
    .idea-card {
      background: linear-gradient(135deg, #102235 0%, #1a324b 100%);
      color: #ffffff;
      border-radius: 16px;
      padding: 18px 20px;
      position: relative;
      overflow: hidden;
    }
    .idea-card::before {
      content: '';
      position: absolute;
      top: -20px; right: -20px;
      width: 110px; height: 110px;
      background: radial-gradient(circle, rgba(201, 163, 90, 0.2) 0%, transparent 70%);
    }
    .idea-num {
      font-family: "Encode Sans", sans-serif;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.18em;
      color: #c9a35a;
      margin-bottom: 6px;
    }
    .idea-card h4 {
      margin: 0 0 6px;
      color: #ffffff;
      font-size: 15.5px;
      line-height: 1.4;
      position: relative;
    }
    .idea-card p {
      margin: 0;
      color: rgba(255, 255, 255, 0.78);
      line-height: 1.7;
      font-size: 13px;
      position: relative;
    }

    /* Paper Card */
    .paper-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .paper-card {
      background: #fbfaf7;
      border: 1px solid rgba(16, 34, 53, 0.06);
      border-radius: 16px;
      padding: 18px 20px;
      transition: all 0.2s ease;
    }
    .paper-card:hover {
      background: #ffffff;
      border-color: rgba(201, 163, 90, 0.4);
      transform: translateY(-2px);
      box-shadow: 0 14px 28px rgba(15, 23, 42, 0.07);
    }
    .paper-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      color: #7d8790;
      font-size: 11.5px;
      font-weight: 800;
      letter-spacing: 0.05em;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .paper-meta span + span::before {
      content: '·';
      margin: 0 6px;
      color: #c9a35a;
    }
    .paper-card h4 {
      color: #102235;
      margin: 0 0 8px;
      font-size: 15.5px;
      line-height: 1.45;
    }
    .paper-card a { color: #102235; text-decoration: none; transition: color 0.2s ease; }
    .paper-card a:hover { color: #c9a35a; }
    .paper-authors {
      color: #5f6b75;
      font-size: 12.5px;
      margin: 0 0 8px;
      font-style: italic;
    }
    .paper-card p {
      color: #5f6b75;
      margin: 0;
      line-height: 1.65;
      font-size: 13px;
    }

    /* Branch Summary Card */
    .branch-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
    .branch-card {
      background: #fbfaf7;
      border: 1px solid rgba(16, 34, 53, 0.06);
      border-radius: 16px;
      padding: 18px 20px;
      transition: all 0.2s ease;
    }
    .branch-card:hover {
      background: #ffffff;
      border-color: rgba(201, 163, 90, 0.4);
    }
    .branch-card-head {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .branch-card-head .icon {
      width: 36px; height: 36px;
      display: grid; place-items: center;
      background: #ffffff;
      border: 1px solid rgba(16, 34, 53, 0.06);
      border-radius: 10px;
      font-size: 18px;
    }
    .branch-card h4 { margin: 0; color: #102235; font-size: 14.5px; }
    .branch-card h4 small {
      display: block;
      font-size: 11px;
      font-weight: 600;
      color: #7d8790;
      letter-spacing: 0.04em;
    }
    .branch-card p { color: #5f6b75; margin: 0 0 10px; font-size: 12.5px; line-height: 1.6; }
    .branch-bar {
      width: 100%;
      height: 6px;
      background: #f1ede2;
      border-radius: 999px;
      overflow: hidden;
    }
    .branch-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #c9a35a 0%, #e8c884 100%);
      border-radius: 999px;
      transition: width 0.6s ease;
    }
    .branch-stat {
      display: flex;
      justify-content: space-between;
      font-size: 11.5px;
      color: #7d8790;
      margin-top: 6px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    /* Skeleton */
    .skeleton {
      background: linear-gradient(90deg, #f1ede2 0%, #f7f5ef 50%, #f1ede2 100%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
      border-radius: 10px;
    }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .skeleton-card {
      background: #fbfaf7;
      border: 1px solid rgba(16, 34, 53, 0.06);
      border-radius: 16px;
      padding: 18px;
    }
    .skeleton-line { height: 13px; margin-bottom: 10px; }
    .skeleton-line.w-50 { width: 50%; }
    .skeleton-line.w-80 { width: 80%; }
    .skeleton-line.w-30 { width: 30%; }

    .fade-in { animation: fadeIn 0.45s ease; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .empty-hint {
      color: #9aa3ac;
      font-size: 13.5px;
      padding: 22px 0;
      text-align: center;
    }

    /* Method */
    .method-section { background: #ffffff; padding: 90px 0; }
    .method-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 22px;
    }
    .info-card {
      background: #ffffff;
      border: 1px solid rgba(16, 34, 53, 0.08);
      border-radius: 22px;
      padding: 28px;
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.06);
      transition: transform 0.25s ease;
    }
    .info-card:hover { transform: translateY(-4px); }
    .info-card .value-num {
      color: #c9a35a;
      font-family: "Encode Sans", sans-serif;
      font-weight: 800;
      font-size: 14px;
      letter-spacing: 0.12em;
    }
    .info-card h4 { color: #102235; margin: 10px 0 12px; font-size: 20px; }
    .info-card p { color: #5f6b75; line-height: 1.7; margin: 0; }

    /* Responsive */
    @media (max-width: 1080px) {
      .discipline-grid { grid-template-columns: repeat(3, 1fr); }
      .filter-cell { grid-column: span 6; }
      .filter-cell.cell-textarea { grid-column: span 12; }
      .result-grid { grid-template-columns: 1fr; }
      .metrics-row { grid-template-columns: repeat(2, 1fr); }
      .paper-list { grid-template-columns: 1fr; }
      .branch-list { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 680px) {
      .discipline-grid { grid-template-columns: repeat(2, 1fr); }
      .metrics-row { grid-template-columns: 1fr; }
      .branch-list { grid-template-columns: 1fr; }
      .console-head, .step-block { padding-left: 22px; padding-right: 22px; }
      .module { padding: 22px; }
    }
  </style>
</head>
<body>

  <!-- Utility Bar -->
  <div class="utility-bar">
    <div class="container utility-inner">
      <span>HUGHIE'S ONLINE LAB</span>
    </div>
  </div>

  <!-- Main Header -->
  <header class="main-header">
    <div class="container header-inner">
      <a href="index.html" class="brand">
        <div class="brand-w">H</div>
        <div class="brand-text">
          <span class="brand-line1">Hughie's</span>
          <span class="brand-line2">Online Laboratory</span>
        </div>
      </a>
      <nav class="primary-nav">
        <a href="index.html#modules">Tools</a>
        <a href="#method">Method</a>
        <a href="#contact">Contact</a>
      </nav>
    </div>
  </header>

  <!-- Hero -->
  <section class="hero tool-hero">
    <div class="hero-bg"></div>
    <div class="container hero-inner">
      <div class="hero-content">
        <div class="hero-eyebrow">Multi-discipline · Sub-fields · Real-time Retrieval</div>
        <h1>學術熱點<br><span class="hero-highlight">推薦器</span></h1>
        <p class="hero-lead">
          覆蓋六大一級學科與其下細分研究方向，基於公開學術資料庫實時掃描近期熱門主題、
          高頻關鍵詞與代表性文獻，幫助研究者快速形成選題靈感與文獻追蹤線索。
        </p>
        <div class="hero-discipline-row">
          <span>🏥 公共衛生</span>
          <span>💊 健康管理</span>
          <span>🏨 款待科學</span>
          <span>🎪 會展管理</span>
          <span>🥗 食品與營養</span>
          <span>✈️ 旅遊科學</span>
        </div>
        <div class="hero-actions">
          <a href="#trendTool" class="btn-gold">Start Discovery</a>
          <a href="#method" class="btn-ghost">Read Method →</a>
        </div>
      </div>
    </div>
  </section>

  <!-- Discovery Console -->
  <section id="trendTool" class="console-section">
    <div class="container">
      <div class="console-shell">
        <div class="console-head">
          <div class="title-block">
            <div class="eyebrow">DISCOVERY CONSOLE</div>
            <h2>三步定位你的研究熱點</h2>
          </div>
          <div class="head-meta">
            選擇一級學科與二級分支，加上時間窗與排序，系統會即時返回主題、文獻與選題建議。
          </div>
        </div>

        <!-- Step 1 -->
        <div class="step-block">
          <div class="step-header">
            <div class="step-number">1</div>
            <div class="step-title">選擇一級學科 <small>Discipline</small></div>
          </div>
          <div id="disciplineGrid" class="discipline-grid"></div>
        </div>

        <!-- Step 2 -->
        <div class="step-block">
          <div class="step-header">
            <div class="step-number">2</div>
            <div class="step-title">選擇二級分支 <small>Sub-field</small></div>
          </div>
          <div id="subfieldRow" class="subfield-row"></div>
        </div>

        <!-- Step 3 -->
        <div class="step-block">
          <div class="step-header">
            <div class="step-number">3</div>
            <div class="step-title">設定篩選與檢索 <small>Filters & Run</small></div>
          </div>

          <div class="filter-row">
            <div class="filter-cell">
              <label class="filter-label" for="yearRange">時間範圍</label>
              <select id="yearRange" class="filter-input">
                <option value="1">近 1 年</option>
                <option value="2" selected>近 2 年</option>
                <option value="3">近 3 年</option>
                <option value="5">近 5 年</option>
              </select>
            </div>

            <div class="filter-cell">
              <label class="filter-label" for="sortMode">排序方式</label>
              <select id="sortMode" class="filter-input">
                <option value="relevance" selected>綜合熱度</option>
                <option value="date">最新發表</option>
                <option value="citation">被引次數</option>
              </select>
            </div>

            <div class="filter-cell cell-textarea">
              <label class="filter-label" for="customQuery">補充關鍵詞（選填）</label>
              <textarea id="customQuery" class="filter-input" placeholder="例：AI service robot · sustainability · customer experience"></textarea>
              <div class="filter-hint">英文關鍵詞會獲得更穩定的檢索結果。</div>
            </div>

            <div class="filter-cell cell-actions">
              <button id="allBtn" class="btn-reset" type="button">分析全部一級學科</button>
              <button id="runBtn" class="btn-gold" type="button">檢索熱點 →</button>
            </div>
          </div>
        </div>

        <div id="statusBox" class="status-box"></div>
      </div>
    </div>
  </section>

  <!-- Results -->
  <main class="results-section">
    <div class="container">
      <div class="results-headline">
        <div>
          <div class="eyebrow">REAL-TIME RESULTS</div>
          <h2 id="resultTitle">等待檢索。</h2>
          <p id="resultLead">請於上方控制台選擇一級學科與二級分支，並點擊「檢索熱點」以查看結果。</p>
        </div>
      </div>

      <!-- Metrics -->
      <div class="metrics-row">
        <div class="metric-card">
          <div class="metric-label">Retrieved Works</div>
          <div id="metricWorks" class="metric-value">—</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Hotspots</div>
          <div id="metricHotspots" class="metric-value">—</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Median Year</div>
          <div id="metricLatestYear" class="metric-value">—</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Active Field</div>
          <div id="metricTopBranch" class="metric-value">—</div>
        </div>
      </div>

      <!-- Hotspots + Ideas -->
      <div class="result-grid">
        <div class="module">
          <div class="module-head">
            <h3 class="module-title">推薦學術熱點</h3>
            <span id="hotspotCount" class="module-count">—</span>
          </div>
          <div id="hotspotList" class="hotspot-list">
            <div class="empty-hint">熱點將會出現在這裡。</div>
          </div>
        </div>

        <div class="module">
          <div class="module-head">
            <h3 class="module-title">可延伸的研究選題</h3>
            <span id="ideaCount" class="module-count">—</span>
          </div>
          <div id="ideaList" class="idea-list">
            <div class="empty-hint">研究選題建議將會出現在這裡。</div>
          </div>
        </div>
      </div>

      <!-- Papers -->
      <div class="module module-fullwidth">
        <div class="module-head">
          <h3 class="module-title">代表性近期文獻</h3>
          <span id="paperCount" class="module-count">—</span>
        </div>
        <div id="paperList" class="paper-list">
          <div class="empty-hint">文獻列表將會出現在這裡。</div>
        </div>
      </div>

      <!-- Branch Summary -->
      <div class="module module-fullwidth">
        <div class="module-head">
          <h3 class="module-title">一級學科熱度概覽</h3>
          <span id="branchCount" class="module-count">—</span>
        </div>
        <div id="branchSummary" class="branch-list">
          <div class="empty-hint">點擊「分析全部一級學科」可查看跨學科熱度比較。</div>
        </div>
      </div>
    </div>
  </main>

  <!-- Method -->
  <section id="method" class="method-section">
    <div class="container">
      <div class="section-head">
        <div class="eyebrow">METHOD</div>
        <h2>如何判斷「學術熱點」？</h2>
        <p class="section-sub">本工具不是替代系統綜述，而是用於快速掃描近期研究方向、形成選題靈感與追蹤文獻線索。</p>
      </div>

      <div class="method-grid">
        <div class="info-card">
          <div class="value-num">01</div>
          <h4>即時檢索</h4>
          <p>調用 OpenAlex Works API 查詢二級分支關鍵詞，限定近年發表，提取標題、年份、引用、主題與摘要等元數據。</p>
        </div>
        <div class="info-card">
          <div class="value-num">02</div>
          <h4>熱點計分</h4>
          <p>主題出現頻次、被引次數與發表年份按權重加總，再做歸一化，產生 0-100 的熱點分數。</p>
        </div>
        <div class="info-card">
          <div class="value-num">03</div>
          <h4>人工校讀</h4>
          <p>熱點推薦只能作為初篩。正式研究仍需閱讀全文、確認理論脈絡、研究缺口與資料可得性。</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Mission Banner -->
  <section class="mission-banner">
    <div class="container mission-inner">
      <div class="mission-quote">"</div>
      <p class="mission-text">
        A research hotspot is not only what is popular, but what is becoming intellectually consequential.
      </p>
      <div class="mission-by">— HUGHIE'S ONLINE LAB</div>
    </div>
  </section>

  <!-- Contact / Footer -->
  <footer id="contact" class="footer">
    <div class="container footer-top">
      <div class="footer-brand">
        <div class="brand">
          <div class="brand-w">H</div>
          <div class="brand-text">
            <span class="brand-line1">Hughie's</span>
            <span class="brand-line2">Online Laboratory</span>
          </div>
        </div>
        <p>An open research toolkit for everyone.</p>
      </div>

      <div class="footer-contact">
        <h5>Contact</h5>
        <div class="contact-item">
          <div class="contact-label">EMAIL</div>
          <a href="mailto:hughietao@utm.edu.mo">hughietao@utm.edu.mo</a>
        </div>
        <div class="contact-item">
          <div class="contact-label">OFFICE</div>
          <p>中國澳門特別行政區氹仔徐日昇寅公馬路<br>澳門旅遊大學　耀東樓 508C 辦公室</p>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="container footer-bottom-inner">
        <span>© 2025 Hughie's Online Lab</span>
        <span>All tools are for informational purposes only and do not constitute academic advice.</span>
      </div>
    </div>
  </footer>

  <script src="assets/js/hospitality-research-trends.js"></script>
</body>
</html>
