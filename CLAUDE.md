# Piyasa Paneli

Burak'ın kişisel günlük piyasa paneli. Statik site (derleme adımı yok), Vercel'de yayında.
Sayfalar `data/` altındaki JSON dosyalarını okuyup kendini çizer. **Günlük rutin sadece JSON yazar; HTML/JS'ye dokunmaz.**

## Dosya düzeni

```
index.html, faizler.html, kuresel.html, kripto.html, turkiye.html, makro.html, haftalik.html, sozluk.html
assets/app.js        ortak: veri yükleme, menü, biçimlendirme
assets/charts.js     SVG grafikler
assets/pages/*.js    her sayfanın çizimi
data/latest.json     { "date": "YYYY-MM-DD", "week": "YYYY-Www" }  -> sitenin gösterdiği gün ve hafta
data/daily/index.json      tüm günlerin listesi (eski günler arşivden seçilebilir)
data/daily/YYYY-MM-DD.json günlük veri + yorum (ŞEMA: aşağıda, örnek: data/daily/2026-10-06.json)
data/weekly/index.json     [{ id, label, title }]
data/weekly/YYYY-Www.json  haftalık özet (sadece cuma)
data/sozluk.json           kavramlar; her yeni "günün dersi" buraya da eklenir
scripts/validate.mjs       veri kontrolü
```

## Günlük rutinin yapacağı iş

1. Verileri araçlardan çek (Bigdata.com: piyasa/ekonomik takvim/haber; Borsa MCP: BIST, TCMB, TR tahvil). Borsa MCP'yi **sırayla** çağır, aynı anda çok çağrı 429 hatası verir; hata olursa birkaç saniye bekleyip bir kez tekrar dene.
2. Bir önceki günün dosyasını şablon olarak kopyala, `data/daily/<bugün>.json` olarak yaz. Rakamları araç çıktısından al, tahmin etme. Bulunamayan değer için `"—"` (metin) veya `null` (sayı) kullan.
3. `data/daily/index.json` listesine bugünü ekle, `data/latest.json`'daki `date`'i güncelle.
4. `s8.concept` yeni bir kavramsa `data/sozluk.json`'a ekle (aynı alanlar: name, cat, learned, def, analogy, chain[], quote, rule, related[]).
5. Cuma günleri: `data/weekly/<hafta>.json` yaz, `weekly/index.json`'a ekle, `latest.json`'daki `week`'i güncelle.
6. `node scripts/validate.mjs` çalıştır. Hata varsa düzelt, tekrar çalıştır. Geçmeden commit yapma.
7. `main` dalına commit + push. Mesaj: `veri: YYYY-MM-DD`.

## Commit yazarı (Vercel için zorunlu)

Vercel Hobby planı, özel repoda sadece hesap sahibinin yazdığı commit'leri yayına alır. Claude ya da bot adına atılan commit'ler "blocked" olur ve site yenilenmez. Bu yüzden her commit Burak adına atılır:

```
git -c user.name="Burak Colay" -c user.email="170448628+burakcolay@users.noreply.github.com" commit -m "veri: YYYY-MM-DD"
```

Doğrudan `main`'e push et. Ayrı dala atıp merge commit ile birleştirme; merge commit'in yazarı bot olur ve yine bloklanır.

## Yazım kuralları

- Nasdaq her yerde **Nasdaq 100** (^NDX, Burak'ın takip ettiği NQ vadelisinin endeksi) olarak yazılır; Nasdaq Bileşik (^IXIC) kullanma. Şeritteki adı `Nasdaq 100`.
- Kripto coin tablosu sadece BTC, ETH, BNB, SOL. XRP, ADA, DOGE, LINK, AVAX, LTC ekleme (Burak çıkardı).
- Gösterge adlarını değiştirme (`S&P 500`, `Nasdaq 100`, `BIST 100`, `USD/TRY`, `Ons altın`, `Gram altın`, `Brent`, `BTC`, `TOTAL`, `BTC.D` vb.): site canlı fiyatı bu adlardan eşleştiriyor.
- Fiyatlar rutinin çalıştığı andaki anlık değerdir; `updated` alanına o saati yaz.
- Dil Türkçe, sayılar Türk biçimi (`12.395`, `%29,73`, `−0,39%`). Eksi için `−` (U+2212).
- `tone`: `up` (yeşil), `down` (kırmızı), `flat` (gri); tablolarda `good` / `bad` / `flat`. Ton, okuyucu için iyi mi kötü mü olduğuna göre seçilir (ör. enflasyon beklentiden düşükse `good`).
- Sayı alanları (`chg`, `d1`, `w1`, `m1`, `ytd`, `values`, `points[].v`, `curve[].now/m1`, `price`) gerçek sayıdır, metin değil; site biçimlendirir.
- Paragraf içinde sözlük terimine bağlantı: `[[nfp|Tarım dışı istihdamın]]` (id `sozluk.json`'da olmalı).
- Dolgu cümlesi yok. Önce ABD, sonra Avrupa/Asya, para/emtia, kısa Türkiye.
- `s7` (Benim okumam) gerçekçi olmalı: en olası senaryo, alternatif, izlenecek tek sinyal. Al/sat tavsiyesi verme.

## Yorum nasıl yazılır (en önemli kural)

Burak rakamları şeritte, kartlarda ve tablolarda zaten görüyor; bir iki kez görünce aklında kalıyor. Yazının işi rakamı tekrar etmek değil, **rakamın ne anlama geldiğini** anlatmak. Burak bu metni kendine sesli anlatarak öğreniyor.

**Rakam kuralı**
- Paragraf başına en fazla 1-2 rakam, o da sadece anlatının dayanağıysa: bir eşik (%5 faiz), bir rekor, beklentiden büyük bir sapma.
- "S&P %0,5, Nasdaq %0,6 arttı, Dow %0,4..." gibi sıralamalar yasak. Hareketi kelimeyle söyle: "teknoloji öncülüğünde yükseldi", "sert düştü", "yatay".
- Aynı rakamı iki bölümde tekrarlama.

**Her bölüm şu sırayla düşünülür**
1. **Ne oldu?** Tek cümle, rakamsız ya da tek rakamla.
2. **Neden oldu?** Asıl sebep ve arkasındaki mekanizma: kim alıyor, kim satıyor, neyi fiyatlıyorlar.
3. **Zincir:** Bu hareket başka neyi etkiliyor? (petrol → enflasyon beklentisi → faiz → teknoloji hisseleri → gelişen piyasalar ve TL)
4. **Dünle kıyas:** Dünkü okumamızı teyit etti mi, çürüttü mü? Hikâye değişiyor mu?
5. **Piyasa ne bekliyor, sen ne görüyorsun:** Fiyatlanan senaryo ile riskler arasındaki fark. Belirsizse açıkça "belirsiz" de.
6. **Bundan sonra neye bakmalı:** Bu hikâyeyi bozacak ya da güçlendirecek tek şey.

**Örnek**

Kötü (rakam sıralaması):
> Wall Street teknoloji öncülüğünde yükseldi: S&P 500 %0,5, Nasdaq %0,6 arttı; Nasdaq pazartesi rekor kapanışı yaptı. Hisseler 10 yıllık faizin 24 yılın zirvesinde olmasına rağmen yükseliyor, çünkü şirket kârları çeyreklik %25'in üzerinde büyüyor.

İyi (yorum):
> Wall Street'te yükselişi yine teknoloji taşıdı ve Nasdaq rekor tazeledi. Asıl dikkat çekici olan, bunun tahvil faizleri çeyrek asrın zirvesindeyken olması. Normalde bu kadar yüksek faiz hisseleri aşağı çeker, çünkü gelecekteki kârın bugünkü değerini düşürür. Şu an bu çekimi kârların güçlü büyümesi dengeliyor; yatırımcı "faiz yüksek ama kâr daha hızlı artıyor" diye düşünüyor. Bu denge kırılgan: kâr büyümesinin yavaşladığı ilk çeyrekte faizin baskısı birden hissedilir. Bu yüzden önümüzdeki bilanço sezonunda kârın kendisinden çok şirketlerin gelecek çeyrek beklentilerine bakmak gerekiyor.

Bu kural `summary`, `s1`-`s7` paragrafları, `turkiye.reading`, `kripto.reading` ve tüm `*_note` alanları için geçerli. Kart ve tablolar (`cards`, `kpis`, `tickers`, `macro`, tablolar) rakam taşımaya devam eder.

## Günlük JSON şeması (özet)

| Alan | İçerik |
|---|---|
| `date`, `updated` | `"2026-10-06"`, `"09:00"` |
| `tickers[]` | `{name, value, chg, tone}` üst şerit, 10 gösterge |
| `summary` | `{headline, lede, paragraphs[], read_min}` Claude'un günlük özeti |
| `s1` | `{mood: risk_off|temkinli|risk_on, mood_note, changes[{tag, tone: same|good|bad|new, text}], themes[3]{title,text}}` |
| `s2` | `{paragraphs[], sectors[{name, chg}]}` ABD + S&P sektörleri |
| `s3`, `s4`, `s5` | `{cards[{label, value, sub, tone}], paragraphs[]}` Avrupa-Asya / para-faiz-emtia / Türkiye |
| `s6` | `{paragraph, today[{time "SS:DD", title, detail, impact: high|mid|low|session}], week[{when,title,expect}], earnings[{ticker,when}]}` |
| `s7` | `{likely, alternative, signal}` |
| `s8` | `{concept, title, paragraphs[], rule}` günün dersi |
| `news[]` | `{date, region, title, why}` |
| `faizler` | `{kpis[], curve[{tenor, now, m1}], curve_note, fed{rate, rate_note, next_meeting, pricing, paragraph}, speakers[{when, who}]}` |
| `kuresel` | `{groups[{name, unit: pct|bp, rows[{name, d1, w1, m1, ytd}]}], note}` |
| `turkiye` | `{kpis[], reading{headline, paragraphs[]}, bist{title, change_label, tone, highlight?{from, label}, points[{d, v}]}, sectors[{name, chg}], sectors_note, cpi{last, labels[], values[], note}, rates{policy, bonds[{tenor, v}], cards[], note}, macro[{name, period, actual, cons, prev, note, tone}], upcoming[{when, name}], lesson{title, paragraphs[], rule}, source}` |
| `kripto` | `{kpis[{code,label,value,sub,tone}], fng{now, yesterday, week}, reading{}, dominance{total_label, btc, usdt, total2_label}, dom_cards[{code,text}], levels{range[lo,hi], zone[a,b], items[{name, price, label, kind: past|support|now|resistance|ref|target}], note}, etf[{label, v (milyar $), text}], etf_note, coins[{sym, name, price, d1, w1, m1, m3, ytd, y1}], coins_note, institutional[{v,title,note}], drivers[{tag, tone, title, note}], lesson{}}` |
| `makro` | `{surprises[{name, actual, cons, prev, verdict, tone, meta}], surprises_note, countries{"ABD"|"Euro Bölgesi"|"Türkiye"|"Japonya"|"Çin": {charts[{type: bar|line, title, sub, unit, target?, target_label?, labels[], values[], last, trend, tone, note, prev, next}], rows[{group} | {name, period, actual, cons, prev, surprise, tone, next}], note}}, upcoming[{when, country, name, impact, cons, prev}]}` |
| `sources` | kaynak notu |

Tam örnek her zaman en son günün dosyasıdır.

## Yerelde deneme

```
python3 -m http.server 8000   # sonra http://localhost:8000
node scripts/validate.mjs
```
