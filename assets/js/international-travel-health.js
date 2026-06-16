/* ===========================================================
   International Travel Health Pack Generator
   - 整合 Open-Meteo / CDC / WHO / GOV.UK / GDACS 公開資料源
   - 全程瀏覽器內處理，不上傳任何用戶資料
   =========================================================== */

'use strict';

/* -------- 配置：第二版預留的 serverless proxy --------
   若部署 serverless function 解決 CORS，把對應 URL 填入即可。
   留空時，前端先嘗試直接 fetch，失敗則 fallback。
---------------------------------------------------------- */
const DATA_PROXY = {
  cdcRss: '',
  whoDon: '',
  govuk: '',
  gdacs: ''
};

/* -------- 端點 -------- */
const ENDPOINTS = {
  geocode: 'https://geocoding-api.open-meteo.com/v1/search',
  weather: 'https://api.open-meteo.com/v1/forecast',
  air:     'https://air-quality-api.open-meteo.com/v1/air-quality',
  cdcRss:  'https://wwwnc.cdc.gov/travel/rss/notices.xml',
  whoDon:  'https://www.who.int/api/news/diseaseoutbreaknews',
  govuk:   'https://www.gov.uk/api/content/foreign-travel-advice/',
  gdacs:   'https://www.gdacs.org/xml/rss.xml'
};

/* -------- 全局狀態 -------- */
const STATE = {
  form: null,        // 表單快照
  geo: null,         // 已選地理位置
  candidates: [],    // 多匹配候選
  result: null,      // 最終整合報告
  timestamps: {}     // 各資料源請求時間
};

/* -------- 工具函數 -------- */
const $  = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
const fmtDate = d => {
  if (!d) return '';
  const dt = (d instanceof Date) ? d : new Date(d);
  if (isNaN(dt)) return '';
  return dt.toISOString().slice(0, 10);
};
const nowStr = () => new Date().toLocaleString('zh-TW', { hour12: false });
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function setStatus(src, state, note) {
  const item = $(`.status-item[data-src="${src}"]`);
  if (!item) return;
  const badge = item.querySelector('.badge');
  badge.className = 'badge ' + state;
  const labels = { idle: '待請求', loading: '請求中…', ok: '成功', warn: 'CORS / Fallback', fail: '失敗' };
  badge.textContent = note || labels[state] || state;
}

function slugifyCountry(name) {
  if (!name) return '';
  return name.trim().toLowerCase()
    .replace(/[\u2019']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-');
}

/* ============================================================
   1. 地理編碼
============================================================ */
async function geocodeDestination(city, country) {
  if (!city) throw new Error('缺少城市名');
  const url = `${ENDPOINTS.geocode}?name=${encodeURIComponent(city)}&count=5&language=en&format=json`;
  setStatus('geo', 'loading');
  STATE.timestamps.geo = nowStr();
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const results = data.results || [];
    if (!results.length) {
      setStatus('geo', 'fail', '無匹配');
      return [];
    }
    // 優先匹配國家
    let candidates = results;
    if (country) {
      const c = country.trim().toLowerCase();
      const matched = results.filter(r =>
        (r.country || '').toLowerCase() === c ||
        (r.country_code || '').toLowerCase() === c
      );
      if (matched.length) candidates = matched;
    }
    setStatus('geo', 'ok', `命中 ${candidates.length}`);
    return candidates;
  } catch (e) {
    setStatus('geo', 'fail', '網絡錯誤');
    return [];
  }
}

/* ============================================================
   2. 天氣
============================================================ */
async function fetchWeatherRisk(latitude, longitude, startDate, days) {
  setStatus('weather', 'loading');
  STATE.timestamps.weather = nowStr();
  const fdays = Math.min(Math.max(parseInt(days, 10) || 7, 1), 16);
  const params = new URLSearchParams({
    latitude, longitude,
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,uv_index_max',
    forecast_days: fdays,
    timezone: 'auto'
  });
  try {
    const res = await fetch(`${ENDPOINTS.weather}?${params}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    setStatus('weather', 'ok');
    return data;
  } catch (e) {
    setStatus('weather', 'fail', '網絡錯誤');
    return null;
  }
}

/* ============================================================
   3. 空氣品質
============================================================ */
async function fetchAirQualityRisk(latitude, longitude) {
  setStatus('air', 'loading');
  STATE.timestamps.air = nowStr();
  const params = new URLSearchParams({
    latitude, longitude,
    hourly: 'pm10,pm2_5,ozone,nitrogen_dioxide,uv_index',
    forecast_days: 5,
    timezone: 'auto'
  });
  try {
    const res = await fetch(`${ENDPOINTS.air}?${params}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    setStatus('air', 'ok');
    return data;
  } catch (e) {
    setStatus('air', 'fail', '網絡錯誤');
    return null;
  }
}

/* ============================================================
   4. CDC Travel Notices (RSS)
   - 直接 fetch 通常會 CORS。保留 proxy 配置與 fallback。
============================================================ */
async function fetchCdcTravelNotices(destination) {
  setStatus('cdc', 'loading');
  STATE.timestamps.cdc = nowStr();
  const url = DATA_PROXY.cdcRss || ENDPOINTS.cdcRss;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const txt = await res.text();
    const items = parseRssItems(txt);
    if (!items.length) {
      setStatus('cdc', 'warn', '已連線但無資料');
      return { ok: false, items: [], reason: 'empty' };
    }
    const matched = matchByKeywords(items, destination);
    setStatus('cdc', 'ok', `共 ${items.length} / 匹配 ${matched.length}`);
    return { ok: true, items, matched };
  } catch (e) {
    setStatus('cdc', 'warn', 'CORS / Fallback');
    return { ok: false, items: [], reason: 'cors' };
  }
}

/* ============================================================
   5. WHO Disease Outbreak News
============================================================ */
async function fetchWhoOutbreakNews(destination) {
  setStatus('who', 'loading');
  STATE.timestamps.who = nowStr();
  const url = DATA_PROXY.whoDon || ENDPOINTS.whoDon;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    // WHO API 結構可能變動，做容錯解析
    let items = [];
    const value = data.value || data.results || data.items || data;
    if (Array.isArray(value)) {
      items = value.map(it => ({
        title: it.Title || it.title || it.name || '',
        date:  it.PublicationDate || it.publicationDate || it.date || it.dateOfPublication || '',
        link:  it.ItemDefaultUrl || it.url || it.link || '',
        summary: stripHtml(it.Description || it.description || it.summary || it.body || '')
      })).filter(x => x.title);
    }
    if (!items.length) {
      setStatus('who', 'warn', '結構無法解析');
      return { ok: false, items: [], reason: 'parse' };
    }
    const matched = matchByKeywords(items, destination);
    setStatus('who', 'ok', `共 ${items.length} / 匹配 ${matched.length}`);
    return { ok: true, items, matched };
  } catch (e) {
    setStatus('who', 'warn', 'CORS / Fallback');
    return { ok: false, items: [], reason: 'cors' };
  }
}

/* ============================================================
   6. GOV.UK Travel Advice
============================================================ */
async function fetchGovUkTravelAdvice(country) {
  setStatus('govuk', 'loading');
  STATE.timestamps.govuk = nowStr();
  if (!country) {
    setStatus('govuk', 'warn', '未填國家');
    return { ok: false, reason: 'no-country' };
  }
  const slug = slugifyCountry(country);
  const url = (DATA_PROXY.govuk || ENDPOINTS.govuk) + slug;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    setStatus('govuk', 'ok');
    return {
      ok: true,
      title: data.title || '',
      summary: data.description || (data.details && data.details.summary) || '',
      link: 'https://www.gov.uk/foreign-travel-advice/' + slug,
      updated: data.updated_at || data.public_updated_at || ''
    };
  } catch (e) {
    setStatus('govuk', 'warn', '不可用 / CORS');
    return { ok: false, reason: 'fail' };
  }
}

/* ============================================================
   7. GDACS Alerts
============================================================ */
async function fetchGdacsAlerts(destination, latitude, longitude) {
  setStatus('gdacs', 'loading');
  STATE.timestamps.gdacs = nowStr();
  const url = DATA_PROXY.gdacs || ENDPOINTS.gdacs;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const txt = await res.text();
    const items = parseRssItems(txt);
    if (!items.length) {
      setStatus('gdacs', 'warn', '無資料');
      return { ok: false, items: [], reason: 'empty' };
    }
    const matched = matchByKeywords(items, destination);
    setStatus('gdacs', 'ok', `共 ${items.length} / 匹配 ${matched.length}`);
    return { ok: true, items, matched };
  } catch (e) {
    setStatus('gdacs', 'warn', 'CORS / Fallback');
    return { ok: false, items: [], reason: 'cors' };
  }
}

/* -------- RSS 解析 -------- */
function parseRssItems(xmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    if (doc.querySelector('parsererror')) return [];
    const nodes = Array.from(doc.querySelectorAll('item'));
    return nodes.map(n => ({
      title:   (n.querySelector('title')?.textContent || '').trim(),
      date:    (n.querySelector('pubDate')?.textContent || '').trim(),
      link:    (n.querySelector('link')?.textContent || '').trim(),
      summary: stripHtml(n.querySelector('description')?.textContent || '')
    }));
  } catch (e) {
    return [];
  }
}

function stripHtml(s) {
  if (!s) return '';
  return String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400);
}

function matchByKeywords(items, destination) {
  if (!destination) return [];
  const keys = [
    destination.city,
    destination.country,
    destination.admin1,
    destination.region
  ].filter(Boolean).map(s => s.toLowerCase());
  if (!keys.length) return [];
  return items.filter(it => {
    const hay = ((it.title || '') + ' ' + (it.summary || '')).toLowerCase();
    return keys.some(k => k && hay.includes(k));
  });
}

/* ============================================================
   風險評估
============================================================ */
function assessWeatherRisk(weatherData) {
  if (!weatherData || !weatherData.daily) {
    return { ok: false };
  }
  const d = weatherData.daily;
  const tMax = (d.temperature_2m_max || []).filter(x => x != null);
  const tMin = (d.temperature_2m_min || []).filter(x => x != null);
  const rain = (d.precipitation_sum || []).filter(x => x != null);
  const wind = (d.wind_speed_10m_max || []).filter(x => x != null);
  const uv   = (d.uv_index_max       || []).filter(x => x != null);

  const max = arr => arr.length ? Math.max(...arr) : null;
  const min = arr => arr.length ? Math.min(...arr) : null;
  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  const maxT = max(tMax);
  const minT = min(tMin);
  const maxRain = max(rain);
  const maxWind = max(wind);
  const maxUv = max(uv);

  // 高溫
  let heatRisk = 'low';
  if (maxT != null) {
    if (maxT >= 35) heatRisk = 'high';
    else if (maxT >= 30) heatRisk = 'mod';
  }
  // 降雨
  let rainRisk = 'low';
  if (maxRain != null) {
    if (maxRain >= 20) rainRisk = 'high';
    else if (maxRain >= 5) rainRisk = 'mod';
  }
  // UV
  let uvRisk = 'unknown';
  if (maxUv != null) {
    if (maxUv >= 8) uvRisk = 'vhigh';
    else if (maxUv >= 6) uvRisk = 'high';
    else if (maxUv >= 3) uvRisk = 'mod';
    else uvRisk = 'low';
  }

  const advice = [];
  if (heatRisk === 'high') {
    advice.push('預期最高氣溫 ≥ 35°C，避免上午 10 點至下午 4 點的長時間戶外活動');
    advice.push('準備寬鬆透氣淺色衣物、遮陽帽；隨身攜帶水壺，少量多次補水');
  } else if (heatRisk === 'mod') {
    advice.push('天氣偏熱，注意補水與防曬，戶外活動安排在清晨或傍晚');
  }
  if (rainRisk === 'high') {
    advice.push('行程期間單日降雨可能 ≥ 20 mm，攜帶折傘 / 雨衣 / 防水鞋套');
    advice.push('注意低窪地段、山區山洪與道路濕滑風險');
  } else if (rainRisk === 'mod') {
    advice.push('部分日期有中等降雨，建議備好雨具');
  }
  if (uvRisk === 'vhigh' || uvRisk === 'high') {
    advice.push('紫外線強，使用 SPF 30+ 防曬霜、太陽鏡、長袖防曬衣');
  } else if (uvRisk === 'mod') {
    advice.push('紫外線中等，外出建議基本防曬');
  }
  if (maxWind != null && maxWind >= 50) {
    advice.push('預期出現大風天氣，注意戶外活動與航班影響');
  }
  if (!advice.length) advice.push('天氣總體溫和，按常規準備衣物即可');

  return {
    ok: true,
    maxT, minT, maxRain, maxWind, maxUv,
    avgT: avg(tMax),
    daily: d,
    heatRisk, rainRisk, uvRisk,
    advice
  };
}

function assessAirQualityRisk(airData, travelerProfile) {
  if (!airData || !airData.hourly) return { ok: false };
  const h = airData.hourly;
  const arr = key => (h[key] || []).filter(x => x != null);
  const pm25 = arr('pm2_5');
  const pm10 = arr('pm10');
  const o3   = arr('ozone');
  const no2  = arr('nitrogen_dioxide');
  const uv   = arr('uv_index');

  const max = a => a.length ? Math.max(...a) : null;
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;

  const pm25Avg = avg(pm25);
  const pm25Max = max(pm25);
  const pm10Max = max(pm10);
  const o3Max   = max(o3);
  const no2Max  = max(no2);
  const uvMax   = max(uv);

  let risk = 'unknown';
  if (pm25Avg != null) {
    if (pm25Avg >= 75) risk = 'high';
    else if (pm25Avg >= 35) risk = 'mod';
    else risk = 'low';
  }

  const sensitive = (travelerProfile || []).some(p =>
    ['respiratory', 'cardio', 'elderly', 'child', 'pregnant'].includes(p)
  );

  const advice = [];
  if (risk === 'high') {
    advice.push('PM2.5 較高，敏感人群減少戶外劇烈活動，必要時佩戴 N95 / KN95 級別口罩');
  } else if (risk === 'mod') {
    advice.push('空氣品質中等，敏感人群外出可佩戴口罩、減少高強度戶外運動');
  } else if (risk === 'low') {
    advice.push('空氣品質總體良好，按常規防護即可');
  }
  if (sensitive) {
    advice.push('呼吸 / 心血管疾病、老年人、孕婦、兒童請密切關注當地空氣品質指數變化');
    advice.push('慢病患者按醫囑攜帶足量常用藥物，並準備醫師聯絡方式');
  }
  advice.push('建議在當地查看實時空氣品質應用，以便靈活調整行程');

  return {
    ok: true,
    pm25Avg, pm25Max, pm10Max, o3Max, no2Max, uvMax,
    risk, advice
  };
}

/* ============================================================
   通用建議生成
============================================================ */
function generateVaccinationAdvice(destination, travelTypes, travelerProfile) {
  const advice = {
    general: [
      '出發前 4 – 8 週諮詢旅行醫學門診或具備旅行接種資質的醫療機構',
      '核對常規疫苗是否完整，包括 MMR（麻腮風）、Tdap（破傷風／白喉／百日咳）、流感、COVID-19 等'
    ],
    consider: [
      '甲型肝炎（食水傳播風險）',
      '乙型肝炎（醫療暴露 / 長期停留）',
      '傷寒（食物與飲水衛生條件較差地區）',
      '狂犬病（戶外活動、可能接觸動物）',
      '日本腦炎（亞洲鄉村、雨林、稻田地區）',
      '黃熱病（部分非洲、南美國家入境要求 — 請確認證書要求）',
      '瘧疾預防（不是疫苗，需處方藥，請務必諮詢醫生）'
    ],
    notes: []
  };

  const types = travelTypes || [];
  if (types.includes('rural') || types.includes('outdoor') || types.includes('long-stay') || types.includes('vfr')) {
    advice.notes.push('鄉村 / 雨林 / 戶外 / 探親訪友 / 長期停留：加強蚊媒疾病防護（含登革熱、瘧疾、寨卡、日本腦炎等）');
    advice.notes.push('注意動物咬傷風險，被咬後立即用流動清水沖洗 15 分鐘，並儘速就醫評估狂犬病暴露後處置');
    advice.notes.push('注意食品飲水安全：選擇煮沸 / 瓶裝水，避免生食、未經削皮水果與街邊冷飲');
  }
  if (types.includes('cruise')) {
    advice.notes.push('郵輪：諾如病毒、流感等聚集性疾病風險較高，注意手部衛生與症狀自查');
  }
  if (types.includes('academic') || types.includes('business')) {
    advice.notes.push('會議 / 商務：行前確認有效保險、緊急聯絡方式與雇主提供的醫療資源');
  }

  const profile = travelerProfile || [];
  if (profile.includes('pregnant')) {
    advice.notes.push('孕婦：部分活疫苗（如黃熱病、MMR）一般不建議，請務必由產科 / 旅行醫學醫生個體化評估');
    advice.notes.push('關注目的地蚊媒疾病風險（如寨卡）以及航空公司妊娠期乘機規定');
  }
  if (profile.includes('immuno') || profile.includes('chronic')) {
    advice.notes.push('免疫低下 / 慢病患者：活疫苗使用受限，需由主治醫生與旅行醫學門診共同評估');
  }
  if (profile.includes('child')) {
    advice.notes.push('兒童：核對常規免疫接種程序進度，部分疫苗有最低年齡限制');
  }
  if (profile.includes('elderly')) {
    advice.notes.push('老年人：建議追加流感疫苗與肺炎球菌疫苗（按當地建議）');
  }

  advice.notes.push('請查詢目的地使領館、官方衛生部門最新入境健康文件要求（含黃熱病國際接種證書 ICVP 等）');

  return advice;
}

function generateMedicalKitChecklist(travelTypes, travelerProfile) {
  const types = travelTypes || [];
  const profile = travelerProfile || [];
  const base = [
    '個人常用藥（含足量備份）',
    '處方藥原包裝與英文說明 / 醫生處方影本',
    '退熱止痛藥（如撲熱息痛 / 布洛芬，遵醫囑）',
    '腹瀉處理用品（含電解質補充與止瀉備用藥）',
    '口服補液鹽（ORS）',
    '抗過敏藥',
    '創可貼、紗布、彈性繃帶',
    '消毒濕巾 / 酒精棉片 / 免洗洗手液',
    '防曬用品（SPF 30+ 防曬霜、太陽鏡、寬簷帽）',
    '防蚊用品（含 DEET 或 Picaridin 驅蚊劑、長袖衣物）',
    '電子體溫計',
    '旅行醫療保險文件影本與電子備份',
    '緊急聯絡方式：家人、本國使領館、目的地急救電話',
    '當地醫療機構與藥房資訊（行前查好附近醫院）'
  ];
  const extra = [];
  if (types.includes('rural') || types.includes('outdoor')) {
    extra.push('鄉村 / 戶外：強效驅蚊劑、含 Permethrin 的衣物處理劑、戶外急救包、止血帶');
    extra.push('蚊帳或預處理睡袋（前往瘧疾流行區）');
  }
  if (types.includes('long-stay')) {
    extra.push('長期停留：較大量常用藥儲備、目的地醫療系統與保險網絡資訊');
  }
  if (profile.includes('child')) {
    extra.push('兒童：兒童劑量退熱藥、兒童補液鹽、體溫計、奶瓶清潔用品');
  }
  if (profile.includes('elderly') || profile.includes('chronic')) {
    extra.push('老年人 / 慢病患者：慢病藥物備份（建議帶夠 2 週以上）、英文病歷摘要與用藥單、近期心電圖 / 報告複印件');
  }
  if (profile.includes('pregnant')) {
    extra.push('孕婦：產檢資料英文摘要、目的地產科醫療機構資訊、航空公司孕期乘機規則核對');
  }
  if (profile.includes('respiratory') || profile.includes('cardio')) {
    extra.push('呼吸 / 心血管疾病：足量吸入劑 / 心血管常用藥、N95 / KN95 口罩、便攜血壓計');
  }
  if (profile.includes('immuno')) {
    extra.push('免疫功能低下：個體化諮詢醫生制定隨身藥物與感染預警方案');
  }
  return { base, extra };
}

function generateFlightHealthAdvice(flightDuration, travelerProfile) {
  const profile = travelerProfile || [];
  const tips = [];
  const long = flightDuration === '6-10' || flightDuration === '>10';

  if (long) {
    tips.push('避免長時間靜坐：每 1 – 2 小時起身或在座位上活動下肢');
    tips.push('做小腿泵運動：踝關節屈伸、足跟提升，預防下肢深靜脈血栓（DVT）');
    tips.push('適量飲水，避免過量飲酒與含咖啡因飲料');
    tips.push('考慮穿著梯度壓力襪（醫療等級需諮詢醫生）');
    if (profile.includes('chronic') || profile.includes('cardio') || profile.includes('pregnant')) {
      tips.push('血栓風險、近期手術、孕婦、嚴重慢病者請務必行前諮詢醫生關於 DVT 預防');
    }
  } else if (flightDuration === '3-6') {
    tips.push('中長途飛行建議定期活動下肢、適量補水');
  } else if (flightDuration === '<3') {
    tips.push('短途飛行整體風險較低，注意常規補水與耳壓平衡');
  }

  tips.push('時差調整：抵達後按目的地時間作息，白天適當接觸自然光，避免抵達當日睡得過早或過晚');
  tips.push('機艙乾燥：使用保濕鼻噴 / 滴眼液，避免長時間佩戴隱形眼鏡');
  tips.push('耳壓不適：起降時可吞咽、咀嚼口香糖或捏鼻鼓氣（瓦氏動作）；感冒鼻塞者起降時可考慮減充血劑（諮詢醫生）');
  tips.push('行李攜帶：必備藥物、處方影本、行動電源、轉接頭請放隨身行李，不要託運');

  return tips;
}

function generatePostTravelObservations() {
  return [
    '發熱（尤其熱帶 / 瘧疾流行區回程後一年內任何不明發熱，必須告知醫生旅行史）',
    '持續腹瀉（超過 48 小時或伴脫水、便血）',
    '皮疹（不明原因或伴隨發熱、關節疼痛）',
    '黃疸（皮膚、鞏膜變黃）',
    '呼吸困難或胸痛',
    '嚴重頭痛、頸部僵硬、意識改變',
    '動物咬傷或抓傷（即使已在當地處理，仍應評估後續暴露後處置）',
    '不明原因乏力、體重下降、夜間盜汗'
  ];
}

/* ============================================================
   組裝完整報告
============================================================ */
async function generateTravelHealthPack(form, geo) {
  const data = {
    form, geo,
    createdAt: nowStr(),
    weather: null, weatherRisk: null,
    air: null, airRisk: null,
    cdc: null, who: null, govuk: null, gdacs: null,
    vaccines: null, kit: null, flight: null, post: null
  };

  const dest = {
    city: geo.name || form.destCity,
    country: geo.country || form.destCountry || '',
    admin1: geo.admin1 || '',
    region: ''
  };

  // 並行請求
  const [weatherData, airData, cdc, who, govuk, gdacs] = await Promise.all([
    fetchWeatherRisk(geo.latitude, geo.longitude, form.departureDate, form.stayDays),
    fetchAirQualityRisk(geo.latitude, geo.longitude),
    fetchCdcTravelNotices(dest),
    fetchWhoOutbreakNews(dest),
    fetchGovUkTravelAdvice(dest.country),
    fetchGdacsAlerts(dest, geo.latitude, geo.longitude)
  ]);

  data.weather = weatherData;
  data.weatherRisk = assessWeatherRisk(weatherData);
  data.air = airData;
  data.airRisk = assessAirQualityRisk(airData, form.travelerProfile);
  data.cdc = cdc;
  data.who = who;
  data.govuk = govuk;
  data.gdacs = gdacs;
  data.vaccines = generateVaccinationAdvice(dest, form.travelTypes, form.travelerProfile);
  data.kit = generateMedicalKitChecklist(form.travelTypes, form.travelerProfile);
  data.flight = generateFlightHealthAdvice(form.flightDuration, form.travelerProfile);
  data.post = generatePostTravelObservations();
  data.dest = dest;

  return data;
}

/* ============================================================
   渲染
============================================================ */
const RISK_LABEL = {
  low: { txt: '低風險 Low', cls: 'risk-low' },
  mod: { txt: '中風險 Moderate', cls: 'risk-mod' },
  high: { txt: '高風險 High', cls: 'risk-high' },
  vhigh: { txt: '很高 Very High', cls: 'risk-vhigh' },
  unknown: { txt: '資料不足 Unknown', cls: 'risk-unknown' }
};
const riskBadge = key => {
  const r = RISK_LABEL[key] || RISK_LABEL.unknown;
  return `<span class="risk-badge ${r.cls}">${r.txt}</span>`;
};

const TYPE_LABEL = {
  city: '城市旅遊', business: '商務旅行', vfr: '探親訪友', academic: '研學/會議',
  rural: '鄉村/雨林/自然', outdoor: '徒步/戶外', cruise: '郵輪', 'long-stay': '長期停留'
};
const PROFILE_LABEL = {
  adult: '成人', child: '兒童', elderly: '老年人', pregnant: '孕婦',
  chronic: '慢性病', respiratory: '呼吸系統疾病', cardio: '心血管疾病', immuno: '免疫低下'
};

function renderTravelHealthPack(report) {
  const { form, geo, dest } = report;

  // A. Overview
  const ov = $('#overviewGrid');
  ov.innerHTML = `
    <div class="info-cell"><div class="k">城市 City</div><div class="v">${esc(dest.city)}</div></div>
    <div class="info-cell"><div class="k">國家 Country</div><div class="v">${esc(dest.country || '—')}</div></div>
    <div class="info-cell"><div class="k">區域 Region</div><div class="v">${esc(dest.admin1 || '—')}</div></div>
    <div class="info-cell"><div class="k">座標 Lat / Lon</div><div class="v">${geo.latitude.toFixed(3)} / ${geo.longitude.toFixed(3)}</div></div>
    <div class="info-cell"><div class="k">時區 Timezone</div><div class="v">${esc(geo.timezone || '—')}</div></div>
    <div class="info-cell"><div class="k">出發日期 Departure</div><div class="v">${esc(form.departureDate || '—')}</div></div>
    <div class="info-cell"><div class="k">停留 Stay</div><div class="v">${form.stayDays} <small>天</small></div></div>
    <div class="info-cell"><div class="k">飛行 Flight</div><div class="v">${esc(form.flightDuration || '—')}</div></div>
    <div class="info-cell" style="grid-column:1/-1;"><div class="k">旅行類型 Types</div><div class="v" style="font-size:13px;font-weight:400;">
      ${form.travelTypes.length ? form.travelTypes.map(t => esc(TYPE_LABEL[t] || t)).join(' · ') : '<span style="color:#888;">未選擇</span>'}
    </div></div>
    <div class="info-cell" style="grid-column:1/-1;"><div class="k">人群特徵 Profile</div><div class="v" style="font-size:13px;font-weight:400;">
      ${form.travelerProfile.length ? form.travelerProfile.map(t => esc(PROFILE_LABEL[t] || t)).join(' · ') : '<span style="color:#888;">未選擇</span>'}
    </div></div>
  `;

  // B. Weather
  const wb = $('#weatherBody');
  if (!report.weatherRisk?.ok) {
    wb.innerHTML = `<p class="empty-note">天氣資料暫不可用，請稍後重試或檢查網絡。</p>`;
  } else {
    const w = report.weatherRisk;
    wb.innerHTML = `
      <div class="metric-grid">
        <div class="metric"><div class="metric-label">最高氣溫</div><div class="metric-value">${w.maxT?.toFixed(1)}<small>°C</small></div></div>
        <div class="metric"><div class="metric-label">最低氣溫</div><div class="metric-value">${w.minT?.toFixed(1)}<small>°C</small></div></div>
        <div class="metric"><div class="metric-label">最大降雨</div><div class="metric-value">${w.maxRain?.toFixed(1)}<small>mm</small></div></div>
        <div class="metric"><div class="metric-label">最大風速</div><div class="metric-value">${w.maxWind?.toFixed(1)}<small>km/h</small></div></div>
        <div class="metric"><div class="metric-label">最大 UV</div><div class="metric-value">${w.maxUv != null ? w.maxUv.toFixed(1) : '—'}</div></div>
      </div>
      <div class="risk-row" style="margin-top:18px;">
        <div class="risk-tile"><span class="lab">高溫風險</span>${riskBadge(w.heatRisk)}</div>
        <div class="risk-tile"><span class="lab">降雨風險</span>${riskBadge(w.rainRisk)}</div>
        <div class="risk-tile"><span class="lab">紫外線風險</span>${riskBadge(w.uvRisk)}</div>
      </div>
      <ul>${w.advice.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
    `;
  }

  // C. Air Quality
  const ab = $('#airBody');
  if (!report.airRisk?.ok) {
    ab.innerHTML = `<p class="empty-note">空氣品質資料暫不可用，請稍後重試。</p>`;
  } else {
    const a = report.airRisk;
    ab.innerHTML = `
      <div class="metric-grid">
        <div class="metric"><div class="metric-label">PM2.5 平均</div><div class="metric-value">${a.pm25Avg != null ? a.pm25Avg.toFixed(1) : '—'}<small>µg/m³</small></div></div>
        <div class="metric"><div class="metric-label">PM2.5 峰值</div><div class="metric-value">${a.pm25Max != null ? a.pm25Max.toFixed(1) : '—'}<small>µg/m³</small></div></div>
        <div class="metric"><div class="metric-label">PM10 峰值</div><div class="metric-value">${a.pm10Max != null ? a.pm10Max.toFixed(1) : '—'}<small>µg/m³</small></div></div>
        <div class="metric"><div class="metric-label">O₃ 峰值</div><div class="metric-value">${a.o3Max != null ? a.o3Max.toFixed(0) : '—'}<small>µg/m³</small></div></div>
        <div class="metric"><div class="metric-label">NO₂ 峰值</div><div class="metric-value">${a.no2Max != null ? a.no2Max.toFixed(0) : '—'}<small>µg/m³</small></div></div>
      </div>
      <div class="risk-row" style="margin-top:18px;">
        <div class="risk-tile"><span class="lab">空氣品質風險</span>${riskBadge(a.risk)}</div>
      </div>
      <ul>${a.advice.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    `;
  }

  // D. CDC
  $('#cdcBody').innerHTML = renderNewsCard(report.cdc, {
    sourceName: 'CDC Travelers\' Health Notices',
    fallbackUrl: 'https://wwwnc.cdc.gov/travel/notices',
    corsHint: '由於瀏覽器跨域限制，CDC RSS 可能需要通過 serverless proxy 讀取。已保留接口與 fallback。',
    emptyHint: '未在最新 CDC Travel Health Notices 中找到明確匹配，但仍建議出發前查看 CDC Travelers\' Health 目的地頁面。'
  });

  // E. WHO
  $('#whoBody').innerHTML = renderNewsCard(report.who, {
    sourceName: 'WHO Disease Outbreak News',
    fallbackUrl: 'https://www.who.int/emergencies/disease-outbreak-news',
    corsHint: '由於瀏覽器跨域限制或 API 結構變動，WHO 暴發新聞可能需要通過 serverless proxy 讀取。',
    emptyHint: '未在最新 WHO Disease Outbreak News 中找到明確匹配。'
  });

  // F. GOV.UK
  const gb = $('#govukBody');
  if (report.govuk?.ok) {
    gb.innerHTML = `
      <p><strong>${esc(report.govuk.title)}</strong></p>
      ${report.govuk.summary ? `<p>${esc(report.govuk.summary)}</p>` : ''}
      <p style="font-size:12px;color:#888;">最後更新：${esc(report.govuk.updated || '—')}</p>
      <p>原始連結：<a href="${esc(report.govuk.link)}" target="_blank" rel="noopener">${esc(report.govuk.link)}</a></p>
      <p class="empty-note">注意：GOV.UK 為英國政府視角，不能作為唯一依據。請同時查閱目的地官方、本國外交部與航空公司網站。</p>
    `;
  } else {
    gb.innerHTML = `<p class="empty-note">GOV.UK 旅行建議暫不可用（CORS 或國家名 slug 不匹配）。請直接訪問
      <a href="https://www.gov.uk/foreign-travel-advice" target="_blank" rel="noopener">gov.uk/foreign-travel-advice</a>。</p>`;
  }

  // G. GDACS
  $('#gdacsBody').innerHTML = renderNewsCard(report.gdacs, {
    sourceName: 'GDACS Disaster Alerts',
    fallbackUrl: 'https://www.gdacs.org/',
    corsHint: '由於跨域限制，GDACS RSS 可能無法直接讀取。已保留 proxy 接口與 fallback。',
    emptyHint: '未在最新 GDACS 提醒中找到目的地附近的事件。'
  });

  // H. Vaccines
  const vb = $('#vaccineBody');
  vb.innerHTML = `
    <p style="color:#a32a1f;font-size:13px;"><strong>提醒：</strong>下列為一般教育性提醒，<b>不構成個人接種建議</b>。具體疫苗、藥物與是否接種，請務必諮詢旅行醫學門診醫生。</p>
    <p style="font-weight:600;margin-top:14px;">通用提醒</p>
    <ul>${report.vaccines.general.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <p style="font-weight:600;margin-top:14px;">可能需要諮詢的旅行相關接種 / 預防</p>
    <ul>${report.vaccines.consider.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    ${report.vaccines.notes.length ? `
      <p style="font-weight:600;margin-top:14px;">基於旅行類型與人群特徵的補充提醒</p>
      <ul>${report.vaccines.notes.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    ` : ''}
  `;

  // I. Kit
  const kb = $('#kitBody');
  kb.innerHTML = `
    <p style="font-weight:600;">基礎清單</p>
    <ul>${report.kit.base.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    ${report.kit.extra.length ? `
      <p style="font-weight:600;margin-top:14px;">基於行程與人群的補充項目</p>
      <ul>${report.kit.extra.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    ` : ''}
  `;

  // J. Flight
  $('#flightBody').innerHTML = `<ul>${report.flight.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;

  // K. Post-travel
  $('#postBody').innerHTML = `
    <p>若旅行後出現以下症狀，請及時就醫並<strong>主動告知近期旅行史</strong>：</p>
    <ul>${report.post.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
  `;

  // 顯示
  $('#loadingBlock').classList.add('hidden');
  $('#resultContent').classList.remove('hidden');
}

function renderNewsCard(payload, opts) {
  if (!payload) return `<p class="empty-note">該資料源暫不可用。</p>`;
  if (!payload.ok && payload.reason === 'cors') {
    return `<p class="empty-note">${esc(opts.corsHint)}</p>
      <p>原始連結：<a href="${esc(opts.fallbackUrl)}" target="_blank" rel="noopener">${esc(opts.fallbackUrl)}</a></p>`;
  }
  if (!payload.ok) {
    return `<p class="empty-note">該資料源暫不可用：${esc(payload.reason || 'unknown')}。</p>
      <p>原始連結：<a href="${esc(opts.fallbackUrl)}" target="_blank" rel="noopener">${esc(opts.fallbackUrl)}</a></p>`;
  }
  if (!payload.matched || !payload.matched.length) {
    return `<p class="empty-note">${esc(opts.emptyHint)}</p>
      <p>已掃描 ${payload.items.length} 條最新通知。原始連結：
      <a href="${esc(opts.fallbackUrl)}" target="_blank" rel="noopener">${esc(opts.fallbackUrl)}</a></p>`;
  }
  const top = payload.matched.slice(0, 5);
  return `<ul class="news-list">
    ${top.map(it => `<li>
      <span class="title">${esc(it.title)}</span>
      <div class="meta">${esc(it.date || '')}</div>
      ${it.summary ? `<div class="summary">${esc(it.summary)}</div>` : ''}
      ${it.link ? `<a href="${esc(it.link)}" target="_blank" rel="noopener">查看原文 →</a>` : ''}
    </li>`).join('')}
  </ul>
  <p style="font-size:12px;color:#888;margin-top:12px;">已掃描 ${payload.items.length} 條 / 命中 ${payload.matched.length} 條。</p>`;
}

/* ============================================================
   Markdown 報告 + 複製 / 下載
============================================================ */
function buildMarkdown(report) {
  const { form, geo, dest } = report;
  const lines = [];
  lines.push(`# 國際旅行健康包 / International Travel Health Pack\n`);
  lines.push(`> 生成時間：${report.createdAt}\n`);
  lines.push(`## 1. 旅行資訊`);
  lines.push(`- 出發地：${form.originCity || '—'}`);
  lines.push(`- 目的地：${dest.city}${dest.country ? ', ' + dest.country : ''}`);
  lines.push(`- 區域：${dest.admin1 || '—'}`);
  lines.push(`- 座標：${geo.latitude.toFixed(3)} / ${geo.longitude.toFixed(3)}`);
  lines.push(`- 時區：${geo.timezone || '—'}`);
  lines.push(`- 出發日期：${form.departureDate || '—'}`);
  lines.push(`- 停留天數：${form.stayDays}`);
  lines.push(`- 飛行時間：${form.flightDuration || '—'}`);
  lines.push(`- 旅行類型：${form.travelTypes.map(t => TYPE_LABEL[t] || t).join(' / ') || '—'}`);
  lines.push(`- 人群特徵：${form.travelerProfile.map(t => PROFILE_LABEL[t] || t).join(' / ') || '—'}\n`);

  lines.push(`## 2. 資料源與請求時間`);
  Object.entries({
    'Open-Meteo Geocoding': STATE.timestamps.geo,
    'Open-Meteo Weather': STATE.timestamps.weather,
    'Open-Meteo Air Quality': STATE.timestamps.air,
    'CDC Travel Notices': STATE.timestamps.cdc,
    'WHO Disease Outbreak News': STATE.timestamps.who,
    'GOV.UK Travel Advice': STATE.timestamps.govuk,
    'GDACS Alerts': STATE.timestamps.gdacs
  }).forEach(([k, v]) => lines.push(`- ${k}: ${v || '未請求'}`));
  lines.push('');

  // Weather
  lines.push(`## 3. 天氣與氣候風險`);
  if (report.weatherRisk?.ok) {
    const w = report.weatherRisk;
    lines.push(`- 最高氣溫：${w.maxT?.toFixed(1)} °C`);
    lines.push(`- 最低氣溫：${w.minT?.toFixed(1)} °C`);
    lines.push(`- 最大日降雨：${w.maxRain?.toFixed(1)} mm`);
    lines.push(`- 最大風速：${w.maxWind?.toFixed(1)} km/h`);
    lines.push(`- 最大 UV：${w.maxUv != null ? w.maxUv.toFixed(1) : '—'}`);
    lines.push(`- 高溫風險：${RISK_LABEL[w.heatRisk].txt}`);
    lines.push(`- 降雨風險：${RISK_LABEL[w.rainRisk].txt}`);
    lines.push(`- 紫外線風險：${RISK_LABEL[w.uvRisk].txt}`);
    lines.push(`\n建議：`);
    w.advice.forEach(a => lines.push(`- ${a}`));
  } else {
    lines.push(`- 該資料源暫不可用`);
  }
  lines.push('');

  // Air
  lines.push(`## 4. 空氣品質風險`);
  if (report.airRisk?.ok) {
    const a = report.airRisk;
    lines.push(`- PM2.5 平均：${a.pm25Avg != null ? a.pm25Avg.toFixed(1) : '—'} µg/m³`);
    lines.push(`- PM2.5 峰值：${a.pm25Max != null ? a.pm25Max.toFixed(1) : '—'} µg/m³`);
    lines.push(`- PM10 峰值：${a.pm10Max != null ? a.pm10Max.toFixed(1) : '—'} µg/m³`);
    lines.push(`- O₃ 峰值：${a.o3Max != null ? a.o3Max.toFixed(0) : '—'} µg/m³`);
    lines.push(`- NO₂ 峰值：${a.no2Max != null ? a.no2Max.toFixed(0) : '—'} µg/m³`);
    lines.push(`- 空氣品質風險：${RISK_LABEL[a.risk].txt}`);
    lines.push(`\n建議：`);
    a.advice.forEach(x => lines.push(`- ${x}`));
  } else {
    lines.push(`- 該資料源暫不可用`);
  }
  lines.push('');

  // CDC / WHO / GOV.UK / GDACS
  lines.push(`## 5. CDC Travel Health Notices`);
  appendNewsMd(lines, report.cdc, '未找到匹配 / 該資料源暫不可用');
  lines.push(`\n## 6. WHO Disease Outbreak News`);
  appendNewsMd(lines, report.who, '未找到匹配 / 該資料源暫不可用');
  lines.push(`\n## 7. GOV.UK Travel Advice`);
  if (report.govuk?.ok) {
    lines.push(`- ${report.govuk.title}`);
    if (report.govuk.summary) lines.push(`- ${report.govuk.summary}`);
    lines.push(`- 連結：${report.govuk.link}`);
  } else {
    lines.push(`- 該資料源暫不可用`);
  }
  lines.push(`\n## 8. GDACS Disaster Alerts`);
  appendNewsMd(lines, report.gdacs, '未找到匹配 / 該資料源暫不可用');
  lines.push('');

  // Vaccines
  lines.push(`## 9. 疫苗與旅行門診提醒`);
  lines.push(`> 提醒：以下為教育性建議，不構成個人接種處方。請諮詢旅行醫學門診。\n`);
  lines.push(`### 通用`);
  report.vaccines.general.forEach(x => lines.push(`- ${x}`));
  lines.push(`\n### 可能需要諮詢的接種 / 預防`);
  report.vaccines.consider.forEach(x => lines.push(`- ${x}`));
  if (report.vaccines.notes.length) {
    lines.push(`\n### 基於旅行類型與人群特徵的補充`);
    report.vaccines.notes.forEach(x => lines.push(`- ${x}`));
  }
  lines.push('');

  // Kit
  lines.push(`## 10. 旅行藥品包清單`);
  report.kit.base.forEach(x => lines.push(`- [ ] ${x}`));
  if (report.kit.extra.length) {
    lines.push(`\n### 補充項目`);
    report.kit.extra.forEach(x => lines.push(`- [ ] ${x}`));
  }
  lines.push('');

  // Flight
  lines.push(`## 11. 飛行健康提醒`);
  report.flight.forEach(x => lines.push(`- ${x}`));
  lines.push('');

  // Post-travel
  lines.push(`## 12. 回程後症狀觀察`);
  lines.push(`若旅行後出現以下症狀，請及時就醫並主動告知近期旅行史：`);
  report.post.forEach(x => lines.push(`- ${x}`));
  lines.push('');

  // Disclaimer
  lines.push(`---\n## 免責聲明`);
  lines.push(`本工具僅供旅行健康教育與出行準備參考，不能替代醫生、旅行醫學門診、官方入境要求、簽證規定或疫苗接種機構建議。`);
  lines.push(`所有疫苗、藥物、入境健康文件、簽證和法律要求必須以官方機構和專業醫療建議為準。`);
  lines.push(`本工具不收集、不保存任何用戶資料。`);

  return lines.join('\n');
}

function appendNewsMd(lines, payload, emptyMsg) {
  if (!payload || !payload.ok || !payload.matched || !payload.matched.length) {
    lines.push(`- ${emptyMsg}`);
    return;
  }
  payload.matched.slice(0, 5).forEach(it => {
    lines.push(`- **${it.title}**`);
    if (it.date) lines.push(`  - 日期：${it.date}`);
    if (it.summary) lines.push(`  - 摘要：${it.summary}`);
    if (it.link) lines.push(`  - 連結：${it.link}`);
  });
}

async function copyReportToClipboard() {
  if (!STATE.result) return;
  const md = buildMarkdown(STATE.result);
  try {
    await navigator.clipboard.writeText(md);
    flashBtn('#copyBtn', '✓ 已複製');
  } catch (e) {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = md;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); flashBtn('#copyBtn', '✓ 已複製'); } catch (_) { alert('複製失敗，請手動下載'); }
    document.body.removeChild(ta);
  }
}

function flashBtn(sel, text) {
  const btn = $(sel);
  if (!btn) return;
  const orig = btn.textContent;
  btn.textContent = text;
  setTimeout(() => { btn.textContent = orig; }, 1600);
}

function downloadMarkdownReport() {
  if (!STATE.result) return;
  const md = buildMarkdown(STATE.result);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dest = STATE.result.dest;
  const safe = (dest.city || 'destination').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  a.href = url;
  a.download = `travel-health-pack-${safe}-${fmtDate(new Date())}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function resetForm() {
  $('#travelForm').reset();
  $$('#travelTypes input, #travelerProfile input').forEach(i => i.checked = false);
  $('#geoCandidates').classList.remove('show');
  $('#statusSection').classList.add('hidden');
  $('#resultSection').classList.add('hidden');
  $('#resultContent').classList.add('hidden');
  $('#loadingBlock').classList.remove('hidden');
  // 重置狀態 badge
  $$('.status-item .badge').forEach(b => { b.className = 'badge idle'; b.textContent = '待請求'; });
  STATE.form = null; STATE.geo = null; STATE.candidates = []; STATE.result = null;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ============================================================
   表單流程
============================================================ */
function readForm() {
  return {
    originCity: $('#originCity').value.trim(),
    destCity:   $('#destCity').value.trim(),
    destCountry: $('#destCountry').value.trim(),
    departureDate: $('#departureDate').value,
    stayDays: parseInt($('#stayDays').value, 10) || 7,
    flightDuration: $('#flightDuration').value,
    travelTypes: $$('#travelTypes input:checked').map(i => i.value),
    travelerProfile: $$('#travelerProfile input:checked').map(i => i.value)
  };
}

function showCandidates(list) {
  const wrap = $('#geoCandidates');
  const box = $('#geoCandidateList');
  box.innerHTML = list.map((r, i) => `
    <div class="geo-candidate" data-idx="${i}">
      <strong>${esc(r.name)}</strong>${r.admin1 ? ' · ' + esc(r.admin1) : ''}${r.country ? ' · ' + esc(r.country) : ''}
      <small style="color:#888;margin-left:8px;">(${r.latitude.toFixed(2)}, ${r.longitude.toFixed(2)})</small>
    </div>
  `).join('');
  wrap.classList.add('show');
  box.querySelectorAll('.geo-candidate').forEach(el => {
    el.addEventListener('click', () => {
      box.querySelectorAll('.geo-candidate').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      const idx = +el.dataset.idx;
      STATE.geo = list[idx];
      runFullPipeline();
    });
  });
}

async function handleGenerate() {
  const form = readForm();
  if (!form.destCity) {
    alert('請填寫目的地城市');
    return;
  }
  STATE.form = form;
  STATE.geo = null;
  $('#geoCandidates').classList.remove('show');
  // 顯示狀態與 loading
  $('#statusSection').classList.remove('hidden');
  $('#resultSection').classList.remove('hidden');
  $('#loadingBlock').classList.remove('hidden');
  $('#resultContent').classList.add('hidden');
  $$('.status-item .badge').forEach(b => { b.className = 'badge idle'; b.textContent = '待請求'; });

  const candidates = await geocodeDestination(form.destCity, form.destCountry);
  if (!candidates.length) {
    $('#loadingBlock').innerHTML = `<p style="color:#a32a1f;">未找到匹配地點。請嘗試使用英文城市名（如 Bangkok / Tokyo / Paris），並補充國家名以提高準確度。</p>`;
    return;
  }
  if (candidates.length === 1) {
    STATE.geo = candidates[0];
    await runFullPipeline();
  } else {
    STATE.candidates = candidates;
    showCandidates(candidates);
    $('#loadingBlock').innerHTML = `<p style="color:#888;">找到 ${candidates.length} 個匹配地點，請在表單下方選擇正確的城市以繼續。</p>`;
    // 滾動到候選區
    $('#geoCandidates').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

async function runFullPipeline() {
  $('#loadingBlock').classList.remove('hidden');
  $('#loadingBlock').innerHTML = `<span class="spinner"></span> 正在請求公開資料源並生成報告，請稍候…`;
  $('#resultContent').classList.add('hidden');
  $('#resultSection').scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const report = await generateTravelHealthPack(STATE.form, STATE.geo);
    STATE.result = report;
    renderTravelHealthPack(report);
  } catch (e) {
    console.error(e);
    $('#loadingBlock').innerHTML = `<p style="color:#a32a1f;">生成報告時發生錯誤：${esc(e.message || e)}。請重試。</p>`;
  }
}

/* ============================================================
   初始化
============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // 預設出發日期 = 今天
  const today = new Date();
  $('#departureDate').value = fmtDate(today);

  $('#generateBtn').addEventListener('click', handleGenerate);
  $('#resetBtn').addEventListener('click', resetForm);
  $('#resetBtn2')?.addEventListener('click', resetForm);
  $('#copyBtn')?.addEventListener('click', copyReportToClipboard);
  $('#downloadBtn')?.addEventListener('click', downloadMarkdownReport);

  // 將 reset 按鈕的事件代理到生成完成後出現的按鈕
  document.addEventListener('click', e => {
    if (e.target.id === 'resetBtn2') resetForm();
    if (e.target.id === 'copyBtn') copyReportToClipboard();
    if (e.target.id === 'downloadBtn') downloadMarkdownReport();
  });
});

/* ============================================================
   第二版預留
   ------------------------------------------------------------
   1) Serverless proxy
      建議路徑：/api/proxy?source=cdcRss|whoDon|govuk|gdacs
      將上方 DATA_PROXY 中對應 key 設為該 URL 即可啟用。

   2) 更多官方資料源
      - 中國疾控中心、目的地衛生部門新聞
      - 本國外交部旅行警示（如 fmprc.gov.cn / mofa.gov.tw 等）
      - 航空公司孕期 / 嬰幼兒乘機規定 API

   3) 離線靜態目的地風險庫
      const LOCAL_RISK_DB = { 'thailand': {...}, 'japan': {...} };
      若所有 API 失敗，按國家名 fallback 顯示靜態風險摘要。
============================================================ */
