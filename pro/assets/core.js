// Piyasa Paneli Pro — ortak çekirdek: kabuk, veri, biçim, takip listesi, alarm, arama, terimler

/* ---------------- ikonlar ---------------- */
const I = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const ICON = {
  home: I('<path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z"/>'),
  flow: I('<path d="M4 7h11M4 7l3-3M4 7l3 3M20 17H9m11 0-3-3m3 3-3 3"/>'),
  compare: I('<circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5"/>'),
  coin: I('<circle cx="12" cy="12" r="8"/><path d="M9.5 9h4a1.8 1.8 0 0 1 0 3.6h-4 4.4a1.8 1.8 0 0 1 0 3.6H9.5M9.5 9v7.2M11 7.5V9m2-1.5V9m-2 7.2v1.3m2-1.3v1.3"/>'),
  star: I('<path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z"/>'),
  bell: I('<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0"/>'),
  search: I('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>'),
  book: I('<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5zM5 20.5A2.5 2.5 0 0 0 7.5 21H19"/>'),
  stock: I('<path d="M4 19V5m0 14h16M8 15l3.5-4 3 2.5L19 8"/>'),
  fund: I('<path d="M4 8h16v11H4zM8 8V5h8v3M4 12h16"/>'),
  close: I('<path d="M6 6l12 12M18 6 6 18"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  trash: I('<path d="M5 7h14M10 7V5h4v2m-7 0 1 12h8l1-12"/>'),
  flag: I('<path d="M5 21V4m0 0h11l-2 4 2 4H5"/>'),
  gold: I('<path d="M4 18h16l-2.5-6h-11zM8.5 12l1.5-4h4l1.5 4"/>'),
  globe: I('<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.5 2.5 2.5 13.5 0 16M12 4c-2.5 2.5-2.5 13.5 0 16"/>'),
  pct: I('<path d="M6 18 18 6"/><circle cx="7.5" cy="7.5" r="2"/><circle cx="16.5" cy="16.5" r="2"/>'),
  cal: I('<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>'),
  doc: I('<path d="M7 3.5h7l4 4V20.5H7z"/><path d="M14 3.5v4h4M10 12h5M10 15.5h5"/>'),
  pie: I('<path d="M12 4a8 8 0 1 0 8 8h-8z"/><path d="M15 3.6A8 8 0 0 1 20.4 9H15z"/>'),
  week: I('<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M4 10h16M8 14h2m3 0h2m-7 3h2"/>'),
  menu: I('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  play: I('<path d="M8 5.5v13l10.5-6.5z"/>'),
  stop: I('<rect x="7" y="7" width="10" height="10" rx="1.5"/>'),
  gear: I('<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6"/>'),
  ext: I('<path d="M14 5h5v5M19 5l-8 8M10 6H6v12h12v-4"/>'),
};
const BELL_OFF = ICON.bell;
const STAR = ICON.star;

/* ---------------- biçim ---------------- */
const nf = (d) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const map = (a, f) => (a || []).map(f).join('');
export const num = (v, d = 0) => (v == null || !isFinite(v) ? '—' : nf(d).format(v).replace('-', '−'));
export const signed = (v, d = 1) => (v == null || !isFinite(v) ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + nf(d).format(Math.abs(v)));
export const pct = (v, d = 1) => (v == null || !isFinite(v) ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}%${nf(d).format(Math.abs(v))}`);
export const pp = (v, d = 1) => (v == null ? '—' : v === 0 ? '0' : signed(v, d));
export const tone = (v) => (v > 0 ? 'up' : v < 0 ? 'down' : 'muted');
export function tl(v, signedOut = false) {
  if (v == null || !isFinite(v)) return '—';
  const a = Math.abs(v), s = signedOut ? (v > 0 ? '+' : v < 0 ? '−' : '') : v < 0 ? '−' : '';
  if (a >= 1e9) return `${s}${nf(a >= 1e10 ? 1 : 2).format(a / 1e9)} mr ₺`;
  if (a >= 1e6) return `${s}${nf(0).format(a / 1e6)} mn ₺`;
  if (a >= 1e3) return `${s}${nf(0).format(a / 1e3)} bin ₺`;
  return `${s}${nf(0).format(a)} ₺`;
}
export const params = () => new URLSearchParams(location.search);

/* ---------------- veri ---------------- */
const cache = {};
async function getJSON(url) {
  if (!cache[url]) cache[url] = fetch(url, { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); });
  return cache[url];
}
export const loadFunds = () => getJSON('data/funds.json');
export const loadUS = (p) => getJSON(`data/us/${p}`);
// Dolar tutarı: $3,2 T · $412 Mr · $18 Mn
export function usd(v, d) {
  if (v == null || !isFinite(v)) return '—';
  const a = Math.abs(v), s = v < 0 ? '−' : '';
  const [k, u] = a >= 1e12 ? [1e12, ' T'] : a >= 1e9 ? [1e9, ' Mr'] : a >= 1e6 ? [1e6, ' Mn'] : a >= 1e3 ? [1e3, ' B'] : [1, ''];
  const x = a / k; return `${s}$${nf(d ?? (x >= 100 ? 0 : x >= 10 ? 1 : 2)).format(x)}${u}`;
}
export const loadNotes = () => getJSON('data/notes.json');
export const loadSozluk = () => getJSON('../data/sozluk.json').catch(() => ({ concepts: {} }));
export async function loadDaily() {
  const latest = await getJSON('../data/latest.json');
  const day = await getJSON(`../data/daily/${latest.date}.json`);
  return { latest, day };
}
export async function loadLive() {
  try { const r = await fetch('/api/live', { cache: 'no-store' }); return r.ok ? await r.json() : null; } catch { return null; }
}

/* Kripto türev verisi: Binance vadeli piyasası (tarayıcıdan, herkese açık uç noktalar) */
const FAPI = 'https://fapi.binance.com';
export const COINS = [
  { sym: 'BTCUSDT', code: 'BTC', name: 'Bitcoin' },
  { sym: 'ETHUSDT', code: 'ETH', name: 'Ethereum' },
  { sym: 'SOLUSDT', code: 'SOL', name: 'Solana' },
  { sym: 'BNBUSDT', code: 'BNB', name: 'BNB' },
];
async function fj(path) { const r = await fetch(FAPI + path); if (!r.ok) throw new Error(r.status); return r.json(); }
export async function loadCrypto() {
  try { const c = JSON.parse(sessionStorage.getItem('pro-crypto') || 'null'); if (c && Date.now() - c.ts < 60e3) return c.data; } catch {}
  const one = async (c) => {
    const s = c.sym;
    const [t, p, oiH, ls, tk, fr] = await Promise.all([
      fj(`/fapi/v1/ticker/24hr?symbol=${s}`),
      fj(`/fapi/v1/premiumIndex?symbol=${s}`),
      fj(`/futures/data/openInterestHist?symbol=${s}&period=1d&limit=8`),
      fj(`/futures/data/globalLongShortAccountRatio?symbol=${s}&period=1h&limit=1`),
      fj(`/futures/data/takerlongshortRatio?symbol=${s}&period=1h&limit=24`),
      fj(`/fapi/v1/fundingRate?symbol=${s}&limit=21`),
    ]);
    const oiNow = +oiH.at(-1).sumOpenInterestValue, oi1d = +oiH.at(-2).sumOpenInterestValue, oi7d = +oiH.at(0).sumOpenInterestValue;
    const tkBuy = tk.reduce((a, x) => a + +x.buyVol, 0), tkSell = tk.reduce((a, x) => a + +x.sellVol, 0);
    const frs = fr.map((x) => +x.fundingRate * 100);
    return {
      ...c, price: +t.lastPrice, chg: +t.priceChangePercent, vol: +t.quoteVolume,
      funding: +p.lastFundingRate * 100, funding7: frs.reduce((a, b) => a + b, 0) / frs.length, fundingHist: frs,
      oi: oiNow, oi1d: (oiNow / oi1d - 1) * 100, oi7d: (oiNow / oi7d - 1) * 100,
      ls: +ls.at(-1).longShortRatio, longPct: +ls.at(-1).longAccount * 100,
      taker: tkSell ? tkBuy / tkSell : null,
    };
  };
  try {
    const data = await Promise.all(COINS.map(one));
    try { sessionStorage.setItem('pro-crypto', JSON.stringify({ ts: Date.now(), data })); } catch {}
    return data;
  } catch { return null; }
}

/* Kripto okuması: rakamları kurallarla yoruma çevirir (sinyal değil, durum tespiti) */
export function readCoin(c) {
  const out = [];
  let lev = 0; // kaldıraç ısısı: −2 … +2
  if (c.funding > 0.03) { lev += 2; out.push('Fonlama oranı yüksek: long taraf kalabalık ve kısa vadeli fiyatı kaldıraçla taşıyor.'); }
  else if (c.funding > 0.012) { lev += 1; out.push('Fonlama hafif pozitif, normal aralıkta: long tarafı biraz ağır ama aşırı değil.'); }
  else if (c.funding < -0.01) { lev -= 2; out.push("Fonlama negatif: short'lar long'lara ödüyor. Piyasa düşüş bekliyor; yukarı bir hareket short'ları kapattırıp yükselişi hızlandırabilir."); }
  else out.push('Fonlama nötre yakın: kaldıraçta belirgin bir yığılma yok.');
  if (c.chg > 0 && c.oi1d > 2) out.push('Fiyat ve açık pozisyon birlikte arttı: yükselişe yeni para giriyor.');
  else if (c.chg > 0 && c.oi1d < -2) out.push('Fiyat arttı ama açık pozisyon azaldı: yükseliş daha çok short kapanmasından geliyor, yeni alıcı zayıf.');
  else if (c.chg < 0 && c.oi1d > 2) out.push('Fiyat düşerken açık pozisyon arttı: düşüşe yeni short ekleniyor.');
  else if (c.chg < 0 && c.oi1d < -2) out.push("Fiyat ve açık pozisyon birlikte düştü: kaldıraçlı long'lar temizleniyor.");
  if (c.longPct > 68) { lev += 1; out.push(`Hesapların %${num(c.longPct, 0)}'i long: küçük yatırımcı tek yöne yığılmış, bu genelde ters yönde kırılganlık demek.`); }
  if (c.longPct < 40) { lev -= 1; out.push(`Hesapların sadece %${num(c.longPct, 0)}'i long: kalabalık düşüş bekliyor.`); }
  const heat = Math.max(-2, Math.min(2, lev));
  const label = heat >= 2 ? 'Aşırı long' : heat === 1 ? 'Long ağır' : heat === 0 ? 'Dengeli' : heat === -1 ? 'Short ağır' : 'Aşırı short';
  return { heat, label, lines: out };
}

/* ---------------- yerel depo (takip listesi + alarmlar) ---------------- */
const KEY = 'pro-store-v2';
const DEFAULT = {
  watch: { us: ['NVDA', 'AAPL', 'MSFT', 'META'] },
  alerts: [{ id: 'a3', kind: 'macro', code: 'vix', rule: 'above', value: 20, created: '2026-10-10' }],
};
let mem = null;
export function store() {
  if (mem) return mem;
  try { mem = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { mem = null; }
  if (!mem) mem = structuredClone(DEFAULT);
  return mem;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch {} }
export const isWatched = (kind, code) => store().watch[kind]?.includes(code);
export function toggleWatch(kind, code) {
  const s = store(); const l = (s.watch[kind] ||= []);
  const i = l.indexOf(code);
  if (i >= 0) l.splice(i, 1); else l.push(code);
  save(); return i < 0;
}
export const ALERT_RULES = {
  stock: [{ id: 'fund-move', label: 'Bir fon ağırlığını 0,5 puandan fazla değiştirirse ya da yeni girerse/çıkarsa' }],
  fund: [{ id: 'new-out', label: 'Fon portföyüne yeni hisse ekler ya da hisse çıkarırsa' }, { id: 'big-move', label: 'Bir hissenin ağırlığını 1 puandan fazla değiştirirse' }],
  macro: [{ id: 'above', label: 'Fiyat eşiğin üstüne çıkarsa' }, { id: 'below', label: 'Fiyat eşiğin altına inerse' }],
  coin: [{ id: 'funding-high', label: 'Fonlama oranı aşırı yükselirse (%0,03 üstü)' }, { id: 'funding-neg', label: 'Fonlama oranı negatife dönerse' }],
};
export function addAlert(a) { const s = store(); s.alerts.push({ id: 'a' + Date.now(), created: new Date().toISOString().slice(0, 10), ...a }); save(); }
export function removeAlert(id) { const s = store(); s.alerts = s.alerts.filter((x) => x.id !== id); save(); }
export const hasAlert = (kind, code) => store().alerts.some((a) => a.kind === kind && a.code === code);

export const MACRO_KEYS = { 'c:btc': 'Bitcoin ($)', 'c:eth': 'Ethereum ($)', usdtry: 'USD/TRY', eurtry: 'EUR/TRY', gramgold: 'Gram altın (₺)', gold: 'Ons altın ($)', xu100: 'BIST 100', ndx: 'Nasdaq 100', spx: 'S&P 500', vix: 'VIX', us10y: 'ABD 10 yıllık faiz', brent: 'Brent ($)', AAPL: 'Apple', MSFT: 'Microsoft', NVDA: 'Nvidia', AMZN: 'Amazon', META: 'Meta', GOOGL: 'Alphabet', TSLA: 'Tesla', AVGO: 'Broadcom' };
export const liveOf = (L, k) => (!L ? null : String(k).startsWith('c:') ? L.crypto?.[k.slice(2)] : L.markets?.[k]);

/* Alarmları eldeki veriyle değerlendirir → [{alert, hit, text}] */
export function evalAlerts({ funds, live, crypto } = {}) {
  return store().alerts.map((a) => {
    let hit = null, text = '';
    if (a.kind === 'stock' && funds) {
      const s = funds.stocks.find((x) => x.t === a.code);
      const moves = (s?.holders || []).filter((h) => Math.abs(h.d) >= 0.5 || h.status !== 'same');
      hit = moves.length > 0;
      text = hit ? `${moves.length} fonda belirgin değişim (${periodLabel(funds.period)})` : 'Bu ay belirgin değişim yok';
    } else if (a.kind === 'fund' && funds) {
      const f = funds.funds.find((x) => x.code === a.code);
      const hs = (f?.holdings || []).filter((h) => (a.rule === 'new-out' ? h.status !== 'same' : Math.abs(h.d) >= 1));
      hit = hs.length > 0;
      text = hit ? `${hs.slice(0, 4).map((h) => `${h.t}${h.status === 'new' ? ' (yeni)' : h.status === 'out' ? ' (çıktı)' : ''}`).join(', ')}${hs.length > 4 ? '…' : ''}` : 'Bu ay değişiklik yok';
    } else if (a.kind === 'macro' && live) {
      const m = liveOf(live, a.code);
      if (m) { hit = a.rule === 'above' ? m.price > a.value : m.price < a.value; text = `Şu an ${num(m.price, 2)} · eşik ${num(a.value, 2)}`; }
    } else if (a.kind === 'coin' && crypto) {
      const c = crypto.find((x) => x.code === a.code);
      if (c) { hit = a.rule === 'funding-high' ? c.funding > 0.03 : c.funding < 0; text = `Fonlama şu an ${c.funding < 0 ? "−" : ""}%${num(Math.abs(c.funding), 4)}`; }
    }
    return { a, hit, text };
  });
}
export function alertTitle(a) {
  const rule = (ALERT_RULES[a.kind] || []).find((r) => r.id === a.rule)?.label || '';
  const what = a.kind === 'macro' ? MACRO_KEYS[a.code] || a.code : a.code;
  return { what, rule };
}

/* ---------------- kabuk ---------------- */
export const ALL_MARKETS = [
  { id: 'abd', name: 'ABD borsaları', short: 'ABD', icon: 'stock', desc: 'S&P 500, Nasdaq 100, büyük teknoloji' },
  { id: 'bist', name: 'Borsa İstanbul', short: 'BIST', icon: 'flag', desc: 'BIST 100, sektörler, fonlar, TCMB' },
  { id: 'kripto', name: 'Kripto', short: 'Kripto', icon: 'coin', desc: 'Bitcoin, altcoinler, türev piyasası' },
  { id: 'emtia', name: 'Altın, döviz ve emtia', short: 'Emtia', icon: 'gold', desc: 'Altın, dolar, euro, petrol, gümüş' },
  { id: 'dunya', name: 'Avrupa ve Asya', short: 'Dünya', icon: 'globe', desc: 'DAX, Stoxx, Nikkei, Hang Seng' },
  { id: 'faiz', name: 'Faiz ve makro', short: 'Faiz', icon: 'pct', desc: 'Fed, tahvil faizleri, enflasyon, istihdam' },
];
// ABD odaklı sürüm: menüde sadece ABD ve makro. Diğerleri kodda duruyor, gizli.
export const MARKETS = ALL_MARKETS.filter((m) => ['abd', 'faiz'].includes(m.id));
export const marketById = (id) => ALL_MARKETS.find((m) => m.id === id);
const NAV = [
  { id: 'bugun', href: 'index.html', label: 'Bugün', icon: 'home' },
  { id: 'hisseler', href: 'hisseler.html', label: 'Hisseler', icon: 'stock' },
  { id: 'yatirimcilar', href: 'yatirimcilar.html', label: 'Büyük yatırımcılar', icon: 'pie' },
  { id: 'bilanco', href: 'bilanco.html', label: 'Bilançolar', icon: 'doc' },
  { id: 'takvim', href: 'takvim.html', label: 'Takvim', icon: 'cal' },
  { id: 'takip', href: 'takip.html', label: 'Takip ve alarmlar', icon: 'star' },
  { id: 'haftalik', href: 'haftalik.html', label: 'Haftalık rapor', icon: 'week' },
];
const TOOLS = [];
const TABS = [
  { id: 'bugun', href: 'index.html', label: 'Bugün', icon: 'home' },
  { id: 'hisseler', href: 'hisseler.html', label: 'Hisseler', icon: 'stock' },
  { id: 'yatirimcilar', href: 'yatirimcilar.html', label: 'Yatırımcılar', icon: 'pie' },
  { id: 'piyasa', href: 'piyasa.html', label: 'Makro', icon: 'pct' },
  { id: 'menu', href: '#menu', label: 'Menü', icon: 'menu' },
];

function navHTML(active) {
  const P = prefs();
  const mine = MARKETS;
  const link = (n) => `<a href="${n.href}" class="${n.id === active ? 'on' : ''}" ${n.id === active ? 'aria-current="page"' : ''}>${ICON[n.icon]}${n.label}</a>`;
  return `<nav class="nav">
      ${link(NAV[0])}
      ${map(NAV.slice(1, 4), link)}
      <div class="nav-h">Piyasa ve makro</div>
      ${map(mine, (m) => link({ id: 'm:' + m.id, href: `piyasa.html?m=${m.id}`, label: m.name, icon: m.icon }))}
      ${map(NAV.slice(4), link)}
      <div class="sep"></div>
      <a href="../index.html">${ICON.ext}Eski panel</a>
    </nav>`;
}

export function shell(active, { title } = {}) {
  if (title) document.title = `${title} · Piyasa Paneli Pro`;
  document.body.innerHTML = `
  <div class="app">
    <aside class="side glass" aria-label="Ana menü">
      <a class="brand" href="index.html" style="color:inherit;text-decoration:none">
        <span class="brand-mark">${ICON.stock}</span>
        <span><b>Piyasa Paneli</b><small>Pro · demo</small></span>
      </a>
      ${navHTML(active)}
      <div class="side-foot">Yatırım tavsiyesi değildir.</div>
    </aside>
    <div class="main">
      <header class="top">
        <button class="search-btn glass" id="open-search" aria-label="Ara">${ICON.search}<span>Şirket ya da sayfa ara</span><kbd>⌘K</kbd></button>
        <div class="top-actions">
          <span class="live-pill glass" id="live-pill" hidden><i></i><span></span></span>
          <button class="icon-btn glass" id="open-alerts" aria-label="Alarmlar">${ICON.bell}<span class="dot" id="alert-dot" hidden></span></button>
        </div>
      </header>
      <main id="content"><div class="loading">Yükleniyor…</div></main>
    </div>
  </div>
  <nav class="tabbar glass" aria-label="Alt menü">
    ${map(TABS, (n) => `<a href="${n.href}" class="${n.id === active || (n.id === 'piyasa' && String(active).startsWith('m:')) ? 'on' : ''}" ${n.id === 'menu' ? 'data-menu' : ''}>${ICON[n.icon]}${n.label}</a>`)}
  </nav>`;
  wireGlobal(active);
  return document.getElementById('content');
}

function openMenu(active) {
  const bg = document.createElement('div'); bg.className = 'drawer-bg';
  const d = document.createElement('aside'); d.className = 'drawer'; d.setAttribute('aria-label', 'Menü');
  d.innerHTML = `<div class="panel-h"><b style="font-size:18px">Menü</b><button class="icon-btn" style="width:34px;height:34px" data-close aria-label="Kapat">${ICON.close}</button></div>${navHTML(active)}`;
  document.body.append(bg, d);
  const close = () => { bg.remove(); d.remove(); };
  bg.addEventListener('click', close); d.querySelector('[data-close]').addEventListener('click', close);
}

/* ---------------- tercihler ve ilk giriş ---------------- */
export function prefs() {
  const s = store();
  s.prefs ||= { markets: [], level: '', style: '', onboarded: false };
  return s.prefs;
}
export function savePrefs(p) { store().prefs = { ...prefs(), ...p }; save(); }
export const LEVELS = [['yeni', 'Yeni başlıyorum', 'Terimleri açıklayarak, sade anlat'], ['orta', 'Biraz biliyorum', 'Temel kavramları biliyorum, yorumu merak ediyorum'], ['ileri', 'Deneyimliyim', 'Kısa ve yoğun; rakam ve seviye görmek istiyorum']];
export const STYLES = [['uzun', 'Uzun vadeli yatırım', 'Haftalık ve aylık resim, döngü, varlık dağılımı'], ['kisa', 'Kısa vadeli işlem', 'Günün yönü, oynaklık saatleri, vadeli piyasalar'], ['takip', 'Takip ve öğrenme', 'Dünyada ne oluyor, neden oluyor']];

export function openOnboarding(onDone) {
  const P = prefs();
  let step = 0; const sel = new Set(P.markets.length ? P.markets : []); let level = P.level, style = P.style;
  const bg = document.createElement('div'); bg.className = 'palette-bg'; bg.style.alignItems = 'center';
  const box = document.createElement('div'); box.className = 'palette onb'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Tercihler');
  bg.appendChild(box); document.body.appendChild(bg);
  const opt = (on, key, title, sub, icon) => `<button class="onb-opt ${on ? 'on' : ''}" data-k="${key}">${icon ? ICON[icon] : ''}<span><b>${esc(title)}</b><small>${esc(sub)}</small></span></button>`;
  const render = () => {
    const steps = [
      { h: 'Hangi piyasalarla ilgileniyorsun?', p: 'Bugün ekranın ve menün bunlara göre dizilir. Birden fazla seçebilirsin, sonra değiştirebilirsin.', body: map(MARKETS, (m) => opt(sel.has(m.id), m.id, m.name, m.desc, m.icon)), ok: sel.size > 0 },
      { h: 'Piyasaları ne kadar biliyorsun?', p: 'Yazıların dili ve açıklama sıklığı buna göre ayarlanır.', body: map(LEVELS, ([k, t, d]) => opt(level === k, k, t, d)), ok: !!level },
      { h: 'Piyasaları nasıl kullanıyorsun?', p: 'Öne çıkan bölümler buna göre değişir.', body: map(STYLES, ([k, t, d]) => opt(style === k, k, t, d)), ok: !!style },
    ];
    const S = steps[step];
    box.innerHTML = `<div class="onb-in">
      <div class="onb-dots">${steps.map((_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>
      <h2>${S.h}</h2><p class="ink2">${S.p}</p>
      <div class="onb-grid ${step === 0 ? 'two' : ''}">${S.body}</div>
      <div class="onb-foot">${step > 0 ? '<button class="btn" data-back>Geri</button>' : '<span></span>'}<button class="btn primary" data-next ${S.ok ? '' : 'disabled'}>${step < 2 ? 'Devam' : 'Panelimi kur'}</button></div>
    </div>`;
  };
  box.addEventListener('click', (e) => {
    const o = e.target.closest('.onb-opt');
    if (o) { const k = o.dataset.k; if (step === 0) { sel.has(k) ? sel.delete(k) : sel.add(k); } else if (step === 1) level = k; else style = k; render(); return; }
    if (e.target.closest('[data-back]')) { step--; render(); return; }
    if (e.target.closest('[data-next]')) {
      if (step < 2) { step++; render(); return; }
      savePrefs({ markets: MARKETS.map((m) => m.id).filter((id) => sel.has(id)), level, style, onboarded: true });
      bg.remove(); onDone ? onDone() : location.reload();
    }
  });
  render();
}

/* ---------------- TradingView widget ve sesli dinleme ---------------- */
// Ücretsiz TradingView widget'ı: el içine gömülür. Atıf (logo/link) widget'ın kendisinde kalır.
export function tvWidget(el, name, config, height) {
  if (!el) return;
  el.classList.add('tv-box'); if (height) el.style.height = height + 'px';
  el.innerHTML = '<div class="tradingview-widget-container" style="height:100%;width:100%"><div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div></div>';
  const s = document.createElement('script');
  s.src = `https://s3.tradingview.com/external-embedding/embed-widget-${name}.js`; s.async = true;
  s.text = JSON.stringify({ locale: 'tr', colorTheme: 'light', isTransparent: true, width: '100%', height: '100%', ...config });
  el.firstChild.appendChild(s);
}
export function lazyTV(el, name, config, height) {
  if (!el) return;
  if (!('IntersectionObserver' in window)) return tvWidget(el, name, config, height);
  el.style.minHeight = (height || 220) + 'px';
  const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); tvWidget(el, name, config, height); } }, { rootMargin: '200px' });
  io.observe(el);
}


export function fail(e) {
  console.error(e);
  const c = document.getElementById('content') || document.body;
  c.innerHTML = `<div class="panel glass empty-state"><b>Sayfa yüklenemedi</b><p>${esc(e.message || e)}</p><a class="btn" href="index.html">Bugün ekranına dön</a></div>`;
}

let toastT;
export function toast(msg) {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2400);
}

/* takip düğmesi: her satırda tek tıkla */
export function watchBtn(kind, code) {
  const on = isWatched(kind, code);
  return `<button class="watch ${on ? 'on' : ''}" data-watch="${kind}:${esc(code)}" aria-pressed="${on}" title="${on ? 'Takip listesinden çıkar' : 'Takip listesine ekle'}">${STAR}</button>`;
}

/* terim: [[id|metin]] ya da qm(id) */
let TERMS = {};
export function registerTerms(t) { TERMS = { ...TERMS, ...t }; }
export const term = (id, text) => `<span class="term" tabindex="0" data-term="${esc(id)}">${esc(text)}</span>`;
export const qm = (id) => `<button class="qm" data-term="${esc(id)}" aria-label="Bu ne demek?">?</button>`;
export const withTerms = (s) => esc(s).replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, (_, id, t) => `<span class="term" tabindex="0" data-term="${id}">${t}</span>`);

function showPop(el) {
  hidePop();
  const t = TERMS[el.dataset.term]; if (!t) return;
  const p = document.createElement('div'); p.className = 'pop'; p.setAttribute('role', 'tooltip');
  p.innerHTML = `<b>${esc(t.name)}</b>${esc(t.def)}`;
  document.body.appendChild(p);
  const r = el.getBoundingClientRect(), w = p.offsetWidth, h = p.offsetHeight;
  let x = Math.min(window.innerWidth - w - 12, Math.max(12, r.left + r.width / 2 - w / 2));
  let y = r.bottom + 8; if (y + h > window.innerHeight - 12) y = r.top - h - 8;
  p.style.left = x + 'px'; p.style.top = y + 'px';
}
function hidePop() { document.querySelectorAll('.pop').forEach((p) => p.remove()); }

/* ---------------- arama paleti ---------------- */
let searchIndex = null;
async function buildIndex() {
  if (searchIndex) return searchIndex;
  const U = await loadUS('universe.json').catch(() => null);
  const items = [];
  NAV.concat(TOOLS).forEach((n) => items.push({ g: 'Sayfalar', k: n.label, s: '', href: n.href }));
  MARKETS.forEach((m) => items.push({ g: 'Sayfalar', k: m.name, s: m.desc, href: `piyasa.html?m=${m.id}` }));
  items.push({ g: 'Sayfalar', k: 'Günlük analiz', s: 'Sabah yazısı ve makro panel', href: '../index.html' });
  (U?.rows || []).forEach((r) => items.push({ g: 'Hisseler', k: r.t, s: r.name, href: `sirket.html?t=${r.t}` }));
  return (searchIndex = items);
}
const norm = (s) => s.toLocaleLowerCase('tr-TR').replace(/[ıi̇]/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '');
async function openSearch() {
  if (document.querySelector('.palette-bg')) return;
  const items = await buildIndex();
  const bg = document.createElement('div'); bg.className = 'palette-bg';
  bg.innerHTML = `<div class="palette" role="dialog" aria-label="Ara"><input placeholder="Şirket adı ya da kodu yaz… (ör. NVDA, Apple)" aria-label="Ara"><div class="res"></div></div>`;
  document.body.appendChild(bg);
  const inp = bg.querySelector('input'), res = bg.querySelector('.res');
  let sel = 0, cur = [];
  const render = () => {
    const q = norm(inp.value.trim());
    cur = q ? items.filter((x) => norm(x.k).startsWith(q)).concat(items.filter((x) => !norm(x.k).startsWith(q) && norm(x.k + ' ' + x.s).includes(q))).slice(0, 40)
      : items.filter((x) => x.g === 'Sayfalar' || (x.g === 'Hisseler' && isWatched('us', x.k)));
    sel = Math.min(sel, Math.max(0, cur.length - 1));
    if (!cur.length) { res.innerHTML = `<div class="empty">"${esc(inp.value)}" için sonuç yok. Şu an Nasdaq 100 şirketleri kapsanıyor.</div>`; return; }
    let g = '';
    res.innerHTML = cur.map((x, i) => { const head = x.g !== g ? `<div class="grp">${q ? x.g : x.g === 'Sayfalar' ? 'Sayfalar' : 'Takip listen'}</div>` : ''; g = x.g; return `${head}<a href="${x.href}" class="${i === sel ? 'sel' : ''}"><span class="k">${esc(x.k)}</span><small>${esc(x.s)}</small></a>`; }).join('');
  };
  const close = () => bg.remove();
  inp.addEventListener('input', () => { sel = 0; render(); });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { sel = Math.min(cur.length - 1, sel + 1); render(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); render(); e.preventDefault(); }
    else if (e.key === 'Enter' && cur[sel]) location.href = cur[sel].href;
    else if (e.key === 'Escape') close();
  });
  bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
  render(); inp.focus();
}

/* ---------------- alarm çekmecesi ---------------- */
async function openAlerts() {
  if (document.querySelector('.drawer')) return;
  const [funds, live] = await Promise.all([loadFunds().catch(() => null), loadLive()]);
  let crypto = null; try { crypto = JSON.parse(sessionStorage.getItem('pro-crypto') || 'null')?.data || null; } catch {}
  const res = evalAlerts({ funds, live, crypto });
  const bg = document.createElement('div'); bg.className = 'drawer-bg';
  const d = document.createElement('aside'); d.className = 'drawer'; d.setAttribute('aria-label', 'Alarmlar');
  d.innerHTML = `<div class="panel-h"><h2 style="font-size:20px">Alarmlar</h2><button class="icon-btn" style="width:34px;height:34px" aria-label="Kapat" data-close>${ICON.close}</button></div>
    <p class="small ink2">Koşulu sağlanan alarmlar üstte. Alarmlar bu tarayıcıda saklanır.</p>
    <div class="rows">${res.length ? map(res, ({ a, hit, text }) => { const t = alertTitle(a); return `<div class="row"><span class="chip ${hit === true ? 'warn' : hit === false ? '' : ''}" style="min-width:86px;justify-content:center">${hit === true ? 'Tetiklendi' : hit === false ? 'Sakin' : 'Veri yok'}</span><div class="main-c"><b>${esc(t.what)}</b><small style="white-space:normal">${esc(t.rule)}${a.value != null ? ` (${num(a.value, 2)})` : ''}</small><small style="white-space:normal;color:var(--ink-2)">${esc(text)}</small></div></div>`; }) : '<div class="empty-state"><b>Henüz alarm yok</b><p>Takip ve alarmlar sayfasından ya da bir hisse veya fon sayfasındaki zil düğmesinden ekleyebilirsin.</p></div>'}</div>
    <a class="btn" href="takip.html" style="align-self:flex-start">Alarmları yönet</a>`;
  document.body.append(bg, d);
  const close = () => { bg.remove(); d.remove(); };
  bg.addEventListener('click', close); d.querySelector('[data-close]').addEventListener('click', close);
  document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', k); } });
}
// Tarayıcı bildirimi: sayfa açıkken tetiklenen alarm için günde bir kez (ücretsiz, sunucusuz)
function notifyHits(ctx) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const day = new Date().toISOString().slice(0, 10);
  let seen = {}; try { seen = JSON.parse(localStorage.getItem('pro-notified') || '{}'); } catch {}
  for (const { a, hit, text } of evalAlerts(ctx)) {
    if (!hit || seen[a.id] === day) continue;
    try { new Notification(`Alarm: ${alertTitle(a).what}`, { body: text, tag: a.id }); } catch {}
    seen[a.id] = day;
  }
  try { localStorage.setItem('pro-notified', JSON.stringify(seen)); } catch {}
}
export async function refreshAlertDot(ctx) {
  const n = evalAlerts(ctx).filter((r) => r.hit).length;
  notifyHits(ctx);
  const dot = document.getElementById('alert-dot'); if (!dot) return;
  dot.hidden = !n; dot.textContent = n;
}

/* ---------------- canlı veri rozeti ---------------- */
export function setLivePill(L) {
  const p = document.getElementById('live-pill'); if (!p || !L) return;
  p.hidden = false;
  p.querySelector('span').textContent = `Canlı · ${new Date(L.ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
}

function wireGlobal(active) {
  document.getElementById('open-search').addEventListener('click', openSearch);
  document.getElementById('open-alerts').addEventListener('click', openAlerts);
  document.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); } else if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); } });
  document.addEventListener('click', (e) => {
    const s = e.target.closest('[data-search]'); if (s) { e.preventDefault(); openSearch(); return; }
    const mn = e.target.closest('[data-menu]'); if (mn) { e.preventDefault(); openMenu(active); return; }
    const pr = e.target.closest('[data-prefs]'); if (pr) { e.preventDefault(); document.querySelector('.drawer-bg')?.click(); openOnboarding(); return; }
    const w = e.target.closest('[data-watch]');
    if (w) {
      e.preventDefault(); e.stopPropagation();
      const [kind, code] = w.dataset.watch.split(':');
      const on = toggleWatch(kind, code);
      document.querySelectorAll(`[data-watch="${kind}:${code}"]`).forEach((b) => { b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.title = on ? 'Takip listesinden çıkar' : 'Takip listesine ekle'; });
      toast(on ? `${code} takip listene eklendi` : `${code} takip listenden çıkarıldı`);
      return;
    }
    const t = e.target.closest('[data-term]');
    if (t) { e.preventDefault(); showPop(t); return; }
    if (!e.target.closest('.pop')) hidePop();
  });
  document.addEventListener('mouseover', (e) => { const t = e.target.closest('.term[data-term]'); if (t && matchMedia('(hover:hover)').matches) showPop(t); });
  document.addEventListener('mouseout', (e) => { if (e.target.closest('.term[data-term]')) hidePop(); });
  document.addEventListener('focusin', (e) => { const t = e.target.closest('.term[data-term]'); if (t) showPop(t); });
  window.addEventListener('scroll', hidePop, { passive: true });
  loadNotes().then((n) => registerTerms(n.terms)).catch(() => {});
  loadSozluk().then((s) => registerTerms(s.concepts || {})).catch(() => {});
  loadFunds().then((f) => { const el = document.getElementById('foot-period'); if (el && f.period) { const [y, m] = f.period.split('-'); el.textContent = `${['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'][+m - 1]} ${y}`; } }).catch(() => {});
}

export const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const periodLabel = (p) => { const [y, m] = String(p).split('-'); return `${MONTHS[+m - 1]} ${y}`; };

/* iki fonun portföy örtüşmesi: ortak hisselerde düşük ağırlıkların toplamı */
export function overlap(a, b) {
  const wb = Object.fromEntries(b.holdings.filter((h) => h.w > 0).map((h) => [h.t, h.w]));
  let s = 0; const common = [];
  for (const h of a.holdings) if (h.w > 0 && wb[h.t]) { const m = Math.min(h.w, wb[h.t]); s += m; common.push({ t: h.t, a: h.w, b: wb[h.t], m }); }
  return { pct: s, common: common.sort((x, y) => y.m - x.m) };
}


/* aktif yönetilen fonlara göre sayım (endeks fonları hariç) */
export function actStats(s) {
  const hs = s.holders.filter((h) => h.type === 'aktif');
  return { up: hs.filter((h) => h.d > 0).length, down: hs.filter((h) => h.d < 0).length, nw: hs.filter((h) => h.status === 'new').length, out: hs.filter((h) => h.status === 'out').length };
}
