# epic8 - Lending Intelligence & Finance
# Dynamic Residual Pricing & Lending Strategy Engine

Full-stack deliverable for the "Disruption Decoded" Analytics Case Study.

```
project/
├── backend/
│   ├── data/                     # training data (your uploaded xlsx lives here)
│   ├── models/
│   │   └── train_pipeline.py     # trains all models, writes artifacts to outputs/
│   ├── outputs/                  # generated JSON/CSV artifacts (created by train_pipeline.py)
│   ├── app.py                    # Flask API + serves the frontend
│   ├── ollama_client.py          # local Ollama (llama3.1) chat wrapper
│   └── requirements.txt
└── frontend/
    ├── index.html                # dashboard + explorer + scenario lab + chat UI
    ├── css/style.css
    └── js/ (api.js, dashboard.js, explorer.js, scenario.js, chat.js, app.js)
```

## What's implemented

The training pipeline (`backend/models/train_pipeline.py`) implements the full
layered architecture end-to-end:

```
MACRO DATASTREAM (Fuel / Inflation / EV proxy)
      v
LAYER 1  Market Time-Series Engine        SARIMAX + Lagged-LightGBM
      v
DUAL-STAGE PREDICTIVE CORE
   Stage 1  Origination Engine            LightGBM quantile regression -> decay rate λ (P10/P50/P90)
   Stage 2  Liquidation Engine            LightGBM + Deep Learning (Keras) -> net recovery value, blended ensemble
      v
LAYER 2  Multi-Horizon Decay Engine       V(t) = AssetCost * exp(-λ * t)  ->  12M / 24M / 36M forecasts
      v
LAYER 3  Scenario Disruption Simulator    EV adoption / fuel-price / inflation shocks applied to λ
      v
LAYER 4  Multi-Factor Risk Scoring        Score = w1·AssetRisk + w2·LoanRisk + w3·MarketVolatility
      v
LAYER 5  Constrained Lending Optimizer    scipy SLSQP: maximize profit s.t. LTV/LGD/rate caps per risk band
      v
LAYER 6  Explainable AI & Copilot         CatBoost + TreeSHAP -> Ollama (llama3.1) narrative
```

- **Layer 1 — Market Time-Series Engine**: monthly recovery-ratio series (macro
  proxy) modelled with SARIMAX and a lagged-LightGBM comparison model; feeds the
  `Market_Volatility_Score` used everywhere downstream. Forecasts saved to
  `outputs/market_timeseries.json`.
- **Stage 1 — Origination Engine**: LightGBM quantile regression (P10/P50/P90)
  predicting the asset's base depreciation rate **λ** from information known at
  loan origination only (no post-seizure data leakage).
- **Stage 2 — Liquidation Engine**: LightGBM + a Keras/TensorFlow deep neural
  network (blended into a weighted ensemble) predicting the net recovery value
  using post-seizure condition/yard/challan/RC data plus the Stage-1 λ as a feature.
- **Layer 2 — Decay Engine**: a genuine parametric curve `V(t) = AssetCost·e^(−λt)`
  calibrated per agreement, producing 12/24/36-month residual value forecasts.
- **Layer 3 — Scenario Simulator**: EV-adoption, fuel-price and inflation shocks
  are applied directly to λ (not the output value), then propagated back through
  the same decay equation and risk score — Baseline / Fuel Spike / EV Surge /
  High Inflation / Combined Stress.
- **Layer 4 — Multi-Factor Risk Scoring**: `CatBoostClassifier` (+ TreeSHAP) gives
  a high-loss probability; combined with explicit Asset-Risk and Loan-Risk
  sub-scores and the market volatility score into a weighted composite
  `Residual_Risk_Score` (0–100), banded Low/Medium/High/Critical.
- **Layer 5 — Constrained Lending Optimizer**: `scipy.optimize` (SLSQP) solves a
  real constrained profit-maximization per risk-band/segment cluster — subject to
  an LTV cap, an implied-LGD cap, and a minimum rate premium — rather than a flat
  heuristic rule table.
- **Layer 6 — Explainable AI & Copilot**: CatBoost TreeSHAP values feed both the
  dashboard's global feature-importance chart and a **local Ollama (llama3.1)**
  chat assistant, grounded in the modelled outputs *and* the raw uploaded
  training data (so it can answer both "what does the model say about ASSET_123"
  and "what was ASSET_123's raw Cibil score in the training data").
- **Dashboard UI**: dark, dense fintech-style dashboard (HTML/CSS/vanilla JS +
  Chart.js) with a welcome/overview screen (KPIs + charts), a searchable
  agreement explorer with drill-down modal, a scenario lab, and the chat panel.

## Setup

### 1. Install Ollama and pull the model (one-time)
```bash
# https://ollama.com/download
ollama pull llama3.1
ollama serve      # usually starts automatically as a background service
```

### 2. Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate   # optional but recommended
pip install -r requirements.txt

# Train all models and generate the dashboard/chat artifacts (~2-5 min):
python models/train_pipeline.py

# Start the API (also serves the frontend at the same address):
python app.py
```

The API + dashboard will be available at **http://localhost:5000**.

### 3. Frontend (already served by Flask)
Just open **http://localhost:5000** in your browser. If you prefer to serve the
frontend separately (e.g. via VS Code Live Server), it will still talk to the
API at `http://localhost:5000` — see `API_BASE` at the top of `frontend/js/api.js`.

## Re-training on new data
Replace `backend/data/Analytics_Case_Study_Dataset.xlsx` with a new file
(same column schema) and re-run:
```bash
python models/train_pipeline.py
```
Then restart `app.py` (or just refresh the dashboard — the Flask dev server
auto-reloads on file changes, but `outputs/*.json` are loaded once at startup).

## Notes
- If `ollama_available` shows **offline** in the sidebar, the chat endpoint will
  return a clear, non-crashing message explaining how to start Ollama — the rest
  of the dashboard works independently of Ollama.
- All chat answers are explicitly grounded: the backend assembles a compact
  context block (portfolio summary, plus any specific agreement / segment /
  region / scenario the user's message mentions, pulled from both the modelled
  `outputs/` and the raw uploaded dataset) and instructs the model not to invent
  numbers outside that context.
