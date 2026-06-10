"""
VeriFlow — Orchestrator Pipeline
Master coordinator that sequences the two-tiered forensic analysis:
Layer 1 (Structural DNA) → Layer 2 (Coherence) → Aggregate Report.
"""
from __future__ import annotations

import time
import uuid
from pathlib import Path
from typing import Optional

from engine.models import (
    DocumentReport,
    DocumentType,
    ForensicReport,
    Severity,
    Verdict,
)
from engine.structural_dna import syntax_geometry, chronological, ela
from engine.coherence import ocr_extractor, cross_document, tax_logic
from config import (
    WEIGHT_SYNTAX_GEOMETRY,
    WEIGHT_CHRONOLOGICAL,
    WEIGHT_ELA,
    WEIGHT_CROSS_DOCUMENT,
    WEIGHT_TAX_LOGIC,
)


def _classify_document_type(filename: str) -> DocumentType:
    """Quick document type classification from filename."""
    lower = filename.lower()
    if any(k in lower for k in ["salary", "pay", "slip"]):
        return DocumentType.SALARY_SLIP
    elif any(k in lower for k in ["bank", "statement", "account"]):
        return DocumentType.BANK_STATEMENT
    elif any(k in lower for k in ["itr", "tax", "return", "form16", "form_16"]):
        return DocumentType.ITR_FORM
    elif any(k in lower for k in ["land", "property", "registry", "deed"]):
        return DocumentType.LAND_RECORD
    return DocumentType.UNKNOWN


def _compute_weighted_score(scores: dict[str, float]) -> float:
    """
    Compute weighted aggregate risk score.
    Only includes components that have non-zero scores.
    """
    weights = {
        "syntax_geometry": WEIGHT_SYNTAX_GEOMETRY,
        "chronological": WEIGHT_CHRONOLOGICAL,
        "ela": WEIGHT_ELA,
        "cross_document": WEIGHT_CROSS_DOCUMENT,
        "tax_logic": WEIGHT_TAX_LOGIC,
    }

    total_weight = 0
    weighted_sum = 0

    for key, score in scores.items():
        w = weights.get(key, 0.1)
        weighted_sum += score * w
        total_weight += w

    if total_weight == 0:
        return 0.0

    return round(weighted_sum / total_weight, 2)


def _count_flags(report: ForensicReport) -> dict[str, int]:
    """Count total flags by severity across all analyses."""
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}

    for doc_report in report.document_reports:
        if doc_report.syntax_geometry:
            for a in doc_report.syntax_geometry.font_anomalies:
                counts[a.severity.value] += 1
            for a in doc_report.syntax_geometry.coordinate_anomalies:
                counts[a.severity.value] += 1
            for a in doc_report.syntax_geometry.spacing_anomalies:
                counts[a.severity.value] += 1

        if doc_report.chronological:
            for f in doc_report.chronological.metadata_flags:
                counts[f.severity.value] += 1

        for e in doc_report.ela_results:
            for r in e.suspicious_regions:
                counts[r.severity.value] += 1

    if report.coherence:
        for c in report.coherence.contradictions:
            counts[c.severity.value] += 1

    return counts


def _generate_summary(report: ForensicReport) -> str:
    """Generate a human-readable summary of the forensic report."""
    flags = report.flags_count
    total_flags = sum(flags.values())

    if report.overall_verdict == Verdict.CLEAN:
        return (
            f"All {report.total_documents} document(s) passed forensic verification. "
            f"No significant anomalies detected. Document packet appears authentic. "
            f"Processing completed in {report.processing_time_seconds:.1f}s."
        )
    elif report.overall_verdict == Verdict.SUSPICIOUS:
        return (
            f"Analyzed {report.total_documents} document(s) and found {total_flags} flag(s): "
            f"{flags['critical']} critical, {flags['high']} high, "
            f"{flags['medium']} medium, {flags['low']} low. "
            f"Manual review recommended. "
            f"Processing completed in {report.processing_time_seconds:.1f}s."
        )
    else:
        return (
            f"⚠ HIGH RISK: {report.total_documents} document(s) analyzed with "
            f"{total_flags} forensic flag(s): "
            f"{flags['critical']} CRITICAL, {flags['high']} HIGH, "
            f"{flags['medium']} MEDIUM. "
            f"Document packet shows strong indicators of tampering. "
            f"Immediate escalation recommended. "
            f"Processing completed in {report.processing_time_seconds:.1f}s."
        )


async def analyze_packet(
    file_paths: list[str],
    file_names: list[str],
    is_demo: bool = False,
    is_tampered_demo: bool = False,
    progress_callback=None,
) -> ForensicReport:
    """
    Execute the complete two-tiered forensic pipeline on a document packet.

    Args:
        file_paths: List of paths to uploaded files
        file_names: Original filenames for each file
        is_demo: If True, use mock data for missing OCR capability
        is_tampered_demo: If True (demo mode), generate tampered mock data
        progress_callback: Optional async callback(stage, progress_pct, message)

    Returns:
        ForensicReport with complete forensic findings
    """
    start_time = time.time()
    packet_id = uuid.uuid4().hex[:12]
    document_reports: list[DocumentReport] = []
    component_scores: dict[str, float] = {}

    total_steps = len(file_paths) * 3 + 2  # 3 L1 checks per doc + 2 L2 checks
    current_step = 0

    async def _report_progress(stage: str, message: str):
        nonlocal current_step
        current_step += 1
        pct = min(100, int(current_step / total_steps * 100))
        if progress_callback:
            await progress_callback(stage, pct, message)

    # ═══════════════════════════════════════════════════════════════════════
    # PHASE 1: Layer 1 — Structural DNA Analysis (per document)
    # ═══════════════════════════════════════════════════════════════════════

    all_syntax_scores = []
    all_chrono_scores = []
    all_ela_scores = []

    for i, (fpath, fname) in enumerate(zip(file_paths, file_names)):
        doc_type = _classify_document_type(fname)
        is_pdf = Path(fpath).suffix.lower() == ".pdf"

        # 1a. Syntax Geometry
        await _report_progress("layer1", f"Analyzing syntax geometry: {fname}")
        if is_pdf:
            sg_result = syntax_geometry.analyze(fpath, fname)
        else:
            sg_result = None
        if sg_result:
            all_syntax_scores.append(sg_result.risk_score)

        # 1b. Chronological Forensics
        await _report_progress("layer1", f"Validating metadata timestamps: {fname}")
        if is_pdf:
            chrono_result = chronological.analyze(fpath, fname)
        else:
            chrono_result = None
        if chrono_result:
            all_chrono_scores.append(chrono_result.risk_score)

        # 1c. Error Level Analysis
        await _report_progress("layer1", f"Running Error Level Analysis: {fname}")
        ela_results = ela.analyze_all_pages(fpath, fname)
        for er in ela_results:
            all_ela_scores.append(er.overall_score)

        document_reports.append(DocumentReport(
            document_name=fname,
            document_type=doc_type,
            syntax_geometry=sg_result,
            chronological=chrono_result,
            ela_results=ela_results,
        ))

    # Aggregate Layer 1 scores
    if all_syntax_scores:
        component_scores["syntax_geometry"] = max(all_syntax_scores)
    if all_chrono_scores:
        component_scores["chronological"] = max(all_chrono_scores)
    if all_ela_scores:
        component_scores["ela"] = max(all_ela_scores)

    # ═══════════════════════════════════════════════════════════════════════
    # PHASE 2: Layer 2 — Coherence Engine (cross-document)
    # ═══════════════════════════════════════════════════════════════════════

    # 2a. OCR Field Extraction
    await _report_progress("layer2", "Extracting financial fields via OCR")
    all_doc_fields = []
    for i, (fpath, fname) in enumerate(zip(file_paths, file_names)):
        doc_fields = ocr_extractor.extract_fields(
            fpath, fname,
            force_mock=is_demo,
            is_tampered_demo=is_tampered_demo,
        )
        all_doc_fields.append(doc_fields)
        # Attach to document report
        if i < len(document_reports):
            document_reports[i].extracted_fields = doc_fields

    # 2b. Cross-document validation
    await _report_progress("layer2", "Running cross-document coherence checks")
    coherence_result = cross_document.validate(all_doc_fields)
    component_scores["cross_document"] = coherence_result.risk_score

    # 2c. Tax logic validation
    salary_doc = next(
        (d for d in all_doc_fields if d.document_type == DocumentType.SALARY_SLIP),
        None,
    )
    tax_result = tax_logic.validate_tax(salary_doc)
    component_scores["tax_logic"] = tax_result.risk_score

    # ═══════════════════════════════════════════════════════════════════════
    # PHASE 3: Aggregate and Report
    # ═══════════════════════════════════════════════════════════════════════

    processing_time = time.time() - start_time
    overall_score = _compute_weighted_score(component_scores)

    if overall_score >= 60:
        overall_verdict = Verdict.TAMPERED
    elif overall_score >= 25:
        overall_verdict = Verdict.SUSPICIOUS
    else:
        overall_verdict = Verdict.CLEAN

    report = ForensicReport(
        packet_id=packet_id,
        total_documents=len(file_paths),
        processing_time_seconds=round(processing_time, 2),
        document_reports=document_reports,
        coherence=coherence_result,
        tax_validation=tax_result,
        overall_risk_score=overall_score,
        overall_verdict=overall_verdict,
        summary="",
        flags_count={"critical": 0, "high": 0, "medium": 0, "low": 0},
    )

    report.flags_count = _count_flags(report)
    report.summary = _generate_summary(report)

    return report
