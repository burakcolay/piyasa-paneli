import { shell, loadDay, fail, esc, map, signed, heatBg } from '../app.js';

async function main() {
  const ctx = await loadDay();
  const K = ctx.data.kuresel;
  const app = shell('kuresel', { ...ctx, updated: `Veriler ${ctx.data.updated}` });

  const cell = (v, unit) => {
    if (v === null || v === undefined) return `<td class="c" style="background:#F0F0EC">–</td>`;
    if (unit === 'bp') return `<td class="c" style="background:${heatBg(-v / 15)}">${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)} bp</td>`;
    return `<td class="c" style="background:${heatBg(v)}">${esc(signed(v, 1, ''))}</td>`;
  };

  app.innerHTML = `<main class="wrap">
    <section class="card">
      <div class="head-row"><span class="eyebrow">Performans matrisi</span><span class="small muted">Yeşil yükseliş, kırmızı düşüş · Faizlerde baz puan, artış kırmızı</span></div>
      <div class="tbl-wrap"><table class="heatmap" style="min-width:600px">
        <thead><tr><th style="text-align:left">Varlık</th><th>1 gün</th><th>1 hafta</th><th>1 ay</th><th>Yılbaşından</th></tr></thead>
        <tbody>${map(K.groups, (g) => `<tr class="group"><td colspan="5">${esc(g.name)}</td></tr>` +
          map(g.rows, (r) => `<tr><td style="font-weight:500">${esc(r.name)}</td>${cell(r.d1, g.unit)}${cell(r.w1, g.unit)}${cell(r.m1, g.unit)}${cell(r.ytd, g.unit)}</tr>`))}</tbody>
      </table></div>
      <p class="note"><strong>Matris ne söylüyor:</strong> ${esc(K.note)}</p>
    </section>
    <p class="source">Kaynak: Bigdata.com (FMP) ve Borsa MCP. Yüzde değişimler; ABD faizleri baz puan.</p>
  </main>`;
}

main().catch(fail);
