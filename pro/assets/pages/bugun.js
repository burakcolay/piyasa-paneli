import { shell, fail, esc, map, num, pct, tl, tone, loadFunds, loadNotes, loadDaily, loadLive, loadCrypto, readCoin, store, evalAlerts, alertTitle, refreshAlertDot, setLivePill, withTerms, periodLabel, MONTHS, actStats } from '../core.js';

const app = shell('bugun', { title: 'Bugün' });
const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const MOOD = { risk_on: ['good', 'Risk iştahı'], temkinli: ['warn', 'Temkinli'], risk_off: ['bad', 'Risk kaçışı'] };
const IMPACT = { high: 'var(--down)', mid: 'var(--warn)', low: 'var(--ink-3)', session: 'var(--accent)' };

// Canlı şerit: /api/live anahtarı → etiket
const STRIP = [
  ['spx', 'S&P 500', 0], ['ndx', 'Nasdaq 100', 0], ['xu100', 'BIST 100', 0], ['usdtry', 'USD/TRY', 2], ['gold', 'Ons altın', 0], ['btc', 'Bitcoin', 0],
];

function strip(L, day) {
  const fromDay = (name) => day.tickers.find((t) => t.name === name);
  return map(STRIP, ([k, label, d]) => {
    const m = k === 'btc' ? L?.crypto?.btc : L?.markets?.[k];
    if (m?.price) return `<div class="stat"><div class="l">${label}</div><div class="v">${num(m.price, d)}</div><div class="s ${tone(m.chg)}">${pct(m.chg, 2)}</div></div>`;
    const t = fromDay(label === 'Bitcoin' ? 'Bitcoin' : label);
    return `<div class="stat"><div class="l">${label}</div><div class="v">${esc(t?.value || '—')}</div><div class="s muted">${esc(t?.chg || '')} · sabah</div></div>`;
  });
}

function miniFlow(F) {
  const s = [...F.stocks].sort((a, b) => b.flow_active - a.flow_active);
  const pos = s.slice(0, 5), neg = s.slice(-5).reverse();
  const max = Math.max(...pos.map((x) => x.flow_active), ...neg.map((x) => -x.flow_active));
  const it = (x) => `<a class="flow-item" href="hisse.html?s=${x.t}"><span class="ft">${x.t}</span><span class="track"><span class="fill" style="width:${Math.max(3, (Math.abs(x.flow_active) / max) * 100)}%"></span></span><span class="fv">${tl(x.flow_active, true)}</span></a>`;
  return `<div class="flow-chart"><div class="flow-col pos"><h3>Ağırlığı artan</h3>${map(pos, it)}</div><div class="flow-col neg"><h3>Ağırlığı azalan</h3>${map(neg, it)}</div></div>`;
}

async function main() {
  const [{ day }, F, N, L] = await Promise.all([loadDaily(), loadFunds(), loadNotes(), loadLive()]);
  setLivePill(L);
  const now = new Date();
  const dd = new Date(day.date + 'T12:00:00');
  const isToday = now.toISOString().slice(0, 10) === day.date;
  const hour = now.getHours();
  const greet = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';
  const dateStr = `${dd.getDate()} ${MONTHS[dd.getMonth()]} ${DAYS[dd.getDay()]}`;
  const mood = MOOD[day.s1?.mood] || ['', '—'];
  const W = store().watch;

  // takip listesi satırları
  const wStocks = (W.stock || []).map((t) => F.stocks.find((s) => s.t === t)).filter(Boolean);
  const wFunds = (W.fund || []).map((c) => F.funds.find((f) => f.code === c)).filter(Boolean);
  const wl = [
    ...wStocks.map((s) => { const a = actStats(s); return `<a class="row" href="hisse.html?s=${s.t}" style="color:inherit;text-decoration:none"><div class="main-c"><b>${s.t}</b><small>${a.up} aktif fon artırdı, ${a.down} azalttı${a.nw ? ` · ${a.nw} yeni giriş` : ''}${a.out ? ` · ${a.out} çıkış` : ''}</small></div><div class="end"><b class="${tone(s.flow_active)}">${tl(s.flow_active, true)}</b><small class="muted">fon akışı</small></div></a>`; }),
    ...wFunds.map((f) => { const big = [...f.holdings].sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0]; return `<a class="row" href="fon.html?f=${f.code}" style="color:inherit;text-decoration:none"><div class="main-c"><b>${f.code}</b><small>${esc(f.company)} · en büyük değişim ${big.t} ${big.d > 0 ? '+' : '−'}${num(Math.abs(big.d), 1)} puan</small></div><div class="end"><b class="${tone(f.r1m)}">${pct(f.r1m)}</b><small class="muted">1 ay</small></div></a>`; }),
  ];

  // takvim
  const nowHM = now.getHours() * 60 + now.getMinutes();
  const ev = (e) => { const [h, m] = e.time.split(':').map(Number); const past = isToday && h * 60 + m < nowHM - 30; return `<div class="ev ${past ? 'past' : ''}"><span class="t">${esc(e.time)}</span><span class="d" style="background:${IMPACT[e.impact] || IMPACT.low}"></span><div><b>${esc(e.title)}</b><small>${esc(e.detail || '')}</small></div></div>`; };

  app.innerHTML = `<div class="page">
    <section class="hero glass">
      <span class="greet">${greet}, Burak. ${isToday ? 'Bugünün' : `${dateStr} sabahının`} okuması</span>
      <h1>${esc(day.summary.headline)}</h1>
      <p class="lede">${withTerms(day.summary.lede)}</p>
      <div class="hero-row">
        <span class="chip ${mood[0]}">Piyasa modu: ${mood[1]}</span>
        <a class="btn" href="../index.html">Günlük analizin tamamı</a>
        <a class="btn" href="fonlar.html">Fon hareketleri</a>
      </div>
    </section>

    <section class="panel glass">
      <div class="panel-h"><h2>Piyasalar</h2><span class="small muted" id="strip-note">${L ? 'Canlı, CNBC ve CoinGecko' : 'Sabah rutinindeki değerler'}</span></div>
      <div class="stats" id="strip">${strip(L, day)}</div>
    </section>

    <div class="grid">
      <section class="panel glass c7">
        <div class="panel-h"><h2>Takip listen</h2><a class="act" href="takip.html">Düzenle</a></div>
        <div class="rows">${wl.length ? wl.join('') : '<div class="empty-state"><b>Takip listen boş</b><p>Takip ettiğin hisse ve fonlar burada, fon hareketleriyle birlikte görünür. Arama kutusundan bul, yıldıza bas.</p></div>'}</div>
      </section>
      <section class="panel glass c5">
        <div class="panel-h"><h2>${isToday ? 'Bugünün takvimi' : `${dd.getDate()} ${MONTHS[dd.getMonth()]} takvimi`}</h2><span class="small muted">TSİ</span></div>
        <div>${map(day.s6?.today, ev)}</div>
      </section>
    </div>

    <div class="grid">
      <section class="panel glass c7">
        <div class="panel-h"><h2>Fonlar bu ay ne yaptı</h2><a class="act" href="fonlar.html">Tümü</a></div>
        <p class="small ink2" style="margin-top:-6px">${periodLabel(F.period)} raporları: ${esc(N.funds_headline.charAt(0).toLocaleLowerCase('tr-TR') + N.funds_headline.slice(1))}.</p>
        ${miniFlow(F)}
      </section>
      <div class="c5" style="display:flex;flex-direction:column;gap:18px">
        <section class="panel glass"><div class="panel-h"><h2>Kripto kaldıraç nabzı</h2><a class="act" href="kripto.html">Detay</a></div><div id="crypto" class="rows"><p class="small muted">Binance vadeli verisi alınıyor…</p></div></section>
        <section class="panel glass"><div class="panel-h"><h2>Alarmlar</h2><a class="act" href="takip.html">Yönet</a></div><div id="alerts" class="rows"></div></section>
      </div>
    </div>

    ${day.s8 ? `<section class="panel glass"><div class="panel-h"><h2>Günün dersi</h2><a class="act" href="../sozluk.html">Sözlük</a></div><b style="font-size:16px">${esc(day.s8.title)}</b><p class="ink2" style="max-width:80ch">${withTerms(day.s8.paragraphs?.[0] || '')}</p>${day.s8.rule ? `<div class="note"><b>Kural:</b> ${esc(day.s8.rule)}</div>` : ''}</section>` : ''}
    <p class="foot-note">Makro yazılar sabah rutininden (${esc(day.updated || '')}), fon verisi ${periodLabel(F.period)} portföy raporlarından, kripto Binance vadeli piyasasından. Yatırım tavsiyesi değildir.</p>
  </div>`;

  const renderAlerts = (C) => {
    const res = evalAlerts({ funds: F, live: L, crypto: C });
    refreshAlertDot({ funds: F, live: L, crypto: C });
    const hits = res.filter((r) => r.hit), rest = res.filter((r) => !r.hit);
    document.getElementById('alerts').innerHTML = res.length ? map([...hits, ...rest].slice(0, 4), ({ a, hit, text }) => { const t = alertTitle(a); return `<div class="row"><span class="chip ${hit ? 'warn' : ''}" style="min-width:86px;justify-content:center">${hit ? 'Tetiklendi' : hit === false ? 'Sakin' : 'Bekliyor'}</span><div class="main-c"><b>${esc(t.what)}</b><small>${esc(text)}</small></div></div>`; }) : '<p class="small muted">Alarm yok. Hisse ve fon sayfalarındaki zil düğmesiyle ekleyebilirsin.</p>';
  };
  renderAlerts(null);
  const C = await loadCrypto();
  const box = document.getElementById('crypto');
  if (!C) box.innerHTML = '<p class="small muted">Binance vadeli verisine bağlanılamadı.</p>';
  else box.innerHTML = map(C.filter((c) => (W.coin || ['BTC', 'ETH']).includes(c.code)).slice(0, 3), (c) => { const r = readCoin(c); return `<a class="row" href="kripto.html#${c.code}" style="color:inherit;text-decoration:none"><div class="main-c"><b>${c.code} <span class="chip ${r.heat >= 2 ? 'bad' : r.heat <= -2 ? 'good' : ''}" style="padding:2px 8px;font-size:12px;margin-left:4px">${r.label}</span></b><small>Fonlama %${num(c.funding, 4)} · açık pozisyon 24s ${pct(c.oi1d)}</small></div><div class="end"><b>$${num(c.price, 0)}</b><small class="${tone(c.chg)}">${pct(c.chg, 2)}</small></div></a>`; });
  renderAlerts(C);
}

main().catch(fail);
