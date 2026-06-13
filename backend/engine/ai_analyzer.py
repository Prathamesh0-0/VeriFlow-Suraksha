"""
VeriFlow — AI Analyzer (Gemini Integration)
Sends extracted document data to Google Gemini for an independent
fraud analysis opinion alongside the deterministic pipeline.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Optional

from engine.models import DocumentFields, DocumentType

logger = logging.getLogger("veriflow.ai")

# ─── Lazy Gemini client ──────────────────────────────────────────────────────
_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        logger.warning("GEMINI_API_KEY not set — AI analysis disabled.")
        _client = False
        return None

    try:
        from google import genai
        _client = genai.Client(api_key=api_key)
        logger.info("Gemini client initialized.")
        return _client
    except ImportError:
        logger.warning("google-genai not installed — AI analysis disabled.")
        _client = False
        return None
    except Exception as e:
        logger.error(f"Failed to initialize Gemini: {e}")
        _client = False
        return None


# ─── Prompt Construction ─────────────────────────────────────────────────────

DOC_TYPE_LABELS = {
    DocumentType.SALARY_SLIP: "Salary Slip",
    DocumentType.BANK_STATEMENT: "Bank Statement",
    DocumentType.EMPLOYMENT_VERIFICATION: "Employment Verification Letter",
    DocumentType.LOAN_APPLICATION: "Loan Application Form",
    DocumentType.ITR_FORM: "Income Tax Return",
    DocumentType.LAND_RECORD: "Land Record",
    DocumentType.UNKNOWN: "Unknown Document",
}


def _build_prompt(doc_fields_list: list[DocumentFields], extracted_texts: dict[str, str]) -> str:
    """Build a structured prompt for Gemini fraud analysis."""
    prompt = """You are a senior forensic auditor at an Indian bank's underwriting department.

You are reviewing a loan application packet containing multiple documents. Your job is to identify any inconsistencies, mathematical errors, or signs of fraud across these documents.

IMPORTANT RULES:
- Be specific. Quote exact numbers when pointing out discrepancies.
- Check mathematical consistency: do salary components add up to gross? Does gross minus deductions equal net pay?
- Cross-check values: does the salary on the slip match the bank credit? Does it match what's claimed on the loan application?
- Check if TDS and PF deductions are proportional to the stated salary (TDS follows Indian tax slabs, PF is 12% of basic).
- Flag any name mismatches across documents.
- Flag if someone claims higher income on the loan application than what their salary slip shows.

RESPOND IN THIS EXACT JSON FORMAT (no markdown, no code blocks, just raw JSON):
{
  "verdict": "clean" or "suspicious" or "tampered",
  "confidence": 0.0 to 1.0,
  "risk_score": 0 to 100,
  "reasoning": "Your detailed reasoning explaining what you found...",
  "flags": [
    {
      "severity": "critical" or "high" or "medium" or "low",
      "category": "Name Mismatch" or "Income Inflation" or "Math Error" or "Tax Discrepancy" or "PF Discrepancy" or "General",
      "description": "Specific description of the issue"
    }
  ]
}

If all documents are consistent and legitimate, return verdict "clean" with an empty flags array.

--- DOCUMENT PACKET ---

"""
    for doc_fields in doc_fields_list:
        doc_label = DOC_TYPE_LABELS.get(doc_fields.document_type, "Unknown")
        prompt += f"\n### {doc_fields.document_name} ({doc_label})\n"
        prompt += "Extracted Fields:\n"
        if doc_fields.fields:
            for f in doc_fields.fields:
                val = f"₹{f.numeric_value:,.0f}" if f.numeric_value is not None else f.value
                prompt += f"  - {f.field_name}: {val}\n"
        else:
            prompt += "  (no fields extracted)\n"

        # Add raw text excerpt if available
        raw_text = extracted_texts.get(doc_fields.document_name, "")
        if raw_text:
            # Truncate to avoid hitting token limits
            excerpt = raw_text[:2000]
            prompt += f"\nRaw Text Excerpt:\n{excerpt}\n"

    prompt += "\n--- END OF PACKET ---\n\nAnalyze this packet now."
    return prompt


# ─── Main Analysis Function ─────────────────────────────────────────────────

async def analyze(
    doc_fields_list: list[DocumentFields],
    extracted_texts: Optional[dict[str, str]] = None,
) -> Optional[dict]:
    """
    Run Gemini analysis on the document packet.

    Returns a dict with keys: verdict, confidence, risk_score, reasoning, flags
    Returns None if Gemini is unavailable.
    """
    client = _get_client()
    if client is None:
        return None

    if extracted_texts is None:
        extracted_texts = {}

    prompt = _build_prompt(doc_fields_list, extracted_texts)

    try:
        from google.genai import types

        model = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
        response = await client.aio.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=2000,
            ),
        )

        raw_text = response.text.strip()

        # Strip markdown code blocks if present
        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            # Remove first and last lines (the ``` markers)
            lines = [l for l in lines if not l.strip().startswith("```")]
            raw_text = "\n".join(lines).strip()

        result = json.loads(raw_text)

        # Validate structure
        return {
            "verdict": result.get("verdict", "suspicious"),
            "confidence": float(result.get("confidence", 0.5)),
            "risk_score": float(result.get("risk_score", 50)),
            "reasoning": result.get("reasoning", ""),
            "flags": result.get("flags", []),
        }

    except json.JSONDecodeError as e:
        logger.error(f"Gemini returned invalid JSON: {e}")
        # Try to salvage what we can
        return {
            "verdict": "suspicious",
            "confidence": 0.3,
            "risk_score": 50,
            "reasoning": f"AI analysis produced unstructured output: {raw_text[:500]}",
            "flags": [],
        }
    except Exception as e:
        logger.error(f"Gemini analysis failed: {e}")
        return None
