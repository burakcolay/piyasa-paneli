import { shell, fail, esc, map, num, pct, tone, usd, MARKETS, marketById, prefs, openOnboarding, loadUS, loadDaily, loadLive, store, refreshAlertDot, setLivePill, MONTHS } from '../core.js';
import { tileHTML, eventMarkets } from '../markets.js';

const app = shell('bugun', { title: 'Bugün' });
const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const IMPACT = { high: 'var(--down)', mid: 'var(--warn)', low: '#9AA6B6', session: 'var(--accent-2)' };
// Ruh hali: göstergenin yönü risk iştahıyla aynıysa +1, tersiyse −1
const RISK = [['vix', -1, 3, 'Korku endeksi'], ['dxy', -1, 0.2, 'Dolar'], ['gold', -1, 0.5, 'Altın'], ['hyg', 1, 0.15, 'Riskli tahvil'], ['cu_au', 1, 0.5, 'Bakır / altın'], ['btc', 1, 1, 'Bitcoin']];

function mood(L) {
  if (!L) return null;
  const m = L.markets || {}; const cu = m.copper, au = m.gold;
  const r = { vix: m.vix?.chg, dxy: m.dxy?.chg, gold: m.gold?.chg, hyg: m.hyg?.chg, btc: L.crypto?.btc?.chg, cu_au: cu && au && cu.prev && au.prev ? ((cu.price / au.price) / (cu.prev / au.prev) - 1) * 100 : null };
  let s = 0, n = 0;
  const rows = RISK.map(([k, on, th, name]) => { const v = r[k]; let pt = 0; if (v != null) { n++; if (v > th) pt = on; else if (v < -th) pt = -on; } s += pt; return { name, v, pt }; });
  if (!n) return null;
  const st = s >= 2 ? ['good', 'Risk iştahı', 'Para riskli varlıklara akıyor'] : s <= -2 ? ['bad', 'Risk kaçışı', 'Para güvenli limanlara kaçıyor'] : ['warn', 'Kararsız', 'Göstergeler karışık, net yön yok'];
  return { s, n, rows, st };
}

async function render() {
  const [{ day }, U, L] = await Promise.all([loadDaily(), loadUS('universe.json').catch(() => null), loadLive()]);
  setLivePill(L);
  const P = prefs();
  const mine = MARKETS.map((m) => m.id);
  const now = new Date(), dd = new Date(day.date + 'T12:00:00');
  const isToday = now.toISOString().slice(0, 10) === day.date;
  const dateStr = `${dd.getDate()} ${MONTHS[dd.getMonth()]} ${DAYS[dd.getDay()]}`;
  const W = store().watch;
  const R = mood(L);
  const know = (day.s1?.changes || []).slice(0, 4);
  const nowHM = now.getHours() * 60 + now.getMinutes();
  const evs = (day.s6?.today || []).filter((e) => e.impact !== 'low' && eventMarkets(e.title).some((m) => mine.includes(m)));
  const watchRows = (W.us || []).map((t) => U?.rows.find((r) => r.t === t)).filter(Boolean).map((r) => `<a class="row" href="sirket.html?t=${r.t}"><div class="main-c"><b>${r.t}</b><small>${esc(r.name)}</small></div><span class="end small muted">${usd(r.mcap)}</span><span class="badge-chg ${tone(r.chg)}" style="width:62px;text-align:right">${pct(r.chg, 2)}</span></a>`);
  // Nasdaq 100'ün en çok hareket edenleri (son kapanış)
  const movers = (U?.rows || []).filter((r) => r.chg != null).sort((a, b) => Math.abs(b.chg) - Math.abs(a.chg)).slice(0, 8);

  app.innerHTML = `<div class="page" style="gap:24px">
    <div class="today-h">
      <span class="date">${isToday ? 'Bugün' : dateStr}, sabah okuması</span>
      <div class="acts"><a class="btn" href="../index.html">Tam analiz</a></div>
      <h1>${esc(day.summary.headline)}</h1>
    </div>

    ${know.length ? `<div class="know">${map(know, (k) => `<div class="know-c ${k.tone === 'good' ? 'good' : k.tone === 'bad' ? 'bad' : ''}"><p>${esc(k.text)}</p></div>`)}</div>` : ''}

    <section style="display:flex;flex-direction:column;gap:12px">
      <div class="sec-h"><h2>Piyasaların</h2><a href="#" data-prefs class="small">Düzenle</a></div>
      <div class="tiles">${map(mine, (id) => tileHTML(id, day, L, marketById(id)))}</div>
      <div class="legend"><span>Çubuklar: 1 gün, 1 hafta, 1 ay, yılbaşı</span><span>Alt satır: sebep → sonuç</span></div>
    </section>

    ${movers.length ? `<section class="panel"><div class="panel-h"><h2>Nasdaq 100'de en çok hareket edenler</h2><a class="act" href="hisseler.html">Tüm hisseler</a></div>
      <div class="movers">${map(movers, (r) => `<a href="sirket.html?t=${r.t}" class="mv ${tone(r.chg)}"><b>${r.t}</b><span>${pct(r.chg, 1)}</span><small>${esc(r.name.split(' ')[0])}</small></a>`)}</div></section>` : ''}

    ${evs.length ? `<section class="panel"><div class="panel-h"><h2>${isToday ? 'Bugün' : dateStr} saat saat</h2><a class="act" href="takvim.html">Takvim</a></div>
      <div class="tl">${map(evs, (e) => { const [h, m] = e.time.split(':').map(Number); const past = isToday && h * 60 + m < nowHM - 20; return `<div class="tl-i ${e.impact === 'high' ? 'high' : ''} ${past ? 'past' : ''}"><span class="dot" style="background:${IMPACT[e.impact] || IMPACT.low}"></span><div class="t">${esc(e.time)}</div><div class="ti">${esc(e.title)}</div></div>`; })}</div>
      <div class="legend"><span><i style="background:var(--down)"></i>Yüksek etki</span><span><i style="background:var(--warn)"></i>Orta</span><span><i style="background:var(--accent-2)"></i>Seans</span></div></section>` : ''}

    <div class="row3">
      <section class="panel"><div class="panel-h"><h2>Piyasa ruh hali</h2><span class="xs muted">canlı</span></div>
        ${R ? `<div><span class="status ${R.st[0]}" style="font-size:17px;font-weight:600">${R.st[1]}</span><p class="small ink2" style="margin-top:2px">${R.st[2]}.</p></div>
          <div><div class="gauge"><i style="left:${((R.s + 6) / 12) * 100}%"></i></div><div class="gauge-l"><span>Kaçış</span><span>Kararsız</span><span>İştah</span></div></div>
          <div class="rows">${map(R.rows, (r) => `<div class="row" style="padding:6px 0"><div class="main-c small">${esc(r.name)}</div><span class="small ${r.v == null ? 'muted' : tone(r.v)}" style="font-variant-numeric:tabular-nums">${r.v != null ? pct(r.v, 2) : 'veri yok'}</span></div>`)}</div>` : '<p class="small muted">Canlı veri bekleniyor.</p>'}</section>
      <section class="panel"><div class="panel-h"><h2>Takibim</h2><a class="act" href="takip.html">Düzenle</a></div>
        <div class="rows">${watchRows.length ? watchRows.slice(0, 7).join('') : '<p class="small muted">Hisseler sayfasında yıldıza bas, burada görünsün.</p>'}</div></section>
      <section class="panel"><div class="panel-h"><h2>Günün kavramı</h2><a class="act" href="../sozluk.html">Sözlük</a></div>
        ${day.s8 ? `<b style="font-size:15px;line-height:1.4">${esc(day.s8.title)}</b>${day.s8.rule ? `<p class="small ink2">${esc(day.s8.rule)}</p>` : ''}` : '<p class="small muted">Bugün yeni kavram yok.</p>'}</section>
    </div>
    <p class="foot-note">Yorum sabah ${esc(day.updated || '')} itibarıyla yazıldı, rakamlar canlı. Genel piyasa değerlendirmesidir, yatırım tavsiyesi değildir.</p>
  </div>`;

  refreshAlertDot({ live: L });
}

function main() {
  if (!prefs().onboarded) { app.innerHTML = '<div class="loading">Panelini kuralım…</div>'; openOnboarding(() => render().catch(fail)); return; }
  render().catch(fail);
}
main();
