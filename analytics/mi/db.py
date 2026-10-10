"""SQLite veritabanını kurar: fiyatlar + SEC verisi (finansallar, açıklamalar, yönetici işlemleri, fon portföyleri)."""
from __future__ import annotations

import json
import sqlite3

import pandas as pd

from .clean import load_prices
from .config import DB_PATH, SQL_DIR, US_DIR, all_assets

SCHEMA = """
CREATE TABLE assets (code TEXT PRIMARY KEY, name TEXT, sector TEXT, cls TEXT);
CREATE TABLE prices (code TEXT, date TEXT, open REAL, high REAL, low REAL, close REAL, volume REAL, ret REAL,
                     PRIMARY KEY (code, date));
CREATE TABLE fundamentals (code TEXT, freq TEXT, period_end TEXT, fy INTEGER, metric TEXT, value REAL);
CREATE TABLE filings (code TEXT, date TEXT, form TEXT, items TEXT, label TEXT, acc TEXT);
CREATE TABLE insider_trades (code TEXT, date TEXT, owner TEXT, title TEXT, plan INTEGER,
                             buy_usd REAL, sell_usd REAL, shares_buy REAL, shares_sell REAL);
CREATE TABLE fund_holdings (fund TEXT, manager TEXT, period TEXT, code TEXT, issuer TEXT,
                            value_usd REAL, shares REAL, prev_shares REAL, change TEXT);
CREATE INDEX ix_prices_date ON prices(date);
CREATE INDEX ix_fund_code ON fundamentals(code, metric);
CREATE INDEX ix_filings_code ON filings(code, date);
"""


def _sec_tables() -> dict[str, pd.DataFrame]:
    fund, fil, ins = [], [], []
    for p in sorted((US_DIR / "co").glob("*.json")):
        c = json.loads(p.read_text())
        code = c["t"]
        for freq, key in (("Y", "annual"), ("Q", "quarterly")):
            for r in (c.get("fin") or {}).get(key, []):
                for m, v in r.items():
                    if m in ("end", "fy") or v is None or not isinstance(v, (int, float)):
                        continue
                    fund.append((code, freq, r["end"], r.get("fy"), m, float(v)))
        for f in c.get("filings", []):
            fil.append((code, f["date"], f["form"], ",".join(f.get("items", [])), f["label"], f["acc"]))
        for i in c.get("insiders", []):
            ins.append((code, i["date"], i.get("owner"), i.get("title"), int(bool(i.get("plan"))),
                        i.get("buy", 0), i.get("sell", 0), i.get("shBuy", 0), i.get("shSell", 0)))
    holds = []
    fj = US_DIR / "funds.json"
    if fj.exists():
        for f in json.loads(fj.read_text())["funds"]:
            for h in f["holdings"]:
                holds.append((f["name"], f["person"], f["period"], h.get("t"), h["name"], h["value"],
                              h["shares"], h["prevShares"], h["chg"]))
    return {
        "fundamentals": pd.DataFrame(fund, columns=["code", "freq", "period_end", "fy", "metric", "value"]),
        "filings": pd.DataFrame(fil, columns=["code", "date", "form", "items", "label", "acc"]),
        "insider_trades": pd.DataFrame(ins, columns=["code", "date", "owner", "title", "plan", "buy_usd", "sell_usd", "shares_buy", "shares_sell"]),
        "fund_holdings": pd.DataFrame(holds, columns=["fund", "manager", "period", "code", "issuer", "value_usd", "shares", "prev_shares", "change"]),
    }


def build() -> dict:
    """Veritabanını sıfırdan kurar. Dönüş: tablo -> satır sayısı ve fiyat kalite raporu."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if DB_PATH.exists():
        DB_PATH.unlink()
    prices, quality = load_prices()
    prices = prices.assign(date=prices["date"].dt.strftime("%Y-%m-%d"))
    assets = pd.DataFrame(all_assets())[["code", "name", "sector", "cls"]].drop_duplicates("code")
    con = sqlite3.connect(DB_PATH)
    con.executescript(SCHEMA)
    assets.to_sql("assets", con, if_exists="append", index=False)
    prices.to_sql("prices", con, if_exists="append", index=False, chunksize=5000)
    counts = {"assets": len(assets), "prices": len(prices)}
    for name, df in _sec_tables().items():
        df.to_sql(name, con, if_exists="append", index=False)
        counts[name] = len(df)
    con.commit()
    con.close()
    return {"counts": counts, "quality": quality}


def connect() -> sqlite3.Connection:
    return sqlite3.connect(DB_PATH)


def query(name: str, con: sqlite3.Connection | None = None, **params) -> pd.DataFrame:
    """analytics/sql/<name>.sql dosyasını çalıştırır."""
    sql = (SQL_DIR / f"{name}.sql").read_text()
    own = con is None
    con = con or connect()
    try:
        return pd.read_sql_query(sql, con, params=params or None)
    finally:
        if own:
            con.close()
