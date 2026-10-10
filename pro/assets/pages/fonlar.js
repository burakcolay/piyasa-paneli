import { shell, fail, esc, map, num, pct, pp, tl, tone, loadFunds, loadNotes, watchBtn, qm, term, periodLabel, refreshAlertDot } from '../core.js';

const app = shell('fonlar', { title: 'Fon hareketleri' });
let mode = 'aktif', filter = 'all', sortK = 'val', sortDir = -1, q = '', limit = 25;

function statsFor(s) {
  const hs = mode === 'aktif' ? s.holders.filter((h) => h.type === 'aktif') : s.holders;
  return {
    flow: hs.reduce((a, h) => a + h.flow, 0),
    up: hs.filter((h) => h.d > 0).length,
    down: hs.filter((h) => h.d < 0).length,
    nw: hs.filter((h) => h.status === 'new').length,
    out: hs.filter((h) => h.status === 'out').length,
    n: hs.filter((h) => h.w > 0).length,
    val: hs.reduce((a, h) => a + h.val, 0),
  };
}

function flowChart(F) {
  const rows = F.stocks.map((s) => ({ s, ...statsFor(s) }));
  const pos = rows.filter((r) => r.flow > 0).sort((a, b) => b.flow - a.flow).slice(0, 8);
  const neg = rows.filter((r) => r.flow < 0).sort((a, b) => a.flow - b.flow).slice(0, 8);
  const max = Math.max(...pos.map((r) => r.flow), ...neg.map((r) => -r.flow), 1);
  const item = (r, side) => `<a class="flow-item" href="hisse.html?s=${r.s.t}" title="${esc(r.s.name)}">
      <span class="ft">${r.s.t}</span>
      <span class="track"><span class="fill" style="width:${Math.max(3, (Math.abs(r.flow) / max) * 100)}%"></span></span>
      <span class="fv">${tl(r.flow, true)}</span>
      <span class="meta">${side === 'pos' ? `${r.up} fon artırdı, ${r.down} azalttı${r.nw ? ` · ${r.nw} yeni giriş` : ''}` : `${r.down} fon azalttı, ${r.up} artırdı${r.out ? ` · ${r.out} tam çıkış` : ''}`}</span>
    </a>`;
  return `<div class="flow-chart">
    <div class="flow-col pos"><h3>Ağırlığı en çok artan</h3>${map(pos, (r) => item(r, 'pos'))}</div>
    <div class="flow-col neg"><h3>Ağırlığı en çok azalan</h3>${map(neg, (r) => item(r, 'neg'))}</div>
  </div>`;
}

function stockTable(F) {
  let rows = F.stocks.map((s) => ({ s, ...statsFor(s) })).filter((r) => r.n > 0 || r.out > 0);
  if (filter === 'up') rows = rows.filter((r) => r.flow > 0);
  if (filter === 'down') rows = rows.filter((r) => r.flow < 0);
  if (filter === 'new') rows = rows.filter((r) => r.nw > 0);
  if (filter === 'out') rows = rows.filter((r) => r.out > 0);
  if (q) { const Q = q.toLocaleUpperCase('tr-TR'); rows = rows.filter((r) => r.s.t.includes(Q) || r.s.name.toLocaleUpperCase('tr-TR').includes(Q)); }
  const key = { val: (r) => r.val, flow: (r) => r.flow, n: (r) => r.n, up: (r) => r.up - r.down, t: (r) => r.s.t };
  rows.sort((a, b) => { const x = key[sortK](a), y = key[sortK](b); return (x > y ? 1 : x < y ? -1 : 0) * sortDir; });
  const maxF = Math.max(...rows.map((r) => Math.abs(r.flow)), 1);
  const th = (k, label, cls = '') => `<th class="${cls}"><button data-sort="${k}">${label}${sortK === k ? (sortDir < 0 ? ' ↓' : ' ↑') : ''}</button></th>`;
  return `<div class="tbl-wrap"><table class="tbl">
    <thead><tr><th style="width:36px"></th>${th('t', 'Hisse')}${th('n', 'Fon sayısı', 'n')}${th('val', 'Fonlardaki değer', 'n')}${th('flow', 'Tahmini akış', 'n')}<th class="bar-cell"></th>${th('up', 'Artıran / azaltan', 'n')}</tr></thead>
    <tbody>${rows.length ? map(rows.slice(0, limit), (r) => `<tr>
      <td>${watchBtn('stock', r.s.t)}</td>
      <td><a class="row-link" href="hisse.html?s=${r.s.t}"><span class="tk">${r.s.t}</span> ${r.nw ? `<span class="tag new">${r.nw} yeni</span>` : ''} ${r.out ? `<span class="tag out">${r.out} çıkış</span>` : ''}<span class="nm">${esc(r.s.name)}</span></a></td>
      <td class="n">${r.n}</td>
      <td class="n">${tl(r.val)}</td>
      <td class="n ${tone(r.flow)}">${tl(r.flow, true)}</td>
      <td class="bar-cell"><div class="mini-bar div"><span class="${r.flow >= 0 ? 'pos' : 'neg'}" style="width:${(Math.abs(r.flow) / maxF) * 50}%"></span></div></td>
      <td class="n"><span class="up">${r.up}</span> <span class="muted">/</span> <span class="down">${r.down}</span></td>
    </tr>`) : `<tr><td colspan="7"><div class="empty-state">Bu filtreye uyan hisse yok. Filtreyi "Tümü"ne alabilir ya da aramayı temizleyebilirsin.</div></td></tr>`}</tbody>
  </table></div>${rows.length > limit ? `<button class="btn" data-more style="display:flex;margin:12px auto 0">${rows.length - limit} hisse daha göster</button>` : ''}`;
}

function companyTable(F) {
  return `<div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>Portföy şirketi</th><th class="n">Fon</th><th class="n">Büyüklük</th><th class="n">Aylık değişim</th><th class="n">Yatırımcı</th></tr></thead>
    <tbody>${map(F.companies, (c) => { const ch = (c.size / c.size_prev - 1) * 100; return `<tr><td><b style="font-weight:600">${esc(c.name)}</b><span class="nm">${c.funds.map((f) => `<a href="fon.html?f=${f}">${f}</a>`).join(', ')}</span></td><td class="n">${c.funds.length}</td><td class="n">${tl(c.size)}</td><td class="n ${tone(ch)}">${pct(ch)}</td><td class="n">${num(c.investors)}</td></tr>`; })}</tbody>
  </table></div>`;
}

function fundTable(F) {
  return `<div class="tbl-wrap"><table class="tbl">
    <thead><tr><th style="width:36px"></th><th>Fon</th><th class="n">Büyüklük</th><th class="n">Büyüklük değişimi</th><th class="n">1 ay getiri</th><th class="n">Yatırımcı</th></tr></thead>
    <tbody>${map(F.funds, (f) => { const ch = (f.size / f.size_prev - 1) * 100; const odd = Math.abs(ch) > 200; return `<tr>
      <td>${watchBtn('fund', f.code)}</td>
      <td><a class="row-link" href="fon.html?f=${f.code}"><span class="tk">${f.code}</span> ${f.type === 'endeks' ? `<span class="tag idx">${esc(f.type_label)}</span>` : ''}<span class="nm">${esc(f.company)} · ${esc(f.name)}</span></a></td>
      <td class="n">${tl(f.size)}</td>
      <td class="n ${odd ? 'muted' : tone(ch)}" ${odd ? 'title="Kaynaktaki önceki ay büyüklüğü hatalı görünüyor"' : ''}>${odd ? 'veri hatalı' : pct(ch)}</td>
      <td class="n ${tone(f.r1m)}">${pct(f.r1m)}</td>
      <td class="n">${num(f.investors)}</td></tr>`; })}</tbody>
  </table></div>`;
}

async function main() {
  const [F, N] = await Promise.all([loadFunds(), loadNotes()]);
  const T = F.totals, ch = (T.size / T.size_prev - 1) * 100;
  const nNew = F.stocks.reduce((a, s) => a + s.n_new, 0), nOut = F.stocks.reduce((a, s) => a + s.n_out, 0);
  refreshAlertDot({ funds: F });

  app.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>Fon hareketleri</h1><p>${T.funds} büyük yerli hisse fonunun ${periodLabel(F.period)} portföy raporları: yöneticiler hangi hisselere daha çok, hangilerine daha az para ayırdı.</p></div></div>

    <section class="hero glass">
      <span class="greet">${periodLabel(F.period)} okuması</span>
      <h1>${esc(N.funds_headline)}</h1>
      <div class="prose" style="margin-top:14px">${map(N.funds_paragraphs, (p) => `<p>${esc(p)}</p>`)}</div>
      <div class="stats" style="margin-top:20px">
        <div class="stat"><div class="l">Toplam fon büyüklüğü</div><div class="v">${tl(T.size)}</div><div class="s ${tone(ch)}">${pct(ch)} bir ayda</div></div>
        <div class="stat"><div class="l">Yatırımcı</div><div class="v">${num(T.investors)}</div><div class="s muted">${T.funds} fonda</div></div>
        <div class="stat"><div class="l">Fonlarda tutulan hisse</div><div class="v">${T.stocks}</div><div class="s muted">farklı şirket</div></div>
        <div class="stat"><div class="l">${term('yeni-giris', 'Yeni giriş')} / ${term('cikis', 'çıkış')}</div><div class="v"><span class="up">${nNew}</span> <span class="muted" style="font-weight:400">/</span> <span class="down">${nOut}</span></div><div class="s muted">fon-hisse eşleşmesi</div></div>
      </div>
    </section>

    <section class="panel glass">
      <div class="panel-h"><h2>Para nereye kaydı ${qm('fon-akisi')}</h2>
        <div class="seg" role="group" aria-label="Fon türü"><button data-mode="aktif" class="${mode === 'aktif' ? 'on' : ''}">Aktif fonlar</button><button data-mode="tum" class="${mode === 'tum' ? 'on' : ''}">Endeks fonları dahil</button></div></div>
      <p class="panel-sub">${mode === 'aktif' ? `Sadece ${term('aktif-fon', 'aktif yönetilen')} fonlar: yöneticinin kendi kararı. ${term('endeks-fonu', 'Endeks fonları')} hariç.` : 'Endeks fonları dahil: ağırlık değişimlerinin bir kısmı endeksin değişiminden geliyor.'} Tutarlar ${term('agirlik-degisimi', 'ağırlık değişimi')} × fon büyüklüğü ile hesaplanır.</p>
      <div id="flow">${flowChart(F)}</div>
    </section>

    <section class="panel glass">
      <div class="panel-h"><h2>Tüm hisseler</h2><span class="small muted" id="cnt"></span></div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">
        <div class="seg" role="group" aria-label="Filtre">${map([['all', 'Tümü'], ['up', 'Ağırlığı artan'], ['down', 'Ağırlığı azalan'], ['new', 'Yeni girişler'], ['out', 'Çıkışlar']], ([k, l]) => `<button data-filter="${k}" class="${filter === k ? 'on' : ''}">${l}</button>`)}</div>
        <input class="inp" id="q" placeholder="Hisse ara" style="width:160px" aria-label="Tabloda hisse ara">
      </div>
      <div id="tbl">${stockTable(F)}</div>
    </section>

    <div class="grid">
      <section class="panel glass c7"><div class="panel-h"><h2>Fonlar</h2><span class="small muted">Yıldızla takip listene ekle</span></div>${fundTable(F)}</section>
      <section class="panel glass c5"><div class="panel-h"><h2>Portföy şirketleri</h2></div>${companyTable(F)}</section>
    </div>

    <p class="foot-note">${esc(F.method)} ${esc(F.source)} Endeks fonları: ${F.funds.filter((f) => f.type === 'endeks').map((f) => f.code).join(', ')}. Yatırım tavsiyesi değildir.</p>
  </div>`;

  const redraw = () => { document.getElementById('flow').innerHTML = flowChart(F); document.getElementById('tbl').innerHTML = stockTable(F); };
  app.addEventListener('click', (e) => {
    const m = e.target.closest('[data-mode]'); if (m) { mode = m.dataset.mode; app.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b === m)); app.querySelector('.panel-sub').innerHTML = m.dataset.mode === 'aktif' ? `Sadece ${term('aktif-fon', 'aktif yönetilen')} fonlar: yöneticinin kendi kararı. ${term('endeks-fonu', 'Endeks fonları')} hariç. Tutarlar ${term('agirlik-degisimi', 'ağırlık değişimi')} × fon büyüklüğü ile hesaplanır.` : `Endeks fonları dahil: ağırlık değişimlerinin bir kısmı endeksin değişiminden geliyor. Tutarlar ${term('agirlik-degisimi', 'ağırlık değişimi')} × fon büyüklüğü ile hesaplanır.`; redraw(); }
    const f = e.target.closest('[data-filter]'); if (f) { filter = f.dataset.filter; limit = 25; app.querySelectorAll('[data-filter]').forEach((b) => b.classList.toggle('on', b === f)); redraw(); }
    if (e.target.closest('[data-more]')) { limit += 50; redraw(); }
    const s = e.target.closest('[data-sort]'); if (s) { const k = s.dataset.sort; sortDir = sortK === k ? -sortDir : (k === 't' ? 1 : -1); sortK = k; redraw(); }
  });
  document.getElementById('q').addEventListener('input', (e) => { q = e.target.value.trim(); limit = 25; redraw(); });
}

main().catch(fail);
