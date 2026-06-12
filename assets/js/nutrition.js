<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Adult Nutrition Self-Assessment | Hughie's Online Lab</title>
  <link rel="stylesheet" href="assets/css/style.css">
  <link href="https://fonts.googleapis.com/css2?family=Encode+Sans:wght@300;400;500;600;700;800&family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body>

  <div class="utility-bar">
    <div class="container utility-inner">
      <span>HUGHIE'S ONLINE LAB</span>
      <div class="utility-links">
        <a href="index.html">← Back to Home</a>
      </div>
    </div>
  </div>

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
        <a href="index.html#about">About</a>
      </nav>
    </div>
  </header>

  <!-- Tool Hero -->
  <section class="tool-hero">
    <div class="container">
      <div class="breadcrumb">
        <a href="index.html">Home</a>
        <span class="bc-sep">›</span>
        <a href="index.html#modules">Tools</a>
        <span class="bc-sep">›</span>
        <span>Nutrition Self-Assessment</span>
      </div>
      <div class="eyebrow gold">HEALTH · NUTRITION</div>
      <h1>Adult Nutrition Self-Assessment</h1>
      <p class="tool-lead">
        本工具基於 BMI、膳食多樣性、飲食頻率與生活習慣，對 18 歲以上成年人的整體營養狀況進行綜合評估。
        全部計算在本地完成，結果僅供參考，不能替代專業醫療意見。
      </p>
      <div class="meta-pills">
        <span class="pill">⏱ 約 5 分鐘</span>
        <span class="pill">📊 5 個維度</span>
        <span class="pill">🔒 本地計算</span>
        <span class="pill">📖 基於公開文獻</span>
      </div>
    </div>
  </section>

  <!-- Form -->
  <section class="section section-light">
    <div class="container narrow">

      <div class="progress-wrap">
        <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
        <div class="progress-steps">
          <span class="step active" data-step="1"><b>01</b> 基本信息</span>
          <span class="step" data-step="2"><b>02</b> 膳食結構</span>
          <span class="step" data-step="3"><b>03</b> 飲食習慣</span>
          <span class="step" data-step="4"><b>04</b> 生活方式</span>
          <span class="step" data-step="5"><b>05</b> 健康狀態</span>
        </div>
      </div>

      <form id="assessmentForm" class="assessment-form">

        <div class="form-step active" data-step="1">
          <div class="step-num">PART 01</div>
          <h2>基本信息</h2>
          <p class="step-desc">用於計算 BMI 與基礎代謝率參考值。</p>

          <div class="field">
            <label>性別</label>
            <div class="radio-row">
              <label class="radio-btn"><input type="radio" name="gender" value="male" required><span>男</span></label>
              <label class="radio-btn"><input type="radio" name="gender" value="female"><span>女</span></label>
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label>年齡（歲）</label>
              <input type="number" name="age" min="18" max="120" required>
            </div>
            <div class="field">
              <label>身高（cm）</label>
              <input type="number" name="height" min="100" max="250" step="0.1" required>
            </div>
            <div class="field">
              <label>體重（kg）</label>
              <input type="number" name="weight" min="30" max="300" step="0.1" required>
            </div>
          </div>

          <div class="field">
            <label>近 6 個月體重變化</label>
            <select name="weightChange" required>
              <option value="">請選擇</option>
              <option value="stable">基本穩定（變化 &lt; 3%）</option>
              <option value="mildLoss">輕度下降（3% – 5%）</option>
              <option value="moderateLoss">中度下降（5% – 10%）</option>
              <option value="severeLoss">明顯下降（&gt; 10%）</option>
              <option value="gain">明顯增加（&gt; 5%）</option>
            </select>
          </div>
        </div>

        <div class="form-step" data-step="2">
          <div class="step-num">PART 02</div>
          <h2>膳食結構</h2>
          <p class="step-desc">過去一週內，你平均每天攝入以下哪些類別的食物？</p>

          <div class="checkbox-group">
            <label class="check-card"><input type="checkbox" name="foodGroups" value="grains"><span>穀類（米、麵、全麥）</span></label>
            <label class="check-card"><input type="checkbox" name="foodGroups" value="vegetables"><span>蔬菜（每天 ≥ 300g）</span></label>
            <label class="check-card"><input type="checkbox" name="foodGroups" value="fruits"><span>水果（每天 ≥ 200g）</span></label>
            <label class="check-card"><input type="checkbox" name="foodGroups" value="protein"><span>優質蛋白（魚、禽、蛋、瘦肉）</span></label>
            <label class="check-card"><input type="checkbox" name="foodGroups" value="dairy"><span>奶類及奶製品</span></label>
            <label class="check-card"><input type="checkbox" name="foodGroups" value="legumes"><span>豆類及豆製品</span></label>
            <label class="check-card"><input type="checkbox" name="foodGroups" value="nuts"><span>堅果（每週 ≥ 50g）</span></label>
            <label class="check-card"><input type="checkbox" name="foodGroups" value="water"><span>充足飲水（每天 ≥ 1500ml）</span></label>
          </div>
        </div>

        <div class="form-step" data-step="3">
          <div class="step-num">PART 03</div>
          <h2>飲食習慣</h2>
          <p class="step-desc">關於進餐規律性與食物選擇的偏好。</p>

          <div class="field">
            <label>每天規律進食的次數</label>
            <select name="mealCount" required>
              <option value="">請選擇</option>
              <option value="3">三餐規律</option>
              <option value="2">通常兩餐</option>
              <option value="1">經常只一餐</option>
              <option value="irregular">時間不固定</option>
            </select>
          </div>

          <div class="field">
            <label>近一個月食慾如何</label>
            <select name="appetite" required>
              <option value="">請選擇</option>
              <option value="good">良好，食量正常</option>
              <option value="fair">一般，偶爾食慾不振</option>
              <option value="poor">較差，常吃不下</option>
              <option value="veryPoor">很差，經常需要強迫進食</option>
            </select>
          </div>

          <div class="field">
            <label>每週吃外賣 / 在外就餐的頻率</label>
            <select name="eatOut" required>
              <option value="">請選擇</option>
              <option value="rare">很少（≤ 1 次）</option>
              <option value="some">偶爾（2 – 4 次）</option>
              <option value="often">經常（5 – 7 次）</option>
              <option value="veryOften">幾乎每餐</option>
            </select>
          </div>

          <div class="field">
            <label>含糖飲料 / 甜點頻率</label>
            <select name="sugar" required>
              <option value="">請選擇</option>
              <option value="rare">基本不喝</option>
              <option value="some">每週 1 – 3 次</option>
              <option value="often">每週 4 – 6 次</option>
              <option value="daily">幾乎每天</option>
            </select>
          </div>
        </div>

        <div class="form-step" data-step="4">
          <div class="step-num">PART 04</div>
          <h2>生活方式</h2>
          <p class="step-desc">運動、睡眠、菸酒等生活習慣會直接影響營養狀態。</p>

          <div class="field">
            <label>每週中等強度運動時長</label>
            <select name="exercise" required>
              <option value="">請選擇</option>
              <option value="high">≥ 150 分鐘</option>
              <option value="medium">75 – 149 分鐘</option>
              <option value="low">1 – 74 分鐘</option>
              <option value="none">基本不運動</option>
            </select>
          </div>

          <div class="field">
            <label>平均每晚睡眠時長</label>
            <select name="sleep" required>
              <option value="">請選擇</option>
              <option value="ideal">7 – 9 小時</option>
              <option value="short">6 – 7 小時</option>
              <option value="veryShort">&lt; 6 小時</option>
              <option value="long">&gt; 9 小時</option>
            </select>
          </div>

          <div class="field">
            <label>吸菸狀況</label>
            <select name="smoke" required>
              <option value="">請選擇</option>
              <option value="never">從不吸菸</option>
              <option value="former">已戒菸</option>
              <option value="light">每日 &lt; 10 支</option>
              <option value="heavy">每日 ≥ 10 支</option>
            </select>
          </div>

          <div class="field">
            <label>飲酒頻率</label>
            <select name="alcohol" required>
              <option value="">請選擇</option>
              <option value="never">基本不飲</option>
              <option value="occasional">每月幾次</option>
              <option value="weekly">每週數次</option>
              <option value="daily">幾乎每天</option>
            </select>
          </div>
        </div>

        <div class="form-step" data-step="5">
          <div class="step-num">PART 05</div>
          <h2>健康狀態</h2>
          <p class="step-desc">最近 3 個月內是否有以下情況。可多選。</p>

          <div class="checkbox-group">
            <label class="check-card"><input type="checkbox" name="symptoms" value="fatigue"><span>經常感到疲倦或精力不足</span></label>
            <label class="check-card"><input type="checkbox" name="symptoms" value="hairloss"><span>頭髮、指甲變脆或脫髮明顯</span></label>
            <label class="check-card"><input type="checkbox" name="symptoms" value="digestive"><span>消化不良、腹瀉或便秘</span></label>
            <label class="check-card"><input type="checkbox" name="symptoms" value="frequent_illness"><span>容易感冒或恢復緩慢</span></label>
            <label class="check-card"><input type="checkbox" name="symptoms" value="mood"><span>情緒波動、注意力下降</span></label>
            <label class="check-card"><input type="checkbox" name="symptoms" value="chronic"><span>已被診斷為慢性病</span></label>
            <label class="check-card"><input type="checkbox" name="symptoms" value="medication"><span>長期服用影響營養吸收的藥物</span></label>
            <label class="check-card"><input type="checkbox" name="symptoms" value="none"><span>以上均無</span></label>
          </div>
        </div>

        <div class="form-nav">
          <button type="button" id="prevBtn" class="btn-ghost-dark" disabled>← 上一步</button>
          <button type="button" id="nextBtn" class="btn-purple">下一步 →</button>
          <button type="button" id="submitBtn" class="btn-purple" style="display:none;">查看結果</button>
        </div>
      </form>

      <!-- Result -->
      <div id="result" class="result-panel" style="display:none;">
        <div class="result-head">
          <div class="eyebrow gold">YOUR RESULTS</div>
          <h2>營養評估結果</h2>
          <p>結果基於你提供的信息綜合計算得出，僅供參考。</p>
        </div>

        <div class="score-card">
          <div class="score-left">
            <div class="score-num"><span id="totalScore">--</span><small>/ 100</small></div>
            <div class="score-label" id="scoreLabel">--</div>
          </div>
          <div class="score-right">
            <div class="score-bar"><div class="score-fill" id="scoreFill"></div></div>
            <div class="score-tier">
              <span>0</span><span>40</span><span>55</span><span>70</span><span>85</span><span>100</span>
            </div>
          </div>
        </div>

        <div class="metric-grid">
          <div class="metric">
            <div class="metric-label">BMI</div>
            <div class="metric-value" id="bmiVal">--</div>
            <div class="metric-note" id="bmiCat">--</div>
          </div>
          <div class="metric">
            <div class="metric-label">膳食多樣性</div>
            <div class="metric-value" id="diversityVal">--</div>
            <div class="metric-note">食物類別覆蓋</div>
          </div>
          <div class="metric">
            <div class="metric-label">飲食習慣</div>
            <div class="metric-value" id="habitVal">--</div>
            <div class="metric-note">規律性與質量</div>
          </div>
          <div class="metric">
            <div class="metric-label">生活方式</div>
            <div class="metric-value" id="lifestyleVal">--</div>
            <div class="metric-note">運動、睡眠、菸酒</div>
          </div>
        </div>

        <div class="result-section">
          <h3>個性化建議</h3>
          <ul id="recommendations"></ul>
        </div>

        <div class="result-section disclaimer">
          <strong>免責聲明　</strong>
          本工具不構成醫療建議。如有持續不適或慢性健康問題，請諮詢註冊營養師或醫生。
        </div>

        <div class="form-nav">
          <button type="button" class="btn-ghost-dark" onclick="location.reload()">重新評估</button>
          <button type="button" class="btn-purple" onclick="window.print()">打印 / 保存 PDF</button>
        </div>
      </div>

    </div>
  </section>

  <footer class="footer">
    <div class="footer-bottom">
      <div class="container footer-bottom-inner">
        <span>© 2025 Hughie's Online Lab</span>
        <span>For informational purposes only.</span>
      </div>
    </div>
  </footer>

  <script src="assets/js/nutrition.js"></script>
</body>
</html>
