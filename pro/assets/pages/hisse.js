import { shell, fail, esc, map, num, pp, tl, tone, loadFunds, watchBtn, qm, term, params, periodLabel, addAlert, hasAlert, toast, ICON, refreshAlertDot } from '../core.js';

const app = shell('fonlar', { title: 'Hisse' });

async function main() {
  const F = await loadFunds();
  refreshAlertDot({ funds: F });
  const T = (params().get('s') || '').toUpperCase();
  const S = F.stocks.find((x) => x.t === T);
  if (!S) {
    app.innerHTML = `<div class="page"><section class="panel glass empty-state"><b>${T ? `${esc(T)} bu ayki fon raporlarında yok` : 'Bir hisse seç'}</b><p>Demo, ${F.totals.funds} büyük hisse fonunun tuttuğu ${F.totals.stocks} hisseyi kapsıyor. Üstteki arama kutusuna hisse kodunu yazabilirsin.</p><a class="btn primary" href="fonlar.html">Fon hareketlerine git</a></section></div>`;
    return;
  }
  document.title = `${S.t} · Piyasa Paneli Pro`;
  const fund = Object.fromEntries(F.funds.map((f) => [f.code, f]));
  const H = S.holders;
  const act = H.filter((h) => h.type === 'aktif');
  const ranked = [...F.stocks].sort((a, b) => b.flow_active - a.flow_active);
  const rank = ranked.findIndex((x) => x.t === S.t) + 1;
  const total = ranked.length;
  const up = act.filter((h) => h.d > 0).length, down = act.filter((h) => h.d < 0).length;
  const nNew = H.filter((h) => h.status === 'new'), nOut = H.filter((h) => h.status === 'out');
  const maxW = Math.max(...H.map((h) => h.w), 1);

  // Okuma cümlesi: veriden kurulur
  let read = `${periodLabel(F.period)} raporlarında ${S.t} ${S.n_funds} büyük fonun portföyünde. `;
  if (up || down) read += `Aktif yönetilen fonlardan ${up} tanesi ağırlığını artırdı, ${down} tanesi azalttı. `;
  if (S.flow_active > 0) read += `Tahmini net akış ${tl(S.flow_active, true)}; bu ay ağırlığı en çok artan hisseler arasında ${rank}. sırada.`;
  else if (S.flow_active < 0) read += `Tahmini net akış ${tl(S.flow_active, true)}; bu ay ağırlığı en çok azalan hisseler arasında ${total - rank + 1}. sırada.`;
  else read += 'Aktif fonlarda belirgin bir değişim yok.';
  if (S.flow_active < 0) read += ' Ağırlık düşüşünün bir kısmı hissenin fiyat düşüşünden gelebilir; kaç fonun azalttığına ve tam çıkış olup olmadığına bakmak daha sağlam bir işaret.';
  if (nNew.length) read += ` ${nNew.map((h) => h.f).join(', ')} hisseyi bu ay portföyüne ilk kez ekledi.`;
  if (nOut.length) read += ` ${nOut.map((h) => h.f).join(', ')} hisseden tamamen çıktı.`;

  // Bu hisseyi artıran fonların bu ay artırdığı diğer hisseler
  const inc = act.filter((h) => h.d > 0).map((h) => h.f);
  const co = {};
  for (const code of inc) for (const x of fund[code].holdings) if (x.t !== S.t && x.d > 0) { (co[x.t] ||= { t: x.t, n: 0, d: 0 }); co[x.t].n++; co[x.t].d += x.d; }
  const coList = Object.values(co).sort((a, b) => b.n - a.n || b.d - a.d).slice(0, 6);

  const alertOn = hasAlert('stock', S.t);
  app.innerHTML = `<div class="page">
    <section class="hero glass">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span class="greet">Hisse · fon pozisyonları</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin-top:6px;flex-wrap:wrap">
        <h1 style="margin:0;font-size:30px">${S.t}</h1>${watchBtn('stock', S.t)}
        <span class="ink2" style="font-size:16px">${esc(S.name)}</span>
      </div>
      <p class="lede">${esc(read)}</p>
      <div class="hero-row">
        <button class="btn ${alertOn ? '' : 'primary'}" id="alert-btn" ${alertOn ? 'disabled' : ''}>${ICON.bell}${alertOn ? 'Alarm kurulu' : 'Fon hareketi olunca haber ver'}</button>
        <a class="btn" href="https://tr.tradingview.com/symbols/BIST-${S.t}/" target="_blank" rel="noopener">Grafiği TradingView'de aç</a>
      </div>
      <div class="stats" style="margin-top:20px">
        <div class="stat"><div class="l">Tutan fon</div><div class="v">${S.n_funds}</div><div class="s muted">${F.totals.funds} fon içinde</div></div>
        <div class="stat"><div class="l">Fonlardaki değeri</div><div class="v">${tl(S.val)}</div><div class="s muted">ay sonu</div></div>
        <div class="stat"><div class="l">${term('fon-akisi', 'Tahmini akış')} (aktif)</div><div class="v ${tone(S.flow_active)}">${tl(S.flow_active, true)}</div><div class="s muted">${S.flow_active >= 0 ? `artanlarda ${rank}. sırada` : `azalanlarda ${total - rank + 1}. sırada`}</div></div>
        <div class="stat"><div class="l">Artıran / azaltan</div><div class="v"><span class="up">${up}</span> <span class="muted" style="font-weight:400">/</span> <span class="down">${down}</span></div><div class="s muted">aktif fonlar</div></div>
      </div>
    </section>

    <div class="grid">
      <section class="panel glass c8">
        <div class="panel-h"><h2>Hangi fonlar tutuyor</h2><span class="small muted">${periodLabel(F.period)}</span></div>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Fon</th><th class="n">${term('agirlik', 'Ağırlık')}</th><th class="bar-cell"></th><th class="n">${term('agirlik-degisimi', 'Değişim')}</th><th class="n">Değer</th><th class="n">Akış</th></tr></thead>
          <tbody>${map(H, (h) => { const f = fund[h.f]; return `<tr>
            <td><a class="row-link" href="fon.html?f=${h.f}"><span class="tk">${h.f}</span> ${h.status === 'new' ? '<span class="tag new">yeni</span>' : h.status === 'out' ? '<span class="tag out">çıktı</span>' : ''} ${h.type === 'endeks' ? `<span class="tag idx">${esc(f.type_label)}</span>` : ''}<span class="nm">${esc(f.company)}</span></a></td>
            <td class="n">%${num(h.w, 1)}</td>
            <td class="bar-cell"><div class="mini-bar one"><span style="width:${(h.w / maxW) * 100}%"></span></div></td>
            <td class="n ${tone(h.d)}">${pp(h.d)} puan</td>
            <td class="n">${tl(h.val)}</td>
            <td class="n ${tone(h.flow)}">${tl(h.flow, true)}</td></tr>`; })}</tbody>
        </table></div>
      </section>
      <section class="panel glass c4">
        <div class="panel-h"><h2>Aynı fonlar başka neyi artırdı</h2></div>
        <p class="panel-sub">${S.t} hissesinin ağırlığını artıran ${inc.length} aktif fonun bu ay ağırlığını en çok artırdığı diğer hisseler. Yöneticilerin aynı temayı nerede kurduğunu gösterir.</p>
        <div class="rows">${coList.length ? map(coList, (c) => `<a class="row" href="hisse.html?s=${c.t}" style="color:inherit;text-decoration:none"><div class="main-c"><b>${c.t}</b><small>${esc(F.stocks.find((x) => x.t === c.t)?.name || '')}</small></div><div class="end"><b>${c.n} fon</b><small class="up">${pp(c.d)} puan toplam</small></div></a>`) : '<p class="small muted">Bu ay hisseyi artıran aktif fon yok.</p>'}</div>
      </section>
    </div>
    <p class="foot-note">${esc(F.method)} ${esc(F.source)} Yatırım tavsiyesi değildir.</p>
  </div>`;

  document.getElementById('alert-btn')?.addEventListener('click', (e) => {
    addAlert({ kind: 'stock', code: S.t, rule: 'fund-move' });
    e.currentTarget.outerHTML = `<button class="btn" disabled>${ICON.bell}Alarm kurulu</button>`;
    toast(`${S.t} için alarm kuruldu`); refreshAlertDot({ funds: F });
  });
}

main().catch(fail);
