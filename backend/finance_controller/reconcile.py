# # """
# # AI Finance Controller — synthetic multi-source data generator.

# # Produces three independent "source of truth" feeds that a real finance-ops
# # team would have to reconcile by hand every month:

# #   1. Internal Ledger   — what TVS Credit's own books say should be collected
# #   2. Bank Statement     — what actually hit the bank account
# #   3. Auction/Settlement — what the auction house reported as sold + tax withheld

# # Deliberate discrepancies are injected on purpose (amount drift, missing entries,
# # duplicates, date slippage, ID typos, tax miscalculation) so the reconciliation
# # engine has a genuine, non-trivial matching problem to solve — this is what
# # makes the reported match-rate and exception list meaningful rather than a
# # cherry-picked demo.
# # """
# # import os
# # import random
# # import numpy as np
# # import pandas as pd
# # from datetime import datetime, timedelta

# # random.seed(7)
# # np.random.seed(7)

# # N_RECORDS = 60  # > 50 per the brief

# # OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "finance")
# # os.makedirs(OUT_DIR, exist_ok=True)

# # GST_RATE = 0.18  # standard commission GST rate used for the tax-line matcher


# # def typo(loan_id):
# #     """Simulate a data-entry typo in ~a third of flagged IDs."""
# #     chars = list(loan_id)
# #     i = random.randint(0, len(chars) - 1)
# #     chars[i] = random.choice("0123456789")
# #     return "".join(chars)


# # def generate():
# #     base_date = datetime(2026, 1, 5)
# #     ledger_rows, bank_rows, settlement_rows = [], [], []

# #     for i in range(1, N_RECORDS + 1):
# #         loan_id = f"LN{1000 + i}"
# #         expected_amount = round(random.uniform(25000, 180000), 2)
# #         expected_date = base_date + timedelta(days=random.randint(0, 150))
# #         record_type = random.choice(["EMI_SETTLEMENT", "AUCTION_RECOVERY", "FORECLOSURE_PAYOFF"])

# #         ledger_rows.append({
# #             "loan_id": loan_id,
# #             "record_type": record_type,
# #             "expected_amount": expected_amount,
# #             "expected_date": expected_date.strftime("%Y-%m-%d"),
# #         })

# #         # ---- Decide which discrepancy (if any) this record gets ----
# #         roll = random.random()

# #         if roll < 0.10:
# #             # Missing bank entry entirely - money never actually landed / not yet reconciled
# #             continue

# #         bank_amount = expected_amount
# #         bank_date = expected_date
# #         bank_loan_id = loan_id

# #         if roll < 0.20:
# #             # Amount drift: bank fees / rounding / partial payment
# #             bank_amount = round(expected_amount * random.uniform(0.90, 0.99), 2)
# #         elif roll < 0.30:
# #             # Date slippage beyond a reasonable clearing window
# #             bank_date = expected_date + timedelta(days=random.randint(6, 20))
# #         elif roll < 0.40:
# #             # ID typo at the bank's end (fuzzy-matchable)
# #             bank_loan_id = typo(loan_id)

# #         bank_rows.append({
# #             "bank_ref": f"BNK{2000 + i}",
# #             "loan_id": bank_loan_id,
# #             "amount": bank_amount,
# #             "value_date": bank_date.strftime("%Y-%m-%d"),
# #             "narrative": f"NEFT/{bank_loan_id}/TVSCRED",
# #         })

# #         if roll < 0.48 and roll >= 0.40:
# #             # Duplicate bank entry (double-credited, needs de-duplication)
# #             bank_rows.append({
# #                 "bank_ref": f"BNK{2000 + i}D",
# #                 "loan_id": bank_loan_id,
# #                 "amount": bank_amount,
# #                 "value_date": bank_date.strftime("%Y-%m-%d"),
# #                 "narrative": f"NEFT/{bank_loan_id}/TVSCRED/DUP",
# #             })

# #         if record_type == "AUCTION_RECOVERY":
# #             sale_amount = round(expected_amount * random.uniform(0.95, 1.05), 2)
# #             correct_tax = round(sale_amount * GST_RATE, 2)
# #             reported_tax = correct_tax
# #             if random.random() < 0.20:
# #                 # Tax miscalculation - wrong rate applied or rounding error introduced
# #                 reported_tax = round(sale_amount * random.uniform(0.10, 0.16), 2)
# #             settlement_rows.append({
# #                 "auction_id": f"AUC{3000 + i}",
# #                 "loan_id": loan_id,
# #                 "sale_amount": sale_amount,
# #                 "tax_withheld": reported_tax,
# #                 "sale_date": (expected_date + timedelta(days=random.randint(-3, 3))).strftime("%Y-%m-%d"),
# #                 "buyer": random.choice(["Cars24", "Spinny", "OLX Auto", "CarTrade", "Local Dealer"]),
# #             })

# #     ledger_df = pd.DataFrame(ledger_rows)
# #     bank_df = pd.DataFrame(bank_rows)
# #     settlement_df = pd.DataFrame(settlement_rows)

# #     ledger_df.to_csv(os.path.join(OUT_DIR, "internal_ledger.csv"), index=False)
# #     bank_df.to_csv(os.path.join(OUT_DIR, "bank_statement.csv"), index=False)
# #     settlement_df.to_csv(os.path.join(OUT_DIR, "auction_settlement.csv"), index=False)

# #     print(f"[finance-gen] ledger={len(ledger_df)} bank={len(bank_df)} settlement={len(settlement_df)} "
# #           f"-> written to {OUT_DIR}")
# #     return ledger_df, bank_df, settlement_df


# # if __name__ == "__main__":
# #     generate()






# """
# AI Finance Controller — synthetic multi-source data generator.

# Produces three independent "source of truth" feeds that a real finance-ops
# team would have to reconcile by hand every month:

#   1. Internal Ledger   — what TVS Credit's own books say should be collected
#   2. Bank Statement     — what actually hit the bank account
#   3. Auction/Settlement — what the auction house reported as sold + tax withheld

# Deliberate discrepancies are injected on purpose (amount drift, missing entries,
# duplicates, date slippage, ID typos, tax miscalculation) so the reconciliation
# engine has a genuine, non-trivial matching problem to solve — this is what
# makes the reported match-rate and exception list meaningful rather than a
# cherry-picked demo.
# """
# import os
# import random
# import numpy as np
# import pandas as pd
# from datetime import datetime, timedelta

# random.seed(7)
# np.random.seed(7)

# N_RECORDS = 60  # > 50 per the brief

# OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "finance")
# os.makedirs(OUT_DIR, exist_ok=True)

# GST_RATE = 0.18  # standard commission GST rate used for the tax-line matcher


# def typo(loan_id):
#     """Simulate a data-entry typo in ~a third of flagged IDs."""
#     chars = list(loan_id)
#     i = random.randint(0, len(chars) - 1)
#     chars[i] = random.choice("0123456789")
#     return "".join(chars)


# def generate():
#     base_date = datetime(2026, 1, 5)
#     ledger_rows, bank_rows, settlement_rows = [], [], []

#     for i in range(1, N_RECORDS + 1):
#         loan_id = f"LN{1000 + i}"
#         expected_amount = round(random.uniform(25000, 180000), 2)
#         expected_date = base_date + timedelta(days=random.randint(0, 150))
#         record_type = random.choice(["EMI_SETTLEMENT", "AUCTION_RECOVERY", "FORECLOSURE_PAYOFF"])

#         ledger_rows.append({
#             "loan_id": loan_id,
#             "record_type": record_type,
#             "expected_amount": expected_amount,
#             "expected_date": expected_date.strftime("%Y-%m-%d"),
#         })

#         # ---- Decide which discrepancy (if any) this record gets ----
#         roll = random.random()

#         if roll < 0.10:
#             # Missing bank entry entirely - money never actually landed / not yet reconciled
#             continue

#         bank_amount = expected_amount
#         bank_date = expected_date
#         bank_loan_id = loan_id

#         if roll < 0.20:
#             # Amount drift: bank fees / rounding / partial payment
#             bank_amount = round(expected_amount * random.uniform(0.90, 0.99), 2)
#         elif roll < 0.30:
#             # Date slippage beyond a reasonable clearing window
#             bank_date = expected_date + timedelta(days=random.randint(6, 20))
#         elif roll < 0.40:
#             # ID typo at the bank's end (fuzzy-matchable)
#             bank_loan_id = typo(loan_id)

#         bank_rows.append({
#             "bank_ref": f"BNK{2000 + i}",
#             "loan_id": bank_loan_id,
#             "amount": bank_amount,
#             "value_date": bank_date.strftime("%Y-%m-%d"),
#             "narrative": f"NEFT/{bank_loan_id}/TVSCRED",
#         })

#         if roll < 0.48 and roll >= 0.40:
#             # Duplicate bank entry (double-credited, needs de-duplication)
#             bank_rows.append({
#                 "bank_ref": f"BNK{2000 + i}D",
#                 "loan_id": bank_loan_id,
#                 "amount": bank_amount,
#                 "value_date": bank_date.strftime("%Y-%m-%d"),
#                 "narrative": f"NEFT/{bank_loan_id}/TVSCRED/DUP",
#             })

#         if record_type == "AUCTION_RECOVERY":
#             sale_amount = round(expected_amount * random.uniform(0.95, 1.05), 2)
#             correct_tax = round(sale_amount * GST_RATE, 2)
#             reported_tax = correct_tax
#             if random.random() < 0.20:
#                 # Tax miscalculation - wrong rate applied or rounding error introduced
#                 reported_tax = round(sale_amount * random.uniform(0.10, 0.16), 2)
#             settlement_rows.append({
#                 "auction_id": f"AUC{3000 + i}",
#                 "loan_id": loan_id,
#                 "sale_amount": sale_amount,
#                 "tax_withheld": reported_tax,
#                 "sale_date": (expected_date + timedelta(days=random.randint(-3, 3))).strftime("%Y-%m-%d"),
#                 "buyer": random.choice(["Cars24", "Spinny", "OLX Auto", "CarTrade", "Local Dealer"]),
#             })

#     ledger_df = pd.DataFrame(ledger_rows)
#     bank_df = pd.DataFrame(bank_rows)
#     settlement_df = pd.DataFrame(settlement_rows)

#     ledger_df.to_csv(os.path.join(OUT_DIR, "internal_ledger.csv"), index=False)
#     bank_df.to_csv(os.path.join(OUT_DIR, "bank_statement.csv"), index=False)
#     settlement_df.to_csv(os.path.join(OUT_DIR, "auction_settlement.csv"), index=False)

#     print(f"[finance-gen] ledger={len(ledger_df)} bank={len(bank_df)} settlement={len(settlement_df)} "
#           f"-> written to {OUT_DIR}")
#     return ledger_df, bank_df, settlement_df


# if __name__ == "__main__":
#     generate()




"""
AI Finance Controller — reconciliation engine.

Everything that actually decides whether two records match is deterministic
rule-based logic (exact key match -> tolerance-band match -> fuzzy-ID match ->
unresolved exception). No LLM is involved in the matching decision itself —
per the brief, verification needs to be correct, not merely plausible. Ollama
is used only downstream, in app.py's chat endpoint, to narrate results the
engine already computed.

Produces four artifacts in backend/outputs/finance/:
  reconciliation_result.json   - Layer A: Ledger vs Bank multi-source match
  tax_line_result.json         - Layer B: auction sale amount vs tax withheld
  cash_forecast.json           - Layer C: forward expected-inflow projection
  recovery_reconciliation.json - Layer D: model-predicted vs actual settlement
                                  (this is the part that connects back to the
                                  main EPIC 8 lending/residual-pricing engine)
"""
import os
import json
import difflib
import numpy as np
import pandas as pd
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # backend/
DATA_DIR = os.path.join(BASE_DIR, "data", "finance")
OUT_DIR = os.path.join(BASE_DIR, "outputs", "finance")
AGREEMENTS_PATH = os.path.join(BASE_DIR, "outputs", "agreements.csv")
os.makedirs(OUT_DIR, exist_ok=True)

AMOUNT_TOLERANCE_PCT = 0.02   # 2% - normal bank fee/rounding tolerance
DATE_TOLERANCE_DAYS = 5       # normal clearing window
FUZZY_ID_THRESHOLD = 0.82     # similarity ratio above which an ID typo is auto-resolved
GST_RATE = 0.18
TAX_TOLERANCE_PCT = 0.03


def log(msg):
    print(f"[finance-recon] {msg}")


# ===========================================================================
# LAYER A — Multi-source reconciliation (Ledger <-> Bank)
# ===========================================================================
def reconcile_ledger_vs_bank():
    log("running multi-source reconciliation (ledger vs bank) ...")
    ledger = pd.read_csv(os.path.join(DATA_DIR, "internal_ledger.csv"), parse_dates=["expected_date"])
    bank = pd.read_csv(os.path.join(DATA_DIR, "bank_statement.csv"), parse_dates=["value_date"])

    bank_used = set()
    results = []

    ledger_ids = set(ledger["loan_id"])

    for _, led in ledger.iterrows():
        candidates = bank[bank["loan_id"] == led["loan_id"]]

        # Exact ID match -> check amount/date tolerance
        matched = False
        for idx, bk in candidates.iterrows():
            if idx in bank_used:
                continue
            amt_diff_pct = abs(bk["amount"] - led["expected_amount"]) / max(led["expected_amount"], 1)
            date_diff = abs((bk["value_date"] - led["expected_date"]).days)
            if amt_diff_pct <= AMOUNT_TOLERANCE_PCT and date_diff <= DATE_TOLERANCE_DAYS:
                results.append({
                    "loan_id": led["loan_id"], "status": "MATCHED", "confidence": "high",
                    "expected_amount": led["expected_amount"], "matched_amount": bk["amount"],
                    "bank_ref": bk["bank_ref"], "reason": None,
                })
                bank_used.add(idx)
                matched = True
                break
            elif amt_diff_pct <= AMOUNT_TOLERANCE_PCT and date_diff > DATE_TOLERANCE_DAYS:
                results.append({
                    "loan_id": led["loan_id"], "status": "EXCEPTION", "confidence": None,
                    "expected_amount": led["expected_amount"], "matched_amount": bk["amount"],
                    "bank_ref": bk["bank_ref"],
                    "reason": f"date_slippage_{date_diff}d",
                })
                bank_used.add(idx)
                matched = True
                break
            elif amt_diff_pct > AMOUNT_TOLERANCE_PCT and date_diff <= DATE_TOLERANCE_DAYS:
                results.append({
                    "loan_id": led["loan_id"], "status": "EXCEPTION", "confidence": None,
                    "expected_amount": led["expected_amount"], "matched_amount": bk["amount"],
                    "bank_ref": bk["bank_ref"],
                    "reason": f"amount_mismatch_{amt_diff_pct:.1%}",
                })
                bank_used.add(idx)
                matched = True
                break

        if matched:
            continue

        # No exact-ID candidate at all -> attempt fuzzy ID match against unused bank rows
        best_score, best_idx = 0, None
        for idx, bk in bank.iterrows():
            if idx in bank_used or bk["loan_id"] in ledger_ids:
                continue
            score = difflib.SequenceMatcher(None, str(bk["loan_id"]), str(led["loan_id"])).ratio()
            amt_diff_pct = abs(bk["amount"] - led["expected_amount"]) / max(led["expected_amount"], 1)
            if score > best_score and amt_diff_pct <= AMOUNT_TOLERANCE_PCT:
                best_score, best_idx = score, idx

        if best_idx is not None and best_score >= FUZZY_ID_THRESHOLD:
            bk = bank.loc[best_idx]
            results.append({
                "loan_id": led["loan_id"], "status": "MATCHED", "confidence": "fuzzy",
                "expected_amount": led["expected_amount"], "matched_amount": bk["amount"],
                "bank_ref": bk["bank_ref"],
                "reason": f"id_typo_resolved (bank_id={bk['loan_id']}, similarity={best_score:.2f})",
            })
            bank_used.add(best_idx)
            continue

        # Nothing usable found at all
        results.append({
            "loan_id": led["loan_id"], "status": "EXCEPTION", "confidence": None,
            "expected_amount": led["expected_amount"], "matched_amount": None,
            "bank_ref": None, "reason": "missing_bank_entry",
        })

    # Any leftover bank rows never claimed = unmatched bank credits (possible duplicates / unknown inflow)
    unclaimed = bank.loc[~bank.index.isin(bank_used)]
    for _, bk in unclaimed.iterrows():
        results.append({
            "loan_id": bk["loan_id"], "status": "EXCEPTION", "confidence": None,
            "expected_amount": None, "matched_amount": bk["amount"],
            "bank_ref": bk["bank_ref"], "reason": "unmatched_bank_credit_or_duplicate",
        })

    df = pd.DataFrame(results)
    matched = df[df["status"] == "MATCHED"]
    exceptions = df[df["status"] == "EXCEPTION"]

    total_ledger_records = len(ledger)
    match_rate = round(len(matched) / total_ledger_records, 4)

    reason_breakdown = exceptions["reason"].value_counts().to_dict()

    result = {
        "layer": "A - Multi-source reconciliation (Ledger vs Bank)",
        "total_ledger_records": int(total_ledger_records),
        "total_bank_records": int(len(bank)),
        "matched_count": int(len(matched)),
        "exception_count": int(len(exceptions)),
        "match_rate": match_rate,
        "high_confidence_matches": int((matched["confidence"] == "high").sum()),
        "fuzzy_resolved_matches": int((matched["confidence"] == "fuzzy").sum()),
        "exception_reason_breakdown": reason_breakdown,
        "exceptions": json.loads(exceptions.to_json(orient="records")),
        "matches_sample": json.loads(matched.head(15).to_json(orient="records")),
    }
    with open(os.path.join(OUT_DIR, "reconciliation_result.json"), "w") as f:
        json.dump(result, f, indent=2, default=str)
    log(f"  match_rate={match_rate:.1%}  matched={len(matched)}  exceptions={len(exceptions)}")
    return result


# ===========================================================================
# LAYER B — Tax-line matcher (auction sale amount vs GST withheld)
# ===========================================================================
def match_tax_lines():
    log("running tax-line matcher ...")
    settlement = pd.read_csv(os.path.join(DATA_DIR, "auction_settlement.csv"))
    settlement["expected_tax"] = (settlement["sale_amount"] * GST_RATE).round(2)
    settlement["tax_diff_pct"] = (
        (settlement["tax_withheld"] - settlement["expected_tax"]).abs() / settlement["expected_tax"]
    )
    settlement["status"] = np.where(settlement["tax_diff_pct"] <= TAX_TOLERANCE_PCT, "MATCHED", "EXCEPTION")

    matched = settlement[settlement["status"] == "MATCHED"]
    exceptions = settlement[settlement["status"] == "EXCEPTION"].copy()
    exceptions["reason"] = "tax_rate_mismatch"

    match_rate = round(len(matched) / len(settlement), 4) if len(settlement) else 0.0

    result = {
        "layer": "B - Tax-Line Matcher (GST on auction settlements)",
        "gst_rate_expected": GST_RATE,
        "total_settlement_records": int(len(settlement)),
        "matched_count": int(len(matched)),
        "exception_count": int(len(exceptions)),
        "match_rate": match_rate,
        "exceptions": json.loads(exceptions[["auction_id", "loan_id", "sale_amount", "tax_withheld",
                                              "expected_tax", "tax_diff_pct", "reason"]].to_json(orient="records")),
    }
    with open(os.path.join(OUT_DIR, "tax_line_result.json"), "w") as f:
        json.dump(result, f, indent=2, default=str)
    log(f"  match_rate={match_rate:.1%}  exceptions={len(exceptions)}")
    return result


# ===========================================================================
# LAYER C — Forward cash forecaster
# ===========================================================================
def forecast_cash():
    log("running forward cash forecaster ...")
    ledger = pd.read_csv(os.path.join(DATA_DIR, "internal_ledger.csv"), parse_dates=["expected_date"])
    recon_path = os.path.join(OUT_DIR, "reconciliation_result.json")
    historical_match_rate = 1.0
    if os.path.exists(recon_path):
        historical_match_rate = json.load(open(recon_path))["match_rate"]

    ledger["month"] = ledger["expected_date"].dt.to_period("M").astype(str)
    monthly = ledger.groupby("month")["expected_amount"].sum().reset_index()
    monthly["expected_amount"] = monthly["expected_amount"].round(0)
    # Confidence-adjusted forecast: historical match rate acts as a collection-probability haircut
    monthly["risk_adjusted_forecast"] = (monthly["expected_amount"] * historical_match_rate).round(0)

    result = {
        "layer": "C - Forward Cash Forecaster",
        "historical_match_rate_used_as_collection_probability": historical_match_rate,
        "monthly_forecast": json.loads(monthly.to_json(orient="records")),
        "total_expected_next_period": float(monthly["expected_amount"].sum()),
        "total_risk_adjusted": float(monthly["risk_adjusted_forecast"].sum()),
    }
    with open(os.path.join(OUT_DIR, "cash_forecast.json"), "w") as f:
        json.dump(result, f, indent=2, default=str)
    log(f"  months={len(monthly)}  risk_adjusted_total={result['total_risk_adjusted']:,.0f}")
    return result


# ===========================================================================
# LAYER D — Recovery Settlement Reconciler (ties back into the EPIC 8 lending
# pipeline: does the model's predicted recovery agree with what settlement
# records actually show?)
# ===========================================================================
def reconcile_recovery_predictions(tolerance_pct=0.15):
    log("running recovery-settlement reconciler (model vs actual) ...")
    if not os.path.exists(AGREEMENTS_PATH):
        log("  agreements.csv not found - run models/train_pipeline.py first. Skipping Layer D.")
        return None

    df = pd.read_csv(AGREEMENTS_PATH)
    df["diff_pct"] = (df["Ensemble_Predicted_Sold_Amount"] - df["Target Sold Amount At Liquidation"]) / \
                      df["Target Sold Amount At Liquidation"].replace(0, np.nan)
    df["abs_diff_pct"] = df["diff_pct"].abs()
    df["status"] = np.where(df["abs_diff_pct"] <= tolerance_pct, "MATCHED", "EXCEPTION")
    df["reason"] = np.where(
        df["status"] == "EXCEPTION",
        np.where(df["diff_pct"] > 0, "model_overestimated_recovery", "model_underestimated_recovery"),
        None
    )

    matched = df[df["status"] == "MATCHED"]
    exceptions = df[df["status"] == "EXCEPTION"].sort_values("abs_diff_pct", ascending=False)
    match_rate = round(len(matched) / len(df), 4)

    by_segment = df.groupby("Asset Model").apply(
        lambda g: pd.Series({
            "agreements": len(g),
            "match_rate": round((g["status"] == "MATCHED").mean(), 3),
            "avg_abs_diff_pct": round(g["abs_diff_pct"].mean(), 3),
        })
    ).reset_index().sort_values("match_rate")

    result = {
        "layer": "D - Recovery Settlement Reconciler (model prediction vs actual liquidation)",
        "tolerance_pct": tolerance_pct,
        "total_agreements": int(len(df)),
        "matched_count": int(len(matched)),
        "exception_count": int(len(exceptions)),
        "match_rate": match_rate,
        "overestimate_count": int((df["reason"] == "model_overestimated_recovery").sum()),
        "underestimate_count": int((df["reason"] == "model_underestimated_recovery").sum()),
        "worst_segments": json.loads(by_segment.head(5).to_json(orient="records")),
        "top_exceptions": json.loads(
            exceptions.head(25)[["Agmt Id", "Asset Model", "Ensemble_Predicted_Sold_Amount",
                                  "Target Sold Amount At Liquidation", "diff_pct", "reason", "Risk_Band"]]
            .to_json(orient="records")
        ),
    }
    with open(os.path.join(OUT_DIR, "recovery_reconciliation.json"), "w") as f:
        json.dump(result, f, indent=2, default=str)
    log(f"  match_rate={match_rate:.1%}  exceptions={len(exceptions)}  "
        f"(over={result['overestimate_count']}, under={result['underestimate_count']})")
    return result













# ===========================================================================
# LAYER E — AI Liquidation Finance Controller
# Deterministic controls -> RAG evidence -> control score -> AI adjudication
# ===========================================================================

def run_liquidation_controller():
    """
    Executes the AI Finance Controller pipeline across liquidation records.

    Key principles:
    - Math and financial metrics are computed deterministically.
    - RAG exclusively gathers context and supporting documentation.
    - AI interprets results and handles adjudication, avoiding raw calculations.
    - Ambiguous scenarios trigger escalations rather than auto-resolving.
    """

    log("running AI liquidation finance controller ...")

    from .deterministic_engine import process_liquidation_record
    from .rag_engine import build_asset_evidence
    from .reasoning import evaluate_asset

    # -----------------------------------------------------------------------
    # Setup dataset path
    # -----------------------------------------------------------------------

    liquidation_path = os.path.join(
        BASE_DIR,
        "data",
        "finance",
        "liquidation.csv"
    )

    if not os.path.exists(liquidation_path):
        log(f"  liquidation dataset not found: {liquidation_path}")

        result = {
            "has_run": False,
            "error": "liquidation_dataset_not_found",
            "path": liquidation_path
        }

        with open(
            os.path.join(OUT_DIR, "liquidation_controller.json"),
            "w"
        ) as f:
            json.dump(result, f, indent=2)

        return result

    df = pd.read_csv(liquidation_path)
    log(f"  liquidation records={len(df)}")

    # -----------------------------------------------------------------------
    # Helper to resolve field names across schema variations
    # -----------------------------------------------------------------------

    def get_first_valid(row, keys, fallback=None):
        for key in keys:
            if key in row.index and pd.notna(row[key]):
                return row[key]
        return fallback

    controller_results = []

    # -----------------------------------------------------------------------
    # Iterate through each liquidation record
    # -----------------------------------------------------------------------

    for _, row in df.iterrows():

        asset_id = get_first_valid(
            row,
            [
                "Agmt Id",
                "agmt_id",
                "asset_id",
                "loan_id"
            ]
        )

        outstanding = get_first_valid(
            row,
            [
                "OS Balance At Liquidation",
                "outstanding_balance",
                "os_balance_at_liquidation"
            ],
            0
        )

        target = get_first_valid(
            row,
            [
                "Target Sold Amount At Liquidation",
                "target_liquidation",
                "target_sold_amount_at_liquidation"
            ],
            0
        )

        try:
            outstanding = float(outstanding or 0)
        except (TypeError, ValueError):
            outstanding = 0.0

        try:
            target = float(target or 0)
        except (TypeError, ValueError):
            target = 0.0

        # ---------------------------------------------------------------
        # 1. Run deterministic calculations
        # ---------------------------------------------------------------

        record = {
            "asset_id": str(asset_id) if asset_id is not None else None,
            "outstanding_balance": outstanding,
            "target_liquidation": target
        }

        metrics = process_liquidation_record(record)

        # ---------------------------------------------------------------
        # 2. Fetch context via RAG
        # ---------------------------------------------------------------

        try:
            rag_evidence = build_asset_evidence(
                asset_id=metrics["asset_id"],
                outstanding_balance=metrics["outstanding_balance"],
                target_liquidation=metrics["target_liquidation"]
            )
        except Exception as exc:
            log(f"  RAG retrieval failed for {metrics['asset_id']}: {exc}")

            rag_evidence = {
                "asset_id": metrics["asset_id"],
                "documents": [],
                "policy_reserve": None,
                "retrieval_error": str(exc)
            }

        # ---------------------------------------------------------------
        # 3. Perform AI adjudication
        # ---------------------------------------------------------------

        try:
            decision = evaluate_asset(
                {
                    "asset_id": metrics["asset_id"],
                    "metrics": metrics
                },
                rag_evidence,
                ollama_client
            )
        except Exception as exc:
            log(f"  AI reasoning failed for {metrics['asset_id']}: {exc}")

            decision = {
                "action": "HUMAN_REVIEW",
                "reasoning": "SYSTEM_FALLBACK",
                "confidence": 0.0,
                "notes": "AI adjudication unavailable; manual review required.",
                "error": str(exc)
            }

        # ---------------------------------------------------------------
        # 4. Save record results
        # ---------------------------------------------------------------

        controller_results.append({
            "asset_id": metrics["asset_id"],
            "metrics": metrics,
            "evidence": rag_evidence,
            "decision": decision
        })

    # -----------------------------------------------------------------------
    # Aggregate pipeline summaries
    # -----------------------------------------------------------------------

    total = len(controller_results)

    auto_clear = sum(
        1 for r in controller_results
        if r["decision"].get("action") == "AUTO_CLEAR"
    )
    human_review = sum(
        1 for r in controller_results
        if r["decision"].get("action") == "HUMAN_REVIEW"
    )
    control_review = sum(
        1 for r in controller_results
        if r["decision"].get("action") == "CONTROL_REVIEW"
    )

    total_outstanding = sum(
        r["metrics"]["outstanding_balance"] for r in controller_results
    )
    total_target = sum(
        r["metrics"]["target_liquidation"] for r in controller_results
    )
    total_gap = sum(
        r["metrics"]["potential_gap"] for r in controller_results
    )

    overall_coverage = (
        (total_target / total_outstanding * 100)
        if total_outstanding > 0
        else 0
    )

    evidence_found = sum(
        1 for r in controller_results
        if r.get("evidence", {}).get("documents")
    )

    # -----------------------------------------------------------------------
    # Compile final artifact and dump to JSON
    # -----------------------------------------------------------------------

    result = {
        "has_run": True,
        "layer": "E - AI Liquidation Finance Controller",
        "total_records": total,
        "auto_clear_count": auto_clear,
        "control_review_count": control_review,
        "human_review_count": human_review,
        "auto_clear_rate": round(auto_clear / total, 4) if total else 0.0,
        "evidence_found_count": evidence_found,
        "financial_summary": {
            "total_outstanding_balance": round(total_outstanding, 2),
            "total_target_liquidation": round(total_target, 2),
            "total_potential_recovery_gap": round(total_gap, 2),
            "overall_recovery_coverage_pct": round(overall_coverage, 2)
        },
        "records": controller_results
    }

    output_path = os.path.join(OUT_DIR, "liquidation_controller.json")

    with open(output_path, "w") as f:
        json.dump(result, f, indent=2, default=str)

    log(
        f"  records={total} "
        f"auto_clear={auto_clear} "
        f"control_review={control_review} "
        f"human_review={human_review}"
    )

    log(
        f"  outstanding=₹{total_outstanding:,.0f} "
        f"target=₹{total_target:,.0f} "
        f"gap=₹{total_gap:,.0f}"
    )

    log("  Layer E complete.")

    return result













# def run_all():
#     from . import generate_synthetic
#     generate_synthetic.generate()
#     reconcile_ledger_vs_bank()
#     match_tax_lines()
#     forecast_cash()
#     reconcile_recovery_predictions()
#     log("DONE. All finance-controller artifacts written to backend/outputs/finance/")




def run_all():
    """
    Orchestrates the entire AI Finance Controller pipeline:
    refreshes synthetic data, executes deterministic financial checks,
    runs the AI liquidation controller, and exports all generated artifacts.
    """
    from . import generate_synthetic

    log("======================================================")
    log("STARTING AI FINANCE CONTROLLER PIPELINE")
    log("======================================================")

    # Initialize or refresh the synthetic finance dataset
    generate_synthetic.generate()

    # -------------------------------------------------------
    # Execute Deterministic Finance-Control Layers
    # -------------------------------------------------------

    reconcile_ledger_vs_bank()

    match_tax_lines()

    forecast_cash()

    reconcile_recovery_predictions()

    # -------------------------------------------------------
    # Execute AI Liquidation Controller Layer
    # -------------------------------------------------------

    run_liquidation_controller()

    log("======================================================")
    log("PIPELINE COMPLETE. All finance-controller artifacts written to")
    log("backend/outputs/finance/")
    log("======================================================")


if __name__ == "__main__":
    run_all()