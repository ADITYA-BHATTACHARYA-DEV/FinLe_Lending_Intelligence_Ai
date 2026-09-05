"""
TVS Credit EPIC 8 - Dynamic Residual Pricing & Lending Strategy Engine
Flask API server.

Serves:
  - the trained-model dashboard data (from backend/outputs/*.json + agreements.csv)
  - a searchable/filterable agreement explorer
  - a chat endpoint that grounds a local Ollama (llama3.1) model in the estimated
    outputs AND the raw training dataset, so it can discuss both.

Run:
    cd backend
    python app.py
Then open frontend/index.html in a browser (or let this server serve it directly
at http://localhost:5000/).
"""


import os
import re
import json
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

import ollama_client
from flask import Flask, request, jsonify

from ollama_client import chat as ollama_chat, is_ollama_available
BASE_DIR = os.path.dirname(os.path.abspath(__file__))              # backend/
OUT_DIR = os.path.join(BASE_DIR, "outputs")
DATA_PATH = os.path.join(BASE_DIR, "data", "Analytics_Case_Study_Dataset.xlsx")
FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend")

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
CORS(app)

# ---------------------------------------------------------------------------
# Load all artifacts once at startup
# ---------------------------------------------------------------------------
print("[app] loading artifacts from outputs/ ...")

agreements_df = pd.read_csv(os.path.join(OUT_DIR, "agreements.csv"))
agreements_df["Risk_Band"] = agreements_df["Risk_Band"].astype(str)

with open(os.path.join(OUT_DIR, "portfolio_summary.json")) as f:
    portfolio_summary = json.load(f)
with open(os.path.join(OUT_DIR, "segment_risk.json")) as f:
    segment_risk = json.load(f)
with open(os.path.join(OUT_DIR, "region_risk.json")) as f:
    region_risk = json.load(f)
with open(os.path.join(OUT_DIR, "scenario_results.json")) as f:
    scenario_results = json.load(f)
with open(os.path.join(OUT_DIR, "model_comparison.json")) as f:
    model_comparison = json.load(f)
with open(os.path.join(OUT_DIR, "feature_importance.json")) as f:
    feature_importance = json.load(f)
with open(os.path.join(OUT_DIR, "training_history.json")) as f:
    training_history = json.load(f)
with open(os.path.join(OUT_DIR, "feature_cols.json")) as f:
    feature_cols = json.load(f)
market_timeseries_path = os.path.join(OUT_DIR, "market_timeseries.json")
market_timeseries = json.load(open(market_timeseries_path)) if os.path.exists(market_timeseries_path) else {}

shap_values = np.load(os.path.join(OUT_DIR, "shap_values.npy"))

# Raw training/uploaded dataset - kept separately so the chat assistant can also
# reason about "sideways" raw data (things not part of the modelled/derived output),
# e.g. raw Cust Net Salary distributions, Pincode Tier mix, employment types, etc.
raw_df = pd.read_excel(DATA_PATH)
raw_df = raw_df.rename(columns={"Traiffic Challan Amount": "Traffic Challan Amount"})

print(f"[app] loaded {len(agreements_df)} agreements, {len(raw_df)} raw rows. Ready.")

# ---------------------------------------------------------------------------
# Dashboard endpoints
# ---------------------------------------------------------------------------
@app.route("/api/dashboard")
def api_dashboard():
    return jsonify({
        "portfolio_summary": portfolio_summary,
        "segment_risk": segment_risk,
        "region_risk": region_risk,
        "scenario_results": scenario_results,
        "model_comparison": model_comparison,
        "feature_importance": feature_importance,
        "training_history": training_history,
        "market_timeseries": market_timeseries,
        "ollama_available": ollama_client.is_ollama_available(),
    })


@app.route("/api/market-timeseries")
def api_market_timeseries():
    return jsonify(market_timeseries)


@app.route("/api/agreements")
def api_agreements():
    search = request.args.get("search", "").strip()
    risk_band = request.args.get("risk_band", "").strip()
    asset_model = request.args.get("asset_model", "").strip()
    sort_by = request.args.get("sort_by", "Residual_Risk_Score")
    sort_dir = request.args.get("sort_dir", "desc")
    limit = int(request.args.get("limit", 25))
    offset = int(request.args.get("offset", 0))

    df = agreements_df
    if search:
        df = df[df["Agmt Id"].str.contains(search, case=False, na=False)]
    if risk_band and risk_band != "All":
        df = df[df["Risk_Band"] == risk_band]
    if asset_model and asset_model != "All":
        df = df[df["Asset Model"] == asset_model]

    if sort_by in df.columns:
        df = df.sort_values(sort_by, ascending=(sort_dir == "asc"))

    total = len(df)
    page = df.iloc[offset:offset + limit]
    return jsonify({
        "total": int(total),
        "rows": json.loads(page.to_json(orient="records")),
    })


@app.route("/api/agreement/<agmt_id>")
def api_agreement_detail(agmt_id):
    row_idx = agreements_df.index[agreements_df["Agmt Id"] == agmt_id]
    if len(row_idx) == 0:
        return jsonify({"error": "not found"}), 404
    idx = int(row_idx[0])
    row = agreements_df.iloc[idx].to_dict()

    row_shap = pd.Series(shap_values[idx], index=feature_cols).sort_values(key=lambda s: s.abs(), ascending=False)
    top_drivers = [{"feature": f, "impact": round(float(row_shap[f]), 4)} for f in row_shap.head(5).index]

    raw_row = raw_df[raw_df["Agmt Id"] == agmt_id]
    raw_extra = json.loads(raw_row.to_json(orient="records"))[0] if len(raw_row) else {}

    return jsonify({"agreement": row, "top_risk_drivers": top_drivers, "raw_record": raw_extra})


@app.route("/api/filters")
def api_filters():
    return jsonify({
        "risk_bands": ["All", "Low", "Medium", "High", "Critical"],
        "asset_models": ["All"] + sorted(agreements_df["Asset Model"].dropna().unique().tolist()),
    })

# @app.route("/api/chat", methods=["POST"])
# def api_chat():
#     try:
#         body = request.get_json(silent=True) or {}

#         message = str(body.get("message", "")).strip()
#         history = body.get("history", [])

#         if not message:
#             return jsonify({
#                 "reply": "Please enter a message."
#             }), 400

#         if not isinstance(history, list):
#             history = []

#         # Keep the conversation reasonably small.
#         history = history[-10:]

#         system_prompt = """
# You are EPIC Credit Copilot for TVS Credit.

# You help analysts understand residual pricing,
# vehicle residual risk, recovery, lending terms,
# LTV, pricing, tenure, portfolio risk and model outputs.

# Be concise and analytical.

# When discussing an agreement, clearly separate:
# - observed/modelled facts
# - risk interpretation
# - lending recommendation

# Do not invent values that are not present in the conversation.
# """

#         messages = [
#             {
#                 "role": "system",
#                 "content": system_prompt.strip()
#             }
#         ]

#         # Only accept valid chat roles.
#         for item in history:
#             if not isinstance(item, dict):
#                 continue

#             role = item.get("role")
#             content = item.get("content")

#             if role not in ("user", "assistant"):
#                 continue

#             if not content:
#                 continue

#             messages.append({
#                 "role": role,
#                 "content": str(content)
#             })

#         # The current user message.
#         messages.append({
#             "role": "user",
#             "content": message
#         })

#         reply = ollama_chat(
#             messages,
#             temperature=0.4,
#             max_tokens=500
#         )

#         return jsonify({
#             "reply": reply
#         })

#     except Exception as e:
#         print("CHAT ERROR:", repr(e))

#         return jsonify({
#             "reply": (
#                 "The Copilot encountered an error while "
#                 f"processing your request: {e}"
#             )
#         }), 500
# ---------------------------------------------------------------------------
# Chat: grounds Ollama (llama3.1) in both the modelled outputs and raw data
# ---------------------------------------------------------------------------
AGMT_PATTERN = re.compile(r"ASSET[_\-]?\d+", re.IGNORECASE)


def find_mentioned_agreement(text):
    m = AGMT_PATTERN.search(text)
    if not m:
        return None
    candidate = m.group(0).upper().replace("-", "_")
    if "_" not in candidate:
        candidate = "ASSET_" + re.sub(r"\D", "", candidate)
    match = agreements_df[agreements_df["Agmt Id"].str.upper() == candidate]
    return match.iloc[0]["Agmt Id"] if len(match) else None


def find_mentioned_segment(text):
    for model in agreements_df["Asset Model"].dropna().unique():
        if model.lower() in text.lower():
            return model
    return None


def find_mentioned_region(text):
    for region in agreements_df["Cust Region"].dropna().unique():
        if re.search(rf"\b{re.escape(str(region))}\b", text, re.IGNORECASE):
            return region
    return None


def build_context(user_message):
    """Assemble a compact, grounded context block from outputs + raw data,
    tailored to what the user is asking about."""
    ctx_parts = [
        "PORTFOLIO SUMMARY (modelled output):",
        json.dumps(portfolio_summary, indent=None),
    ]

    agmt_id = find_mentioned_agreement(user_message)
    if agmt_id:
        row_idx = agreements_df.index[agreements_df["Agmt Id"] == agmt_id][0]
        row = agreements_df.iloc[row_idx].to_dict()
        row_shap = pd.Series(shap_values[row_idx], index=feature_cols) \
            .sort_values(key=lambda s: s.abs(), ascending=False)
        drivers = ", ".join(f"{f} ({row_shap[f]:+.2f})" for f in row_shap.head(4).index)
        raw_row = raw_df[raw_df["Agmt Id"] == agmt_id]
        raw_extra = raw_row.to_dict(orient="records")[0] if len(raw_row) else {}
        ctx_parts.append(f"\nSPECIFIC AGREEMENT {agmt_id} (modelled output): {json.dumps(row, default=str)}")
        ctx_parts.append(f"SHAP risk drivers for {agmt_id}: {drivers}")
        ctx_parts.append(f"RAW TRAINING RECORD for {agmt_id} (as originally uploaded): {json.dumps(raw_extra, default=str)}")

    segment = find_mentioned_segment(user_message)
    if segment:
        seg_row = next((s for s in segment_risk if s["asset_model"] == segment), None)
        if seg_row:
            ctx_parts.append(f"\nSEGMENT DATA for {segment} (modelled output): {json.dumps(seg_row)}")
        raw_seg = raw_df[raw_df["Asset Model"] == segment]
        if len(raw_seg):
            ctx_parts.append(
                f"RAW DATA for {segment} segment: count={len(raw_seg)}, "
                f"avg_asset_cost={raw_seg['Asset Cost At Disbursal'].mean():.0f}, "
                f"avg_ltv={raw_seg['LTV'].mean():.3f}, "
                f"fuel_types={raw_seg['Asset Fuel Type'].value_counts().to_dict()}"
            )

    region = find_mentioned_region(user_message)
    if region:
        reg_row = next((r for r in region_risk if r["region"] == region), None)
        if reg_row:
            ctx_parts.append(f"\nREGION DATA for {region} (modelled output): {json.dumps(reg_row)}")

    if any(k in user_message.lower() for k in ["scenario", "stress", "inflation", "ev adoption", "fuel price"]):
        ctx_parts.append(f"\nSCENARIO SIMULATION RESULTS: {json.dumps(scenario_results)}")

    if any(k in user_message.lower() for k in ["model", "accuracy", "rmse", "mape", "auc", "performance"]):
        ctx_parts.append(f"\nMODEL PERFORMANCE METRICS: {json.dumps(model_comparison)}")

    if any(k in user_message.lower() for k in ["driver", "feature", "why", "explain", "shap", "important"]):
        ctx_parts.append(f"\nTOP GLOBAL RISK DRIVERS (SHAP): {json.dumps(feature_importance)}")

    if any(k in user_message.lower() for k in ["decay", "lambda", "depreciation", "curve", "horizon", "forecast"]):
        if agmt_id:
            row = agreements_df.iloc[row_idx].to_dict() if 'row_idx' in dir() else None
        ctx_parts.append(
            "\nDECAY ENGINE NOTE: Residual value forecasts use V(t) = AssetCost * exp(-lambda*t). "
            "'Lambda_P50' is the Stage-1 origination-time predicted decay rate (with Lambda_P10/P90 "
            "as an 80% uncertainty band), and 'Calibrated_Lambda' is the value actually used for "
            "12/24/36-month forecasts, calibrated to match the Stage-2 liquidation model's prediction."
        )

    if any(k in user_message.lower() for k in ["macro", "time series", "time-series", "sarimax", "market trend"]):
        ctx_parts.append(f"\nMARKET TIME-SERIES (Layer 1 - SARIMAX & Lagged LightGBM forecasts): "
                          f"{json.dumps(market_timeseries)[:1500]}")

    if any(k in user_message.lower() for k in ["optimizer", "constrained", "ltv cap", "lgd cap", "layer 5"]):
        ctx_parts.append(
            "\nLENDING OPTIMIZER NOTE: Recommended LTV/Rate/Tenure come from a constrained "
            "profit-maximization (scipy SLSQP) per risk-band cluster, subject to an LTV cap, an "
            "implied-LGD cap, and a minimum rate premium - not a flat rule."
        )

    return "\n".join(ctx_parts)


SYSTEM_PROMPT = """You are the AI Lending Copilot for TVS Credit's Dynamic Residual Pricing &
Lending Strategy Engine. You help underwriting and business teams understand:
  - predicted residual/resale values of financed assets,
  - residual risk scores and risk bands (Low/Medium/High/Critical),
  - recommended LTV, pricing and tenure adjustments,
  - scenario/stress-test results (EV adoption, fuel price, inflation shocks),
  - and the underlying raw training data used to build these models.

Rules:
  - Only use numbers given to you in the CONTEXT block below. Never invent figures.
  - If the answer isn't in the context, say so plainly and suggest what to search for
    (e.g. "ask me about a specific Agmt Id like ASSET_123").
  - Be concise, business-friendly, and use bullet points for multi-part answers.
  - Currency is Indian Rupees (Rs.).
"""


@app.route("/api/chat", methods=["POST"])
def api_chat():
    body = request.get_json(force=True)
    user_message = body.get("message", "")
    history = body.get("history", [])  # list of {role, content}

    context = build_context(user_message)

    messages = [{"role": "system", "content": SYSTEM_PROMPT + "\n\nCONTEXT:\n" + context}]
    messages.extend(history[-6:])  # keep last few turns for continuity
    messages.append({"role": "user", "content": user_message})

    reply = ollama_client.chat(messages)
    return jsonify({"reply": reply, "context_used": context[:2000]})


@app.route("/api/health")
def api_health():
    return jsonify({
        "status": "ok",
        "ollama_available": ollama_client.is_ollama_available(),
        "ollama_model": ollama_client.OLLAMA_MODEL,
        "agreements_loaded": int(len(agreements_df)),
    })







# ---------------------------------------------------------------------------
# Serve frontend (optional convenience - you can also just open index.html directly)
# ---------------------------------------------------------------------------
@app.route("/")
def serve_index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory(FRONTEND_DIR, path)








# ---------------------------------------------------------------------------
# AI Finance Controller - multi-source reconciliation, tax-line matching,
# cash forecasting, and the recovery-settlement reconciler that ties back
# into the main lending/residual-pricing model above.
# ---------------------------------------------------------------------------
FINANCE_OUT_DIR = os.path.join(OUT_DIR, "finance")


def _load_finance_artifact(name):
    path = os.path.join(FINANCE_OUT_DIR, name)
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


@app.route("/api/finance/summary")
def api_finance_summary():
    """
    API endpoint that aggregates and returns all major finance-controller 
    artifacts, including ledger reconciliations, tax matching, cash forecasts, 
    recovery reconciliations, and the AI liquidation controller results.
    """
    reconciliation = _load_finance_artifact("reconciliation_result.json")

    if reconciliation is None:
        return jsonify({
            "has_run": False
        })

    return jsonify({
        "has_run": True,
        "reconciliation": reconciliation,
        "tax_lines": _load_finance_artifact("tax_line_result.json"),
        "cash_forecast": _load_finance_artifact("cash_forecast.json"),
        "recovery_reconciliation": _load_finance_artifact("recovery_reconciliation.json"),
        "liquidation_controller": _load_finance_artifact("liquidation_controller.json")
    })


@app.route("/api/finance/run", methods=["POST"])
def api_finance_run():
    """Regenerates the synthetic 50+ record batch and re-runs all four
    reconciliation layers fresh (deterministic matching, no LLM in the loop)."""
    from finance_controller import reconcile as finance_reconcile
    finance_reconcile.run_all()
    return api_finance_summary()


FINANCE_SYSTEM_PROMPT = """You are the Settlement Q&A agent inside TVS Credit's AI Finance Controller.
You answer questions about a just-completed reconciliation batch: ledger-vs-bank matching,
GST tax-line matching on auction settlements, forward cash forecasts, and how the lending
model's predicted recovery compares against actual settlement amounts.

Rules:
  - Only use the numbers given to you in the CONTEXT block. Never invent a match rate,
    exception count, or amount that isn't present there.
  - If asked about a specific loan_id or Agmt Id not present in the context, say you don't
    have that record rather than guessing.
  - Be concise and precise - this is a finance-ops tool, not a general chat assistant.
  - Always distinguish between "matched" (resolved automatically) and "exception"
    (needs human review) - never blur the two.
"""


@app.route("/api/finance/chat", methods=["POST"])
def api_finance_chat():
    body = request.get_json(force=True)
    user_message = body.get("message", "")
    history = body.get("history", [])

    reconciliation = _load_finance_artifact("reconciliation_result.json")
    tax_lines = _load_finance_artifact("tax_line_result.json")
    cash_forecast = _load_finance_artifact("cash_forecast.json")
    recovery = _load_finance_artifact("recovery_reconciliation.json")

    if reconciliation is None:
        reply = ("No reconciliation batch has been run yet. Click 'Run 50+ Record Batch Loop' "
                  "first, then ask me about the results.")
        return jsonify({"reply": reply})

    context = json.dumps({
        "ledger_vs_bank_reconciliation": reconciliation,
        "tax_line_matching": tax_lines,
        "cash_forecast": cash_forecast,
        "recovery_vs_actual_settlement": recovery,
    }, default=str)[:6000]  # keep the context bounded

    messages = [{"role": "system", "content": FINANCE_SYSTEM_PROMPT + "\n\nCONTEXT:\n" + context}]
    messages.extend(history[-6:])
    messages.append({"role": "user", "content": user_message})

    reply = ollama_client.chat(messages)
    return jsonify({"reply": reply})




if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
