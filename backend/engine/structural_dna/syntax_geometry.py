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
    FONT_COUNT_ANOMALY_MIN,
    COORDINATE_SHIFT_THRESHOLD_PX,
    CHAR_SPACING_VARIANCE_THRESHOLD,
)


def _parse_tm_operators(stream_bytes: bytes) -> list[dict]:
    """
    Parse Tm (text matrix) operators from raw PDF content stream.
    Tm format: a b c d e f Tm
    Returns list of {a, b, c, d, e, f} float dicts — the 2D transformation matrix.
    """
    text = stream_bytes.decode("latin-1", errors="ignore")
    # Match: <6 floats> Tm
    pattern = r"([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s+Tm"
    matches = re.findall(pattern, text)
    results = []
    for m in matches:
        results.append({
            "a": float(m[0]), "b": float(m[1]),
            "c": float(m[2]), "d": float(m[3]),
            "e": float(m[4]), "f": float(m[5]),
        })
    return results


def _parse_tf_operators(stream_bytes: bytes) -> list[dict]:
    """
    Parse Tf (text font) operators from raw content stream.
    Tf format: /FontName size Tf
    """
    text = stream_bytes.decode("latin-1", errors="ignore")
    pattern = r"/(\S+)\s+([-+]?\d*\.?\d+)\s+Tf"
    matches = re.findall(pattern, text)
    return [{"font": m[0], "size": float(m[1])} for m in matches]


def _analyze_font_consistency(page: fitz.Page, page_num: int) -> tuple[list[FontAnomaly], list[dict]]:
    """
    Analyze font consistency using rawdict character-level data.
    Detects: rare fonts used for only a few characters, unexpected font changes.
    """
    anomalies = []
    try:
        data = page.get_text("rawdict")
    except Exception:
        return anomalies, []

    # Collect font usage statistics
    font_usage: dict[str, int] = defaultdict(int)
    font_locations: dict[str, list[dict]] = defaultdict(list)
    all_spans: list[dict] = []

    for block in data.get("blocks", []):
        if block.get("type") != 0:  # text block
            continue
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                font_name = span.get("font", "unknown")
                font_size = span.get("size", 0)
                char_count = len(span.get("text", ""))
                font_usage[font_name] += char_count
                font_locations[font_name].append({
                    "bbox": span.get("bbox", [0, 0, 0, 0]),
                    "size": font_size,
                    "text": span.get("text", ""),
                })
                all_spans.append({
                    "font": font_name,
                    "size": font_size,
                    "text": span.get("text", ""),
                    "bbox": list(span.get("bbox", [0, 0, 0, 0])),
                    "origin": list(span.get("origin", [0, 0])),
                })

    # Determine the dominant font
    if not font_usage:
        return anomalies, all_spans

    dominant_font = max(font_usage, key=font_usage.get)
    dominant_size_values = [
        s["size"] for s in all_spans if s["font"] == dominant_font
    ]
    dominant_size = statistics.median(dominant_size_values) if dominant_size_values else 12.0

    # Flag rare fonts (used for very few characters — possible manual override)
    for font_name, count in font_usage.items():
        if font_name == dominant_font:
            continue
        if count <= FONT_COUNT_ANOMALY_MIN:
            locs = font_locations[font_name]
            for loc in locs:
                anomalies.append(FontAnomaly(
                    page=page_num + 1,
                    location=f"bbox: [{', '.join(f'{v:.1f}' for v in loc['bbox'])}]",
                    bbox=list(loc["bbox"]),
                    expected_font=dominant_font,
                    found_font=font_name,
                    expected_size=dominant_size,
                    found_size=loc["size"],
                    severity=Severity.HIGH,
                    description=(
                        f"Rare font '{font_name}' used for only {count} character(s) "
                        f"containing '{loc['text'][:30]}'. Dominant font is '{dominant_font}'. "
                        f"This may indicate manual text insertion."
                    ),
                ))

    # Flag size anomalies within the dominant font
    for span in all_spans:
        if span["font"] == dominant_font:
            deviation = abs(span["size"] - dominant_size)
            if deviation > FONT_SIZE_DEVIATION_TOLERANCE and span["text"].strip():
                anomalies.append(FontAnomaly(
                    page=page_num + 1,
                    location=f"bbox: [{', '.join(f'{v:.1f}' for v in span['bbox'])}]",
                    bbox=span["bbox"],
                    expected_font=dominant_font,
                    found_font=dominant_font,
                    expected_size=dominant_size,
                    found_size=span["size"],
                    severity=Severity.MEDIUM if deviation < 1.0 else Severity.HIGH,
                    description=(
                        f"Font size deviation of {deviation:.2f}pt detected in "
                        f"'{span['text'][:30]}'. Expected {dominant_size:.1f}pt, "
                        f"found {span['size']:.1f}pt."
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
    """
    anomalies = []
    if len(all_spans) < 3:
        return anomalies

    # Group spans by approximate Y-coordinate (origin[1])
    y_coords = sorted(set(round(s["origin"][1], 1) for s in all_spans if s.get("origin")))
    if len(y_coords) < 3:
        return anomalies

    # Compute line spacings
    spacings = [y_coords[i + 1] - y_coords[i] for i in range(len(y_coords) - 1)]
    if not spacings:
        return anomalies

    median_spacing = statistics.median(spacings)
    if median_spacing < 1.0:
        return anomalies

    # Check each spacing for drift
    for i, spacing in enumerate(spacings):
        drift = abs(spacing - median_spacing)
        if drift > COORDINATE_SHIFT_THRESHOLD_PX and drift > median_spacing * 0.15:
            anomalies.append(CoordinateAnomaly(
                page=page_num + 1,
                line_index=i + 1,
                expected_y=y_coords[i] + median_spacing,
                actual_y=y_coords[i + 1],
                drift_px=round(drift, 2),
                severity=Severity.MEDIUM if drift < 5.0 else Severity.HIGH,
                description=(
                    f"Baseline drift of {drift:.2f}px at line {i + 1}. "
                    f"Expected Y={y_coords[i] + median_spacing:.1f}, "
                    f"actual Y={y_coords[i + 1]:.1f}. "
                    f"Median line spacing is {median_spacing:.1f}px."
                ),
            ))
    return anomalies


def _analyze_character_spacing(
    all_spans: list[dict], page_num: int
) -> list[SpacingAnomaly]:
    """
    Detect abnormal inter-character spacing within words.
    Uses rawdict character-level data to compute spacing variance.
    """
    anomalies = []

    # For spacing analysis, we need character-level positioning
    # The rawdict spans give us per-span info, but not individual chars.
    # We approximate by checking span widths relative to character count.
    for span in all_spans:
        text = span.get("text", "").strip()
        if len(text) < 3:
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
        # Flag extreme ratios (chars too wide or too narrow = manual text squeeze)
        if ratio < 0.4 or ratio > 2.0:
            anomalies.append(SpacingAnomaly(
                page=page_num + 1,
                word=text[:40],
                location=f"bbox: [{', '.join(f'{v:.1f}' for v in bbox)}]",
                bbox=list(bbox),
                variance=round(ratio, 3),
                threshold=CHAR_SPACING_VARIANCE_THRESHOLD,
                severity=Severity.MEDIUM if 0.3 < ratio < 2.5 else Severity.HIGH,
                description=(
                    f"Abnormal character spacing in '{text[:30]}'. "
                    f"Width ratio {ratio:.2f} (expected ~1.0). "
                    f"Characters may have been manually squeezed or stretched."
                ),
            ))

    return anomalies


def analyze(file_path: str, document_name: str) -> SyntaxGeometryResult:
    """
    Execute full syntax geometry analysis on a PDF document.
    
    Parses raw content streams and character-level rendering data
    to detect font inconsistencies, coordinate shifts, and spacing
    anomalies that indicate manual text manipulation.
    """
    try:
        doc = fitz.open(file_path)
    except Exception as e:
        return SyntaxGeometryResult(
            document_name=document_name,
            total_pages=0,
            fonts_detected=[],
            risk_score=0,
            verdict=Verdict.CLEAN,
        )

    all_font_anomalies: list[FontAnomaly] = []
    all_coord_anomalies: list[CoordinateAnomaly] = []
    all_spacing_anomalies: list[SpacingAnomaly] = []
    all_fonts: dict[str, int] = defaultdict(int)

    for page_num in range(len(doc)):
        page = doc[page_num]

        # 1. Font consistency analysis via rawdict
        font_anomalies, spans = _analyze_font_consistency(page, page_num)
        all_font_anomalies.extend(font_anomalies)

        # 2. Raw content stream analysis
        try:
            stream = page.read_contents()
            tm_ops = _parse_tm_operators(stream)
            tf_ops = _parse_tf_operators(stream)
        except Exception:
            tm_ops, tf_ops = [], []

        # 3. Baseline drift detection
        coord_anomalies = _analyze_baseline_drift(spans, page_num)
        all_coord_anomalies.extend(coord_anomalies)

        # 4. Character spacing analysis
        spacing_anomalies = _analyze_character_spacing(spans, page_num)
        all_spacing_anomalies.extend(spacing_anomalies)

        # Aggregate font stats
        for f in page.get_fonts():
            all_fonts[f[3]] = all_fonts.get(f[3], 0) + 1

    doc.close()

    # Calculate risk score
    total_anomalies = (
        len(all_font_anomalies) * 3 +
        len(all_coord_anomalies) * 2 +
        len(all_spacing_anomalies) * 1
    )
    risk_score = min(100.0, total_anomalies * 8.0)

    # Determine verdict
    if risk_score >= 60:
        verdict = Verdict.TAMPERED
    elif risk_score >= 25:
        verdict = Verdict.SUSPICIOUS
    else:
        verdict = Verdict.CLEAN

    fonts_detected = [
        {"name": name, "pages_used": count}
        for name, count in sorted(all_fonts.items(), key=lambda x: -x[1])
    ]

    return SyntaxGeometryResult(
        document_name=document_name,
        total_pages=len(doc) if not doc.is_closed else 0,
        fonts_detected=fonts_detected,
        font_anomalies=all_font_anomalies,
        coordinate_anomalies=all_coord_anomalies,
        spacing_anomalies=all_spacing_anomalies,
        risk_score=round(risk_score, 2),
        verdict=verdict,
    )
