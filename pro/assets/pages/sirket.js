import { shell, fail, esc, map, num, pct, tone, usd, loadUS, params, watchBtn, qm, lazyTV } from '../core.js';
import { bars, pctv, qLabel, yLabel, ago, chip, FORM_TONE } from '../us.js';

const T = (params().get('t') || 'AAPL').toUpperCase();
const app = shell('hisseler', { title: T });
const TABS = [['ozet', 'Özet'], ['fin', 'Finansallar'], ['acik', 'Açıklamalar'], ['yat', 'Büyük yatırımcılar'], ['ic', 'İçeriden işlemler']];
const ROWS = [
  ['revenue', 'Gelir'], ['gross', 'Brüt kâr'], ['opinc', 'Faaliyet kârı'], ['net', 'Net kâr'], ['eps', 'Hisse başı kâr ($)', 'eps'],
  ['ocf', 'Faaliyet nakit akışı'], ['capex', 'Yatırım harcaması'], ['fcf', 'Serbest nakit akışı'], ['rnd', 'Ar-Ge gideri'], ['buyback', 'Hisse geri alımı'],
  ['_m', 'Marjlar'], ['gm', 'Brüt marj', 'pct'], ['om', 'Faaliyet marjı', 'pct'], ['nm', 'Net marj', 'pct'],
  ['_b', 'Bilanço (dönem sonu)'], ['assets', 'Toplam varlık'], ['liab', 'Toplam borç ve yükümlülük'], ['equity', 'Özkaynak'], ['cash', 'Nakit'], ['debt', 'Uzun vadeli borç'],
];
const enrich = (r) => ({ ...r, fcf: r.ocf != null ? r.ocf - (r.capex || 0) : null, gm: r.revenue && r.gross != null ? (r.gross / r.revenue) * 100 : null, om: r.revenue && r.opinc != null ? (r.opinc / r.revenue) * 100 : null, nm: r.revenue && r.net != null ? (r.net / r.revenue) * 100 : null });
const cell = (v, k) => (k === 'pct' ? pctv(v, 1) : k === 'eps' ? (v == null ? '—' : num(v, 2)) : usd(v));

async function main() {
  const [c, F] = await Promise.all([loadUS(`co/${T}.json`), loadUS('funds.json').catch(() => null)]);
  document.title = `${T} · ${c.name} · Piyasa Paneli Pro`;
  const f = c.fin || {}, t = f.ttm || {}, v = c.val || {}, p = c.px || {};
  const A = (f.annual || []).map(enrich), Q = (f.quarterly || []).map(enrich);
  const holders = (F?.holders?.[T] || []).sort((a, b) => b.value - a.value);
  const ins = c.insiders || [];
  const since = new Date(Date.now() - 180 * 864e5).toISOString().slice(0, 10);
  const ins6 = ins.filter((x) => x.date >= since);
  const buy = ins6.reduce((s, x) => s + x.buy, 0), sell = ins6.reduce((s, x) => s + x.sell, 0);
  const nm = t.revenue && t.net != null ? (t.net / t.revenue) * 100 : null;
  const fcf = t.ocf != null ? t.ocf - (t.capex || 0) : null;
  const earn = (c.filings || []).find((x) => x.items?.includes('2.02'));

  const head = `<div class="co-head">
    <div class="co-id"><div class="co-tk">${esc(T)}${watchBtn('us', T)}</div><h1>${esc(c.name)}</h1><p>${esc([c.sector, c.sic].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).join(' · '))}</p></div>
    <div class="co-px"><b>${p.price != null ? '$' + num(p.price, 2) : '—'}</b><span class="${tone(p.chg)}">${pct(p.chg, 2)}</span><small>kapanış · ${esc(c.updated || '')}</small></div>
  </div>
  <div class="stats">
    <div class="stat"><div class="l">Piyasa değeri</div><div class="v">${usd(v.mcap)}</div></div>
    <div class="stat"><div class="l">F/K ${qm('fk')}</div><div class="v">${v.pe > 0 ? num(v.pe, 1) : '—'}</div><div class="s muted">${v.pe > 0 ? '' : 'zarar ya da veri yok'}</div></div>
    <div class="stat"><div class="l">Gelir, son 12 ay ${qm('ttm')}</div><div class="v">${usd(t.revenue)}</div><div class="s ${tone(t.revGrowth)}">${pct(t.revGrowth, 0)} yıllık</div></div>
    <div class="stat"><div class="l">Net marj ${qm('marj')}</div><div class="v">${pctv(nm, 0)}</div></div>
    <div class="stat"><div class="l">Serbest nakit verimi ${qm('fcfy')}</div><div class="v">${pctv(v.fcfYield, 1)}</div><div class="s muted">${usd(fcf)} / yıl</div></div>
  </div>`;

  const ozet = () => `<div class="grid2">
    <section class="panel"><div class="panel-h"><h2>Fiyat</h2></div><div id="tv"></div></section>
    <section class="panel"><div class="panel-h"><h2>Çeyreklik gelir ve net kâr</h2></div>${bars(Q.slice(-8).map((q) => ({ label: qLabel(q.end), v: q.revenue, v2: q.net })), { names: ['Gelir', 'Net kâr'] })}</section>
  </div>
  <div class="grid2">
    <section class="panel"><div class="panel-h"><h2>Ne iş yapar</h2></div>${c.about_tr ? `<p class="ink2">${esc(c.about_tr)}</p>` : `<p class="ink2">${esc(c.sic || '')}</p><p class="xs muted">Türkçe şirket özeti yakında.</p>`}
      ${c.website ? `<a class="small" href="${esc(c.website.startsWith('http') ? c.website : 'https://' + c.website)}" target="_blank" rel="noopener">Şirket sitesi</a>` : ''}</section>
    <section class="panel"><div class="panel-h"><h2>Kısaca</h2></div><div class="rows">
      ${earn ? `<a class="row" href="${esc(earn.url)}" target="_blank" rel="noopener"><div class="main-c"><b>Son bilanço açıklaması</b><small>${esc(earn.date)} · ${ago(earn.date)}</small></div></a>` : ''}
      <div class="row"><div class="main-c"><b>Yöneticiler, son 6 ay</b><small>${ins6.length ? `${usd(buy)} alım, ${usd(sell)} satış` : 'İşlem yok'}</small></div>${ins6.length ? `<span class="status ${buy > sell ? 'good' : sell > 0 ? 'bad' : ''}">${buy > sell ? 'Net alıcı' : 'Net satıcı'}</span>` : ''}</div>
      <div class="row"><div class="main-c"><b>Takip ettiğimiz büyük fonlar</b><small>${holders.length ? `${holders.length} fon tutuyor${holders.filter((h) => h.chg === 'new' || h.chg === 'add').length ? `, ${holders.filter((h) => h.chg === 'new' || h.chg === 'add').length} tanesi son çeyrekte artırdı` : ''}` : 'Hiçbiri tutmuyor'}</small></div></div>
      <div class="row"><div class="main-c"><b>Bilanço</b><small>${usd(f.bs?.cash)} nakit, ${usd(f.bs?.debt)} uzun vadeli borç</small></div><span class="status ${f.bs?.cash > f.bs?.debt ? 'good' : 'warn'}">${f.bs?.cash > f.bs?.debt ? 'Net nakit' : 'Net borç'}</span></div>
    </div></section>
  </div>`;

  let per = 'q';
  const fin = () => {
    const L = per === 'q' ? Q : A;
    const lab = (r) => (per === 'q' ? qLabel(r.end) : yLabel(r));
    return `<section class="panel"><div class="panel-h"><h2>Gelir ve serbest nakit akışı</h2><div class="seg" id="per"><button data-per="q" class="${per === 'q' ? 'on' : ''}">Çeyreklik</button><button data-per="y" class="${per === 'y' ? 'on' : ''}">Yıllık</button></div></div>
      ${bars(L.slice(-10).map((r) => ({ label: lab(r), v: r.revenue, v2: r.fcf })), { names: ['Gelir', 'Serbest nakit akışı'] })}</section>
      <section class="panel" style="padding:8px 10px"><div class="tbl-wrap"><table class="tbl fin"><thead><tr><th></th>${map(L, (r) => `<th class="n">${esc(lab(r))}</th>`)}</tr></thead><tbody>
      ${map(ROWS.filter(([k]) => per === 'y' || !['assets', 'liab', 'equity', 'cash', 'debt', 'rnd', 'buyback', '_b'].includes(k)), ([k, l, fmt]) => k.startsWith('_') ? `<tr class="grp"><td colspan="${L.length + 1}">${l}</td></tr>` : L.every((r) => r[k] == null) ? '' : `<tr><td>${l}</td>${map(L, (r) => `<td class="n">${cell(r[k], fmt)}</td>`)}</tr>`)}
      </tbody></table></div></section>
      <p class="foot-note">Kaynak: SEC EDGAR, şirketin kendi bildirimleri. ${f.currency && f.currency !== 'USD' ? `Rakamlar ${esc(f.currency)} cinsinden. ` : ''}Dördüncü çeyrek, yıllık rakamdan ilk üç çeyrek çıkarılarak hesaplanır.</p>`;
  };

  const acik = () => `<section class="panel"><div class="panel-h"><h2>SEC açıklamaları</h2><span class="xs muted">${qm('k8')} 8-K: önemli olay</span></div><div class="rows">
    ${map(c.filings || [], (x) => `<a class="row" href="${esc(x.url)}" target="_blank" rel="noopener"><span class="chip ${FORM_TONE[x.form] || ''}" style="min-width:64px;justify-content:center">${esc(x.form)}</span><div class="main-c"><b>${esc(x.label)}</b>${c.notes_tr?.[x.acc] ? `<small style="white-space:normal;color:var(--ink-2)">${esc(c.notes_tr[x.acc])}</small>` : ''}</div><span class="end xs muted">${esc(x.date)}</span></a>`) || '<p class="small muted">Açıklama yok.</p>'}
  </div></section>${c.news_tr?.length ? `<section class="panel"><div class="panel-h"><h2>Haberler</h2></div><div class="rows">${map(c.news_tr, (n) => `<div class="row"><div class="main-c"><b style="white-space:normal">${esc(n.title)}</b><small style="white-space:normal">${esc(n.why || '')}</small></div><span class="end xs muted">${esc(n.date)}</span></div>`)}</div></section>` : ''}`;

  const yat = () => holders.length ? `<section class="panel"><div class="panel-h"><h2>Takip ettiğimiz büyük fonlar ${qm('f13')}</h2><span class="xs muted">${esc(holders[0].period || '')} çeyrek sonu</span></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fon</th><th class="n">Pozisyon</th><th class="n">Portföydeki payı</th><th class="n">Hisse adedi</th><th>Son çeyrek</th></tr></thead><tbody>
    ${map(holders, (h) => `<tr><td><a class="row-link" href="yatirimcilar.html?f=${encodeURIComponent(h.fund)}"><span class="tk">${esc(h.fund)}</span><span class="nm">${esc(h.person)}</span></a></td><td class="n">${usd(h.value)}</td><td class="n">${pctv(h.w, 1)}</td><td class="n">${num(h.shares)}${h.prevShares && h.chg !== 'new' ? `<span class="nm ${tone(h.shares - h.prevShares)}">${pct((h.shares / h.prevShares - 1) * 100, 0)}</span>` : ''}</td><td>${chip(h.chg)}</td></tr>`)}
    </tbody></table></div></section><p class="foot-note">13F bildirimleri çeyrek sonundan 45 gün sonraya kadar gecikmeli gelir.</p>`
    : `<section class="panel empty-state"><b>Takip ettiğimiz 20 büyük fondan hiçbiri bu hisseyi tutmuyor</b><p>Liste: Berkshire, Bridgewater, Renaissance, Pershing Square, ARK ve diğerleri.</p><a class="btn" href="yatirimcilar.html">Fonları gör</a></section>`;

  const ic = () => `<section class="panel"><div class="panel-h"><h2>Yönetici alım satımları ${qm('form4')}</h2><span class="xs muted">son 6 ay</span></div>
    ${ins6.length ? `<div class="stats"><div class="stat"><div class="l">Alım</div><div class="v up">${usd(buy)}</div></div><div class="stat"><div class="l">Satış</div><div class="v down">${usd(sell)}</div></div><div class="stat"><div class="l">Plana bağlı satış ${qm('plan')}</div><div class="v">${sell ? pctv((ins6.filter((x) => x.plan).reduce((s, x) => s + x.sell, 0) / sell) * 100, 0) : '—'}</div></div></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kişi</th><th>Tarih</th><th class="n">Tutar</th><th class="n">Adet</th><th></th></tr></thead><tbody>
    ${map(ins6.filter((x) => x.buy || x.sell), (x) => `<tr><td><b>${esc(x.owner || '')}</b><span class="nm">${esc(x.title || '')}</span></td><td>${esc(x.date)}</td><td class="n ${x.buy > x.sell ? 'up' : 'down'}">${x.buy > x.sell ? '+' : '−'}${usd(Math.abs(x.buy - x.sell))}</td><td class="n">${num(x.buy > x.sell ? x.shBuy : x.shSell)}</td><td>${x.plan ? '<span class="chip">Plan</span>' : ''}</td></tr>`)}
    </tbody></table></div>` : '<p class="small muted">Son 6 ayda piyasadan alım ya da satış bildirimi yok. Hisse ödülü ve opsiyon kullanımları sayılmaz.</p>'}</section>`;

  const VIEW = { ozet, fin, acik, yat, ic };
  let tab = location.hash.slice(1) in VIEW ? location.hash.slice(1) : 'ozet';
  app.innerHTML = `<div class="page">${head}<div class="tabs" role="tablist">${map(TABS, ([k, l]) => `<button role="tab" data-tab="${k}">${l}</button>`)}</div><div id="body" class="page" style="padding:0"></div>
    <p class="foot-note">Kaynak: SEC EDGAR. Yatırım tavsiyesi değildir.</p></div>`;
  const body = document.getElementById('body');
  const show = (k) => {
    tab = k; history.replaceState(null, '', '#' + k);
    app.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === k));
    body.innerHTML = VIEW[k]();
    if (k === 'ozet') lazyTV(document.getElementById('tv'), 'mini-symbol-overview', { symbol: `NASDAQ:${T.replace('.', '')}`, dateRange: '12M', chartOnly: false, noTimeScale: false }, 220);
  };
  app.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]'); if (b) show(b.dataset.tab);
    const pr = e.target.closest('[data-per]'); if (pr) { per = pr.dataset.per; show('fin'); }
  });
  show(tab);
}
main().catch(fail);
