import { shell, fail, esc, map, tvMini } from '../app.js';
import { n, pct, pctv, tone, usd, loadUS, q, bars, qLabel, ago, chgBadge, star, toggleWatch } from '../us.js';

const T = (new URLSearchParams(location.search).get('t') || 'AAPL').toUpperCase();
const app = shell('hisseler');
const TABS = [['ozet', 'Özet'], ['fin', 'Finansallar'], ['acik', 'Açıklamalar'], ['yat', 'Büyük yatırımcılar'], ['ic', 'İçeriden işlemler']];
const ROWS = [
  ['revenue', 'Gelir'], ['gross', 'Brüt kâr'], ['opinc', 'Faaliyet kârı'], ['net', 'Net kâr'], ['eps', 'Hisse başı kâr ($)', 'eps'],
  ['ocf', 'Faaliyet nakit akışı'], ['capex', 'Yatırım harcaması'], ['fcf', 'Serbest nakit akışı'], ['rnd', 'Ar-Ge gideri'], ['buyback', 'Hisse geri alımı'],
  ['_m', 'Marjlar'], ['gm', 'Brüt marj', 'pct'], ['om', 'Faaliyet marjı', 'pct'], ['nm', 'Net marj', 'pct'],
  ['_b', 'Bilanço (dönem sonu)'], ['assets', 'Toplam varlık'], ['liab', 'Toplam yükümlülük'], ['equity', 'Özkaynak'], ['cash', 'Nakit'], ['debt', 'Uzun vadeli borç'],
];
const ANNUAL_ONLY = ['assets', 'liab', 'equity', 'cash', 'debt', 'rnd', 'buyback', '_b'];
const enrich = (r) => ({ ...r, fcf: r.ocf != null ? r.ocf - (r.capex || 0) : null, gm: r.revenue && r.gross != null ? (r.gross / r.revenue) * 100 : null, om: r.revenue && r.opinc != null ? (r.opinc / r.revenue) * 100 : null, nm: r.revenue && r.net != null ? (r.net / r.revenue) * 100 : null });
const cell = (v, k) => (k === 'pct' ? pctv(v, 1) : k === 'eps' ? n(v, 2) : usd(v));
const kpi = (l, v, s = '', cls = '') => `<div class="kpi"><span class="l">${l}</span><span class="v">${v}</span>${s ? `<span class="s ${cls}">${s}</span>` : ''}</div>`;

async function main() {
  const [c, F, TR] = await Promise.all([loadUS(`co/${T}.json`), loadUS('funds.json').catch(() => null), loadUS('tr.json').catch(() => ({}))]);
  document.title = `${T} · ${c.name} · Piyasa Paneli`;
  const about = TR.about?.[T], notes = TR.notes || {}, news = TR.news?.[T] || [];
  const f = c.fin || {}, t = f.ttm || {}, v = c.val || {}, p = c.px || {};
  const A = (f.annual || []).map(enrich), Q = (f.quarterly || []).map(enrich);
  const holders = (F?.holders?.[T] || []).slice().sort((a, b) => b.value - a.value);
  const since = new Date(Date.now() - 180 * 864e5).toISOString().slice(0, 10);
  const ins = (c.insiders || []).filter((x) => x.date >= since && (x.buy || x.sell));
  const buy = ins.reduce((s, x) => s + x.buy, 0), sell = ins.reduce((s, x) => s + x.sell, 0);
  const nm = t.revenue && t.net != null ? (t.net / t.revenue) * 100 : null;
  const fcf = t.ocf != null ? t.ocf - (t.capex || 0) : null;
  const earn = (c.filings || []).find((x) => x.items?.includes('2.02'));
  const adders = holders.filter((h) => h.chg === 'new' || h.chg === 'add').length;

  const ozet = () => `<div class="row2">
      <section class="card"><span class="eyebrow">Fiyat, 1 yıl</span><div id="tv" class="tv"></div></section>
      <section class="card"><span class="eyebrow">Çeyreklik gelir ve net kâr</span>${bars(Q.slice(-8).map((x) => ({ label: qLabel(x.end), v: x.revenue, v2: x.net })), { names: ['Gelir', 'Net kâr'] })}</section>
    </div>
    <div class="row2">
      <section class="card"><span class="eyebrow">Ne iş yapar</span>${about ? `<p>${esc(about)}</p>` : `<p class="muted">${esc(c.sic || '')}</p><p class="xs muted">Türkçe özet yakında.</p>`}</section>
      <section class="card"><span class="eyebrow">Kısaca</span><div class="facts">
        ${earn ? `<div><b>Son bilanço açıklaması</b><span>${esc(earn.date)} · ${ago(earn.date)}</span></div>` : ''}
        <div><b>Yöneticiler, son 6 ay</b><span>${ins.length ? `${buy ? usd(buy) + ' alım' : 'alım yok'}, ${sell ? usd(sell) + ' satış' : 'satış yok'}` : 'İşlem yok'}</span>${ins.length ? `<span class="badge ${buy > sell ? 'b-good' : 'b-bad'}">${buy > sell ? 'Net alıcı' : 'Net satıcı'}</span>` : ''}</div>
        <div><b>Takip ettiğimiz büyük fonlar</b><span>${holders.length ? `${holders.length} fon tutuyor${adders ? `, ${adders} tanesi son çeyrekte artırdı` : ''}` : 'Hiçbiri tutmuyor'}</span></div>
        <div><b>Bilanço</b><span>${usd(f.bs?.cash)} nakit, ${usd(f.bs?.debt)} uzun vadeli borç</span><span class="badge ${f.bs?.cash > f.bs?.debt ? 'b-good' : 'b-mid'}">${f.bs?.cash > f.bs?.debt ? 'Net nakit' : 'Net borç'}</span></div>
      </div></section>
    </div>`;

  let per = 'q';
  const fin = () => {
    const L = per === 'q' ? Q : A;
    const lab = (r) => (per === 'q' ? qLabel(r.end) : String(r.fy || r.end.slice(0, 4)));
    return `<section class="card"><div class="head-row"><span class="eyebrow">Gelir ve serbest nakit akışı</span><div class="chips"><button class="chip ${per === 'q' ? 'on' : ''}" data-per="q">Çeyreklik</button><button class="chip ${per === 'y' ? 'on' : ''}" data-per="y">Yıllık</button></div></div>
      ${bars(L.slice(-10).map((r) => ({ label: lab(r), v: r.revenue, v2: r.fcf })), { names: ['Gelir', 'Serbest nakit akışı'] })}</section>
      <section class="card" style="padding:8px 12px"><div class="tbl-wrap"><table class="tbl fin"><thead><tr><th></th>${map(L, (r) => `<th class="r">${esc(lab(r))}</th>`)}</tr></thead><tbody>
      ${map(ROWS.filter(([k]) => per === 'y' || !ANNUAL_ONLY.includes(k)), ([k, l, fmt]) => (k.startsWith('_') ? `<tr class="group"><td colspan="${L.length + 1}">${l}</td></tr>` : L.every((r) => r[k] == null) ? '' : `<tr><td>${l}</td>${map(L, (r) => `<td class="r num">${cell(r[k], fmt)}</td>`)}</tr>`))}
      </tbody></table></div></section>
      <p class="source">Kaynak: SEC EDGAR, şirketin kendi bildirimleri.${f.currency && f.currency !== 'USD' ? ` Rakamlar ${esc(f.currency)} cinsinden.` : ''} Dördüncü çeyrek, yıllık rakamdan ilk üç çeyrek çıkarılarak hesaplanır.</p>`;
  };

  const acik = () => `${news.length ? `<section class="card"><span class="eyebrow">Haberler</span>${map(news, (x) => `<div class="filing"><span class="w">${esc(x.date)}</span><div><b>${esc(x.title)}</b>${x.why ? `<small>${esc(x.why)}</small>` : ''}</div></div>`)}</section>` : ''}
    <section class="card"><div class="head-row"><span class="eyebrow">SEC açıklamaları</span><span class="xs muted">8-K ${q('k8')}</span></div>
    ${map(c.filings || [], (x) => `<a class="filing" href="${esc(x.url)}" target="_blank" rel="noopener"><span class="badge ${x.form === '8-K' ? 'b-mid' : 'b-flat'}">${esc(x.form)}</span><div><b>${esc(x.label)}</b>${notes[x.acc] ? `<small>${esc(notes[x.acc])}</small>` : ''}</div><span class="w">${esc(x.date)}</span></a>`) || '<p class="muted">Açıklama yok.</p>'}</section>`;

  const yat = () => (holders.length ? `<section class="card"><div class="head-row"><span class="eyebrow">Takip ettiğimiz büyük fonlar ${q('f13')}</span><span class="xs muted">${esc(holders[0].period || '')} çeyrek sonu</span></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fon</th><th class="r">Pozisyon</th><th class="r">Portföydeki payı</th><th class="r">Adet değişimi</th><th>Son çeyrek</th></tr></thead><tbody>
    ${map(holders, (h) => `<tr><td><b>${esc(h.person)}</b><br><small class="muted">${esc(h.fund)}</small></td><td class="r num">${usd(h.value)}</td><td class="r num">${pctv(h.w, 1)}</td><td class="r num">${h.prevShares && h.chg !== 'new' ? `<span class="${tone(h.shares - h.prevShares)}">${pct((h.shares / h.prevShares - 1) * 100, 0)}</span>` : '—'}</td><td>${chgBadge(h.chg)}</td></tr>`)}
    </tbody></table></div><p class="source">13F bildirimleri çeyrek sonundan 45 gün sonraya kadar gecikmeli gelir.</p></section>`
    : '<section class="card"><b>Takip ettiğimiz büyük fonlardan hiçbiri bu hisseyi tutmuyor.</b><p class="muted small">Liste: Berkshire, Bridgewater, Renaissance, Pershing Square, ARK, Coatue, Tiger Global ve diğerleri.</p></section>');

  const ic = () => `<section class="card"><div class="head-row"><span class="eyebrow">Yönetici alım satımları ${q('form4')}</span><span class="xs muted">son 6 ay</span></div>
    ${ins.length ? `<div class="grid" style="--min:150px">${kpi('Alım', usd(buy))}${kpi('Satış', usd(sell))}${kpi(`Plana bağlı satış ${q('plan')}`, sell ? pctv((ins.filter((x) => x.plan).reduce((s, x) => s + x.sell, 0) / sell) * 100, 0) : '—')}</div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kişi</th><th>Tarih</th><th class="r">Tutar</th><th class="r">Adet</th><th></th></tr></thead><tbody>
    ${map(ins, (x) => `<tr><td><b>${esc(x.owner || '')}</b><br><small class="muted">${esc(x.title || '')}</small></td><td class="num">${esc(x.date)}</td><td class="r num ${x.buy > x.sell ? 'up' : 'down'}">${x.buy > x.sell ? '+' : '−'}${usd(Math.abs(x.buy - x.sell))}</td><td class="r num">${n(x.buy > x.sell ? x.shBuy : x.shSell)}</td><td>${x.plan ? '<span class="badge b-flat">Plan</span>' : ''}</td></tr>`)}
    </tbody></table></div>` : '<p class="muted">Son 6 ayda piyasadan alım ya da satış bildirimi yok. Hisse ödülü ve opsiyon kullanımları sayılmaz.</p>'}</section>`;

  const VIEW = { ozet, fin, acik, yat, ic };
  app.innerHTML = `<div class="wrap">
    <a class="small" href="hisseler.html">← Tüm hisseler</a>
    <section class="card lead">
      <div class="co-head">
        <div><div class="co-tk">${esc(T)} ${star(T)}</div><h1 class="page-h">${esc(c.name)}</h1><span class="muted small">${esc(c.sector || c.sic || '')}</span></div>
        <div class="co-px"><b class="mono">${p.price != null ? '$' + n(p.price, 2) : '—'}</b> <span class="mono ${tone(p.chg)}">${pct(p.chg, 2)}</span><small>son kapanış · ${esc(c.updated || '')}</small></div>
      </div>
      <div class="grid" style="--min:140px">
        ${kpi('Piyasa değeri', usd(v.mcap))}
        ${kpi(`F/K ${q('fk')}`, v.pe > 0 ? n(v.pe, 1) : '—', v.pe > 0 ? '' : 'zarar ya da veri yok', 'flat')}
        ${kpi(`Gelir, son 12 ay ${q('ttm')}`, usd(t.revenue), `${pct(t.revGrowth, 0)} yıllık`, tone(t.revGrowth))}
        ${kpi(`Net marj ${q('marj')}`, pctv(nm, 0))}
        ${kpi(`Serbest nakit verimi ${q('fcfy')}`, pctv(v.fcfYield, 1), `${usd(fcf)} / yıl`, 'flat')}
      </div>
    </section>
    <nav class="tabs" role="tablist">${map(TABS, ([k, l]) => `<button role="tab" data-tab="${k}">${l}</button>`)}</nav>
    <div id="body" class="us-body"></div>
    <p class="source">Kaynak: SEC EDGAR. Yatırım tavsiyesi değildir.</p>
  </div>`;
  const body = document.getElementById('body');
  const show = (k) => {
    history.replaceState(null, '', '#' + k);
    app.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === k));
    body.innerHTML = VIEW[k]();
    if (k === 'ozet') tvMini(document.getElementById('tv'), `NASDAQ:${T.replace('.', '')}`, { range: '12M', height: 220 });
  };
  app.addEventListener('click', (e) => {
    const s = e.target.closest('[data-star]'); if (s) { s.classList.toggle('on', toggleWatch(s.dataset.star)); return; }
    const b = e.target.closest('[data-tab]'); if (b) show(b.dataset.tab);
    const pr = e.target.closest('[data-per]'); if (pr) { per = pr.dataset.per; show('fin'); }
  });
  const h = location.hash.slice(1);
  show(h in VIEW ? h : 'ozet');
}
main().catch(fail);
