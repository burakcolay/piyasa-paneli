import { shell, fail, esc, map } from '../app.js';
import { n, pct, pctv, tone, usd, loadUS, q, watched, toggleWatch, star } from '../us.js';

const app = shell('hisseler');
const PRESETS = [
  ['all', 'Tümü', () => true],
  ['watch', 'Takibim', (r) => watched().includes(r.t)],
  ['growth', 'Hızlı büyüyen', (r) => r.revGrowth > 20],
  ['cheap', 'Düşük F/K', (r) => r.pe > 0 && r.pe < 20],
  ['margin', 'Yüksek marj', (r) => r.netMargin > 25],
  ['cash', 'Nakit makinesi', (r) => r.fcfYield > 4],
  ['insider', 'Yöneticiler alıyor', (r) => r.insiderNet90 > 0],
  ['loss', 'Zarar eden', (r) => r.netMargin < 0],
];
const COLS = [
  ['mcap', 'Piyasa değeri', (r) => usd(r.mcap)],
  ['chg', 'Gün', (r) => `<span class="${tone(r.chg)}">${pct(r.chg, 2)}</span>`],
  ['pe', 'F/K', (r) => (r.pe > 0 ? n(r.pe, 1) : '—'), 'fk'],
  ['ps', 'F/S', (r) => n(r.ps, 1), 'fs'],
  ['revGrowth', 'Büyüme', (r) => `<span class="${tone(r.revGrowth)}">${pct(r.revGrowth, 0)}</span>`],
  ['netMargin', 'Net marj', (r) => pctv(r.netMargin, 0), 'marj'],
  ['fcfYield', 'Nakit verimi', (r) => pctv(r.fcfYield, 1), 'fcfy'],
];

async function main() {
  const U = await loadUS('universe.json');
  const rows = U.rows;
  const sectors = [...new Set(rows.map((r) => r.sector).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
  let st = { p: 'all', sort: 'mcap', dir: -1, sec: '', q: '' };
  try { st = { ...st, ...JSON.parse(sessionStorage.getItem('us-screen') || '{}') }; } catch {}

  app.innerHTML = `<div class="wrap">
    <section class="card lead">
      <span class="eyebrow accent">${esc(U.index)}</span>
      <h1 class="page-h">ABD hisseleri</h1>
      <p class="muted">Finansallar şirketlerin SEC bildirimlerinden, son 12 ay. Bir şirkete tıkla: finansallar, açıklamalar, büyük fonlar ve yönetici işlemleri açılır.</p>
      <div class="chips" id="pre">${map(PRESETS, ([k, l]) => `<button class="chip" data-p="${k}">${l}</button>`)}</div>
      <div class="frow"><input class="inp" id="q" placeholder="Şirket ara" aria-label="Şirket ara"><select class="inp" id="sec" aria-label="Sektör"><option value="">Tüm sektörler</option>${map(sectors, (s) => `<option>${esc(s)}</option>`)}</select><span class="xs muted" id="cnt"></span></div>
    </section>
    <section class="card" style="padding:8px 12px"><div class="tbl-wrap"><table class="tbl us" id="t"></table></div></section>
    <p class="source">Veri ${esc(U.updated)} · fiyatlar son kapanış, finansallar SEC EDGAR. Yatırım tavsiyesi değildir.</p>
  </div>`;
  const T = document.getElementById('t');
  const draw = () => {
    try { sessionStorage.setItem('us-screen', JSON.stringify(st)); } catch {}
    const f = PRESETS.find((p) => p[0] === st.p)[2];
    const qq = st.q.toLocaleLowerCase('tr');
    const L = rows.filter((r) => f(r) && (!st.sec || r.sector === st.sec) && (!qq || r.t.toLowerCase().includes(qq) || r.name.toLocaleLowerCase('tr').includes(qq)))
      .sort((a, b) => ((a[st.sort] ?? -Infinity) - (b[st.sort] ?? -Infinity)) * st.dir);
    app.querySelectorAll('#pre .chip').forEach((b) => b.classList.toggle('on', b.dataset.p === st.p));
    document.getElementById('cnt').textContent = `${L.length} şirket`;
    T.innerHTML = `<thead><tr><th></th><th>Şirket</th>${map(COLS, ([k, l, , t]) => `<th class="r"><button class="sort" data-s="${k}">${l}${st.sort === k ? (st.dir < 0 ? ' ↓' : ' ↑') : ''}</button>${t ? ' ' + q(t) : ''}</th>`)}</tr></thead>
      <tbody>${L.length ? map(L, (r) => `<tr data-href="sirket.html?t=${r.t}"><td class="w">${star(r.t)}</td><td><a href="sirket.html?t=${r.t}" class="co"><b>${esc(r.t)}</b><small>${esc(r.name)}</small></a></td>${map(COLS, ([, , fn]) => `<td class="r num">${fn(r)}</td>`)}</tr>`) : '<tr><td colspan="9" class="muted" style="text-align:center;padding:24px">Bu filtreye uyan şirket yok.</td></tr>'}</tbody>`;
  };
  app.addEventListener('click', (e) => {
    const s = e.target.closest('[data-star]'); if (s) { s.classList.toggle('on', toggleWatch(s.dataset.star)); if (st.p === 'watch') draw(); return; }
    const p = e.target.closest('[data-p]'); if (p) { st.p = p.dataset.p; draw(); return; }
    const so = e.target.closest('[data-s]'); if (so) { st.dir = st.sort === so.dataset.s ? -st.dir : -1; st.sort = so.dataset.s; draw(); return; }
    if (e.target.closest('a,button,.qm')) return;
    const tr = e.target.closest('tr[data-href]'); if (tr) location.href = tr.dataset.href;
  });
  const qi = document.getElementById('q'), si = document.getElementById('sec');
  qi.value = st.q; si.value = st.sec;
  qi.addEventListener('input', () => { st.q = qi.value; draw(); });
  si.addEventListener('change', () => { st.sec = si.value; draw(); });
  draw();
}
main().catch(fail);
