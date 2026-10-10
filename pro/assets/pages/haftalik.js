import { shell, fail, esc, map, num, pct, tone, loadLive, setLivePill, refreshAlertDot, withTerms, speakBtn, params, prefs, loadSozluk } from '../core.js';

const app = shell('haftalik', { title: 'Haftalık rapor' });
const getJSON = (u) => fetch(u, { cache: 'no-cache' }).then((r) => r.json());
const VIEW = { olumlu: ['good', 'Olumlu'], notr: ['', 'Nötr'], olumsuz: ['bad', 'Olumsuz'] };

async function main() {
  const [latest, weeks, L, S] = await Promise.all([getJSON('../data/latest.json'), getJSON('../data/weekly/index.json'), loadLive(), loadSozluk()]);
  setLivePill(L); refreshAlertDot({ live: L });
  const wanted = params().get('w');
  const id = weeks.some((w) => w.id === wanted) ? wanted : latest.week || weeks.at(-1)?.id;
  const W = await getJSON(`../data/weekly/${id}.json`);
  const d = W.deep, lt = d?.long_term;
  const longFirst = prefs().style === 'uzun';
  const C = S.concepts || {};
  const maxK = Math.max(...(W.kpis || []).map((k) => Math.abs(k.chg)), 1);

  const deepHTML = d ? `<section class="panel glass" id="deep"><div class="panel-h"><h2>Haftanın derin konusu</h2>${speakBtn('deep-text')}</div>
      <h1 style="font-size:26px;max-width:32ch">${esc(d.title)}</h1>
      ${d.chain?.length ? `<div class="cause">${d.chain.map((x, i) => `${i ? '<span class="arr">→</span>' : ''}<span class="step">${esc(x)}</span>`).join('')}</div>` : ''}
      <div class="prose" id="deep-text">${map(d.paragraphs, (p) => `<p>${withTerms(p)}</p>`)}</div>
      ${d.sources?.length ? `<div class="xs muted">Kaynaklar: ${d.sources.map((s) => s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>` : esc(s.name)).join(' · ')}</div>` : ''}
    </section>` : `<section class="panel glass"><div class="panel-h"><h2>Haftanın derin konusu</h2></div><p class="small muted">Cumartesi sabahı yayınlanır.</p></section>`;
  const ltHTML = lt ? `<section class="panel glass"><div class="panel-h"><h2>Uzun vade: döngünün neresindeyiz</h2><span class="chip acc">${esc(lt.cycle)}</span></div>
      <div class="prose">${map(lt.paragraphs, (p) => `<p>${withTerms(p)}</p>`)}</div>
      <div class="rows">${map(lt.assets, (a) => `<div class="row"><b style="min-width:120px">${esc(a.name)}</b><span class="chip ${VIEW[a.view]?.[0] || ''}" style="min-width:74px;justify-content:center">${VIEW[a.view]?.[1] || a.view}</span><div class="main-c"><small style="white-space:normal">${esc(a.note)}</small></div></div>`)}</div>
      <span class="xs muted">Varlık sınıflarını etkileyen rüzgârların analizi; yatırım tavsiyesi değildir.</span></section>` : '';

  app.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>Haftalık rapor</h1><p>${esc(W.range || '')}</p></div>
      <select class="sel" id="wk" aria-label="Hafta seç">${map([...weeks].reverse(), (w) => `<option value="${esc(w.id)}" ${w.id === id ? 'selected' : ''}>${esc(w.label)} · ${esc(w.title)}</option>`)}</select></div>
    <section class="hero glass"><span class="greet">Haftanın özeti</span><h1>${esc(W.headline)}</h1><p class="lede">${withTerms(W.lede)}</p></section>
    ${longFirst ? ltHTML + deepHTML : ''}
    <div class="grid">
      <section class="panel glass c5"><div class="panel-h"><h2>Hafta boyunca</h2></div>
        ${map(W.kpis, (k) => `<div class="hbar"><span>${esc(k.name)}</span><div class="track"><span class="fill" style="left:${k.chg >= 0 ? 50 : 50 - Math.abs(k.chg) / maxK * 50}%;width:${Math.abs(k.chg) / maxK * 50}%;background:${k.chg >= 0 ? 'var(--up)' : 'var(--down)'}"></span></div><span class="val ${tone(k.chg)}">${pct(k.chg, 2)}</span></div>`)}
        <div class="grid" style="gap:12px;margin-top:6px"><div class="c6" style="grid-column:span 6"><div class="small muted">En çok kazananlar</div>${map(W.winners, (x) => `<div class="row" style="padding:6px 0"><div class="main-c small">${esc(x.name)}</div><b class="up small">${esc(x.v)}</b></div>`)}</div><div class="c6" style="grid-column:span 6"><div class="small muted">En çok kaybedenler</div>${map(W.losers, (x) => `<div class="row" style="padding:6px 0"><div class="main-c small">${esc(x.name)}</div><b class="down small">${esc(x.v)}</b></div>`)}</div></div>
      </section>
      <section class="panel glass c7"><div class="panel-h"><h2>Gün gün</h2></div>
        ${map(W.days, (x) => `<div class="cal-row" style="grid-template-columns:70px 1fr"><span class="when">${esc(x.day)}<br><span class="xs muted">${esc(x.date)}</span></span><div><b style="font-weight:500">${esc(x.title)}</b><div class="small ink2">${esc(x.text)}</div></div></div>`)}
      </section>
    </div>
    ${longFirst ? '' : deepHTML + ltHTML}
    <div class="grid">
      <section class="panel glass c6"><div class="panel-h"><h2>Gelecek hafta neye bakmalı</h2><a class="act" href="takvim.html">Takvim</a></div>${map(W.next, (x) => `<div class="cal-row" style="grid-template-columns:96px 1fr"><span class="when">${esc(x.when)}</span><div><b style="font-weight:500">${esc(x.title)}</b><div class="small ink2">${esc(x.why)}</div></div></div>`)}</section>
      <section class="panel glass c6"><div class="panel-h"><h2>Bu hafta öğrendiklerin</h2><a class="act" href="akademi.html">Akademi</a></div><div class="rows">${map((W.learned || []).filter((k) => C[k]), (k) => `<a class="row" href="akademi.html#k-${esc(k)}" style="color:inherit;text-decoration:none"><div class="main-c"><b>${esc(C[k].name)}</b><small>${esc(C[k].rule || '')}</small></div></a>`)}</div></section>
    </div>
  </div>`;
  document.getElementById('wk').addEventListener('change', (e) => { location.search = `?w=${e.target.value}`; });
}

main().catch(fail);
