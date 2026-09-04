def calculate_control_score(metrics: dict, rag_evidence: dict = None) -> dict:
    scores = {
        "reconciliation": 25,
        "recovery_coverage": 0,
        "documentation": 15,
        "valuation_evidence": 8,
        "process_compliance": 10,
        "data_quality": 10
    }

    ratio = metrics["coverage_ratio"]
    if ratio >= 80: scores["recovery_coverage"] = 25
    elif ratio >= 60: scores["recovery_coverage"] = 18
    elif ratio >= 40: scores["recovery_coverage"] = 10
    else: scores["recovery_coverage"] = 5

    if rag_evidence and rag_evidence.get("policy_reserve"):
        if metrics["target_liquidation"] >= rag_evidence["policy_reserve"]:
            scores["valuation_evidence"] = 15
        else:
            scores["valuation_evidence"] = 5

    total_score = sum(scores.values())
    status = "GREEN" if total_score >= 90 else ("AMBER" if total_score >= 75 else "RED")

    return {"total_score": total_score, "status": status, "breakdown": scores}