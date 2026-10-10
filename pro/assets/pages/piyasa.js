import { shell, fail, esc, map, num, pct, tone, ICON, MARKETS, marketById, prefs, savePrefs, loadDaily, loadLive, setLivePill, refreshAlertDot, withTerms, lazyTV, toast, params, qm } from '../core.js';
import { story, liveNums, kcardsHTML, TV, NEWS_TV, eventMarkets, scenario, tileHTML, momHTML } from '../markets.js';
import { lineChart, macroChart, yieldCurve, bondCurve, gauge, fngLabel, levelMap, flowBars, hbars, sectorHeat } from '../../../assets/charts.js';
import { heatBg, signed } from '../../../assets/app.js';

const id = params().get('m');
const M = marketById(id);
const app = shell(M ? 'm:' + M.id : 'piyasa', { title: M ? M.name : 'Piyasalar' });
const NEWS_REGION = { abd: ['ABD'], bist: ['Türkiye'], kripto: ['Kripto'], emtia: ['Emtia'], dunya: ['Avrupa', 'Asya'], faiz: ['ABD'] };
const BIAS = { destek: ['good', 'Destekleyici'], notr: ['warn', 'Nötr'], engel: ['bad', 'Engelleyici'] };
const paras = (list) => map(list, (p) => `<p>${withTerms(p)}</p>`);
const panel = (title, body, extra = '', cls = '') => `<section class="panel glass ${cls}"><div class="panel-h"><h2>${title}</h2>${extra}</div>${body}</section>`;
const lesson = (L, t) => L ? panel(t, `<b>${esc(L.title)}</b><div class="prose small">${paras(L.paragraphs)}</div>${L.rule ? `<div class="note"><b>Kural:</b> ${esc(L.rule)}</div>` : ''}`) : '';

function matrix(D, pick) {
  const cell = (v, unit) => v == null ? '<td class="n muted">–</td>' : unit === 'bp' ? `<td class="n" style="background:${heatBg(-v / 15)};border-radius:8px">${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)} bp</td>` : `<td class="n" style="background:${heatBg(v)};border-radius:8px">${esc(signed(v, 1, ''))}</td>`;
  const groups = (D.kuresel?.groups || []).map((g) => ({ ...g, rows: g.rows.filter((r) => pick(r.name, g.name)) })).filter((g) => g.rows.length);
  if (!groups.length) return '';
  return panel('Performans', `<div class="tbl-wrap"><table class="tbl" style="border-collapse:separate;border-spacing:3px"><thead><tr><th>Varlık</th><th class="n">1 gün</th><th class="n">1 hafta</th><th class="n">1 ay</th><th class="n">Yılbaşından</th></tr></thead><tbody>
    ${map(groups, (g) => map(g.rows, (r) => `<tr><td><b style="font-weight:500">${esc(r.name)}</b></td>${cell(r.d1, g.unit)}${cell(r.w1, g.unit)}${cell(r.m1, g.unit)}${cell(r.ytd, g.unit)}</tr>`))}
  </tbody></table></div>`, '<span class="small muted">%, faizde baz puan</span>');
}

/* ---------- sekme içerikleri ---------- */
function charts(D) {
  const T = D.turkiye, K = D.kripto, F = D.faizler;
  const tv = (TV[id] || []).map((w, i) => panel(esc(w[3]), `<div id="tv-${i}"></div>`, '<span class="small muted">TradingView</span>', (TV[id].length > 1 ? 'c6' : 'c12'))).join('');
  let own = '';
  if (id === 'abd' && D.s2?.sectors?.length) own = panel('S&P 500 sektörleri (dün)', sectorHeat(D.s2.sectors), '', 'c12');
  if (id === 'bist') own = panel(esc(T.bist.title), lineChart(T.bist.points, { w: 640, h: 240, highlight: T.bist.highlight, fmt: (v) => num(v, 0) }), `<span class="badge-chg ${T.bist.tone === 'down' ? 'down' : 'up'}">${esc(T.bist.change_label)}</span>`, 'c7')
    + panel('Sektörler (dün)', hbars(T.sectors), '', 'c5')
    + panel(`Enflasyon · ${esc(T.cpi.last)}`, lineChart(T.cpi.labels.map((d, i) => ({ d, v: T.cpi.values[i] })), { w: 560, h: 210, padL: 44, fmt: (v) => '%' + num(v, 0) }), '', 'c6')
    + panel('Tahvil faizleri ve politika faizi', bondCurve(T.rates.bonds, T.rates.policy), '', 'c6');
  if (id === 'kripto') { const [fl, fc] = fngLabel(K.fng.now); own = panel('Korku ve açgözlülük', `<div style="max-width:240px;margin:0 auto">${gauge(K.fng.now)}</div><b style="color:${fc};font-size:18px;text-align:center">${esc(fl)}</b>`, '', 'c4')
    + panel('Spot Bitcoin ETF akışları', flowBars(K.etf), '', 'c8')
    + panel('Bitcoin seviye haritası', `<div class="tbl-wrap"><div style="min-width:560px">${levelMap(K.levels)}</div></div>`, '', 'c12'); }
  if (id === 'faiz') own = panel(`ABD verim eğrisi ${qm('egri')}`, `${yieldCurve(F.curve)}<div class="legend"><span><i style="background:#1F4FD1"></i>Bugün</span><span><i style="background:#9AA6B6"></i>1 ay önce</span></div>`, '', 'c12')
    + (Object.keys(D.makro?.countries || {}).length ? `<section class="panel glass c12"><div class="panel-h"><h2>Ülke ülke makro</h2><div class="seg" id="ctabs">${Object.keys(D.makro.countries).map((c, i) => `<button data-c="${esc(c)}" class="${i ? '' : 'on'}">${esc(c)}</button>`).join('')}</div></div><div id="cbody"></div></section>` : '');
  return `<div class="grid">${tv}${own}</div>`;
}

function data(D) {
  const T = D.turkiye, K = D.kripto, F = D.faizler, MK = D.makro;
  switch (id) {
    case 'abd': return matrix(D, (n, g) => g.startsWith('Hisse') && /S&P|Nasdaq|Dow|Russell/.test(n));
    case 'dunya': return matrix(D, (n, g) => g.startsWith('Hisse') && !/S&P|Nasdaq|Dow|Russell/.test(n));
    case 'emtia': return matrix(D, (n, g) => g === 'Emtia' || (g.startsWith('Döviz') && !/Bitcoin/.test(n)));
    case 'bist': return panel('Türkiye verileri', `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Veri</th><th>Dönem</th><th class="n">Açıklanan</th><th class="n">Beklenti</th><th class="n">Önceki</th></tr></thead><tbody>${map(T.macro, (r) => `<tr><td><b style="font-weight:500">${esc(r.name)}</b><span class="nm">${esc(r.note)}</span></td><td class="muted">${esc(r.period)}</td><td class="n"><span class="badge-chg ${r.tone === 'good' ? 'up' : r.tone === 'bad' ? 'down' : 'muted'}">${esc(r.actual)}</span></td><td class="n">${esc(r.cons)}</td><td class="n muted">${esc(r.prev)}</td></tr>`)}</tbody></table></div>`)
      + `<div class="grid">${panel('Fonlar ne yapıyor?', `<p class="small ink2">Büyük hisse fonlarının bu ay hangi hisselere daha çok para ayırdığı.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn" href="fonlar.html">${ICON.flow}Fon hareketleri</a><a class="btn" href="karsilastir.html">${ICON.compare}Fon karşılaştır</a></div>`, '', 'c12')}</div>`;
    case 'kripto': return panel('Coinler', `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Coin</th><th class="n">Fiyat $</th><th class="n">1 gün</th><th class="n">1 hafta</th><th class="n">1 ay</th><th class="n">3 ay</th><th class="n">YB</th><th class="n">1 yıl</th></tr></thead><tbody>${map(K.coins, (c) => `<tr><td><span class="tk">${esc(c.sym)}</span><span class="nm">${esc(c.name)}</span></td><td class="n">${esc(c.price)}</td>${['d1', 'w1', 'm1', 'm3', 'ytd', 'y1'].map((k) => `<td class="n ${tone(c[k])}">${pct(c[k])}</td>`).join('')}</tr>`)}</tbody></table></div>`, '<a class="act" href="kripto.html">Türev piyasası</a>')
      + `<div class="grid">${panel('Dominans', `<div class="alloc" style="height:26px;border-radius:10px"><span style="width:${K.dominance.btc}%;background:var(--accent)"></span><span style="width:${K.dominance.usdt}%;background:#8A97A8"></span><span style="flex:1;background:rgba(31,127,168,.3)"></span></div><div class="legend"><span><i style="background:var(--accent)"></i>BTC %${num(K.dominance.btc, 1)}</span><span><i style="background:#8A97A8"></i>USDT %${num(K.dominance.usdt, 1)}</span><span><i style="background:rgba(31,127,168,.3)"></i>Diğer</span></div>`, `<span class="small muted">TOTAL ${esc(K.dominance.total_label)}</span>`, 'c6')
      + panel('Kurumsal', `<div class="rows">${map(K.institutional, (x) => `<div class="row"><div class="main-c"><b>${esc(x.title)}</b></div><div class="end"><b>${esc(x.v)}</b></div></div>`)}</div>`, '', 'c6')}</div>`;
    case 'faiz': return kcardsHTML(F.kpis)
      + `<div class="grid">${panel('Fed', `<div class="kcards"><div class="kcard"><span class="l">Politika faizi</span><span class="v">${esc(F.fed.rate)}</span></div><div class="kcard"><span class="l">Sıradaki toplantı</span><span class="v" style="font-size:17px">${esc(F.fed.next_meeting)}</span></div></div><p class="small ink2">${esc(F.fed.pricing || '')}</p>${F.speakers?.length ? map(F.speakers, (s) => `<div class="row" style="padding:7px 2px"><div class="main-c small">${esc(s.who)}</div><div class="end small">${esc(s.when)}</div></div>`) : ''}`, '', 'c5')
      + panel('Son açıklanan veriler', `<div class="tbl-wrap"><table class="tbl"><tbody>${map(MK.surprises, (r) => `<tr><td><b style="font-weight:500">${esc(r.name)}</b><span class="nm">${esc(r.meta)}</span></td><td class="n"><b>${esc(r.actual)}</b><span class="nm">bkl. ${esc(r.cons)}</span></td><td class="n"><span class="badge-chg ${r.tone === 'good' ? 'up' : r.tone === 'bad' ? 'down' : 'muted'}">${esc(r.verdict)}</span></td></tr>`)}</tbody></table></div>`, '', 'c7')}</div>`;
  }
  return '';
}

function analysis(D, S) {
  const NQ = D.nq, F = D.faizler, K = D.kripto, T = D.turkiye;
  const news = (D.news || []).filter((n) => NEWS_REGION[id]?.includes(n.region));
  let extra = '';
  if (id === 'abd' && NQ) extra = panel(`Nasdaq 100 makro rüzgârı <span class="status ${BIAS[NQ.bias]?.[0] || ''}" style="margin-left:8px;font-weight:500">${BIAS[NQ.bias]?.[1] || ''}</span>`, `<div class="prose">${paras(NQ.paragraphs)}</div>${F?.nq_note ? `<div class="note"><b>Faiz eğrisinin anlamı:</b> ${withTerms(F.nq_note)}</div>` : ''}`);
  if (id === 'faiz') extra = panel('Fed ne düşünüyor', `<div class="prose"><p>${withTerms(F.fed.paragraph || '')}</p></div><p class="small ink2">${withTerms(F.curve_note || '')}</p>`);
  if (id === 'kripto') extra = panel('Seviye haritası nasıl okunur', `<p class="small ink2">${withTerms(K.levels.note)}</p><p class="small ink2">${withTerms(K.etf_note || '')}</p>`);
  if (id === 'bist') extra = panel('Sektör ve faiz notları', `<p class="small ink2">${withTerms(T.sectors_note)}</p><p class="small ink2">${withTerms(T.cpi.note)}</p><p class="small ink2">${withTerms(T.rates.note)}</p>`);
  return `<section class="panel glass" id="story"><div class="panel-h"><h2>Sabah analizi</h2></div><div class="prose" id="story-text">${paras(S.paragraphs)}</div></section>
    ${extra}
    ${news.length ? panel('Haberler ve neden önemli', `<div class="rows">${map(news, (n) => `<div class="row" style="align-items:flex-start"><span class="xs muted" style="min-width:44px">${esc(n.date)}</span><div class="main-c"><b style="font-weight:500">${esc(n.title)}</b><small style="white-space:normal">${esc(n.why)}</small></div></div>`)}</div>${NEWS_TV[id] ? '<div id="tv-news" style="margin-top:8px"></div>' : ''}`) : ''}
    ${id === 'bist' ? lesson(T.lesson, 'Türkiye dersi') : id === 'kripto' ? lesson(K.lesson, 'Kripto dersi') : ''}`;
}

function overview(D, S, L) {
  const nums = liveNums(id, L);
  const evs = [
    ...(D.s6?.today || []).filter((e) => e.impact === 'high' || e.impact === 'mid').map((e) => ({ when: e.time, title: e.title, impact: e.impact })),
    ...(D.makro?.upcoming || []).filter((e) => e.impact === 'high').map((e) => ({ when: e.when, title: `${e.country} · ${e.name}`, impact: e.impact })),
  ].filter((e, i, a) => { const k = (t) => t.replace(/^[^·]+·\s*/, '').replace(/\s*\(.*?\)/g, '').toLocaleLowerCase('tr-TR'); return eventMarkets(e.title).includes(id) && a.findIndex((x) => k(x.title) === k(e.title)) === i; }).slice(0, 4);
  const K = D.kripto, T = D.turkiye, NQ = D.nq;
  const side = id === 'kripto' ? `<div class="mini-stat"><small>Korku ve açgözlülük</small><b>${K.fng.now} · ${esc(fngLabel(K.fng.now)[0])}</b></div><div class="mini-stat"><small>Bitcoin dominansı</small><b>%${num(K.dominance.btc, 1)}</b></div>`
    : id === 'abd' && NQ ? `<div class="mini-stat"><small>Nasdaq 100 için makro rüzgâr</small><b><span class="status ${BIAS[NQ.bias]?.[0]}" style="font-size:16px">${BIAS[NQ.bias]?.[1]}</span></b></div>`
    : id === 'bist' ? `<div class="mini-stat"><small>Enflasyon (yıllık)</small><b>${esc(T.cpi.last)}</b></div><div class="mini-stat"><small>Politika faizi</small><b>%${num(T.rates.policy, 0)}</b></div>`
    : id === 'faiz' ? `<div class="mini-stat"><small>Fed faizi</small><b>${esc(D.faizler.fed.rate)}</b></div><div class="mini-stat"><small>Sıradaki toplantı</small><b>${esc(D.faizler.fed.next_meeting)}</b></div>` : '';
  return `<div class="tiles" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">${map(nums, (n) => `<div class="tile glass" style="gap:6px"><div class="tile-h">${esc(n.label)}</div><div class="big" style="font-size:26px">${esc(n.value)}</div><div class="sub"><span class="badge-chg ${n.key === 'vix' || n.key === 'us10y' || n.key === 'us30y' ? tone(-n.chg) : tone(n.chg)}">${n.chg != null ? pct(n.chg, 2) : '—'}</span></div></div>`)}</div>
    <div class="grid">
      <section class="panel glass c7"><div class="panel-h"><h2>Ne oldu, neden</h2><button class="btn" data-tab="analiz" style="padding:5px 11px;font-size:13px">Analizi oku</button></div>
        ${S.chain?.length ? `<div class="flowv">${map(S.chain, (c, i) => `<div class="st"><i>${i + 1}</i><span>${esc(c)}</span></div>`)}</div>` : id === 'kripto' && K.drivers?.length ? `<div class="rows">${map(K.drivers, (x) => `<div class="row" style="padding:9px 2px"><span class="badge-chg ${x.tone === 'good' ? 'up' : x.tone === 'bad' ? 'down' : 'muted'}" style="min-width:64px;text-align:center">${esc(x.tag)}</span><div class="main-c"><b style="font-weight:500">${esc(x.title)}</b></div></div>`)}</div>` : `<p class="ink2">${withTerms(S.paragraphs?.[0] || '')}</p>`}
        ${S.watch ? `<div class="watchfor"><b>Neye bakmalı:</b> ${withTerms(S.watch)}</div>` : ''}</section>
      <div class="c5" style="display:flex;flex-direction:column;gap:18px">
        <section class="panel glass"><div class="panel-h"><h2>Momentum</h2><span class="small muted">1g · 1h · 1a · YB</span></div>${momHTML(D, id) || '<p class="small muted">—</p>'}${side ? `<div style="display:flex;gap:22px;flex-wrap:wrap;margin-top:4px">${side}</div>` : ''}</section>
        <section class="panel glass"><div class="panel-h"><h2>Yaklaşan veriler</h2><a class="act" href="takvim.html">Takvim</a></div>
          ${evs.length ? map(evs, (e) => { const sc = scenario(e.title); return `<div class="row" style="align-items:flex-start;padding:9px 2px"><span class="imp" style="width:8px;height:8px;border-radius:50%;margin-top:7px;flex:none;background:${e.impact === 'high' ? 'var(--down)' : 'var(--warn)'}"></span><div class="main-c"><b style="font-weight:500;font-size:13.5px">${esc(e.title)}</b>${sc ? `<small class="mini-sc">${esc(sc.aT)}: ${esc(sc.a)}</small>` : ''}</div><span class="small muted" style="white-space:nowrap">${esc(e.when)}</span></div>`; }) : '<p class="small muted">Yakında bu piyasaya özel büyük veri yok.</p>'}</section>
      </div>
    </div>
    ${S.cards?.length ? kcardsHTML(S.cards) : ''}`;
}

function countryBody(C) {
  return `<div class="grid">${map(C.charts, (c) => `<div class="c6 kcard" style="gap:6px"><div style="display:flex;justify-content:space-between;gap:8px"><div><b style="font-size:14px">${esc(c.title)}</b><div class="xs muted">${esc(c.sub || '')}</div></div><b style="font-size:18px">${esc(c.last)}</b></div>${macroChart(c)}<div class="xs ink2">${esc(c.trend || '')}</div></div>`)}</div>`;
}

async function marketPage() {
  const [{ day: D }, L] = await Promise.all([loadDaily(), loadLive()]);
  setLivePill(L); refreshAlertDot({ live: L });
  const S = story(id, D);
  const mine = prefs().markets.includes(id);
  const TABS = [['ozet', 'Özet'], ['grafik', 'Grafikler'], ['veri', 'Veriler'], ['analiz', 'Analiz']];

  app.innerHTML = `<div class="page" style="gap:20px">
    <div class="today-h">
      <span class="date" style="display:flex;align-items:center;gap:8px"><span class="mk-h"><span class="ic" style="width:28px;height:28px">${ICON[M.icon]}</span></span>${esc(M.name)}</span>
      <div class="acts"><button class="btn ${mine ? 'on' : ''}" id="mine">${ICON.star}${mine ? 'Piyasalarımda' : 'Piyasalarıma ekle'}</button></div>
      <h1>${esc(S.title)}</h1>
    </div>
    <div class="tabs" role="tablist">${map(TABS, ([k, l], i) => `<button role="tab" data-tab="${k}" class="${i ? '' : 'on'}">${l}</button>`)}</div>
    <div class="tabpane" data-pane="ozet" style="display:flex;flex-direction:column;gap:18px">${overview(D, S, L)}</div>
    <div class="tabpane" data-pane="grafik" hidden>${charts(D)}</div>
    <div class="tabpane" data-pane="veri" hidden style="display:flex;flex-direction:column;gap:18px">${data(D) || '<p class="small muted">Bu piyasa için ek tablo yok.</p>'}</div>
    <div class="tabpane" data-pane="analiz" hidden style="display:flex;flex-direction:column;gap:18px">${analysis(D, S)}</div>
    <p class="foot-note">Yorum sabah ${esc(D.updated || '')}'da yazıldı; rakamlar canlı. Genel piyasa değerlendirmesidir, yatırım tavsiyesi değildir.</p>
  </div>`;

  let tvDone = false;
  const show = (k) => {
    app.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === k && b.closest('.tabs')));
    app.querySelectorAll('[data-pane]').forEach((p) => { p.hidden = p.dataset.pane !== k; });
    if (k === 'grafik' && !tvDone) { tvDone = true; (TV[id] || []).forEach((w, i) => lazyTV(document.getElementById(`tv-${i}`), w[0], w[1], w[2])); const ct = document.getElementById('ctabs'); if (ct) { const sc = (c) => { document.getElementById('cbody').innerHTML = countryBody(D.makro.countries[c]); ct.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.c === c)); }; ct.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b) sc(b.dataset.c); }); sc(Object.keys(D.makro.countries)[0]); } }
    if (k === 'analiz' && NEWS_TV[id] && document.getElementById('tv-news') && !document.getElementById('tv-news').childElementCount) lazyTV(document.getElementById('tv-news'), 'timeline', { feedMode: 'market', market: NEWS_TV[id], displayMode: 'compact' }, 420);
    history.replaceState(null, '', `?m=${id}${k === 'ozet' ? '' : '#' + k}`);
    window.scrollTo({ top: 0 });
  };
  app.addEventListener('click', (e) => { const t = e.target.closest('[data-tab]'); if (t) show(t.dataset.tab); });
  if (location.hash && TABS.some(([k]) => k === location.hash.slice(1))) show(location.hash.slice(1));
  document.getElementById('mine').addEventListener('click', (e) => {
    const p = prefs(); const has = p.markets.includes(id);
    savePrefs({ markets: has ? p.markets.filter((x) => x !== id) : MARKETS.map((m) => m.id).filter((x) => x === id || p.markets.includes(x)) });
    e.currentTarget.classList.toggle('on', !has); e.currentTarget.innerHTML = `${ICON.star}${!has ? 'Piyasalarımda' : 'Piyasalarıma ekle'}`;
    toast(!has ? `${M.name} piyasalarına eklendi` : `${M.name} piyasalarından çıkarıldı`);
  });
}

async function hub() {
  const [{ day: D }, L] = await Promise.all([loadDaily(), loadLive()]);
  setLivePill(L);
  app.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>Tüm piyasalar</h1><p>Bir piyasaya dokun, özetini aç.</p></div><button class="btn" data-prefs>${ICON.gear}Piyasalarımı düzenle</button></div>
    <div class="tiles">${map(MARKETS, (m) => tileHTML(m.id, D, L, m))}</div>
  </div>`;
}

(M ? marketPage() : hub()).catch(fail);
