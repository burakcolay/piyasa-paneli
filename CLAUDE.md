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

## Yazım kuralları

- Dil Türkçe, sayılar Türk biçimi (`12.395`, `%29,73`, `−0,39%`). Eksi için `−` (U+2212).
- `tone`: `up` (yeşil), `down` (kırmızı), `flat` (gri); tablolarda `good` / `bad` / `flat`. Ton, okuyucu için iyi mi kötü mü olduğuna göre seçilir (ör. enflasyon beklentiden düşükse `good`).
- Sayı alanları (`chg`, `d1`, `w1`, `m1`, `ytd`, `values`, `points[].v`, `curve[].now/m1`, `price`) gerçek sayıdır, metin değil; site biçimlendirir.
- Paragraf içinde sözlük terimine bağlantı: `[[nfp|Tarım dışı istihdamın]]` (id `sozluk.json`'da olmalı).
- Dolgu cümlesi yok. Her cümle bir bilgi ya da bir neden-sonuç taşımalı. Önce ABD, sonra Avrupa/Asya, para/emtia, kısa Türkiye.
- `s7` (Benim okumam) gerçekçi olmalı: en olası senaryo, alternatif, izlenecek tek sinyal. Al/sat tavsiyesi verme.

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
