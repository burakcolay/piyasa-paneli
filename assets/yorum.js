// Şirket verisinin otomatik yorumu. Kural tabanlı: her şirket için, her gün, maliyetsiz.
// Amaç rakamı tekrar etmek değil, ne anlama geldiğini söylemek. Al/sat tavsiyesi yok.
import { n, pctv } from './us.js';

const ago = (L, k, y) => (L.length > y ? L[L.length - 1 - y]?.[k] : null);
const last = (L, k) => L.at(-1)?.[k] ?? null;
const ok = (v) => v != null && isFinite(v);
const p0 = (v) => pctv(v, 0);
const med = (xs) => { const v = xs.filter(ok).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
const fcfOf = (r) => (r.ocf != null ? r.ocf - (r.capex || 0) : null);

// Her bölüm: [{t: 'good'|'bad'|'flat', s: 'cümle'}]
const G = (s) => ({ t: 'good', s }), B = (s) => ({ t: 'bad', s }), N = (s) => ({ t: 'flat', s });

export function yorumla(c, peers = []) {
  const A = c.fin?.annual || [], Q = c.fin?.quarterly || [], M = c.m || {}, R = M.annual || [], T = M.ttm || {}, V = M.val || {}, Gr = M.growth || {};
  const out = { gelir: [], bilanco: [], nakit: [], karlilik: [], borc: [], verimlilik: [], degerleme: [], buyume: [], ortaklar: [], fscore: [], sektor: [] };

  /* ---------- Gelir tablosu ---------- */
  const g1 = Gr.revenue?.y1, g3 = Gr.revenue?.y3;
  if (ok(g1) && ok(g3) && g1 < 0) {
    out.gelir.push(B(`Satışlar son yılda geriledi. Bunun döngüsel bir dip mi yoksa pazar payı kaybı mı olduğu, rakiplerin aynı dönemde ne yaptığına bakılarak anlaşılır.`));
    if (g1 > g3 + 3) out.gelir.push(N(`Yine de düşüş önceki yıllara göre yavaşladı; dibe yaklaşılıyor olabilir.`));
  } else if (ok(g1) && ok(g3)) {
    if (g1 > g3 + 5) out.gelir.push(G(`Satış büyümesi hızlanıyor: son yıl, üç yıllık ortalamasının belirgin üstünde büyüdü. Şirket ya yeni bir ürün döngüsüne girdi ya da talep güçlendi; asıl soru bu hızın kalıcı olup olmadığı.`));
    else if (g1 < g3 - 5) out.gelir.push(B(`Satış büyümesi yavaşlıyor: son yıl, üç yıllık ortalamasının altında kaldı. Piyasa genellikle büyümenin yönüne seviyesinden fazla tepki verir; yavaşlama sürerse değerleme baskı altına girer.`));
    else out.gelir.push(N(`Satışlar son yıllardaki ortalama hızına yakın büyüyor; büyüme hikâyesinde bir kırılma yok.`));
  }
  const gm = last(R, 'grossM'), gm3 = ago(R, 'grossM', 3);
  if (ok(gm) && ok(gm3)) {
    if (gm - gm3 > 2) out.gelir.push(G(`Brüt marj üç yılda genişledi. Bu, şirketin maliyet artışını fiyata yansıtabildiğini ya da daha kârlı ürünlere kaydığını gösterir: fiyatlama gücünün işareti.`));
    else if (gm3 - gm > 2) out.gelir.push(B(`Brüt marj üç yılda daraldı. Ya girdi maliyeti satış fiyatından hızlı arttı ya da rekabet fiyat kırmaya zorluyor; hangisi olduğu marjın sonraki çeyreklerdeki yönünden okunur.`));
  }
  const og = Gr.opinc?.y3;
  if (ok(og) && ok(g3) && g3 > 0) {
    if (og > g3 + 4) out.gelir.push(G(`Faaliyet kârı satışlardan hızlı büyüyor: giderler gelirle aynı hızda artmıyor. Buna faaliyet kaldıracı denir; ölçek büyüdükçe her yeni satışın daha büyük kısmı kâra kalır.`));
    else if (og < g3 - 4) out.gelir.push(B(`Faaliyet kârı satışların gerisinde kalıyor: giderler gelirden hızlı artıyor. Büyüme kârlılığı aşındırarak geliyor.`));
  }
  const rnd = last(R, 'rndPct');
  if (ok(rnd) && rnd > 15) out.gelir.push(N(`Satışların önemli bir kısmı Ar-Ge'ye gidiyor. Bu bugünün kârını düşürür ama geleceğin ürününü finanse eder; teknoloji ve ilaç şirketlerinde rekabet gücünün kaynağıdır.`));
  const tax = T.taxRate;
  if (ok(tax) && (tax < 10 || tax > 30)) out.gelir.push(N(`Efektif vergi oranı olağan aralığın ${tax < 10 ? 'altında' : 'üstünde'}. Bu genellikle tek seferlik vergi kalemlerinden gelir; net kârı yorumlarken faaliyet kârına bakmak daha sağlıklıdır.`));
  if (Q.length >= 8) {
    const yoy = (i) => (Q.at(i)?.revenue && Q.at(i - 4)?.revenue ? (Q.at(i).revenue / Q.at(i - 4).revenue - 1) * 100 : null);
    const a = yoy(-1), b = yoy(-2);
    if (ok(a) && ok(b)) {
      if (a > b + 3) out.gelir.push(G(`Son çeyrekte yıllık büyüme bir önceki çeyreğe göre hızlandı: kısa vadeli ivme yukarı.`));
      else if (a < b - 3) out.gelir.push(B(`Son çeyrekte yıllık büyüme bir önceki çeyreğe göre yavaşladı: kısa vadeli ivme aşağı. Bir sonraki bilançoda şirketin verdiği beklenti bu yüzden önemli.`));
    }
  }

  /* ---------- Bilanço ---------- */
  const nd = T.netDebt, ebitda = T.ebitda, bs = c.fin?.bs || {};
  if (ok(nd)) {
    if (nd < 0) out.bilanco.push(G(`Şirket net nakit pozisyonunda: elindeki nakit ve yatırımlar toplam finansal borcundan fazla. Faiz yükselişlerinden az etkilenir ve geri alım, temettü ya da satın alma için hazır kaynağı var.`));
    else if (ok(ebitda) && ebitda > 0) {
      const x = nd / ebitda;
      if (x > 3) out.bilanco.push(B(`Net borç yıllık FAVÖK'ün üç katından fazla. Bu seviyede faiz giderleri kârı belirgin biçimde yer, faiz yükselişleri ve kötü bir yıl şirketi zorlayabilir.`));
      else if (x > 1.5) out.bilanco.push(N(`Borç yükü orta düzeyde: net borç birkaç yıllık FAVÖK ile kapanabilir. Kâr düşmedikçe sorun değil, ama esneklik alanı sınırlı.`));
      else out.bilanco.push(G(`Net borç FAVÖK'e göre düşük; borç yükü şirketi kısıtlamıyor.`));
    }
  }
  const cr = T.current;
  if (ok(cr)) {
    if (cr < 1) out.bilanco.push(N(`Kısa vadeli yükümlülükler dönen varlıklardan fazla (cari oran 1'in altında). ${ok(T.fcf) && T.fcf > 0 ? 'Güçlü nakit akışı olan büyük şirketlerde bu bilinçli bir tercihtir: tedarikçiye geç, müşteriden erken tahsil ederek işletme sermayesini karşı taraf finanse eder.' : 'Nakit akışı da zayıfsa bu kısa vadeli ödeme gücü için risk işaretidir.'}`));
    else if (cr > 2.5) out.bilanco.push(N(`Dönen varlıklar kısa vadeli borçların çok üzerinde: likidite rahat, hatta atıl nakit biriktiriyor olabilir.`));
  }
  if (ok(bs.goodwill) && bs.assets && bs.goodwill / bs.assets > 0.3) out.bilanco.push(N(`Varlıkların büyük kısmı şerefiye: şirket büyük ölçüde satın almalarla büyümüş. Satın alınan işler beklenen performansı veremezse değer düşüklüğü kaydı kârı bir anda düşürebilir.`));
  if (ok(bs.equity) && bs.equity <= 0) out.bilanco.push(N(`Özkaynak eksi ya da sıfıra yakın. Kârlı şirketlerde bu çoğunlukla yıllarca süren yoğun hisse geri alımından gelir; özkaynak kârlılığı (ROE) bu yüzden anlamsız ölçüde yüksek görünür, ROIC'e bakmak gerekir.`));
  const inv = A.at(-1)?.inv, inv1 = A.at(-2)?.inv, rv = A.at(-1)?.revenue, rv1 = A.at(-2)?.revenue;
  if (ok(inv) && ok(inv1) && inv1 > 0 && rv1) {
    const di = (inv / inv1 - 1) * 100, dr = (rv / rv1 - 1) * 100;
    if (di > dr + 15) out.bilanco.push(B(`Stoklar satışlardan çok daha hızlı arttı. Ürün depoda birikiyor olabilir; bu talebin yavaşladığının ve ileride indirimle eritilecek stok olduğunun erken işareti olabilir.`));
  }
  const rd = last(R, 'recvDays'), rd2 = ago(R, 'recvDays', 2);
  if (ok(rd) && ok(rd2) && rd - rd2 > 10) out.bilanco.push(B(`Müşterilerden tahsilat süresi uzuyor. Şirket satış yapmak için daha uzun vade tanıyor olabilir; satış rakamı güçlü görünse de nakde dönüşü gecikir.`));

  /* ---------- Nakit akışı ---------- */
  const net = A.at(-1)?.net, ocf = A.at(-1)?.ocf;
  if (ok(net) && ok(ocf) && net > 0) {
    const cv = ocf / net;
    if (cv > 1.15) out.nakit.push(G(`Faaliyetlerden gelen nakit net kârdan fazla: kâr kağıt üzerinde değil, kasaya giriyor. Amortisman ve hisse bazlı ödemeler gibi nakit çıkmayan giderler bu farkı yaratır.`));
    else if (cv < 0.8) out.nakit.push(B(`Faaliyet nakit akışı net kârın gerisinde: kârın bir kısmı nakde dönmüyor. Alacak ya da stok artışı, ya da muhasebe kaynaklı kâr olabilir; bu fark sürerse kârın kalitesi sorgulanır.`));
  } else if (ok(net) && net < 0 && ok(ocf) && ocf > 0) out.nakit.push(N(`Şirket muhasebe olarak zarar ediyor ama faaliyetlerinden nakit üretiyor. Fark genellikle hisse bazlı ödemeler ve amortisman gibi nakit çıkmayan giderlerden gelir.`));
  const cx = last(R, 'capexPct'), cx3 = ago(R, 'capexPct', 3);
  if (ok(cx) && ok(cx3) && cx3 > 0 && cx > cx3 * 1.6 && cx > 5) out.nakit.push(N(`Yatırım harcaması satışlara oranla son yıllarda belirgin arttı: şirket bir yatırım döngüsünde (veri merkezi, fabrika, kapasite). Bu bugünün serbest nakdini düşürür; karşılığını gelecekteki satışlarla verip vermeyeceği asıl soru.`));
  else if (ok(cx) && cx < 3) out.nakit.push(G(`İşi büyütmek için az yatırım harcaması gerekiyor: hafif varlıklı bir model. Kârın büyük kısmı serbest nakde dönüşür.`));
  const sbc = T.sbcPct, fcfm = T.fcfM;
  if (ok(sbc) && ok(fcfm) && fcfm > 0 && sbc / fcfm > 0.3) out.nakit.push(B(`Serbest nakdin önemli bir kısmı aslında çalışanlara hisseyle ödenen maaştan geliyor. Bu ödeme nakit çıkışı yaratmadığı için nakit akışını şişirir ama ortakların payını sulandırır; hisse bazlı ödemeyi düşünce gerçek serbest nakit daha düşük.`));
  if (ok(fcfm)) {
    if (fcfm > 25) out.nakit.push(G(`Her 100 dolarlık satışın dörtte birinden fazlası serbest nakit olarak kalıyor: olağanüstü bir nakit üretim gücü.`));
    else if (fcfm < 0) out.nakit.push(B(`Serbest nakit akışı eksi: şirket faaliyet ve yatırımlarını kendi nakdiyle karşılayamıyor, dışarıdan finansmana (borç ya da hisse ihracı) ihtiyaç duyabilir.`));
  }
  const acq = A.slice(-3).reduce((s, r) => s + (r.acq || 0), 0), f3 = A.slice(-3).reduce((s, r) => s + (fcfOf(r) || 0), 0);
  if (f3 > 0 && acq > f3 * 0.5) out.nakit.push(N(`Son üç yılda serbest nakdin büyük kısmı şirket satın almalarına gitti. Büyüme kısmen satın alınıyor; organik büyüme hızını ayrı değerlendirmek gerekir.`));

  /* ---------- Oranlar: kârlılık ---------- */
  const roic = T.roic, roe = T.roe;
  if (ok(roic)) {
    if (roic > 25) out.karlilik.push(G(`Yatırılan sermaye getirisi çok yüksek. İşe koyulan her dolar yüksek kâr üretiyor; bu genellikle rakiplerin kolayca taklit edemediği bir avantajın (marka, ağ etkisi, teknoloji) işaretidir.`));
    else if (roic > 12) out.karlilik.push(G(`Yatırılan sermaye getirisi sermayenin maliyetinin üstünde: şirket büyüdükçe değer yaratıyor.`));
    else if (roic > 0) out.karlilik.push(B(`Yatırılan sermaye getirisi düşük, sermayenin maliyetine yakın ya da altında. Bu durumda büyümek değer yaratmaz; her yeni yatırım ancak kendini kurtarır.`));
    else out.karlilik.push(B(`Yatırılan sermaye henüz kâr üretmiyor: şirket faaliyet zararında.`));
  }
  if (ok(roe) && ok(roic) && roe > roic * 1.6 && roe > 20) out.karlilik.push(N(`Özkaynak kârlılığı, sermaye getirisinin çok üstünde. Fark işin kendisinden değil, borç ve geri alımlarla küçülen özkaynaktan geliyor; şirketin gerçek verimliliğini ROIC daha doğru gösterir.`));
  const om = T.opM, om5 = ago(R, 'opM', 4);
  if (ok(om) && ok(om5)) {
    if (om - om5 > 5) out.karlilik.push(G(`Faaliyet marjı birkaç yıl öncesine göre belirgin yükseldi; şirket aynı satıştan daha fazla kâr çıkarıyor.`));
    else if (om5 - om > 5) out.karlilik.push(B(`Faaliyet marjı birkaç yıl öncesine göre geriledi; kârlılık aşınıyor.`));
  }

  /* ---------- Oranlar: borç ---------- */
  const de = T.debtEq, ic = T.intCover;
  if (ok(ic)) {
    if (ic < 3) out.borc.push(B(`Faaliyet kârı faiz giderini ancak birkaç kez karşılıyor. Kârda bir düşüş ya da faiz artışı borç servisini zorlaştırır.`));
    else if (ic > 15) out.borc.push(G(`Faiz gideri faaliyet kârının yanında çok küçük; borç taşımak şirket için yük değil.`));
  }
  if (ok(de) && de > 2 && !(bs.equity <= 0)) out.borc.push(N(`Finansal borç özkaynağın iki katından fazla: şirket büyük ölçüde borçla finanse ediliyor. Kamu hizmetleri gibi düzenli gelirli sektörlerde olağandır, döngüsel işlerde risklidir.`));
  else if (ok(de) && de < 0.3) out.borc.push(G(`Borç özkaynağa göre düşük: şirket işini büyük ölçüde kendi kaynağıyla finanse ediyor.`));
  if (ok(T.quick) && ok(cr) && cr - T.quick > 0.6) out.borc.push(N(`Dönen varlıkların önemli kısmı stok. Stoklar nakde çevrilmesi en yavaş varlıktır; asit-test oranı gerçek likiditeyi daha iyi gösterir.`));

  /* ---------- Oranlar: verimlilik ---------- */
  const it = last(R, 'invTurn'), it3 = ago(R, 'invTurn', 3);
  if (ok(it) && ok(it3)) {
    if (it < it3 * 0.8) out.verimlilik.push(B(`Stok devir hızı yavaşladı: ürünler depoda daha uzun bekliyor.`));
    else if (it > it3 * 1.2) out.verimlilik.push(G(`Stok devir hızı arttı: şirket stoğunu daha hızlı satıyor.`));
  }
  if (ok(sbc) && sbc > 10) out.verimlilik.push(B(`Hisse bazlı ödemeler satışların büyük bir kısmına denk geliyor. Bu gerçek bir maliyettir: her yıl yeni hisse basılır ve mevcut ortakların payı küçülür.`));
  if (ok(T.payout) && T.payout > 90) out.verimlilik.push(N(`Kârın neredeyse tamamı temettü olarak dağıtılıyor. Kâr düşerse temettüyü korumak zorlaşır.`));

  /* ---------- Değerleme ---------- */
  const pe = c.val?.pe, eg = Gr.eps?.y3 ?? Gr.net?.y3, fy = V.fcfYield;
  if (ok(pe) && pe > 0) {
    if (ok(eg) && eg > 0) {
      const peg = pe / eg;
      if (peg < 1) out.degerleme.push(G(`F/K oranı, şirketin son yıllardaki kâr büyümesine göre düşük. Piyasa ya bu büyümenin süreceğine inanmıyor ya da şirketi gözden kaçırıyor; hangisi olduğu büyümenin devamından anlaşılır.`));
      else if (peg > 2.5) out.degerleme.push(B(`F/K oranı, son yılların kâr büyümesine göre yüksek. Fiyat, büyümenin geçmişten daha hızlı olacağı beklentisini içeriyor; beklentinin altında kalan bir bilanço sert tepki doğurabilir.`));
      else out.degerleme.push(N(`F/K oranı kâr büyümesiyle kabaca uyumlu; fiyat ne aşırı iyimser ne aşırı karamsar.`));
    } else if (pe > 30) out.degerleme.push(B(`Kâr son yıllarda büyümemesine rağmen F/K yüksek: fiyat bir toparlanma ya da yeni bir büyüme dönemi bekliyor.`));
  } else if (ok(c.fin?.ttm?.net) && c.fin.ttm.net < 0) out.degerleme.push(N(`Şirket zarar ettiği için F/K anlamsız. Değerleme satış çarpanı (F/S) ve kâra geçme süresi üzerinden yapılır.`));
  if (ok(fy)) {
    if (fy < 2) out.degerleme.push(N(`Serbest nakit verimi düşük: bugünkü fiyattan alan biri, hazine tahvilinin verdiğinden çok daha az nakit getiriyle başlıyor. Bu fark ancak nakdin hızla büyümesiyle kapanır; fiyat bu büyümeyi peşin içeriyor.`));
    else if (fy > 6) out.degerleme.push(G(`Serbest nakit verimi yüksek: şirket piyasa değerine göre bol nakit üretiyor. Piyasa ya büyüme beklemiyor ya da bir risk fiyatlıyor.`));
  }
  if (ok(V.pb) && V.pb > 15 && !(bs.equity <= 0)) out.degerleme.push(N(`Piyasa değeri defter değerinin çok üstünde. Değerin çoğu bilançoda görünmeyen varlıklardan (marka, yazılım, ağ etkisi) geliyor; bu tür şirketlerde PD/DD yerine nakit akışına bakılır.`));

  /* ---------- Büyüme ---------- */
  const rev = A.map((r) => r.revenue).filter(ok);
  if (rev.length >= 6) {
    const ups = rev.slice(-6).reduce((s, v, i, a) => s + (i && v > a[i - 1] ? 1 : 0), 0);
    if (ups === 5) out.buyume.push(G(`Satışlar son beş yılın her birinde arttı: istikrarlı bir büyüme geçmişi. Bu tür şirketlerde tek bir zayıf çeyrek piyasada sert karşılanır, çünkü istikrar fiyatın bir parçası.`));
    else if (ups <= 2) out.buyume.push(B(`Satışlar son beş yılın çoğunda artmadı: büyüme düzensiz ya da döngüsel. Değerlemeyi tek bir iyi yıl üzerine kurmak yanıltıcı olur.`));
  }
  const e3 = Gr.eps?.y3, n3 = Gr.net?.y3;
  if (ok(e3) && ok(n3) && e3 - n3 > 2) out.buyume.push(G(`Hisse başı kâr, toplam kârdan hızlı büyüyor. Fark geri alımlardan geliyor: hisse sayısı azaldıkça kalan her hisseye daha büyük kâr düşüyor.`));
  else if (ok(e3) && ok(n3) && n3 - e3 > 2) out.buyume.push(B(`Toplam kâr, hisse başı kârdan hızlı büyüyor: hisse sayısı artıyor ve büyümenin bir kısmı yeni hisselere gidiyor.`));
  const fg = Gr.fcf?.y3;
  if (ok(fg) && ok(g3) && fg < g3 - 10) out.buyume.push(N(`Serbest nakit satışlardan yavaş büyüyor; büyümenin bedeli yatırım harcaması ya da işletme sermayesi olarak ödeniyor.`));

  /* ---------- Ortaklar ---------- */
  const sh = A.filter((r) => ok(r.shDil)), shc = sh.length > 3 ? (sh.at(-1).shDil / sh.at(-4).shDil - 1) * 100 : null;
  const by = V.buybackYield, dy = V.divYield;
  if (ok(shc)) {
    if (shc < -4) out.ortaklar.push(G(`Hisse sayısı üç yılda belirgin azaldı: şirket nakdinin bir kısmını kendi hissesini geri almaya kullanıyor. Ortakların şirketteki payı kendiliğinden büyüyor.`));
    else if (shc > 5) out.ortaklar.push(B(`Hisse sayısı üç yılda arttı: hisse bazlı ödemeler ya da yeni ihraç ortakların payını sulandırıyor.`));
  }
  if (ok(by) || ok(dy)) {
    const tot = (by || 0) + (dy || 0);
    if (tot > 3) out.ortaklar.push(G(`Geri alım ve temettü birlikte piyasa değerine göre anlamlı bir getiri sağlıyor; şirket ürettiği nakdi ortaklarına geri veriyor.`));
    else if (tot < 0.5) out.ortaklar.push(N(`Ortaklara neredeyse hiç nakit dönmüyor; şirket nakdini büyümeye yatırıyor. Bu, yatırımların yüksek getiri ürettiği sürece doğru tercihtir.`));
  }
  if (ok(T.payout) && T.payout > 0 && ok(fcfm) && fcfm > 0 && T.payout < 40) out.ortaklar.push(G(`Temettü kârın küçük bir kısmı; kâr düşse bile temettüyü sürdürme alanı geniş.`));

  /* ---------- F-skoru ---------- */
  const F = M.fscore;
  if (F) {
    const bad = F.items.filter((x) => x.ok === false).map((x) => x.label.toLocaleLowerCase('tr'));
    const r = F.score / F.n;
    out.fscore.push(r >= 0.7 ? G(`Kontrollerin büyük çoğunluğu olumlu: kârlılık, borç ve verimlilik bir önceki yıla göre iyileşmiş.`) : r <= 0.35 ? B(`Kontrollerin çoğu olumsuz: şirketin finansal durumu bir önceki yıla göre zayıflamış.`) : N(`Karışık bir tablo: bazı göstergeler iyileşirken bazıları kötüleşmiş.`));
    if (bad.length && bad.length <= 4) out.fscore.push(N(`Olumsuz kalan maddeler: ${bad.join(', ')}.`));
    out.fscore.push(N(`F-skoru büyük ve hızlı büyüyen şirketlerde yanıltıcı olabilir (ör. yatırım döngüsünde varlık devir hızı düşer); tek başına değil, diğer bölümlerle birlikte okunmalı.`));
  }

  /* ---------- Sektör ---------- */
  if (peers.length >= 3) {
    const me = peers.find((r) => r.t === c.t) || {};
    const mPe = med(peers.map((r) => (r.pe > 0 ? r.pe : null))), mRoic = med(peers.map((r) => r.roic)), mG = med(peers.map((r) => r.revGrowth)), mOm = med(peers.map((r) => r.opMargin));
    const pricier = ok(me.pe) && ok(mPe) && me.pe > 0 ? me.pe / mPe : null;
    const better = [ok(me.roic) && ok(mRoic) && me.roic > mRoic, ok(me.revGrowth) && ok(mG) && me.revGrowth > mG, ok(me.opMargin) && ok(mOm) && me.opMargin > mOm].filter(Boolean).length;
    if (pricier != null) {
      if (pricier > 1.25 && better >= 2) out.sektor.push(N(`Sektörüne göre pahalı fiyatlanıyor, ama kârlılık ve büyümede de sektörün önünde. Piyasa bu üstünlüğe prim ödüyor; prim, üstünlük sürdükçe haklıdır.`));
      else if (pricier > 1.25) out.sektor.push(B(`Sektörüne göre pahalı fiyatlanıyor ama kârlılık ve büyümede sektörün belirgin önünde değil. Prim, veriden çok beklentiye dayanıyor.`));
      else if (pricier < 0.8 && better >= 2) out.sektor.push(G(`Sektörüne göre ucuz fiyatlanıyor, oysa kârlılık ve büyümede sektörün önünde. Ya piyasanın gördüğü bir risk var ya da fiyat temelleri geriden takip ediyor.`));
      else if (pricier < 0.8) out.sektor.push(N(`Sektörüne göre ucuz fiyatlanıyor; kârlılık ve büyümesi de sektör ortalamasının altında. İskonto temellerle uyumlu.`));
      else out.sektor.push(N(`Değerlemesi sektörün ortasında; ${better >= 2 ? 'kalite olarak sektörün önünde.' : better === 0 ? 'kalite olarak sektörün gerisinde.' : 'kalite olarak sektöre benzer.'}`));
    }
  }

  // Hiçbir kural tetiklenmediyse kısa bir nötr okuma
  if (!out.borc.length && ok(de)) out.borc.push(N(`Borç seviyesi ılımlı: şirketin finansmanında borç ve özkaynak dengeli, borç tek başına bir risk ya da avantaj oluşturmuyor.`));
  if (!out.bilanco.length && ok(bs.assets)) out.bilanco.push(N(`Bilançoda öne çıkan bir risk ya da olağandışı kalem yok.`));
  if (!out.nakit.length && ok(fcfm)) out.nakit.push(N(`Nakit üretimi ve yatırım harcaması olağan seviyelerde; nakit akışında öne çıkan bir sapma yok.`));
  if (!out.gelir.length && ok(gm)) out.gelir.push(N(`Gelir tablosunda büyüme ve marjlar son yılların çizgisinde; belirgin bir hızlanma ya da bozulma yok.`));
  if (!out.degerleme.length && ok(pe)) out.degerleme.push(N(`Değerleme çarpanları olağan aralıkta; fiyat, şirketin geçmiş performansından belirgin biçimde kopmuş görünmüyor.`));

  // Özet: en güçlü ve en zayıf yanlar
  // her bölümden en fazla bir madde, sırayla
  const secs = [out.karlilik, out.gelir, out.nakit, out.bilanco, out.degerleme, out.buyume, out.borc, out.ortaklar, out.verimlilik];
  const pickTop = (t) => { const r = []; for (let round = 0; round < 3 && r.length < 3; round++) for (const s of secs) { const x = s.filter((y) => y.t === t)[round]; if (x && r.length < 3) r.push(x); } return r; };
  out.ozet = { good: pickTop('good'), bad: pickTop('bad') };
  return out;
}

// HTML kutusu
export function yorumBox(list, title = 'Ne anlatıyor?') {
  if (!list?.length) return '';
  return `<section class="card yorum"><span class="eyebrow accent">${title}</span><ul>${list.map((x) => `<li class="${x.t}">${x.s}</li>`).join('')}</ul></section>`;
}
