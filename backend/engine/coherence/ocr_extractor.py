"""
VeriFlow — OCR Field Extractor (v2 — Real Data)
Extracts structured financial fields from loan documents.
Uses PyMuPDF for text-based PDFs and EasyOCR for image-based (scanned) PDFs.
No mock data — everything is extracted from real documents.
"""
from __future__ import annotations

import re
import logging
from pathlib import Path
from typing import Optional

import numpy as np

try:
    import pymupdf as fitz
except ImportError:
    fitz = None

from engine.models import (
    DocumentFields,
    DocumentType,
    ExtractedField,
)

logger = logging.getLogger("veriflow.ocr")

# ─── Lazy-loaded EasyOCR Reader ─────────────────────────────────────────────
_ocr_reader = None


def _get_ocr_reader():
    """Lazily initialize EasyOCR reader (heavy — ~30s first call)."""
    global _ocr_reader
    if _ocr_reader is None:
        try:
            import easyocr
            logger.info("Initializing EasyOCR reader...")
            _ocr_reader = easyocr.Reader(['en'], gpu=False, verbose=False)
            logger.info("EasyOCR reader ready.")
        except ImportError:
            logger.warning("EasyOCR not installed — image-based OCR unavailable.")
            _ocr_reader = False  # Sentinel: tried and failed
    return _ocr_reader if _ocr_reader is not False else None


# ─── Document Type Detection ────────────────────────────────────────────────

DOCUMENT_TYPE_PATTERNS = {
    DocumentType.SALARY_SLIP: [
        r"salary\s*slip", r"pay\s*slip", r"payslip",
        r"gross\s*(?:salary|pay)", r"net\s*pay", r"basic\s*pay",
        r"deductions", r"earnings",
    ],
    DocumentType.BANK_STATEMENT: [
        r"bank\s*statement", r"account\s*statement",
        r"transaction\s*(?:details|history)", r"opening\s*balance",
        r"closing\s*balance", r"salary\s*credit",
        r"account\s*holder", r"account\s*summary",
    ],
    DocumentType.EMPLOYMENT_VERIFICATION: [
        r"employment\s*(?:verification|letter|certificate)",
        r"to\s*whom\s*it\s*may\s*concern",
        r"hereby\s*certif", r"currently\s*employed",
        r"annual\s*ctc", r"date\s*of\s*joining",
    ],
    DocumentType.LOAN_APPLICATION: [
        r"loan\s*application", r"loan\s*details",
        r"personal\s*details", r"employment\s*details",
        r"requested\s*loan\s*amount", r"loan\s*type",
        r"monthly\s*net\s*income", r"declaration",
        r"finfirst", r"application\s*id",
    ],
    DocumentType.ITR_FORM: [
        r"income\s*tax\s*return", r"itr", r"form\s*16",
        r"assessment\s*year", r"gross\s*total\s*income",
        r"tax\s*payable", r"section\s*80c",
    ],
    DocumentType.LAND_RECORD: [
        r"land\s*record", r"property", r"registration",
        r"stamp\s*duty", r"sub\s*registrar", r"deed",
    ],
}


def _detect_document_type(text: str, filename: str) -> DocumentType:
    """Classify document type based on content patterns and filename hints."""
    lower_text = text.lower()
    lower_name = filename.lower()

    scores = {}
    for doc_type, patterns in DOCUMENT_TYPE_PATTERNS.items():
        score = 0
        for pattern in patterns:
            matches = re.findall(pattern, lower_text)
            score += len(matches)
            if re.search(pattern, lower_name):
                score += 5
        scores[doc_type] = score

    best_type = max(scores, key=scores.get)
    if scores[best_type] > 0:
        return best_type

    # Filename-only fallback
    if any(k in lower_name for k in ["salary", "pay", "slip"]):
        return DocumentType.SALARY_SLIP
    elif any(k in lower_name for k in ["bank", "statement", "account"]):
        return DocumentType.BANK_STATEMENT
    elif any(k in lower_name for k in ["employment", "verification"]):
        return DocumentType.EMPLOYMENT_VERIFICATION
    elif any(k in lower_name for k in ["loan", "application"]):
        return DocumentType.LOAN_APPLICATION
    elif any(k in lower_name for k in ["itr", "tax", "return"]):
        return DocumentType.ITR_FORM

    return DocumentType.UNKNOWN


# ─── Amount Parsing ──────────────────────────────────────────────────────────

def _parse_amount(text: str) -> Optional[float]:
    """
    Parse Indian currency amount from text with OCR typo correction.
    Handles: ₹1,23,456.78 / Rs. 1,23,456 / 77,400 / 99400 and OCR typos like 'S0,000'.
    """
    clean = text.strip()
    # Strip currency prefixes first (before OCR correction)
    clean = re.sub(r"[₹$€]|Rs\.?\s*|INR\s*|[ZTCR()]+", "", clean)
    clean = clean.strip()
    
    # Fix common OCR typos in the remaining (now numeric) string
    clean = clean.replace('S', '5').replace('s', '5')
    clean = clean.replace('O', '0').replace('o', '0')
    clean = clean.replace('B', '8')
    clean = clean.replace('l', '1').replace('|', '1')
    
    clean = clean.replace(",", "").strip()
    match = re.search(r"([-+]?\d+\.?\d*)", clean)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            pass
    return None


# ─── Text Extraction ─────────────────────────────────────────────────────────

def _extract_text_from_pdf(file_path: str) -> str:
    """Extract text layer from a PDF using PyMuPDF."""
    if fitz is None:
        return ""
    try:
        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text("text") + "\n"
        doc.close()
        return text.strip()
    except Exception as e:
        logger.error(f"PyMuPDF text extraction failed: {e}")
        return ""


def _ocr_image_pdf(file_path: str) -> str:
    """Run EasyOCR on image-based PDF pages."""
    reader = _get_ocr_reader()
    if reader is None or fitz is None:
        return ""

    try:
        doc = fitz.open(file_path)
        all_text = []
        for i in range(min(len(doc), 3)):  # Limit to first 3 pages for speed
            page = doc[i]
            pix = page.get_pixmap(dpi=150)  # Reduced DPI for faster CPU OCR
            img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
            if pix.n == 4:
                img = img[:, :, :3]

            results = reader.readtext(img, detail=0, paragraph=True)
            all_text.extend(results)

        doc.close()
        return "\n".join(all_text)
    except Exception as e:
        logger.error(f"EasyOCR extraction failed: {e}")
        return ""


def _get_full_text(file_path: str) -> str:
    """Get text from PDF — tries native text first, falls back to OCR."""
    text = _extract_text_from_pdf(file_path)
    if len(text.strip()) > 50:
        return text

    # Image-based PDF — run OCR
    logger.info(f"No text layer, running OCR on {Path(file_path).name}")
    ocr_text = _ocr_image_pdf(file_path)
    return ocr_text


# ─── Field Extraction Patterns ───────────────────────────────────────────────
# These are tuned to the actual document formats in the dataset

SALARY_SLIP_FIELDS = {
    "employee_name": [
        r"employee\s*name\s*(?::|\.)*\s*(.+?)(?:\n|designation|$)",
        r"name\s*(?::|\.)*\s*([A-Za-z\s\.]+?)(?:\n|$)",
    ],
    "employee_id": [
        r"(?:emp\s*(?:id|no|code)|employee\s*id)\s*(?::|\.)*\s*(\S+)",
    ],
    "pan": [
        r"(?:pan)\s*(?::|\.)*\s*([A-Z]{5}\s*\d{4}\s*[A-Z0-9])",
    ],
    "gross_salary": [
        r"gross\s*pay\s*(?::|\.)*\s*[₹Rs\.ZTCR()\s]*\s*([\d,]+\.?\d*)",
        r"gross\s*salary\s*(?::|\.)*\s*[₹Rs\.ZTCR()\s]*\s*([\d,]+\.?\d*)",
    ],
    "basic_pay": [
        r"basic\s*pay\s*(?::|\.)*\s*[₹Rs\.ZTCR()\s]*\s*([\d,]+\.?\d*)",
    ],
    "house_allowance": [
        r"house\s*(?:rent\s*)?allowance\s*(?::|\.)*\s*[₹Rs\.ZTCR()\s]*\s*([\d,]+\.?\d*)",
    ],
    "special_allowance": [
        r"special\s*allowance\s*(?::|\.)*\s*[₹Rs\.ZTCR()\s]*\s*([\d,]+\.?\d*)",
    ],
    "income_tax": [
        r"income\s*tax\s*(?::|\.)*\s*[₹Rs\.ZTCR()\s]*\s*([\d,]+\.?\d*)",
        r"(?:tds|tax\s*deducted)\s*(?::|\.)*\s*[₹Rs\.ZTCR()\s]*\s*([\d,]+\.?\d*)",
    ],
    "provident_fund": [
        r"provident\s*fund\s*(?::|\.)*\s*[₹Rs\.ZTCR()\s]*\s*([\d,]+\.?\d*)",
        r"(?:pf|epf)\s*(?:deduction)?\s*(?::|\.)*\s*[₹Rs\.ZTCR()\s]*\s*([\d,]+\.?\d*)",
    ],
    "total_deductions": [
        r"total\s*deductions?\s*(?::|\.)*\s*[₹Rs\.ZTCR()\s]*\s*([\d,]+\.?\d*)",
    ],
    "net_pay": [
        r"net\s*pay\s*\(?(?:T|in\s*words)?\)?\s*(?::|\.)*\s*[₹Rs\.ZTCR()\s]*\s*([\d,]+\.?\d*)",
        r"net\s*pay\s*\(T\)\s*\n?\s*([\d,]+\.?\d*)",
    ],
}

BANK_STATEMENT_FIELDS = {
    "account_holder": [
        r"account\s*holder\s*name\s*(?::|\.)*\s*([A-Za-z\s\.]+?)(?:\n|$|account)",
        r"holder\s*name\s*(?::|\.)*\s*([A-Za-z\s]+)",
    ],
    "account_number": [
        r"account\s*number\s*(?::|\.)*\s*(\d[\d\s]+\d)",
        r"a/?c\s*no\s*(?::|\.)*\s*(\d+)",
    ],
    "ifsc": [
        r"ifsc\s*(?:code)?\s*(?::|\.)*\s*([A-Z0-9]{11})",
    ],
    "opening_balance": [
        r"opening\s*balance\s*(?:\([^)]*\))?\s*(?::|\.)*\s*[₹Rs\.]*\s*([\d,]+\.?\d*)",
    ],
    "closing_balance": [
        r"closing\s*balance\s*(?:\([^)]*\))?\s*(?::|\.)*\s*[₹Rs\.]*\s*([\d,]+\.?\d*)",
    ],
    "total_credits": [
        r"total\s*credits?\s*(?::|\.)*\s*[₹Rs\.]*\s*([\d,]+\.?\d*)",
    ],
    "salary_credit": [
        r"salary\s*credit\s*[^₹\d]*?[₹Rs\.]*\s*([\d,]+\.?\d*)",
    ],
}

EMPLOYMENT_VERIFICATION_FIELDS = {
    "employee_name": [
        r"(?:mr\.?|ms\.?|mrs\.?)\s*([A-Za-z\s]+?)(?:\s*has\s*been|\s*is\s*)",
        r"certif[yied]+\s+that\s+(?:mr\.?|ms\.?)?\s*([A-Za-z\s]+?)(?:\s*has|\s*is|\s*,)",
    ],
    "employer_name": [
        r"(?:company|employer|organization)\s*(?::|\.)*\s*([A-Za-z\s\.]+?)(?:\n|$)",
        r"(TechNova\s+Pvt\.?\s+Ltd\.?)",
    ],
    "designation": [
        r"designation\s*(?:of|:|\.)*\s*([A-Za-z\s]+?)(?:\n|$|in\s+the)",
    ],
    "department": [
        r"department\s*(?:of|:|\.)*\s*([A-Za-z\s]+?)(?:\n|$)",
    ],
    "date_of_joining": [
        r"(?:date\s*of\s*joining|joined?\s*(?:on|date)?|doj)\s*(?::|\.)*\s*([\w\-/,\s]+?)(?:\n|$|\.)",
    ],
    "monthly_salary": [
        r"(?:monthly\s*(?:net\s*)?(?:salary|compensation|income)|net\s*monthly)\s*(?:of|:|is|\.)*\s*[₹Rs\.]*\s*([\d,]+\.?\d*)",
        r"(?:drawing|receives?)\s+.*?[₹Rs\.]*\s*([\d,]+\.?\d*)\s*(?:per\s*month|monthly|p\.?m\.?)",
    ],
    "annual_ctc": [
        r"(?:annual\s*ctc|ctc|annual\s*compensation|annual\s*(?:package|salary))\s*(?:of|:|is|\.)*\s*[₹Rs\.]*\s*([\d,]+\.?\d*)",
    ],
}

LOAN_APPLICATION_FIELDS = {
    "applicant_name": [
        r"(?:full\s*name|applicant\s*name|name)\s*(?::|\.)*\s*([A-Za-z\s]+?)(?:\n|$|date|father)",
    ],
    "pan": [
        r"pan\s*(?:number|no\.?)?\s*(?::|\.)*\s*([A-Z0-9]{10})",
    ],
    "employer_name": [
        r"employer\s*name\s*(?::|\.)*\s*([A-Za-z\s\.]+?)(?:\n|$|designation)",
    ],
    "designation": [
        r"designation\s*(?::|\.)*\s*([A-Za-z\s]+?)(?:\n|$|department)",
    ],
    "monthly_net_income": [
        r"monthly\s*net\s*income\s*(?::|\.)*\s*[₹Rs\.]*\s*([\d,]+\.?\d*)",
    ],
    "annual_ctc": [
        r"annual\s*ctc\s*(?::|\.)*\s*[₹Rs\.]*\s*([\d,]+\.?\d*)",
    ],
    "loan_type": [
        r"loan\s*type\s*(?::|\.)*\s*([A-Za-z\s]+?)(?:\n|$)",
    ],
    "loan_amount": [
        r"(?:requested\s*)?loan\s*amount\s*(?::|\.)*\s*[₹Rs\.]*\s*([\d,]+\.?\d*)",
    ],
    "loan_tenure": [
        r"loan\s*tenure\s*(?:\(months?\))?\s*(?::|\.)*\s*(\d+)",
    ],
}

ITR_FIELDS = {
    "pan": [
        r"pan\s*(?:number|no\.?)?\s*(?::|\.)*\s*([A-Z]{5}\d{4}[A-Z])",
    ],
    "assessment_year": [
        r"assessment\s*year\s*(?::|\.)*\s*(\d{4}-\d{2,4}|\d{4}-\d{2})",
    ],
    "gross_total_income": [
        r"gross\s*total\s*income\s*(?::|\.)*\s*[₹Rs\.]*\s*([\d,]+\.?\d*)",
        r"total\s*income\s*(?::|\.)*\s*[₹Rs\.]*\s*([\d,]+\.?\d*)",
    ],
    "tax_payable": [
        r"tax\s*payable\s*(?::|\.)*\s*[₹Rs\.]*\s*([\d,]+\.?\d*)",
        r"total\s*tax\s*payable\s*(?::|\.)*\s*[₹Rs\.]*\s*([\d,]+\.?\d*)",
    ],
    "tds_deducted": [
        r"tds\s*(?:deducted|credit)\s*(?::|\.)*\s*[₹Rs\.]*\s*([\d,]+\.?\d*)",
    ],
    "net_tax_payable": [
        r"net\s*tax\s*(?:payable|liability)\s*(?::|\.)*\s*[₹Rs\.]*\s*([\d,]+\.?\d*)",
    ],
    "salary_income": [
        r"(?:income\s*from\s*salary|salary\s*income)\s*(?::|\.)*\s*[₹Rs\.]*\s*([\d,]+\.?\d*)",
    ],
}


def _extract_fields_by_patterns(
    text: str,
    patterns: dict[str, list[str]],
    doc_name: str,
) -> list[ExtractedField]:
    """Apply regex patterns and proximity search to extract structured fields from OCR text."""
    fields = []
    lower_text = text.lower()
    
    numeric_field_names = {
        "gross_salary", "basic_pay", "net_pay", "salary_credit", 
        "total_deductions", "monthly_salary", "annual_ctc", 
        "loan_amount", "income_tax", "provident_fund"
    }

    for field_name, field_patterns in patterns.items():
        found = False
        for pattern in field_patterns:
            # 1. Try exact regex match
            match = re.search(pattern, lower_text)
            if match and len(match.groups()) > 0:
                raw_value = match.group(1).strip()
                raw_value = re.sub(r'\s+', ' ', raw_value).strip()
                if raw_value:
                    numeric = _parse_amount(raw_value)
                    if field_name in numeric_field_names and numeric is None:
                        pass # Regex matched words but we needed a number, fallback to proximity
                    else:
                        fields.append(ExtractedField(
                            field_name=field_name,
                            value=raw_value,
                            numeric_value=numeric,
                            confidence=0.85,
                            source_document=doc_name,
                        ))
                        found = True
                        break

        # 2. Proximity-based fallback for numeric fields
        if not found and field_name in numeric_field_names:
            for pattern in field_patterns:
                # Strip out regex formatting to get the core keyword
                clean_pattern = re.sub(r'[\(\)\?\:\.\*\|\+\[\]\^\\$]', ' ', pattern)
                keywords = [k for k in clean_pattern.split() if len(k) > 3 and k not in ['the', 'and', 'with']]
                if keywords:
                    kw = keywords[0]
                    idx = lower_text.find(kw)
                    if idx != -1:
                        # Extract a window of text immediately following the keyword
                        window = text[idx:idx+120]
                        # Find all number-like strings in the window
                        # Included S, B, O, l, | to catch OCR typos before they are cleaned
                        numbers = re.findall(r"[\d,SBoOIl]+\.?\d*", window)
                        if numbers:
                            parsed_nums = [_parse_amount(n) for n in numbers]
                            valid_nums = [n for n in parsed_nums if n is not None and n > 100]
                            if valid_nums:
                                # Typically the closest valid number after the label is the right one
                                best_num = valid_nums[0]
                                fields.append(ExtractedField(
                                    field_name=field_name,
                                    value=str(best_num),
                                    numeric_value=best_num,
                                    confidence=0.75, # slightly lower confidence for proximity
                                    source_document=doc_name,
                                ))
                                found = True
                                break
        if found:
            continue

    return fields


# ─── Special Extractors ─────────────────────────────────────────────────────
# For documents where simple regex isn't enough

def _extract_salary_slip_fields(text: str, doc_name: str) -> list[ExtractedField]:
    """
    Extract salary slip fields with special handling.
    The salary slip has a known format where NET PAY appears at the top.
    """
    fields = _extract_fields_by_patterns(text, SALARY_SLIP_FIELDS, doc_name)

    # If we found net_pay from the "NET PAY (T)" pattern at the top but it matched 
    # the word part, try to find the numeric value right after
    net_pay_found = any(f.field_name == "net_pay" for f in fields)
    if not net_pay_found:
        # Try: the first standalone number after "NET PAY"
        match = re.search(r"NET\s*PAY\s*\(T\)\s*\n?\s*([\d,]+)", text, re.IGNORECASE)
        if match:
            val = match.group(1).strip()
            numeric = _parse_amount(val)
            fields.append(ExtractedField(
                field_name="net_pay",
                value=val,
                numeric_value=numeric,
                confidence=0.90,
                source_document=doc_name,
            ))

    return fields


def _extract_bank_statement_fields(text: str, doc_name: str) -> list[ExtractedField]:
    """
    Extract bank statement fields with special handling for transaction data.
    """
    fields = _extract_fields_by_patterns(text, BANK_STATEMENT_FIELDS, doc_name)

    # Try to find salary credit from transaction table
    salary_credit_found = any(f.field_name == "salary_credit" for f in fields)
    if not salary_credit_found:
        # Look for "Salary Credit" line in transactions
        match = re.search(
            r"salary\s*credit[^\d]*?([\d,]+\.?\d*)",
            text, re.IGNORECASE
        )
        if match:
            val = match.group(1).strip()
            numeric = _parse_amount(val)
            if numeric and numeric > 1000:  # Sanity check
                fields.append(ExtractedField(
                    field_name="salary_credit",
                    value=val,
                    numeric_value=numeric,
                    confidence=0.85,
                    source_document=doc_name,
                ))

    return fields


# ─── Main Extract Function ──────────────────────────────────────────────────

def extract_fields(
    file_path: str,
    document_name: str,
) -> DocumentFields:
    """
    Extract structured financial fields from a document.
    Uses PyMuPDF text layer first, falls back to EasyOCR for image PDFs.
    """
    text = _get_full_text(file_path)

    if not text.strip():
        logger.warning(f"No text extracted from {document_name}")
        doc_type = _detect_document_type("", document_name)
        return DocumentFields(
            document_name=document_name,
            document_type=doc_type,
            fields=[],
        )

    doc_type = _detect_document_type(text, document_name)

    # Route to appropriate extractor
    if doc_type == DocumentType.SALARY_SLIP:
        fields = _extract_salary_slip_fields(text, document_name)
    elif doc_type == DocumentType.BANK_STATEMENT:
        fields = _extract_bank_statement_fields(text, document_name)
    elif doc_type == DocumentType.EMPLOYMENT_VERIFICATION:
        fields = _extract_fields_by_patterns(text, EMPLOYMENT_VERIFICATION_FIELDS, document_name)
    elif doc_type == DocumentType.LOAN_APPLICATION:
        fields = _extract_fields_by_patterns(text, LOAN_APPLICATION_FIELDS, document_name)
    elif doc_type == DocumentType.ITR_FORM:
        fields = _extract_fields_by_patterns(text, ITR_FIELDS, document_name)
    else:
        fields = []

    logger.info(f"Extracted {len(fields)} fields from {document_name} (type: {doc_type.value})")
    return DocumentFields(
        document_name=document_name,
        document_type=doc_type,
        fields=fields,
    )
