import { shell, fail, esc, map, num, pct, tl, tone, loadFunds, qm, params, periodLabel, overlap, watchBtn, refreshAlertDot } from '../core.js';

const app = shell('karsilastir', { title: 'Fon karşılaştır' });

async function main() {
  const F = await loadFunds();
  refreshAlertDot({ funds: F });
  const p = params();
  let A = (p.get('a') || 'TI2').toUpperCase(), B = (p.get('b') || 'AK3').toUpperCase();
  const byCode = Object.fromEntries(F.funds.map((f) => [f.code, f]));
  if (!byCode[A]) A = F.funds[0].code;
  if (!byCode[B] || B === A) B = F.funds.find((f) => f.code !== A).code;

  const opt = (sel) => map(F.funds, (f) => `<option value="${f.code}" ${f.code === sel ? 'selected' : ''}>${f.code} · ${esc(f.company)}${f.type === 'endeks' ? ' (endeks)' : ''}</option>`);

  const render = () => {
    const a = byCode[A], b = byCode[B];
    const o = overlap(a, b);
    const top = (f) => f.holdings.filter((h) => h.w > 0).sort((x, y) => y.w - x.w);
    const onlyA = top(a).filter((h) => !b.holdings.some((x) => x.t === h.t && x.w > 0)).slice(0, 8);
    const onlyB = top(b).filter((h) => !a.holdings.some((x) => x.t === h.t && x.w > 0)).slice(0, 8);
    const c5 = (f) => top(f).slice(0, 5).reduce((s, h) => s + h.w, 0);
    const verdict = o.pct >= 60 ? 'Bu iki fon büyük ölçüde aynı hisseleri aynı oranlarda tutuyor. İkisine birden yatırım yapmak, tek fona yatırım yapmaktan pek farklı değil.'
      : o.pct >= 35 ? 'İki fonun ortak bir çekirdeği var ama ayrıştıkları yer de az değil. Farkı aşağıdaki "sadece birinde olanlar" listesi gösteriyor.'
      : 'İki fon belirgin şekilde farklı hisselere yatırım yapıyor. Birlikte tutulduklarında çeşitlendirme sağlarlar.';
    const row = (l, fa, fb, fmt = (x) => x, cls = () => '') => `<tr><td class="muted">${l}</td><td class="n ${cls(fa)}">${fmt(fa)}</td><td class="n ${cls(fb)}">${fmt(fb)}</td></tr>`;

    document.getElementById('cmp').innerHTML = `
      <div class="grid">
        <section class="panel glass c4" style="align-items:center;text-align:center;justify-content:center">
          <div class="ring" style="--p:${Math.min(100, o.pct)}"><div><div><b>%${num(o.pct, 0)}</b><div class="xs muted">örtüşme</div></div></div></div>
          <p class="small ink2" style="max-width:34ch">${verdict}</p>
          <span class="xs muted">${o.common.length} ortak hisse ${qm('ortusme')}</span>
        </section>
        <section class="panel glass c8">
          <div class="panel-h"><h2>Yan yana</h2></div>
          <div class="tbl-wrap"><table class="tbl">
            <thead><tr><th></th><th class="n"><a href="fon.html?f=${A}">${A}</a></th><th class="n"><a href="fon.html?f=${B}">${B}</a></th></tr></thead>
            <tbody>
              ${row('Portföy şirketi', a.company, b.company, esc)}
              ${row('Tür', a.type_label, b.type_label, esc)}
              ${row('Büyüklük', a.size, b.size, tl)}
              ${row('Yatırımcı', a.investors, b.investors, (x) => num(x))}
              ${row('1 ay getiri', a.r1m, b.r1m, (x) => pct(x), tone)}
              ${row('1 yıl getiri', a.r1y, b.r1y, (x) => pct(x), tone)}
              ${row('Hisse oranı', a.equity, b.equity, (x) => `%${num(x, 0)}`)}
              ${row('Hisse sayısı', top(a).length, top(b).length, (x) => num(x))}
              ${row('İlk 5 hissenin payı', c5(a), c5(b), (x) => `%${num(x, 0)}`)}
            </tbody></table></div>
        </section>
      </div>
      <div class="grid">
        <section class="panel glass c6">
          <div class="panel-h"><h2>Ortak hisseler</h2><span class="small muted">ağırlıkları</span></div>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:36px"></th><th>Hisse</th><th class="n">${A}</th><th class="n">${B}</th></tr></thead>
          <tbody>${o.common.length ? map(o.common.slice(0, 15), (c) => `<tr><td>${watchBtn('stock', c.t)}</td><td><a class="row-link" href="hisse.html?s=${c.t}"><span class="tk">${c.t}</span></a></td><td class="n">%${num(c.a, 1)}</td><td class="n">%${num(c.b, 1)}</td></tr>`) : '<tr><td colspan="4" class="muted">Ortak hisse yok.</td></tr>'}</tbody></table></div>
        </section>
        <section class="panel glass c6">
          <div class="panel-h"><h2>Sadece birinde olanlar</h2></div>
          <div class="grid" style="gap:14px">
            <div class="c6" style="grid-column:span 6"><div class="small muted" style="margin-bottom:4px">Sadece ${A}</div><div class="rows">${map(onlyA, (h) => `<a class="row" href="hisse.html?s=${h.t}" style="color:inherit;text-decoration:none;padding:7px 2px"><div class="main-c"><b>${h.t}</b></div><div class="end">%${num(h.w, 1)}</div></a>`) || '<p class="small muted">Yok</p>'}</div></div>
            <div class="c6" style="grid-column:span 6"><div class="small muted" style="margin-bottom:4px">Sadece ${B}</div><div class="rows">${map(onlyB, (h) => `<a class="row" href="hisse.html?s=${h.t}" style="color:inherit;text-decoration:none;padding:7px 2px"><div class="main-c"><b>${h.t}</b></div><div class="end">%${num(h.w, 1)}</div></a>`) || '<p class="small muted">Yok</p>'}</div></div>
          </div>
        </section>
      </div>`;
    history.replaceState(null, '', `?a=${A}&b=${B}`);
  };

  app.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>Fon karşılaştır</h1><p>İki fonun gerçekte ne kadar benzediğini gör. ${periodLabel(F.period)} portföy raporlarına göre.</p></div></div>
    <section class="panel glass" style="flex-direction:row;flex-wrap:wrap;align-items:center;gap:12px">
      <select class="sel" id="a" aria-label="Birinci fon">${opt(A)}</select>
      <span class="muted">ile</span>
      <select class="sel" id="b" aria-label="İkinci fon">${opt(B)}</select>
      <button class="btn" id="swap">Yer değiştir</button>
    </section>
    <div id="cmp" style="display:flex;flex-direction:column;gap:18px"></div>
    <p class="foot-note">${esc(F.source)} Yatırım tavsiyesi değildir.</p>
  </div>`;
  render();
  document.getElementById('a').addEventListener('change', (e) => { A = e.target.value; if (A === B) { B = F.funds.find((f) => f.code !== A).code; document.getElementById('b').value = B; } render(); });
  document.getElementById('b').addEventListener('change', (e) => { B = e.target.value; if (A === B) { A = F.funds.find((f) => f.code !== B).code; document.getElementById('a').value = A; } render(); });
  document.getElementById('swap').addEventListener('click', () => { [A, B] = [B, A]; document.getElementById('a').value = A; document.getElementById('b').value = B; render(); });
}

main().catch(fail);
