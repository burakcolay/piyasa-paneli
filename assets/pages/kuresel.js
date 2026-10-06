import { shell, loadDay, fail, esc, map, signed, heatBg, num, startLive } from '../app.js';

// Risk termometresi: her gösterge günlük değişimine göre +1 (risk iştahı), −1 (risk kaçışı) ya da 0 puan alır.
const RISK = [
  { key: 'vix', name: 'VIX (korku endeksi)', on: -1, th: 3, why: 'Korku endeksi düşerse yatırımcı rahat, yükselirse koruma arıyor.' },
  { key: 'dxy', name: 'Dolar endeksi', on: -1, th: 0.2, why: 'Dolar güvenli liman; para dolara kaçıyorsa risk azaltılıyor demektir.' },
  { key: 'gold', name: 'Altın', on: -1, th: 0.5, why: 'Altın da güvenli liman; sert yükselişi endişe işaretidir.' },
  { key: 'hyg', name: 'Yüksek getirili tahvil (HYG)', on: 1, th: 0.15, why: 'Riskli şirket tahvilleri alınıyorsa yatırımcı risk almaya istekli.' },
  { key: 'cu_au', name: 'Bakır / altın oranı', on: 1, th: 0.5, why: 'Bakır büyümeyi, altın korkuyu temsil eder; oran yükselirse büyüme iyimserliği.' },
  { key: 'btc', name: 'Bitcoin', on: 1, th: 1, why: 'En riskli varlıklardan biri; yükselişi risk iştahının göstergesi.' },
];
const STATES = [
  { min: 2, name: 'Risk iştahı', color: '#0B7A47', note: 'Para riskli varlıklara akıyor; NQ için arka plan destekleyici.' },
  { min: -1, name: 'Nötr', color: '#B7791F', note: 'Göstergeler karışık; net bir risk iştahı ya da kaçışı yok.' },
  { min: -99, name: 'Risk kaçışı', color: '#B42318', note: 'Para güvenli limanlara kaçıyor; NQ için arka plan baskılayıcı.' },
];

function riskReadings(L) {
  const m = L?.markets || {};
  const chg = (k) => m[k]?.chg ?? null;
  const out = {};
  for (const k of ['vix', 'dxy', 'gold', 'hyg']) out[k] = chg(k);
  out.btc = L?.crypto?.btc?.chg ?? null;
  const cu = m.copper, au = m.gold;
  out.cu_au = cu && au && cu.prev && au.prev ? ((cu.price / au.price) / (cu.prev / au.prev) - 1) * 100 : null;
  return out;
}

function thermometer(L) {
  if (!L) return '<p class="small muted">Canlı veri bekleniyor…</p>';
  const r = riskReadings(L);
  let score = 0, n = 0;
  const rows = RISK.map((x) => {
    const v = r[x.key];
    let pt = 0;
    if (v != null) { n++; if (v > x.th) pt = x.on; else if (v < -x.th) pt = -x.on; }
    score += pt;
    const tag = v == null ? ['bekleniyor', 'b-flat'] : pt > 0 ? ['Risk iştahı', 'b-good'] : pt < 0 ? ['Risk kaçışı', 'b-bad'] : ['Nötr', 'b-flat'];
    return `<div class="risk-row"><b>${esc(x.name)}</b><span class="mono small" title="Bugünkü değişim">${v == null ? 'veri yok' : esc(signed(v, 2))}</span>
      <span class="badge ${tag[1]}">${tag[0]}</span><small>${esc(x.why)}</small></div>`;
  }).join('');
  const st = STATES.find((s) => score >= s.min);
  const pos = ((score + 6) / 12) * 100;
  const vixLvl = L.markets?.vix?.price;
  return `<div class="risk-head">
      <div><div class="small muted">Bugünkü ruh hâli</div><div style="font-size:26px;font-weight:700;color:${st.color}">${st.name}</div><div class="small">${esc(st.note)}</div></div>
      <div class="mono" style="font-size:28px;font-weight:500">${score > 0 ? '+' : ''}${score}<span class="small muted"> / ${n}</span></div>
    </div>
    <div class="risk-scale" aria-hidden="true"><span class="mark" style="left:${pos}%"></span></div>
    <div class="scale-lbl"><span>Risk kaçışı</span><span>Nötr</span><span>Risk iştahı</span></div>
    ${vixLvl ? `<p class="small" style="margin-top:6px">VIX seviyesi <b class="mono">${num(vixLvl, 1)}</b>: ${vixLvl < 15 ? 'piyasa çok rahat (15 altı); bu rahatlık bazen ani düşüşlerden önce görülür.' : vixLvl < 20 ? 'normal aralık (15-20).' : vixLvl < 30 ? 'tedirginlik var (20-30); oynaklık yüksek.' : 'panik bölgesi (30 üstü).'}</p>` : ''}
    <div class="risk-list">${rows}</div>`;
}

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
    <div class="live-stamp inline" data-live-stamp hidden></div>

    <section class="card">
      <div class="head-row"><span class="eyebrow">Risk termometresi · canlı</span><span class="small muted">6 göstergenin bugünkü değişimi</span></div>
      <div id="thermo">${ctx.isOld ? '<p class="small muted">Risk termometresi sadece bugün için canlı çalışır.</p>' : thermometer(null)}</div>
      <details class="explain">
        <summary>Risk termometresi nasıl çalışır?</summary>
        <p>Her gösterge bugünkü değişimine göre puan alır: risk iştahını gösteriyorsa +1, risk kaçışını gösteriyorsa −1, hareket küçükse 0. Toplam +2 ve üstü "risk iştahı", −2 ve altı "risk kaçışı", arası "nötr".</p>
        <p>Mantık: Yatırımcı korktuğunda parayı güvenli limanlara (dolar, altın) taşır, riskli varlıkları (yüksek getirili tahvil, Bitcoin, bakır gibi büyümeye bağlı emtialar) satar; korku endeksi VIX de yükselir. Rahat olduğunda tersini yapar.</p>
        <p><b>NQ için:</b> Termometre "risk kaçışı" gösterirken NQ'da yükseliş yönlü kurulumlar daha kolay bozulur; "risk iştahı" gösterirken düşüş yönlü kurulumlar. Tek başına karar aracı değil, günlük yönünü kontrol etmek için.</p>
      </details>
    </section>

    <section class="card">
      <div class="head-row"><span class="eyebrow">Performans matrisi</span><span class="small muted">Yeşil yükseliş, kırmızı düşüş · Faizlerde baz puan, artış kırmızı</span></div>
      <div class="tbl-wrap"><table class="heatmap" style="min-width:600px">
        <thead><tr><th style="text-align:left">Varlık</th><th>1 gün</th><th>1 hafta</th><th>1 ay</th><th>Yılbaşından</th></tr></thead>
        <tbody>${map(K.groups, (g) => `<tr class="group"><td colspan="5">${esc(g.name)}</td></tr>` +
          map(g.rows, (r) => `<tr><td style="font-weight:500">${esc(r.name)}</td>${cell(r.d1, g.unit)}${cell(r.w1, g.unit)}${cell(r.m1, g.unit)}${cell(r.ytd, g.unit)}</tr>`))}</tbody>
      </table></div>
      <p class="note"><strong>Matris ne söylüyor:</strong> ${esc(K.note)}</p>
      <details class="explain" open>
        <summary>Bu tablo nasıl okunur?</summary>
        <p><b>Ne gösteriyor:</b> Her satır bir varlık, her sütun bir zaman aralığı. Hücredeki sayı o dönemdeki yüzde değişim. Koyu yeşil güçlü yükseliş, koyu kırmızı güçlü düşüş, gri yatay.</p>
        <p><b>Nasıl okunur:</b> Önce sütunlara bak, sonra satırlara. "1 ay" sütununda yeşillerin hangi grupta toplandığı paranın nereye aktığını gösterir. Aynı varlığın 1 gün ile 1 ay renkleri farklıysa (ör. ay kırmızı, gün yeşil) bu bir düşüş içindeki tepki yükselişi olabilir.</p>
        <p><b>Faiz satırları ters okunur:</b> Tahvil faizleri baz puan (100 bp = 1 puan) olarak gösterilir ve faiz artışı kırmızıdır, çünkü yükselen faiz hisseler ve özellikle NQ için olumsuzdur.</p>
        <p><b>Türkiye neden dolar bazında:</b> BIST TL bazında yükselse bile TL değer kaybediyorsa yabancı yatırımcı açısından kazanç olmayabilir. TUR ETF'i dolar bazlı olduğu için Türkiye'yi diğer ülkelerle aynı ölçüde karşılaştırmayı sağlar.</p>
        <p><b>NQ için:</b> Nasdaq 100 satırını S&amp;P 500 ve Dow ile kıyasla. Nasdaq diğerlerinden çok daha iyiyse yükseliş teknolojiye dayanıyor demektir: güçlü ama dar tabanlı, haberlere hassas.</p>
      </details>
    </section>
    <p class="source">Kaynak: Bigdata.com (FMP) ve Borsa MCP; canlı veriler Yahoo Finance, CoinGecko ve TradingView. Yüzde değişimler; ABD faizleri baz puan.</p>
  </main>`;

  if (!ctx.isOld) startLive((L) => { document.getElementById('thermo').innerHTML = thermometer(L); });
}

main().catch(fail);
