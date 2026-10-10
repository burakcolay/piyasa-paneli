<div align="center">

# Market Intelligence

**Her sabah kendiliğinden yazılan, rakamı değil anlamını anlatan kişisel piyasa paneli.**

ABD · Avrupa ve Asya · Faiz ve Fed · Makro veriler · Kripto · Türkiye · ABD hisseleri

![Statik site](https://img.shields.io/badge/site-statik%20HTML%20%2B%20JS-173A5E)
![Derleme yok](https://img.shields.io/badge/derleme-yok-0E7A4F)
![Vercel](https://img.shields.io/badge/yayın-Vercel-000000)
![Veri](https://img.shields.io/badge/veri-JSON-6B5BD2)
![Dil](https://img.shields.io/badge/dil-Türkçe-C2362B)

<img src="docs/panel.png" alt="Ana sayfa: günün özeti ve canlı fiyat şeridi" width="900">

</div>

---

## Ne yapar?

Her sabah bir Claude rutini piyasa verilerini toplar, Türkçe bir analiz yazar, `data/` klasörüne JSON olarak kaydeder ve bu repoya gönderir. Vercel siteyi kendiliğinden yeniler. Ben sadece açıp okuyorum.

Yazıların tek bir kuralı var: **rakamı tekrar etme, ne anlama geldiğini anlat.** Rakamlar zaten şeritte ve kartlarda duruyor. Paragraflar şunu sorar: ne oldu, neden oldu, bu neyi etkiliyor, dünkü okumamız tuttu mu, bundan sonra neye bakmalı.

| | |
|---|---|
| **Günlük özet** | Günün manşeti, büyük resim ve 9 bölümlük okuma: ABD, NQ için makro rüzgâr, Avrupa-Asya, para-faiz-emtia, Türkiye, takvim, "benim okumam", günün dersi |
| **Neden-sonuç zinciri** | Her bölümün hikâyesi 3-6 adımda: *Petrol geriledi → Enflasyon beklentisi azaldı → 10Y faiz döndü → Teknoloji yükseldi* |
| **NQ için makro rüzgâr** | Makronun Nasdaq 100'e etkisi: destek / nötr / engel, oynaklık saatleri (TSİ), bilanço takvimi. Al-sat sinyali vermez |
| **İki görüş** | Günün tartışma konusunda boğa ve ayı tarafı, kaynaklarıyla |
| **Faiz ve Fed** | Getiri eğrisi (bugün ve 1 ay önce), Fed fiyatlaması, konuşmacılar |
| **Makro veriler** | Son 7 günün sürprizleri ve "veriler birlikte ne söylüyor" yorumu; ABD, Euro Bölgesi, Türkiye, Japonya, Çin grafikleri |
| **Kripto** | Korku-açgözlülük, dominans, ETF akışları, seviye haritası |
| **Türkiye** | BIST 100, sektörler, TÜFE, tahvil eğrisi, TCMB |
| **Haftalık özet ve derin konu** | Cuma haftanın özeti, cumartesi haftanın en önemli olayının uzun anlatımı ve döngü analizi |
| **Sözlük** | Her günün dersi buraya eklenir; yazıdaki terimler sözlüğe bağlanır |
| **Canlı fiyatlar** | Üst şerit ve kartlar sayfa açıkken dakikada bir güncellenir |

<div align="center">
<img src="docs/makro.png" alt="Makro veriler: sürprizler ve yorum" width="900">
</div>

## ABD hisseleri

Fintables benzeri bir ABD borsası bölümü, şimdilik **Nasdaq 100** şirketleri. Tüm veri resmi ve ücretsiz kaynaklardan gelir.

- **Liste:** piyasa değeri, F/K, F/S, büyüme, net marj ve serbest nakit verimiyle sıralanabilir. Hazır filtreler: hızlı büyüyen, düşük F/K, yüksek marj, zarar eden.
- **Şirket sayfası:** ne iş yaptığı (Türkçe), 12 çeyrek ve 10 yıllık finansallar, SEC açıklamaları, Buffett, Dalio, Ackman gibi büyük fonların pozisyonları ve yönetici alım satımları.

<div align="center">
<img src="docs/hisseler.png" alt="ABD hisseleri listesi" width="900">
<br><br>
<img src="docs/sirket.png" alt="Şirket sayfası" width="900">
</div>

## Nasıl çalışır?

```mermaid
flowchart LR
    A[Claude rutini<br/>her sabah] -->|Bigdata.com, Borsa MCP| B[data/daily/*.json]
    G[GitHub Actions<br/>her gece] -->|SEC EDGAR, fiyat| H[data/us/*.json]
    B --> C[(Bu repo)]
    H --> C
    C -->|push| D[Vercel]
    D --> E[Site]
    F[/api/live/] -->|canlı fiyat| E
```

- **Derleme adımı yok.** Düz HTML, CSS ve JavaScript modülleri. Sayfalar açılınca JSON'u okuyup kendini çizer.
- **Rutin sadece veri yazar.** HTML ve JS'ye dokunmaz; tüm kurallar ve şema [CLAUDE.md](CLAUDE.md) içinde.
- **Her commit doğrulanır.** `node scripts/validate.mjs` geçmeden hiçbir şey gönderilmez.
- **ABD verisi GitHub Actions'ta çekilir:** hafta içi gece fiyat, açıklama ve yönetici işlemleri; cumartesi finansallar dahil tam güncelleme ([`scripts/us/build.mjs`](scripts/us/build.mjs)).

## Klasör yapısı

```
index.html … sozluk.html     panel sayfaları (hisseler, sirket dahil)
assets/app.js                ortak: veri yükleme, menü, biçimlendirme
assets/charts.js             SVG grafikler (kütüphane yok)
assets/pages/*.js            her sayfanın çizimi
api/live.js                  canlı fiyat (Vercel fonksiyonu)
data/daily/YYYY-MM-DD.json   günlük veri ve yorum
data/weekly/YYYY-Www.json    haftalık özet ve derin konu
data/sozluk.json             kavramlar
data/companies.json          büyük teknoloji şirketlerinin bilanço kartları
data/us/                     ABD hisseleri: liste, şirketler, 13F, Türkçe metinler
scripts/validate.mjs         veri kontrolü
scripts/us/build.mjs         SEC + fiyat çekici
```

## Yerelde çalıştırma

```bash
python3 -m http.server 8000      # http://localhost:8000
node scripts/validate.mjs        # veriyi kontrol et
node scripts/us/build.mjs all    # ABD verisini çek (internet gerekir)
```

<details>
<summary><b>Mobil görünüm</b></summary>
<br>
<img src="docs/mobil.png" alt="Mobil görünüm" width="320">
</details>

## Kaynaklar

| Veri | Kaynak |
|---|---|
| Piyasa, haber, ekonomik takvim | [Bigdata.com](https://bigdata.com) |
| BIST, TCMB, Türkiye tahvilleri | Borsa MCP (~15 dk gecikmeli) |
| ABD şirket finansalları, açıklamalar, 13F, Form 4 | [SEC EDGAR](https://www.sec.gov/edgar) (kamu verisi) |
| Canlı fiyatlar | CNBC, CoinGecko, alternative.me |
| Hisse grafikleri | TradingView ücretsiz widget'ları |

---

<sub>Kişisel kullanım için hazırlanmıştır. İçerik genel piyasa değerlendirmesidir, **yatırım tavsiyesi değildir.** Üçüncü taraf verilerin doğruluğu garanti edilmez.</sub>
