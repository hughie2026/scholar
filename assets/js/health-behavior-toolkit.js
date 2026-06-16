/* =========================================================================
 * 健康行為量表工具箱 · 邏輯腳本
 * Hughie's Online Lab
 *
 * 五個模組：sleep / activity / stress / diet / sedentary
 * 每模組 5 題，分數累加 → 對應 低 / 中 / 較高風險
 * 全部本地計算，不上傳數據。
 * ========================================================================= */

const MODULES = {
  sleep: {
    id: 'sleep',
    icon: '🌙',
    tag: '01 · SLEEP',
    title: '睡眠質量自評',
    desc: '回顧近一個月的整體睡眠情況。',
    intro: '請根據近 30 天的整體狀況選擇最符合的選項。',
    questions: [
      {
        q: '近一個月，你平均每晚的睡眠時長為？',
        opts: [
          { t: '7 – 9 小時', s: 0 },
          { t: '6 – 7 小時', s: 1 },
          { t: '5 – 6 小時 或 9 – 10 小時', s: 2 },
          { t: '不足 5 小時 或 超過 10 小時', s: 3 }
        ]
      },
      {
        q: '從上床到入睡通常需要多久？',
        opts: [
          { t: '15 分鐘以內', s: 0 },
          { t: '15 – 30 分鐘', s: 1 },
          { t: '30 – 60 分鐘', s: 2 },
          { t: '超過 60 分鐘 / 經常難以入睡', s: 3 }
        ]
      },
      {
        q: '夜間醒來的頻率？',
        opts: [
          { t: '幾乎不會', s: 0 },
          { t: '每週 1 – 2 次', s: 1 },
          { t: '每週 3 – 5 次', s: 2 },
          { t: '幾乎每晚', s: 3 }
        ]
      },
      {
        q: '白天是否感到睏倦、注意力下降或精力不足？',
        opts: [
          { t: '幾乎沒有', s: 0 },
          { t: '偶爾', s: 1 },
          { t: '經常', s: 2 },
          { t: '幾乎每天', s: 3 }
        ]
      },
      {
        q: '你對自己整體睡眠質量的主觀評價？',
        opts: [
          { t: '良好', s: 0 },
          { t: '尚可', s: 1 },
          { t: '較差', s: 2 },
          { t: '非常差', s: 3 }
        ]
      }
    ],
    thresholds: { low: 4, mid: 9 }, // 0-4 低；5-9 中；10-15 高
    max: 15,
    interp: {
      low:  '你的睡眠模式整體較為健康，能夠提供身體所需的恢復與修整時間。請繼續保持規律的作息。',
      mid:  '你的睡眠存在一些值得關注的環節，例如入睡困難、夜醒或日間困倦。透過調整作息與睡前習慣，多數情況可以改善。',
      high: '你的睡眠狀況可能對日常表現與健康造成明顯影響。建議在生活方式調整外，考慮諮詢專業睡眠或心理健康從業者。'
    },
    tips: {
      common: [
        '盡量在每日相近時間上床與起床，包括週末。',
        '臥室保持安靜、涼爽（建議 18 – 22°C）與黑暗。',
        '睡前 1 小時減少強光與電子螢幕使用。',
        '下午 2 點後減少咖啡、濃茶等含咖啡因飲品。'
      ],
      mid: [
        '睡前可進行輕柔伸展、呼吸練習或閱讀來幫助放鬆。',
        '若 20 分鐘仍無法入睡，可起身做些低刺激活動再回床。',
        '記錄一週睡眠日記，找出影響你的因素。'
      ],
      high: [
        '若失眠或日間嚴重睏倦持續超過 1 個月，建議諮詢專業醫生。',
        '長期睡眠不足與多種慢性病風險相關，不宜長期忽視。',
        '某些藥物、情緒問題或呼吸暫停也會嚴重影響睡眠，需專業排查。'
      ]
    }
  },

  activity: {
    id: 'activity',
    icon: '🏃',
    tag: '02 · ACTIVITY',
    title: '體力活動水平自評',
    desc: '了解近一週的整體活動量。',
    intro: '請根據近 7 天的實際活動情況選擇。',
    questions: [
      {
        q: '近一週進行中等強度活動（快走、騎行、跳舞等可說話但不易唱歌）？',
        opts: [
          { t: '每週累計 ≥ 150 分鐘', s: 0 },
          { t: '90 – 150 分鐘', s: 1 },
          { t: '30 – 90 分鐘', s: 2 },
          { t: '幾乎沒有', s: 3 }
        ]
      },
      {
        q: '近一週進行高強度活動（跑步、競技運動、HIIT 等氣喘較明顯）？',
        opts: [
          { t: '每週累計 ≥ 75 分鐘', s: 0 },
          { t: '30 – 75 分鐘', s: 1 },
          { t: '少於 30 分鐘', s: 2 },
          { t: '完全沒有', s: 3 }
        ]
      },
      {
        q: '每週進行肌肉力量訓練（抗阻、彈力帶、自重）幾天？',
        opts: [
          { t: '≥ 2 天', s: 0 },
          { t: '1 天', s: 1 },
          { t: '不足 1 天但偶爾', s: 2 },
          { t: '從不', s: 3 }
        ]
      },
      {
        q: '日常步數（含通勤與生活）大致為？',
        opts: [
          { t: '≥ 8000 步', s: 0 },
          { t: '5000 – 8000 步', s: 1 },
          { t: '3000 – 5000 步', s: 2 },
          { t: '少於 3000 步', s: 3 }
        ]
      },
      {
        q: '你對「主動運動」的感覺更接近？',
        opts: [
          { t: '已經是日常習慣的一部分', s: 0 },
          { t: '想做但執行不太穩定', s: 1 },
          { t: '只在偶爾下決心時才做', s: 2 },
          { t: '幾乎從不主動運動', s: 3 }
        ]
      }
    ],
    thresholds: { low: 4, mid: 9 },
    max: 15,
    interp: {
      low:  '你的體力活動水平達到或接近世衛組織推薦標準，對心肺、代謝與情緒健康都有積極作用。',
      mid:  '你有一定的活動基礎，但仍有提升空間。逐步增加頻率或強度，能進一步改善心肺與身體成分。',
      high: '你目前的活動量偏低。長期久坐與缺乏運動是多種慢性病的獨立風險因素，建議從小目標開始逐步建立習慣。'
    },
    tips: {
      common: [
        '世衛組織建議成人每週累計 150 – 300 分鐘中等強度活動。',
        '把走路融入日常：提前一站下車、走樓梯、午休散步。',
        '從你喜歡的活動開始，享受感是堅持的第一動力。'
      ],
      mid: [
        '建立「每週固定時段」的運動安排，比依靠意志力更可持續。',
        '加入少量肌肉力量訓練（每週 2 天）對代謝和關節都有益。',
        '使用步數或心率記錄工具，可帶來小幅但有效的激勵。'
      ],
      high: [
        '從每天 10 分鐘的快走開始即可，循序漸進最為關鍵。',
        '若伴有慢性病或關節不適，運動前建議先諮詢醫生。',
        '長期不運動者可考慮在合格的運動指導下開始訓練。'
      ]
    }
  },

  stress: {
    id: 'stress',
    icon: '🌿',
    tag: '03 · STRESS',
    title: '壓力水平自評',
    desc: '回顧近一個月的整體心理感受。',
    intro: '請根據近 30 天的整體感受選擇。本評估不能用於診斷任何精神或心理疾病。',
    questions: [
      {
        q: '近一個月，你感到事情超出自己掌控的頻率？',
        opts: [
          { t: '幾乎沒有', s: 0 },
          { t: '偶爾', s: 1 },
          { t: '經常', s: 2 },
          { t: '幾乎一直', s: 3 }
        ]
      },
      {
        q: '感到緊張、煩躁或難以放鬆的頻率？',
        opts: [
          { t: '幾乎沒有', s: 0 },
          { t: '偶爾', s: 1 },
          { t: '經常', s: 2 },
          { t: '幾乎一直', s: 3 }
        ]
      },
      {
        q: '是否有難以集中注意力、思考效率下降的感受？',
        opts: [
          { t: '幾乎沒有', s: 0 },
          { t: '偶爾', s: 1 },
          { t: '經常', s: 2 },
          { t: '幾乎一直', s: 3 }
        ]
      },
      {
        q: '是否伴隨身體反應（頭痛、肩頸痛、心悸、胃部不適等）？',
        opts: [
          { t: '幾乎沒有', s: 0 },
          { t: '偶爾', s: 1 },
          { t: '經常', s: 2 },
          { t: '幾乎一直', s: 3 }
        ]
      },
      {
        q: '是否覺得自己有可信賴的人或方式來緩解壓力？',
        opts: [
          { t: '是，且能有效緩解', s: 0 },
          { t: '有，但效果有限', s: 1 },
          { t: '很少使用', s: 2 },
          { t: '幾乎沒有', s: 3 }
        ]
      }
    ],
    thresholds: { low: 4, mid: 9 },
    max: 15,
    interp: {
      low:  '你近期的壓力處於可控水平，並能透過自身或社會支持加以調節。請繼續關注情緒變化。',
      mid:  '你正在承受中等水平的壓力，可能影響睡眠、注意力或情緒。學習一些壓力管理技巧會有幫助。',
      high: '你的壓力水平較高，且可能已影響日常生活。建議盡快尋求專業心理諮詢或精神衛生服務的支持。'
    },
    tips: {
      common: [
        '保持規律作息與運動，是穩定情緒的基礎。',
        '練習深呼吸、正念或冥想，每天 5 – 10 分鐘即可。',
        '減少資訊過載，給自己安排不被打擾的休息時間。'
      ],
      mid: [
        '把困擾的事項寫下來，區分「能改變」與「不能改變」。',
        '主動與信任的家人、朋友交流，社會支持是最強的保護因素之一。',
        '安排一些讓你感到放鬆與愉悅的小活動，每週至少 2 – 3 次。'
      ],
      high: [
        '若情緒低落、焦慮或失眠持續 2 週以上，建議盡快尋求專業協助。',
        '可諮詢精神科醫生、臨床心理師或合格的心理諮詢師。',
        '如出現自傷或傷害他人的念頭，請立即聯繫當地心理援助熱線或前往醫療機構。'
      ]
    }
  },

  diet: {
    id: 'diet',
    icon: '🥗',
    tag: '04 · DIET',
    title: '飲食行為自評',
    desc: '回顧近一週的整體飲食模式。',
    intro: '請根據近 7 天的實際飲食情況選擇。',
    questions: [
      {
        q: '每天攝入的蔬菜（不含薯類）量大致為？',
        opts: [
          { t: '≥ 300g（約 2 碗熟蔬菜）', s: 0 },
          { t: '200 – 300g', s: 1 },
          { t: '100 – 200g', s: 2 },
          { t: '不足 100g 或基本不吃', s: 3 }
        ]
      },
      {
        q: '每天的水果攝入量約為？',
        opts: [
          { t: '200 – 350g（一個中等蘋果＋少量莓果）', s: 0 },
          { t: '100 – 200g', s: 1 },
          { t: '少於 100g', s: 2 },
          { t: '幾乎不吃水果', s: 3 }
        ]
      },
      {
        q: '含糖飲料（奶茶、汽水、果汁飲料等）的飲用頻率？',
        opts: [
          { t: '幾乎不喝', s: 0 },
          { t: '每週 1 – 2 次', s: 1 },
          { t: '每週 3 – 5 次', s: 2 },
          { t: '幾乎每天', s: 3 }
        ]
      },
      {
        q: '油炸、燒烤、加工肉類（香腸、培根等）的食用頻率？',
        opts: [
          { t: '極少', s: 0 },
          { t: '每週 1 – 2 次', s: 1 },
          { t: '每週 3 – 5 次', s: 2 },
          { t: '幾乎每天', s: 3 }
        ]
      },
      {
        q: '正餐是否規律（不過度暴飲暴食、不長期節食）？',
        opts: [
          { t: '時間規律，量也適中', s: 0 },
          { t: '基本規律，偶爾失控', s: 1 },
          { t: '時常不規律', s: 2 },
          { t: '經常暴食或長期節食', s: 3 }
        ]
      }
    ],
    thresholds: { low: 4, mid: 9 },
    max: 15,
    interp: {
      low:  '你的飲食模式整體較為均衡，能為長期健康打下良好基礎。請繼續關注食材多樣性。',
      mid:  '你的飲食有一定基礎，但部分環節仍可調整，例如增加蔬果、減少含糖飲料或加工食品。',
      high: '你的飲食模式存在較多風險因素，長期可能增加慢性病風險。建議從容易執行的小改變開始。'
    },
    tips: {
      common: [
        '《中國居民膳食指南》推薦每日 300 – 500g 蔬菜、200 – 350g 水果。',
        '優先選擇全穀物、豆類與優質蛋白（魚、禽、蛋、奶、豆製品）。',
        '減少添加糖與精製澱粉，閱讀食品標籤養成好習慣。'
      ],
      mid: [
        '把含糖飲料逐步替換為水、無糖茶或氣泡水。',
        '一餐中保證「半盤蔬菜＋一份蛋白＋一份主食」的結構。',
        '採購時提前列清單，減少衝動購買加工食品。'
      ],
      high: [
        '飲食改變不必激進，每週 1 – 2 個小目標更易堅持。',
        '若長期節食、暴食或對體重 / 飲食有強烈焦慮，建議諮詢專業營養師或心理從業者。',
        '糖尿病、高血脂、痛風等慢性病人群應在醫生 / 註冊營養師指導下飲食。'
      ]
    }
  },

  sedentary: {
    id: 'sedentary',
    icon: '🪑',
    tag: '05 · SEDENTARY',
    title: '久坐風險自評',
    desc: '評估久坐相關行為對健康的潛在影響。',
    intro: '請根據近 7 天的工作 / 學習 / 居家狀態選擇。',
    questions: [
      {
        q: '工作日平均每天累計坐著的時間？',
        opts: [
          { t: '少於 4 小時', s: 0 },
          { t: '4 – 6 小時', s: 1 },
          { t: '6 – 9 小時', s: 2 },
          { t: '9 小時以上', s: 3 }
        ]
      },
      {
        q: '一次連續坐著（中間幾乎沒有起身）的最長時間？',
        opts: [
          { t: '少於 30 分鐘', s: 0 },
          { t: '30 – 60 分鐘', s: 1 },
          { t: '1 – 2 小時', s: 2 },
          { t: '超過 2 小時', s: 3 }
        ]
      },
      {
        q: '工作 / 學習中，平均多久會起身活動一次？',
        opts: [
          { t: '每 30 分鐘左右', s: 0 },
          { t: '每 45 – 60 分鐘', s: 1 },
          { t: '每 1 – 2 小時', s: 2 },
          { t: '幾乎不主動起身', s: 3 }
        ]
      },
      {
        q: '工作以外的螢幕時間（手機、電視、追劇等）平均每天？',
        opts: [
          { t: '少於 2 小時', s: 0 },
          { t: '2 – 4 小時', s: 1 },
          { t: '4 – 6 小時', s: 2 },
          { t: '超過 6 小時', s: 3 }
        ]
      },
      {
        q: '你是否經常感到肩頸僵硬、腰背痠痛或下肢腫脹？',
        opts: [
          { t: '幾乎沒有', s: 0 },
          { t: '偶爾', s: 1 },
          { t: '經常', s: 2 },
          { t: '幾乎每天', s: 3 }
        ]
      }
    ],
    thresholds: { low: 4, mid: 9 },
    max: 15,
    interp: {
      low:  '你目前的久坐風險較低，能在日常中自然地保持身體活動。請繼續維持。',
      mid:  '你存在一定的久坐風險，可以透過微小的工作習慣調整來顯著改善。',
      high: '你的久坐時間明顯偏多，這已被多項研究與多種慢性病及肌肉骨骼問題相關聯。建議盡快做出調整。'
    },
    tips: {
      common: [
        '研究顯示，每 30 分鐘起身活動 1 – 2 分鐘對健康有正面影響。',
        '即使每天運動 30 分鐘，也無法完全抵消長時間久坐的不利影響。',
        '把日常活動「碎片化」融入工作流，比集中健身更可持續。'
      ],
      mid: [
        '使用番茄鐘或久坐提醒工具，每 30 – 45 分鐘起身一次。',
        '會議改為站立或步行討論，是常見且有效的方式。',
        '為螢幕時間設立每日上限，並用其他活動替代。'
      ],
      high: [
        '若已有腰背、頸椎不適，建議諮詢康復科或物理治療師。',
        '考慮使用升降桌交替站立與坐姿，並保持正確坐姿。',
        '長期久坐還可能影響循環與代謝，建議結合定期體檢進行監測。'
      ]
    }
  }
};

const RISK_LABEL = {
  low:  { txt: '低風險',   cls: 'risk-low'  },
  mid:  { txt: '中等風險', cls: 'risk-mid'  },
  high: { txt: '較高風險', cls: 'risk-high' }
};

/* ===== State ===== */
let currentModule = null;

/* ===== Render Module Home ===== */
function renderHome() {
  const grid = document.getElementById('moduleGrid');
  grid.innerHTML = Object.values(MODULES).map(m => `
    <div class="module-card" onclick="openModule('${m.id}')">
      <div class="m-icon">${m.icon}</div>
      <div class="m-tag">${m.tag}</div>
      <h3>${m.title}</h3>
      <p>${m.desc}</p>
      <div class="m-foot">開始自評</div>
    </div>
  `).join('');
}

/* ===== Open Module ===== */
function openModule(id) {
  currentModule = MODULES[id];
  document.getElementById('moduleHome').style.display = 'none';
  document.getElementById('resultPanel').classList.remove('active');
  const shell = document.getElementById('formShell');
  shell.classList.add('active');

  document.getElementById('formTag').textContent = currentModule.tag;
  document.getElementById('formTitle').textContent = currentModule.title;
  document.getElementById('formDesc').textContent = currentModule.intro;
  document.getElementById('progressLabel').textContent = currentModule.title + ' · 進度';

  const form = document.getElementById('quizForm');
  form.innerHTML = currentModule.questions.map((q, i) => `
    <div class="field" data-q="${i}">
      <label><span class="qnum">Q${i + 1}.</span>${q.q}</label>
      <div class="radio-row">
        ${q.opts.map((o) => `
          <label class="radio-btn">
            <input type="radio" name="q${i}" value="${o.s}" data-qi="${i}">
            <span>${o.t}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `).join('');

  updateProgress();
  form.addEventListener('change', updateProgress);

  window.scrollTo({ top: shell.offsetTop - 40, behavior: 'smooth' });
}

function updateProgress() {
  if (!currentModule) return;
  const total = currentModule.questions.length;
  const checked = document.querySelectorAll('#quizForm input[type="radio"]:checked').length;
  const pct = Math.round((checked / total) * 100);
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressCount').textContent = checked + ' / ' + total;
}

/* ===== Submit ===== */
document.getElementById('submitBtn').addEventListener('click', () => {
  if (!currentModule) return;
  const total = currentModule.questions.length;
  let score = 0;
  for (let i = 0; i < total; i++) {
    const sel = document.querySelector(`#quizForm input[name="q${i}"]:checked`);
    if (!sel) {
      alert('請完成第 ' + (i + 1) + ' 題後再查看結果。');
      const el = document.querySelector(`#quizForm [data-q="${i}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    score += parseInt(sel.value, 10);
  }
  showResult(score);
});

/* ===== Show Result ===== */
function showResult(score) {
  const m = currentModule;
  let level = 'low';
  if (score > m.thresholds.mid) level = 'high';
  else if (score > m.thresholds.low) level = 'mid';

  document.getElementById('formShell').classList.remove('active');
  document.getElementById('resultPanel').classList.add('active');

  document.getElementById('resultTitle').textContent = m.title + ' · 結果';
  document.getElementById('scoreVal').textContent = score;
  document.getElementById('scoreMax').textContent = '/ ' + m.max;
  document.getElementById('scoreSubLabel').textContent = m.tag;

  const tag = document.getElementById('riskTag');
  tag.textContent = RISK_LABEL[level].txt;
  tag.className = 'risk-tag ' + RISK_LABEL[level].cls;

  // Score bar 動畫
  setTimeout(() => {
    document.getElementById('scoreFill').style.width = (score / m.max * 100) + '%';
  }, 80);

  // 結果解讀
  document.getElementById('interpretation').textContent = m.interp[level];

  // 健康教育建議
  const tips = [].concat(m.tips.common || [], m.tips[level] || []);
  document.getElementById('recommendations').innerHTML =
    tips.map(t => `<li>${t}</li>`).join('');

  // 較高風險提示
  document.getElementById('highRiskBlock').style.display =
    level === 'high' ? 'block' : 'none';

  // 暫存供複製
  window._lastResult = { module: m, score, level };

  window.scrollTo({ top: document.getElementById('resultPanel').offsetTop - 40, behavior: 'smooth' });
}

/* ===== Retake ===== */
document.getElementById('retakeBtn').addEventListener('click', () => {
  if (currentModule) openModule(currentModule.id);
});

/* ===== Go Home ===== */
function goHome() {
  document.getElementById('formShell').classList.remove('active');
  document.getElementById('resultPanel').classList.remove('active');
  document.getElementById('moduleHome').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  currentModule = null;
}

/* ===== Copy Result ===== */
document.getElementById('copyBtn').addEventListener('click', async () => {
  const r = window._lastResult;
  if (!r) return;
  const m = r.module;
  const tips = [].concat(m.tips.common || [], m.tips[r.level] || []);

  const lines = [];
  lines.push('【健康行為量表工具箱 · 自評結果】');
  lines.push('模組：' + m.title);
  lines.push('得分：' + r.score + ' / ' + m.max);
  lines.push('風險區間：' + RISK_LABEL[r.level].txt);
  lines.push('');
  lines.push('— 結果解讀 —');
  lines.push(m.interp[r.level]);
  lines.push('');
  lines.push('— 健康教育建議 —');
  tips.forEach((t, i) => lines.push((i + 1) + '. ' + t));
  lines.push('');
  if (r.level === 'high') {
    lines.push('⚠️ 你的結果為較高風險，建議盡快諮詢專業醫療人員以獲得個別化評估。');
    lines.push('');
  }
  lines.push('免責聲明：本工具僅供健康教育與自我了解，不構成醫療診斷。');
  lines.push('生成時間：' + new Date().toLocaleString());

  const text = lines.join('\n');
  try {
    await navigator.clipboard.writeText(text);
    showToast('已複製結果到剪貼板');
  } catch (err) {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('已複製結果到剪貼板');
  }
});

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}

/* ===== Init ===== */
renderHome();
