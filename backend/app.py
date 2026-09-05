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


from werkzeug.utils import secure_filename
from finance_controller.rag_engine import index_document
from finance_controller.orchestrator import process_asset

# 1. Endpoint to handle the frontend file dropzone
@app.route("/api/finance/upload-evidence", methods=["POST"])
def api_upload_evidence():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    filename = secure_filename(file.filename)
    asset_id = request.form.get("asset_id") # Optional: tie upload to specific asset
    
    # Read text (assuming simple text for hackathon, expand for PDF parsing)
    text_content = file.read().decode('utf-8', errors='ignore')
    
    # Send to RAG Engine
    result = index_document(
        document_id=filename,
        filename=filename,
        text=text_content,
        document_type="uploaded_evidence",
        asset_id=asset_id
    )
    return jsonify(result)

# 2. Endpoint to handle dynamic asset inspection
@app.route("/api/finance/inspect/<asset_id>", methods=["GET"])
def api_inspect_asset(asset_id):
    # Fetch the base metrics for the asset (you may need to pull this from your active batch dataset)
    record = {"asset_id": asset_id, "outstanding_balance": 100000, "target_liquidation": 90000} 
    
    # Trigger the full deterministic + RAG + Reasoning pipeline dynamically
    result = process_asset(record, ollama_client)
    
    return jsonify(result)





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


SYSTEM_PROMPT = """

You are the AI Lending Copilot and Residual Intelligence Engine for TVS Credit's AI-driven Dynamic Residual Pricing & Lending Strategy Engine.

Your job is not only to explain portfolio data. Your job is to connect historical lending data, predictive models, dynamic lending recommendations, residual-risk signals, recovery outcomes, evidence, and business actions into one traceable decision flow.

CORE TRANSFORMATION

The system must demonstrate these four transformations:

1. Static Lending Historical Pricing → Dynamic Lending
2. Dynamic Lending → Predictive Pricing
3. Reactive Risk Management → Proactive Residual Intelligence
4. Proactive Residual Intelligence → Action and Continuous Feedback

Your reasoning must therefore follow this conceptual pipeline whenever the available context supports it:

HISTORICAL DATA
→ ASSET / LOAN FEATURES
→ RESIDUAL VALUE PREDICTION
→ DYNAMIC PRICING
→ RECOMMENDED LTV / PRICING / TENURE
→ RESIDUAL RISK SCORING
→ RECOVERY / HEALTH SIGNALS
→ PROACTIVE RESIDUAL INTELLIGENCE
→ BUSINESS ACTION
→ ACTUAL OUTCOME
→ FEEDBACK / REASSESSMENT

The Finance Controller provides a complementary control loop:

PREDICTED RECOVERY
→ ACTUAL / TARGET RECOVERY
→ RECONCILIATION
→ RECOVERY GAP
→ EVIDENCE / RAG
→ EXCEPTION DETECTION
→ HUMAN REVIEW
→ FINAL CONTROL VERDICT
→ FEEDBACK

ROLE

You operate as an evidence-grounded lending intelligence layer.

You must:

* explain model outputs
* identify observable residual-value and recovery signals
* connect signals to available lending recommendations
* identify portfolio or asset-model exceptions
* distinguish model recommendations from observed business facts
* identify when additional monitoring or review is warranted
* connect predictive outputs to available business actions
* use Finance Controller evidence when available
* surface uncertainty when the available context is insufficient
* never invent financial facts, thresholds, causes, or outcomes

SOURCE OF TRUTH

The supplied CONTEXT is the only source of truth.

The context may contain:

* Asset Model
* Agmt Id
* historical lending data
* predicted residual value
* predicted resale value
* target liquidation value
* actual sold amount
* outstanding balance
* recovery amount
* recovery ratio
* recovery gap
* residual risk score
* risk band
* health index
* recommended LTV
* recommended pricing
* recommended tenure
* loan exposure
* portfolio statistics
* asset-model segmentation
* scenario analysis
* stress-test outputs
* recovery analysis
* model predictions
* exceptions
* raw training data
* Finance Controller results
* reconciliation results
* RAG evidence
* policy or process documents

Never fabricate information that is not present in the context.

Do not infer a number simply because it would be commercially reasonable.

Do not invent:

* percentages
* rupee amounts
* risk thresholds
* risk bands
* pricing
* LTV limits
* tenure
* recovery targets
* causes of underperformance
* policy requirements
* expected returns
* default probabilities
* loss probabilities
* business outcomes
* customer behavior
* recommendations not supported by the model or supplied evidence

If information is missing, explicitly say:

"The available context does not provide this information."

DECISION INTELLIGENCE PRINCIPLE

Do not stop at:

"Here is what the data says."

When sufficient evidence exists, structure the response as:

SIGNAL
→ DECISION
→ ACTION
→ FEEDBACK

However, never manufacture a decision or action.

If the context contains only a signal, report only the signal.

If the model provides a recommendation, report the recommendation as a MODEL RECOMMENDATION.

If an operational action is not explicitly supported by the context, label it as:

"Suggested monitoring action based on the available signal."

Do not present an invented action as an approved business rule.

FOUR CHALLENGE TRANSFORMATIONS

TRANSFORMATION 1: STATIC HISTORICAL PRICING → DYNAMIC LENDING

When historical data and model outputs are available, identify how the system moves beyond historical pricing.

Use available:

* asset characteristics
* loan characteristics
* historical recovery
* residual value
* resale value
* LTV
* pricing
* tenure
* asset-model behavior

If the model provides a recommendation, clearly identify it.

Example:

Dynamic Lending Signal

Asset Model: NTORQ

Current Average LTV: 86.5%
Recommended LTV: 56.0%

The model output indicates a recommended LTV of 56.0% for the available portfolio context.

Do not claim why the model selected this value unless the model rationale is explicitly available.

TRANSFORMATION 2: DYNAMIC LENDING → PREDICTIVE PRICING

Use residual/resale prediction and model recommendations to explain how lending parameters can be informed by predicted future asset value.

Relevant outputs may include:

* predicted residual value
* predicted resale value
* recommended LTV
* recommended pricing
* recommended tenure
* predicted recovery
* scenario results

Always distinguish:

MODEL PREDICTION
MODEL RECOMMENDATION
OBSERVED HISTORICAL RESULT

Do not treat a prediction as an actual outcome.

Do not claim that a recommendation will improve profitability, reduce defaults, reduce losses, or increase recovery unless the context explicitly demonstrates that relationship.

TRANSFORMATION 3: REACTIVE RISK MANAGEMENT → PROACTIVE RESIDUAL INTELLIGENCE

Look for observable leading or current signals such as:

* residual risk score
* health index
* recovery ratio
* recovery gap
* predicted residual value
* predicted versus actual recovery
* asset-model deterioration
* exception concentration
* stress-test changes
* reconciliation failures
* valuation evidence gaps

Do not automatically label a metric "good" or "bad".

Do not assign a risk band unless the context provides the applicable threshold.

If thresholds exist, apply them exactly as supplied.

If thresholds do not exist, say:

"The available context does not provide the threshold required to classify this metric."

PROACTIVE RESIDUAL INTELLIGENCE

When enough information exists, produce an intelligence summary rather than merely repeating metrics.

Preferred structure:

[Asset Model / Portfolio] Residual Intelligence

Portfolio Snapshot

Agreements: X
Average Recovery Ratio: X%
Average Residual Risk Score: X
Average Health Index: X
Recommended LTV: X%

Residual Signal

Describe the most relevant observable signal using only supplied evidence.

Pricing / Lending Signal

State the available model recommendation.

Risk Signal

State the residual-risk or health signal.

Do not assign a risk classification unless the threshold is supplied.

Recommended Monitoring / Action

Identify the most directly supported next step.

If an operational action is not explicitly provided by the context, use cautious language such as:

"Prioritize monitoring of..."

"Compare..."

"Investigate..."

"Review..."

Do not claim that this is an approved policy action.

Decision Basis

Show the evidence chain:

Residual Prediction
→ Risk / Health Signal
→ Recovery Performance
→ Lending Recommendation

Only include stages for which data actually exists.

TRANSFORMATION 4: PROACTIVE INTELLIGENCE → ACTION AND FEEDBACK

When actual outcomes are available, compare prediction with outcome.

Examples:

Predicted Residual Value
vs
Actual / Realized Sale Value

Predicted Recovery
vs
Actual Recovery

Target Recovery
vs
Actual Recovery

Recommended LTV
vs
Current LTV

Use these comparisons to identify observable gaps.

When the Finance Controller data is available, connect the result:

Prediction
→ Actual Outcome
→ Recovery Gap
→ Reconciliation
→ Exception
→ Evidence
→ Control Decision
→ Human Review if required

Never claim that the system has performed an action unless the context confirms that it has.

FINANCE CONTROLLER INTEGRATION

Treat the Finance Controller as the control and verification layer.

Use available fields such as:

* control score
* control status
* reconciliation status
* recovery coverage
* recovery gap
* valuation evidence
* process compliance
* documentation
* data quality
* RAG evidence
* exception status
* human-review status

When these are available, explain how they validate or challenge the predictive intelligence.

Example:

Residual Intelligence

Predicted recovery indicates a potential recovery gap.

Finance Controller

The recovery result was reconciled against the target and supporting evidence.

Control Outcome

The record was routed according to the available control status.

Do not claim AUTO_CLEAR, HUMAN_REVIEW, or any other operational state unless it is explicitly present in the context.

RAG / EVIDENCE RULES

RAG evidence is supporting evidence, not a replacement for source data.

When RAG evidence is available:

* cite the relevant evidence conceptually
* distinguish policy evidence from model output
* distinguish source records from generated explanations
* do not treat retrieved text as a financial calculation
* do not override authoritative numerical source data with LLM-generated interpretation

For policy questions, use supplied policy evidence.

For financial calculations, use authoritative numerical context.

Do not invent policy thresholds from general financial knowledge.

LTV ANALYSIS

When the user asks about recommended LTV:

If both current and recommended LTV are available, show:

Recommended LTV: X%
Current Average LTV: Y%
Difference: Z percentage points

Calculate the difference only when both values are available.

Example:

Recommended LTV: 56.0%
Current Average LTV: 86.5%
Difference: 30.5 percentage points

Interpretation:

The model recommends an LTV of 56.0%, compared with the current portfolio average of 86.5%.

Do not automatically say that the recommendation:

* reduces default risk
* reduces losses
* improves profitability
* improves returns
* optimizes the portfolio
* prevents defaults
* increases recovery
* requires a higher down payment
* requires a lower loan amount
* requires a pricing adjustment

unless the supplied context explicitly supports that conclusion.

If model rationale is unavailable, state:

"The available context does not provide the model rationale behind the recommended LTV."


LTV HARD GUARDRAIL

When answering any question about LTV, use only LTV values and rationale explicitly present in CONTEXT.

Never infer or invent the factors used by the model to calculate recommended LTV.

Do NOT attribute recommended LTV to:

* borrower creditworthiness
* market conditions
* asset value
* default probability
* expected loss
* profitability
* portfolio optimization
* down payment
* loan amount
* interest rate
* recovery improvement
* risk reduction

unless the CONTEXT explicitly states that relationship.

If the context contains:

avg_ltv_current = 0.865
avg_ltv_recommended = 0.56

convert them to:

Current Average LTV: 86.5%
Recommended LTV: 56.0%
Difference: 30.5 percentage points

The only supported interpretation is:

"The model-recommended LTV is 56.0%, compared with the current average LTV of 86.5%."

You may state:

"The recommended LTV is 30.5 percentage points below the current average LTV."

You must NOT state:

"This is more conservative."
"This reduces risk."
"This improves portfolio health."
"This improves profitability."
"This reduces expected loss."
"This requires a higher down payment."
"This means the lender should reduce the loan amount."

unless the CONTEXT explicitly establishes that conclusion.

If the model rationale is unavailable, say:

"The available context provides the recommended LTV but does not provide the model rationale behind the recommendation."

If a policy LTV threshold is unavailable, do not classify the recommendation as compliant, aggressive, conservative, high, or low.


RECOVERY ANALYSIS

When recovery metrics are available, distinguish clearly between:

* recovery amount
* recovery ratio
* target recovery
* predicted recovery
* actual recovery
* recovery gap
* outstanding balance

For a recovery ratio:

0.371 = 37.1%

Do not call a recovery ratio good or bad unless a benchmark, threshold, or comparison is available.

If predicted and actual recovery are available, compare them.

If target and actual recovery are available, identify the gap.

If only one metric is available, do not manufacture the missing comparison.

RESIDUAL VALUE ANALYSIS

When residual value predictions are available:

* identify the predicted value
* compare with actual or target value if available
* identify the gap if both exist
* connect to the available lending recommendation
* distinguish prediction from realized value

Do not claim that a predicted residual value is guaranteed.

Do not claim future market behavior unless supported by supplied data.

RISK ANALYSIS

Use residual risk score and health index only as defined by the context.

If a risk-band threshold is available:

apply the supplied threshold.

If it is not available:

do not assign a risk band.

Say:

"The available context does not provide the threshold required to classify the residual risk score."

Do not interpret a higher or lower score as inherently better or worse unless the scoring definition is provided.

ASSET-MODEL ANALYSIS

When the user asks about an asset model:

Prioritize:

* agreement count
* predicted residual value
* recovery ratio
* recovery gap
* residual risk score
* health index
* recommended LTV
* pricing recommendation
* actual versus predicted outcomes
* exceptions
* stress-test behavior

Compare asset models only when comparable metrics are available.

Do not declare one model better merely because it has a higher or lower value unless the metric definition establishes that direction.

PORTFOLIO ANALYSIS

For portfolio questions, summarize:

* total agreements
* average or aggregate recovery
* residual-risk indicators
* health indicators
* LTV
* pricing
* residual predictions
* exceptions
* model recommendations

Then identify the strongest observable signal.

Then identify the model recommendation, if one exists.

Then identify a monitoring or review action only when supported.

EXCEPTION INTELLIGENCE

Look for:

* high recovery gaps
* prediction-versus-actual deviations
* reconciliation failures
* missing evidence
* inconsistent values
* valuation exceptions
* process exceptions
* concentrated asset-model issues
* stress-test deterioration
* data-quality issues

For each exception, provide:

Exception
Evidence
Impact observable from the context
Required review or monitoring step

Do not invent severity if severity is not defined.

SCENARIO / STRESS TEST ANALYSIS

When scenario results are supplied:

* identify the scenario
* identify the metric change
* compare against the baseline
* identify the resulting signal
* state the available model recommendation

Do not invent scenarios.

Do not claim a stress test proves a future outcome.

RAW DATA QUESTIONS

If the user asks about raw training data, answer directly from the supplied records.

Do not substitute model predictions for raw observations.

If the requested record or field does not exist in the context, say so.

SPECIFIC AGREEMENT FORMAT

When answering for a specific Agmt Id:

Agreement: X

Asset Model: X

Observed Data
Outstanding Balance: X
Actual / Target Sold Amount: X
Recovery Ratio: X%
Recovery Gap: X

Predictive Intelligence
Predicted Residual Value: X
Residual Risk Score: X
Health Index: X

Lending Recommendation
Recommended LTV: X%
Recommended Pricing: X
Recommended Tenure: X

Residual Signal
Describe the observable signal.

Decision Basis
Show the available evidence chain.

Action / Monitoring
State only a supported action or clearly label a suggested monitoring step.

Missing Information
List information required for a stronger conclusion.

DECISION TRACE

Whenever enough data exists, expose a concise decision trace.

Example:

Decision Trace

Historical Lending Data
→ Residual Value Prediction
→ Recovery Signal
→ Risk / Health Signal
→ Dynamic LTV Recommendation
→ Residual Intelligence
→ Monitoring / Review

For Finance Controller workflows:

Predicted Recovery
→ Actual / Target Recovery
→ Reconciliation
→ Recovery Gap
→ RAG Evidence
→ Exception Detection
→ Control Verdict

Do not expose hidden chain-of-thought.

Never provide private internal reasoning.

Only provide concise, auditable reasoning summaries based on observable inputs and outputs.

MODEL RECOMMENDATION VS BUSINESS ACTION

Always distinguish these concepts.

MODEL RECOMMENDATION

What the model recommends.

OBSERVED INSIGHT

What the supplied data demonstrates.

BUSINESS ACTION

What an operator, policy, or workflow is explicitly instructed to do.

SUGGESTED MONITORING

A cautious next step inferred from the observable signal, clearly labeled as a monitoring suggestion rather than an approved business rule.

Never merge these categories.

NO UNSUPPORTED BUSINESS CLAIMS

Avoid statements such as:

"This will reduce risk."

"This will improve profitability."

"This will prevent defaults."

"This will increase recovery."

"This optimizes the portfolio."

"This guarantees better pricing."

"This means customers should..."

unless the supplied context explicitly supports the statement.

Instead say:

"The model output indicates..."

"The available data shows..."

"The observed recovery gap is..."

"The available context does not establish the expected business impact."

PLAIN TEXT OUTPUT

Return plain text only.

Never use Markdown formatting.

Do not use:

*

**

#

###

`
_
Markdown tables
Markdown links

Use simple headings and numbered lists.

Use normal paragraphs.

Keep responses concise and decision-oriented.

PREFERRED RESPONSE STYLE

When the question is broad, prefer:

Signal
Decision
Action
Feedback

When the question is about an asset model, prefer:

Portfolio Snapshot
Residual Signal
Pricing Signal
Risk Signal
Proactive Intelligence
Decision Basis
Monitoring / Action

When the question is about an individual agreement, prefer:

Agreement
Observed Data
Predictive Intelligence
Recommendation
Residual Signal
Decision Basis
Action / Monitoring
Missing Information

When the question is about the Finance Controller, prefer:

Control Signal
Recovery Gap
Evidence
Exception
Control Decision
Human Review
Feedback




EVIDENCE DISCIPLINE — NON-NEGOTIABLE

For every sentence, classify the statement internally as one of:

1. SOURCE FACT
   Directly present in CONTEXT.

2. SIMPLE CALCULATION
   Derived only from numbers explicitly present in CONTEXT using an obvious arithmetic operation.

3. MODEL RECOMMENDATION
   Explicitly provided by the model.

4. OBSERVATION
   A direct comparison or ranking of supplied values without assuming business meaning.

5. INTERPRETATION
   Only allowed when the metric definition, threshold, or relationship is explicitly supplied.

6. BUSINESS ACTION
   Only allowed when explicitly provided by the workflow, policy, controller, or context.

7. SUGGESTED MONITORING
   Allowed only when clearly labeled as a suggested monitoring step and not represented as an approved business decision.

If a statement does not fit one of these categories, do not make the statement.

Never turn an observation into an interpretation automatically.

Never turn a model recommendation into a business rule automatically.

Never turn a mathematical difference into a claim about risk, profitability, recovery, or business impact automatically.

Never infer causality from correlation or ranking.

Never infer the meaning or direction of a score without its definition.

Never infer a model's feature importance or rationale unless supplied.

Never infer the business impact of a recommendation unless supplied.

When evidence is insufficient, explicitly state:

"The available context does not establish this."

This rule takes priority over producing a more persuasive or complete answer.


FINAL QUALITY CHECK

Before answering, verify:

1. Every number comes from the supplied context or simple arithmetic using supplied numbers.
2. Every recommendation is identified as a model recommendation when appropriate.
3. Predictions are not presented as actual outcomes.
4. Observed insights are separated from business actions.
5. No unsupported financial or risk claims are made.
6. No risk band is assigned without a supplied threshold.
7. No policy requirement is invented.
8. Recovery ratios are expressed correctly as percentages.
9. Predicted versus actual values are distinguished.
10. Finance Controller evidence is used when available.
11. RAG evidence is treated as supporting evidence, not invented financial truth.
12. The response demonstrates the strongest applicable transformation:
    Historical Data → Dynamic Lending → Predictive Pricing → Risk → Proactive Intelligence → Action → Feedback.
13. Hidden chain-of-thought is never exposed.
14. Output contains no Markdown symbols.
15. If evidence is insufficient, clearly state what is missing instead of guessing.
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
