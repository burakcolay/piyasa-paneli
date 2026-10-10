import numpy as np
import pandas as pd

from mi import stats as st


def make(n=400, seed=1):
    rng = np.random.default_rng(seed)
    d = pd.bdate_range("2023-01-02", periods=n)
    m = rng.normal(0, 0.01, n)
    r = pd.DataFrame({"NDX": m, "HI": 2 * m + rng.normal(0, 0.002, n), "NEG": -m + rng.normal(0, 0.002, n)}, index=d)
    close = 100 * (1 + r).cumprod()
    return r, close


def test_beta_recovers_known_sensitivity():
    r, _ = make()
    b = st.beta(r)
    assert abs(b["HI"] - 2) < 0.1 and abs(b["NEG"] + 1) < 0.1 and abs(b["NDX"] - 1) < 1e-9


def test_drawdown_is_never_positive_and_zero_at_peak():
    _, close = make()
    dd = st.drawdown(close)
    assert (dd <= 1e-9).all().all()
    assert dd["NDX"].iloc[close["NDX"].values.argmax()] == 0


def test_correlation_signs():
    r, _ = make()
    c = st.corr_matrix(r, ["NDX", "HI", "NEG"], 252)
    assert c.loc["NDX", "HI"] > 0.9 and c.loc["NDX", "NEG"] < -0.9


def test_anomaly_found_and_not_self_masked():
    r, close = make()
    r.iloc[-1, r.columns.get_loc("HI")] = 0.15           # son günde 15σ'luk hareket
    vol = pd.DataFrame(1e6, index=r.index, columns=r.columns)
    a = st.anomalies(r, vol, days=3)
    assert ((a["code"] == "HI") & (a["z_ret"] > 5)).any()


def test_level_series_use_differences():
    d = pd.bdate_range("2024-01-01", periods=3)
    close = pd.DataFrame({"US10Y": [4.0, 4.1, 4.0], "NDX": [100, 101, 102]}, index=d)
    r = st.returns(close)
    assert abs(r["US10Y"].iloc[1] - 0.1) < 1e-9
