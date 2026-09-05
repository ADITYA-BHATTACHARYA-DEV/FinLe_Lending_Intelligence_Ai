# epic8 - Lending Intelligence & Finance
# Dynamic Residual Pricing & Lending Strategy Engine
<img width="1877" height="890" alt="Screenshot 2026-09-05 172740" src="https://github.com/user-attachments/assets/30d2f3ea-6b91-4cfa-9d70-abf4ca4fdda6" />

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


<img width="1882" height="871" alt="Screenshot 2026-09-05 172756" src="https://github.com/user-attachments/assets/24721aed-9129-4df3-ab60-a47c17070d1f" />



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



<img width="1906" height="948" alt="Screenshot 2026-09-05 172817" src="https://github.com/user-attachments/assets/06c13763-6876-4700-9ee3-325bd7de502f" />

- **Layer 1 — Market Time-Series Engine**: monthly recovery-ratio series (macro
  proxy) modelled with SARIMAX and a lagged-LightGBM comparison model; feeds the
  `Market_Volatility_Score` used everywhere downstream. Forecasts saved to
  `outputs/market_timeseries.json`.
  <img width="1677" height="453" alt="Screenshot 2026-09-05 150134" src="https://github.com/user-attachments/assets/dcc1f07a-2060-4b67-8768-a4683afa6a7d" />

- **Stage 1 — Origination Engine**: LightGBM quantile regression (P10/P50/P90)
  predicting the asset's base depreciation rate **λ** from information known at
  loan origination only (no post-seizure data leakage).
  <img width="1658" height="587" alt="Screenshot 2026-09-05 150609" src="https://github.com/user-attachments/assets/a07293c3-a8ab-4542-8fdd-7f7c02ee209c" />

- **Stage 2 — Liquidation Engine**: LightGBM + a Keras/TensorFlow deep neural
  network (blended into a weighted ensemble) predicting the net recovery value
  using post-seizure condition/yard/challan/RC data plus the Stage-1 λ as a feature.
<img width="1667" height="585" alt="Screenshot 2026-09-05 150314" src="https://github.com/user-attachments/assets/a3b6d95b-2506-4b41-8940-2404f6e4e53d" />


  
- **Layer 2 — Decay Engine**: a genuine parametric curve `V(t) = AssetCost·e^(−λt)`
  calibrated per agreement, producing 12/24/36-month residual value forecasts.

  <img width="985" height="571" alt="Screenshot 2026-09-05 150405" src="https://github.com/user-attachments/assets/8d2da360-5f70-4d24-9196-bedbfeb15617" />

- **Layer 3 — Scenario Simulator**: EV-adoption, fuel-price and inflation shocks
  are applied directly to λ (not the output value), then propagated back through
  the same decay equation and risk score — Baseline / Fuel Spike / EV Surge /
  High Inflation / Combined Stress.



  <img width="1001" height="597" alt="Screenshot 2026-09-05 170016" src="https://github.com/user-attachments/assets/d522216f-79a4-41c4-98e1-d910aa255ebe" />


- **Layer 4 — Multi-Factor Risk Scoring**: `CatBoostClassifier` (+ TreeSHAP) gives
  a high-loss probability; combined with explicit Asset-Risk and Loan-Risk
  sub-scores and the market volatility score into a weighted composite
  `Residual_Risk_Score` (0–100), banded Low/Medium/High/Critical.



<img width="1632" height="607" alt="Screenshot 2026-09-05 170056" src="https://github.com/user-attachments/assets/0a2250e5-ed68-46eb-bdfd-c3948ee90a12" />



  
- **Layer 5 — Constrained Lending Optimizer**: `scipy.optimize` (SLSQP) solves a
  real constrained profit-maximization per risk-band/segment cluster — subject to
  an LTV cap, an implied-LGD cap, and a minimum rate premium — rather than a flat
  heuristic rule table.





  <img width="972" height="597" alt="Screenshot 2026-09-05 170120" src="https://github.com/user-attachments/assets/9d522092-b3ad-4a26-af5d-4b0f3eb4bf63" />

- **Layer 6 — Explainable AI & Copilot**: CatBoost TreeSHAP values feed both the
  dashboard's global feature-importance chart and a **local Ollama (llama3.1)**
  chat assistant, grounded in the modelled outputs *and* the raw uploaded
  training data (so it can answer both "what does the model say about ASSET_123"
  and "what was ASSET_123's raw Cibil score in the training data").


  <img width="1876" height="892" alt="Screenshot 2026-09-05 201653" src="https://github.com/user-attachments/assets/c2f1c104-abda-4bf6-89f9-14c9a6566d4b" />

- **Dashboard UI**: dark, dense fintech-style dashboard (HTML/CSS/vanilla JS +
  Chart.js) with a welcome/overview screen (KPIs + charts), a searchable
  agreement explorer with drill-down modal, a scenario lab, and the chat panel.





<img width="1910" height="972" alt="Screenshot 2026-09-05 172850" src="https://github.com/user-attachments/assets/60dd5a8e-4596-46aa-b1ad-64661973d7fc" />

## Setup

### 1. Install Ollama and pull the model (one-time)
```bash
# https://ollama.com/download
ollama pull llama3.1
ollama serve      # usually starts automatically as a background service
```


<img width="1625" height="906" alt="Screenshot 2026-09-05 201333" src="https://github.com/user-attachments/assets/6c49fdd8-8662-4ba0-9fb8-a2d81c50ed4b" />


<img width="1892" height="906" alt="Screenshot 2026-09-05 201537" src="https://github.com/user-attachments/assets/e53212ee-d397-46fc-82a9-133c95124423" />


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

<img width="1625" height="906" alt="Screenshot 2026-09-05 201333" src="https://github.com/user-attachments/assets/7a961998-0c15-4818-ae9a-7cd5ea988cb7" />

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





<img width="1633" height="911" alt="Screenshot 2026-09-05 173006" src="https://github.com/user-attachments/assets/16dd68e6-87ec-4622-ab5a-e5d0d6e19b5f" />






## Notes
- If `ollama_available` shows **offline** in the sidebar, the chat endpoint will
  return a clear, non-crashing message explaining how to start Ollama — the rest
  of the dashboard works independently of Ollama.
- All chat answers are explicitly grounded: the backend assembles a compact
  context block (portfolio summary, plus any specific agreement / segment /
  region / scenario the user's message mentions, pulled from both the modelled
  `outputs/` and the raw uploaded dataset) and instructs the model not to invent
  numbers outside that context.
