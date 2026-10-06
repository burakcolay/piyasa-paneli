# Piyasa Paneli

Kişisel günlük piyasa paneli: ABD, Avrupa/Asya, faizler, emtia, kripto ve Türkiye.
Her sabah bir Claude rutini verileri toplar, `data/` altına JSON olarak yazar ve bu repoya gönderir; Vercel siteyi kendiliğinden yeniler.

- Derleme adımı yok: düz HTML + JavaScript modülleri.
- Veri şeması ve rutinin kuralları: [CLAUDE.md](CLAUDE.md)
- Kontrol: `node scripts/validate.mjs`

Veriler kişisel kullanım içindir (BIST verisi ~15 dk gecikmeli, üçüncü taraf kaynak). Site herkese açık paylaşılmamalıdır. Yatırım tavsiyesi değildir.
