import { shell, fail, esc, map, num, pct, tone, ICON, MARKETS, marketById, prefs, savePrefs, loadDaily, loadLive, setLivePill, refreshAlertDot, withTerms, speakBtn, lazyTV, toast, params, qm, registerTerms } from '../core.js';
import { story, liveNums, numsHTML, chainHTML, kcardsHTML, TV, NEWS_TV, eventMarkets, scenario } from '../markets.js';
import { lineChart, macroChart, yieldCurve, bondCurve, gauge, fngLabel, levelMap, flowBars, hbars, sectorHeat } from '../../../assets/charts.js';
import { heatBg, signed } from '../../../assets/app.js';

const id = params().get('m');
const M = marketById(id);
const app = shell(M ? 'm:' + M.id : 'piyasa', { title: M ? M.name : 'Piyasalar' });
const NEWS_REGION = { abd: ['ABD'], bist: ['Türkiye'], kripto: ['Kripto'], emtia: ['Emtia'], dunya: ['Avrupa', 'Asya'], faiz: ['ABD'] };
const BIAS = { destek: ['good', 'Destekleyici'], notr: ['warn', 'Nötr'], engel: ['bad', 'Engelleyici'] };

const paras = (list) => map(list, (p) => `<p>${withTerms(p)}</p>`);
const panel = (title, body, extra = '') => `<section class="panel glass"><div class="panel-h"><h2>${title}</h2>${extra}</div>${body}</section>`;

function matrix(D, pick) {
  const cell = (v, unit) => v == null ? '<td class="n muted">–</td>' : unit === 'bp' ? `<td class="n" style="background:${heatBg(-v / 15)};border-radius:8px">${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)} bp</td>` : `<td class="n" style="background:${heatBg(v)};border-radius:8px">${esc(signed(v, 1, ''))}</td>`;
  const groups = (D.kuresel?.groups || []).map((g) => ({ ...g, rows: g.rows.filter((r) => pick(r.name, g.name)) })).filter((g) => g.rows.length);
  if (!groups.length) return '';
  return panel('Performans', `<div class="tbl-wrap"><table class="tbl" style="border-collapse:separate;border-spacing:3px"><thead><tr><th>Varlık</th><th class="n">1 gün</th><th class="n">1 hafta</th><th class="n">1 ay</th><th class="n">Yılbaşından</th></tr></thead><tbody>
    ${map(groups, (g) => map(g.rows, (r) => `<tr><td><b style="font-weight:500">${esc(r.name)}</b></td>${cell(r.d1, g.unit)}${cell(r.w1, g.unit)}${cell(r.m1, g.unit)}${cell(r.ytd, g.unit)}</tr>`))}
  </tbody></table></div><p class="xs muted">Yüzde değişim; faizlerde baz puan, artış kırmızı. Sabah rutini verisi.</p>`, '<span class="small muted">Yeşil yükseliş, kırmızı düşüş</span>');
}

function deep(D) {
  const T = D.turkiye, K = D.kripto, F = D.faizler, MK = D.makro, NQ = D.nq;
  switch (id) {
    case 'abd': return `
      ${D.s2?.sectors?.length ? panel('S&P 500 sektörleri', sectorHeat(D.s2.sectors), '<span class="small muted">Dünkü değişim</span>') : ''}
      ${NQ ? panel(`Nasdaq 100 için makro rüzgâr <span class="chip ${BIAS[NQ.bias]?.[0] || ''}" style="margin-left:6px">${BIAS[NQ.bias]?.[1] || ''}</span>`, `
        <div class="prose">${paras(NQ.paragraphs)}</div>
        <div class="views"><div class="side-b bull"><h3>Lehine</h3><ul>${map(NQ.tailwinds, (x) => `<li><b>${esc(x.title)}</b><small>${esc(x.note)}</small></li>`)}</ul></div><div class="side-b bear"><h3>Aleyhine</h3><ul>${map(NQ.headwinds, (x) => `<li><b>${esc(x.title)}</b><small>${esc(x.note)}</small></li>`)}</ul></div></div>
        ${NQ.vol_times?.length ? `<div><div class="small muted" style="margin-bottom:4px">Oynaklık saatleri (TSİ)</div>${map(NQ.vol_times, (e) => `<div class="ev"><span class="t">${esc(e.time)}</span><span class="d" style="background:${e.impact === 'high' ? 'var(--down)' : e.impact === 'mid' ? 'var(--warn)' : 'var(--accent)'}"></span><div><b>${esc(e.title)}</b><small>${esc(e.note || '')}</small></div></div>`)}</div>` : ''}
        ${F?.nq_note ? `<div class="note"><b>Faiz eğrisinin anlamı:</b> ${withTerms(F.nq_note)}</div>` : ''}`, '<a class="act" href="bilanco.html">Bilanço takvimi</a>') : ''}
      ${matrix(D, (n, g) => g.startsWith('Hisse') && /S&P|Nasdaq|Dow|Russell/.test(n))}`;
    case 'bist': return `
      ${kcardsHTML(T.kpis)}
      <div class="grid">
        <section class="panel glass c7"><div class="panel-h"><h2>${esc(T.bist.title)}</h2><span class="small ${T.bist.tone === 'down' ? 'down' : 'up'}">${esc(T.bist.change_label)}</span></div>${lineChart(T.bist.points, { w: 640, h: 240, highlight: T.bist.highlight, fmt: (v) => num(v, 0), aria: T.bist.title })}</section>
        <section class="panel glass c5"><div class="panel-h"><h2>Sektörler</h2><span class="small muted">Dün</span></div>${hbars(T.sectors)}<p class="small ink2">${withTerms(T.sectors_note)}</p></section>
      </div>
      <div class="grid">
        <section class="panel glass c6"><div class="panel-h"><h2>Enflasyon (TÜFE, yıllık)</h2><b>${esc(T.cpi.last)}</b></div>${lineChart(T.cpi.labels.map((d, i) => ({ d, v: T.cpi.values[i] })), { w: 560, h: 210, padL: 44, fmt: (v) => '%' + num(v, 0) })}<p class="small ink2">${withTerms(T.cpi.note)}</p></section>
        <section class="panel glass c6"><div class="panel-h"><h2>Faiz cephesi</h2></div>${bondCurve(T.rates.bonds, T.rates.policy)}${kcardsHTML(T.rates.cards)}<p class="small ink2">${withTerms(T.rates.note)}</p></section>
      </div>
      ${panel('Türkiye verileri', `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Veri</th><th>Dönem</th><th class="n">Açıklanan</th><th class="n">Beklenti</th><th class="n">Önceki</th><th>Yorum</th></tr></thead><tbody>${map(T.macro, (r) => `<tr><td><b style="font-weight:500">${esc(r.name)}</b></td><td class="muted">${esc(r.period)}</td><td class="n ${r.tone === 'good' ? 'up' : r.tone === 'bad' ? 'down' : ''}"><b>${esc(r.actual)}</b></td><td class="n">${esc(r.cons)}</td><td class="n muted">${esc(r.prev)}</td><td class="small ink2">${esc(r.note)}</td></tr>`)}</tbody></table></div>`)}
      <div class="grid">
        <section class="panel glass c6"><div class="panel-h"><h2>Fonlar ne yapıyor?</h2><a class="act" href="fonlar.html">Fon hareketleri</a></div><p class="small ink2">Büyük hisse fonlarının bu ay hangi hisselere daha çok, hangilerine daha az para ayırdığı, hisse ve fon bazında.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn" href="fonlar.html">${ICON.flow}Fon hareketleri</a><a class="btn" href="karsilastir.html">${ICON.compare}Fon karşılaştır</a></div></section>
        ${T.lesson ? `<section class="panel glass c6"><div class="panel-h"><h2>Türkiye dersi</h2></div><b>${esc(T.lesson.title)}</b><div class="prose small">${paras(T.lesson.paragraphs)}</div>${T.lesson.rule ? `<div class="note"><b>Kural:</b> ${esc(T.lesson.rule)}</div>` : ''}</section>` : ''}
      </div>
      <p class="foot-note">BIST verileri ~15 dk gecikmeli ve sabah rutininden. TradingView ücretsiz widget'ları BIST'i göstermediği için bu sayfada canlı BIST grafiği yok.</p>`;
    case 'kripto': {
      const [fl, fc] = fngLabel(K.fng.now);
      const other = Math.max(0, 100 - K.dominance.btc - K.dominance.usdt);
      return `
      ${kcardsHTML(K.kpis)}
      <div class="grid">
        <section class="panel glass c4" style="align-items:center"><div class="panel-h" style="align-self:stretch"><h2>Korku ve açgözlülük</h2></div>${gauge(K.fng.now)}<b style="color:${fc};font-size:18px">${esc(fl)}</b><span class="small muted">Dün ${esc(K.fng.yesterday ?? '–')} · geçen hafta ${esc(K.fng.week ?? '–')}</span></section>
        <section class="panel glass c8"><div class="panel-h"><h2>Piyasa değeri ve dominans</h2><span class="small muted">TOTAL ${esc(K.dominance.total_label)}</span></div>
          <div class="alloc" style="height:28px;border-radius:10px"><span style="width:${K.dominance.btc}%;background:var(--accent)"></span><span style="width:${K.dominance.usdt}%;background:#8A97A8"></span><span style="flex:1;background:rgba(31,127,168,.35)"></span></div>
          <div class="legend"><span><i style="background:var(--accent)"></i>Bitcoin %${num(K.dominance.btc, 1)}</span><span><i style="background:#8A97A8"></i>USDT %${num(K.dominance.usdt, 1)}</span><span><i style="background:rgba(31,127,168,.35)"></i>Diğer %${num(other, 1)}</span></div>
          <div class="rows">${map(K.dom_cards, (c) => `<div class="row"><div class="main-c"><b>${esc(c.code)}</b><small style="white-space:normal">${esc(c.text)}</small></div></div>`)}</div></section>
      </div>
      <div class="grid">
        <section class="panel glass c7"><div class="panel-h"><h2>Bitcoin seviye haritası</h2></div><div class="tbl-wrap"><div style="min-width:560px">${levelMap(K.levels)}</div></div><p class="small ink2">${withTerms(K.levels.note)}</p></section>
        <section class="panel glass c5"><div class="panel-h"><h2>Spot Bitcoin ETF akışları</h2></div>${flowBars(K.etf)}<p class="small ink2">${withTerms(K.etf_note)}</p></section>
      </div>
      ${panel('Coinler', `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Coin</th><th class="n">Fiyat $</th><th class="n">1 gün</th><th class="n">1 hafta</th><th class="n">1 ay</th><th class="n">3 ay</th><th class="n">Yılbaşından</th><th class="n">1 yıl</th></tr></thead><tbody>${map(K.coins, (c) => `<tr><td><span class="tk">${esc(c.sym)}</span><span class="nm">${esc(c.name)}</span></td><td class="n">${esc(c.price)}</td>${['d1', 'w1', 'm1', 'm3', 'ytd', 'y1'].map((k) => `<td class="n ${tone(c[k])}">${pct(c[k])}</td>`).join('')}</tr>`)}</tbody></table></div><p class="small ink2">${withTerms(K.coins_note || '')}</p>`, '<a class="act" href="kripto.html">Türev piyasası</a>')}
      <div class="grid">
        <section class="panel glass c6"><div class="panel-h"><h2>Fiyatı ne itiyor, ne çekiyor</h2></div><div class="rows">${map(K.drivers, (x) => `<div class="row"><span class="chip ${x.tone === 'good' ? 'good' : x.tone === 'bad' ? 'bad' : ''}" style="min-width:74px;justify-content:center">${esc(x.tag)}</span><div class="main-c"><b>${esc(x.title)}</b><small style="white-space:normal">${esc(x.note)}</small></div></div>`)}</div></section>
        <section class="panel glass c6"><div class="panel-h"><h2>Kurumsal tablo</h2></div><div class="rows">${map(K.institutional, (x) => `<div class="row"><div class="main-c"><b>${esc(x.title)}</b><small style="white-space:normal">${esc(x.note)}</small></div><div class="end"><b>${esc(x.v)}</b></div></div>`)}</div></section>
      </div>
      ${K.lesson ? panel('Kripto dersi', `<b>${esc(K.lesson.title)}</b><div class="prose small">${paras(K.lesson.paragraphs)}</div>${K.lesson.rule ? `<div class="note"><b>Kural:</b> ${esc(K.lesson.rule)}</div>` : ''}`) : ''}
      <p class="foot-note">Fear &amp; Greed: alternative.me. Fiyatlar sabah rutini anındaki değerler; üstteki rakamlar canlı.</p>`;
    }
    case 'emtia': return `${kcardsHTML(D.s4?.cards)}${matrix(D, (n, g) => g === 'Emtia' || (g.startsWith('Döviz') && !/Bitcoin/.test(n)))}`;
    case 'dunya': return `${kcardsHTML(D.s3?.cards)}${matrix(D, (n, g) => g.startsWith('Hisse') && !/S&P|Nasdaq|Dow|Russell/.test(n))}`;
    case 'faiz': {
      const countries = Object.keys(MK.countries || {});
      return `
      ${kcardsHTML(F.kpis)}
      <div class="grid">
        <section class="panel glass c7"><div class="panel-h"><h2>ABD verim eğrisi ${qm('egri')}</h2><span class="small muted">Mavi bugün, gri bir ay önce</span></div>${yieldCurve(F.curve)}<p class="small ink2">${withTerms(F.curve_note)}</p>
          <details class="note"><summary><b>Bu grafik nasıl okunur?</b></summary><p style="margin-top:6px">Her nokta, ABD devletinin o vadede borçlanırken ödediği faiz. Normalde uzun vade daha yüksektir. Eğri yukarı kayıyorsa borçlanma pahalılaşıyor; uzun uç kısa uçtan hızlı yükseliyorsa (dikleşme) piyasa enflasyon ya da borç riskinden endişeli. 10 yıllık faiz yükselirken teknoloji hisseleri ve altın genelde baskılanır.</p></details></section>
        <section class="panel glass c5"><div class="panel-h"><h2>Fed</h2></div>
          <div class="kcards"><div class="kcard"><span class="l">Politika faizi</span><span class="v">${esc(F.fed.rate)}</span><span class="s">${esc(F.fed.rate_note)}</span></div><div class="kcard"><span class="l">Sıradaki toplantı</span><span class="v" style="font-size:17px">${esc(F.fed.next_meeting)}</span></div></div>
          <p class="small ink2">${esc(F.fed.pricing || '')}</p><div class="prose small"><p>${withTerms(F.fed.paragraph || '')}</p></div>
          ${F.speakers?.length ? `<div><div class="small muted">Konuşmacılar</div>${map(F.speakers, (s) => `<div class="row" style="padding:7px 2px"><div class="main-c">${esc(s.who)}</div><div class="end small">${esc(s.when)}</div></div>`)}</div>` : ''}</section>
      </div>
      ${MK.analysis?.effects?.length ? panel('Veriler neyi etkiliyor', `<div class="kcards">${map(MK.analysis.effects, (e) => `<div class="kcard"><span class="l">${esc(e.asset)}</span><span class="v" style="font-size:16px;color:${e.dir === 'up' ? 'var(--up)' : e.dir === 'down' ? 'var(--down)' : 'var(--ink-2)'}">${e.dir === 'up' ? 'Yukarı' : e.dir === 'down' ? 'Aşağı' : 'Yatay'}</span><span class="s">${esc(e.why)}</span></div>`)}</div>`) : ''}
      ${MK.surprises?.length ? panel('Son açıklanan veriler', `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Veri</th><th class="n">Açıklanan</th><th class="n">Beklenti</th><th class="n">Önceki</th><th>Sonuç</th></tr></thead><tbody>${map(MK.surprises, (r) => `<tr><td><b style="font-weight:500">${esc(r.name)}</b><span class="nm">${esc(r.meta)}</span></td><td class="n"><b>${esc(r.actual)}</b></td><td class="n">${esc(r.cons)}</td><td class="n muted">${esc(r.prev)}</td><td><span class="chip ${r.tone === 'good' ? 'good' : r.tone === 'bad' ? 'bad' : ''}">${esc(r.verdict)}</span></td></tr>`)}</tbody></table></div>`) : ''}
      ${countries.length ? `<section class="panel glass"><div class="panel-h"><h2>Ülke ülke makro</h2><div class="seg" id="ctabs">${countries.map((c, i) => `<button data-c="${esc(c)}" class="${i ? '' : 'on'}">${esc(c)}</button>`).join('')}</div></div><div id="cbody"></div></section>` : ''}`;
    }
  }
  return '';
}

function countryBody(C) {
  return `<div class="grid">${map(C.charts, (c) => `<div class="c6 kcard" style="gap:6px"><div style="display:flex;justify-content:space-between;gap:8px"><div><b style="font-size:14px">${esc(c.title)}</b><div class="xs muted">${esc(c.sub || '')}</div></div><b style="font-size:18px">${esc(c.last)}</b></div>${macroChart(c)}<div class="xs ink2">${esc(c.note || c.trend || '')}</div></div>`)}</div>
    ${C.note ? `<p class="small ink2">${withTerms(C.note)}</p>` : ''}`;
}

function eventsFor(D) {
  const evs = [
    ...(D.s6?.today || []).filter((e) => e.impact !== 'session').map((e) => ({ when: `Bugün ${e.time}`, title: e.title, detail: e.detail, impact: e.impact })),
    ...(D.makro?.upcoming || []).map((e) => ({ when: e.when, title: `${e.country} · ${e.name}`, detail: `Beklenti ${e.cons} · önceki ${e.prev}`, impact: e.impact })),
  ];
  const seen = new Set();
  return evs.filter((e) => { const k = e.title; if (seen.has(k)) return false; seen.add(k); return eventMarkets(e.title).includes(id); }).slice(0, 6);
}

async function marketPage() {
  const [{ day: D }, L] = await Promise.all([loadDaily(), loadLive()]);
  setLivePill(L); refreshAlertDot({ live: L });
  const S = story(id, D);
  const P = prefs(); const mine = P.markets.includes(id);
  const news = (D.news || []).filter((n) => NEWS_REGION[id]?.includes(n.region));
  const evs = eventsFor(D);

  app.innerHTML = `<div class="page">
    <section class="hero glass">
      <div class="mk-h"><span class="ic">${ICON[M.icon]}</span><span class="greet">${esc(M.name)} · sabah okuması</span>
        <button class="btn ${mine ? 'on' : ''}" id="mine" style="margin-left:auto">${ICON.star}${mine ? 'Piyasalarımda' : 'Piyasalarıma ekle'}</button></div>
      <h1>${esc(S.title)}</h1>
      <div id="nums" style="margin-top:14px">${numsHTML(liveNums(id, L))}</div>
      <div style="margin-top:14px">${chainHTML(S.chain)}</div>
      <div class="prose" id="story" style="margin-top:14px">${paras(S.paragraphs)}</div>
      ${S.watch ? `<div class="watchfor" style="margin-top:14px"><b>Neye bakmalı:</b> ${withTerms(S.watch)}</div>` : ''}
      <div class="hero-row">${speakBtn('story')}<span class="xs muted">Yorum sabah rutininde (${esc(D.updated || '')}) yazıldı; rakamlar canlı.</span></div>
    </section>
    ${(TV[id] || []).length ? `<div class="grid">${map(TV[id], (w, i) => `<section class="panel glass ${TV[id].length > 1 ? 'c6' : 'c12'}"><div class="panel-h"><h2>${esc(w[3])}</h2><span class="small muted">TradingView</span></div><div id="tv-${i}"></div></section>`)}</div>` : ''}
    ${deep(D)}
    <div class="grid">
      <section class="panel glass c6"><div class="panel-h"><h2>Bu piyasayı etkileyecek veriler</h2><a class="act" href="takvim.html">Takvim</a></div>
        ${evs.length ? map(evs, (e) => { const sc = scenario(e.title); return `<div class="cal-row" style="grid-template-columns:92px 1fr"><span class="when"><span class="imp" style="background:${e.impact === 'high' ? 'var(--down)' : e.impact === 'mid' ? 'var(--warn)' : 'var(--ink-3)'}"></span>${esc(e.when)}</span><div><b style="font-weight:500">${esc(e.title)}</b><div class="xs muted">${esc(e.detail || '')}</div>${sc ? `<div class="scen"><div><b class="up">${esc(sc.aT)}</b>${esc(sc.a)}</div><div><b class="down">${esc(sc.bT)}</b>${esc(sc.b)}</div></div>` : ''}</div></div>`; }) : '<p class="small muted">Yakın zamanda bu piyasaya özel büyük bir veri yok.</p>'}</section>
      <section class="panel glass c6"><div class="panel-h"><h2>Haberler</h2></div>
        ${news.length ? `<div class="rows">${map(news, (n) => `<div class="row" style="align-items:flex-start"><span class="xs muted" style="min-width:44px">${esc(n.date)}</span><div class="main-c"><b style="font-weight:500">${esc(n.title)}</b><small style="white-space:normal">${esc(n.why)}</small></div></div>`)}</div>` : '<p class="small muted">Bugün bu piyasaya özel öne çıkan haber yok.</p>'}
        ${NEWS_TV[id] ? `<div id="tv-news" style="margin-top:8px"></div>` : ''}</section>
    </div>
    <p class="foot-note">Yorumlar genel piyasa değerlendirmesidir, yatırım tavsiyesi değildir. Grafikler: TradingView. Canlı rakamlar: CNBC, CoinGecko.</p>
  </div>`;

  (TV[id] || []).forEach((w, i) => lazyTV(document.getElementById(`tv-${i}`), w[0], w[1], w[2]));
  if (NEWS_TV[id]) lazyTV(document.getElementById('tv-news'), 'timeline', { feedMode: 'market', market: NEWS_TV[id], displayMode: 'compact' }, 420);
  const ct = document.getElementById('ctabs');
  if (ct) {
    const show = (c) => { document.getElementById('cbody').innerHTML = countryBody(D.makro.countries[c]); ct.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.c === c)); };
    ct.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b) show(b.dataset.c); });
    show(Object.keys(D.makro.countries)[0]);
  }
  document.getElementById('mine').addEventListener('click', (e) => {
    const p = prefs(); const has = p.markets.includes(id);
    savePrefs({ markets: has ? p.markets.filter((x) => x !== id) : MARKETS.map((m) => m.id).filter((x) => x === id || p.markets.includes(x)) });
    e.currentTarget.classList.toggle('on', !has); e.currentTarget.innerHTML = `${ICON.star}${!has ? 'Piyasalarımda' : 'Piyasalarıma ekle'}`;
    toast(!has ? `${M.name} piyasalarına eklendi` : `${M.name} piyasalarından çıkarıldı`);
  });
  setInterval(async () => { const L2 = await loadLive(); if (L2) { document.getElementById('nums').innerHTML = numsHTML(liveNums(id, L2)); setLivePill(L2); } }, 60000);
}

async function hub() {
  const [{ day: D }, L] = await Promise.all([loadDaily(), loadLive()]);
  setLivePill(L);
  const P = prefs();
  app.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>Tüm piyasalar</h1><p>Her piyasanın sabah okuması ve canlı rakamları. Yıldızlı olanlar Bugün ekranında görünür.</p></div><button class="btn" data-prefs>${ICON.gear}Tercihlerimi düzenle</button></div>
    <div class="grid">${map(MARKETS, (m) => { const S = story(m.id, D); return `<section class="mk glass c6"><div class="mk-h"><span class="ic">${ICON[m.icon]}</span><h2>${esc(m.name)}</h2>${P.markets.includes(m.id) ? '<span class="chip acc" style="padding:2px 8px">Piyasalarım</span>' : ''}<a class="act" href="piyasa.html?m=${m.id}">Aç</a></div>${numsHTML(liveNums(m.id, L))}<b style="font-size:15px">${esc(S.title)}</b><p class="small ink2 clamp">${withTerms(S.paragraphs?.[0] || '')}</p></section>`; })}</div>
  </div>`;
}

(M ? marketPage() : hub()).catch(fail);
