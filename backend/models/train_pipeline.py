"""
TVS Credit EPIC 8 - Dynamic Residual Pricing & Lending Strategy Engine
Backend training pipeline v2 - implements the full layered architecture:

  MACRO DATASTREAM (Fuel/Inflation/EV proxy)
        v
  LAYER 1  Market Time-Series Engine        (SARIMAX + Lagged-LightGBM + LSTM)
        v
  DUAL-STAGE PREDICTIVE CORE
     Stage 1  Origination Engine            (LightGBM quantile -> decay rate lambda)
     Stage 2  Liquidation Engine            (LightGBM + Deep Learning -> net recovery)
        v
  LAYER 2  Multi-Horizon Continuous Decay Engine   V(t) = AssetCost * exp(-lambda * t)
        v
  LAYER 3  Scenario Disruption Simulator    (EV / Fuel / Inflation shocks on lambda)
        v
  LAYER 4  Multi-Factor Risk Scoring Engine (Asset Risk + Loan Risk + Market Volatility)
        v
  LAYER 5  Constrained Mathematical Lending Optimizer  (scipy.optimize, LGD/LTV/Risk caps)
        v
  LAYER 6  Explainable AI & Copilot Engine  (CatBoost + TreeSHAP -> Ollama narrative)

Produces every artifact the Flask API / dashboard / chat assistant need in
backend/outputs/. Run with:  python models/train_pipeline.py   (from backend/)
"""
import os
import json
import warnings
import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OrdinalEncoder, StandardScaler
from sklearn.metrics import (
    mean_absolute_error, mean_squared_error, mean_absolute_percentage_error,
    roc_auc_score, precision_score, recall_score
)
import lightgbm as lgb
from catboost import CatBoostClassifier, Pool
import shap
import tensorflow as tf
from tensorflow import keras
from statsmodels.tsa.statespace.sarimax import SARIMAX
from scipy.optimize import minimize

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # backend/
DATA_PATH = os.path.join(BASE_DIR, "data", "Analytics_Case_Study_Dataset.xlsx")
OUT_DIR = os.path.join(BASE_DIR, "outputs")
os.makedirs(OUT_DIR, exist_ok=True)

np.random.seed(42)
tf.random.set_seed(42)


def log(msg):
    print(f"[pipeline] {msg}")


# ===========================================================================
# 0. Load & base feature engineering
# ===========================================================================
def load_and_engineer():
    df = pd.read_excel(DATA_PATH)
    df = df.rename(columns={"Traiffic Challan Amount": "Traffic Challan Amount"})

    df["Recovery_Ratio"] = df["Target Sold Amount At Liquidation"] / df["Asset Cost At Disbursal"]
    df["LGD"] = 1 - (df["Target Sold Amount At Liquidation"] / df["OS Balance At Liquidation"])
    df["LGD"] = df["LGD"].clip(lower=-0.5, upper=1.0)

    df["Cust Cibil Score"] = df["Cust Cibil Score"].replace(-1, np.nan)
    df["Cibil_Missing_Flag"] = df["Cust Cibil Score"].isna().astype(int)
    df["Cust Cibil Score"] = df["Cust Cibil Score"].fillna(df["Cust Cibil Score"].median())

    cond_map = {"G": 3, "A": 2, "P": 1}
    cond_cols = ["Asset Bodycondition", "Asset Tyrecondition", "Asset Generalcondition", "Asset Enginecondition"]
    for c in cond_cols:
        df[c + "_num"] = df[c].map(cond_map)
    df["Asset_Health_Index"] = df[[c + "_num" for c in cond_cols]].mean(axis=1) / 3 * 100
    df["Asset_Health_Index"] -= np.where(df["Asset Accident Flag"] == "Yes", 15, 0)
    df["Asset_Health_Index"] -= df["Traffic Challan Amount"].clip(upper=5000) / 5000 * 5
    df["Asset_Health_Index"] = df["Asset_Health_Index"].clip(0, 100)

    seg_lgd = df.groupby("Asset Model")["LGD"].transform("mean")
    df["Segment_Risk_Index"] = ((seg_lgd - seg_lgd.min()) / (seg_lgd.max() - seg_lgd.min()) * 100).round(1)

    # Decay-rate proxy target for Stage 1 (Origination Engine):
    #   Recovery_Ratio = exp(-lambda * age)  =>  lambda = -ln(Recovery_Ratio) / age
    age_safe = df["Asset Age Months At Seizure"].clip(lower=1)
    ratio_safe = df["Recovery_Ratio"].clip(lower=0.02, upper=1.5)
    df["Decay_Rate_Lambda"] = (-np.log(ratio_safe) / age_safe).clip(lower=0.001, upper=0.5)

    return df


# Feature groups mirror the two stages of the predictive core:
# Stage 1 only sees information known AT ORIGINATION (t = 0).
ORIGINATION_CAT = ["Cust Gender", "Cust Employment Type", "Coborrower Flag", "App Score Risk",
                   "Cust Region", "Cust State", "Pincode Tier", "Asset Variant", "Asset Model",
                   "Asset Fuel Type"]
ORIGINATION_NUM = ["Cust Age", "Cust Cibil Score", "Cust Net Salary", "Tenure", "Cust Net IRR",
                   "Asset Cost At Disbursal", "Loan Amount", "LTV", "Cibil_Missing_Flag"]

# Stage 2 additionally sees post-seizure / condition information (known only after repossession).
LIQUIDATION_CAT = ORIGINATION_CAT + ["RC Availability", "Registration Flag", "Asset Bodycondition",
                    "Asset Tyrecondition", "Asset Generalcondition", "Asset Enginecondition",
                    "Asset Accident Flag"]
LIQUIDATION_NUM = ORIGINATION_NUM + ["Asset Age Months At Seizure", "Months Spent In Yard",
                    "Traffic Challan Amount", "Asset Disc Flag", "Asset Alloy Flag",
                    "Asset_Health_Index", "Segment_Risk_Index"]

ALL_CAT = sorted(set(LIQUIDATION_CAT))
ALL_NUM = sorted(set(LIQUIDATION_NUM + ["Market_Volatility_Score"]))
FEATURE_COLS = ALL_CAT + ALL_NUM


def encode(df, cat_cols):
    enc = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
    out = df.copy()
    out[cat_cols] = enc.fit_transform(out[cat_cols].astype(str))
    return out, enc


# ===========================================================================
# LAYER 1 - Market Time-Series Engine (macro index & volatility score)
# ===========================================================================
def build_market_timeseries(df):
    """
    Aggregates monthly average recovery ratio as a macro proxy series (stand-in for
    fuel-price / inflation / EV-adoption index, since no exogenous macro feed is
    supplied with the dataset) and fits SARIMAX to model/forecast it. A lagged
    LightGBM model is trained in parallel on the same series as a comparison /
    ensemble candidate, per the architecture's "Prophet / SARIMAX / Lagged LightGBM"
    Layer 1 spec.
    """
    log("LAYER 1: building market time-series (SARIMAX + Lagged LightGBM) ...")
    monthly = (
        df.groupby(["Sold Date Year", "Sold Date Month"])
          .agg(avg_recovery_ratio=("Recovery_Ratio", "mean"),
               volatility=("Recovery_Ratio", "std"),
               n=("Agmt Id", "count"))
          .reset_index()
    )
    monthly = monthly.dropna(subset=["Sold Date Year", "Sold Date Month"])
    monthly["Sold Date Year"] = monthly["Sold Date Year"].astype(int)
    monthly["Sold Date Month"] = monthly["Sold Date Month"].astype(int)
    monthly = monthly.sort_values(["Sold Date Year", "Sold Date Month"]).reset_index(drop=True)
    monthly["volatility"] = monthly["volatility"].fillna(monthly["volatility"].median())

    series = monthly["avg_recovery_ratio"].values

    # --- SARIMAX ---
    sarimax_forecast = None
    try:
        model = SARIMAX(series, order=(1, 1, 1), seasonal_order=(0, 0, 0, 0),
                         enforce_stationarity=False, enforce_invertibility=False)
        fit = model.fit(disp=False)
        sarimax_forecast = fit.forecast(steps=3).tolist()
        in_sample = fit.fittedvalues
    except Exception as e:
        log(f"  SARIMAX fit failed ({e}), falling back to naive trend")
        in_sample = pd.Series(series).rolling(3, min_periods=1).mean().values
        sarimax_forecast = [float(series[-1])] * 3

    # --- Lagged LightGBM (uses lag-1, lag-2, lag-3 of the same series) ---
    lag_df = pd.DataFrame({"y": series})
    for lag in [1, 2, 3]:
        lag_df[f"lag_{lag}"] = lag_df["y"].shift(lag)
    lag_df = lag_df.dropna()
    lgb_ts_forecast = None
    if len(lag_df) >= 10:
        Xts, yts = lag_df[["lag_1", "lag_2", "lag_3"]], lag_df["y"]
        ts_model = lgb.LGBMRegressor(n_estimators=150, max_depth=3, learning_rate=0.08, verbosity=-1)
        ts_model.fit(Xts, yts)
        last_lags = series[-3:][::-1]  # lag_1, lag_2, lag_3
        preds = []
        window = list(last_lags)
        for _ in range(3):
            p = ts_model.predict(pd.DataFrame([window[:3]], columns=["lag_1", "lag_2", "lag_3"]))[0]
            preds.append(float(p))
            window = [p] + window[:2]
        lgb_ts_forecast = preds
    else:
        lgb_ts_forecast = sarimax_forecast

    # --- LSTM (deep learning sequence model over the same monthly series) ---
    lstm_forecast, lstm_history = train_lstm_timeseries(series)

    monthly["macro_index"] = in_sample if len(in_sample) == len(monthly) else monthly["avg_recovery_ratio"]
    monthly["market_volatility_score_raw"] = monthly["volatility"]

    # Volatility score normalised 0-100, merged back onto every agreement by (year, month)
    vol = monthly["market_volatility_score_raw"]
    monthly["Market_Volatility_Score"] = ((vol - vol.min()) / (vol.max() - vol.min() + 1e-9) * 100).round(1)

    df = df.merge(
        monthly[["Sold Date Year", "Sold Date Month", "Market_Volatility_Score"]],
        on=["Sold Date Year", "Sold Date Month"], how="left"
    )
    df["Market_Volatility_Score"] = df["Market_Volatility_Score"].fillna(df["Market_Volatility_Score"].median())

    timeseries_artifact = {
        "monthly_series": json.loads(monthly[["Sold Date Year", "Sold Date Month", "avg_recovery_ratio",
                                                "Market_Volatility_Score"]].to_json(orient="records")),
        "sarimax_forecast_next_3": sarimax_forecast,
        "lagged_lightgbm_forecast_next_3": lgb_ts_forecast,
        "lstm_forecast_next_3": lstm_forecast,
        "lstm_training_history": lstm_history,
    }
    return df, timeseries_artifact


def train_lstm_timeseries(series, window=3, epochs=200):
    """
    Deep-learning branch of Layer 1: a small stacked-LSTM sequence model trained
    on the same monthly macro-proxy series as SARIMAX / lagged-LightGBM, so all
    three forecasting approaches can be compared side by side on the dashboard.

    The available history is short (a few dozen monthly points), so the network
    is deliberately tiny (single LSTM layer, few units) with heavy early-stopping
    to avoid overfitting a handful of points - this mirrors how a real deployment
    would start small and grow the network as more months of macro data accrue.
    """
    series = np.asarray(series, dtype="float32")
    if len(series) < window + 4:
        # Not enough history for a meaningful sequence model - fall back gracefully.
        flat = [float(series[-1])] * 3 if len(series) else [0.0, 0.0, 0.0]
        return flat, {"loss": [], "note": "insufficient history for LSTM, used naive fallback"}

    scaler = StandardScaler()
    scaled = scaler.fit_transform(series.reshape(-1, 1)).ravel()

    X_seq, y_seq = [], []
    for i in range(len(scaled) - window):
        X_seq.append(scaled[i:i + window])
        y_seq.append(scaled[i + window])
    X_seq = np.array(X_seq).reshape(-1, window, 1)
    y_seq = np.array(y_seq)

    tf.random.set_seed(42)
    model = keras.Sequential([
        keras.layers.Input(shape=(window, 1)),
        keras.layers.LSTM(16, activation="tanh"),
        keras.layers.Dense(8, activation="relu"),
        keras.layers.Dense(1),
    ])
    model.compile(optimizer=keras.optimizers.Adam(learning_rate=5e-3), loss="mse")

    early_stop = keras.callbacks.EarlyStopping(monitor="loss", patience=15, restore_best_weights=True)
    history = model.fit(X_seq, y_seq, epochs=epochs, batch_size=4, verbose=0,
                         callbacks=[early_stop])

    # Iteratively forecast the next 3 months, feeding each prediction back in as input.
    window_vals = list(scaled[-window:])
    forecasts_scaled = []
    for _ in range(3):
        x_in = np.array(window_vals[-window:]).reshape(1, window, 1)
        pred = float(model.predict(x_in, verbose=0)[0, 0])
        forecasts_scaled.append(pred)
        window_vals.append(pred)

    forecasts = scaler.inverse_transform(np.array(forecasts_scaled).reshape(-1, 1)).ravel().tolist()
    lstm_history = {"loss": [float(x) for x in history.history["loss"]]}
    return [float(f) for f in forecasts], lstm_history


# ===========================================================================
# DUAL-STAGE PREDICTIVE CORE
# ===========================================================================
def train_stage1_origination(df):
    """Stage 1: predicts the base decay rate lambda from origination-time
    information only, using LightGBM quantile regression to give a full
    (P10 / P50 / P90) uncertainty band rather than a single point estimate."""
    log("STAGE 1: training Origination Engine (quantile decay-rate model) ...")
    X = df[ORIGINATION_CAT + ORIGINATION_NUM].copy()
    X, _ = encode(X, ORIGINATION_CAT)
    y = df["Decay_Rate_Lambda"]

    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)

    quantile_models = {}
    quantile_preds_te = {}
    for q in [0.1, 0.5, 0.9]:
        m = lgb.LGBMRegressor(objective="quantile", alpha=q, n_estimators=300,
                               learning_rate=0.05, max_depth=5, num_leaves=25,
                               random_state=42, verbosity=-1)
        m.fit(Xtr, ytr)
        quantile_models[q] = m
        quantile_preds_te[q] = m.predict(Xte)

    mae_median = float(mean_absolute_error(yte, quantile_preds_te[0.5]))
    coverage_80pct = float(np.mean((yte >= quantile_preds_te[0.1]) & (yte <= quantile_preds_te[0.9])))
    log(f"  Stage 1 lambda-median MAE={mae_median:.4f}  |  80% interval coverage={coverage_80pct:.2%}")

    df["Lambda_P10"] = quantile_models[0.1].predict(X)
    df["Lambda_P50"] = quantile_models[0.5].predict(X)
    df["Lambda_P90"] = quantile_models[0.9].predict(X)

    metrics = {"mae_median_lambda": round(mae_median, 5), "coverage_80pct": round(coverage_80pct, 3)}
    return df, metrics


def train_stage2_liquidation(df):
    """Stage 2: predicts the net recovery realization value (final sold amount)
    using post-seizure condition/yard/challan/RC information PLUS the Stage 1
    lambda estimate as an engineered feature - a classic two-stage cascade."""
    log("STAGE 2: training Liquidation Engine (LightGBM + Deep Learning) ...")
    feat_cols = LIQUIDATION_CAT + LIQUIDATION_NUM + ["Lambda_P50"]
    X = df[feat_cols].copy()
    X, _ = encode(X, LIQUIDATION_CAT)
    y = df["Target Sold Amount At Liquidation"]

    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)

    # ---- LightGBM ----
    value_model = lgb.LGBMRegressor(n_estimators=500, learning_rate=0.04, max_depth=6, num_leaves=31,
                                     subsample=0.8, colsample_bytree=0.8, random_state=42, verbosity=-1)
    value_model.fit(Xtr, ytr)
    pred_te = value_model.predict(Xte)
    rmse = float(mean_squared_error(yte, pred_te) ** 0.5)
    mae = float(mean_absolute_error(yte, pred_te))
    mape = float(mean_absolute_percentage_error(yte, pred_te))
    log(f"  LightGBM   RMSE={rmse:,.0f}  MAE={mae:,.0f}  MAPE={mape:.2%}")

    # ---- Deep Learning (Keras) ----
    scaler = StandardScaler()
    Xtr_dl = scaler.fit_transform(Xtr)
    Xte_dl = scaler.transform(Xte)
    X_all_dl = scaler.transform(X)

    y_scaler = StandardScaler()
    ytr_dl = y_scaler.fit_transform(ytr.values.reshape(-1, 1)).ravel()

    def build_dl_model(input_dim):
        m = keras.Sequential([
            keras.layers.Input(shape=(input_dim,)),
            keras.layers.Dense(128, activation="relu"), keras.layers.BatchNormalization(), keras.layers.Dropout(0.2),
            keras.layers.Dense(64, activation="relu"), keras.layers.BatchNormalization(), keras.layers.Dropout(0.2),
            keras.layers.Dense(32, activation="relu"),
            keras.layers.Dense(1),
        ])
        m.compile(optimizer=keras.optimizers.Adam(learning_rate=1e-3), loss="mse", metrics=["mae"])
        return m

    dl_model = build_dl_model(Xtr_dl.shape[1])
    early_stop = keras.callbacks.EarlyStopping(monitor="val_loss", patience=10, restore_best_weights=True)
    history = dl_model.fit(Xtr_dl, ytr_dl, validation_split=0.15, epochs=100, batch_size=256,
                            callbacks=[early_stop], verbose=0)

    pred_te_dl = y_scaler.inverse_transform(dl_model.predict(Xte_dl, verbose=0).reshape(-1, 1)).ravel()
    dl_rmse = float(mean_squared_error(yte, pred_te_dl) ** 0.5)
    dl_mae = float(mean_absolute_error(yte, pred_te_dl))
    dl_mape = float(mean_absolute_percentage_error(yte, pred_te_dl))
    log(f"  DeepLearn  RMSE={dl_rmse:,.0f}  MAE={dl_mae:,.0f}  MAPE={dl_mape:.2%}")

    # ---- Ensemble ----
    w_lgb = (1 / mape) / ((1 / mape) + (1 / dl_mape))
    w_dl = 1 - w_lgb
    pred_te_ens = w_lgb * pred_te + w_dl * pred_te_dl
    ens_rmse = float(mean_squared_error(yte, pred_te_ens) ** 0.5)
    ens_mae = float(mean_absolute_error(yte, pred_te_ens))
    ens_mape = float(mean_absolute_percentage_error(yte, pred_te_ens))
    log(f"  Ensemble   RMSE={ens_rmse:,.0f}  MAE={ens_mae:,.0f}  MAPE={ens_mape:.2%}  (w_lgb={w_lgb:.2f})")

    df["Predicted_Sold_Amount"] = value_model.predict(X)
    df["DL_Predicted_Sold_Amount"] = y_scaler.inverse_transform(
        dl_model.predict(X_all_dl, verbose=0).reshape(-1, 1)).ravel()
    df["Ensemble_Predicted_Sold_Amount"] = w_lgb * df["Predicted_Sold_Amount"] + w_dl * df["DL_Predicted_Sold_Amount"]
    df["Predicted_Recovery_Ratio"] = df["Predicted_Sold_Amount"] / df["Asset Cost At Disbursal"]

    model_comparison = [
        {"model": "LightGBM (ML)", "rmse": round(rmse, 0), "mae": round(mae, 0), "mape": round(mape, 4)},
        {"model": "Neural Network (DL)", "rmse": round(dl_rmse, 0), "mae": round(dl_mae, 0), "mape": round(dl_mape, 4)},
        {"model": "Ensemble (ML+DL)", "rmse": round(ens_rmse, 0), "mae": round(ens_mae, 0), "mape": round(ens_mape, 4)},
    ]
    training_history = {"loss": [float(x) for x in history.history["loss"]],
                         "val_loss": [float(x) for x in history.history["val_loss"]]}
    return df, model_comparison, training_history


# ===========================================================================
# LAYER 2 - Multi-Horizon Continuous Decay Engine:  V(t) = Cost * exp(-lambda t)
# ===========================================================================
def apply_decay_engine(df):
    log("LAYER 2: applying parametric decay engine V(t) = AssetCost * exp(-lambda*t) ...")
    age = df["Asset Age Months At Seizure"].clip(lower=1)
    implied_ratio = df["Predicted_Recovery_Ratio"].clip(lower=0.02, upper=1.5)
    df["Calibrated_Lambda"] = (-np.log(implied_ratio) / age).clip(lower=0.001, upper=0.5)

    for h in [12, 24, 36]:
        df[f"Residual_Value_Forecast_{h}M"] = (
            df["Asset Cost At Disbursal"] * np.exp(-df["Calibrated_Lambda"] * (age + h))
        ).clip(lower=0.02 * df["Asset Cost At Disbursal"])
    return df


# ===========================================================================
# LAYER 3 - Scenario Disruption Simulator (shocks applied to lambda, not the
# final value directly - a truer physical stress-test on the decay engine)
# ===========================================================================
def simulate_scenario(df, fuel_price_shock_pct=0.0, ev_adoption_shift_pct=0.0, inflation_pct=0.0):
    is_ice = ~df["Asset Fuel Type"].str.contains("EV|Electric", case=False, na=False)

    fuel_effect = np.where(is_ice, fuel_price_shock_pct * 0.006, -fuel_price_shock_pct * 0.002)
    ev_effect = np.where(is_ice, ev_adoption_shift_pct * 0.010, -ev_adoption_shift_pct * 0.004)
    inflation_effect = inflation_pct * 0.003

    shocked_lambda = (df["Calibrated_Lambda"] * (1 + fuel_effect + ev_effect + inflation_effect)).clip(0.001, 0.6)
    age = df["Asset Age Months At Seizure"].clip(lower=1)

    sim_value = df["Asset Cost At Disbursal"] * np.exp(-shocked_lambda * age)
    sim_recovery_ratio = (sim_value / df["Asset Cost At Disbursal"]).clip(0, 2)

    shortfall = (1 - sim_recovery_ratio).clip(lower=0)
    raw = (df["High_Loss_Probability"] * 40 + shortfall * 100 * 0.30 +
           (100 - df["Asset_Health_Index"]) * 0.15 + df["Market_Volatility_Score"] * 0.15)
    sim_score = ((raw - raw.min()) / (raw.max() - raw.min() + 1e-9) * 100).round(1)
    sim_band = pd.cut(sim_score, bins=[-1, 25, 50, 75, 100], labels=["Low", "Medium", "High", "Critical"])

    return pd.DataFrame({
        "Sim_Predicted_Sold_Amount": sim_value,
        "Sim_Recovery_Ratio": sim_recovery_ratio,
        "Sim_Residual_Risk_Score": sim_score,
        "Sim_Risk_Band": sim_band,
    })


def run_scenario_suite(df):
    log("LAYER 3: running scenario disruption simulator ...")
    scenarios = {
        "Baseline": dict(fuel_price_shock_pct=0, ev_adoption_shift_pct=0, inflation_pct=0),
        "Fuel Price Spike (+20%)": dict(fuel_price_shock_pct=20, ev_adoption_shift_pct=0, inflation_pct=0),
        "EV Adoption Surge (+15pp)": dict(fuel_price_shock_pct=0, ev_adoption_shift_pct=15, inflation_pct=0),
        "High Inflation (+10%)": dict(fuel_price_shock_pct=0, ev_adoption_shift_pct=0, inflation_pct=10),
        "Combined Stress": dict(fuel_price_shock_pct=15, ev_adoption_shift_pct=10, inflation_pct=8),
    }
    results = []
    for name, params in scenarios.items():
        sim = simulate_scenario(df, **params)
        results.append({
            "scenario": name,
            "avg_recovery_ratio": round(float(sim["Sim_Recovery_Ratio"].mean()), 3),
            "avg_residual_risk_score": round(float(sim["Sim_Residual_Risk_Score"].mean()), 2),
            "critical_pct": round(float((sim["Sim_Risk_Band"] == "Critical").mean()) * 100, 2),
            "portfolio_value_at_risk": round(float((df["Predicted_Sold_Amount"] -
                                                      sim["Sim_Predicted_Sold_Amount"]).clip(lower=0).sum()), 0),
        })
    return results


# ===========================================================================
# LAYER 4 - Multi-Factor Risk Scoring Engine
#   Risk Score = w1*(Asset Risk) + w2*(Loan Risk) + w3*(Market Volatility Score)
# ===========================================================================
def train_risk_model_and_score(df):
    log("LAYER 4: training CatBoost risk classifier + multi-factor risk score ...")
    # CatBoost natively handles categorical columns as strings (it builds its own
    # target-statistics encoding internally) - unlike LightGBM/DL above, do NOT
    # ordinal-encode the categorical columns here, just cast them to string.
    X = df[FEATURE_COLS].copy()
    X[ALL_CAT] = X[ALL_CAT].astype(str)
    y = (df["LGD"] > df["LGD"].median()).astype(int)

    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)
    cat_idx = [X.columns.get_loc(c) for c in ALL_CAT]

    risk_model = CatBoostClassifier(
        iterations=400, depth=6, learning_rate=0.06, loss_function="Logloss",
        verbose=False, random_seed=42
    )
    risk_model.fit(Xtr, ytr, cat_features=cat_idx)
    proba_te = risk_model.predict_proba(Xte)[:, 1]
    pred_te = (proba_te > 0.5).astype(int)
    auc = float(roc_auc_score(yte, proba_te))
    prec = float(precision_score(yte, pred_te))
    rec = float(recall_score(yte, pred_te))
    log(f"  CatBoost RiskModel  AUC={auc:.3f}  Precision={prec:.3f}  Recall={rec:.3f}")

    df["High_Loss_Probability"] = risk_model.predict_proba(X)[:, 1]

    asset_risk = ((100 - df["Asset_Health_Index"]) * 0.7 +
                  np.where(df["Asset Accident Flag"] == "Yes", 30, 0)).clip(0, 100)

    ltv_component = (df["LTV"] * 100).clip(0, 100)
    cibil_component = (100 - (df["Cust Cibil Score"] - 300) / (900 - 300) * 100).clip(0, 100)
    loan_risk = (ltv_component * 0.5 + cibil_component * 0.5).clip(0, 100)

    market_component = df["Market_Volatility_Score"]

    w1, w2, w3 = 0.40, 0.35, 0.25
    raw_score = (w1 * asset_risk + w2 * loan_risk + w3 * market_component) \
                + df["High_Loss_Probability"] * 20
    df["Asset_Risk_Component"] = asset_risk.round(1)
    df["Loan_Risk_Component"] = loan_risk.round(1)
    df["Residual_Risk_Score"] = ((raw_score - raw_score.min()) / (raw_score.max() - raw_score.min() + 1e-9) * 100).round(1)
    df["Risk_Band"] = pd.cut(df["Residual_Risk_Score"], bins=[-1, 25, 50, 75, 100],
                              labels=["Low", "Medium", "High", "Critical"])

    risk_metrics = {"auc_roc": round(auc, 3), "precision": round(prec, 3), "recall": round(rec, 3),
                     "weights": {"w1_asset_risk": w1, "w2_loan_risk": w2, "w3_market_volatility": w3}}
    return df, risk_model, X, risk_metrics


# ===========================================================================
# LAYER 5 - Constrained Mathematical Lending Optimizer
# ===========================================================================
RISK_BAND_CAPS = {
    "Low":      dict(ltv_cap=0.95, lgd_cap=0.35, min_rate_premium=0.00, tenure_mult_cap=1.00),
    "Medium":   dict(ltv_cap=0.88, lgd_cap=0.45, min_rate_premium=0.35, tenure_mult_cap=0.95),
    "High":     dict(ltv_cap=0.80, lgd_cap=0.55, min_rate_premium=0.75, tenure_mult_cap=0.85),
    "Critical": dict(ltv_cap=0.70, lgd_cap=0.65, min_rate_premium=1.25, tenure_mult_cap=0.75),
}


def optimize_terms(row):
    """
    Solves, per agreement cluster:
        maximize   Profit(LTV, Rate) = Rate * LoanAmount - ExpectedLoss(LTV)
        subject to LTV <= ltv_cap(band)
                   implied LGD(LTV) <= lgd_cap(band)
                   Rate >= base_rate + min_rate_premium(band)
    via SLSQP (scipy.optimize.minimize).
    """
    band = row["Risk_Band"]
    caps = RISK_BAND_CAPS[band]
    asset_cost = row["Loan Amount"] / max(row["LTV"], 0.01)  # back out asset cost from observed LTV
    base_rate = row["Cust Net IRR"]
    risk_score = row["Residual_Risk_Score"] / 100.0
    recovery_ratio = np.clip(row["Predicted_Recovery_Ratio"], 0.05, 1.2)

    def expected_loss(ltv):
        exposure = ltv * asset_cost   # actual amount financed at this LTV
        shortfall_per_rupee_financed = max(0.0, 1 - recovery_ratio / max(ltv, 0.01))
        return exposure * risk_score * shortfall_per_rupee_financed

    def neg_profit(x):
        # Revenue scales with the amount actually financed (ltv * asset_cost),
        # so the optimizer faces a genuine trade-off: higher LTV means more
        # interest revenue but also more expected loss exposure - unlike a
        # fixed Loan Amount, this is what makes the LTV choice non-trivial.
        ltv, rate_premium = x
        rate = base_rate + rate_premium
        financed_amount = ltv * asset_cost
        profit = (rate / 100.0) * financed_amount - expected_loss(ltv)
        return -profit

    def lgd_constraint(x):
        ltv = x[0]
        implied_lgd = max(0.0, 1 - (recovery_ratio / max(ltv, 0.01)))
        return caps["lgd_cap"] - implied_lgd

    x0 = [min(row["LTV"], caps["ltv_cap"]), caps["min_rate_premium"]]
    bounds = [(0.50, caps["ltv_cap"]), (caps["min_rate_premium"], caps["min_rate_premium"] + 3.0)]
    constraints = [{"type": "ineq", "fun": lgd_constraint}]

    try:
        res = minimize(neg_profit, x0, method="SLSQP", bounds=bounds, constraints=constraints,
                        options={"maxiter": 50, "ftol": 1e-6})
        ltv_opt, premium_opt = res.x if res.success else x0
    except Exception:
        ltv_opt, premium_opt = x0

    rec_ltv = float(np.clip(ltv_opt, 0.50, caps["ltv_cap"]))
    rec_rate = float(base_rate + premium_opt)
    rec_tenure = max(12, round(row["Tenure"] * caps["tenure_mult_cap"] / 6) * 6)

    return pd.Series({"Recommended_LTV": round(rec_ltv, 3),
                       "Recommended_Pricing": round(rec_rate, 2),
                       "Recommended_Tenure": rec_tenure})


def run_lending_optimizer(df):
    log("LAYER 5: running constrained lending optimizer (scipy SLSQP) ...")
    df["_cluster"] = df["Risk_Band"].astype(str) + "|" + df["Asset Model"].astype(str)
    centroids = df.groupby("_cluster").agg(
        **{"Loan Amount": ("Loan Amount", "mean"),
           "Cust Net IRR": ("Cust Net IRR", "mean"),
           "Residual_Risk_Score": ("Residual_Risk_Score", "mean"),
           "Predicted_Recovery_Ratio": ("Predicted_Recovery_Ratio", "mean"),
           "LTV": ("LTV", "mean"),
           "Tenure": ("Tenure", "mean"),
           "Risk_Band": ("Risk_Band", "first")}
    )
    rec_lookup = centroids.apply(optimize_terms, axis=1)
    rec_lookup.columns = ["Recommended_LTV", "Recommended_Pricing", "Recommended_Tenure"]

    df = df.merge(rec_lookup, left_on="_cluster", right_index=True, how="left")
    df = df.drop(columns=["_cluster"])

    df["Expected_Loss"] = df["Residual_Risk_Score"] / 100 * df["LGD"].clip(lower=0) * df["Loan Amount"]
    df["Profitability_Score"] = ((df["Recommended_Pricing"] / 100 * df["Loan Amount"]) - df["Expected_Loss"]) \
        / df["Loan Amount"] * 100
    df["Recovery_Efficiency_Index"] = (df["Target Sold Amount At Liquidation"] /
                                        df["OS Balance At Liquidation"]).clip(0, 2) * 50
    return df


# ===========================================================================
# LAYER 6 - Explainable AI (CatBoost + TreeSHAP)
# ===========================================================================
def explain_with_shap(risk_model, X):
    log("LAYER 6: computing CatBoost TreeSHAP explanations ...")
    pool = Pool(X, cat_features=[X.columns.get_loc(c) for c in ALL_CAT])
    sv = risk_model.get_feature_importance(pool, type="ShapValues")[:, :-1]  # drop bias column
    shap_importance = pd.Series(np.abs(sv).mean(axis=0), index=FEATURE_COLS).sort_values(ascending=False)
    return sv, shap_importance


# ===========================================================================
# MAIN
# ===========================================================================
def main():
    df = load_and_engineer()

    df, timeseries_artifact = build_market_timeseries(df)
    df, stage1_metrics = train_stage1_origination(df)
    df, model_comparison, training_history = train_stage2_liquidation(df)
    df = apply_decay_engine(df)
    df, risk_model, X, risk_metrics = train_risk_model_and_score(df)
    df = run_lending_optimizer(df)
    scenario_results = run_scenario_suite(df)
    shap_values, shap_importance = explain_with_shap(risk_model, X)

    portfolio_risk_score = float(df["Residual_Risk_Score"].mean())

    log("saving artifacts ...")
    output_cols = ["Agmt Id", "Cust Region", "Cust State", "Asset Model", "Asset Fuel Type",
                   "Asset Age Months At Seizure", "LTV", "Loan Amount", "Cust Net IRR", "Tenure",
                   "Cust Cibil Score", "App Score Risk", "Asset_Health_Index",
                   "Predicted_Sold_Amount", "DL_Predicted_Sold_Amount", "Ensemble_Predicted_Sold_Amount",
                   "Lambda_P10", "Lambda_P50", "Lambda_P90", "Calibrated_Lambda",
                   "Residual_Value_Forecast_12M", "Residual_Value_Forecast_24M", "Residual_Value_Forecast_36M",
                   "Residual_Risk_Score", "Risk_Band", "Asset_Risk_Component", "Loan_Risk_Component",
                   "Segment_Risk_Index", "Market_Volatility_Score",
                   "Recovery_Ratio", "Recovery_Efficiency_Index", "Profitability_Score", "LGD",
                   "Recommended_LTV", "Recommended_Pricing", "Recommended_Tenure",
                   "Target Sold Amount At Liquidation"]
    df[output_cols].to_csv(os.path.join(OUT_DIR, "agreements.csv"), index=False)

    segment_risk = df.groupby("Asset Model").agg(
        avg_residual_risk_score=("Residual_Risk_Score", "mean"),
        avg_recovery_ratio=("Recovery_Ratio", "mean"),
        avg_health_index=("Asset_Health_Index", "mean"),
        agreements=("Agmt Id", "count"),
    ).round(3).reset_index().rename(columns={"Asset Model": "asset_model"}) \
     .sort_values("avg_residual_risk_score", ascending=False)
    segment_risk.to_json(os.path.join(OUT_DIR, "segment_risk.json"), orient="records")

    region_risk = df.groupby("Cust Region").agg(
        avg_residual_risk_score=("Residual_Risk_Score", "mean"),
        agreements=("Agmt Id", "count"),
    ).round(2).reset_index().rename(columns={"Cust Region": "region"})
    region_risk.to_json(os.path.join(OUT_DIR, "region_risk.json"), orient="records")

    risk_band_dist = df["Risk_Band"].value_counts().reindex(["Low", "Medium", "High", "Critical"]).fillna(0)
    fuel_dist = df.groupby("Asset Fuel Type").agg(
        agreements=("Agmt Id", "count"), avg_recovery_ratio=("Recovery_Ratio", "mean")
    ).round(3).reset_index()

    portfolio_summary = {
        "total_agreements": int(len(df)),
        "portfolio_residual_risk_score": round(portfolio_risk_score, 2),
        "avg_recovery_ratio": round(float(df["Recovery_Ratio"].mean()), 3),
        "avg_ltv_current": round(float(df["LTV"].mean()), 3),
        "avg_ltv_recommended": round(float(df["Recommended_LTV"].mean()), 3),
        "avg_rate_current": round(float(df["Cust Net IRR"].mean()), 2),
        "avg_rate_recommended": round(float(df["Recommended_Pricing"].mean()), 2),
        "avg_tenure_current": round(float(df["Tenure"].mean()), 1),
        "avg_tenure_recommended": round(float(df["Recommended_Tenure"].mean()), 1),
        "total_loan_amount": round(float(df["Loan Amount"].sum()), 0),
        "total_predicted_recovery": round(float(df["Predicted_Sold_Amount"].sum()), 0),
        "total_expected_loss": round(float(df["Expected_Loss"].sum()), 0),
        "avg_profitability_score": round(float(df["Profitability_Score"].mean()), 2),
        "risk_band_distribution": {k: int(v) for k, v in risk_band_dist.items()},
        "fuel_type_distribution": fuel_dist.to_dict(orient="records"),
        "top_risk_segments": segment_risk.head(5).to_dict(orient="records"),
        "risk_weights": risk_metrics["weights"],
    }
    with open(os.path.join(OUT_DIR, "portfolio_summary.json"), "w") as f:
        json.dump(portfolio_summary, f, indent=2)

    with open(os.path.join(OUT_DIR, "scenario_results.json"), "w") as f:
        json.dump(scenario_results, f, indent=2)

    with open(os.path.join(OUT_DIR, "model_comparison.json"), "w") as f:
        json.dump({"value_models": model_comparison,
                   "risk_model": {"auc_roc": risk_metrics["auc_roc"], "precision": risk_metrics["precision"],
                                  "recall": risk_metrics["recall"], "algorithm": "CatBoost"},
                   "stage1_origination": stage1_metrics}, f, indent=2)

    with open(os.path.join(OUT_DIR, "feature_importance.json"), "w") as f:
        json.dump([{"feature": k, "importance": round(float(v), 4)}
                    for k, v in shap_importance.head(15).items()], f, indent=2)

    with open(os.path.join(OUT_DIR, "training_history.json"), "w") as f:
        json.dump(training_history, f)

    with open(os.path.join(OUT_DIR, "market_timeseries.json"), "w") as f:
        json.dump(timeseries_artifact, f, indent=2, default=str)

    np.save(os.path.join(OUT_DIR, "shap_values.npy"), shap_values)
    with open(os.path.join(OUT_DIR, "feature_cols.json"), "w") as f:
        json.dump(FEATURE_COLS, f)

    log("DONE. All artifacts written to backend/outputs/")


if __name__ == "__main__":
    main()
