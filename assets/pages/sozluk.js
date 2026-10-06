import { shell, loadJSON, fail, esc, map, dateTR } from '../app.js';

async function main() {
  const [latest, dates, G] = await Promise.all([
    loadJSON('data/latest.json'), loadJSON('data/daily/index.json').catch(() => []), loadJSON('data/sozluk.json'),
  ]);
  const app = shell('sozluk', { date: latest.date, dates, latest });
  const T = G.concepts;
  const keys = Object.keys(T);
  const state = { sel: keys.includes(location.hash.slice(1)) ? location.hash.slice(1) : keys[0], q: '', cat: 'Tümü' };
  const cats = ['Tümü', ...G.categories];
  const learned = (k) => (T[k].learned ? dateTR(T[k].learned, false) : '');

  app.innerHTML = `<main class="wrap">
    <section class="card">
      <label for="ara" class="eyebrow">Kavram ara · ${keys.length} kavram</label>
      <input id="ara" class="search" type="search" placeholder="Örn. enflasyon, verim, Fed">
      <div class="chips" role="tablist" aria-label="Kategori">${cats.map((c) => `<button type="button" role="tab" class="chip" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    </section>
    <div class="row">
      <section class="card" style="flex:1 1 300px;padding:12px;gap:2px" id="list"></section>
      <article class="card" style="flex:999 1 560px;padding:28px;gap:16px" id="detail"></article>
    </div>
  </main>`;

  const list = document.getElementById('list'), detail = document.getElementById('detail');
  const render = () => {
    app.querySelectorAll('.chip[data-cat]').forEach((c) => c.classList.toggle('on', c.dataset.cat === state.cat));
    const q = state.q.toLocaleLowerCase('tr');
    const visible = keys.filter((k) => (state.cat === 'Tümü' || T[k].cat === state.cat) && (!q || (T[k].name + ' ' + T[k].def).toLocaleLowerCase('tr').includes(q)));
    list.innerHTML = visible.length
      ? map(visible, (k) => `<button type="button" class="concept-btn ${k === state.sel ? 'on' : ''}" data-k="${k}"><b>${esc(T[k].name)}</b><small>${esc(T[k].cat)} · ${esc(learned(k))}</small></button>`)
      : '<span class="muted" style="padding:12px">Eşleşen kavram yok.</span>';
    const c = T[state.sel];
    detail.innerHTML = `
      <div class="head-row"><span class="eyebrow accent">${esc(c.cat)}</span><span class="mono xs muted">Öğrenildi: ${esc(learned(state.sel))}</span></div>
      <h1 style="font-size:28px">${esc(c.name)}</h1>
      <p style="font-size:17px;color:var(--ink-2)">${esc(c.def)}</p>
      <div style="padding:14px 16px;background:var(--accent-soft);border-radius:10px"><div class="eyebrow dark">Benzetme</div>${esc(c.analogy)}</div>
      <div><div class="eyebrow">Mekanizma</div><div class="chain">${map(c.chain, (s) => `<span>${esc(s)}</span>`)}</div></div>
      ${c.quote ? `<div style="padding:14px 16px;background:var(--bg);border-radius:10px"><div class="eyebrow">Bizim raporlarımızda</div><em>"${esc(c.quote)}"</em></div>` : ''}
      <div style="padding:14px 16px;background:var(--ink);color:#fff;border-radius:10px"><div class="eyebrow" style="color:#C9CCD4">Altın kural</div><b style="font-weight:500">${esc(c.rule)}</b></div>
      ${c.related?.length ? `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><span class="small muted">İlgili:</span>
        ${map(c.related.filter((r) => T[r]), (r) => `<button type="button" class="related" data-k="${r}">${esc(T[r].name)}</button>`)}</div>` : ''}`;
  };

  app.addEventListener('click', (e) => {
    const k = e.target.closest('[data-k]');
    if (k) { state.sel = k.dataset.k; history.replaceState(null, '', '#' + state.sel); render(); if (innerWidth < 900) detail.scrollIntoView({ behavior: 'smooth' }); return; }
    const c = e.target.closest('.chip[data-cat]');
    if (c) { state.cat = c.dataset.cat; render(); }
  });
  document.getElementById('ara').addEventListener('input', (e) => { state.q = e.target.value; render(); });
  render();
}

main().catch(fail);
