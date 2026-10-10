import { shell, fail, esc, map, num, pct, tl, tone, ICON, MARKETS, marketById, prefs, openOnboarding, loadFunds, loadDaily, loadLive, loadCrypto, store, evalAlerts, refreshAlertDot, setLivePill, speakBtn, MONTHS, activeDays, liveOf, actStats } from '../core.js';
import { tileHTML, eventMarkets } from '../markets.js';
import { gauge } from '../../../assets/charts.js';

const app = shell('bugun', { title: 'Bugün' });
const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const IMPACT = { high: 'var(--down)', mid: 'var(--warn)', low: '#9AA6B6', session: 'var(--accent)' };
const RISK = [['vix', -1, 3], ['dxy', -1, 0.2], ['gold', -1, 0.5], ['hyg', 1, 0.15], ['cu_au', 1, 0.5], ['btc', 1, 1]];

function riskScore(L) {
  if (!L) return null;
  const m = L.markets || {}; const cu = m.copper, au = m.gold;
  const r = { vix: m.vix?.chg, dxy: m.dxy?.chg, gold: m.gold?.chg, hyg: m.hyg?.chg, btc: L.crypto?.btc?.chg, cu_au: cu && au && cu.prev && au.prev ? ((cu.price / au.price) / (cu.prev / au.prev) - 1) * 100 : null };
  let s = 0, n = 0; for (const [k, on, th] of RISK) { const v = r[k]; if (v == null) continue; n++; if (v > th) s += on; else if (v < -th) s -= on; }
  return n ? { s, n } : null;
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
  const W = store().watch;
  const R = riskScore(L);
  const rv = R ? Math.round(((R.s + 6) / 12) * 100) : null;
  const rlab = !R ? '' : R.s >= 2 ? 'Risk iştahı' : R.s <= -2 ? 'Risk kaçışı' : 'Kararsız';
  const know = (day.s1?.changes || []).slice(0, 4);
  const nowHM = now.getHours() * 60 + now.getMinutes();
  const evs = (day.s6?.today || []).filter((e) => e.impact !== 'low' && (e.impact === 'session' ? eventMarkets(e.title).some((m) => mine.includes(m)) : eventMarkets(e.title).some((m) => mine.includes(m))));
  const wStocks = F ? (W.stock || []).map((t) => F.stocks.find((s) => s.t === t)).filter(Boolean) : [];
  const days = activeDays();
  let streak = 0; for (let i = 0; ; i++) { if (days.includes(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10))) streak++; else break; }

  const watchRows = [
    ...(W.coin || []).map((c) => { const lv = liveOf(L, 'c:' + c.toLowerCase()); return lv ? `<a class="row" href="kripto.html#${c}" style="color:inherit;text-decoration:none;padding:9px 2px"><div class="main-c"><b>${c}</b></div><div class="end"><b>$${num(lv.price, lv.price < 10 ? 3 : 0)}</b></div><span class="badge-chg ${tone(lv.chg)}" style="min-width:70px;text-align:center">${pct(lv.chg, 2)}</span></a>` : ''; }),
    ...wStocks.map((s) => { const a = actStats(s); return `<a class="row" href="hisse.html?s=${s.t}" style="color:inherit;text-decoration:none;padding:9px 2px"><div class="main-c"><b>${s.t}</b><small>${a.up}↑ ${a.down}↓ fon</small></div><span class="badge-chg ${tone(s.flow_active)}" style="min-width:70px;text-align:center">${tl(s.flow_active, true)}</span></a>`; }),
  ].filter(Boolean);

  app.innerHTML = `<div class="page" style="gap:22px">
    <div class="today-h">
      <span class="date">${greet}, Burak · ${isToday ? 'bugün' : dateStr}</span>
      <div class="acts">${speakBtn('brief', '4 dk dinle')}<a class="btn" href="../index.html">Tam analiz</a></div>
      <h1>${esc(day.summary.headline)}</h1>
      <div id="brief" hidden>${esc(day.summary.headline)}. ${esc(day.summary.lede)} ${map(day.summary.paragraphs, (p) => esc(p.replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, '$1')) + ' ')}</div>
    </div>

    ${know.length ? `<div class="know">${map(know, (k, i) => `<div class="know-c glass ${k.tone === 'good' ? 'good' : k.tone === 'bad' ? 'bad' : ''}"><span class="n">${i + 1}</span><p>${esc(k.text)}</p></div>`)}</div>` : ''}

    <div>
      <div class="panel-h" style="padding:0 4px 10px"><h2 style="font-size:18px">Piyasaların</h2><button class="btn" data-prefs style="padding:5px 11px;font-size:13px">${ICON.gear}Düzenle</button></div>
      <div class="tiles">${map(mine, (id) => tileHTML(id, day, L, marketById(id)))}</div>
      <p class="xs muted" style="padding:8px 4px 0">Çubuklar: 1 gün, 1 hafta, 1 ay, yılbaşından değişim. Alt satır: hareketin sebebi → sonucu.</p>
    </div>

    ${evs.length ? `<section class="panel glass"><div class="panel-h"><h2>${isToday ? 'Bugün' : dateStr} saat saat</h2><a class="act" href="takvim.html">Takvim</a></div>
      <div class="tl">${map(evs, (e) => { const [h, m] = e.time.split(':').map(Number); const t = h * 60 + m; const past = isToday && t < nowHM - 20; return `<div class="tl-i ${e.impact === 'high' ? 'high' : ''} ${past ? 'past' : ''}"><span class="dot" style="background:${IMPACT[e.impact] || IMPACT.low}"></span><div class="t">${esc(e.time)}</div><div class="ti">${esc(e.title)}</div></div>`; })}</div>
      <div class="legend"><span><i style="background:var(--down);border-radius:50%"></i>Yüksek etki</span><span><i style="background:var(--warn);border-radius:50%"></i>Orta</span><span><i style="background:var(--accent);border-radius:50%"></i>Seans</span></div></section>` : ''}

    <div class="row3">
      <section class="panel glass" style="align-items:center;text-align:center"><div class="panel-h" style="align-self:stretch"><h2>Piyasa ruh hali</h2><span class="small muted">canlı</span></div>
        ${R ? `<div style="width:200px">${gauge(rv)}</div><b style="font-size:18px;margin-top:-8px">${rlab}</b><span class="small muted">${R.n} gösterge: korku endeksi, dolar, altın, riskli tahvil, bakır, Bitcoin</span>` : '<p class="small muted">Canlı veri bekleniyor.</p>'}</section>
      <section class="panel glass"><div class="panel-h"><h2>Takibim</h2><a class="act" href="takip.html">Düzenle</a></div>
        <div class="rows">${watchRows.length ? watchRows.slice(0, 6).join('') : '<p class="small muted">Aramadan bul, yıldıza bas.</p>'}</div></section>
      <section class="panel glass"><div class="panel-h"><h2>Bugünün dersi</h2><a class="act" href="akademi.html">Akademi</a></div>
        ${day.s8 ? `<b style="font-size:15.5px;line-height:1.35">${esc(day.s8.title)}</b>${day.s8.rule ? `<p class="small ink2">${esc(day.s8.rule)}</p>` : ''}` : ''}
        <div style="display:flex;align-items:center;gap:12px;margin-top:auto"><div class="mini-stat"><small>Okuma serin</small><b>${streak} gün</b></div><a class="btn" href="akademi.html" style="margin-left:auto">3 soru çöz</a></div></section>
    </div>
    <div class="grid" id="extra"></div>
    <p class="foot-note">Yorum sabah ${esc(day.updated || '')}'da yazıldı; rakamlar canlı. Genel piyasa değerlendirmesidir, yatırım tavsiyesi değildir.</p>
  </div>`;

  const res = evalAlerts({ funds: F, live: L, crypto: null });
  refreshAlertDot({ funds: F, live: L });
  if (mine.includes('kripto')) loadCrypto().then((C) => refreshAlertDot({ funds: F, live: L, crypto: C }));
}

function main() {
  if (!prefs().onboarded) { app.innerHTML = '<div class="loading">Panelini kuralım…</div>'; openOnboarding(() => render().catch(fail)); return; }
  render().catch(fail);
}
main();
