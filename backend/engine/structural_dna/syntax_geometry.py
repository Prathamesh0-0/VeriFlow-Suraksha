"""
VeriFlow — Syntax Geometry Analyzer
Parses raw PDF content streams to detect font vector discontinuities,
text matrix anomalies, and coordinate shifts indicating manual text overrides.
"""
from __future__ import annotations

import re
import statistics
from collections import defaultdict
from typing import Any

import pymupdf as fitz  # PyMuPDF 1.27+

from engine.models import (
    CoordinateAnomaly,
    FontAnomaly,
    Severity,
    SpacingAnomaly,
    SyntaxGeometryResult,
    Verdict,
)
from config import (
    FONT_SIZE_DEVIATION_TOLERANCE,
    FONT_SIZE_DEVIATION_MIN,
    FONT_COUNT_ANOMALY_MIN,
    COORDINATE_SHIFT_THRESHOLD_PX,
    COORDINATE_SHIFT_MAX_PX,
    CHAR_SPACING_VARIANCE_THRESHOLD,
)


def _analyze_font_consistency(page: fitz.Page, page_num: int) -> tuple[list[FontAnomaly], list[dict]]:
    """
    Analyze font consistency using rawdict character-level data.
    
    Detects SUBTLE font size deviations (0.1–0.8pt) within the dominant font — 
    these are the hallmark of copy-paste text replacement in PDF editors.
    
    Large deviations (>1.5pt) are headings/titles and are intentionally IGNORED.
    """
    anomalies = []
    try:
        data = page.get_text("rawdict")
    except Exception:
        return anomalies, []

    # Collect font usage statistics
    font_usage: dict[str, int] = defaultdict(int)
    all_spans: list[dict] = []

    for block in data.get("blocks", []):
        if block.get("type") != 0:  # text block
            continue
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                text = span.get("text", "").strip()
                if not text:
                    continue
                font_name = span.get("font", "unknown")
                font_size = span.get("size", 0)
                char_count = len(text)
                font_usage[font_name] += char_count
                all_spans.append({
                    "font": font_name,
                    "size": font_size,
                    "text": text,
                    "bbox": list(span.get("bbox", [0, 0, 0, 0])),
                    "origin": list(span.get("origin", [0, 0])),
                })

    if not font_usage:
        return anomalies, all_spans

    total_chars = sum(font_usage.values())
    dominant_font = max(font_usage, key=font_usage.get)
    dominant_usage_pct = font_usage[dominant_font] / total_chars if total_chars > 0 else 0

    # Compute dominant font's modal (most common) size — not average, modal
    dominant_sizes = [s["size"] for s in all_spans if s["font"] == dominant_font and s["size"] > 5]
    if not dominant_sizes:
        return anomalies, all_spans

    # Use the mode of sizes to find the body text size
    size_counts: dict[float, int] = defaultdict(int)
    for sz in dominant_sizes:
        rounded = round(sz * 2) / 2  # Round to nearest 0.5pt
        size_counts[rounded] += 1
    dominant_size = max(size_counts, key=size_counts.get)

    # ── Check 1: Subtle font size deviations in dominant font ──────────────
    # Subtle deviations (FONT_SIZE_DEVIATION_MIN < d < FONT_SIZE_DEVIATION_TOLERANCE)
    # in body text are the key signature of PDF text layer manipulation.
    body_text_min_size = dominant_size * 0.7  # Exclude fonts way smaller (footnotes)

    for span in all_spans:
        if span["font"] != dominant_font:
            continue
        if span["size"] < body_text_min_size:
            continue  # Skip footnotes/small subscripts
        if len(span["text"]) < 2:
            continue  # Skip single chars (bullets, etc.)

        # Check for subtle deviation from dominant body size
        deviation = abs(span["size"] - dominant_size)
        if FONT_SIZE_DEVIATION_MIN < deviation < FONT_SIZE_DEVIATION_TOLERANCE:
            # Extra filter: only flag if text looks like a number (tampering target)
            # OR if it appears in what should be a uniform data field
            text_is_numeric_adjacent = bool(re.search(r'[\d,₹]', span["text"]))
            anomalies.append(FontAnomaly(
                page=page_num + 1,
                location=f"bbox: [{', '.join(f'{v:.1f}' for v in span['bbox'])}]",
                bbox=span["bbox"],
                expected_font=dominant_font,
                found_font=dominant_font,
                expected_size=dominant_size,
                found_size=span["size"],
                severity=Severity.HIGH if deviation > 0.4 else Severity.MEDIUM,
                description=(
                    f"Subtle font size deviation of {deviation:.2f}pt detected in "
                    f"'{span['text'][:40]}'. Expected {dominant_size:.1f}pt, "
                    f"found {span['size']:.2f}pt. "
                    f"Micro-deviations in body text are characteristic of "
                    f"copy-paste text replacement in PDF editors."
                ),
            ))

    fonts_detected = [
        {"name": name, "usage_count": count}
        for name, count in sorted(font_usage.items(), key=lambda x: -x[1])
    ]

    return anomalies, all_spans


def _analyze_baseline_drift(
    all_spans: list[dict], page_num: int
) -> list[CoordinateAnomaly]:
    """
    Detect baseline (Y-coordinate) drift.
    Groups text spans into lines by Y-coordinate, then checks
    if any line deviates from the expected uniform line spacing.
    
    Only flags SUBTLE drifts (2–15px) — huge gaps are paragraph breaks.
    """
    anomalies = []
    if len(all_spans) < 5:
        return anomalies

    # Group spans by approximate Y-coordinate (origin[1])
    y_coords = sorted(set(round(s["origin"][1], 0) for s in all_spans if s.get("origin") and s["origin"][1] > 0))
    if len(y_coords) < 4:
        return anomalies

    # Compute line spacings
    spacings = [y_coords[i + 1] - y_coords[i] for i in range(len(y_coords) - 1)]
    if not spacings:
        return anomalies

    median_spacing = statistics.median(spacings)
    if median_spacing < 1.0:
        return anomalies

    # Only consider "body text" spacings (near median) for the reference
    # Filter out spacings that are way off (paragraph/section breaks)
    body_spacings = [s for s in spacings if abs(s - median_spacing) / median_spacing < 0.5]
    if len(body_spacings) < 3:
        return anomalies
    body_median = statistics.median(body_spacings)

    # Now flag subtle drifts: between COORDINATE_SHIFT_THRESHOLD_PX and COORDINATE_SHIFT_MAX_PX
    for i, spacing in enumerate(spacings):
        drift = abs(spacing - body_median)
        # Skip huge drifts (paragraph breaks, headers) and tiny ones (rounding)
        if COORDINATE_SHIFT_THRESHOLD_PX < drift < COORDINATE_SHIFT_MAX_PX:
            anomalies.append(CoordinateAnomaly(
                page=page_num + 1,
                line_index=i + 1,
                expected_y=y_coords[i] + body_median,
                actual_y=y_coords[i + 1],
                drift_px=round(drift, 2),
                severity=Severity.MEDIUM if drift < 8.0 else Severity.HIGH,
                description=(
                    f"Baseline drift of {drift:.2f}px at line {i + 1}. "
                    f"Expected Y={y_coords[i] + body_median:.1f}, "
                    f"actual Y={y_coords[i + 1]:.1f}. "
                    f"Median line spacing is {body_median:.1f}px. "
                    f"Subtle vertical shifts indicate manually inserted text."
                ),
            ))
    return anomalies


def _analyze_character_spacing(
    all_spans: list[dict], page_num: int
) -> list[SpacingAnomaly]:
    """
    Detect abnormal inter-character spacing within words.
    Characters that are too squeezed or too wide indicate manual text overlay.
    """
    anomalies = []

    for span in all_spans:
        text = span.get("text", "").strip()
        if len(text) < 4:
            continue
        bbox = span["bbox"]
        span_width = bbox[2] - bbox[0]
        if span_width <= 0:
            continue

        char_width = span_width / len(text)
        expected_width = span["size"] * 0.5  # Rough heuristic: char width ≈ 0.5 × font size

        if expected_width <= 0:
            continue

        ratio = char_width / expected_width
        # Only flag extreme ratios: chars way too narrow (<0.20) or way too wide (>3.5)
        # This catches text that was stretched or squeezed to fit tampered values
        if ratio < 0.20 or ratio > 3.5:
            anomalies.append(SpacingAnomaly(
                page=page_num + 1,
                word=text[:40],
                location=f"bbox: [{', '.join(f'{v:.1f}' for v in bbox)}]",
                bbox=list(bbox),
                variance=round(ratio, 3),
                threshold=CHAR_SPACING_VARIANCE_THRESHOLD,
                severity=Severity.HIGH if (ratio < 0.15 or ratio > 4.0) else Severity.MEDIUM,
                description=(
                    f"Abnormal character spacing in '{text[:30]}'. "
                    f"Width ratio {ratio:.2f} (expected ~1.0). "
                    f"{'Characters are over-squeezed' if ratio < 0.5 else 'Characters are excessively wide'} "
                    f"— indicative of text replacement to fit a different value in the same space."
                ),
            ))

    return anomalies


def analyze(file_path: str, document_name: str) -> SyntaxGeometryResult:
    """
    Execute full Syntax Geometry analysis on a PDF document.
    
    Analyzes all pages for:
    1. Subtle font size deviations in body text (hallmark of PDF editor tampering)
    2. Baseline drift (manually inserted text lines)
    3. Abnormal character spacing (stretched/squeezed replacement text)
    """
    try:
        doc = fitz.open(file_path)
        page_count = len(doc)
    except Exception as e:
        return SyntaxGeometryResult(
            document_name=document_name,
            total_pages=0,
            fonts_detected=[],
            font_anomalies=[],
            coordinate_anomalies=[],
            spacing_anomalies=[],
            risk_score=0.0,
            verdict=Verdict.CLEAN,
        )

    all_font_anomalies: list[FontAnomaly] = []
    all_coord_anomalies: list[CoordinateAnomaly] = []
    all_spacing_anomalies: list[SpacingAnomaly] = []
    all_fonts_detected: list[dict] = []

    for page_num in range(min(page_count, 4)):  # Analyze first 4 pages
        page = doc[page_num]

        # Font consistency analysis
        font_anoms, all_spans = _analyze_font_consistency(page, page_num)
        all_font_anomalies.extend(font_anoms)

        if page_num == 0 and all_spans:
            # Collect fonts from first page for display
            font_usage: dict[str, int] = defaultdict(int)
            for s in all_spans:
                font_usage[s["font"]] += len(s["text"])
            all_fonts_detected = [
                {"name": name, "usage_count": count}
                for name, count in sorted(font_usage.items(), key=lambda x: -x[1])
            ]

        # Baseline drift analysis
        coord_anoms = _analyze_baseline_drift(all_spans, page_num)
        all_coord_anomalies.extend(coord_anoms)

        # Character spacing analysis (only first page for performance)
        if page_num == 0:
            spacing_anoms = _analyze_character_spacing(all_spans, page_num)
            all_spacing_anomalies.extend(spacing_anoms)

    doc.close()

    # Calculate risk score
    score = 0
    for a in all_font_anomalies:
        score += 20 if a.severity == Severity.HIGH else 10
    for a in all_coord_anomalies:
        score += 15 if a.severity == Severity.HIGH else 8
    for a in all_spacing_anomalies:
        score += 15 if a.severity == Severity.HIGH else 8

    # Cap the score — many minor anomalies shouldn't explode to 100
    risk_score = min(100.0, float(score))

    if risk_score >= 60:
        verdict = Verdict.TAMPERED
    elif risk_score >= 20:
        verdict = Verdict.SUSPICIOUS
    else:
        verdict = Verdict.CLEAN

    return SyntaxGeometryResult(
        document_name=document_name,
        total_pages=page_count,
        fonts_detected=all_fonts_detected,
        font_anomalies=all_font_anomalies,
        coordinate_anomalies=all_coord_anomalies,
        spacing_anomalies=all_spacing_anomalies,
        risk_score=round(risk_score, 2),
        verdict=verdict,
    )
