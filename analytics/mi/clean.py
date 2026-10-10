"""Fiyat verisini temizler ve kalite raporu üretir.

Kurallar (her biri testlerde doğrulanır):
1. Tarih biçimi düzeltilir, aynı gün tekrarı varsa sonuncusu tutulur, sıralanır.
2. Kapanışı boş, sıfır ya da negatif olan satırlar atılır.
3. Tek günlük hatalı fiyat (sıçrayıp ertesi gün geri dönen) işaretlenir ve komşu günlerden doldurulur.
4. Varlıklar ortak işlem takvimine (Nasdaq 100 günleri) hizalanır; en fazla 3 günlük boşluk ileri doldurulur.
"""
from __future__ import annotations

import pandas as pd

from .config import BENCHMARK, PRICE_DIR

SPIKE = 0.40       # tek günde %40 üstü hareket
REVERT = 0.25      # ertesi gün %25 üstü ters hareket -> hatalı fiyat sayılır
MAX_FILL = 3


def clean_one(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Tek varlığın fiyat tablosunu temizler. Dönüş: (temiz tablo, kalite notu)."""
    q = {"raw_rows": len(df)}
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date"]).sort_values("date").drop_duplicates("date", keep="last")
    q["dupes_or_bad_dates"] = q["raw_rows"] - len(df)
    bad = df["close"].isna() | (df["close"] <= 0)
    q["bad_close"] = int(bad.sum())
    df = df[~bad].copy()
    r = df["close"].pct_change()
    spike = (r.abs() > SPIKE) & ((r.shift(-1) * r) < 0) & (r.shift(-1).abs() > REVERT)
    q["spikes_fixed"] = int(spike.sum())
    if spike.any():
        df.loc[spike, ["open", "high", "low", "close"]] = None
        df[["open", "high", "low", "close"]] = df[["open", "high", "low", "close"]].interpolate(limit=1)
    df["volume"] = df["volume"].fillna(0)
    df = df.set_index("date")
    q["rows"] = len(df)
    q["first"] = df.index.min().strftime("%Y-%m-%d") if len(df) else None
    q["last"] = df.index.max().strftime("%Y-%m-%d") if len(df) else None
    return df, q


def load_prices() -> tuple[pd.DataFrame, dict]:
    """Tüm CSV'leri okur, temizler, ortak takvime hizalar.

    Dönüş: uzun tablo (code, date, open, high, low, close, volume, ret) ve kalite raporu.
    """
    frames, quality = {}, {}
    for p in sorted(PRICE_DIR.glob("*.csv")):
        df, q = clean_one(pd.read_csv(p))
        if len(df) > 20:
            frames[p.stem] = df
        quality[p.stem] = q
    if BENCHMARK not in frames:
        raise RuntimeError("Referans endeks (NDX) verisi yok; takvim kurulamıyor.")
    cal = frames[BENCHMARK].index
    out = []
    for code, df in frames.items():
        a = df.reindex(cal)
        missing = a["close"].isna()
        # sadece kısa boşlukları doldur (tatil farkı); uzun boşluk = varlık o tarihte yoktu
        a[["open", "high", "low", "close"]] = a[["open", "high", "low", "close"]].ffill(limit=MAX_FILL)
        a["volume"] = a["volume"].fillna(0)
        filled = int((missing & a["close"].notna()).sum())
        quality[code]["calendar_filled"] = filled
        a = a.dropna(subset=["close"])
        a["ret"] = a["close"].pct_change()
        a["code"] = code
        out.append(a.reset_index(names="date"))
    long = pd.concat(out, ignore_index=True)
    return long[["code", "date", "open", "high", "low", "close", "volume", "ret"]], quality
