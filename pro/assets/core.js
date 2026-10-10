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
const KEY = 'pro-store-v1';
const DEFAULT = {
  watch: { stock: ['BIMAS', 'ASELS', 'TCELL', 'GARAN'], fund: ['TI2', 'MAC'], coin: ['BTC', 'ETH'] },
  alerts: [
    { id: 'a1', kind: 'stock', code: 'ASELS', rule: 'fund-move', created: '2026-10-10' },
    { id: 'a2', kind: 'fund', code: 'TI2', rule: 'new-out', created: '2026-10-10' },
    { id: 'a3', kind: 'macro', code: 'vix', rule: 'above', value: 20, created: '2026-10-10' },
    { id: 'a4', kind: 'coin', code: 'BTC', rule: 'funding-high', created: '2026-10-10' },
  ],
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
  macro: [{ id: 'above', label: 'Eşiğin üstüne çıkarsa' }, { id: 'below', label: 'Eşiğin altına inerse' }],
  coin: [{ id: 'funding-high', label: 'Fonlama oranı aşırı yükselirse (%0,03 üstü)' }, { id: 'funding-neg', label: 'Fonlama oranı negatife dönerse' }],
};
export function addAlert(a) { const s = store(); s.alerts.push({ id: 'a' + Date.now(), created: new Date().toISOString().slice(0, 10), ...a }); save(); }
export function removeAlert(id) { const s = store(); s.alerts = s.alerts.filter((x) => x.id !== id); save(); }
export const hasAlert = (kind, code) => store().alerts.some((a) => a.kind === kind && a.code === code);

export const MACRO_KEYS = { vix: 'VIX', us10y: 'ABD 10 yıllık faiz', usdtry: 'USD/TRY', xu100: 'BIST 100', ndx: 'Nasdaq 100', gold: 'Ons altın', brent: 'Brent' };

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
      const m = live.markets?.[a.code];
      if (m) { hit = a.rule === 'above' ? m.price > a.value : m.price < a.value; text = `Şu an ${num(m.price, 2)} · eşik ${num(a.value, 2)}`; }
    } else if (a.kind === 'coin' && crypto) {
      const c = crypto.find((x) => x.code === a.code);
      if (c) { hit = a.rule === 'funding-high' ? c.funding > 0.03 : c.funding < 0; text = `Fonlama şu an %${num(c.funding, 4)}`; }
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
const NAV = [
  { id: 'bugun', href: 'index.html', label: 'Bugün', icon: 'home' },
  { id: 'fonlar', href: 'fonlar.html', label: 'Fon hareketleri', icon: 'flow' },
  { id: 'karsilastir', href: 'karsilastir.html', label: 'Fon karşılaştır', icon: 'compare' },
  { id: 'kripto', href: 'kripto.html', label: 'Kripto türev', icon: 'coin' },
  { id: 'takip', href: 'takip.html', label: 'Takip ve alarmlar', icon: 'star' },
];
const TABS = [
  { id: 'bugun', href: 'index.html', label: 'Bugün', icon: 'home' },
  { id: 'fonlar', href: 'fonlar.html', label: 'Fonlar', icon: 'flow' },
  { id: 'kripto', href: 'kripto.html', label: 'Kripto', icon: 'coin' },
  { id: 'takip', href: 'takip.html', label: 'Takip', icon: 'star' },
  { id: 'ara', href: '#ara', label: 'Ara', icon: 'search' },
];

export function shell(active, { title } = {}) {
  if (title) document.title = `${title} · Piyasa Paneli Pro`;
  document.body.innerHTML = `
  <div class="app">
    <aside class="side glass" aria-label="Ana menü">
      <a class="brand" href="index.html" style="color:inherit;text-decoration:none">
        <span class="brand-mark">${ICON.stock}</span>
        <span><b>Piyasa Paneli</b><small>Pro · demo</small></span>
      </a>
      <nav class="nav">
        ${map(NAV, (n) => `<a href="${n.href}" class="${n.id === active ? 'on' : ''}" ${n.id === active ? 'aria-current="page"' : ''}>${ICON[n.icon]}${n.label}</a>`)}
        <div class="sep"></div>
        <a href="../index.html">${ICON.book}Günlük analiz</a>
      </nav>
      <div class="side-foot">
        Fon verisi: <span id="foot-period">Eylül 2026</span> portföy raporları<br>
        Demo sürüm, kişisel kullanım. Yatırım tavsiyesi değildir.
      </div>
    </aside>
    <div class="main">
      <header class="top">
        <button class="search-btn glass" id="open-search" aria-label="Ara">${ICON.search}<span>Hisse, fon ya da coin ara</span><kbd>⌘K</kbd></button>
        <div class="top-actions">
          <span class="live-pill glass" id="live-pill" hidden><i></i><span></span></span>
          <button class="icon-btn glass" id="open-alerts" aria-label="Alarmlar">${ICON.bell}<span class="dot" id="alert-dot" hidden></span></button>
        </div>
      </header>
      <main id="content"><div class="loading">Yükleniyor…</div></main>
    </div>
  </div>
  <nav class="tabbar glass" aria-label="Alt menü">
    ${map(TABS, (n) => `<a href="${n.href}" class="${n.id === active ? 'on' : ''}" ${n.id === 'ara' ? 'data-search' : ''}>${ICON[n.icon]}${n.label}</a>`)}
  </nav>`;
  wireGlobal();
  return document.getElementById('content');
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
  const F = await loadFunds().catch(() => null);
  const items = [];
  NAV.forEach((n) => items.push({ g: 'Sayfalar', k: n.label, s: '', href: n.href }));
  items.push({ g: 'Sayfalar', k: 'Günlük analiz', s: 'Sabah yazısı ve makro panel', href: '../index.html' });
  (F?.stocks || []).filter((s) => s.n_funds > 0).forEach((s) => items.push({ g: 'Hisseler', k: s.t, s: `${s.name} · ${s.n_funds} fonda`, href: `hisse.html?s=${s.t}` }));
  (F?.funds || []).forEach((f) => items.push({ g: 'Fonlar', k: f.code, s: f.name, href: `fon.html?f=${f.code}` }));
  COINS.forEach((c) => items.push({ g: 'Kripto', k: c.code, s: `${c.name} vadeli piyasa`, href: `kripto.html#${c.code}` }));
  return (searchIndex = items);
}
const norm = (s) => s.toLocaleLowerCase('tr-TR').replace(/[ıi̇]/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '');
async function openSearch() {
  if (document.querySelector('.palette-bg')) return;
  const items = await buildIndex();
  const bg = document.createElement('div'); bg.className = 'palette-bg';
  bg.innerHTML = `<div class="palette" role="dialog" aria-label="Ara"><input placeholder="Hisse kodu, fon kodu ya da coin yaz… (ör. BIMAS, TI2, BTC)" aria-label="Ara"><div class="res"></div></div>`;
  document.body.appendChild(bg);
  const inp = bg.querySelector('input'), res = bg.querySelector('.res');
  let sel = 0, cur = [];
  const render = () => {
    const q = norm(inp.value.trim());
    cur = q ? items.filter((x) => norm(x.k).startsWith(q)).concat(items.filter((x) => !norm(x.k).startsWith(q) && norm(x.k + ' ' + x.s).includes(q))).slice(0, 40)
      : items.filter((x) => x.g === 'Sayfalar' || (x.g === 'Hisseler' && isWatched('stock', x.k)) || (x.g === 'Fonlar' && isWatched('fund', x.k)));
    sel = Math.min(sel, Math.max(0, cur.length - 1));
    if (!cur.length) { res.innerHTML = `<div class="empty">"${esc(inp.value)}" için sonuç yok. Demo şu an ${items.filter((x) => x.g === 'Fonlar').length} büyük hisse fonunu ve onların tuttuğu hisseleri kapsıyor.</div>`; return; }
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
    <p class="small ink2">Demo: alarmlar bu tarayıcıda saklanır, bildirim gönderilmez. Koşul sağlanınca burada işaretlenir.</p>
    <div class="rows">${res.length ? map(res, ({ a, hit, text }) => { const t = alertTitle(a); return `<div class="row"><span class="chip ${hit === true ? 'warn' : hit === false ? '' : ''}" style="min-width:86px;justify-content:center">${hit === true ? 'Tetiklendi' : hit === false ? 'Sakin' : 'Veri yok'}</span><div class="main-c"><b>${esc(t.what)}</b><small style="white-space:normal">${esc(t.rule)}${a.value != null ? ` (${num(a.value, 2)})` : ''}</small><small style="white-space:normal;color:var(--ink-2)">${esc(text)}</small></div></div>`; }) : '<div class="empty-state"><b>Henüz alarm yok</b><p>Takip ve alarmlar sayfasından ya da bir hisse veya fon sayfasındaki zil düğmesinden ekleyebilirsin.</p></div>'}</div>
    <a class="btn" href="takip.html" style="align-self:flex-start">Alarmları yönet</a>`;
  document.body.append(bg, d);
  const close = () => { bg.remove(); d.remove(); };
  bg.addEventListener('click', close); d.querySelector('[data-close]').addEventListener('click', close);
  document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', k); } });
}
export async function refreshAlertDot(ctx) {
  const n = evalAlerts(ctx).filter((r) => r.hit).length;
  const dot = document.getElementById('alert-dot'); if (!dot) return;
  dot.hidden = !n; dot.textContent = n;
}

/* ---------------- canlı veri rozeti ---------------- */
export function setLivePill(L) {
  const p = document.getElementById('live-pill'); if (!p || !L) return;
  p.hidden = false;
  p.querySelector('span').textContent = `Canlı · ${new Date(L.ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
}

function wireGlobal() {
  document.getElementById('open-search').addEventListener('click', openSearch);
  document.getElementById('open-alerts').addEventListener('click', openAlerts);
  document.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); } else if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); } });
  document.addEventListener('click', (e) => {
    const s = e.target.closest('[data-search]'); if (s) { e.preventDefault(); openSearch(); return; }
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
