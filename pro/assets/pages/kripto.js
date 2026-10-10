import { shell, fail, esc, map, num, pct, tone, loadCrypto, readCoin, watchBtn, qm, term, addAlert, hasAlert, toast, ICON, refreshAlertDot, loadFunds, loadLive, setLivePill } from '../core.js';

const app = shell('kripto', { title: 'Kripto türev' });
const usd = (v) => (v >= 1e9 ? `${num(v / 1e9, 2)} mr $` : `${num(v / 1e6, 0)} mn $`);

function spark(vals) {
  const w = 220, h = 44, n = vals.length, bw = w / n - 2, m = Math.max(...vals.map(Math.abs), 0.01);
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="Son 7 günün fonlama oranları" preserveAspectRatio="none">
    <line x1="0" x2="${w}" y1="${h / 2}" y2="${h / 2}" stroke="rgba(14,26,43,.15)"/>
    ${vals.map((v, i) => { const bh = (Math.abs(v) / m) * (h / 2 - 2); return `<rect x="${i * (w / n) + 1}" y="${v >= 0 ? h / 2 - bh : h / 2}" width="${bw}" height="${Math.max(1, bh)}" rx="1.5" fill="${v >= 0 ? 'rgba(12,122,85,.65)' : 'rgba(181,64,46,.65)'}"><title>%${num(v, 4)}</title></rect>`; }).join('')}
  </svg>`;
}

function card(c) {
  const r = readCoin(c), alertOn = hasAlert('coin', c.code);
  return `<section class="coin glass" id="${c.code}">
    <div class="coin-h"><div style="display:flex;align-items:center;gap:8px"><b>${c.code}</b><span class="small muted">${esc(c.name)}</span>${watchBtn('coin', c.code)}</div>
      <div style="text-align:right"><div class="p">$${num(c.price, c.price < 10 ? 3 : c.price < 1000 ? 2 : 0)}</div><div class="small ${tone(c.chg)}">${pct(c.chg, 2)} · 24 saat</div></div></div>
    <div><div style="display:flex;justify-content:space-between;align-items:baseline"><span class="small muted">Kaldıraç dengesi</span><b class="small">${r.label}</b></div>
      <div class="gauge" style="margin-top:8px"><i style="left:${((r.heat + 2) / 4) * 100}%"></i></div><div class="gauge-l"><span>Aşırı short</span><span>Dengeli</span><span>Aşırı long</span></div></div>
    <dl class="kv">
      <dt>${term('fonlama', 'Fonlama oranı')}</dt><dd class="${c.funding > 0.03 ? 'down' : c.funding < 0 ? 'up' : ''}">%${num(c.funding, 4)}</dd>
      <dt>7 günlük ortalama</dt><dd>%${num(c.funding7, 4)}</dd>
      <dt>${term('acik-pozisyon', 'Açık pozisyon')}</dt><dd>${usd(c.oi)}</dd>
      <dt>24 saat / 7 gün değişim</dt><dd><span class="${tone(c.oi1d)}">${pct(c.oi1d)}</span> · <span class="${tone(c.oi7d)}">${pct(c.oi7d)}</span></dd>
      <dt>${term('long-short', 'Long hesap oranı')}</dt><dd>%${num(c.longPct, 0)}</dd>
      <dt>${term('taker', 'Agresif alıcı/satıcı')} (24s)</dt><dd class="${c.taker > 1.05 ? 'up' : c.taker < 0.95 ? 'down' : ''}">${num(c.taker, 2)}</dd>
    </dl>
    <div><div class="small muted" style="margin-bottom:4px">Fonlama, son 7 gün (8 saatlik)</div>${spark(c.fundingHist)}</div>
    <div class="read">${map(r.lines, (l) => `<p style="margin:0 0 4px">${esc(l)}</p>`)}</div>
    <button class="btn" data-alert="${c.code}" ${alertOn ? 'disabled' : ''} style="align-self:flex-start">${ICON.bell}${alertOn ? 'Alarm kurulu' : 'Fonlama aşırılaşınca haber ver'}</button>
  </section>`;
}

async function main() {
  app.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>Kripto türev</h1><p>Vadeli piyasada kaldıraçlı pozisyonların durumu: kim kalabalık, kim ödüyor, yeni para giriyor mu. Fiyat değil, fiyatın arkasındaki konumlanma.</p></div><span class="chip" id="stamp">Bağlanıyor…</span></div>
    <div id="body"><div class="loading">Binance vadeli verisi alınıyor…</div></div>
  </div>`;
  const [C, Fd, L] = await Promise.all([loadCrypto(), loadFunds().catch(() => null), loadLive()]);
  setLivePill(L);
  refreshAlertDot({ funds: Fd, live: L, crypto: C });
  const body = document.getElementById('body');
  if (!C) {
    document.getElementById('stamp').textContent = 'Bağlantı yok';
    body.innerHTML = `<section class="panel glass empty-state"><b>Binance vadeli verisine bağlanılamadı</b><p>Tarayıcın fapi.binance.com adresine ulaşamadı. Ağ kısıtı ya da reklam engelleyici olabilir. Sayfayı yenileyip tekrar dene.</p><button class="btn primary" onclick="sessionStorage.removeItem('pro-crypto');location.reload()">Tekrar dene</button></section>`;
    return;
  }
  document.getElementById('stamp').textContent = `Canlı · ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
  const reads = C.map(readCoin), avg = reads.reduce((a, r) => a + r.heat, 0) / reads.length;
  const btc = C[0], br = reads[0];
  const head = avg >= 1 ? 'Piyasa genelinde long taraf kalabalık' : avg <= -1 ? 'Piyasa genelinde short taraf kalabalık' : 'Kaldıraç genel olarak dengeli';
  const sub = `Bitcoin'de fonlama %${num(btc.funding, 4)}, açık pozisyon 24 saatte ${pct(btc.oi1d)}. ${br.lines[0]}`;

  body.innerHTML = `<div style="display:flex;flex-direction:column;gap:18px">
    <section class="hero glass"><span class="greet">Şu anki tablo</span><h1>${esc(head)}</h1><p class="lede">${esc(sub)}</p></section>
    <div class="grid">${map(C, (c) => `<div class="c6">${card(c)}</div>`)}</div>
    <section class="panel glass">
      <div class="panel-h"><h2>Bu veriler nasıl okunur</h2></div>
      <div class="grid" style="gap:14px">
        <div class="c4 note"><b>Fonlama ${qm('fonlama')}</b><br>Pozitif ve yükseliyorsa kaldıraçlı long'lar kalabalık. Aşırı yükseklik genelde ani düşüşlerden önce görülür, çünkü kalabalık pozisyonlar zorla kapanınca düşüşü hızlandırır.</div>
        <div class="c4 note"><b>Açık pozisyon ${qm('acik-pozisyon')}</b><br>Fiyatla birlikte artıyorsa harekete yeni para giriyor, hareket güçlü. Fiyat yükselirken azalıyorsa yükseliş short'ların kapanmasından geliyor, sürdürmesi zor.</div>
        <div class="c4 note"><b>Long hesap oranı ${qm('long-short')}</b><br>Küçük yatırımcının nereye yığıldığını gösterir. Aşırı tek taraflı olduğunda fiyat çoğu zaman o kalabalığın tersine kırılır.</div>
      </div>
    </section>
    <p class="foot-note">Kaynak: Binance USDⓈ-M vadeli piyasası, herkese açık veriler, tarayıcından canlı çekilir. Kaldıraç dengesi fonlama ve long hesap oranından kurallarla hesaplanır; sinyal değil, durum tespitidir. Ticari sürümde lisanslı veri sağlayıcı kullanılacak. Yatırım tavsiyesi değildir.</p>
  </div>`;
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' });
  body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-alert]'); if (!b) return;
    addAlert({ kind: 'coin', code: b.dataset.alert, rule: 'funding-high' });
    b.disabled = true; b.innerHTML = `${ICON.bell}Alarm kurulu`; toast(`${b.dataset.alert} için alarm kuruldu`);
    refreshAlertDot({ funds: Fd, live: L, crypto: C });
  });
}

main().catch(fail);
