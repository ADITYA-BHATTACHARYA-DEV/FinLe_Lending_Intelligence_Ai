"""
AI Finance Controller — synthetic multi-source data generator.

Produces three independent "source of truth" feeds that a real finance-ops
team would have to reconcile by hand every month:

  1. Internal Ledger   — what TVS Credit's own books say should be collected
  2. Bank Statement     — what actually hit the bank account
  3. Auction/Settlement — what the auction house reported as sold + tax withheld

Deliberate discrepancies are injected on purpose (amount drift, missing entries,
duplicates, date slippage, ID typos, tax miscalculation) so the reconciliation
engine has a genuine, non-trivial matching problem to solve — this is what
makes the reported match-rate and exception list meaningful rather than a
cherry-picked demo.
"""
import os
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

random.seed(7)
np.random.seed(7)

N_RECORDS = 60  # > 50 per the brief

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "finance")
os.makedirs(OUT_DIR, exist_ok=True)

GST_RATE = 0.18  # standard commission GST rate used for the tax-line matcher


def typo(loan_id):
    """Simulate a data-entry typo in ~a third of flagged IDs."""
    chars = list(loan_id)
    i = random.randint(0, len(chars) - 1)
    chars[i] = random.choice("0123456789")
    return "".join(chars)


def generate():
    base_date = datetime(2026, 1, 5)
    ledger_rows, bank_rows, settlement_rows = [], [], []

    for i in range(1, N_RECORDS + 1):
        loan_id = f"LN{1000 + i}"
        expected_amount = round(random.uniform(25000, 180000), 2)
        expected_date = base_date + timedelta(days=random.randint(0, 150))
        record_type = random.choice(["EMI_SETTLEMENT", "AUCTION_RECOVERY", "FORECLOSURE_PAYOFF"])

        ledger_rows.append({
            "loan_id": loan_id,
            "record_type": record_type,
            "expected_amount": expected_amount,
            "expected_date": expected_date.strftime("%Y-%m-%d"),
        })

        # ---- Decide which discrepancy (if any) this record gets ----
        roll = random.random()

        if roll < 0.10:
            # Missing bank entry entirely - money never actually landed / not yet reconciled
            continue

        bank_amount = expected_amount
        bank_date = expected_date
        bank_loan_id = loan_id

        if roll < 0.20:
            # Amount drift: bank fees / rounding / partial payment
            bank_amount = round(expected_amount * random.uniform(0.90, 0.99), 2)
        elif roll < 0.30:
            # Date slippage beyond a reasonable clearing window
            bank_date = expected_date + timedelta(days=random.randint(6, 20))
        elif roll < 0.40:
            # ID typo at the bank's end (fuzzy-matchable)
            bank_loan_id = typo(loan_id)

        bank_rows.append({
            "bank_ref": f"BNK{2000 + i}",
            "loan_id": bank_loan_id,
            "amount": bank_amount,
            "value_date": bank_date.strftime("%Y-%m-%d"),
            "narrative": f"NEFT/{bank_loan_id}/TVSCRED",
        })

        if roll < 0.48 and roll >= 0.40:
            # Duplicate bank entry (double-credited, needs de-duplication)
            bank_rows.append({
                "bank_ref": f"BNK{2000 + i}D",
                "loan_id": bank_loan_id,
                "amount": bank_amount,
                "value_date": bank_date.strftime("%Y-%m-%d"),
                "narrative": f"NEFT/{bank_loan_id}/TVSCRED/DUP",
            })

        if record_type == "AUCTION_RECOVERY":
            sale_amount = round(expected_amount * random.uniform(0.95, 1.05), 2)
            correct_tax = round(sale_amount * GST_RATE, 2)
            reported_tax = correct_tax
            if random.random() < 0.20:
                # Tax miscalculation - wrong rate applied or rounding error introduced
                reported_tax = round(sale_amount * random.uniform(0.10, 0.16), 2)
            settlement_rows.append({
                "auction_id": f"AUC{3000 + i}",
                "loan_id": loan_id,
                "sale_amount": sale_amount,
                "tax_withheld": reported_tax,
                "sale_date": (expected_date + timedelta(days=random.randint(-3, 3))).strftime("%Y-%m-%d"),
                "buyer": random.choice(["Cars24", "Spinny", "OLX Auto", "CarTrade", "Local Dealer"]),
            })

    ledger_df = pd.DataFrame(ledger_rows)
    bank_df = pd.DataFrame(bank_rows)
    settlement_df = pd.DataFrame(settlement_rows)

    ledger_df.to_csv(os.path.join(OUT_DIR, "internal_ledger.csv"), index=False)
    bank_df.to_csv(os.path.join(OUT_DIR, "bank_statement.csv"), index=False)
    settlement_df.to_csv(os.path.join(OUT_DIR, "auction_settlement.csv"), index=False)

    print(f"[finance-gen] ledger={len(ledger_df)} bank={len(bank_df)} settlement={len(settlement_df)} "
          f"-> written to {OUT_DIR}")
    return ledger_df, bank_df, settlement_df


if __name__ == "__main__":
    generate()