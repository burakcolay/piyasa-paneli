import { shell, loadJSON, fail, esc, map, signed, dateTR } from '../app.js';

async function main() {
  const [latest, weeks, dates] = await Promise.all([
    loadJSON('data/latest.json'), loadJSON('data/weekly/index.json'), loadJSON('data/daily/index.json').catch(() => []),
  ]);
  const wanted = new URLSearchParams(location.search).get('w');
  const id = weeks.some((w) => w.id === wanted) ? wanted : (latest.week || weeks[0]?.id);
  const app = shell('haftalik', { date: latest.date, dates, latest });
  if (!id) { app.innerHTML = '<div class="loading">Henüz haftalık özet yok. İlk özet cuma günü oluşacak.</div>'; return; }
  const W = await loadJSON(`data/weekly/${id}.json`);
  const glossary = await loadJSON('data/sozluk.json').catch(() => ({ concepts: {} }));

  app.innerHTML = `<main class="wrap">
    <div class="row">
      <aside class="card" style="flex:1 1 220px;gap:4px;padding:16px">
        <span class="eyebrow" style="padding:4px 8px 8px">Arşiv</span>
        ${map([...weeks].reverse(), (w) => `<a class="week-link ${w.id === id ? 'on' : ''}" href="haftalik.html?w=${esc(w.id)}">${esc(w.label)}<small>${esc(w.title)}</small></a>`)}
      </aside>
      <article style="flex:999 1 620px;min-width:0;display:flex;flex-direction:column;gap:20px">
        <section class="card" style="padding:28px;gap:14px">
          <span class="mono small muted">${esc(W.range)}</span>
          <h1 style="font-size:30px">${esc(W.headline)}</h1>
          <p style="font-size:17px;color:var(--ink-2)">${esc(W.lede)}</p>
        </section>
        <div class="grid" style="--min:150px;gap:12px">${map(W.kpis, (k) => `<div class="kpi"><span class="l">${esc(k.name)}</span>
          <span class="v ${k.chg >= 0 ? 'up' : 'down'}">${esc(signed(k.chg))}</span><span class="s muted">haftalık</span></div>`)}</div>
        <section class="card">
          <span class="eyebrow">Günlere göre hafta</span>
          ${map(W.days, (d) => `<div class="day"><div><b>${esc(d.day)}</b><div class="mono xs muted">${esc(d.date)}</div></div>
            <div><b style="font-weight:500">${esc(d.title)}</b><div class="small" style="color:var(--ink-2)">${esc(d.text)}</div></div></div>`)}
        </section>
        <div class="row">
          <section class="card" style="flex:1 1 280px;gap:6px"><span class="eyebrow" style="color:var(--good-fg)">Haftanın kazananları</span>
            ${map(W.winners, (w) => `<div class="kv" style="font-family:var(--sans);font-size:15px"><span>${esc(w.name)}</span><span class="mono up">${esc(w.v)}</span></div>`)}</section>
          <section class="card" style="flex:1 1 280px;gap:6px"><span class="eyebrow" style="color:var(--bad-fg)">Haftanın kaybedenleri</span>
            ${map(W.losers, (w) => `<div class="kv" style="font-family:var(--sans);font-size:15px"><span>${esc(w.name)}</span><span class="mono down">${esc(w.v)}</span></div>`)}</section>
        </div>
        <section class="card lesson" style="gap:6px">
          <span class="eyebrow dark">Bu hafta öğrendiklerin</span>
          ${map(W.learned, (k) => `<a href="sozluk.html#${esc(k)}" class="small">${esc(glossary.concepts[k]?.name || k)}</a>`)}
        </section>
        <section class="card dark">
          <span class="eyebrow" style="color:#C9CCD4">Gelecek haftanın kritik olayları</span>
          <div class="grid" style="--min:200px;gap:12px">${map(W.next, (n) => `<div style="padding:14px;border:1px solid #3A3F4B;border-radius:8px;display:flex;flex-direction:column;gap:4px">
            <span class="mono xs" style="color:#C9CCD4">${esc(n.when)}</span><b>${esc(n.title)}</b><span class="small" style="color:#D9DCE3">${esc(n.why)}</span></div>`)}</div>
        </section>
      </article>
    </div>
    <p class="source">Kaynak: Bigdata.com ve Borsa MCP. Haftalık değişimler 5 işlem günlük performanstır. Haftalık özet her cuma güncellenir. Yatırım tavsiyesi değildir.</p>
  </main>`;
}

main().catch(fail);
