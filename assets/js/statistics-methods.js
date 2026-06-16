/* =========================================================
 * Statistical Method Selector
 * Hughie's Online Lab · 教學用途
 * ========================================================= */

(function () {
  'use strict';

  /* ---------- 狀態 ---------- */
  const TOTAL_STEPS = 4;
  let currentStep = 1;
  const answers = {};

  /* ---------- 方法庫 ---------- */
  const METHODS = {
    independent_t: {
      name: '獨立樣本 t 檢驗',
      en: 'Independent Samples t-test',
      summary: '比較兩組獨立樣本連續變量的均值差異，是最常用的雙樣本均值比較方法。',
      conditions: [
        '因變量為連續變量',
        '兩組樣本相互獨立（不同個體）',
        '希望比較兩組均值是否存在差異'
      ],
      assumptions: [
        '兩組數據近似服從正態分佈（小樣本尤其重要）',
        '兩組方差齊性（否則改用 Welch t 檢驗）',
        '觀測值之間相互獨立'
      ],
      report: '兩組均值（M ± SD）差異採用獨立樣本 t 檢驗：\nt(df) = 2.34, P = 0.021, 均值差 = 1.85, 95% CI [0.28, 3.42]，Cohen\'s d = 0.45。',
      pitfalls: [
        '小樣本且嚴重偏態時應改用 Mann-Whitney U 檢驗',
        '配對樣本誤用獨立 t 會低估配對效應',
        '方差不齊應使用 Welch t 而不是合併方差版本',
        '不要僅報告 P 值，建議同時報告效應量和置信區間'
      ],
      alts: ['Welch t 檢驗（方差不齊）', 'Mann-Whitney U（非正態）']
    },
    paired_t: {
      name: '配對樣本 t 檢驗',
      en: 'Paired Samples t-test',
      summary: '用於同一對象前後配對測量，或匹配設計下的兩組連續變量均值比較。',
      conditions: [
        '兩組測量為配對數據（前後、匹配對照、雙胞胎等）',
        '因變量為連續變量',
        '關注配對差值的均值是否為 0'
      ],
      assumptions: [
        '配對差值近似服從正態分佈',
        '配對之間相互獨立（不同對之間獨立）'
      ],
      report: '配對前後差值採用配對 t 檢驗：\nt(df) = 3.12, P = 0.004, 均值差 = 2.10, 95% CI [0.78, 3.42]，Cohen\'s dz = 0.62。',
      pitfalls: [
        '差值嚴重偏態時應改用 Wilcoxon 符號秩檢驗',
        '錯誤地把配對數據當成獨立樣本，會浪費配對信息',
        '配對缺失值處理需要謹慎（成對刪除）'
      ],
      alts: ['Wilcoxon 符號秩檢驗（差值非正態）']
    },
    mann_whitney: {
      name: 'Mann-Whitney U 檢驗',
      en: 'Mann-Whitney U / Wilcoxon Rank-Sum',
      summary: '兩組獨立樣本的非參數檢驗，比較兩組分佈位置（中位數）是否有差異。',
      conditions: [
        '因變量為連續或有序分類變量',
        '兩組樣本獨立',
        '不滿足正態性，或為小樣本偏態資料'
      ],
      assumptions: [
        '兩組樣本獨立',
        '兩組分佈形狀相似（嚴格意義上才能解釋為中位數比較）'
      ],
      report: '兩組數據採用 Mann-Whitney U 檢驗：\nU = 134.5, Z = -2.18, P = 0.029，中位數（IQR）：A 組 25 (20–32) vs B 組 31 (26–38)。',
      pitfalls: [
        '報告均值 ± SD 而忽略中位數和四分位距',
        '兩組分佈形狀差別很大時，不能簡單解釋為「中位數差異」',
        '樣本量充足且近似正態時，使用 t 檢驗效能更高'
      ],
      alts: ['Welch t（若可正態化）', '排列檢驗 Permutation test']
    },
    wilcoxon_signed: {
      name: 'Wilcoxon 符號秩檢驗',
      en: 'Wilcoxon Signed-Rank Test',
      summary: '配對樣本的非參數檢驗，用於差值不滿足正態分佈時的中位數差比較。',
      conditions: [
        '配對 / 重複測量數據',
        '差值不滿足正態分佈或為有序變量',
        '兩個時點 / 兩種處理'
      ],
      assumptions: [
        '差值對稱分佈（嚴格中位數解釋時）',
        '配對之間獨立'
      ],
      report: '前後配對差值採用 Wilcoxon 符號秩檢驗：\nZ = -2.41, P = 0.016，中位差 = 1.5 (IQR 0.5–3.0)。',
      pitfalls: [
        '誤用獨立樣本的 Mann-Whitney U',
        '存在大量平局（ties）時應使用平局校正',
        '小樣本時建議報告精確 P 值'
      ],
      alts: ['配對 t 檢驗（差值正態）', '符號檢驗（更弱假設）']
    },
    one_way_anova: {
      name: '單因素方差分析（One-way ANOVA）',
      en: 'One-way ANOVA',
      summary: '比較 3 組或更多獨立組的連續變量均值，判斷至少有一組與其他不同。',
      conditions: [
        '因變量為連續變量',
        '自變量為 3 個及以上水平的分類變量',
        '組間相互獨立'
      ],
      assumptions: [
        '各組近似正態分佈',
        '各組方差齊性（Levene 檢驗）',
        '觀測值獨立'
      ],
      report: '各組均值採用單因素方差分析：\nF(2, 87) = 5.62, P = 0.005, η² = 0.11；Bonferroni 事後檢驗顯示 A vs C 差異顯著（P = 0.003）。',
      pitfalls: [
        '只報告整體 F 顯著而不做事後比較',
        '直接做多次 t 檢驗導致一類錯誤膨脹',
        '方差不齊時應改用 Welch ANOVA',
        '事後比較需要校正多重比較（Bonferroni / Tukey HSD）'
      ],
      alts: ['Welch ANOVA（方差不齊）', 'Kruskal-Wallis（非正態）']
    },
    kruskal_wallis: {
      name: 'Kruskal-Wallis 檢驗',
      en: 'Kruskal-Wallis H Test',
      summary: 'ANOVA 的非參數版本，用於 3 組及以上獨立樣本，不要求正態。',
      conditions: [
        '因變量為連續或有序變量',
        '3 個及以上獨立組',
        '不滿足 ANOVA 的正態 / 方差齊性假設'
      ],
      assumptions: [
        '各組樣本獨立',
        '各組分佈形狀相似（嚴格中位數解釋）'
      ],
      report: '採用 Kruskal-Wallis 檢驗：\nH(2) = 9.34, P = 0.009；Dunn 事後檢驗（Bonferroni 校正）：A vs C P = 0.011。',
      pitfalls: [
        '不報告中位數和四分位距',
        '不做事後兩兩比較或不校正多重比較',
        '錯誤地將其用於配對重複測量數據（應用 Friedman）'
      ],
      alts: ['Welch ANOVA', 'Dunn 事後檢驗']
    },
    rm_anova: {
      name: '重複測量方差分析',
      en: 'Repeated Measures ANOVA',
      summary: '同一對象在多個時點 / 多種條件下的連續變量比較，控制個體間差異。',
      conditions: [
        '因變量為連續變量',
        '同一對象在 3 個及以上時點 / 條件下重複測量',
        '希望比較不同時點的均值差異'
      ],
      assumptions: [
        '球形假設（Sphericity，Mauchly 檢驗）',
        '殘差近似正態',
        '無嚴重缺失'
      ],
      report: '採用重複測量方差分析（Greenhouse–Geisser 校正）：\nF(1.74, 50.4) = 8.21, P = 0.001, η²p = 0.22。',
      pitfalls: [
        '違反球形假設時不做 GG / HF 校正',
        '存在缺失值仍用嚴格 RM ANOVA（建議改用混合線性模型）',
        '不報告事後配對比較'
      ],
      alts: ['線性混合模型 LMM（更靈活，可處理缺失）', 'Friedman 檢驗']
    },
    friedman: {
      name: 'Friedman 檢驗',
      en: "Friedman Test",
      summary: '重複測量 ANOVA 的非參數版本，用於同一對象多時點的有序 / 偏態連續變量。',
      conditions: [
        '同一對象在 3 個及以上時點測量',
        '因變量為有序或偏態連續變量'
      ],
      assumptions: [
        '配對之間獨立',
        '各時點分佈形狀相似'
      ],
      report: '採用 Friedman 檢驗：\nχ²(2) = 11.43, P = 0.003；Wilcoxon 配對事後比較（Bonferroni 校正）。',
      pitfalls: [
        '錯誤套用 Kruskal-Wallis（後者用於獨立樣本）',
        '不做事後配對比較',
        '小樣本下應報告精確 P 值'
      ],
      alts: ['線性混合模型', '重複測量 ANOVA（若可正態化）']
    },
    chi_square: {
      name: '卡方檢驗（Chi-square）',
      en: 'Chi-square Test of Independence',
      summary: '檢驗兩個分類變量之間是否獨立，常用於 R×C 列聯表。',
      conditions: [
        '兩個分類變量',
        '獨立樣本',
        '理論頻數 ≥ 5 的格子佔總數 80% 以上，且最小理論頻數 ≥ 1'
      ],
      assumptions: [
        '觀測值之間獨立',
        '足夠大的理論頻數',
        '非配對數據'
      ],
      report: '兩變量關聯採用 Pearson 卡方檢驗：\nχ²(1, N=200) = 6.42, P = 0.011, φ = 0.18 / Cramér\'s V = 0.18。',
      pitfalls: [
        '理論頻數過小應改用 Fisher 精確檢驗',
        '配對數據誤用普通卡方（應用 McNemar）',
        '2×2 表格不需做連續性校正時仍機械添加 Yates 校正',
        '不報告效應量（φ / Cramér\'s V）'
      ],
      alts: ['Fisher 精確檢驗（理論頻數小）', 'McNemar 檢驗（配對）']
    },
    fisher: {
      name: 'Fisher 精確檢驗',
      en: 'Fisher\'s Exact Test',
      summary: '小樣本或稀疏 2×2（也可擴展 R×C）列聯表的精確 P 值計算。',
      conditions: [
        '兩個分類變量',
        '獨立樣本',
        '樣本量小或存在理論頻數 < 5 的格子'
      ],
      assumptions: [
        '觀測獨立',
        '邊際合計可視為固定（嚴格 Fisher）'
      ],
      report: '採用 Fisher 精確檢驗（雙尾）：\nP = 0.024，OR = 4.13, 95% CI [1.18, 14.5]。',
      pitfalls: [
        '大樣本仍堅持用 Fisher 不必要地耗算力',
        '報告單尾 P 值未說明方向',
        '配對 2×2 應改用 McNemar'
      ],
      alts: ['卡方檢驗（樣本充足）', 'McNemar 檢驗（配對）']
    },
    mcnemar: {
      name: 'McNemar 檢驗',
      en: 'McNemar Test',
      summary: '配對二分類數據的差異檢驗，常用於診斷一致性、前後干預。',
      conditions: [
        '配對 / 重複測量',
        '結果為二分類（如陽性 / 陰性）'
      ],
      assumptions: [
        '配對之間獨立',
        '不一致格子（b、c）數量充足；過小時用精確版本'
      ],
      report: '配對二分類前後比較採用 McNemar 檢驗：\nχ²(1) = 5.14, P = 0.023（不一致對：b=18, c=6）。',
      pitfalls: [
        '誤用普通卡方破壞配對結構',
        '不一致格子很小卻不採用精確版本',
        '多時點時應改用 Cochran\'s Q'
      ],
      alts: ['McNemar 精確檢驗', 'Cochran\'s Q（≥ 3 時點）']
    },
    pearson: {
      name: 'Pearson 相關係數',
      en: 'Pearson Correlation',
      summary: '衡量兩個連續變量間線性相關的強度與方向，取值 -1 至 1。',
      conditions: [
        '兩個連續變量',
        '線性關係',
        '近似服從雙變量正態分佈'
      ],
      assumptions: [
        '線性關係',
        '雙變量正態',
        '無嚴重離群值'
      ],
      report: '兩變量採用 Pearson 相關分析：\nr = 0.42, 95% CI [0.21, 0.59], P < 0.001, n = 120。',
      pitfalls: [
        '存在曲線關係時，r ≈ 0 並不代表「無關係」',
        '離群值對 r 影響極大',
        '相關 ≠ 因果',
        '偏態數據強行使用 Pearson 易誤導'
      ],
      alts: ['Spearman 相關（非線性 / 非正態）']
    },
    spearman: {
      name: 'Spearman 等級相關',
      en: 'Spearman Rank Correlation',
      summary: '基於秩次的非參數相關，適用於有序變量或非線性單調關係。',
      conditions: [
        '兩個變量為連續或有序變量',
        '存在單調關係但不要求線性',
        '不滿足正態假設'
      ],
      assumptions: [
        '單調關係（同增 / 同減）',
        '可被秩次化處理'
      ],
      report: '採用 Spearman 等級相關：\nρ = 0.36, P = 0.002, n = 95。',
      pitfalls: [
        '與 Pearson 結論差異大時，需檢查線性與離群值',
        '存在大量平局時應使用平局校正',
        '相關 ≠ 因果'
      ],
      alts: ['Kendall\'s tau（小樣本）', 'Pearson（線性 + 正態）']
    },
    linear_regression: {
      name: '線性回歸',
      en: 'Linear Regression',
      summary: '用一個或多個自變量預測連續因變量，並估計各變量的回歸係數。',
      conditions: [
        '因變量為連續變量',
        '自變量為連續或分類（後者需設啞變量）',
        '存在線性關係'
      ],
      assumptions: [
        '線性（Linearity）',
        '殘差獨立',
        '殘差正態',
        '同方差性（Homoscedasticity）',
        '無嚴重多重共線性（VIF < 5–10）'
      ],
      report: '建立多元線性回歸模型：\nY = β₀ + β₁X₁ + β₂X₂ + ε；R² = 0.32，調整 R² = 0.30，F(2,117) = 27.4, P < 0.001。\n以 X₁ 為例：β = 0.45, 95% CI [0.21, 0.69], P < 0.001。',
      pitfalls: [
        '未檢查殘差圖即發布結果',
        '忽略多重共線性',
        '小樣本下加入過多自變量導致過擬合（建議事件數 / 自變量 ≥ 10–20）',
        '把回歸係數當成因果效應（需要研究設計支持）'
      ],
      alts: ['廣義線性模型 GLM', '穩健回歸（離群值多時）']
    },
    logistic_regression: {
      name: 'Logistic 回歸',
      en: 'Logistic Regression',
      summary: '預測二分類結局發生概率，並以優勢比（OR）解釋自變量影響。',
      conditions: [
        '因變量為二分類變量',
        '自變量為連續或分類',
        '事件數足夠（每個自變量建議至少 10 個事件）'
      ],
      assumptions: [
        '結局獨立',
        'logit 與連續自變量呈線性',
        '無嚴重多重共線性',
        '無完全分離（complete separation）'
      ],
      report: '採用多因素 Logistic 回歸：\n以 X₁ 為例：OR = 2.13, 95% CI [1.32, 3.45], P = 0.002；模型 Hosmer-Lemeshow P = 0.42，AUC = 0.78。',
      pitfalls: [
        '事件數過少導致估計不穩定',
        '忽略連續變量的線性 logit 假設',
        '把 OR 直接當成 RR（罕見結局時近似，常見結局時偏差大）',
        '存在完全分離時不調整模型'
      ],
      alts: ['Probit 回歸', '懲罰 Logistic 回歸（Firth）']
    },
    multinomial_logistic: {
      name: '多分類 Logistic 回歸',
      en: 'Multinomial Logistic Regression',
      summary: '結局為 3 類及以上的無序分類變量時的擴展 logistic 模型。',
      conditions: [
        '因變量為多分類無序變量',
        '存在參考類別',
        '樣本量充足（每類別都有足夠事件）'
      ],
      assumptions: [
        '獨立無關方案假設（IIA）',
        'logit 線性',
        '無嚴重共線性'
      ],
      report: '以 A 類為參考，報告各對比的 OR 與 95% CI：\nB vs A：OR = 1.85, 95% CI [1.10, 3.10], P = 0.020。',
      pitfalls: [
        '違反 IIA 假設時結果不穩健',
        '某些類別樣本過少',
        '結果解讀過於繁瑣，建議結合預測概率呈現'
      ],
      alts: ['有序 Logistic 回歸（若有序）', '判別分析']
    },
    ordinal_logistic: {
      name: '有序 Logistic 回歸',
      en: 'Ordinal (Proportional Odds) Logistic Regression',
      summary: '結局為有序分類變量時，估計類別累積概率對應的優勢比。',
      conditions: [
        '因變量為有序分類變量（≥ 3 類）',
        '希望解釋為「進入更高類別的優勢比」'
      ],
      assumptions: [
        '比例優勢假設（Proportional Odds）',
        'logit 線性',
        '無嚴重共線性'
      ],
      report: '採用比例優勢模型：\n以 X₁ 為例：OR = 1.72, 95% CI [1.18, 2.51], P = 0.005；比例優勢 Brant 檢驗 P = 0.21（不拒絕）。',
      pitfalls: [
        '違反比例優勢假設仍強行使用',
        '錯誤地當成多分類模型解讀',
        '小類別數據合併不謹慎'
      ],
      alts: ['多分類 Logistic 回歸', '部分比例優勢模型']
    },
    cox_regression: {
      name: 'Cox 比例風險回歸',
      en: 'Cox Proportional Hazards Regression',
      summary: '生存資料的多因素分析，估計各變量對風險率的影響（HR）。',
      conditions: [
        '結局為「事件發生時間 + 事件狀態」',
        '存在右側截尾',
        '希望同時納入多個協變量'
      ],
      assumptions: [
        '比例風險假設（PH）',
        '截尾與事件無關（無信息截尾）',
        '對連續變量有合適的函數形式（線性 / 樣條）'
      ],
      report: '採用 Cox 比例風險模型：\n以 X₁ 為例：HR = 1.62, 95% CI [1.21, 2.18], P = 0.001；PH 假設 Schoenfeld 殘差檢驗整體 P = 0.34。',
      pitfalls: [
        '違反 PH 假設仍直接報告 HR',
        '事件數不足卻納入過多協變量（建議每個自變量 ≥ 10 個事件）',
        '忽略時依協變量',
        '把 HR 解讀為「相對風險」時要謹慎'
      ],
      alts: ['含時依係數的 Cox 模型', '參數生存模型（AFT）', '競爭風險模型']
    },
    kaplan_meier: {
      name: 'Kaplan–Meier 生存曲線 + Log-rank 檢驗',
      en: 'Kaplan–Meier Curve with Log-rank Test',
      summary: '繪製生存曲線並用 Log-rank 檢驗比較不同組的生存差異。',
      conditions: [
        '結局為事件發生時間 + 截尾狀態',
        '比較 2 組或更多組的生存分佈',
        '不需要校正協變量（單因素層面）'
      ],
      assumptions: [
        '無信息截尾',
        '比例風險假設（Log-rank 在曲線交叉時效能下降）'
      ],
      report: '採用 Kaplan–Meier 法繪製生存曲線：\n中位生存時間 A 組 24 月（95% CI 19–29），B 組 16 月（95% CI 12–21）；Log-rank χ²(1) = 6.84, P = 0.009。',
      pitfalls: [
        '小樣本曲線尾部不穩定卻被過度解讀',
        '曲線交叉時 Log-rank 效能不足，建議改用 Wilcoxon-Gehan 或限制平均生存時間 RMST',
        '未報告風險表（number at risk）',
        '不校正混雜，需配合 Cox 回歸'
      ],
      alts: ['Cox 回歸（多因素）', 'Wilcoxon-Gehan 檢驗', 'RMST 比較']
    },
    roc_analysis: {
      name: 'ROC 曲線分析',
      en: 'Receiver Operating Characteristic (ROC) Analysis',
      summary: '評估連續/有序指標區分二分類結局（金標準）的能力，以 AUC 為核心指標。',
      conditions: [
        '存在連續或有序的待評估指標',
        '存在金標準二分類結局',
        '同時可估計靈敏度、特異度、最佳截斷值'
      ],
      assumptions: [
        '金標準分類可靠',
        '評估指標與結局獨立採集',
        '樣本能代表目標人群'
      ],
      report: 'ROC 分析：\nAUC = 0.83, 95% CI [0.77, 0.89], P < 0.001；以 Youden 指數確定最佳截斷值 32.5：靈敏度 78%, 特異度 81%。',
      pitfalls: [
        '僅報告 AUC 而忽略截斷值的靈敏度 / 特異度',
        '在訓練集上挑選截斷值再在同一集合報告效能（過擬合）',
        '兩條 ROC 比較未做 DeLong 檢驗',
        '陽性率極端時應同時報告 PPV / NPV'
      ],
      alts: ['DeLong 檢驗（兩條 ROC 比較）', 'Precision-Recall 曲線（類別不平衡）']
    },
    one_sample_t: {
      name: '單樣本 t 檢驗',
      en: 'One-sample t-test',
      summary: '檢驗單組樣本均值是否與某已知參考值（如歷史均值）存在差異。',
      conditions: [
        '單組連續變量',
        '存在已知的比較標準'
      ],
      assumptions: [
        '近似正態分佈',
        '觀測獨立'
      ],
      report: '採用單樣本 t 檢驗（與參考值 100 比較）：\nt(df) = 2.18, P = 0.034, 均值差 = 4.2, 95% CI [0.34, 8.06]。',
      pitfalls: [
        '小樣本偏態應改用 Wilcoxon 符號秩',
        '參考值來源未說明',
        '混淆「統計顯著」與「臨床意義」'
      ],
      alts: ['Wilcoxon 符號秩（單樣本版本）']
    },
    cochran_q: {
      name: "Cochran's Q 檢驗",
      en: "Cochran's Q Test",
      summary: '配對二分類在 ≥ 3 個時點 / 條件下的差異檢驗，是 McNemar 的擴展。',
      conditions: [
        '同一對象在 3 個及以上時點 / 條件下測量二分類結局'
      ],
      assumptions: [
        '配對之間獨立',
        '結局為二分類'
      ],
      report: "採用 Cochran's Q 檢驗：\nQ(2) = 8.22, P = 0.016；配對 McNemar 事後比較（Bonferroni 校正）。",
      pitfalls: [
        '誤用普通卡方破壞配對結構',
        '不做事後兩兩比較',
        '小樣本下應使用精確檢驗'
      ],
      alts: ['McNemar 檢驗（2 時點）', '廣義估計方程 GEE']
    },
    gee: {
      name: '廣義估計方程（GEE）',
      en: 'Generalized Estimating Equations',
      summary: '處理重複測量或集群數據的回歸方法，可用於連續、二分類等多種結局。',
      conditions: [
        '存在重複測量或集群結構',
        '結局類型多樣（連續、二分類、計數）',
        '關注「群體平均效應」而非個體軌跡'
      ],
      assumptions: [
        '工作相關矩陣選擇恰當（穩健標準誤對誤設不敏感）',
        '缺失機制為 MCAR 較理想'
      ],
      report: '採用 GEE 模型（可交換相關矩陣）：\n以 X₁ 為例：β = 0.32, 95% CI [0.10, 0.54], P = 0.004（穩健標準誤）。',
      pitfalls: [
        '工作相關矩陣選擇隨意，雖穩健但效率受損',
        '處理缺失資料時 MAR 假設下應慎用 GEE，建議混合模型',
        '個體層面變化解釋需用混合模型而非 GEE'
      ],
      alts: ['線性 / 廣義線性混合模型', '重複測量 ANOVA']
    },
    not_supported: {
      name: '需要進一步討論',
      en: 'Requires Expert Review',
      summary: '根據當前選項組合，沒有單一最優方法。建議先明確研究問題與設計，再與統計學家確認。',
      conditions: ['本工具僅覆蓋常見場景，複雜或邊界情形需要進一步信息'],
      assumptions: ['—'],
      report: '建議補充：研究設計圖、樣本量、變量編碼方式、缺失情況、混雜因素等。',
      pitfalls: ['不要強行套用最熟悉的方法', '勿忽略研究設計帶來的相關性結構'],
      alts: []
    }
  };

  /* ---------- 推薦邏輯 ---------- */
  function recommend(a) {
    const { purpose, dvType, ivType, groups, paired, normal, sampleSize } = a;
    const isNormal = normal === 'yes';
    const isSmall = sampleSize === 'small';

    /* 相關分析 */
    if (purpose === 'correlation') {
      if (isNormal && dvType !== 'ordinal') return 'pearson';
      return 'spearman';
    }

    /* 診斷效能 */
    if (purpose === 'diagnostic') return 'roc_analysis';

    /* 預測模型 */
    if (purpose === 'prediction') {
      if (dvType === 'continuous') return 'linear_regression';
      if (dvType === 'binary') return 'logistic_regression';
      if (dvType === 'multi_cat') return 'multinomial_logistic';
      if (dvType === 'ordinal') return 'ordinal_logistic';
      if (dvType === 'time') return 'cox_regression';
      return 'not_supported';
    }

    /* 生存分析 */
    if (purpose === 'survival') {
      if (ivType === 'continuous' || ivType === 'mixed') return 'cox_regression';
      if (groups === '3plus' || groups === '2') return 'kaplan_meier';
      return 'cox_regression';
    }

    /* 重複測量 */
    if (purpose === 'repeated') {
      if (dvType === 'continuous') {
        if (groups === '2') return isNormal ? 'paired_t' : 'wilcoxon_signed';
        return isNormal ? 'rm_anova' : 'friedman';
      }
      if (dvType === 'binary') {
        return groups === '2' ? 'mcnemar' : 'cochran_q';
      }
      if (dvType === 'ordinal') {
        return groups === '2' ? 'wilcoxon_signed' : 'friedman';
      }
      if (dvType === 'multi_cat') return 'gee';
      return 'gee';
    }

    /* 組間比較 */
    if (purpose === 'group_compare') {
      if (groups === '1') {
        if (dvType === 'continuous') return 'one_sample_t';
        return 'not_supported';
      }
      const isPaired = paired === 'yes';

      if (dvType === 'continuous') {
        if (groups === '2') {
          if (isPaired) return isNormal ? 'paired_t' : 'wilcoxon_signed';
          return isNormal ? 'independent_t' : 'mann_whitney';
        }
        if (groups === '3plus') {
          if (isPaired) return isNormal ? 'rm_anova' : 'friedman';
          return isNormal ? 'one_way_anova' : 'kruskal_wallis';
        }
      }

      if (dvType === 'ordinal') {
        if (groups === '2') return isPaired ? 'wilcoxon_signed' : 'mann_whitney';
        return isPaired ? 'friedman' : 'kruskal_wallis';
      }

      if (dvType === 'binary' || dvType === 'multi_cat') {
        if (isPaired) {
          if (dvType === 'binary') return groups === '2' ? 'mcnemar' : 'cochran_q';
          return 'gee';
        }
        // 獨立
        if (isSmall) return 'fisher';
        return 'chi_square';
      }

      if (dvType === 'time') return 'kaplan_meier';
    }

    return 'not_supported';
  }

  /* ---------- 步驟控制 ---------- */
  const stepEls = document.querySelectorAll('.form-step');
  const stepNavEls = document.querySelectorAll('.progress-steps .step');
  const progressFill = document.getElementById('progressFill');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');
  const resetBtn = document.getElementById('resetBtn');

  function showStep(n) {
    currentStep = n;
    stepEls.forEach(el => el.classList.toggle('active', +el.dataset.step === n));
    stepNavEls.forEach(el => {
      const s = +el.dataset.step;
      el.classList.toggle('active', s === n);
      el.classList.toggle('done', s < n);
    });
    progressFill.style.width = (n / TOTAL_STEPS * 100) + '%';

    prevBtn.disabled = n === 1;
    nextBtn.style.display = n < TOTAL_STEPS - 1 ? '' : 'none';
    submitBtn.style.display = n === TOTAL_STEPS - 1 ? '' : 'none';
    if (n === TOTAL_STEPS) {
      nextBtn.style.display = 'none';
      submitBtn.style.display = 'none';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- 條件顯示 ---------- */
  function applyConditionalFields() {
    const purpose = answers.purpose;
    const dvType = answers.dvType;

    const groupsField = document.getElementById('groupsField');
    const pairedField = document.getElementById('pairedField');
    const normalField = document.getElementById('normalField');
    const ivField = document.getElementById('ivField');
    const dvField = document.getElementById('dvField');

    // 預設全部顯示
    [groupsField, pairedField, normalField, ivField, dvField].forEach(f => f && f.classList.remove('hidden'));

    if (purpose === 'correlation') {
      groupsField.classList.add('hidden');
      pairedField.classList.add('hidden');
      // 仍需要正態以決定 Pearson/Spearman
    }
    if (purpose === 'prediction') {
      groupsField.classList.add('hidden');
      pairedField.classList.add('hidden');
      normalField.classList.add('hidden');
    }
    if (purpose === 'diagnostic') {
      groupsField.classList.add('hidden');
      pairedField.classList.add('hidden');
      normalField.classList.add('hidden');
      ivField.classList.add('hidden');
    }
    if (purpose === 'survival') {
      pairedField.classList.add('hidden');
      normalField.classList.add('hidden');
    }
    if (purpose === 'repeated') {
      pairedField.classList.add('hidden'); // 默認配對
      if (dvType !== 'continuous') normalField.classList.add('hidden');
    }
    if (purpose === 'group_compare') {
      if (dvType !== 'continuous' && dvType !== 'ordinal') {
        normalField.classList.add('hidden');
      }
    }
  }

  /* ---------- 校驗當前步驟 ---------- */
  function validateStep(n) {
    if (n === 1) {
      if (!answers.purpose) { alert('請選擇研究目的'); return false; }
    }
    if (n === 2) {
      if (!answers.dvType) { alert('請選擇因變量類型'); return false; }
      if (!document.getElementById('ivField').classList.contains('hidden') && !answers.ivType) {
        alert('請選擇自變量類型'); return false;
      }
    }
    if (n === 3) {
      const need = id => !document.getElementById(id).classList.contains('hidden');
      if (need('groupsField') && !answers.groups) { alert('請選擇組數'); return false; }
      if (need('pairedField') && !answers.paired) { alert('請選擇是否配對'); return false; }
      if (need('normalField') && !answers.normal) { alert('請選擇是否近似正態分佈'); return false; }
      if (need('sampleField') && !answers.sampleSize) { alert('請選擇樣本量規模'); return false; }
    }
    return true;
  }

  /* ---------- 收集答案 ---------- */
  function captureAnswers() {
    const form = document.getElementById('selectorForm');
    const fd = new FormData(form);
    ['purpose','dvType','ivType','groups','paired','normal','sampleSize'].forEach(k => {
      const v = fd.get(k);
      if (v !== null && v !== undefined) answers[k] = v;
    });
  }

  /* ---------- 渲染結果 ---------- */
  const labelMap = {
    purpose: { group_compare:'組間比較', correlation:'相關分析', prediction:'預測模型', survival:'生存分析', diagnostic:'診斷效能', repeated:'重複測量' },
    dvType: { continuous:'連續變量', binary:'二分類變量', multi_cat:'多分類無序', ordinal:'有序分類', time:'時間結局' },
    ivType: { categorical:'分類變量', continuous:'連續變量', mixed:'多個混合', none:'不適用' },
    groups: { '1':'1 組', '2':'2 組', '3plus':'3 組或更多' },
    paired: { yes:'配對 / 重複', no:'獨立樣本' },
    normal: { yes:'近似正態', no:'明顯偏態', unknown:'不確定' },
    sampleSize: { small:'小樣本（n<30）', medium:'中等（30–99）', large:'大樣本（n≥100）' }
  };

  function renderResult() {
    const key = recommend(answers);
    const m = METHODS[key] || METHODS.not_supported;

    document.getElementById('mName').textContent = m.name;
    document.getElementById('mEn').textContent = m.en;
    document.getElementById('mSummary').textContent = m.summary;

    const altsBox = document.getElementById('mAlts');
    altsBox.innerHTML = '';
    (m.alts || []).forEach(a => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = '備選：' + a;
      altsBox.appendChild(tag);
    });

    fillList('mConditions', m.conditions);
    fillList('mAssumptions', m.assumptions);
    fillList('mPitfalls', m.pitfalls);
    document.getElementById('mReport').textContent = m.report;

    // 摘要
    const grid = document.getElementById('summaryGrid');
    grid.innerHTML = '';
    [
      ['研究目的', labelMap.purpose[answers.purpose]],
      ['因變量', labelMap.dvType[answers.dvType]],
      ['自變量', labelMap.ivType[answers.ivType] || '—'],
      ['組數', labelMap.groups[answers.groups] || '—'],
      ['配對情況', labelMap.paired[answers.paired] || '—'],
      ['分佈情況', labelMap.normal[answers.normal] || '—'],
      ['樣本量', labelMap.sampleSize[answers.sampleSize] || '—']
    ].forEach(([k, v]) => {
      if (!v || v === 'undefined') return;
      const el = document.createElement('div');
      el.className = 'summary-item';
      el.innerHTML = `<div class="summary-label">${k}</div><div class="summary-value">${v}</div>`;
      grid.appendChild(el);
    });
  }

  function fillList(id, arr) {
    const ul = document.getElementById(id);
    ul.innerHTML = '';
    (arr || []).forEach(t => {
      const li = document.createElement('li');
      li.textContent = t;
      ul.appendChild(li);
    });
  }

  /* ---------- 一鍵複製 ---------- */
  function buildCopyText() {
    const key = recommend(answers);
    const m = METHODS[key] || METHODS.not_supported;
    const lines = [];
    lines.push('【統計方法選擇器 · 推薦結果】');
    lines.push('');
    lines.push('▌ 推薦方法：' + m.name + '（' + m.en + '）');
    lines.push('▌ 簡介：' + m.summary);
    lines.push('');
    lines.push('▌ 你的選擇：');
    Object.entries(labelMap).forEach(([k, map]) => {
      if (answers[k] && map[answers[k]]) lines.push('  · ' + k + '：' + map[answers[k]]);
    });
    lines.push('');
    lines.push('▌ 適用條件：');
    (m.conditions || []).forEach(t => lines.push('  - ' + t));
    lines.push('');
    lines.push('▌ 前提假設：');
    (m.assumptions || []).forEach(t => lines.push('  - ' + t));
    lines.push('');
    lines.push('▌ 結果報告格式：');
    lines.push(m.report);
    lines.push('');
    lines.push('▌ 常見錯誤提醒：');
    (m.pitfalls || []).forEach(t => lines.push('  ! ' + t));
    if (m.alts && m.alts.length) {
      lines.push('');
      lines.push('▌ 備選方法：' + m.alts.join('、'));
    }
    lines.push('');
    lines.push('— Hughie\'s Online Lab · 教學用途，正式分析請結合研究設計與統計學家意見。');
    return lines.join('\n');
  }

  function copyToClipboard() {
    const text = buildCopyText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(showToast, fallbackCopy.bind(null, text));
    } else {
      fallbackCopy(text);
    }
  }
  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); showToast(); } catch (e) { alert('複製失敗，請手動選取。'); }
    document.body.removeChild(ta);
  }
  function showToast(msg) {
    const t = document.getElementById('toast');
    if (msg) t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 1800);
  }

  /* ---------- 重置 ---------- */
  function resetAll() {
    if (!confirm('確認清空所有選擇並從頭開始？')) return;
    document.getElementById('selectorForm').reset();
    Object.keys(answers).forEach(k => delete answers[k]);
    applyConditionalFields();
    showStep(1);
  }

  /* ---------- 事件 ---------- */
  document.getElementById('selectorForm').addEventListener('change', e => {
    captureAnswers();
    applyConditionalFields();
  });

  prevBtn.addEventListener('click', () => {
    if (currentStep > 1) showStep(currentStep - 1);
  });
  nextBtn.addEventListener('click', () => {
    captureAnswers();
    if (!validateStep(currentStep)) return;
    if (currentStep < TOTAL_STEPS - 1) showStep(currentStep + 1);
  });
  submitBtn.addEventListener('click', () => {
    captureAnswers();
    if (!validateStep(currentStep)) return;
    renderResult();
    showStep(TOTAL_STEPS);
  });
  resetBtn.addEventListener('click', resetAll);
  document.getElementById('copyBtn').addEventListener('click', copyToClipboard);

  // 初始化
  applyConditionalFields();
  showStep(1);
})();
