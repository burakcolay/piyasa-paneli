import { shell, fail, esc, map, num, pct, tl, tone, ICON, MARKETS, marketById, prefs, openOnboarding, loadFunds, loadDaily, loadLive, loadCrypto, store, evalAlerts, alertTitle, refreshAlertDot, setLivePill, withTerms, speakBtn, actStats, periodLabel, MONTHS, activeDays, liveOf } from '../core.js';
import { story, liveNums, numsHTML, chainHTML, eventMarkets, scenario } from '../markets.js';

const app = shell('bugun', { title: 'Bugün' });
const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const MOOD = { risk_on: ['good', 'Risk iştahı'], temkinli: ['warn', 'Temkinli'], risk_off: ['bad', 'Risk kaçışı'] };
const IMPACT = { high: 'var(--down)', mid: 'var(--warn)', low: 'var(--ink-3)', session: 'var(--accent)' };
const NEWS_REGION = { abd: ['ABD'], bist: ['Türkiye'], kripto: ['Kripto'], emtia: ['Emtia'], dunya: ['Avrupa', 'Asya'], faiz: ['ABD'] };

// Risk ruh hali (canlı): 6 göstergenin bugünkü değişimi
const RISK = [['vix', -1, 3, 'VIX (korku endeksi)'], ['dxy', -1, 0.2, 'Dolar endeksi'], ['gold', -1, 0.5, 'Altın'], ['hyg', 1, 0.15, 'Riskli şirket tahvili'], ['cu_au', 1, 0.5, 'Bakır / altın'], ['btc', 1, 1, 'Bitcoin']];
function risk(L) {
  if (!L) return null;
  const m = L.markets || {}; const cu = m.copper, au = m.gold;
  const r = { vix: m.vix?.chg, dxy: m.dxy?.chg, gold: m.gold?.chg, hyg: m.hyg?.chg, btc: L.crypto?.btc?.chg, cu_au: cu && au && cu.prev && au.prev ? ((cu.price / au.price) / (cu.prev / au.prev) - 1) * 100 : null };
  let score = 0;
  const rows = RISK.map(([k, on, th, name]) => { const v = r[k]; let pt = 0; if (v != null) { if (v > th) pt = on; else if (v < -th) pt = -on; } score += pt; return { name, v, pt }; });
  const st = score >= 2 ? ['good', 'Risk iştahı', 'Para riskli varlıklara akıyor.'] : score <= -2 ? ['bad', 'Risk kaçışı', 'Para güvenli limanlara kaçıyor.'] : ['warn', 'Kararsız', 'Göstergeler karışık; net bir yön yok.'];
  return { score, rows, st };
}

async function render() {
  const [{ day }, F, L] = await Promise.all([loadDaily(), loadFunds().catch(() => null), loadLive()]);
  setLivePill(L);
  const P = prefs();
  const mine = P.markets.length ? P.markets : MARKETS.map((m) => m.id);
  const now = new Date(), dd = new Date(day.date + 'T12:00:00');
  const isToday = now.toISOString().slice(0, 10) === day.date;
  const greet = now.getHours() < 12 ? 'Günaydın' : now.getHours() < 18 ? 'İyi günler' : 'İyi akşamlar';
  const dateStr = `${dd.getDate()} ${MONTHS[dd.getMonth()]} ${DAYS[dd.getDay()]}`;
  const mood = MOOD[day.s1?.mood] || ['', '—'];
  const W = store().watch;
  const R = risk(L);

  const strip = mine.flatMap((id) => liveNums(id, L).slice(0, 2)).filter((x, i, a) => a.findIndex((y) => y.key === x.key) === i).slice(0, 6);
  const nowHM = now.getHours() * 60 + now.getMinutes();
  const todays = (day.s6?.today || []).filter((e) => eventMarkets(e.title).some((m) => mine.includes(m)));
  const upcoming = (day.makro?.upcoming || []).filter((e) => e.impact === 'high' && eventMarkets(e.name, e.country).some((m) => mine.includes(m))).slice(0, 3);
  const wStocks = F ? (W.stock || []).map((t) => F.stocks.find((s) => s.t === t)).filter(Boolean) : [];
  let pf = []; try { pf = JSON.parse(localStorage.getItem('pro-portfolio-v1') || '[]'); } catch {}
  const news = (day.news || []).filter((n) => mine.some((m) => NEWS_REGION[m]?.includes(n.region))).slice(0, 5);
  const days = activeDays();
  let streak = 0; for (let i = 0; ; i++) { if (days.includes(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10))) streak++; else break; }
  const V = day.s7?.views;
  const viewList = (arr) => map(arr, (x) => `<li>${esc(x.text)}${x.who ? `<small>${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.who)}</a>` : esc(x.who)}</small>` : ''}</li>`);

  const card = (id) => {
    const m = marketById(id), S = story(id, day);
    return `<section class="mk glass">
      <div class="mk-h"><span class="ic">${ICON[m.icon]}</span><h2>${esc(m.name)}</h2><a class="act" href="piyasa.html?m=${id}">Detay</a></div>
      ${numsHTML(liveNums(id, L).slice(0, 3))}
      <b style="font-size:15.5px;line-height:1.35">${esc(S.title)}</b>
      ${P.level !== 'ileri' ? chainHTML(S.chain) : ''}
      <p class="small ink2 ${P.level === 'ileri' ? '' : 'clamp'}">${withTerms(S.paragraphs?.[0] || '')}</p>
      ${S.watch ? `<div class="watchfor"><b>Neye bakmalı:</b> ${withTerms(S.watch)}</div>` : ''}
    </section>`;
  };

  app.innerHTML = `<div class="page">
    <section class="hero glass">
      <span class="greet">${greet}, Burak. ${isToday ? 'Bugünün' : `${dateStr} sabahının`} okuması</span>
      <h1>${esc(day.summary.headline)}</h1>
      <p class="lede">${withTerms(day.summary.lede)}</p>
      <div id="brief" hidden>${esc(day.summary.headline)}. ${esc(day.summary.lede)} ${map(day.summary.paragraphs, (p) => esc(p.replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, '$1')) + ' ')}</div>
      <div class="hero-row">
        ${speakBtn('brief', 'Sabah brifingini dinle')}
        <span class="chip ${mood[0]}">Piyasa modu: ${mood[1]}</span>
        ${R ? `<span class="chip ${R.st[0]}" title="${esc(R.st[2])}">Şu an: ${R.st[1]}</span>` : ''}
        <a class="btn" href="../index.html">Tam analiz</a>
      </div>
    </section>

    ${strip.length ? `<section class="panel glass" style="padding:14px 18px"><div class="stats">${map(strip, (n) => `<div class="stat"><div class="l">${esc(n.label)}</div><div class="v">${esc(n.value)}</div><div class="s ${tone(n.chg)}">${n.chg != null ? pct(n.chg, 2) : ''}</div></div>`)}</div></section>` : ''}

    <div class="grid">
      <div class="c8" style="display:flex;flex-direction:column;gap:18px">
        <div class="panel-h" style="padding:0 4px"><h2 style="font-size:19px">Senin piyasaların</h2><button class="btn" data-prefs style="padding:6px 12px">${ICON.gear}Düzenle</button></div>
        ${map(mine, card)}
      </div>
      <div class="c4" style="display:flex;flex-direction:column;gap:18px">
        <section class="panel glass"><div class="panel-h"><h2>${isToday ? 'Bugün' : esc(dateStr)} takvimde</h2><a class="act" href="takvim.html">Tümü</a></div>
          <div>${todays.length ? map(todays, (e) => { const [h, m] = e.time.split(':').map(Number); const past = isToday && h * 60 + m < nowHM - 30; const sc = e.impact === 'high' ? scenario(e.title) : null; return `<div class="ev ${past ? 'past' : ''}"><span class="t">${esc(e.time)}</span><span class="d" style="background:${IMPACT[e.impact] || IMPACT.low}"></span><div><b>${esc(e.title)}</b><small>${esc(e.detail || '')}</small>${sc ? `<small style="display:block;margin-top:3px;color:var(--ink-2)"><b class="up" style="display:inline;font-size:12px">${esc(sc.aT)}:</b> ${esc(sc.a)}</small>` : ''}</div></div>`; }) : '<p class="small muted">Piyasalarını etkileyen bir veri yok.</p>'}</div>
          ${upcoming.length ? `<div class="small muted" style="margin-top:4px">Yaklaşan yüksek etkili</div>${map(upcoming, (e) => `<div class="row" style="padding:7px 2px"><div class="main-c"><b style="font-weight:500;font-size:13.5px">${esc(e.country)} · ${esc(e.name)}</b><small>Beklenti ${esc(e.cons)} · önceki ${esc(e.prev)}</small></div><div class="end small">${esc(e.when)}</div></div>`)}` : ''}
        </section>
        ${R ? `<section class="panel glass"><div class="panel-h"><h2>Piyasa ruh hali</h2><span class="chip ${R.st[0]}">${R.st[1]}</span></div><p class="small ink2" style="margin-top:-6px">${esc(R.st[2])} Canlı, 6 gösterge.</p>
          <div class="rows">${map(R.rows, (r) => `<div class="row" style="padding:6px 2px"><div class="main-c small">${esc(r.name)}</div><span class="small ${tone(r.v)}" style="font-variant-numeric:tabular-nums">${r.v != null ? pct(r.v, 2) : '—'}</span><span class="chip ${r.pt > 0 ? 'good' : r.pt < 0 ? 'bad' : ''}" style="padding:2px 8px;font-size:11.5px;min-width:60px;justify-content:center">${r.v == null ? 'veri yok' : r.pt > 0 ? 'iştah' : r.pt < 0 ? 'kaçış' : 'nötr'}</span></div>`)}</div></section>` : ''}
        ${P.style === 'kisa' && day.nq?.vol_times?.length ? `<section class="panel glass"><div class="panel-h"><h2>Oynaklık saatleri</h2><span class="small muted">TSİ</span></div>${map(day.nq.vol_times, (e) => `<div class="ev"><span class="t">${esc(e.time)}</span><span class="d" style="background:${IMPACT[e.impact] || IMPACT.mid}"></span><div><b>${esc(e.title)}</b><small>${esc(e.note || '')}</small></div></div>`)}</section>` : ''}
        <section class="panel glass"><div class="panel-h"><h2>Alarmlar</h2><a class="act" href="takip.html">Yönet</a></div><div id="alerts" class="rows"></div></section>
      </div>
    </div>

    ${day.s7 ? `<section class="panel glass"><div class="panel-h"><h2>Günün tartışması${V?.topic ? `: ${esc(V.topic)}` : ''}</h2></div>
      ${V ? `<div class="views"><div class="side-b bull"><h3>Yükseliş bekleyenler</h3><ul>${viewList(V.bull)}</ul></div><div class="side-b bear"><h3>Düşüş bekleyenler</h3><ul>${viewList(V.bear)}</ul></div></div>${V.split ? `<div class="note"><b>Neden ayrışıyorlar:</b> ${withTerms(V.split)}</div>` : ''}` : ''}
      <div class="grid" style="gap:12px">${[['En olası', day.s7.likely], ['Alternatif', day.s7.alternative], ['İzlenecek sinyal', day.s7.signal]].filter((x) => x[1]).map(([t, x]) => `<div class="c4 note"><b>${t}</b><br>${withTerms(x)}</div>`).join('')}</div>
      <span class="xs muted">Senaryolar genel değerlendirmedir, al/sat önerisi değildir.</span></section>` : ''}

    <div class="grid">
      <section class="panel glass c6"><div class="panel-h"><h2>Takip listen</h2><a class="act" href="takip.html">Düzenle</a></div>
        <div class="rows">${(W.coin || []).map((c) => { const lv = liveOf(L, 'c:' + c.toLowerCase()); return lv ? `<a class="row" href="kripto.html#${c}" style="color:inherit;text-decoration:none"><div class="main-c"><b>${c}</b><small>Kripto</small></div><div class="end"><b>$${num(lv.price, lv.price < 10 ? 3 : 0)}</b><small class="${tone(lv.chg)}">${pct(lv.chg, 2)}</small></div></a>` : ''; }).join('')}
        ${map(wStocks, (s) => { const a = actStats(s); return `<a class="row" href="hisse.html?s=${s.t}" style="color:inherit;text-decoration:none"><div class="main-c"><b>${s.t}</b><small>${periodLabel(F.period)}: ${a.up} aktif fon artırdı, ${a.down} azalttı</small></div><div class="end"><b class="${tone(s.flow_active)}">${tl(s.flow_active, true)}</b><small class="muted">fon akışı</small></div></a>`; })}
        ${!(W.coin || []).length && !wStocks.length ? '<p class="small muted">Arama kutusundan hisse, fon ya da coin bulup yıldıza bas.</p>' : ''}</div></section>
      <section class="panel glass c6"><div class="panel-h"><h2>Portföyün</h2><a class="act" href="portfoy.html">${pf.length ? 'Aç' : 'Oluştur'}</a></div>
        ${pf.length ? `<p class="small ink2">${pf.length} varlık takip ediliyor. Canlı değer, günlük değişim ve kâr/zarar portföy sayfasında.</p><a class="btn" href="portfoy.html" style="align-self:flex-start">${ICON.pie}Portföyümü aç</a>` : `<p class="small ink2">Varlıklarını gir; her gün portföyünün ne kadar değiştiğini ve hangi piyasanın bunu sürüklediğini gör.</p><a class="btn primary" href="portfoy.html" style="align-self:flex-start">${ICON.plus}Portföy oluştur</a>`}</section>
    </div>

    ${news.length ? `<section class="panel glass"><div class="panel-h"><h2>Piyasalarından haberler</h2></div><div class="rows">${map(news, (n) => `<div class="row" style="align-items:flex-start"><span class="chip" style="padding:2px 8px;font-size:11.5px">${esc(n.region)}</span><div class="main-c"><b style="font-weight:500">${esc(n.title)}</b><small style="white-space:normal">${esc(n.why)}</small></div></div>`)}</div></section>` : ''}

    <div class="grid">
      ${day.s8 ? `<section class="panel glass c8"><div class="panel-h"><h2>Günün dersi</h2><a class="act" href="akademi.html">Akademi</a></div><b style="font-size:16px">${esc(day.s8.title)}</b><p class="ink2" style="max-width:80ch">${withTerms(day.s8.paragraphs?.[0] || '')}</p>${day.s8.rule ? `<div class="note"><b>Kural:</b> ${esc(day.s8.rule)}</div>` : ''}</section>` : ''}
      <section class="panel glass c4"><div class="panel-h"><h2>Serin</h2><b style="font-size:22px">${streak} gün</b></div><p class="small ink2">Günün 3 sorusu seni bekliyor.</p><a class="btn" href="akademi.html" style="align-self:flex-start">Soruları çöz</a>${P.style === 'uzun' ? `<a class="btn" href="haftalik.html" style="align-self:flex-start">Haftalık derin konu</a>` : ''}</section>
    </div>
    <p class="foot-note">Yorumlar sabah rutininde (${esc(day.updated || '')}) yazıldı; rakamlar canlı (CNBC, CoinGecko). Genel piyasa değerlendirmesidir, yatırım tavsiyesi değildir.</p>
  </div>`;

  const renderAlerts = (C) => {
    const res = evalAlerts({ funds: F, live: L, crypto: C });
    refreshAlertDot({ funds: F, live: L, crypto: C });
    const hits = res.filter((r) => r.hit), rest = res.filter((r) => !r.hit);
    const el = document.getElementById('alerts'); if (!el) return;
    el.innerHTML = res.length ? map([...hits, ...rest].slice(0, 4), ({ a, hit, text }) => { const t = alertTitle(a); return `<div class="row"><span class="chip ${hit ? 'warn' : ''}" style="min-width:80px;justify-content:center">${hit ? 'Tetiklendi' : hit === false ? 'Sakin' : 'Bekliyor'}</span><div class="main-c"><b>${esc(t.what)}</b><small>${esc(text)}</small></div></div>`; }) : '<p class="small muted">Alarm yok.</p>';
  };
  renderAlerts(null);
  if (mine.includes('kripto') || store().alerts.some((a) => a.kind === 'coin')) loadCrypto().then(renderAlerts);
}

function main() {
  if (!prefs().onboarded) { app.innerHTML = '<div class="loading">Panelini kuralım…</div>'; openOnboarding(() => render().catch(fail)); return; }
  render().catch(fail);
}
main();
