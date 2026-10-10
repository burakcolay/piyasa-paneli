// Piyasa modülü: her piyasanın sabah yorumu, canlı rakamları, widget ayarları, takvim eşleşmeleri.
import { esc, map, num, pct, tone, liveOf } from './core.js';

/* ---- canlı rakamlar ---- */
const LIVE = {
  abd: [['spx', 'S&P 500', 0], ['ndx', 'Nasdaq 100', 0], ['dji', 'Dow Jones', 0], ['vix', 'VIX', 2]],
  bist: [['xu100', 'BIST 100', 0], ['xu030', 'BIST 30', 0], ['usdtry', 'USD/TRY', 2], ['eurtry', 'EUR/TRY', 2]],
  kripto: [['c:btc', 'Bitcoin $', 0], ['c:eth', 'Ethereum $', 0], ['c:sol', 'Solana $', 2], ['c:bnb', 'BNB $', 0]],
  emtia: [['gramgold', 'Gram altın ₺', 0], ['gold', 'Ons altın $', 0], ['usdtry', 'USD/TRY', 2], ['brent', 'Brent $', 2]],
  dunya: [['sx5e', 'Euro Stoxx 50', 0], ['dax', 'DAX', 0], ['n225', 'Nikkei 225', 0], ['hsi', 'Hang Seng', 0]],
  faiz: [['us10y', 'ABD 10 yıllık', 2], ['us30y', 'ABD 30 yıllık', 2], ['dxy', 'Dolar endeksi', 2], ['eurusd', 'EUR/USD', 4]],
};
export function liveNums(id, L) {
  return (LIVE[id] || []).map(([k, label, d]) => {
    const m = liveOf(L, k);
    const isY = k === 'us10y' || k === 'us30y';
    return m?.price != null ? { label, value: (isY ? '%' : '') + num(m.price, d), chg: m.chg, key: k } : { label, value: '—', chg: null, key: k };
  });
}
export const numsHTML = (arr) => `<div class="mk-nums">${map(arr, (n) => `<div><small>${esc(n.label)}</small><b>${esc(n.value)} ${n.chg != null ? `<span class="small ${tone(n.chg)}" style="font-weight:500">${pct(n.chg, 2)}</span>` : ''}</b></div>`)}</div>`;

/* ---- sabah yorumu: mevcut günlük dosyadan ---- */
const first = (p) => { const m = String(p || '').replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, '$1').match(/^.+?[.!?](\s|$)/); return m ? m[0].trim().replace(/[.]$/, '') : ''; };
export function story(id, D) {
  const nq = D.nq || {}, K = D.kripto || {}, T = D.turkiye || {}, M = D.makro || {}, F = D.faizler || {};
  switch (id) {
    case 'abd': return { title: first(D.s2?.paragraphs?.[0]) || 'ABD borsaları', chain: D.s2?.chain, paragraphs: D.s2?.paragraphs, watch: nq.watch, cards: null };
    case 'bist': return { title: T.reading?.headline || 'Borsa İstanbul', chain: D.s5?.chain, paragraphs: (T.reading?.paragraphs || D.s5?.paragraphs), cards: D.s5?.cards, watch: T.upcoming?.[0] ? `Sıradaki veri: ${T.upcoming[0].when} · ${T.upcoming[0].name}` : null };
    case 'kripto': return { title: K.reading?.headline || 'Kripto', chain: null, paragraphs: K.reading?.paragraphs, cards: null, watch: K.levels?.note || null };
    case 'emtia': return { title: first(D.s4?.paragraphs?.[0]) || 'Altın, döviz ve emtia', chain: D.s4?.chain, paragraphs: D.s4?.paragraphs, cards: D.s4?.cards, watch: null };
    case 'dunya': return { title: first(D.s3?.paragraphs?.[0]) || 'Avrupa ve Asya', chain: D.s3?.chain, paragraphs: D.s3?.paragraphs, cards: D.s3?.cards, watch: null };
    case 'faiz': return { title: M.analysis?.headline || 'Faiz ve makro', chain: M.analysis?.chain, paragraphs: M.analysis?.paragraphs, cards: null, watch: F.fed?.next_meeting ? `Sıradaki Fed toplantısı: ${F.fed.next_meeting}${F.fed.pricing ? ` · ${F.fed.pricing}` : ''}` : null };
  }
  return {};
}
export const chainHTML = (c) => (c?.length ? `<div class="cause">${c.map((x, i) => `${i ? '<span class="arr">→</span>' : ''}<span class="step">${esc(x)}</span>`).join('')}</div>` : '');
export const kcardsHTML = (cards) => (cards?.length ? `<div class="kcards">${map(cards, (c) => `<div class="kcard ${c.tone === 'up' || c.tone === 'good' ? 'up' : c.tone === 'down' || c.tone === 'bad' ? 'down' : ''}"><span class="l">${esc(c.label)}</span><span class="v">${esc(c.value)}</span>${c.sub ? `<span class="s">${esc(c.sub)}</span>` : ''}</div>`)}</div>` : '');

/* ---- TradingView ayarları (BIST widget'larda desteklenmiyor) ---- */
export const TV = {
  abd: [
    ['symbol-overview', { symbols: [['S&P 500', 'FOREXCOM:SPXUSD|1D'], ['Nasdaq 100', 'FOREXCOM:NSXUSD|1D'], ['Dow Jones', 'FOREXCOM:DJI|1D']], chartType: 'area', showVolume: false, scalePosition: 'right', dateRanges: ['1d|1', '1m|30', '3m|60', '12m|1D'] }, 380, 'Endeksler'],
    ['stock-heatmap', { dataSource: 'SPX500', grouping: 'sector', blockSize: 'market_cap_basic', blockColor: 'change', hasTopBar: false, isDataSetEnabled: false, isZoomEnabled: true, hasSymbolTooltip: true }, 460, 'S&P 500 ısı haritası'],
  ],
  kripto: [
    ['crypto-coins-heatmap', { dataSource: 'Crypto', blockSize: 'market_cap_calc', blockColor: 'change', hasTopBar: false, isZoomEnabled: true, hasSymbolTooltip: true }, 440, 'Kripto ısı haritası'],
    ['symbol-overview', { symbols: [['Bitcoin', 'BITSTAMP:BTCUSD|1D'], ['Ethereum', 'BITSTAMP:ETHUSD|1D'], ['Solana', 'COINBASE:SOLUSD|1D']], chartType: 'area', scalePosition: 'right', dateRanges: ['1d|1', '1m|30', '3m|60', '12m|1D'] }, 360, 'Fiyat grafikleri'],
  ],
  emtia: [
    ['symbol-overview', { symbols: [['Ons altın', 'OANDA:XAUUSD|1D'], ['USD/TRY', 'FX_IDC:USDTRY|1D'], ['Brent', 'TVC:UKOIL|1D'], ['Gümüş', 'OANDA:XAGUSD|1D'], ['EUR/USD', 'FX:EURUSD|1D']], chartType: 'area', scalePosition: 'right', dateRanges: ['1d|1', '1m|30', '3m|60', '12m|1D'] }, 380, 'Fiyat grafikleri'],
    ['forex-cross-rates', { currencies: ['USD', 'EUR', 'TRY', 'GBP', 'JPY', 'CHF'] }, 300, 'Çapraz kurlar'],
  ],
  dunya: [
    ['symbol-overview', { symbols: [['DAX', 'PEPPERSTONE:GER40|1D'], ['Euro Stoxx 50', 'PEPPERSTONE:EUSTX50|1D'], ['Nikkei 225', 'PEPPERSTONE:JPN225|1D'], ['Hang Seng', 'PEPPERSTONE:HK50|1D']], chartType: 'area', scalePosition: 'right', dateRanges: ['1d|1', '1m|30', '3m|60', '12m|1D'] }, 380, 'Endeksler'],
  ],
  faiz: [
    ['symbol-overview', { symbols: [['ABD 10 yıllık', 'TVC:US10Y|1D'], ['ABD 2 yıllık', 'TVC:US02Y|1D'], ['Dolar endeksi', 'TVC:DXY|1D']], chartType: 'line', scalePosition: 'right', dateRanges: ['1m|30', '3m|60', '12m|1D', '60m|1W'] }, 360, 'Faiz ve dolar'],
  ],
  bist: [],
};
export const NEWS_TV = { abd: 'stock', kripto: 'crypto', emtia: 'forex', dunya: 'stock', faiz: 'forex' };

/* ---- takvim: olay → piyasa eşleşmesi ---- */
export function eventMarkets(title = '', country = '') {
  const t = `${country} ${title}`.toLocaleLowerCase('tr-TR');
  const s = new Set();
  if (/abd|fed|fomc|powell|michigan|tarım dışı|nfp|pce|ism|wall street|tahvil ihalesi|işsizlik başvuru/.test(t)) ['abd', 'faiz', 'emtia', 'kripto'].forEach((x) => s.add(x));
  if (/bilanço|earnings|jpmorgan|nvidia|tesla|apple|microsoft|alphabet|amazon|meta|broadcom/.test(t)) s.add('abd');
  if (/türkiye|tcmb|tüik|bist|ppk/.test(t)) ['bist', 'emtia'].forEach((x) => s.add(x));
  if (/euro|almanya|ecb|avrupa|fransa|ingiltere|boe|stoxx/.test(t)) ['dunya', 'emtia'].forEach((x) => s.add(x));
  if (/japonya|boj|çin|asya|hong kong/.test(t)) s.add('dunya');
  if (/opec|petrol|ham petrol|brent|stok/.test(t)) s.add('emtia');
  if (/bitcoin|kripto|etf|ethereum/.test(t)) s.add('kripto');
  if (/enflasyon|tüfe|üfe|faiz|gsyh|büyüme/.test(t)) s.add('faiz');
  if (/seans|açılış|kapanış/.test(t)) { if (/abd/.test(t)) s.add('abd'); if (/bist/.test(t)) s.add('bist'); if (/avrupa/.test(t)) s.add('dunya'); }
  return [...s];
}

/* ---- senaryo kütüphanesi: veri beklentiden sapınca genelde ne olur (eğitim amaçlı) ---- */
const SC = [
  [/abd.*(tüfe|enflasyon|cpi)|^tüfe.*abd|abd tüfe/i, 'Beklentiden yüksek', 'Fed indirimi uzaklaşır ya da artırım konuşulur; 10 yıllık faiz ve dolar yükselir, Nasdaq 100, altın ve Bitcoin baskılanır, TL ve gelişen piyasalar zorlanır.', 'Beklentiden düşük', 'Faiz indirimi ihtimali artar; faiz ve dolar geriler, teknoloji hisseleri, altın ve Bitcoin rahatlar.'],
  [/pce/i, 'Beklentiden yüksek', "Fed'in hedeflediği enflasyon ölçüsü ısınıyor: faiz ve dolar yükselir, hisseler baskılanır.", 'Beklentiden düşük', 'Fed için rahatlama: faiz geriler, hisse ve altın destek bulur.'],
  [/tarım dışı|nfp|istihdam raporu/i, 'Güçlü gelirse', 'Ekonomi sağlam ama faiz indirimi uzaklaşır: faiz ve dolar yükselir, altın geriler; hisselerde tepki karışık olur.', 'Zayıf gelirse', 'İndirim ihtimali artar: faiz ve dolar düşer, altın yükselir; çok zayıfsa resesyon korkusu hisseleri de aşağı çeker.'],
  [/işsizlik başvuru/i, 'Düşük gelirse', 'İşgücü piyasası sıkı: faize hafif yukarı baskı.', 'Yüksek gelirse', 'Soğuma işareti: faiz ve dolar geriler, indirim beklentisi güçlenir.'],
  [/fed faiz|fomc|faiz kararı.*fed|powell/i, 'Şahin (sıkı) çıkarsa', 'Faiz ve dolar yükselir; Nasdaq, altın ve kripto baskılanır.', 'Güvercin (gevşek) çıkarsa', 'Faiz ve dolar geriler; riskli varlıklar ve altın yükselir.'],
  [/tutanak/i, 'Şahin tonda', 'Yetkililer enflasyondan endişeliyse faiz yükselir, hisseler geriler.', 'Güvercin tonda', 'İndirim tartışması öne çıkarsa faiz geriler, hisseler rahatlar.'],
  [/ism|pmi/i, '50 üstü / beklentiden iyi', 'Büyüme sağlam: döngüsel hisseler ve emtia güçlenir, faiz yükselebilir. Fiyat alt endeksi yüksekse enflasyon kaygısı eklenir.', '50 altı / beklentiden kötü', 'Yavaşlama işareti: faiz geriler, savunmacı hisseler ve altın öne çıkar.'],
  [/michigan|tüketici güveni/i, 'Enflasyon beklentisi yükselirse', 'Fed için kötü haber: faiz yukarı, hisseler aşağı.', 'Güven toparlanırsa', 'Tüketim tarafı için olumlu; etkisi genelde sınırlı.'],
  [/perakende satış/i, 'Güçlü gelirse', 'Tüketici sağlam: büyüme iyi ama faiz baskısı artar.', 'Zayıf gelirse', 'Talep yavaşlıyor: faiz geriler, tüketim hisseleri zayıflar.'],
  [/gsyh|büyüme/i, 'Güçlü gelirse', 'Ekonomi beklenenden hızlı: hisseler ve para birimi desteklenir, faiz yükselebilir.', 'Zayıf gelirse', 'Yavaşlama: faiz indirimi beklentisi artar, para birimi zayıflar.'],
  [/tahvil ihalesi/i, 'Talep zayıf gelirse', 'Yatırımcı daha yüksek getiri istiyor: faiz yükselir, Nasdaq baskılanır.', 'Talep güçlü gelirse', 'Faiz rahatlar, hisselere destek olur.'],
  [/türkiye.*(tüfe|enflasyon)|tüfe.*türkiye|tüik.*tüfe/i, 'Beklentiden düşük', "TCMB'nin indirim alanı genişler: bankalar ve BIST yükselir, TL mevduat getirisi gerileme yoluna girer.", 'Beklentiden yüksek', 'İndirimler gecikebilir: bankalar baskılanır, TL faizleri yüksek kalır.'],
  [/tcmb|ppk|politika faizi/i, 'Beklenenden fazla indirim', 'BIST ve bankalar yükselir; TL üzerinde baskı artabilir.', 'Beklenenden az indirim / sabit', 'TL için olumlu, borsa için kısa vadede hayal kırıklığı.'],
  [/ecb|avrupa merkez/i, 'Şahin çıkarsa', 'Euro güçlenir, Avrupa hisseleri ve tahvilleri baskılanır.', 'Güvercin çıkarsa', 'Euro zayıflar, Avrupa hisseleri desteklenir.'],
  [/euro bölgesi.*(tüfe|enflasyon)|almanya.*(tüfe|enflasyon)/i, 'Beklentiden yüksek', 'ECB faiz artırımı konuşulur: euro yükselir, Avrupa borsaları zayıflar.', 'Beklentiden düşük', 'ECB rahatlar: euro geriler, Avrupa hisseleri desteklenir.'],
  [/çin/i, 'Güçlü gelirse', 'Emtia talebi (bakır, petrol) ve Asya borsaları desteklenir.', 'Zayıf gelirse', 'Emtia ve Asya baskılanır; teşvik beklentisi artar.'],
  [/opec|petrol stok|ham petrol stok/i, 'Arz azalırsa / stok düşerse', 'Petrol yükselir: enflasyon beklentisi ve faiz yukarı.', 'Arz artarsa / stok yükselirse', 'Petrol geriler: enflasyon kaygısı azalır.'],
  [/bilanço|earnings/i, 'Beklentiyi aşarsa', 'Hisse ve sektörü yükselir; büyük teknoloji şirketiyse Nasdaq 100 de etkilenir. Asıl belirleyici gelecek çeyrek tahmini.', 'Iskalarsa', 'Hisse sert düşebilir; rehberlik zayıfsa sektöre yayılır.'],
];
export function scenario(title) {
  const r = SC.find(([re]) => re.test(title));
  return r ? { aT: r[1], a: r[2], bT: r[3], b: r[4] } : null;
}
