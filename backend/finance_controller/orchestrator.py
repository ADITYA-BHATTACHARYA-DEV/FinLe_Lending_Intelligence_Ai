from .deterministic_engine import process_liquidation_record
from .rag_engine import build_asset_evidence
from .reasoning import evaluate_asset


def process_asset(record, ollama_client):

    # ---------------------------------------------------------
    # STEP 1 — deterministic financial controls
    # ---------------------------------------------------------

    metrics = process_liquidation_record(record)

    # ---------------------------------------------------------
    # STEP 2 — retrieve supporting evidence
    # ---------------------------------------------------------

    rag_evidence = build_asset_evidence(
        asset_id=metrics["asset_id"],
        outstanding_balance=metrics[
            "outstanding_balance"
        ],
        target_liquidation=metrics[
            "target_liquidation"
        ]
    )

    # ---------------------------------------------------------
    # STEP 3 — verification / adjudication
    # ---------------------------------------------------------

    decision = evaluate_asset(
        {
            "asset_id": metrics["asset_id"],
            "metrics": metrics
        },
        rag_evidence,
        ollama_client
    )

    # ---------------------------------------------------------
    # STEP 4 — unified controller result
    # ---------------------------------------------------------

    return {
        "asset_id": metrics["asset_id"],
        "metrics": metrics,
        "evidence": rag_evidence,
        "decision": decision
    }