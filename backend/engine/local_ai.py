"""
VeriFlow — Deterministic Forensic Intelligence Engine (Offline)
Replaces the local LLM with a fully deterministic rule-based fraud detection
system. No model download, no internet required, instant results, 100% explainable.

This engine runs 12 forensic checks on the extracted data and produces
a structured report with severity-rated flags.
"""
from __future__ import annotations

import logging
from typing import Dict, Any, Optional

from engine.models import AIAnalysisResult, AIFlag, Severity

logger = logging.getLogger("veriflow.forensic_engine")


# ─────────────────────────────────────────────────────────────────────────────
# Helper: extract a numeric value from extracted_data dict
# extracted_data format: {doc_name: [{field_name: value}, ...]}
# ─────────────────────────────────────────────────────────────────────────────

def _get_field(extracted_data: Dict[str, Any], field_name: str) -> Optional[tuple[str, float]]:
    """Find a field by name across all documents. Returns (doc_name, numeric_value) or None."""
    for doc_name, fields in extracted_data.items():
        if not isinstance(fields, list):
            continue
        for fdict in fields:
            if not isinstance(fdict, dict):
                continue
            for key, val in fdict.items():
                if key == field_name:
                    try:
                        return doc_name, float(str(val).replace(",", ""))
                    except (ValueError, TypeError):
                        return doc_name, None
    return None


def _get_all_values(extracted_data: Dict[str, Any], field_name: str) -> List[tuple[str, Optional[float]]]:
    """Get all occurrences of a field across documents."""
    results = []
    for doc_name, fields in extracted_data.items():
        if not isinstance(fields, list):
            continue
        for fdict in fields:
            if not isinstance(fdict, dict):
                continue
            for key, val in fdict.items():
                if key == field_name:
                    try:
                        results.append((doc_name, float(str(val).replace(",", ""))))
                    except (ValueError, TypeError):
                        results.append((doc_name, None))
    return results


# ─────────────────────────────────────────────────────────────────────────────
# The 12 Forensic Rules
# ─────────────────────────────────────────────────────────────────────────────

def _check_gross_minus_deductions(extracted_data: Dict) -> Optional[AIFlag]:
    """Rule 1: Gross - Total Deductions must approximately equal Net Pay."""
    gross = _get_field(extracted_data, "gross_salary")
    net = _get_field(extracted_data, "net_pay")
    total_ded = _get_field(extracted_data, "total_deductions")

    if gross and net and total_ded:
        g_doc, g_val = gross
        n_doc, n_val = net
        d_doc, d_val = total_ded
        if all(v is not None for v in [g_val, n_val, d_val]):
            expected_net = g_val - d_val
            diff = abs(n_val - expected_net)
            if diff > 500:
                severity = Severity.CRITICAL if diff > 5000 else Severity.HIGH
                return AIFlag(
                    severity=severity,
                    description=(
                        f"ARITHMETIC FRAUD: Gross Pay (₹{g_val:,.0f}) − Total Deductions "
                        f"(₹{d_val:,.0f}) = ₹{expected_net:,.0f}, but Net Pay states "
                        f"₹{n_val:,.0f}. Discrepancy of ₹{diff:,.0f} — "
                        f"the numbers don't add up."
                    ),
                    affected_document=g_doc,
                )
    return None


def _check_salary_vs_bank_credit(extracted_data: Dict) -> Optional[AIFlag]:
    """Rule 2: Net salary on slip must match bank salary credit within tolerance."""
    net = _get_field(extracted_data, "net_pay")
    credit = _get_field(extracted_data, "salary_credit")

    if net and credit:
        n_doc, n_val = net
        c_doc, c_val = credit
        if n_val is not None and c_val is not None:
            diff = abs(n_val - c_val)
            if diff > 500:
                severity = Severity.CRITICAL if diff > 5000 else Severity.HIGH
                return AIFlag(
                    severity=severity,
                    description=(
                        f"SALARY-BANK MISMATCH: Salary slip net pay is ₹{n_val:,.0f} "
                        f"but bank statement salary credit is ₹{c_val:,.0f}. "
                        f"Difference of ₹{diff:,.0f} — salary slip may be inflated."
                    ),
                    affected_document=n_doc,
                )
    return None


def _check_loan_application_income(extracted_data: Dict) -> Optional[AIFlag]:
    """Rule 3: Income stated on loan application must match salary slip."""
    net = _get_field(extracted_data, "net_pay")
    stated = _get_field(extracted_data, "monthly_net_income")

    if net and stated:
        n_doc, n_val = net
        s_doc, s_val = stated
        if n_val is not None and s_val is not None:
            diff = abs(n_val - s_val)
            if diff > 500:
                pct = (s_val - n_val) / n_val * 100 if n_val > 0 else 0
                severity = Severity.CRITICAL if diff > 5000 else Severity.HIGH
                return AIFlag(
                    severity=severity,
                    description=(
                        f"INCOME INFLATION DETECTED: Loan application claims monthly income "
                        f"of ₹{s_val:,.0f}, but salary slip shows ₹{n_val:,.0f}. "
                        f"{'Inflated by' if pct > 0 else 'Deflated by'} ₹{abs(diff):,.0f} "
                        f"({abs(pct):.1f}%) — applicant may have falsified their income."
                    ),
                    affected_document=s_doc,
                )
    return None


def _check_pf_percentage(extracted_data: Dict) -> Optional[AIFlag]:
    """Rule 4: PF deduction should be 12% of basic pay (up to EPF wage ceiling of Rs.15,000).
    Significant deviation from both the capped and uncapped rate = fraud."""
    basic = _get_field(extracted_data, "basic_pay")
    pf = _get_field(extracted_data, "provident_fund")

    if basic and pf:
        b_doc, b_val = basic
        p_doc, p_val = pf
        if b_val and p_val and b_val > 0:
            # EPF statutory wage ceiling: Rs.15,000/month
            capped_basic = min(b_val, 15000)
            expected_pf_capped = capped_basic * 0.12      # Ceiling method
            expected_pf_full = b_val * 0.12               # Voluntary full-basic method

            # Check against BOTH possible methods
            dev_capped = abs(p_val - expected_pf_capped) / expected_pf_capped if expected_pf_capped > 0 else 0
            dev_full = abs(p_val - expected_pf_full) / expected_pf_full if expected_pf_full > 0 else 0

            # Only flag if PF doesn't match EITHER method (70% tolerance — broad range for different schemes)
            if dev_capped > 0.70 and dev_full > 0.70:  # Must deviate from BOTH by >70%
                return AIFlag(
                    severity=Severity.HIGH,
                    description=(
                        f"PF CALCULATION ANOMALY: Basic pay is Rs.{b_val:,.0f}. "
                        f"Expected EPF: Rs.{expected_pf_capped:,.0f} (ceiling method) or "
                        f"Rs.{expected_pf_full:,.0f} (full-basic method). "
                        f"Document states Rs.{p_val:,.0f} — "
                        f"doesn't match either standard calculation. "
                        f"The basic pay or PF figure may have been manually edited."
                    ),
                    affected_document=b_doc,
                )
    return None


def _check_round_number_suspicion(extracted_data: Dict) -> Optional[AIFlag]:
    """Rule 5: Suspiciously round salary figures (e.g. exactly ₹1,00,000) are a red flag."""
    for field in ["net_pay", "gross_salary", "monthly_net_income"]:
        result = _get_field(extracted_data, field)
        if result:
            doc, val = result
            if val and val > 10000:
                # Check if perfectly round (divisible by 10000 with no remainder)
                if val % 10000 == 0 and val >= 50000:
                    return AIFlag(
                        severity=Severity.MEDIUM,
                        description=(
                            f"SUSPICIOUSLY ROUND FIGURE: {field.replace('_', ' ').title()} "
                            f"is exactly ₹{val:,.0f} — a perfectly round number. "
                            f"Real salaries include component breakdowns that rarely sum to "
                            f"exact multiples of ₹10,000. This may indicate a fabricated figure."
                        ),
                        affected_document=doc,
                    )
    return None


def _check_ctc_vs_monthly(extracted_data: Dict) -> Optional[AIFlag]:
    """Rule 6: Annual CTC / 12 should approximately match monthly salary."""
    annual_ctc = _get_field(extracted_data, "annual_ctc")
    monthly = _get_field(extracted_data, "net_pay") or _get_field(extracted_data, "monthly_salary")

    if annual_ctc and monthly:
        a_doc, a_val = annual_ctc
        m_doc, m_val = monthly
        if a_val and m_val and a_val > 0:
            implied_monthly = a_val / 12
            diff = abs(implied_monthly - m_val)
            # Allow 40% tolerance as CTC includes employer contributions
            if diff / implied_monthly > 0.40:
                return AIFlag(
                    severity=Severity.HIGH,
                    description=(
                        f"CTC vs MONTHLY INCOME MISMATCH: Annual CTC of ₹{a_val:,.0f} "
                        f"implies monthly salary of ~₹{implied_monthly:,.0f}, but "
                        f"stated monthly pay is ₹{m_val:,.0f}. "
                        f"The ratio is {a_val/m_val/12:.1f}x (expected ~1.0). "
                        f"One of these figures may be fabricated."
                    ),
                    affected_document=a_doc,
                )
    return None


def _check_net_greater_than_gross(extracted_data: Dict) -> Optional[AIFlag]:
    """Rule 7: Net pay cannot exceed gross pay — physically impossible."""
    gross = _get_field(extracted_data, "gross_salary")
    net = _get_field(extracted_data, "net_pay")

    if gross and net:
        g_doc, g_val = gross
        n_doc, n_val = net
        if g_val and n_val and n_val > g_val:
            return AIFlag(
                severity=Severity.CRITICAL,
                description=(
                    f"IMPOSSIBLE VALUES: Net Pay (₹{n_val:,.0f}) exceeds Gross Pay "
                    f"(₹{g_val:,.0f}) — this is mathematically impossible. "
                    f"Net pay is always less than gross after deductions. "
                    f"The document has been tampered with."
                ),
                affected_document=g_doc,
            )
    return None


def _check_deductions_exceed_gross(extracted_data: Dict) -> Optional[AIFlag]:
    """Rule 8: Total deductions cannot exceed or nearly equal gross pay."""
    gross = _get_field(extracted_data, "gross_salary")
    deductions = _get_field(extracted_data, "total_deductions")

    if gross and deductions:
        g_doc, g_val = gross
        d_doc, d_val = deductions
        if g_val and d_val and d_val > 0:
            ratio = d_val / g_val
            if ratio > 0.60:  # Deductions > 60% of gross is extremely suspicious
                return AIFlag(
                    severity=Severity.HIGH if ratio < 0.90 else Severity.CRITICAL,
                    description=(
                        f"EXCESSIVE DEDUCTIONS: Total deductions (₹{d_val:,.0f}) are "
                        f"{ratio:.0%} of gross salary (₹{g_val:,.0f}). "
                        f"Normal deductions in India range from 15-30% of gross. "
                        f"This is highly anomalous."
                    ),
                    affected_document=g_doc,
                )
    return None


def _check_basic_exceeds_gross(extracted_data: Dict) -> Optional[AIFlag]:
    """Rule 9: Basic pay cannot exceed gross salary."""
    gross = _get_field(extracted_data, "gross_salary")
    basic = _get_field(extracted_data, "basic_pay")

    if gross and basic:
        g_doc, g_val = gross
        b_doc, b_val = basic
        if g_val and b_val and b_val > g_val:
            return AIFlag(
                severity=Severity.CRITICAL,
                description=(
                    f"IMPOSSIBLE VALUES: Basic Pay (₹{b_val:,.0f}) exceeds Gross Pay "
                    f"(₹{g_val:,.0f}). Basic is always a component of gross — "
                    f"this is mathematically impossible. Clear sign of document tampering."
                ),
                affected_document=g_doc,
            )
    return None


def _check_income_vs_loan_tenure(extracted_data: Dict) -> Optional[AIFlag]:
    """Rule 10: Check if loan amount is unreasonably high relative to income (EMI stress test)."""
    monthly_income = _get_field(extracted_data, "net_pay") or _get_field(extracted_data, "monthly_net_income")
    loan_amount = _get_field(extracted_data, "loan_amount")
    loan_tenure = _get_field(extracted_data, "loan_tenure")

    if monthly_income and loan_amount and loan_tenure:
        i_doc, i_val = monthly_income
        l_doc, l_val = loan_amount
        t_doc, t_val = loan_tenure

        if i_val and l_val and t_val and t_val > 0:
            # Rough EMI estimate at 10% interest
            r = 0.10 / 12
            n = int(t_val)
            if n > 0 and r > 0:
                emi = l_val * r * (1 + r) ** n / ((1 + r) ** n - 1)
                emi_to_income_ratio = emi / i_val
                if emi_to_income_ratio > 0.60:  # EMI > 60% of income = lender risk
                    return AIFlag(
                        severity=Severity.MEDIUM,
                        description=(
                            f"HIGH DEBT-TO-INCOME RATIO: Loan of ₹{l_val:,.0f} over "
                            f"{int(t_val)} months at ~10% interest implies EMI of "
                            f"~₹{emi:,.0f}, which is {emi_to_income_ratio:.0%} of "
                            f"monthly income ₹{i_val:,.0f}. RBI guidelines recommend "
                            f"EMI ≤ 50% of income. This application is high-risk."
                        ),
                        affected_document=l_doc,
                    )
    return None


def _check_zero_deductions(extracted_data: Dict) -> Optional[AIFlag]:
    """Rule 11: If gross is large but all deductions are zero — suspicious."""
    gross = _get_field(extracted_data, "gross_salary")
    tds = _get_field(extracted_data, "income_tax")
    pf = _get_field(extracted_data, "provident_fund")

    if gross:
        g_doc, g_val = gross
        if g_val and g_val > 25000:  # Only check meaningful salaries
            tds_val = tds[1] if tds else 0
            pf_val = pf[1] if pf else 0
            # If both TDS and PF are missing/zero on a decent salary
            if (tds_val is None or tds_val == 0) and (pf_val is None or pf_val == 0):
                return AIFlag(
                    severity=Severity.MEDIUM,
                    description=(
                        f"MISSING DEDUCTIONS: Gross salary is ₹{g_val:,.0f} but "
                        f"no Income Tax (TDS) or PF deduction is recorded. "
                        f"At this salary level, both are legally mandatory. "
                        f"The deductions may have been deleted to inflate the net pay figure."
                    ),
                    affected_document=g_doc,
                )
    return None


def _check_name_field_consistency(extracted_data: Dict) -> Optional[AIFlag]:
    """Rule 12: Basic sanity — if same named field appears in 2+ docs with very different values, flag it."""
    net_pays = _get_all_values(extracted_data, "net_pay")
    if len(net_pays) >= 2:
        vals = [(doc, val) for doc, val in net_pays if val is not None]
        if len(vals) >= 2:
            min_val = min(v for _, v in vals)
            max_val = max(v for _, v in vals)
            if min_val > 0 and max_val / min_val > 1.15:  # >15% difference in same field
                docs = [d for d, _ in vals]
                return AIFlag(
                    severity=Severity.HIGH,
                    description=(
                        f"INCONSISTENT NET PAY: Different net pay figures found across "
                        f"documents: {', '.join(f'{d}: ₹{v:,.0f}' for d, v in vals)}. "
                        f"The same applicant's net pay should be consistent. "
                        f"Difference of {(max_val/min_val - 1):.0%} — one document may be falsified."
                    ),
                    affected_document=docs[0],
                )
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Main Entry Point
# ─────────────────────────────────────────────────────────────────────────────

FORENSIC_RULES = [
    ("Arithmetic Consistency",       _check_gross_minus_deductions),
    ("Salary-Bank Match",            _check_salary_vs_bank_credit),
    ("Loan Income Inflation",        _check_loan_application_income),
    ("PF Percentage Check",          _check_pf_percentage),
    ("Round Number Suspicion",       _check_round_number_suspicion),
    ("CTC vs Monthly Consistency",   _check_ctc_vs_monthly),
    ("Net > Gross Impossibility",    _check_net_greater_than_gross),
    ("Excess Deductions",            _check_deductions_exceed_gross),
    ("Basic > Gross Impossibility",  _check_basic_exceeds_gross),
    ("Loan-to-Income Stress Test",   _check_income_vs_loan_tenure),
    ("Missing Mandatory Deductions", _check_zero_deductions),
    ("Cross-Document Net Pay",       _check_name_field_consistency),
]


def analyze_extracted_data(extracted_data: Dict[str, Any], document_names: list[str]) -> AIAnalysisResult:
    """
    Run all 12 deterministic forensic rules against the extracted financial data.
    Fully offline — no LLM, no internet, no model required.
    Instant execution, 100% explainable results.
    """
    flags: list[AIFlag] = []
    rules_fired: list[str] = []
    rules_clean: list[str] = []

    logger.info(f"Running {len(FORENSIC_RULES)} forensic rules on {len(document_names)} documents...")

    for rule_name, rule_fn in FORENSIC_RULES:
        try:
            flag = rule_fn(extracted_data)
            if flag:
                flags.append(flag)
                rules_fired.append(rule_name)
                logger.info(f"  🚨 Rule FIRED: {rule_name} [{flag.severity.value.upper()}]")
            else:
                rules_clean.append(rule_name)
                logger.debug(f"  ✓ Rule CLEAN: {rule_name}")
        except Exception as e:
            logger.error(f"  ⚠ Rule ERROR: {rule_name} — {e}")

    # Compute suspicion score based on fired flags
    score = 0
    for flag in flags:
        if flag.severity == Severity.CRITICAL:
            score += 35
        elif flag.severity == Severity.HIGH:
            score += 20
        elif flag.severity == Severity.MEDIUM:
            score += 10
        else:
            score += 5
    score = min(100, score)

    is_suspicious = score >= 30

    # Generate human-readable summary
    total_docs = len(document_names)
    if not flags:
        summary = (
            f"All {len(FORENSIC_RULES)} forensic rules passed for {total_docs} document(s). "
            f"No mathematical inconsistencies, income inflations, or arithmetic fraud detected. "
            f"Figures are internally consistent across documents."
        )
    else:
        critical = sum(1 for f in flags if f.severity == Severity.CRITICAL)
        high = sum(1 for f in flags if f.severity == Severity.HIGH)
        medium = sum(1 for f in flags if f.severity == Severity.MEDIUM)
        fired_names = ", ".join(rules_fired[:3])
        summary = (
            f"{len(flags)} forensic violation(s) detected across {total_docs} document(s). "
            f"Severity breakdown: {critical} CRITICAL, {high} HIGH, {medium} MEDIUM. "
            f"Key issues: {fired_names}{'...' if len(rules_fired) > 3 else ''}. "
            f"{'Immediate manual review required.' if critical > 0 else 'Manual verification recommended.'}"
        )

    logger.info(f"Forensic engine complete: score={score}, flags={len(flags)}")

    return AIAnalysisResult(
        summary=summary,
        suspicion_score=score,
        flags=flags,
        is_suspicious=is_suspicious,
    )
