def process_liquidation_record(record: dict) -> dict:
    outstanding = float(record.get("outstanding_balance", 0))
    target = float(record.get("target_liquidation", 0))
    
    potential_gap = max(0.0, outstanding - target)
    coverage_ratio = (target / outstanding * 100) if outstanding > 0 else 0.0

    return {
        "asset_id": record.get("asset_id"),
        "outstanding_balance": outstanding,
        "target_liquidation": target,
        "potential_gap": potential_gap,
        "coverage_ratio": round(coverage_ratio, 2)
    }