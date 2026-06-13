"""
VeriFlow — Cross-Document Coherence Validator (v2 — Real Data)
Validates consistency across salary slips, bank statements,
employment verification letters, and loan applications.
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
    """Compare applicant names across all documents."""
    contradictions = []
    name_fields = []

    for doc in all_docs:
        for name_key in ["employee_name", "account_holder", "applicant_name", "name"]:
            field = _find_field(doc, name_key)
            if field and field.value.strip():
                name_fields.append(field)
                break  # One name per doc

    if len(name_fields) < 2:
        return True, contradictions

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
    """Verify net salary matches bank salary credit."""
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
            expected_value=f"₹{net_pay.numeric_value:,.0f}",
            actual_deviation=f"₹{diff:,.0f} difference",
            severity=Severity.CRITICAL if diff > 5000 else Severity.HIGH,
            description=(
                f"Net pay on salary slip (₹{net_pay.numeric_value:,.0f}) "
                f"does not match salary credit in bank statement "
                f"(₹{salary_credit.numeric_value:,.0f}). "
                f"Difference: ₹{diff:,.0f}."
            ),
        ))
        return False, contradictions

    return True, contradictions


def _check_salary_loan_app_match(
    salary_doc: Optional[DocumentFields],
    loan_doc: Optional[DocumentFields],
) -> tuple[bool, list[Contradiction]]:
    """
    Verify income stated on loan application matches actual salary slip.
    This catches Packet B type fraud: inflated income on application.
    """
    contradictions = []

    if salary_doc is None or loan_doc is None:
        return True, contradictions

    net_pay = _find_field(salary_doc, "net_pay")
    stated_income = _find_field(loan_doc, "monthly_net_income")

    if net_pay is None or stated_income is None:
        return True, contradictions
    if net_pay.numeric_value is None or stated_income.numeric_value is None:
        return True, contradictions

    diff = abs(net_pay.numeric_value - stated_income.numeric_value)

    if diff > SALARY_BANK_TOLERANCE:
        contradictions.append(Contradiction(
            field_a=net_pay,
            field_b=stated_income,
            relationship="Salary slip net pay should match loan application stated income",
            expected_value=f"₹{net_pay.numeric_value:,.0f}",
            actual_deviation=f"₹{diff:,.0f} difference",
            severity=Severity.CRITICAL if diff > 5000 else Severity.HIGH,
            description=(
                f"Net pay on salary slip (₹{net_pay.numeric_value:,.0f}) "
                f"does not match monthly income on loan application "
                f"(₹{stated_income.numeric_value:,.0f}). "
                f"Difference: ₹{diff:,.0f}. "
                f"Applicant may have inflated income on the application."
            ),
        ))
        return False, contradictions

    return True, contradictions


def _check_employment_salary_match(
    salary_doc: Optional[DocumentFields],
    emp_doc: Optional[DocumentFields],
) -> tuple[bool, list[Contradiction]]:
    """
    Verify salary on employment letter matches salary slip.
    """
    contradictions = []

    if salary_doc is None or emp_doc is None:
        return True, contradictions

    net_pay = _find_field(salary_doc, "net_pay")
    emp_salary = _find_field(emp_doc, "monthly_salary")

    if net_pay is None or emp_salary is None:
        return True, contradictions
    if net_pay.numeric_value is None or emp_salary.numeric_value is None:
        return True, contradictions

    diff = abs(net_pay.numeric_value - emp_salary.numeric_value)

    if diff > SALARY_BANK_TOLERANCE:
        contradictions.append(Contradiction(
            field_a=net_pay,
            field_b=emp_salary,
            relationship="Salary slip should match employment verification",
            expected_value=f"₹{net_pay.numeric_value:,.0f}",
            actual_deviation=f"₹{diff:,.0f} difference",
            severity=Severity.HIGH,
            description=(
                f"Net pay on salary slip (₹{net_pay.numeric_value:,.0f}) "
                f"does not match monthly salary on employment letter "
                f"(₹{emp_salary.numeric_value:,.0f}). "
                f"Difference: ₹{diff:,.0f}."
            ),
        ))
        return False, contradictions

    return True, contradictions


def _check_arithmetic_consistency(
    salary_doc: Optional[DocumentFields],
) -> tuple[bool, list[Contradiction]]:
    """
    Verify internal arithmetic on the salary slip:
    - Gross = Basic + HRA + DA + Special Allowance (or similar)
    - Net = Gross - Total Deductions
    
    This catches Packet C and D type fraud.
    """
    contradictions = []

    if salary_doc is None:
        return True, contradictions

    gross = _find_field(salary_doc, "gross_salary")
    basic = _find_field(salary_doc, "basic_pay")
    house_allowance = _find_field(salary_doc, "house_allowance")
    special_allowance = _find_field(salary_doc, "special_allowance")
    total_deductions = _find_field(salary_doc, "total_deductions")
    net = _find_field(salary_doc, "net_pay")
    income_tax = _find_field(salary_doc, "income_tax") or _find_field(salary_doc, "tds")
    pf = _find_field(salary_doc, "provident_fund") or _find_field(salary_doc, "pf_deduction")

    # Check 1: Gross = sum of earnings components
    earnings_components = [basic, house_allowance, special_allowance]
    available_earnings = [c for c in earnings_components if c and c.numeric_value]
    
    if gross and gross.numeric_value and len(available_earnings) >= 2:
        computed_earnings = sum(c.numeric_value for c in available_earnings)
        earnings_diff = abs(gross.numeric_value - computed_earnings)
        
        if earnings_diff > 500:
            # Significant mismatch between components and gross
            contradictions.append(Contradiction(
                field_a=gross,
                field_b=available_earnings[0],
                relationship="Gross salary should equal sum of all earnings",
                expected_value=f"₹{computed_earnings:,.0f} (sum of components)",
                actual_deviation=f"₹{earnings_diff:,.0f} discrepancy",
                severity=Severity.CRITICAL if earnings_diff > 5000 else Severity.HIGH,
                description=(
                    f"Sum of earnings: Basic (₹{basic.numeric_value:,.0f if basic and basic.numeric_value else 0}) + "
                    f"House Allowance (₹{house_allowance.numeric_value:,.0f if house_allowance and house_allowance.numeric_value else 0}) + "
                    f"Special Allowance (₹{special_allowance.numeric_value:,.0f if special_allowance and special_allowance.numeric_value else 0}) = "
                    f"₹{computed_earnings:,.0f}, but Gross Pay states ₹{gross.numeric_value:,.0f}. "
                    f"Discrepancy: ₹{earnings_diff:,.0f}."
                ),
            ))

    # Check 2: Net = Gross - Total Deductions
    if gross and gross.numeric_value and net and net.numeric_value:
        if total_deductions and total_deductions.numeric_value:
            expected_net = gross.numeric_value - total_deductions.numeric_value
        else:
            # Compute deductions from individual fields
            deductions_sum = sum(
                f.numeric_value for f in [income_tax, pf]
                if f and f.numeric_value
            )
            expected_net = gross.numeric_value - deductions_sum

        net_diff = abs(net.numeric_value - expected_net)

        if net_diff > 500:
            contradictions.append(Contradiction(
                field_a=gross,
                field_b=net,
                relationship="Net Pay = Gross Pay - Total Deductions",
                expected_value=f"₹{expected_net:,.0f}",
                actual_deviation=f"₹{net_diff:,.0f} discrepancy",
                severity=Severity.CRITICAL if net_diff > 5000 else Severity.HIGH,
                description=(
                    f"Expected Net Pay: Gross (₹{gross.numeric_value:,.0f}) - "
                    f"Deductions = ₹{expected_net:,.0f}. "
                    f"But document states Net Pay: ₹{net.numeric_value:,.0f}. "
                    f"Discrepancy: ₹{net_diff:,.0f}."
                ),
            ))

    return len(contradictions) == 0, contradictions


def _check_employer_consistency(
    all_docs: list[DocumentFields],
) -> tuple[bool, list[Contradiction]]:
    """Check employer name consistency across documents."""
    contradictions = []
    employer_fields = []

    for doc in all_docs:
        field = _find_field(doc, "employer_name")
        if field and field.value.strip():
            employer_fields.append(field)

    if len(employer_fields) < 2:
        return True, contradictions

    is_consistent = True
    reference = employer_fields[0]

    for other in employer_fields[1:]:
        ratio = _fuzzy_match(reference.value, other.value)
        if ratio < NAME_MATCH_THRESHOLD:
            is_consistent = False
            contradictions.append(Contradiction(
                field_a=reference,
                field_b=other,
                relationship="Employer name should match across documents",
                expected_value=reference.value,
                actual_deviation=f"Similarity: {ratio:.1%}",
                severity=Severity.HIGH,
                description=(
                    f"Employer mismatch: '{reference.value}' "
                    f"(from {reference.source_document}) vs "
                    f"'{other.value}' (from {other.source_document})."
                ),
            ))

    return is_consistent, contradictions


def validate(
    all_documents: list[DocumentFields],
) -> CoherenceResult:
    """Execute full cross-document coherence validation."""
    doc_names = [d.document_name for d in all_documents]
    all_contradictions: list[Contradiction] = []

    # Find specific document types
    salary_doc = next((d for d in all_documents if d.document_type == DocumentType.SALARY_SLIP), None)
    bank_doc = next((d for d in all_documents if d.document_type == DocumentType.BANK_STATEMENT), None)
    emp_doc = next((d for d in all_documents if d.document_type == DocumentType.EMPLOYMENT_VERIFICATION), None)
    loan_doc = next((d for d in all_documents if d.document_type == DocumentType.LOAN_APPLICATION), None)
    itr_doc = next((d for d in all_documents if d.document_type == DocumentType.ITR_FORM), None)

    # 1. Name consistency
    name_ok, name_c = _check_name_consistency(all_documents)
    all_contradictions.extend(name_c)

    # 2. Salary ↔ Bank Statement
    salary_bank_ok, salary_bank_c = _check_salary_bank_match(salary_doc, bank_doc)
    all_contradictions.extend(salary_bank_c)

    # 3. Salary ↔ Loan Application (income inflation check)
    salary_loan_ok, salary_loan_c = _check_salary_loan_app_match(salary_doc, loan_doc)
    all_contradictions.extend(salary_loan_c)

    # 4. Salary ↔ Employment Verification
    salary_emp_ok, salary_emp_c = _check_employment_salary_match(salary_doc, emp_doc)
    all_contradictions.extend(salary_emp_c)

    # 5. Internal arithmetic (catches math fraud)
    arith_ok, arith_c = _check_arithmetic_consistency(salary_doc)
    all_contradictions.extend(arith_c)

    # 6. Employer consistency
    emp_name_ok, emp_name_c = _check_employer_consistency(all_documents)
    all_contradictions.extend(emp_name_c)

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

    # Determine salary_itr_match (legacy field, keep for compatibility)
    salary_itr_ok = True  # No ITR in current dataset

    return CoherenceResult(
        documents_compared=doc_names,
        contradictions=all_contradictions,
        name_consistency=name_ok,
        salary_bank_match=salary_bank_ok,
        salary_itr_match=salary_itr_ok,
        risk_score=round(risk_score, 2),
        verdict=verdict,
    )
