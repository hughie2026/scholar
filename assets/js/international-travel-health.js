/* =====================================================================
 * International Travel Health Advisor
 * Real-time data sources (free, no auth):
 *  - https://restcountries.com/v3.1/all
 *  - https://geocoding-api.open-meteo.com/v1/search
 *  - https://api.open-meteo.com/v1/forecast
 *  - https://air-quality-api.open-meteo.com/v1/air-quality
 *  - https://disease.sh/v3/covid-19/countries/{iso2}
 * ===================================================================*/

(() => {
  'use strict';

  /* ---------- 1. Static health-region knowledge base ---------- */
  // ISO-2 country codes grouped by WHO/CDC travel-health regions.
  // Source: WHO Yellow Book + CDC Yellow Book (public, summarized).
  const HEALTH_DB = {
    yellowFever: { // Yellow fever endemic / vaccination recommended or required
      countries: ['AO','AR','BJ','BO','BR','BF','BI','CM','CF','TD','CO','CD','CG','CI','GQ','ET','GF','GA','GM','GH','GN','GW','GY','KE','LR','ML','MR','NE','NG','PA','PY','PE','RW','SN','SL','SS','SD','SR','TG','TT','UG','VE'],
      label: 'Yellow Fever (黃熱病)',
      tag: 'required',
      note: '進入或曾停留疫區可能要求黃熱病疫苗證書（YF-ICVP）'
    },
    malariaHigh: {
      countries: ['NG','CD','UG','MZ','BF','ML','CI','GH','CM','TZ','KE','AO','MW','ZM','ZW','BJ','TG','GN','SL','LR','GA','CG','BI','RW','CF','TD','ET','SS','SD','SN','GW','ER','SO','MG','PG','SB'],
      label: 'Malaria (瘧疾)',
      tag: 'required',
      note: '高流行區，建議使用瘧疾預防藥（諮詢醫生）'
    },
    malariaModerate: {
      countries: ['IN','BD','MM','KH','LA','VN','ID','PH','TH','PK','NP','LK','BO','CO','EC','PE','VE','GY','SR','GF','HT','DO','MX'],
      label: 'Malaria (瘧疾, 局部地區)',
      tag: 'recommended',
      note: '部分地區流行，依具體目的地評估'
    },
    dengue: {
      countries: ['IN','BD','MM','KH','LA','VN','ID','PH','TH','MY','SG','LK','BR','CO','VE','EC','PE','BO','MX','GT','HN','NI','CR','PA','DO','HT','CU','PR','TW','PG','FJ','SB','VU'],
      label: 'Dengue (登革熱)',
      tag: 'recommended',
      note: '蚊媒傳播，做好防蚊措施'
    },
    typhoid: {
      countries: ['IN','BD','PK','NP','LK','MM','KH','LA','ID','PH','VN','AF','EG','MA','TN','DZ','LY','SD','ET','KE','UG','TZ','NG','GH','CI','SN','ML','BF','TD','PE','BO','EC','HT'],
      label: 'Typhoid (傷寒)',
      tag: 'recommended',
      note: '經食物 / 飲水傳播'
    },
    hepatitisA: {
      // Most developing countries
      countries: ['IN','BD','PK','NP','LK','MM','KH','LA','VN','ID','PH','TH','MY','EG','MA','TN','DZ','LY','SD','ET','KE','UG','TZ','NG','GH','CI','SN','ML','BF','TD','BR','PE','BO','EC','VE','CO','MX','GT','HN','NI','SV','HT','DO','RU','UA','BY','TR','IR','IQ','SY','JO','LB'],
      label: 'Hepatitis A (甲型肝炎)',
      tag: 'recommended',
      note: '經食物 / 飲水傳播，建議所有未接種者接種'
    },
    cholera: {
      countries: ['HT','BD','YE','SO','SS','ET','KE','TZ','MZ','MW','ZM','ZW','CD','NG','CM','NE','BF','ML','TD','SN','PK','AF','IQ','SY'],
      label: 'Cholera (霍亂)',
      tag: 'recommended',
      note: '人道援助 / 災區工作者建議接種'
    },
    rabies: {
      countries: ['IN','BD','PK','NP','LK','MM','KH','LA','VN','ID','PH','TH','CN','BR','PE','BO','MX','EG','MA','ET','KE','UG','TZ','NG','GH','CI','RU'],
      label: 'Rabies (狂犬病)',
      tag: 'recommended',
      note: '長期停留、戶外活動或可能接觸動物者建議接種'
    },
    je: { // Japanese Encephalitis
      countries: ['CN','IN','BD','MM','KH','LA','VN','ID','PH','TH','MY','NP','LK','TW','KR','JP','PG'],
      label: 'Japanese Encephalitis (日本腦炎)',
      tag: 'recommended',
      note: '農村稻作區停留 ≥ 4 週者建議接種'
    },
    meningitis: { // Meningitis belt
      countries: ['BF','ML','NE','TD','NG','SN','GM','GW','GN','SL','LR','CI','GH','TG','BJ','CM','CF','SS','SD','ET','ER','UG','KE','RW','BI'],
      label: 'Meningococcal Meningitis (流行性腦膜炎)',
      tag: 'recommended',
      note: '撒哈拉以南「腦膜炎帶」乾季流行（12 月 – 6 月）'
    },
    altitude: {
      countries: ['NP','BO','PE','EC','CL','AR','CN','BT','TJ','KG'],
      label: 'High Altitude Sickness (高原反應)',
      tag: 'recommended',
      note: '海拔 &gt; 2500m 區域，建議漸進適應'
    },
    schisto: {
      countries: ['EG','SD','SS','ET','KE','UG','TZ','MW','ZM','ZW','MZ','MG','NG','GH','CI','SN','ML','BF','CM','BR','VE','PH','CN','LA','KH'],
      label: 'Schistosomiasis (血吸蟲病)',
      tag: 'recommended',
      note: '避免在淡水河湖游泳、涉水'
    }
  };

  // Routine vaccines that everyone should be up-to-date on
  const ROUTINE_VACCINES = [
    { label: 'MMR (麻疹 / 腮腺炎 / 風疹)', tag: 'routine', note: '常規兒童疫苗，成人應確保已接種兩劑' },
    { label: 'DTaP / Tdap (百白破)', tag: 'routine', note: '每 10 年加強一次' },
    { label: 'Polio (小兒麻痺)', tag: 'routine', note: '常規免疫' },
    { label: 'Influenza (流感)', tag: 'routine', note: '建議年度接種' },
    { label: 'COVID-19', tag: 'routine', note: '依當地最新建議完成基礎+加強' }
  ];

  // Emergency numbers (curated from public sources)
  const EMERGENCY_NUMBERS = {
    'CN':{police:'110',ambulance:'120',fire:'119'},
    'HK':{police:'999',ambulance:'999',fire:'999'},
    'TW':{police:'110',ambulance:'119',fire:'119'},
    'JP':{police:'110',ambulance:'119',fire:'119'},
    'KR':{police:'112',ambulance:'119',fire:'119'},
    'US':{police:'911',ambulance:'911',fire:'911'},
    'CA':{police:'911',ambulance:'911',fire:'911'},
    'GB':{police:'999',ambulance:'999',fire:'999'},
    'DE':{police:'110',ambulance:'112',fire:'112'},
    'FR':{police:'17',ambulance:'15',fire:'18'},
    'IT':{police:'113',ambulance:'118',fire:'115'},
    'ES':{police:'091',ambulance:'061',fire:'080'},
    'AU':{police:'000',ambulance:'000',fire:'000'},
    'NZ':{police:'111',ambulance:'111',fire:'111'},
    'SG':{police:'999',ambulance:'995',fire:'995'},
    'TH':{police:'191',ambulance:'1669',fire:'199'},
    'MY':{police:'999',ambulance:'999',fire:'994'},
    'VN':{police:'113',ambulance:'115',fire:'114'},
    'ID':{police:'110',ambulance:'118',fire:'113'},
    'PH':{police:'911',ambulance:'911',fire:'911'},
    'IN':{police:'112',ambulance:'102',fire:'101'},
    'AE':{police:'999',ambulance:'998',fire:'997'},
    'SA':{police:'999',ambulance:'997',fire:'998'},
    'TR':{police:'155',ambulance:'112',fire:'110'},
    'RU':{police:'102',ambulance:'103',fire:'101'},
    'BR':{police:'190',ambulance:'192',fire:'193'},
    'AR':{police:'911',ambulance:'107',fire:'100'},
    'MX':{police:'911',ambulance:'911',fire:'911'},
    'EG':{police:'122',ambulance:'123',fire:'180'},
    'ZA':{police:'10111',ambulance:'10177',fire:'10177'},
    'KE':{police:'999',ambulance:'999',fire:'999'},
    'NG':{police:'112',ambulance:'112',fire:'112'},
    'CH':{police:'117',ambulance:'144',fire:'118'},
    'NL':{police:'112',ambulance:'112',fire:'112'},
    'BE':{police:'101',ambulance:'112',fire:'112'},
    'SE':{police:'112',ambulance:'112',fire:'112'},
    'NO':{police:'112',ambulance:'113',fire:'110'},
    'DK':{police:'112',ambulance:'112',fire:'112'},
    'FI':{police:'112',ambulance:'112',fire:'112'},
    'PT':{police:'112',ambulance:'112',fire:'112'},
    'GR':{police:'100',ambulance:'166',fire:'199'},
    'IL':{police:'100',ambulance:'101',fire:'102'}
  };
  const DEFAULT_EMERGENCY = { police: '112', ambulance: '112', fire: '112' };

  /* ---------- 2. Helpers ---------- */
  const $ = sel => document.querySelector(sel);
  const escapeHtml = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const setStatus = msg => { const el = $('#loadingStatus'); if(el) el.textContent = msg; };

  const fetchJSON = async (url, timeout = 12000) => {
    const ctrl = new AbortController();
    const t = setTimeout(()=>ctrl.abort(), timeout);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      if(!r.ok) throw new Error('HTTP '+r.status);
      return await r.json();
    } finally {
      clearTimeout(t);
    }
  };

  /* ---------- 3. Country list (datalist) ---------- */
  let COUNTRY_INDEX = []; // [{name, cca2, capital, latlng, flag, region, ...}]

  const loadCountries = async () => {
    try {
      const data = await fetchJSON('https://restcountries.com/v3.1/all?fields=name,cca2,cca3,capital,capitalInfo,latlng,flag,region,subregion,population,languages,currencies,timezones');
      COUNTRY_INDEX = data
        .filter(c => c.cca2 && c.name?.common)
        .map(c => ({
          name: c.name.common,
          official: c.name.official,
          cca2: c.cca2,
          capital: (c.capital && c.capital[0]) || c.name.common,
          latlng: c.capitalInfo?.latlng?.length ? c.capitalInfo.latlng : c.latlng,
          flag: c.flag,
          region: c.region,
          subregion: c.subregion,
          population: c.population,
          languages: c.languages ? Object.values(c.languages).join(', ') : '—',
          currencies: c.currencies ? Object.values(c.currencies).map(x=>`${x.name} (${x.symbol||''})`).join(', ') : '—',
          timezones: c.timezones ? c.timezones[0] : '—'
        }))
        .sort((a,b)=>a.name.localeCompare(b.name));

      const dl = $('#countryList');
      dl.innerHTML = COUNTRY_INDEX.map(c =>
        `<option value="${escapeHtml(c.name)}">${escapeHtml(c.cca2)} · ${escapeHtml(c.region)}</option>`
      ).join('');
    } catch (e) {
      console.warn('Country list fetch failed, using minimal fallback', e);
      // Minimal fallback if RESTCountries is down
      const fb = [
        {name:'Japan',cca2:'JP',capital:'Tokyo',latlng:[35.68,139.76],flag:'🇯🇵',region:'Asia',subregion:'Eastern Asia',population:125800000,languages:'Japanese',currencies:'Japanese Yen (¥)',timezones:'UTC+09:00'},
        {name:'United States',cca2:'US',capital:'Washington, D.C.',latlng:[38.9,-77.04],flag:'🇺🇸',region:'Americas',subregion:'Northern America',population:329500000,languages:'English',currencies:'US Dollar ($)',timezones:'UTC-05:00'},
        {name:'Thailand',cca2:'TH',capital:'Bangkok',latlng:[13.75,100.52],flag:'🇹🇭',region:'Asia',subregion:'South-Eastern Asia',population:69800000,languages:'Thai',currencies:'Thai Baht (฿)',timezones:'UTC+07:00'},
        {name:'Kenya',cca2:'KE',capital:'Nairobi',latlng:[-1.28,36.82],flag:'🇰🇪',region:'Africa',subregion:'Eastern Africa',population:53700000,languages:'Swahili, English',currencies:'Kenyan Shilling (KSh)',timezones:'UTC+03:00'}
      ];
      COUNTRY_INDEX = fb;
      $('#countryList').innerHTML = fb.map(c=>`<option value="${c.name}">`).join('');
    }
  };

  const findCountry = (input) => {
    const q = (input||'').trim().toLowerCase();
    if(!q) return null;
    return COUNTRY_INDEX.find(c =>
      c.name.toLowerCase() === q ||
      c.official?.toLowerCase() === q ||
      c.cca2.toLowerCase() === q
    ) || COUNTRY_INDEX.find(c => c.name.toLowerCase().startsWith(q));
  };

  /* ---------- 4. Real-time data calls ---------- */
  const getWeather = async (lat, lon) => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`+
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,uv_index`+
      `&daily=precipitation_probability_max,uv_index_max&timezone=auto&forecast_days=2`;
    return fetchJSON(url);
  };

  const getAirQuality = async (lat, lon) => {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}`+
      `&current=european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone&timezone=auto`;
    return fetchJSON(url);
  };

  const getCovid = async (iso2) => {
    try {
      return await fetchJSON(`https://disease.sh/v3/covid-19/countries/${iso2}?strict=true`);
    } catch { return null; }
  };

  /* ---------- 5. Risk evaluation ---------- */
  const buildVaccineList = (iso2) => {
    const list = [];
    Object.entries(HEALTH_DB).forEach(([key, def]) => {
      if(def.countries.includes(iso2)) {
        list.push({ label: def.label, tag: def.tag, note: def.note });
      }
    });
    // Always add routine
    return { specific: list, routine: ROUTINE_VACCINES };
  };

  const computeRisk = (iso2, weather, aqi, covid, vaccineSpecific) => {
    let score = 0;
    const reasons = [];

    // Vaccine-required diseases weigh heaviest
    const required = vaccineSpecific.filter(v=>v.tag==='required').length;
    const recommended = vaccineSpecific.filter(v=>v.tag==='recommended').length;
    score += required * 18 + recommended * 6;
    if(required) reasons.push(`存在 ${required} 項高關注疾病風險`);
    if(recommended) reasons.push(`${recommended} 項區域性疾病需做好預防`);

    // AQI
    const aqiVal = aqi?.current?.european_aqi;
    if(typeof aqiVal === 'number') {
      if(aqiVal > 80) { score += 18; reasons.push('空氣質量極差'); }
      else if(aqiVal > 60) { score += 10; reasons.push('空氣質量較差'); }
      else if(aqiVal > 40) { score += 4; }
    }

    // UV
    const uv = weather?.current?.uv_index;
    if(typeof uv === 'number' && uv >= 8) { score += 6; reasons.push('紫外線強度高'); }

    // Temperature extremes
    const t = weather?.current?.temperature_2m;
    if(typeof t === 'number') {
      if(t >= 35) { score += 8; reasons.push('當地高溫，注意中暑'); }
      else if(t <= -10) { score += 8; reasons.push('當地嚴寒，注意凍傷'); }
    }

    // COVID activity
    const todayCases = covid?.todayCases;
    const pop = covid?.population;
    if(todayCases && pop) {
      const per1m = (todayCases / pop) * 1_000_000;
      if(per1m > 200) { score += 10; reasons.push('COVID 活躍度較高'); }
      else if(per1m > 50) { score += 4; }
    }

    let level, klass;
    if(score >= 35) { level = 'High · 高風險'; klass = 'high'; }
    else if(score >= 15) { level = 'Moderate · 中等風險'; klass = 'moderate'; }
    else { level = 'Low · 低風險'; klass = 'low'; }

    return { level, klass, score, reasons };
  };

  /* ---------- 6. Render helpers ---------- */
  const renderOverview = (c) => {
    const popFmt = c.population ? c.population.toLocaleString() : '—';
    const items = [
      { k:'國名（官方）', v: c.official || c.name },
      { k:'首都', v: c.capital },
      { k:'地區', v: `${c.region}${c.subregion?' · '+c.subregion:''}` },
      { k:'人口', v: popFmt },
      { k:'時區', v: c.timezones },
      { k:'官方語言', v: c.languages },
      { k:'貨幣', v: c.currencies }
    ];
    $('#overviewList').innerHTML = items.map(i =>
      `<li><span class="item-name">${escapeHtml(i.k)}</span><span style="text-align:right;color:#555;">${escapeHtml(i.v)}</span></li>`
    ).join('');
  };

  const uvDescriptor = (u) => {
    if(u==null) return '—';
    if(u<3) return '低 · 一般人群安全';
    if(u<6) return '中等 · 建議防曬';
    if(u<8) return '較強 · 戴帽、SPF30+';
    if(u<11) return '很強 · 避免正午外出';
    return '極強 · 嚴防曬傷';
  };

  const renderWeather = (w) => {
    const cur = w?.current; if(!cur) return;
    $('#wxTemp').textContent = Math.round(cur.temperature_2m);
    $('#wxFeels').textContent = `體感 ${Math.round(cur.apparent_temperature)}°C`;
    $('#wxUv').textContent = (cur.uv_index ?? '—').toString().slice(0,4);
    $('#wxUvNote').textContent = uvDescriptor(cur.uv_index);
    $('#wxHum').textContent = Math.round(cur.relative_humidity_2m ?? 0);
    const prec = w?.daily?.precipitation_probability_max?.[0];
    $('#wxPrec').textContent = prec ?? '—';

    const tips = [];
    if(cur.temperature_2m >= 30) tips.push('炎熱，多補水並避免中暑。');
    if(cur.temperature_2m <= 5) tips.push('低溫，準備保暖衣物。');
    if((cur.uv_index||0) >= 6) tips.push('紫外線較強，使用防曬霜並戴帽。');
    if((prec||0) >= 50) tips.push('降水概率較高，攜帶雨具。');
    if((cur.relative_humidity_2m||0) >= 80) tips.push('高濕環境，注意散熱與皮膚清潔。');
    $('#wxAdvice').textContent = tips.length ? tips.join(' ') : '當前氣象條件對健康影響較小。';
  };

  const aqiBand = (v) => {
    if(v==null) return { label:'—', advice:'空氣質量數據暫不可用。' };
    if(v<=20) return { label:'Good · 優', advice:'空氣質量良好，可正常戶外活動。' };
    if(v<=40) return { label:'Fair · 良', advice:'空氣質量尚可，敏感人群留意身體反應。' };
    if(v<=60) return { label:'Moderate · 中', advice:'敏感人群（哮喘、心血管病）應減少劇烈戶外活動。' };
    if(v<=80) return { label:'Poor · 差', advice:'建議佩戴 N95 / KF94 口罩，限制長時間戶外活動。' };
    if(v<=100) return { label:'Very Poor · 很差', advice:'盡量留在室內，使用空氣淨化器。' };
    return { label:'Extremely Poor · 極差', advice:'避免一切非必要外出，老人兒童尤其需要保護。' };
  };

  const renderAQ = (aq) => {
    const cur = aq?.current; if(!cur) return;
    const v = cur.european_aqi;
    const band = aqiBand(v);
    $('#aqiVal').textContent = v != null ? Math.round(v) : '—';
    $('#aqiTier').textContent = band.label;
    $('#pm25').textContent = cur.pm2_5 != null ? cur.pm2_5.toFixed(1) : '—';
    $('#pm10').textContent = cur.pm10 != null ? cur.pm10.toFixed(1) : '—';
    $('#aqiAdvice').textContent = band.advice;
    const pct = Math.min(100, Math.max(0, (v||0)));
    $('#aqiPointer').style.left = pct + '%';
  };

  const renderVaccines = (vList, country, traveler) => {
    const wrap = $('#vaccineList');
    const all = [...vList.specific];

    // Pregnancy / immune flags
    if(traveler.pregnant && vList.specific.some(v=>v.label.startsWith('Yellow Fever'))) {
      all.unshift({ label: '⚠️ 黃熱病疫苗 - 妊娠注意', tag: 'required', note: '活疫苗，懷孕期一般不建議接種，需與醫生評估行程必要性' });
    }

    // routine merge
    vList.routine.forEach(r => all.push(r));

    if(!all.length) {
      wrap.innerHTML = '<li><span class="item-name">無特殊疫苗要求</span><span style="color:#888;font-size:12px;">保持常規免疫程序即可</span></li>';
      return;
    }

    wrap.innerHTML = all.map(v =>
      `<li>
        <div style="flex:1;min-width:0;">
          <div class="item-name">${escapeHtml(v.label)}</div>
          <div style="font-size:12px;color:#888;margin-top:3px;line-height:1.55;">${escapeHtml(v.note||'')}</div>
        </div>
        <span class="item-tag ${v.tag}">${v.tag}</span>
      </li>`
    ).join('');
  };

  const renderDiseases = (vList) => {
    // Highlight non-vaccine-only concerns (still grab from same DB)
    const wrap = $('#diseaseList');
    if(!vList.specific.length) {
      wrap.innerHTML = '<li><span style="color:#888;font-size:13px;">該目的地未識別出顯著區域性疾病風險</span></li>';
      return;
    }
    wrap.innerHTML = vList.specific.map(v =>
      `<li>
        <div style="flex:1;">
          <div class="item-name">${escapeHtml(v.label)}</div>
          <div style="font-size:12px;color:#888;margin-top:3px;line-height:1.55;">${escapeHtml(v.note||'')}</div>
        </div>
      </li>`
    ).join('');
  };

  const renderCovid = (cv) => {
    if(!cv) {
      $('#covidCases').textContent = '—';
      $('#covidRate').textContent = '—';
      $('#covidAdvice').textContent = 'COVID-19 數據暫不可用。';
      return;
    }
    // disease.sh provides "todayCases". For 7-day approximation we expose today.
    const today = cv.todayCases || 0;
    const per1m = cv.population ? Math.round((today / cv.population) * 1_000_000) : 0;
    $('#covidCases').textContent = (cv.cases||0).toLocaleString();
    $('#covidRate').textContent = per1m;

    let advice;
    if(per1m > 200) advice = '當前 COVID 傳播較為活躍，建議在室內、人多場所佩戴口罩，做好手衛生。';
    else if(per1m > 50) advice = '存在持續傳播，敏感人群佩戴口罩、避免擁擠空間。';
    else advice = '當前活動水平較低，仍建議保持基本防護措施。';
    $('#covidAdvice').textContent = advice;
  };

  const renderEmergency = (iso2) => {
    const e = EMERGENCY_NUMBERS[iso2] || DEFAULT_EMERGENCY;
    $('#emergencyGrid').innerHTML = `
      <div class="emergency-cell"><div class="emergency-num">${e.ambulance}</div><div class="emergency-label">救護</div></div>
      <div class="emergency-cell"><div class="emergency-num">${e.police}</div><div class="emergency-label">警察</div></div>
      <div class="emergency-cell"><div class="emergency-num">${e.fire}</div><div class="emergency-label">消防</div></div>
    `;
    if(!EMERGENCY_NUMBERS[iso2]) {
      $('#emergencyNote').textContent = '未找到該國精確記錄，已採用 GSM 通用緊急號碼 112，請以入境後當地公告為準。';
    }
  };

  const renderChecklist = (country, traveler, vList, weather) => {
    const items = [
      '提前 4–6 週預約旅行醫學門診評估疫苗接種',
      '辦理足額的境外旅行醫療保險（含緊急醫療轉運）',
      '備齊個人處方藥物，附醫生處方副本（建議英文）',
      '隨身急救包：創可貼、消毒棉、止痛藥、止瀉藥、口服補液鹽',
      '準備防曬霜 (SPF30+)、潤唇膏、護手霜',
      '攜帶常用插頭轉換器與便攜式空氣 / 水質應對工具'
    ];
    if(vList.specific.some(v=>['Malaria (瘧疾)','Malaria (瘧疾, 局部地區)','Dengue (登革熱)','Japanese Encephalitis (日本腦炎)'].includes(v.label))) {
      items.push('防蚊：DEET ≥ 20% 驅蚊液、長袖長褲、含蚊帳的住宿');
    }
    if(vList.specific.some(v=>['Hepatitis A (甲型肝炎)','Typhoid (傷寒)','Cholera (霍亂)'].includes(v.label))) {
      items.push('飲食安全：飲用瓶裝 / 煮沸水，避免生食、街邊未充分加熱食物');
    }
    if(vList.specific.some(v=>v.label.startsWith('High Altitude'))) {
      items.push('高原預備：抵達後前 24h 不劇烈活動，必要時備乙酰唑胺');
    }
    if((weather?.current?.uv_index||0) >= 6) items.push('防曬裝備：寬簷帽、UV 防護太陽眼鏡、SPF50+ 防曬霜');
    if(traveler.pregnant) items.push('孕期注意：避免登革 / 寨卡疫區，所有疫苗接種前需與婦產科醫生確認');
    if(traveler.children) items.push('兒童同行：兒童疫苗、兒童劑型藥物、出生證明 / 護照副本');
    if(traveler.conditions.length) items.push(`慢病管理：${traveler.conditions.join('、')} 對應藥物備足全程用量 + 1 週備用`);
    items.push('保存大使館 / 領事館聯絡方式並登記出行（如外交部「中國領事」APP）');

    $('#checklistEl').innerHTML = items.map(t=>`<li>${escapeHtml(t)}</li>`).join('');
  };

  const renderPersonalAdvice = (country, traveler, weather, aqi, vList) => {
    const adv = [];
    const aqiVal = aqi?.current?.european_aqi;

    if(traveler.conditions.includes('asthma') && aqiVal > 40) {
      adv.push({k:'呼吸系統',v:'空氣質量對你的哮喘 / 慢性肺病可能造成刺激。建議攜帶常規吸入劑與應急用藥，外出佩戴 N95 口罩。'});
    }
    if(traveler.conditions.includes('cardiac')) {
      adv.push({k:'心血管',v:'長途飛行 ≥ 4h 時，每 1–2 小時起立活動以預防深靜脈血栓；備齊心血管處方藥並隨身攜帶。'});
    }
    if(traveler.conditions.includes('diabetes')) {
      adv.push({k:'糖尿病',v:'血糖儀、試紙、胰島素需保溫保存；隨身備糖塊預防低血糖；提前學習當地食物碳水含量。'});
    }
    if(traveler.conditions.includes('hypertension')) {
      adv.push({k:'高血壓',v:'時差與飲食變化可能影響血壓，建議每日定時測量並記錄；繼續按時服藥，避免突然停藥。'});
    }
    if(traveler.conditions.includes('immune')) {
      adv.push({k:'免疫低下',v:'活疫苗（如黃熱病、麻疹）一般禁忌，請與感染科醫生評估。日常做好食物 / 飲水衛生與防蚊措施。'});
    }
    if(traveler.conditions.includes('allergy')) {
      adv.push({k:'過敏',v:'隨身攜帶腎上腺素自動注射筆（如有處方），用英文寫明過敏原及應急聯繫人卡片。'});
    }
    if(traveler.pregnant) {
      adv.push({k:'妊娠',v:'避免前往登革熱、寨卡及瘧疾流行區；長途飛行需在孕中期且醫生允許下進行；準備產科病歷副本。'});
    }
    if(traveler.children) {
      adv.push({k:'兒童同行',v:'兒童脫水、中暑風險高於成人，補水與防曬要更積極；兒童疫苗清單與成人不同，請另行確認。'});
    }
    if(traveler.age >= 65) {
      adv.push({k:'長者',v:'時差與氣候變化恢復較慢，建議出行前 1 週逐步調整作息；為流感與肺炎球菌疫苗加強免疫。'});
    }
    if(traveler.age <= 5 && traveler.age != null) {
      adv.push({k:'幼兒',v:'幼兒體溫調節能力差，務必準備兒童電子體溫計與兒童專用退燒藥。'});
    }
    if(traveler.purpose === 'adventure') {
      adv.push({k:'戶外探險',v:'準備外傷處理用品（止血帶、消毒、繃帶），確認當地搜救資源並登記行程。'});
    }
    if(traveler.purpose === 'volunteer' || traveler.purpose === 'medical') {
      adv.push({k:'援助 / 醫療相關',v:'可能接觸患者或不潔環境，建議補種乙肝、傷寒、霍亂；準備個人防護裝備。'});
    }

    if(!adv.length) {
      adv.push({k:'總體',v:'你的個人風險檔案無特殊提示，按通用旅行健康準則執行即可。'});
    }

    $('#personalAdvice').innerHTML = adv.map(x =>
      `<li><span class="item-name" style="min-width:88px;">${escapeHtml(x.k)}</span><span style="flex:1;color:#555;">${escapeHtml(x.v)}</span></li>`
    ).join('');
  };

  /* ---------- 7. Main flow ---------- */
  const collectTraveler = (form) => {
    const conditions = Array.from(form.querySelectorAll('input[name="conditions"]:checked')).map(i=>i.value);
    return {
      age: form.age.value ? parseInt(form.age.value,10) : null,
      pregnant: form.pregnant.value === 'yes',
      children: form.children.value === 'yes',
      conditions,
      purpose: form.purpose.value,
      depart: form.depart.value || null,
      duration: form.duration.value ? parseInt(form.duration.value,10) : null
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;

    const country = findCountry(form.country.value);
    if(!country) {
      alert('未識別目的地，請從建議列表中選擇有效國家 / 地區。');
      return;
    }
    if(!country.latlng || country.latlng.length < 2) {
      alert('該目的地缺少地理坐標，無法獲取實時數據。');
      return;
    }

    const traveler = collectTraveler(form);

    form.style.display = 'none';
    $('#loadingPanel').style.display = 'block';
    $('#resultsPanel').style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    let weather = null, aqi = null, covid = null;

    try {
      setStatus('FETCHING WEATHER ...');
      const [lat, lon] = country.latlng;
      const wxP = getWeather(lat, lon).catch(err=>{console.warn('weather',err);return null;});
      const aqP = getAirQuality(lat, lon).catch(err=>{console.warn('aqi',err);return null;});
      const cvP = getCovid(country.cca2).catch(err=>{console.warn('covid',err);return null;});

      setStatus('FETCHING AIR QUALITY ...');
      [weather, aqi, covid] = await Promise.all([wxP, aqP, cvP]);

      setStatus('ANALYZING HEALTH RISK ...');
      await new Promise(r=>setTimeout(r, 350)); // tiny visual delay
    } catch(err) {
      console.error(err);
    }

    // Build vaccine + risk
    const vList = buildVaccineList(country.cca2);
    const risk = computeRisk(country.cca2, weather, aqi, covid, vList.specific);

    // Header
    $('#resFlag').textContent = country.flag || '🌍';
    $('#resTitle').textContent = `${country.name} · ${country.capital}`;
    const dur = traveler.duration ? `${traveler.duration} 天` : '行程未指定';
    const dep = traveler.depart ? new Date(traveler.depart).toLocaleDateString() : '出發日未指定';
    $('#resSubtitle').textContent = `${dep} · 停留 ${dur} · ${({leisure:'休閒旅遊',business:'商務出差',study:'留學/訪學',visit:'探親訪友',adventure:'戶外/探險',medical:'醫療相關',volunteer:'志願/援外'}[traveler.purpose]||'—')}`;

    // Risk banner
    const banner = $('#riskBanner');
    banner.classList.remove('low','moderate','high');
    banner.classList.add(risk.klass);
    $('#riskLevel').textContent = risk.level;
    $('#riskText').textContent = risk.reasons.length
      ? '主要關注：' + risk.reasons.join('；') + '。'
      : '當前綜合風險較低，按常規旅行健康準則執行即可。';

    renderOverview(country);
    if(weather) renderWeather(weather);
    if(aqi) renderAQ(aqi);
    renderCovid(covid);
    renderVaccines(vList, country, traveler);
    renderDiseases(vList);
    renderEmergency(country.cca2);
    renderChecklist(country, traveler, vList, weather);
    renderPersonalAdvice(country, traveler, weather, aqi, vList);

    $('#lastUpdated').textContent = '最後更新：' + new Date().toLocaleString();

    $('#loadingPanel').style.display = 'none';
    $('#resultsPanel').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ---------- 8. Init ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    loadCountries();

    // Default depart date = today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth()+1).padStart(2,'0');
    const dd = String(today.getDate()).padStart(2,'0');
    $('#departDate').value = `${yyyy}-${mm}-${dd}`;

    $('#travelForm').addEventListener('submit', handleSubmit);
  });

})();
