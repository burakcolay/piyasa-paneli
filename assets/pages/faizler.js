import { shell, loadDay, fail, esc, map, kpi, num, startLive } from '../app.js';
import { yieldCurve } from '../charts.js';

async function main() {
  const ctx = await loadDay();
  const F = ctx.data.faizler;
  const app = shell('faizler', { ...ctx, updated: `Veriler ${ctx.data.updated}` });

  const tenors = map(F.curve, (c) => {
    const bp = Math.round((c.now - c.m1) * 100);
    return `<div class="kv"><span class="muted" style="width:44px">${esc(c.tenor)}</span><span style="font-weight:500">%${num(c.now, 2)}</span>
      <span style="width:76px;text-align:right" class="${bp > 0 ? 'down' : bp < 0 ? 'up' : 'flat'}">${bp > 0 ? '+' : ''}${bp} bp</span></div>`;
  });

  app.innerHTML = `<main class="wrap">
    <div class="live-stamp inline" data-live-stamp hidden></div>
    <div class="grid" style="--min:200px;gap:12px">${map(F.kpis, (k) => kpi(k, 'big'))}</div>

    <div class="row">
      <section class="card" style="flex:3 1 560px">
        <div class="head-row"><span class="eyebrow">ABD verim eğrisi</span>
          <div class="legend"><span><span style="width:18px;height:3px;background:#1F4FD1;border-radius:2px"></span>Bugün</span><span><span style="width:18px;border-top:2px dashed #8A90A0"></span>1 ay önce</span></div>
        </div>
        ${yieldCurve(F.curve)}
        <p class="note"><strong>Grafik bugün ne söylüyor:</strong> ${esc(F.curve_note)}</p>
        ${F.nq_note ? `<p class="note nq-note"><strong>NQ için anlamı:</strong> ${esc(F.nq_note)}</p>` : ''}
        <details class="explain" open>
          <summary>Bu grafik nedir, nasıl okunur?</summary>
          <p><b>Ne gösteriyor:</b> ABD devletinin farklı vadelerde borçlanırken ödediği faiz. Soldan sağa vade uzar: 1 ay, 3 ay, 1 yıl, 2 yıl … 30 yıl. Mavi çizgi bugün, kesikli gri çizgi 1 ay önce.</p>
          <p><b>Normal hâli:</b> Eğri soldan sağa yükselir. Arkadaşına 1 ay için borç verirken az, 10 yıl için verirken daha çok faiz istersin; süre uzadıkça belirsizlik artar.</p>
          <p><b>İki uç farklı şey anlatır:</b> Sol uç (2 yıllık) piyasanın Fed'den ne beklediğini gösterir; Fed artırım yapacak diye düşünülürse yükselir. Sağ uç (10 ve 30 yıllık) uzun vadeli enflasyon korkusunu ve ABD'nin borç yükü endişesini gösterir.</p>
          <p><b>Şekiller:</b> <i>Dikleşme</i> (sağ uç daha hızlı yükselir): enflasyon ya da borç korkusu. <i>Yatıklaşma</i> (iki uç birbirine yaklaşır): ekonomi yavaşlıyor beklentisi. <i>Ters eğri</i> (sol uç sağdan yüksek): piyasa faiz indirimi ve yavaşlama bekliyor; tarihsel olarak resesyon habercisi.</p>
          <p><b>Mavi çizgi griden yukarıdaysa</b> ABD'nin borçlanma maliyeti son bir ayda artmış demektir; aşağıdaysa düşmüştür.</p>
          <p><b>NQ için tek kural:</b> En önemli nokta 10 yıllık faiz. NQ şirketlerinin değeri yıllar sonraki kârlarına dayanır; 10 yıllık yükselince o kârların bugünkü değeri düşer. 10 yıllık sert yükseliyorsa NQ'da yükseliş yönünde önünde rüzgâr, düşüyorsa arkanda rüzgâr var.</p>
        </details>
      </section>
      <aside class="card" style="flex:1 1 280px">
        <span class="eyebrow">Vadeler</span>
        ${tenors}
        <span class="xs muted">Sağ sütun: 1 aylık değişim, baz puan</span>
      </aside>
    </div>

    <div class="row">
      <section class="card" style="flex:1 1 380px">
        <span class="eyebrow">Fed cephesi</span>
        <div><div class="small muted">Politika faizi</div><div class="mono" style="font-size:22px;font-weight:500">${esc(F.fed.rate)}</div><div class="small down">${esc(F.fed.rate_note)}</div></div>
        <div><div class="small muted">Sonraki toplantı</div><div style="font-size:16px;font-weight:500">${esc(F.fed.next_meeting)}</div></div>
        <div><div class="small muted">Piyasanın fiyatladığı</div><div>${esc(F.fed.pricing)}</div></div>
        <p class="small" style="color:var(--ink-2)">${esc(F.fed.paragraph)}</p>
      </section>
      <section class="card" style="flex:1 1 380px">
        <span class="eyebrow">Fed konuşmacıları · bu hafta ve sonrası</span>
        ${map(F.speakers, (s) => `<div class="list-row"><span class="k" style="width:96px;font-size:13px;font-weight:400">${esc(s.when)}</span><b>${esc(s.who)}</b></div>`)}
      </section>
    </div>
    <p class="source">Kaynak: Bigdata.com (faiz verisi FMP, takvim FXStreet). 1 ay önceki eğri, aylık değişimden hesaplanmıştır.</p>
  </main>`;
  if (!ctx.isOld) startLive();
}

main().catch(fail);
