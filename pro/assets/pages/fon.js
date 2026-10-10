import { shell, fail, esc, map, num, pct, pp, tl, tone, loadFunds, watchBtn, term, qm, params, periodLabel, addAlert, hasAlert, toast, ICON, refreshAlertDot, overlap } from '../core.js';

const app = shell('fonlar', { title: 'Fon' });

async function main() {
  const F = await loadFunds();
  refreshAlertDot({ funds: F });
  const code = (params().get('f') || '').toUpperCase();
  const f = F.funds.find((x) => x.code === code);
  if (!f) {
    app.innerHTML = `<div class="page"><section class="panel glass empty-state"><b>${code ? `${esc(code)} demo kapsamında değil` : 'Bir fon seç'}</b><p>Demo, en büyük ${F.totals.funds} yerli hisse fonunu kapsıyor.</p><a class="btn primary" href="fonlar.html">Fon listesine git</a></section></div>`;
    return;
  }
  document.title = `${f.code} · Piyasa Paneli Pro`;
  const H = f.holdings.filter((h) => h.w > 0).sort((a, b) => b.w - a.w);
  const ups = f.holdings.filter((h) => h.d > 0 && h.status !== 'new').sort((a, b) => b.d - a.d).slice(0, 5);
  const downs = f.holdings.filter((h) => h.d < 0 && h.status !== 'out').sort((a, b) => a.d - b.d).slice(0, 5);
  const nw = f.holdings.filter((h) => h.status === 'new'), out = f.holdings.filter((h) => h.status === 'out');
  const sizeCh = (f.size / f.size_prev - 1) * 100, odd = Math.abs(sizeCh) > 200;
  const top5 = H.slice(0, 5).reduce((a, h) => a + h.w, 0);
  const maxW = Math.max(...H.map((h) => h.w), 1);
  const sims = F.funds.filter((x) => x.code !== f.code).map((x) => ({ x, o: overlap(f, x).pct })).sort((a, b) => b.o - a.o).slice(0, 4);

  let read = `${f.code} ${periodLabel(F.period)} ayını ${pct(f.r1m)} getiriyle kapattı`;
  read += odd ? '. ' : `; büyüklüğü ${tl(f.size_prev)} seviyesinden ${tl(f.size)} seviyesine ${sizeCh < 0 ? 'indi' : 'çıktı'}. `;
  read += `Portföyün %${num(f.equity, 0)}'i hisse senedinde ve ilk beş hisse toplamın %${num(top5, 0)}'ini oluşturuyor${top5 > 40 ? '; yani fon birkaç hisseye yoğunlaşmış durumda.' : '.'} `;
  if (f.type === 'endeks') read += `Bu bir endeks fonu (${f.type_label}); ağırlık değişimleri yöneticinin kararı değil, endeksin değişimi.`;
  else if (ups.length || downs.length) read += `Bu ay en çok ${ups.slice(0, 3).map((h) => h.t).join(', ') || '—'} ağırlığını artırdı, ${downs.slice(0, 3).map((h) => h.t).join(', ') || '—'} ağırlığını azalttı.`;

  const li = (h, cls) => `<a class="row" href="hisse.html?s=${h.t}" style="color:inherit;text-decoration:none;padding:8px 2px"><div class="main-c"><b>${h.t}</b></div><div class="end ${cls}">${h.status === 'new' ? `yeni · %${num(h.w, 1)}` : h.status === 'out' ? 'tamamen çıktı' : `${pp(h.d)} puan`}</div></a>`;
  const alertOn = hasAlert('fund', f.code);

  app.innerHTML = `<div class="page">
    <section class="hero glass">
      <span class="greet">${esc(f.company)} · ${f.type === 'endeks' ? esc(f.type_label) : 'aktif yönetilen hisse fonu'}</span>
      <div style="display:flex;align-items:center;gap:12px;margin-top:6px;flex-wrap:wrap"><h1 style="margin:0;font-size:30px">${f.code}</h1>${watchBtn('fund', f.code)}</div>
      <div class="ink2" style="margin-top:4px">${esc(f.name)}</div>
      <p class="lede">${esc(read)}</p>
      <div class="hero-row">
        <button class="btn ${alertOn ? '' : 'primary'}" id="alert-btn" ${alertOn ? 'disabled' : ''}>${ICON.bell}${alertOn ? 'Alarm kurulu' : 'Portföy değişince haber ver'}</button>
        <a class="btn" href="karsilastir.html?a=${f.code}&b=${sims[0]?.x.code || ''}">${ICON.compare}Başka bir fonla karşılaştır</a>
      </div>
      <div class="stats" style="margin-top:20px">
        <div class="stat"><div class="l">Büyüklük</div><div class="v">${tl(f.size)}</div><div class="s ${odd ? 'muted' : tone(sizeCh)}">${odd ? 'önceki ay verisi hatalı' : `${pct(sizeCh)} bir ayda`}</div></div>
        <div class="stat"><div class="l">Yatırımcı</div><div class="v">${num(f.investors)}</div><div class="s muted">kişi</div></div>
        <div class="stat"><div class="l">Getiri (1 ay / 1 yıl)</div><div class="v ${tone(f.r1m)}">${pct(f.r1m)}</div><div class="s ${tone(f.r1y)}">${pct(f.r1y)} bir yılda</div></div>
        <div class="stat"><div class="l">Hisse oranı</div><div class="v">%${num(f.equity, 0)}</div><div class="s muted">${H.length} hisse</div></div>
      </div>
    </section>

    <div class="grid">
      <section class="panel glass c8">
        <div class="panel-h"><h2>Portföy</h2><span class="small muted">${periodLabel(F.period)} · ${term('agirlik', 'ağırlık')} ve ${term('agirlik-degisimi', 'aylık değişim')}</span></div>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th style="width:36px"></th><th>Hisse</th><th class="n">Ağırlık</th><th class="bar-cell"></th><th class="n">Değişim</th><th class="n">Değer</th></tr></thead>
          <tbody>${map(H, (h) => `<tr><td>${watchBtn('stock', h.t)}</td>
            <td><a class="row-link" href="hisse.html?s=${h.t}"><span class="tk">${h.t}</span> ${h.status === 'new' ? '<span class="tag new">yeni</span>' : ''}<span class="nm">${esc(F.stocks.find((s) => s.t === h.t)?.name || '')}</span></a></td>
            <td class="n">%${num(h.w, 1)}</td>
            <td class="bar-cell"><div class="mini-bar one"><span style="width:${(h.w / maxW) * 100}%"></span></div></td>
            <td class="n ${tone(h.d)}">${h.d ? `${pp(h.d)}` : '·'}</td>
            <td class="n">${tl((h.w / 100) * f.size)}</td></tr>`)}</tbody>
        </table></div>
        ${f.other?.length ? `<div class="note"><b>Hisse dışı varlıklar:</b> ${f.other.map((o) => `${esc(o.name)} %${num(o.w, 1)}`).join(', ')}</div>` : ''}
      </section>
      <div class="c4" style="display:flex;flex-direction:column;gap:18px">
        <section class="panel glass">
          <div class="panel-h"><h2>Bu ay ne yaptı</h2></div>
          ${ups.length ? `<div><div class="small muted">Ağırlığını en çok artırdığı</div><div class="rows">${map(ups, (h) => li(h, 'up'))}</div></div>` : ''}
          ${downs.length ? `<div><div class="small muted">Ağırlığını en çok azalttığı</div><div class="rows">${map(downs, (h) => li(h, 'down'))}</div></div>` : ''}
          ${nw.length ? `<div><div class="small muted">${term('yeni-giris', 'Yeni giriş')}</div><div class="rows">${map(nw, (h) => li(h, 'up'))}</div></div>` : ''}
          ${out.length ? `<div><div class="small muted">${term('cikis', 'Çıkış')}</div><div class="rows">${map(out, (h) => li(h, 'down'))}</div></div>` : ''}
        </section>
        <section class="panel glass">
          <div class="panel-h"><h2>En benzer fonlar ${qm('ortusme')}</h2></div>
          <p class="panel-sub">Portföy örtüşmesi yüksekse ikisine birden yatırım yapmak çeşitlendirme sağlamaz.</p>
          <div class="rows">${map(sims, ({ x, o }) => `<a class="row" href="karsilastir.html?a=${f.code}&b=${x.code}" style="color:inherit;text-decoration:none"><div class="main-c"><b>${x.code}</b><small>${esc(x.company)}</small></div><div class="end"><b>%${num(o, 0)}</b><small class="muted">örtüşme</small></div></a>`)}</div>
        </section>
      </div>
    </div>
    <p class="foot-note">${esc(F.source)} Yatırım tavsiyesi değildir.</p>
  </div>`;

  document.getElementById('alert-btn')?.addEventListener('click', (e) => {
    addAlert({ kind: 'fund', code: f.code, rule: 'new-out' });
    e.currentTarget.outerHTML = `<button class="btn" disabled>${ICON.bell}Alarm kurulu</button>`;
    toast(`${f.code} için alarm kuruldu`); refreshAlertDot({ funds: F });
  });
}

main().catch(fail);
