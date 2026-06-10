"""
VeriFlow — Indian Tax Logic Engine
Independently recalculates TDS and PF deductions using
FY 2024-25 tax slabs to catch mathematically impossible forgeries.
"""
from __future__ import annotations

from typing import Optional

from engine.models import (
    DocumentFields,
    DocumentType,
    ExtractedField,
    Severity,
    TaxBreakdown,
    TaxValidationResult,
    Verdict,
)
from config import (
    STANDARD_DEDUCTION,
    NEW_REGIME_SLABS,
    HEALTH_EDUCATION_CESS,
    EPF_EMPLOYEE_RATE,
    TDS_DEVIATION_TOLERANCE,
)


def _find_field(doc: DocumentFields, name: str) -> Optional[ExtractedField]:
    """Find a field by name."""
    for f in doc.fields:
        if f.field_name == name:
            return f
    return None


def calculate_income_tax(gross_annual: float, regime: str = "new") -> TaxBreakdown:
    """
    Calculate income tax for FY 2024-25 using the specified regime.
    
    New Regime (default):
    - Standard deduction: ₹50,000
    - Slabs: 0% up to 3L, 5% 3-6L, 10% 6-9L, 15% 9-12L, 20% 12-15L, 30% above 15L
    - 4% Health & Education Cess
    """
    slabs = NEW_REGIME_SLABS  # Using new regime as default

    taxable = gross_annual - STANDARD_DEDUCTION
    taxable = max(0, taxable)

    # Calculate tax slab by slab
    tax = 0.0
    prev_limit = 0

    for limit, rate in slabs:
        if taxable <= prev_limit:
            break
        taxable_in_slab = min(taxable, limit) - prev_limit
        if taxable_in_slab > 0:
            tax += taxable_in_slab * rate
        prev_limit = limit

    # Section 87A rebate: If taxable income ≤ ₹7,00,000 under new regime
    if regime == "new" and taxable <= 700_000:
        tax = 0

    cess = tax * HEALTH_EDUCATION_CESS
    total_tax = tax + cess
    monthly_tds = total_tax / 12

    return TaxBreakdown(
        gross_annual=gross_annual,
        standard_deduction=STANDARD_DEDUCTION,
        taxable_income=taxable,
        tax_before_cess=round(tax, 2),
        cess=round(cess, 2),
        total_tax=round(total_tax, 2),
        monthly_tds=round(monthly_tds, 2),
    )


def calculate_expected_pf(basic_monthly: float) -> float:
    """
    Calculate expected monthly PF (employee contribution).
    EPF Employee Rate: 12% of Basic Salary.
    """
    return round(basic_monthly * EPF_EMPLOYEE_RATE, 2)


def validate_tax(
    salary_doc: Optional[DocumentFields],
) -> TaxValidationResult:
    """
    Independently recalculate TDS and PF from the gross salary
    on the salary slip, then compare against stated values.
    
    This catches the most common forgery pattern: fraudsters
    inflate the gross salary but forget to adjust TDS/PF
    proportionally, creating mathematically impossible
    deduction ratios.
    """
    if salary_doc is None or salary_doc.document_type != DocumentType.SALARY_SLIP:
        return TaxValidationResult(
            document_name=salary_doc.document_name if salary_doc else "unknown",
            risk_score=0,
            verdict=Verdict.CLEAN,
        )

    doc_name = salary_doc.document_name
    notes: list[str] = []

    # Extract stated values
    gross_field = _find_field(salary_doc, "gross_salary")
    basic_field = _find_field(salary_doc, "basic_pay")
    tds_field = _find_field(salary_doc, "tds")
    pf_field = _find_field(salary_doc, "pf_deduction")
    net_field = _find_field(salary_doc, "net_pay")

    stated_gross = gross_field.numeric_value if gross_field else None
    stated_basic = basic_field.numeric_value if basic_field else None
    stated_tds = tds_field.numeric_value if tds_field else None
    stated_pf = pf_field.numeric_value if pf_field else None
    stated_net = net_field.numeric_value if net_field else None

    if stated_gross is None:
        notes.append("Gross salary not found — cannot perform tax validation.")
        return TaxValidationResult(
            document_name=doc_name,
            stated_gross_monthly=stated_gross,
            risk_score=0,
            verdict=Verdict.CLEAN,
            notes=notes,
        )

    # Recalculate TDS
    gross_annual = stated_gross * 12
    recalc = calculate_income_tax(gross_annual, regime="new")
    notes.append(f"Recalculated using FY 2024-25 New Tax Regime.")
    notes.append(f"Gross Annual: ₹{gross_annual:,.2f}")
    notes.append(f"Taxable Income: ₹{recalc.taxable_income:,.2f}")
    notes.append(f"Expected Monthly TDS: ₹{recalc.monthly_tds:,.2f}")

    # Compare TDS
    tds_valid = True
    tds_deviation = None
    if stated_tds is not None and recalc.monthly_tds > 0:
        tds_deviation = abs(stated_tds - recalc.monthly_tds) / recalc.monthly_tds
        if tds_deviation > TDS_DEVIATION_TOLERANCE:
            tds_valid = False
            notes.append(
                f"⚠ TDS MISMATCH: Stated ₹{stated_tds:,.2f} vs "
                f"Expected ₹{recalc.monthly_tds:,.2f} "
                f"(Deviation: {tds_deviation:.1%})"
            )
        else:
            notes.append(f"✓ TDS matches within tolerance ({tds_deviation:.1%})")
    elif stated_tds is not None and recalc.monthly_tds == 0:
        # Tax is 0 due to rebate, but TDS is stated
        if stated_tds > 100:
            tds_valid = False
            tds_deviation = 1.0
            notes.append(
                f"⚠ TDS MISMATCH: Stated ₹{stated_tds:,.2f} but "
                f"income qualifies for Section 87A rebate (zero tax)."
            )

    # Compare PF
    pf_valid = True
    pf_deviation = None
    expected_pf = None
    if stated_basic is not None:
        expected_pf = calculate_expected_pf(stated_basic)
        notes.append(f"Expected PF (12% of Basic ₹{stated_basic:,.2f}): ₹{expected_pf:,.2f}")

        if stated_pf is not None and expected_pf > 0:
            pf_deviation = abs(stated_pf - expected_pf) / expected_pf
            if pf_deviation > TDS_DEVIATION_TOLERANCE:
                pf_valid = False
                notes.append(
                    f"⚠ PF MISMATCH: Stated ₹{stated_pf:,.2f} vs "
                    f"Expected ₹{expected_pf:,.2f} "
                    f"(Deviation: {pf_deviation:.1%})"
                )
            else:
                notes.append(f"✓ PF matches within tolerance ({pf_deviation:.1%})")

    # Calculate risk score
    score = 0
    if not tds_valid:
        score += 40
    if not pf_valid:
        score += 30
    if tds_deviation and tds_deviation > 0.5:
        score += 20  # Extreme deviation bonus
    if pf_deviation and pf_deviation > 0.5:
        score += 10

    risk_score = min(100.0, score)

    if risk_score >= 60:
        verdict = Verdict.TAMPERED
    elif risk_score >= 25:
        verdict = Verdict.SUSPICIOUS
    else:
        verdict = Verdict.CLEAN

    return TaxValidationResult(
        document_name=doc_name,
        stated_gross_monthly=stated_gross,
        stated_tds=stated_tds,
        stated_pf=stated_pf,
        stated_net=stated_net,
        recalculated=recalc,
        expected_pf=expected_pf,
        tds_deviation_pct=round(tds_deviation * 100, 2) if tds_deviation is not None else None,
        pf_deviation_pct=round(pf_deviation * 100, 2) if pf_deviation is not None else None,
        tds_valid=tds_valid,
        pf_valid=pf_valid,
        risk_score=round(risk_score, 2),
        verdict=verdict,
        notes=notes,
    )
