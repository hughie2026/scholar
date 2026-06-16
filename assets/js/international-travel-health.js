/* ============================================================
 * International Travel Health Pack Generator
 * Hughie's Online Lab · Pure-frontend, no account required
 * ============================================================ */
(function () {
  'use strict';

  // ============== CONFIG ==============
  const FETCH_TIMEOUT = 15000;
  // CORS proxies for sources without CORS headers (CDC/WHO/GDACS RSS)
  const CORS_PROXIES = [
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  ];

  // ============== STATE ==============
  const state = {
    destination: null,        // Open-Meteo geocoding result
    candidates: [],
    selectedCandidateIdx: -1,
    form: null,
    results: {},
  };

  // ============== TINY HELPERS ==============
  const $ = (id) => document.getElementById(id);

  function htmlEscape(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function setStatus(src, status, label) {
    const el = document.querySelector(`.status-item[data-src="${src}"] .badge`);
    if (!el) return;
    el.className = 'badge ' + status;
    el.textContent = label;
  }

  function getCheckedValues(containerId) {
    return Array.from(
      document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`)
    ).map((i) => i.value);
  }

  function fmtDate(d) {
    if (!d) return '';
    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt)) return '';
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  async function fetchWithTimeout(url, opts = {}, timeout = FETCH_TIMEOUT) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeout);
    try {
      return await fetch(url, { ...opts, signal: ctrl.signal });
    } finally {
      clearTimeout(tid);
    }
  }

  async function tryFetch(url, asText = false) {
    // Direct
    try {
      const res = await fetchWithTimeout(url);
      if (res.ok) return asText ? await res.text() : await res.json();
    } catch (_) { /* fall through */ }
    // Through proxies
    for (const fn of CORS_PROXIES) {
      try {
        const res = await fetchWithTimeout(fn(url));
        if (res.ok) return asText ? await res.text() : await res.json();
      } catch (_) { /* try next */ }
    }
    throw new Error('fetch failed: ' + url);
  }

  // ============== COUNTRY UTILITIES ==============
  function slugifyCountry(name) {
    if (!name) return '';
    return name.trim().toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function countryToGovukSlug(input) {
    if (!input) return '';
    const s = input.trim().toLowerCase();
    const aliases = {
      'usa': 'usa', 'us': 'usa', 'u.s.': 'usa',
      'united states': 'usa', 'united states of america': 'usa', 'america': 'usa',
      'south korea': 'south-korea', 'korea': 'south-korea', 'republic of korea': 'south-korea',
      'north korea': 'north-korea',
      'hong kong': 'hong-kong',
      'czech republic': 'czechia',
      'uae': 'united-arab-emirates',
      'taiwan': 'taiwan',
      'russia': 'russia',
      'ivory coast': 'cote-d-ivoire',
      'cote d\'ivoire': 'cote-d-ivoire',
    };
    return aliases[s] || slugifyCountry(input);
  }

  // Region mappings used for vaccine/medication recommendations
  const REGIONS = {
    africa_yf: ['angola','benin','burkina faso','burundi','cameroon','central african republic','chad','congo','democratic republic of the congo','drc','equatorial guinea','ethiopia','gabon','gambia','ghana','guinea','guinea-bissau','ivory coast','cote d\'ivoire','kenya','liberia','mali','mauritania','niger','nigeria','rwanda','senegal','sierra leone','south sudan','sudan','togo','uganda'],
    south_america_yf: ['argentina','bolivia','brazil','colombia','ecuador','french guiana','guyana','panama','paraguay','peru','suriname','venezuela','trinidad and tobago'],
    asia_je: ['bangladesh','bhutan','brunei','cambodia','china','india','indonesia','japan','laos','malaysia','myanmar','nepal','north korea','pakistan','papua new guinea','philippines','singapore','south korea','sri lanka','taiwan','thailand','timor-leste','vietnam'],
    malaria_high: ['nigeria','democratic republic of the congo','drc','uganda','mozambique','niger','burkina faso','ghana','cameroon','tanzania','mali','angola','ivory coast','cote d\'ivoire','kenya','papua new guinea','sierra leone','liberia','benin','togo','sudan','south sudan','ethiopia','rwanda','burundi','zambia','malawi'],
    dengue_endemic: ['thailand','vietnam','cambodia','laos','myanmar','malaysia','singapore','indonesia','philippines','india','bangladesh','sri lanka','brazil','mexico','colombia','venezuela','peru','ecuador','dominican republic','puerto rico','cuba','jamaica','haiti','nicaragua','honduras','el salvador'],
    typhoid_high: ['india','pakistan','bangladesh','nepal','afghanistan','indonesia','philippines','vietnam','laos','cambodia','myanmar'],
    hepa_high: ['india','pakistan','bangladesh','nepal','indonesia','philippines','vietnam','laos','cambodia','myanmar','thailand','egypt','morocco','mexico','peru','bolivia','nigeria','kenya','tanzania','ethiopia','ghana','senegal'],
    altitude: ['bolivia','peru','tibet','nepal','bhutan','ecuador'],
    meningitis_belt: ['burkina faso','chad','niger','nigeria','mali','sudan','ethiopia','ghana','senegal','gambia','guinea','benin','togo','cameroon','central african republic','south sudan'],
  };

  function inRegion(country, regionKey) {
    if (!country) return false;
    const c = country.toLowerCase().trim();
    return (REGIONS[regionKey] || []).some(
      (x) => c.includes(x) || x.includes(c)
    );
  }

  // ============== API CALLS ==============

  async function geocodeCity(city, country) {
    setStatus('geo', 'loading', '請求中…');
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=10&language=en&format=json`;
      const data = await tryFetch(url);
      let results = data.results || [];
      if (country) {
        const c = country.trim().toLowerCase();
        const filtered = results.filter(
          (r) =>
            (r.country || '').toLowerCase().includes(c) ||
            (r.country_code || '').toLowerCase() === c
        );
        if (filtered.length) results = filtered;
      }
      if (!results.length) {
        setStatus('geo', 'fail', '未找到城市');
        return [];
      }
      setStatus('geo', 'ok', `匹配 ${results.length} 個`);
      return results;
    } catch (e) {
      setStatus('geo', 'fail', '請求失敗');
      console.error('Geocode error:', e);
      return [];
    }
  }

  async function fetchWeather(lat, lon, startDate, endDate) {
    setStatus('weather', 'loading', '請求中…');
    try {
      const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,uv_index,weather_code',
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,wind_speed_10m_max,weather_code',
        timezone: 'auto',
      });
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
      const data = await tryFetch(url);
      setStatus('weather', 'ok', '已獲取');
      return data;
    } catch (e) {
      setStatus('weather', 'fail', '請求失敗');
      console.error('Weather error:', e);
      return null;
    }
  }

  async function fetchAirQuality(lat, lon) {
    setStatus('air', 'loading', '請求中…');
    try {
      const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current: 'pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,european_aqi,us_aqi',
        timezone: 'auto',
      });
      const url = `https://air-quality-api.open-meteo.com/v1/air-quality?${params.toString()}`;
      const data = await tryFetch(url);
      setStatus('air', 'ok', '已獲取');
      return data;
    } catch (e) {
      setStatus('air', 'fail', '請求失敗');
      console.error('Air error:', e);
      return null;
    }
  }

  function parseRSSItems(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const items = Array.from(doc.querySelectorAll('item'));
    return items.map((it) => ({
      title: (it.querySelector('title')?.textContent || '').trim(),
      link: (it.querySelector('link')?.textContent || '').trim(),
      pubDate: (it.querySelector('pubDate')?.textContent || '').trim(),
      description: (it.querySelector('description')?.textContent || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    }));
  }

  function filterByCountry(items, country) {
    if (!country) return items.slice(0, 10);
    const c = country.toLowerCase().trim();
    return items.filter(
      (n) =>
        n.title.toLowerCase().includes(c) ||
        n.description.toLowerCase().includes(c)
    );
  }

  async function fetchCDCNotices(country) {
    setStatus('cdc', 'loading', '請求中…');
    try {
      const xml = await tryFetch('https://wwwnc.cdc.gov/travel/rss/notices.xml', true);
      const all = parseRSSItems(xml);
      const matched = filterByCountry(all, country);
      setStatus('cdc', matched.length ? 'ok' : 'warn', matched.length ? `匹配 ${matched.length} 條` : '無相關通知');
      return { items: matched, total: all.length };
    } catch (e) {
      setStatus('cdc', 'fail', '請求失敗');
      console.error('CDC error:', e);
      return null;
    }
  }

  async function fetchWHODON(country) {
    setStatus('who', 'loading', '請求中…');
    try {
      const xml = await tryFetch('https://www.who.int/feeds/entity/csr/don/en/rss.xml', true);
      const all = parseRSSItems(xml);
      const matched = filterByCountry(all, country);
      setStatus('who', matched.length ? 'ok' : 'warn', matched.length ? `匹配 ${matched.length} 條` : '無相關通知');
      return { items: matched, total: all.length };
    } catch (e) {
      setStatus('who', 'fail', '請求失敗');
      console.error('WHO error:', e);
      return null;
    }
  }

  async function fetchGovUK(country) {
    setStatus('govuk', 'loading', '請求中…');
    try {
      const slug = countryToGovukSlug(country);
      if (!slug) throw new Error('no slug');
      const url = `https://www.gov.uk/api/content/foreign-travel-advice/${slug}`;
      const data = await tryFetch(url);
      setStatus('govuk', 'ok', '已獲取');
      return data;
    } catch (e) {
      setStatus('govuk', 'fail', '無此國家或失敗');
      console.error('GOV.UK error:', e);
      return null;
    }
  }

  async function fetchGDACS(country) {
    setStatus('gdacs', 'loading', '請求中…');
    try {
      const xml = await tryFetch('https://www.gdacs.org/xml/rss.xml', true);
      const all = parseRSSItems(xml);
      const matched = filterByCountry(all, country);
      setStatus('gdacs', matched.length ? 'ok' : 'warn', matched.length ? `匹配 ${matched.length} 條` : '近期無事件');
      return { items: matched, total: all.length };
    } catch (e) {
      setStatus('gdacs', 'fail', '請求失敗');
      console.error('GDACS error:', e);
      return null;
    }
  }

  // ============== HEALTH CATEGORIZERS ==============
  function uvCategory(uv) {
    if (uv == null || isNaN(uv)) return '';
    if (uv < 3) return '低';
    if (uv < 6) return '中等';
    if (uv < 8) return '高';
    if (uv < 11) return '很高';
    return '極端';
  }

  function aqiUSCategory(aqi) {
    if (aqi == null) return null;
    if (aqi <= 50) return { level: '良好', risk: 'low' };
    if (aqi <= 100) return { level: '中等', risk: 'mod' };
    if (aqi <= 150) return { level: '對敏感人群不健康', risk: 'high' };
    if (aqi <= 200) return { level: '不健康', risk: 'high' };
    if (aqi <= 300) return { level: '非常不健康', risk: 'vhigh' };
    return { level: '危險', risk: 'vhigh' };
  }

  function pm25Category(pm) {
    if (pm == null) return null;
    if (pm <= 12) return { level: 'PM2.5 良好', risk: 'low' };
    if (pm <= 35.4) return { level: 'PM2.5 中等', risk: 'mod' };
    if (pm <= 55.4) return { level: 'PM2.5 偏高', risk: 'high' };
    if (pm <= 150.4) return { level: 'PM2.5 不健康', risk: 'high' };
    if (pm <= 250.4) return { level: 'PM2.5 非常不健康', risk: 'vhigh' };
    return { level: 'PM2.5 危險', risk: 'vhigh' };
  }

  // ============== RENDERERS ==============
  function renderOverview() {
    const d = state.destination;
    const f = state.form;
    const cells = [
      { k: '城市', v: d ? `${d.name}${d.admin1 ? ', ' + d.admin1 : ''}` : '—' },
      { k: '國家', v: d?.country || f.country || '—' },
      { k: '坐標', v: d ? `${d.latitude.toFixed(3)}, ${d.longitude.toFixed(3)}` : '—' },
      { k: '時區', v: d?.timezone || '—' },
      { k: '出發日期', v: f.departureDate || '—' },
      { k: '停留天數', v: (f.stayDays || '7') + ' 天' },
      { k: '出發地', v: f.originCity || '—' },
      { k: '海拔', v: d?.elevation != null ? `${Math.round(d.elevation)} m` : '—' },
    ];
    $('overviewGrid').innerHTML = cells.map(
      (c) => `
      <div class="info-cell">
        <div class="k">${htmlEscape(c.k)}</div>
        <div class="v">${htmlEscape(c.v)}</div>
      </div>`
    ).join('');
  }

  function renderWeather(data) {
    const body = $('weatherBody');
    if (!data) {
      body.innerHTML = '<p class="empty-note">天氣資料獲取失敗，請稍後重試。</p>';
      return;
    }
    const cur = data.current || {};
    const daily = data.daily || {};
    const tMax = daily.temperature_2m_max || [];
    const tMin = daily.temperature_2m_min || [];
    const precip = daily.precipitation_sum || [];
    const uv = daily.uv_index_max || [];
    const wind = daily.wind_speed_10m_max || [];

    const peakT = tMax.length ? Math.max(...tMax) : null;
    const lowT = tMin.length ? Math.min(...tMin) : null;
    const totalP = precip.length ? precip.reduce((a, b) => a + b, 0) : null;
    const maxUV = uv.length ? Math.max(...uv) : null;
    const maxWind = wind.length ? Math.max(...wind) : null;

    const tips = [];
    if (peakT != null && peakT >= 32) tips.push('高溫風險：注意防中暑、頻繁補水、避開正午戶外活動。');
    if (peakT != null && peakT >= 35) tips.push('極端高溫：避免長時間戶外暴露，老人、兒童、慢性病患者特別警惕熱衰竭與熱射病。');
    if (lowT != null && lowT <= 5) tips.push('低溫風險：準備防寒衣物，注意呼吸道感染與心血管負擔。');
    if (lowT != null && lowT <= -10) tips.push('嚴寒風險：防凍傷、避免長時間戶外停留。');
    if (totalP != null && totalP > 50) tips.push('降水偏多：準備雨具、防滑鞋；積水區注意蚊媒與腸道感染風險。');
    if (maxUV != null && maxUV >= 8) tips.push('紫外線強：使用 SPF 30+ 廣譜防曬、墨鏡與寬簷帽。');
    if (maxWind != null && maxWind >= 50) tips.push('風速較大：戶外活動注意安全，沿海地區留意風暴提醒。');
    if (cur.relative_humidity_2m != null && cur.relative_humidity_2m >= 80 && peakT != null && peakT >= 28) {
      tips.push('高溫高濕並存：體感溫度顯著升高，戶外運動需大幅降低強度。');
    }

    body.innerHTML = `
      <div class="metric-grid">
        <div class="metric"><div class="metric-label">當前溫度</div><div class="metric-value">${cur.temperature_2m != null ? cur.temperature_2m.toFixed(1) : '—'}<small>°C</small></div></div>
        <div class="metric"><div class="metric-label">體感溫度</div><div class="metric-value">${cur.apparent_temperature != null ? cur.apparent_temperature.toFixed(1) : '—'}<small>°C</small></div></div>
        <div class="metric"><div class="metric-label">濕度</div><div class="metric-value">${cur.relative_humidity_2m ?? '—'}<small>%</small></div></div>
        <div class="metric"><div class="metric-label">當前 UV</div><div class="metric-value">${cur.uv_index != null ? cur.uv_index.toFixed(1) : '—'}</div></div>
      </div>
      <div class="metric-grid" style="margin-top:12px;">
        <div class="metric"><div class="metric-label">期間最高/最低</div><div class="metric-value">${peakT != null ? peakT.toFixed(0) : '—'}/${lowT != null ? lowT.toFixed(0) : '—'}<small>°C</small></div></div>
        <div class="metric"><div class="metric-label">總降水</div><div class="metric-value">${totalP != null ? totalP.toFixed(1) : '—'}<small>mm</small></div></div>
        <div class="metric"><div class="metric-label">最高 UV</div><div class="metric-value">${maxUV != null ? maxUV.toFixed(1) : '—'}</div><div class="metric-note">${uvCategory(maxUV)}</div></div>
        <div class="metric"><div class="metric-label">最大風速</div><div class="metric-value">${maxWind != null ? maxWind.toFixed(0) : '—'}<small>km/h</small></div></div>
      </div>
      ${tips.length
        ? `<ul style="margin-top:18px;">${tips.map((t) => `<li>${htmlEscape(t)}</li>`).join('')}</ul>`
        : '<p class="empty-note" style="margin-top:14px;">期間天氣較為溫和，無顯著極端風險。</p>'
      }
    `;
  }

  function renderAir(data) {
    const body = $('airBody');
    if (!data || !data.current) {
      body.innerHTML = '<p class="empty-note">空氣品質資料獲取失敗或不可用。</p>';
      return;
    }
    const cur = data.current;
    const usCat = aqiUSCategory(cur.us_aqi);
    const pmCat = pm25Category(cur.pm2_5);
    const profile = state.form.profile || [];
    const sensitive =
      profile.includes('respiratory') ||
      profile.includes('cardio') ||
      profile.includes('elderly') ||
      profile.includes('child') ||
      profile.includes('pregnant');

    const advice = [];
    const risk = pmCat?.risk || usCat?.risk || 'low';
    if (risk === 'mod') advice.push('空氣品質中等：敏感人群（呼吸/心血管病、老年人、孕婦、兒童）長時間戶外活動時可考慮配戴口罩。');
    if (risk === 'high') advice.push('空氣品質較差：建議減少戶外劇烈運動，敏感人群配戴 N95/KN95 口罩。');
    if (risk === 'vhigh') advice.push('空氣污染嚴重：盡量待在室內並使用空氣清淨機，外出全程配戴 N95，避免戶外運動。');
    if (sensitive && (risk === 'mod' || risk === 'high' || risk === 'vhigh')) {
      advice.push('您屬於空氣污染敏感人群：請隨身攜帶常用呼吸/心血管急救藥物（如吸入器、硝酸甘油等，遵醫囑）。');
    }
    if (!advice.length) advice.push('當前空氣品質良好，可正常進行戶外活動。');

    body.innerHTML = `
      <div class="metric-grid">
        <div class="metric"><div class="metric-label">US AQI</div><div class="metric-value">${cur.us_aqi ?? '—'}</div><div class="metric-note">${usCat?.level || ''}</div></div>
        <div class="metric"><div class="metric-label">EU AQI</div><div class="metric-value">${cur.european_aqi ?? '—'}</div></div>
        <div class="metric"><div class="metric-label">PM2.5</div><div class="metric-value">${cur.pm2_5 != null ? cur.pm2_5.toFixed(1) : '—'}<small>μg/m³</small></div><div class="metric-note">${pmCat?.level || ''}</div></div>
        <div class="metric"><div class="metric-label">PM10</div><div class="metric-value">${cur.pm10 != null ? cur.pm10.toFixed(1) : '—'}<small>μg/m³</small></div></div>
        <div class="metric"><div class="metric-label">O₃</div><div class="metric-value">${cur.ozone != null ? cur.ozone.toFixed(1) : '—'}<small>μg/m³</small></div></div>
        <div class="metric"><div class="metric-label">NO₂</div><div class="metric-value">${cur.nitrogen_dioxide != null ? cur.nitrogen_dioxide.toFixed(1) : '—'}<small>μg/m³</small></div></div>
      </div>
      <ul style="margin-top:18px;">${advice.map((a) => `<li>${htmlEscape(a)}</li>`).join('')}</ul>
    `;
  }

  function renderRSSCard(bodyId, data, label, fallbackHTML) {
    const body = $(bodyId);
    if (!data) { body.innerHTML = fallbackHTML; return; }
    if (!data.items.length) {
      body.innerHTML = `<p class="empty-note">未在${label}中找到目的地相關內容（已掃描 ${data.total} 條全球記錄）。</p>` + fallbackHTML;
      return;
    }
    const list = data.items.slice(0, 6).map((it) => `
      <li>
        <a class="title" href="${htmlEscape(it.link)}" target="_blank" rel="noopener">${htmlEscape(it.title)}</a>
        <div class="meta">${htmlEscape(it.pubDate)}</div>
        ${it.description ? `<div class="summary">${htmlEscape(it.description.slice(0, 280))}${it.description.length > 280 ? '…' : ''}</div>` : ''}
      </li>
    `).join('');
    body.innerHTML = `<ul class="news-list">${list}</ul>`;
  }

  function renderCDC(data) {
    renderRSSCard(
      'cdcBody',
      data,
      'CDC 旅行通知',
      `<p class="empty-note">手動查詢：<a href="https://wwwnc.cdc.gov/travel/destinations/list" target="_blank" rel="noopener">CDC Travelers' Health 目的地頁面</a>。</p>`
    );
  }

  function renderWHO(data) {
    renderRSSCard(
      'whoBody',
      data,
      'WHO 疾病暴發新聞',
      `<p class="empty-note">手動查詢：<a href="https://www.who.int/emergencies/disease-outbreak-news" target="_blank" rel="noopener">WHO Disease Outbreak News</a>。</p>`
    );
  }

  function renderGDACS(data) {
    renderRSSCard(
      'gdacsBody',
      data,
      'GDACS 災害提醒',
      `<p class="empty-note">手動查詢：<a href="https://www.gdacs.org/" target="_blank" rel="noopener">gdacs.org</a>。</p>`
    );
  }

  function renderGovUK(data) {
    const body = $('govukBody');
    if (!data) {
      body.innerHTML = `<p class="empty-note">未找到該國家對應的 GOV.UK 旅行建議頁面，或請求失敗。<br>您可手動訪問 <a href="https://www.gov.uk/foreign-travel-advice" target="_blank" rel="noopener">gov.uk/foreign-travel-advice</a>。</p>`;
      return;
    }
    const title = data.title || '';
    const description = data.description || '';
    const url = data.base_path ? `https://www.gov.uk${data.base_path}` : 'https://www.gov.uk/foreign-travel-advice';
    const updated = data.public_updated_at ? data.public_updated_at.slice(0, 10) : '—';
    let firstPart = '';
    if (data.details?.parts?.[0]?.body) {
      firstPart = data.details.parts[0].body
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    body.innerHTML = `
      <p><strong>${htmlEscape(title)}</strong></p>
      ${description ? `<p>${htmlEscape(description)}</p>` : ''}
      <p><small>最後更新：${htmlEscape(updated)}</small></p>
      ${firstPart ? `<p>${htmlEscape(firstPart.slice(0, 500))}${firstPart.length > 500 ? '…' : ''}</p>` : ''}
      <p>👉 完整建議：<a href="${htmlEscape(url)}" target="_blank" rel="noopener">${htmlEscape(url)}</a></p>
    `;
  }

  function renderVaccine() {
    const body = $('vaccineBody');
    const country = state.destination?.country || state.form.country || '';
    const types = state.form.types || [];
    const profile = state.form.profile || [];
    const stay = parseInt(state.form.stayDays || 7, 10);

    const routine = [
      'MMR（麻疹／腮腺炎／風疹）',
      'Tdap（破傷風／白喉／百日咳）',
      '季節性流感疫苗',
      'COVID-19（按本國指南完成接種與加強）',
      '水痘（如未感染或未接種）',
    ];
    const recommended = [];
    const considered = [];

    if (inRegion(country, 'hepa_high') || types.includes('rural') || types.includes('long-stay')) {
      recommended.push('甲型肝炎（Hepatitis A）');
    } else {
      considered.push('甲型肝炎（Hepatitis A）— 一般推薦給多數國際旅行者');
    }
    if (stay > 30 || types.includes('long-stay') || types.includes('vfr') || profile.includes('chronic')) {
      recommended.push('乙型肝炎（Hepatitis B）— 長期停留、探親、慢病患者');
    }
    if (inRegion(country, 'typhoid_high')) {
      recommended.push('傷寒（Typhoid）— 食用當地食物或前往南亞、東南亞建議');
    }
    if (inRegion(country, 'africa_yf') || inRegion(country, 'south_america_yf')) {
      recommended.push('黃熱病（Yellow Fever）— 部分國家入境要求接種證明（Yellow Card）');
    }
    if (inRegion(country, 'asia_je') && (types.includes('rural') || types.includes('long-stay') || stay > 30)) {
      recommended.push('日本腦炎（Japanese Encephalitis）— 長期停留或鄉村活動建議');
    }
    if (types.includes('rural') || types.includes('outdoor') || types.includes('long-stay') || profile.includes('child')) {
      considered.push('狂犬病暴露前免疫（Rabies pre-exposure）— 鄉村、戶外、兒童或長期停留');
    }
    if (inRegion(country, 'meningitis_belt') || /saudi|hajj|umrah/i.test(country)) {
      recommended.push('流行性腦脊髓膜炎（Meningococcal ACWY）— 流腦帶或朝覲入境要求');
    }
    if (types.includes('rural') && inRegion(country, 'hepa_high')) {
      considered.push('霍亂（Cholera）— 衛生條件較差地區、人道救援工作者');
    }
    if (/afghanistan|pakistan|nigeria/i.test(country)) {
      recommended.push('小兒麻痺（Polio）成人加強劑');
    }

    let malariaNote = null;
    if (inRegion(country, 'malaria_high') || (types.includes('rural') && inRegion(country, 'africa_yf'))) {
      malariaNote = '目的地或行程涉及瘧疾流行區。瘧疾無廣泛推薦的成人疫苗，需在出發前 1–2 週由旅行醫學門診評估並開立預防性藥物（如阿托喹酮-氯胍 Atovaquone/Proguanil、多西環素 Doxycycline 或甲氟喹 Mefloquine）。';
    }
    let dengueNote = null;
    if (inRegion(country, 'dengue_endemic')) {
      dengueNote = '目的地登革熱流行。重點在防蚊：使用含 DEET ≥20% 或派卡瑞丁（Picaridin）的驅蚊劑、穿淺色長袖長褲、住宿選擇有紗窗或冷氣的房間。對於有過登革熱病史者，可諮詢醫師是否考慮 Dengvaxia/Qdenga 疫苗。';
    }

    const ulFromArr = (a) => `<ul>${a.map((v) => `<li>${htmlEscape(v)}</li>`).join('')}</ul>`;
    body.innerHTML = `
      <p>以下是針對該目的地與您的旅行特徵的<strong>疫苗類別參考</strong>。是否實際接種、選用哪種劑型，請以旅行醫學門診醫師根據個人病史評估為準。</p>
      <p><strong>建議出發前 4–8 週</strong>預約旅行醫學門診（Travel Medicine Clinic），部分疫苗需要多劑接種或留出免疫起效時間。</p>
      <h4>常規疫苗（確認最新接種）</h4>
      ${ulFromArr(routine)}
      ${recommended.length ? `<h4>針對目的地建議的疫苗</h4>${ulFromArr(recommended)}` : ''}
      ${considered.length ? `<h4>可考慮的疫苗（依行程而定）</h4>${ulFromArr(considered)}` : ''}
      ${malariaNote ? `<h4>瘧疾預防</h4><p>${htmlEscape(malariaNote)}</p>` : ''}
      ${dengueNote ? `<h4>登革熱與蚊媒疾病</h4><p>${htmlEscape(dengueNote)}</p>` : ''}
    `;
  }

  function renderKit() {
    const body = $('kitBody');
    const types = state.form.types || [];
    const profile = state.form.profile || [];
    const country = state.destination?.country || state.form.country || '';
    const w = state.results.weather;

    const general = [
      '個人常用處方藥（足量＋備份，原包裝、附醫囑或處方影本）',
      '退燒/止痛藥：對乙醯氨基酚（Acetaminophen / Paracetamol）或布洛芬（Ibuprofen）',
      '抗組織胺：氯雷他定 / 西替利嗪（過敏、蚊蟲叮咬）',
      '止瀉藥：洛哌丁胺（Loperamide）— 短期症狀控制',
      '口服補液鹽（ORS）— 腹瀉脫水',
      '抗酸劑 / 胃藥（如鋁碳酸鎂、法莫替丁）',
      '創可貼、無菌紗布、彈性繃帶、醫用膠帶',
      '消毒用品：酒精棉片、碘伏、生理食鹽水',
      '抗菌藥膏（如莫匹羅星 / 桿菌肽）',
      '電子體溫計',
      '一次性手套、口罩（醫用 / N95）',
      '驅蚊劑（DEET ≥20% 或派卡瑞丁）',
      '防曬霜（SPF 30+，廣譜）、潤唇膏（含防曬）',
      '保濕乳液、生理食鹽水滴眼液',
    ];

    const climate = [];
    if (w?.daily?.temperature_2m_max) {
      const tMax = Math.max(...w.daily.temperature_2m_max);
      const tMin = Math.min(...w.daily.temperature_2m_min);
      const totalP = (w.daily.precipitation_sum || []).reduce((a, b) => a + b, 0);
      if (tMax >= 30) climate.push('便攜小風扇 / 涼感巾、電解質飲料粉');
      if (tMax >= 32) climate.push('防中暑用品（冰袋、藿香正氣水或同類本地常用品）');
      if (tMin <= 5) climate.push('暖暖包、潤喉糖、止咳糖漿');
      if (totalP > 50) climate.push('雨衣 / 折疊傘、防水鞋套、防潮袋');
    }

    const pSpecific = [];
    if (profile.includes('child')) pSpecific.push('兒童專用退燒/止痛藥（按體重）、創可貼、奶粉/輔食、安撫小物');
    if (profile.includes('elderly')) pSpecific.push('血壓計 / 血糖儀、慢性病藥物雙份、加固包裝');
    if (profile.includes('pregnant')) pSpecific.push('孕婦維生素、醫師確認後可用的緩解藥物清單、產檢資料影本');
    if (profile.includes('chronic') || profile.includes('cardio')) pSpecific.push('近期病歷英文摘要、處方影本、心電圖（如有）');
    if (profile.includes('respiratory')) pSpecific.push('哮喘吸入器（β2 激動劑、ICS）、N95 口罩備份、峰流速儀');
    if (profile.includes('immuno')) pSpecific.push('預防性抗生素（醫囑）、發熱應急聯絡卡、疫苗接種紀錄');

    const tSpecific = [];
    if (types.includes('outdoor') || types.includes('rural')) {
      tSpecific.push('蜱蟲鑷子、創傷處理組、防水繃帶、蛇咬傷急救知識卡');
      tSpecific.push('永久性殺蟲劑（Permethrin）處理過的衣物或噴霧');
    }
    if (types.includes('cruise')) tSpecific.push('暈動症藥（茶苯海明 / 美克利嗪）、洗手液、口罩');
    if (types.includes('long-stay')) tSpecific.push('完整體檢報告影本、出發前牙科檢查、長期處方備份');
    if (inRegion(country, 'malaria_high')) tSpecific.push('瘧疾預防藥物（醫囑）、含 DEET 30%+ 驅蚊噴霧、蚊帳');
    if (inRegion(country, 'altitude')) tSpecific.push('乙醯唑胺（Diamox，預防高原反應，醫囑）、便攜血氧儀');

    const ul = (a) => (a.length ? `<ul>${a.map((x) => `<li>${htmlEscape(x)}</li>`).join('')}</ul>` : '<p class="empty-note">無額外項目。</p>');

    body.innerHTML = `
      <p>所有藥物請保留原包裝與處方說明。攜帶處方藥跨境前，請查詢目的地對該藥品的入境規定（部分國家對精神類、含麻黃鹼類藥品有嚴格限制）。</p>
      <h4>通用清單</h4>${ul(general)}
      ${climate.length ? `<h4>氣候相關補充</h4>${ul(climate)}` : ''}
      ${pSpecific.length ? `<h4>人群特殊補充</h4>${ul(pSpecific)}` : ''}
      ${tSpecific.length ? `<h4>行程特殊補充</h4>${ul(tSpecific)}` : ''}
    `;
  }

  function renderFlight() {
    const body = $('flightBody');
    const flight = state.form.flightDuration;
    const profile = state.form.profile || [];
    const tips = [
      '機場與機艙內配戴口罩，可降低呼吸道傳染風險（特別是流感、COVID-19 流行季節）。',
      '充分飲水，每小時 100–200 ml；避免過量酒精與咖啡因飲品。',
      '機艙乾燥：使用滴眼液與保濕鼻噴；攜帶潤膚乳、潤唇膏。',
      '起降時透過吞嚥、咀嚼或捏鼻鼓氣（Valsalva 動作）平衡耳壓；感冒鼻塞期間可考慮使用鼻減充血劑（醫囑）。',
    ];
    if (flight === '6-10' || flight === '>10') {
      tips.push('深靜脈血栓（DVT）預防：每 1–2 小時起身走動或做踝泵運動；高風險者可考慮穿著醫用彈力襪（壓力 15–20 mmHg）。');
      tips.push('避免長時間蹺二郎腿或同一姿勢；可選擇靠走道座位便於起身。');
    }
    if (flight === '>10') {
      tips.push('時差調節：抵達後盡快接觸自然光、按目的地時間進食與睡眠；可短期使用褪黑激素（0.5–3 mg，醫師建議）。');
      tips.push('抵達當天避免劇烈運動或重要決策。');
    }
    if (profile.includes('pregnant')) tips.push('孕婦：多數航空公司允許 28–36 週前飛行（依公司不同），先確認航司政策；長途飛行 DVT 風險升高，務必活動下肢、穿彈力襪、多飲水，必要時諮詢產科。');
    if (profile.includes('cardio')) tips.push('心血管疾病：機艙低氧可能加重既有缺血，必要時諮詢醫師關於補充氧氣的需求；隨身攜帶硝酸甘油等急救藥物。');
    if (profile.includes('respiratory')) tips.push('呼吸系統疾病：哮喘患者隨身攜帶吸入器並放在易拿取的位置；嚴重 COPD 患者可能需要機上吸氧（提前向航司申請）。');
    if (profile.includes('chronic')) tips.push('糖尿病：注射用胰島素隨身攜帶（不託運），準備醫師英文證明；按目的地時區重新規劃用餐與用藥時間。');
    if (profile.includes('elderly')) tips.push('老年人：選擇近走道座位，更頻繁地起身活動；準備好常用藥的英文名稱清單。');
    if (profile.includes('child')) tips.push('兒童：起降時餵奶/喝水/吞嚥緩解耳壓；準備玩具、零食、備用衣物與充電設備。');

    body.innerHTML = `<ul>${tips.map((t) => `<li>${htmlEscape(t)}</li>`).join('')}</ul>`;
  }

  function renderPost() {
    const body = $('postBody');
    const country = state.destination?.country || state.form.country || '';
    const types = state.form.types || [];

    const general = [
      '回程後 3 週內出現任何發熱（≥38°C），請<strong>立即就醫並主動告知近期旅行史</strong>，特別注意瘧疾、登革熱排查。',
      '腹瀉持續超過 3 天，或伴隨血便、高熱、嚴重脫水：需就醫評估（旅行者腹瀉、阿米巴、賈第鞭毛蟲、霍亂等）。',
      '皮疹、可疑蜱蟲咬痕、慢性傷口未癒：及時就診皮膚科或感染科。',
      '咳嗽超過 2 週、夜間盜汗、體重下降：考慮結核分枝桿菌感染篩查。',
      '不明黃疸、深色尿、右上腹疼痛：肝炎排查（A/B/E 型）。',
      '注意自己與同住家人的健康狀況，部分傳染病潛伏期可達數週至數月。',
    ];
    const conditional = [];
    if (inRegion(country, 'malaria_high') || inRegion(country, 'africa_yf')) {
      conditional.push('瘧疾潛伏期可達 1 年以上：回程後出現周期性寒戰、高熱、出汗請立即就醫並要求血塗片檢查。');
    }
    if (inRegion(country, 'dengue_endemic')) {
      conditional.push('登革熱：典型表現為高熱、肌肉骨骼痛、皮疹；二次感染重症風險升高，<strong>避免使用阿斯匹靈／NSAIDs</strong>，僅用對乙醯氨基酚退熱。');
    }
    if (inRegion(country, 'asia_je')) {
      conditional.push('日本腦炎：頭痛、發熱、意識改變需立即就醫。');
    }
    if (types.includes('outdoor') || types.includes('rural')) {
      conditional.push('蜱媒疾病（萊姆病、立克次體）：注意叮咬部位的環形紅斑或結痂黑點。');
    }
    if (types.includes('cruise') || types.includes('vfr')) {
      conditional.push('呼吸道與胃腸道感染（流感、諾如病毒等）在郵輪/聚集環境中易暴發，注意自身及接觸者症狀。');
    }
    if (types.includes('long-stay')) {
      conditional.push('長期停留者：建議回程後 1–3 個月做一次全面健康檢查（CBC、肝腎功、糞便寄生蟲、結核篩查）。');
    }

    body.innerHTML = `
      <p>旅行結束並不代表健康風險結束。請在回程後 4–6 週內留意以下情況：</p>
      <ul>${general.map((t) => `<li>${t}</li>`).join('')}</ul>
      ${conditional.length ? `<h4>與本次目的地相關的特別觀察</h4><ul>${conditional.map((t) => `<li>${t}</li>`).join('')}</ul>` : ''}
      <p style="margin-top:14px;"><strong>就診時請主動告知：</strong>① 旅行國家與城市，② 出發與返回日期，③ 暴露史（蚊蟲、動物、食物、水源、性接觸），④ 行程中疫苗與用藥情況。</p>
    `;
  }

  // ============== CANDIDATE PICKER ==============
  function showCandidates(candidates) {
    state.candidates = candidates;
    state.selectedCandidateIdx = -1;
    const list = $('geoCandidateList');
    list.innerHTML = candidates.slice(0, 8).map((c, i) => `
      <div class="geo-candidate" data-idx="${i}">
        <strong>${htmlEscape(c.name)}</strong>${c.admin1 ? ', ' + htmlEscape(c.admin1) : ''} — ${htmlEscape(c.country || '')}
        <span style="float:right;color:#888;">${c.latitude.toFixed(2)}, ${c.longitude.toFixed(2)}</span>
      </div>
    `).join('');
    $('geoCandidates').classList.add('show');

    list.querySelectorAll('.geo-candidate').forEach((el) => {
      el.addEventListener('click', () => {
        list.querySelectorAll('.geo-candidate').forEach((x) => x.classList.remove('selected'));
        el.classList.add('selected');
        state.selectedCandidateIdx = parseInt(el.dataset.idx, 10);
        state.destination = candidates[state.selectedCandidateIdx];
      });
    });
  }

  // ============== PIPELINE ==============
  async function runPipeline() {
    ['geo', 'weather', 'air', 'cdc', 'who', 'govuk', 'gdacs'].forEach((s) =>
      setStatus(s, 'idle', '待請求')
    );

    $('statusSection').classList.remove('hidden');
    $('resultSection').classList.remove('hidden');
    $('loadingBlock').classList.remove('hidden');
    $('resultContent').classList.add('hidden');
    $('statusSection').scrollIntoView({ behavior: 'smooth', block: 'start' });

    const f = state.form;

    // Step 1: geocode
    if (!state.destination) {
      const candidates = await geocodeCity(f.destCity, f.country);
      if (!candidates.length) {
        $('loadingBlock').innerHTML = '<p style="color:#a32a1f;">未找到目的地座標。請檢查城市拼寫，或填寫英文國家名稱後重試。</p>';
        return;
      }
      if (candidates.length > 1) {
        showCandidates(candidates);
        $('loadingBlock').innerHTML = '<p style="color:#888;">已找到多個匹配城市，請於上方表單中選擇正確的城市，再次點擊「生成旅行健康包」。</p>';
        return;
      }
      state.destination = candidates[0];
    } else {
      setStatus('geo', 'ok', '已選擇');
    }

    const dest = state.destination;
    const country = dest.country || f.country || '';

    // Compute weather window (Open-Meteo forecast supports up to ~16 days ahead)
    const today = new Date();
    let startDate = f.departureDate ? new Date(f.departureDate) : today;
    if (isNaN(startDate)) startDate = today;
    const dayMs = 86400000;
    const daysFromNow = Math.floor((startDate - today) / dayMs);
    if (daysFromNow > 15 || daysFromNow < -90) startDate = today;
    const stay = Math.max(1, Math.min(parseInt(f.stayDays || 7, 10), 16));
    let endDate = addDays(startDate, stay - 1);
    const maxEnd = addDays(today, 15);
    if (endDate > maxEnd) endDate = maxEnd;

    // Step 2: parallel fetch (independent failures)
    const [weather, air, cdc, who, govuk, gdacs] = await Promise.all([
      fetchWeather(dest.latitude, dest.longitude, fmtDate(startDate), fmtDate(endDate)),
      fetchAirQuality(dest.latitude, dest.longitude),
      fetchCDCNotices(country),
      fetchWHODON(country),
      fetchGovUK(country),
      fetchGDACS(country),
    ]);

    state.results = { weather, air, cdc, who, govuk, gdacs };

    // Step 3: render everything
    renderOverview();
    renderWeather(weather);
    renderAir(air);
    renderCDC(cdc);
    renderWHO(who);
    renderGovUK(govuk);
    renderGDACS(gdacs);
    renderVaccine();
    renderKit();
    renderFlight();
    renderPost();

    $('loadingBlock').classList.add('hidden');
    $('resultContent').classList.remove('hidden');
    $('resultSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ============== EXPORT ==============
  function getSectionText(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    return (el.innerText || el.textContent || '').trim();
  }

  function buildMarkdown() {
    const f = state.form || readForm();
    const d = state.destination;
    const lines = [];
    lines.push('# 國際旅行健康包 / International Travel Health Pack');
    lines.push(`生成時間：${new Date().toLocaleString()}`);
    lines.push('');
    lines.push('## A. 目的地概覽');
    lines.push(`- 城市：${d?.name || f.destCity}`);
    lines.push(`- 國家：${d?.country || f.country || '—'}`);
    lines.push(`- 坐標：${d ? `${d.latitude.toFixed(3)}, ${d.longitude.toFixed(3)}` : '—'}`);
    lines.push(`- 時區：${d?.timezone || '—'}`);
    lines.push(`- 出發日期：${f.departureDate || '—'}`);
    lines.push(`- 停留天數：${f.stayDays}`);
    lines.push(`- 出發地：${f.originCity || '—'}`);
    lines.push('');
    lines.push("> 本報告由 Hughie's Online Lab 旅行健康包生成器即時生成，僅供旅行健康教育與出行準備參考，不構成醫學或法律建議。");

    const sections = [
      ['B. 天氣與氣候風險', 'weatherBody'],
      ['C. 空氣品質', 'airBody'],
      ['D. CDC 旅行健康通知', 'cdcBody'],
      ['E. WHO 疾病暴發新聞', 'whoBody'],
      ['F. GOV.UK 官方旅行建議', 'govukBody'],
      ['G. GDACS 自然災害提醒', 'gdacsBody'],
      ['H. 疫苗與旅行門診準備', 'vaccineBody'],
      ['I. 旅行藥品包清單', 'kitBody'],
      ['J. 飛行健康提醒', 'flightBody'],
      ['K. 回程後症狀觀察', 'postBody'],
    ];
    sections.forEach(([title, id]) => {
      lines.push('');
      lines.push(`## ${title}`);
      lines.push(getSectionText(id));
    });
    return lines.join('\n');
  }

  function copyReport() {
    const md = buildMarkdown();
    navigator.clipboard.writeText(md).then(
      () => {
        const btn = $('copyBtn');
        const old = btn.textContent;
        btn.textContent = '✅ 已複製';
        setTimeout(() => { btn.textContent = old; }, 1800);
      },
      () => alert('複製失敗，請改用「下載 Markdown」。')
    );
  }

  function downloadReport() {
    const md = buildMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dest = state.destination?.name || state.form.destCity || 'travel';
    a.href = url;
    a.download = `travel-health-pack-${dest.replace(/\s+/g, '-')}-${fmtDate(new Date())}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ============== FORM I/O ==============
  function readForm() {
    return {
      originCity: $('originCity').value.trim(),
      destCity: $('destCity').value.trim(),
      country: $('destCountry').value.trim(),
      departureDate: $('departureDate').value,
      stayDays: $('stayDays').value || '7',
      flightDuration: $('flightDuration').value,
      types: getCheckedValues('travelTypes'),
      profile: getCheckedValues('travelerProfile'),
    };
  }

  function resetAll() {
    document.getElementById('travelForm').reset();
    state.destination = null;
    state.candidates = [];
    state.selectedCandidateIdx = -1;
    state.results = {};
    state.form = null;
    $('geoCandidates').classList.remove('show');
    $('geoCandidateList').innerHTML = '';
    $('statusSection').classList.add('hidden');
    $('resultSection').classList.add('hidden');
    $('loadingBlock').innerHTML = '<span class="spinner"></span> 正在請求公開資料源並生成報告，請稍候…';
    ['geo', 'weather', 'air', 'cdc', 'who', 'govuk', 'gdacs'].forEach((s) =>
      setStatus(s, 'idle', '待請求')
    );
    document.getElementById('travelForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ============== INIT ==============
  function init() {
    if (!$('departureDate').value) $('departureDate').value = fmtDate(new Date());

    $('generateBtn').addEventListener('click', async () => {
      const f = readForm();
      if (!f.destCity) {
        alert('請輸入目的地城市。');
        return;
      }
      // Re-geocode if the city/country changed
      const cityChanged =
        !state.form ||
        state.form.destCity !== f.destCity ||
        state.form.country !== f.country;
      if (cityChanged) {
        state.destination = null;
        state.candidates = [];
        state.selectedCandidateIdx = -1;
        $('geoCandidates').classList.remove('show');
      }
      state.form = f;
      $('generateBtn').disabled = true;
      try {
        await runPipeline();
      } catch (e) {
        console.error(e);
        $('loadingBlock').innerHTML = '<p style="color:#a32a1f;">生成過程中發生錯誤，請稍後再試。</p>';
      } finally {
        $('generateBtn').disabled = false;
      }
    });

    $('resetBtn').addEventListener('click', resetAll);
    const r2 = $('resetBtn2'); if (r2) r2.addEventListener('click', resetAll);
    const cb = $('copyBtn'); if (cb) cb.addEventListener('click', copyReport);
    const db = $('downloadBtn'); if (db) db.addEventListener('click', downloadReport);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
