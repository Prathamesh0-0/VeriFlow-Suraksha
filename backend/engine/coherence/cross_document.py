"""
VeriFlow — Cross-Document Coherence Validator
Builds an automated relationship matrix across multiple documents
to detect contradictions that single-file scanners miss.
"""
from __future__ import annotations

from difflib import SequenceMatcher
from typing import Optional

from engine.models import (
    Contradiction,
    CoherenceResult,
    DocumentFields,
    DocumentType,
    ExtractedField,
    Severity,
    Verdict,
)
from config import (
    NAME_MATCH_THRESHOLD,
    SALARY_BANK_TOLERANCE,
    ANNUAL_INCOME_DEVIATION,
)


def _find_field(
    doc_fields: DocumentFields, field_name: str
) -> Optional[ExtractedField]:
    """Find a specific field by name in a document's extracted fields."""
    for f in doc_fields.fields:
        if f.field_name == field_name:
            return f
    return None


def _fuzzy_match(s1: str, s2: str) -> float:
    """Compute fuzzy string similarity ratio."""
    return SequenceMatcher(
        None,
        s1.lower().strip(),
        s2.lower().strip(),
    ).ratio()


def _check_name_consistency(
    all_docs: list[DocumentFields],
) -> tuple[bool, list[Contradiction]]:
    """
    Compare applicant names across all documents.
    Uses fuzzy matching to account for minor spelling variations.
    """
    contradictions = []
    name_fields = []

    # Collect all name-like fields
    for doc in all_docs:
        for name_key in ["employee_name", "account_holder", "name"]:
            field = _find_field(doc, name_key)
            if field and field.value.strip():
                name_fields.append(field)

    if len(name_fields) < 2:
        return True, contradictions

    # Compare each pair
    is_consistent = True
    reference = name_fields[0]

    for other in name_fields[1:]:
        ratio = _fuzzy_match(reference.value, other.value)
        if ratio < NAME_MATCH_THRESHOLD:
            is_consistent = False
            contradictions.append(Contradiction(
                field_a=reference,
                field_b=other,
                relationship="Names should match across documents",
                expected_value=reference.value,
                actual_deviation=f"Similarity: {ratio:.1%}",
                severity=Severity.CRITICAL,
                description=(
                    f"Name mismatch: '{reference.value}' "
                    f"(from {reference.source_document}) vs "
                    f"'{other.value}' (from {other.source_document}). "
                    f"Fuzzy match ratio: {ratio:.1%}, "
                    f"threshold: {NAME_MATCH_THRESHOLD:.0%}."
                ),
            ))

    return is_consistent, contradictions


def _check_salary_bank_match(
    salary_doc: Optional[DocumentFields],
    bank_doc: Optional[DocumentFields],
) -> tuple[bool, list[Contradiction]]:
    """
    Verify that net salary on the salary slip matches
    the corresponding monthly salary credit on the bank statement.
    """
    contradictions = []

    if salary_doc is None or bank_doc is None:
        return True, contradictions

    net_pay = _find_field(salary_doc, "net_pay")
    salary_credit = _find_field(bank_doc, "salary_credit")

    if net_pay is None or salary_credit is None:
        return True, contradictions

    if net_pay.numeric_value is None or salary_credit.numeric_value is None:
        return True, contradictions

    diff = abs(net_pay.numeric_value - salary_credit.numeric_value)

    if diff > SALARY_BANK_TOLERANCE:
        contradictions.append(Contradiction(
            field_a=net_pay,
            field_b=salary_credit,
            relationship="Net salary should match bank salary credit",
            expected_value=f"₹{net_pay.numeric_value:,.2f}",
            actual_deviation=f"₹{diff:,.2f} difference",
            severity=Severity.CRITICAL if diff > 5000 else Severity.HIGH,
            description=(
                f"Net pay on salary slip (₹{net_pay.numeric_value:,.2f}) "
                f"does not match salary credit in bank statement "
                f"(₹{salary_credit.numeric_value:,.2f}). "
                f"Difference: ₹{diff:,.2f}. "
                f"Tolerance: ±₹{SALARY_BANK_TOLERANCE}."
            ),
        ))
        return False, contradictions

    return True, contradictions


def _check_salary_itr_match(
    salary_doc: Optional[DocumentFields],
    itr_doc: Optional[DocumentFields],
) -> tuple[bool, list[Contradiction]]:
    """
    Compare gross annual salary (monthly × 12) against
    ITR gross total income.
    """
    contradictions = []

    if salary_doc is None or itr_doc is None:
        return True, contradictions

    gross_monthly = _find_field(salary_doc, "gross_salary")
    gross_annual_itr = _find_field(itr_doc, "gross_total_income")

    if gross_monthly is None or gross_annual_itr is None:
        return True, contradictions

    if gross_monthly.numeric_value is None or gross_annual_itr.numeric_value is None:
        return True, contradictions

    expected_annual = gross_monthly.numeric_value * 12
    actual_annual = gross_annual_itr.numeric_value
    deviation = abs(actual_annual - expected_annual) / expected_annual if expected_annual > 0 else 0

    if deviation > ANNUAL_INCOME_DEVIATION:
        contradictions.append(Contradiction(
            field_a=gross_monthly,
            field_b=gross_annual_itr,
            relationship="Monthly salary × 12 should approximate ITR gross income",
            expected_value=f"₹{expected_annual:,.2f} (₹{gross_monthly.numeric_value:,.2f} × 12)",
            actual_deviation=f"{deviation:.1%} deviation",
            severity=Severity.CRITICAL if deviation > 0.20 else Severity.HIGH,
            description=(
                f"Gross salary on slip (₹{gross_monthly.numeric_value:,.2f}/month) "
                f"implies annual income of ₹{expected_annual:,.2f}, "
                f"but ITR reports ₹{actual_annual:,.2f}. "
                f"Deviation: {deviation:.1%} "
                f"(tolerance: {ANNUAL_INCOME_DEVIATION:.0%})."
            ),
        ))
        return False, contradictions

    return True, contradictions


def _check_arithmetic_consistency(
    salary_doc: Optional[DocumentFields],
) -> tuple[bool, list[Contradiction]]:
    """
    Verify internal arithmetic on the salary slip:
    Gross = Basic + HRA + DA + Other Allowances
    Net = Gross - PF - TDS - PT - Other Deductions
    """
    contradictions = []

    if salary_doc is None:
        return True, contradictions

    gross = _find_field(salary_doc, "gross_salary")
    basic = _find_field(salary_doc, "basic_pay")
    hra = _find_field(salary_doc, "hra")
    da = _find_field(salary_doc, "da")
    pf = _find_field(salary_doc, "pf_deduction")
    tds = _find_field(salary_doc, "tds")
    pt = _find_field(salary_doc, "professional_tax")
    net = _find_field(salary_doc, "net_pay")

    # Check: Gross ≈ Basic + HRA + DA (+ other allowances)
    if all(f and f.numeric_value for f in [gross, basic, hra, da]):
        computed_earnings = basic.numeric_value + hra.numeric_value + da.numeric_value
        # There may be other allowances, so gross should be >= computed
        other_allowances = gross.numeric_value - computed_earnings
        if other_allowances < -100:  # Earnings exceed gross
            contradictions.append(Contradiction(
                field_a=gross,
                field_b=basic,
                relationship="Gross salary should ≥ Basic + HRA + DA",
                expected_value=f"≥ ₹{computed_earnings:,.2f}",
                actual_deviation=f"₹{other_allowances:,.2f} shortfall",
                severity=Severity.HIGH,
                description=(
                    f"Sum of Basic (₹{basic.numeric_value:,.2f}) + "
                    f"HRA (₹{hra.numeric_value:,.2f}) + "
                    f"DA (₹{da.numeric_value:,.2f}) = "
                    f"₹{computed_earnings:,.2f}, but Gross is only "
                    f"₹{gross.numeric_value:,.2f}. "
                    f"Earnings components exceed gross salary."
                ),
            ))

    # Check: Net ≈ Gross - PF - TDS - PT
    if all(f and f.numeric_value for f in [gross, net]):
        deductions = sum(
            f.numeric_value for f in [pf, tds, pt]
            if f and f.numeric_value
        )
        expected_net = gross.numeric_value - deductions
        net_diff = abs(net.numeric_value - expected_net)

        if net_diff > 500:  # Allow ₹500 for untracked deductions
            contradictions.append(Contradiction(
                field_a=gross,
                field_b=net,
                relationship="Net = Gross - Total Deductions",
                expected_value=f"₹{expected_net:,.2f}",
                actual_deviation=f"₹{net_diff:,.2f} discrepancy",
                severity=Severity.HIGH if net_diff > 2000 else Severity.MEDIUM,
                description=(
                    f"Expected Net Pay: Gross (₹{gross.numeric_value:,.2f}) - "
                    f"Deductions (₹{deductions:,.2f}) = ₹{expected_net:,.2f}. "
                    f"Stated Net Pay: ₹{net.numeric_value:,.2f}. "
                    f"Discrepancy: ₹{net_diff:,.2f}."
                ),
            ))
            return len(contradictions) == 0, contradictions

    return len(contradictions) == 0, contradictions


def validate(
    all_documents: list[DocumentFields],
) -> CoherenceResult:
    """
    Execute full cross-document coherence validation.
    
    Compares extracted fields across salary slips, bank statements,
    and IT returns to identify contradictions and mathematical
    impossibilities.
    """
    doc_names = [d.document_name for d in all_documents]
    all_contradictions: list[Contradiction] = []

    # Find specific document types
    salary_doc = next((d for d in all_documents if d.document_type == DocumentType.SALARY_SLIP), None)
    bank_doc = next((d for d in all_documents if d.document_type == DocumentType.BANK_STATEMENT), None)
    itr_doc = next((d for d in all_documents if d.document_type == DocumentType.ITR_FORM), None)

    # 1. Name consistency check
    name_ok, name_contradictions = _check_name_consistency(all_documents)
    all_contradictions.extend(name_contradictions)

    # 2. Salary ↔ Bank Statement
    salary_bank_ok, salary_bank_contradictions = _check_salary_bank_match(salary_doc, bank_doc)
    all_contradictions.extend(salary_bank_contradictions)

    # 3. Salary ↔ ITR
    salary_itr_ok, salary_itr_contradictions = _check_salary_itr_match(salary_doc, itr_doc)
    all_contradictions.extend(salary_itr_contradictions)

    # 4. Internal arithmetic
    arith_ok, arith_contradictions = _check_arithmetic_consistency(salary_doc)
    all_contradictions.extend(arith_contradictions)

    # Calculate risk score
    score = 0
    for c in all_contradictions:
        if c.severity == Severity.CRITICAL:
            score += 30
        elif c.severity == Severity.HIGH:
            score += 20
        elif c.severity == Severity.MEDIUM:
            score += 10
        else:
            score += 5

    risk_score = min(100.0, score)

    if risk_score >= 60:
        verdict = Verdict.TAMPERED
    elif risk_score >= 25:
        verdict = Verdict.SUSPICIOUS
    else:
        verdict = Verdict.CLEAN

    return CoherenceResult(
        documents_compared=doc_names,
        contradictions=all_contradictions,
        name_consistency=name_ok,
        salary_bank_match=salary_bank_ok,
        salary_itr_match=salary_itr_ok,
        risk_score=round(risk_score, 2),
        verdict=verdict,
    )
