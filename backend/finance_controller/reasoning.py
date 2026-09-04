# from .control_scorer import calculate_control_score

# def evaluate_asset(record: dict, rag_evidence: dict, ollama_client) -> dict:
#     metrics = record["metrics"]
#     score_data = calculate_control_score(metrics, rag_evidence)
    
#     if score_data["status"] == "GREEN":
#         return {
#             "action": "AUTO_CLEAR",
#             "reasoning": "CoT",
#             "confidence": 0.98,
#             "control_score": score_data["total_score"],
#             "notes": "Target recovery meets policy reserve limits."
#         }
    
#     # Low confidence or RED status triggers Tree-of-Thought
#     prompt = f"Analyze recovery gap of ₹{metrics['potential_gap']} for {record['asset_id']} across 3 hypotheses: Valuation, Document, or Process issue."
#     tot_response = ollama_client.generate(prompt)

#     return {
#         "action": "HUMAN_REVIEW",
#         "reasoning": "ToT",
#         "confidence": 0.74,
#         "control_score": score_data["total_score"],
#         "hypotheses": tot_response
#     }








from .control_scorer import calculate_control_score


def evaluate_asset(
    record: dict,
    rag_evidence: dict,
    ollama_client
) -> dict:

    metrics = record["metrics"]

    score_data = calculate_control_score(
        metrics,
        rag_evidence
    )

    results = rag_evidence.get("results", [])

    evidence_count = len(results)

    policy_reserve = rag_evidence.get(
        "policy_reserve"
    )

    target = metrics["target_liquidation"]

    # ---------------------------------------------------------
    # 1. Clear deterministic control
    # ---------------------------------------------------------

    if (
        score_data["status"] == "GREEN"
        and evidence_count > 0
        and (
            policy_reserve is None
            or target >= policy_reserve
        )
    ):

        return {
            "action": "AUTO_CLEAR",
            "reasoning_path": [
                "DETERMINISTIC",
                "RAG",
                "VERIFICATION"
            ],
            "confidence": 0.98,
            "control_score": score_data["total_score"],
            "status": "GREEN",
            "notes": (
                "Recovery coverage and available evidence "
                "satisfy the configured control thresholds."
            ),
            "evidence_count": evidence_count
        }

    # ---------------------------------------------------------
    # 2. Amber → evidence-backed verification
    # ---------------------------------------------------------

    if (
        score_data["status"] == "AMBER"
        and evidence_count > 0
    ):

        return {
            "action": "CONTROL_REVIEW",
            "reasoning_path": [
                "DETERMINISTIC",
                "RAG",
                "VERIFICATION"
            ],
            "confidence": 0.85,
            "control_score": score_data["total_score"],
            "status": "AMBER",
            "notes": (
                "Control requires verification before "
                "automatic clearance."
            ),
            "evidence_count": evidence_count
        }

    # ---------------------------------------------------------
    # 3. Ambiguous/conflicting evidence → ToT
    # ---------------------------------------------------------

    prompt = f"""
You are adjudicating a vehicle liquidation finance-control exception.

Asset:
{record['asset_id']}

Outstanding balance:
₹{metrics['outstanding_balance']}

Target liquidation:
₹{metrics['target_liquidation']}

Potential recovery gap:
₹{metrics['potential_gap']}

Recovery coverage:
{metrics['coverage_ratio']}%

Retrieved evidence:
{rag_evidence.get('results', [])}

Evaluate three possible explanations:

1. VALUATION ISSUE
2. DOCUMENTATION ISSUE
3. PROCESS / POLICY ISSUE

Return:
- most likely explanation
- supporting evidence
- conflicting evidence
- recommended control action

Do not invent financial values.
Only use values present in the input.
"""

    tot_response = ollama_client.generate(prompt)

    return {
        "action": "HUMAN_REVIEW",
        "reasoning_path": [
            "DETERMINISTIC",
            "RAG",
            "VERIFICATION",
            "TOT",
            "HUMAN_REVIEW"
        ],
        "confidence": 0.74,
        "control_score": score_data["total_score"],
        "status": "RED",
        "hypotheses": tot_response,
        "evidence_count": evidence_count
    }