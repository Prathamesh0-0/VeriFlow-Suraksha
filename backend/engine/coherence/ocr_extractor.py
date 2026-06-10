"""
VeriFlow — OCR Field Extractor
Extracts structured financial fields from loan documents using
Tesseract OCR with document-type-aware parsing strategies.
Includes graceful fallback with mock data when Tesseract is unavailable.
"""
from __future__ import annotations

import re
import os
from pathlib import Path
from typing import Optional

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False

try:
    import pymupdf as fitz
except ImportError:
    fitz = None

from engine.models import (
    DocumentFields,
    DocumentType,
    ExtractedField,
)


# ─── Document Type Detection ────────────────────────────────────────────────

DOCUMENT_TYPE_PATTERNS = {
    DocumentType.SALARY_SLIP: [
        r"salary\s*slip", r"pay\s*slip", r"payslip",
        r"gross\s*salary", r"net\s*pay", r"basic\s*pay",
        r"deductions", r"earnings",
    ],
    DocumentType.BANK_STATEMENT: [
        r"bank\s*statement", r"account\s*statement",
        r"transaction\s*history", r"opening\s*balance",
        r"closing\s*balance", r"credit", r"debit",
    ],
    DocumentType.ITR_FORM: [
        r"income\s*tax\s*return", r"itr", r"form\s*16",
        r"assessment\s*year", r"gross\s*total\s*income",
        r"tax\s*payable", r"section\s*80c",
    ],
    DocumentType.LAND_RECORD: [
        r"land\s*record", r"property", r"registration",
        r"stamp\s*duty", r"sub\s*registrar", r"deed",
        r"survey\s*number", r"khata",
    ],
}


def _detect_document_type(text: str, filename: str) -> DocumentType:
    """
    Classify document type based on content patterns and filename hints.
    """
    lower_text = text.lower()
    lower_name = filename.lower()

    scores = {}
    for doc_type, patterns in DOCUMENT_TYPE_PATTERNS.items():
        score = 0
        for pattern in patterns:
            matches = re.findall(pattern, lower_text)
            score += len(matches)
            # Filename hints carry extra weight
            if re.search(pattern, lower_name):
                score += 5
        scores[doc_type] = score

    best_type = max(scores, key=scores.get)
    if scores[best_type] > 0:
        return best_type
    return DocumentType.UNKNOWN


# ─── Amount Parsing ──────────────────────────────────────────────────────────

def _parse_amount(text: str) -> Optional[float]:
    """
    Parse Indian currency amount from text.
    Handles formats: ₹1,23,456.78 / Rs. 1,23,456 / 123456.78 / 1,23,456
    """
    # Remove currency symbols and common prefixes
    clean = re.sub(r"[₹$]|Rs\.?\s*|INR\s*", "", text.strip())
    # Remove commas
    clean = clean.replace(",", "").strip()
    # Extract the number
    match = re.search(r"([-+]?\d+\.?\d*)", clean)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            pass
    return None


# ─── Field Extraction Patterns ───────────────────────────────────────────────

SALARY_SLIP_FIELDS = {
    "employee_name": [r"(?:employee|name|emp)\s*:?\s*([A-Za-z\s\.]+?)(?:\n|$|employee)"],
    "employee_id": [r"(?:emp\s*(?:id|no|code)|employee\s*(?:id|no))\s*:?\s*(\S+)"],
    "gross_salary": [r"(?:gross\s*(?:salary|pay|earnings?))\s*:?\s*[₹Rs\.]*\s*([\d,]+\.?\d*)"],
    "basic_pay": [r"(?:basic\s*(?:pay|salary)?)\s*:?\s*[₹Rs\.]*\s*([\d,]+\.?\d*)"],
    "hra": [r"(?:hra|house\s*rent\s*allowance)\s*:?\s*[₹Rs\.]*\s*([\d,]+\.?\d*)"],
    "da": [r"(?:da|dearness\s*allowance)\s*:?\s*[₹Rs\.]*\s*([\d,]+\.?\d*)"],
    "pf_deduction": [
        r"(?:pf|provident\s*fund|epf)\s*(?:deduction)?\s*:?\s*[₹Rs\.]*\s*([\d,]+\.?\d*)",
        r"(?:employee\s*pf)\s*:?\s*[₹Rs\.]*\s*([\d,]+\.?\d*)",
    ],
    "tds": [
        r"(?:tds|tax\s*deducted|income\s*tax)\s*:?\s*[₹Rs\.]*\s*([\d,]+\.?\d*)",
        r"(?:tax\s*(?:deducted\s*at\s*source)?)\s*:?\s*[₹Rs\.]*\s*([\d,]+\.?\d*)",
    ],
    "professional_tax": [r"(?:professional\s*tax|pt)\s*:?\s*[₹Rs\.]*\s*([\d,]+\.?\d*)"],
    "net_pay": [
        r"(?:net\s*(?:pay|salary)|take\s*home)\s*:?\s*[₹Rs\.]*\s*([\d,]+\.?\d*)",
    ],
}

BANK_STATEMENT_FIELDS = {
    "account_holder": [r"(?:account\s*holder|name)\s*:?\s*([A-Za-z\s\.]+?)(?:\n|$)"],
    "account_number": [r"(?:account\s*(?:no|number)?|a/c\s*no)\s*:?\s*(\d+)"],
    "ifsc": [r"(?:ifsc|ifsc\s*code)\s*:?\s*([A-Z]{4}0[A-Z0-9]{6})"],
    "opening_balance": [r"(?:opening\s*balance)\s*:?\s*[₹Rs\.]*\s*([\d,]+\.?\d*)"],
    "closing_balance": [r"(?:closing\s*balance)\s*:?\s*[₹Rs\.]*\s*([\d,]+\.?\d*)"],
    "salary_credit": [
        r"(?:salary|sal)\s*.*?([\d,]+\.?\d*)\s*(?:cr|credit)?",
        r"(?:credit|cr)\s*.*?salary.*?([\d,]+\.?\d*)",
    ],
}

ITR_FIELDS = {
    "pan": [r"(?:pan|permanent\s*account)\s*:?\s*([A-Z]{5}\d{4}[A-Z])"],
    "assessment_year": [r"(?:assessment\s*year|ay)\s*:?\s*(20\d{2}-\d{2,4})"],
    "gross_total_income": [r"(?:gross\s*total\s*income)\s*:?\s*[₹Rs\.]*\s*([\d,]+\.?\d*)"],
    "total_deductions": [r"(?:total\s*deductions?|chapter\s*vi-?a)\s*:?\s*[₹Rs\.]*\s*([\d,]+\.?\d*)"],
    "taxable_income": [r"(?:(?:total|net)\s*taxable\s*income)\s*:?\s*[₹Rs\.]*\s*([\d,]+\.?\d*)"],
    "tax_payable": [r"(?:tax\s*payable|total\s*tax)\s*:?\s*[₹Rs\.]*\s*([\d,]+\.?\d*)"],
    "tds_claimed": [r"(?:tds\s*(?:claimed|deducted))\s*:?\s*[₹Rs\.]*\s*([\d,]+\.?\d*)"],
}


def _extract_text_from_pdf(file_path: str) -> str:
    """Extract all text from a PDF using PyMuPDF."""
    if fitz is None:
        return ""
    try:
        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text("text") + "\n"
        doc.close()
        return text
    except Exception:
        return ""


def _extract_text_with_tesseract(file_path: str) -> str:
    """Extract text using Tesseract OCR (for scanned images)."""
    if not TESSERACT_AVAILABLE:
        return ""
    try:
        # For PDFs, render to images first
        ext = Path(file_path).suffix.lower()
        if ext == ".pdf" and fitz:
            doc = fitz.open(file_path)
            text = ""
            for page in doc:
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                img_data = pix.tobytes("png")
                import tempfile
                with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                    tmp.write(img_data)
                    tmp_path = tmp.name
                text += pytesseract.image_to_string(tmp_path) + "\n"
                os.unlink(tmp_path)
            doc.close()
            return text
        else:
            return pytesseract.image_to_string(file_path)
    except Exception:
        return ""


def _extract_fields_by_patterns(
    text: str,
    patterns: dict[str, list[str]],
    doc_name: str,
    doc_type: DocumentType,
) -> list[ExtractedField]:
    """Apply regex patterns to extract structured fields."""
    fields = []
    lower_text = text.lower()

    for field_name, field_patterns in patterns.items():
        for pattern in field_patterns:
            matches = re.finditer(pattern, lower_text)
            for match in matches:
                raw_value = match.group(1).strip()
                numeric = _parse_amount(raw_value)

                fields.append(ExtractedField(
                    field_name=field_name,
                    value=raw_value,
                    numeric_value=numeric,
                    confidence=0.75,
                    source_document=doc_name,
                ))
                break  # Take first match per field
            else:
                continue
            break

    return fields


# ─── Mock Data for Demo (when Tesseract unavailable) ────────────────────────

def _generate_mock_salary_slip(doc_name: str) -> list[ExtractedField]:
    """Generate realistic salary slip data for demo purposes."""
    return [
        ExtractedField(field_name="employee_name", value="Rajesh Kumar Sharma", confidence=0.95, source_document=doc_name),
        ExtractedField(field_name="employee_id", value="EMP-2024-1847", confidence=0.92, source_document=doc_name),
        ExtractedField(field_name="gross_salary", value="85,000", numeric_value=85000, confidence=0.88, source_document=doc_name),
        ExtractedField(field_name="basic_pay", value="42,500", numeric_value=42500, confidence=0.90, source_document=doc_name),
        ExtractedField(field_name="hra", value="21,250", numeric_value=21250, confidence=0.87, source_document=doc_name),
        ExtractedField(field_name="da", value="8,500", numeric_value=8500, confidence=0.85, source_document=doc_name),
        ExtractedField(field_name="pf_deduction", value="5,100", numeric_value=5100, confidence=0.90, source_document=doc_name),
        ExtractedField(field_name="tds", value="6,250", numeric_value=6250, confidence=0.88, source_document=doc_name),
        ExtractedField(field_name="professional_tax", value="200", numeric_value=200, confidence=0.92, source_document=doc_name),
        ExtractedField(field_name="net_pay", value="73,450", numeric_value=73450, confidence=0.89, source_document=doc_name),
    ]


def _generate_mock_bank_statement(doc_name: str, tampered: bool = False) -> list[ExtractedField]:
    """Generate realistic bank statement data. If tampered, salary credit won't match."""
    salary_credit = 78450 if tampered else 73450  # Mismatch vs net_pay if tampered
    return [
        ExtractedField(field_name="account_holder", value="Rajesh Kumar Sharma", confidence=0.94, source_document=doc_name),
        ExtractedField(field_name="account_number", value="50200041234567", confidence=0.96, source_document=doc_name),
        ExtractedField(field_name="ifsc", value="HDFC0001234", confidence=0.98, source_document=doc_name),
        ExtractedField(field_name="opening_balance", value="1,45,230", numeric_value=145230, confidence=0.90, source_document=doc_name),
        ExtractedField(field_name="closing_balance", value="2,18,680", numeric_value=218680, confidence=0.90, source_document=doc_name),
        ExtractedField(field_name="salary_credit", value=f"{salary_credit:,}", numeric_value=salary_credit, confidence=0.85, source_document=doc_name),
    ]


def _generate_mock_itr(doc_name: str, tampered: bool = False) -> list[ExtractedField]:
    """Generate realistic ITR data. If tampered, income won't match salary."""
    gross_income = 1250000 if tampered else 1020000  # 85k × 12 = 10.2L
    return [
        ExtractedField(field_name="pan", value="ABCPS1234K", confidence=0.97, source_document=doc_name),
        ExtractedField(field_name="assessment_year", value="2025-26", confidence=0.95, source_document=doc_name),
        ExtractedField(field_name="gross_total_income", value=f"{gross_income:,}", numeric_value=gross_income, confidence=0.88, source_document=doc_name),
        ExtractedField(field_name="total_deductions", value="1,50,000", numeric_value=150000, confidence=0.85, source_document=doc_name),
        ExtractedField(field_name="taxable_income", value=f"{gross_income - 150000:,}", numeric_value=gross_income - 150000, confidence=0.86, source_document=doc_name),
        ExtractedField(field_name="tds_claimed", value="75,000", numeric_value=75000, confidence=0.88, source_document=doc_name),
    ]


# ─── Main Extract Function ──────────────────────────────────────────────────

def extract_fields(
    file_path: str,
    document_name: str,
    force_mock: bool = False,
    is_tampered_demo: bool = False,
) -> DocumentFields:
    """
    Extract structured financial fields from a document.
    
    Attempts real OCR extraction first, falls back to mock data
    for demo purposes when Tesseract is unavailable.
    """
    # Try real extraction first
    text = ""
    if not force_mock:
        text = _extract_text_from_pdf(file_path)
        if not text.strip() and TESSERACT_AVAILABLE:
            text = _extract_text_with_tesseract(file_path)

    if text.strip():
        # Real extraction path
        doc_type = _detect_document_type(text, document_name)

        pattern_map = {
            DocumentType.SALARY_SLIP: SALARY_SLIP_FIELDS,
            DocumentType.BANK_STATEMENT: BANK_STATEMENT_FIELDS,
            DocumentType.ITR_FORM: ITR_FIELDS,
        }

        patterns = pattern_map.get(doc_type, {})
        fields = _extract_fields_by_patterns(text, patterns, document_name, doc_type)

        return DocumentFields(
            document_name=document_name,
            document_type=doc_type,
            fields=fields,
        )

    # Fallback: detect type from filename and use mock data
    lower_name = document_name.lower()
    if any(k in lower_name for k in ["salary", "pay", "slip"]):
        doc_type = DocumentType.SALARY_SLIP
        fields = _generate_mock_salary_slip(document_name)
    elif any(k in lower_name for k in ["bank", "statement", "account"]):
        doc_type = DocumentType.BANK_STATEMENT
        fields = _generate_mock_bank_statement(document_name, tampered=is_tampered_demo)
    elif any(k in lower_name for k in ["itr", "tax", "return", "form16"]):
        doc_type = DocumentType.ITR_FORM
        fields = _generate_mock_itr(document_name, tampered=is_tampered_demo)
    else:
        doc_type = DocumentType.UNKNOWN
        fields = []

    return DocumentFields(
        document_name=document_name,
        document_type=doc_type,
        fields=fields,
    )
