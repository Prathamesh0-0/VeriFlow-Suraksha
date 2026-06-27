"""
VeriFlow — Error Level Analysis (ELA)
Uses OpenCV to detect JPEG compression artifact inconsistencies
in scanned document images, generating visual heatmaps of
potentially tampered regions.
"""
from __future__ import annotations

import uuid
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

try:
    import pymupdf as fitz  # PyMuPDF 1.27+
except ImportError:
    fitz = None

from engine.models import (
    ELAResult,
    Severity,
    SuspiciousRegion,
    Verdict,
)
from config import (
    ELA_JPEG_QUALITY,
    ELA_SCALE_FACTOR,
    ELA_GRID_SIZE,
    ELA_INTENSITY_THRESHOLD,
    ELA_SUSPICIOUS_RATIO,
    HEATMAP_DIR,
)


def _render_pdf_page_to_image(file_path: str, page_num: int = 0) -> Optional[np.ndarray]:
    """
    Render a PDF page to an OpenCV image using PyMuPDF.
    Falls back gracefully if PyMuPDF is not available.
    """
    if fitz is None:
        return None
    try:
        doc = fitz.open(file_path)
        page = doc[page_num]
        # Render at 2x resolution for better ELA sensitivity
        mat = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=mat)
        img_data = np.frombuffer(pix.samples, dtype=np.uint8)
        if pix.alpha:
            img = img_data.reshape(pix.height, pix.width, 4)
            img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
        else:
            img = img_data.reshape(pix.height, pix.width, 3)
            img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        doc.close()
        return img
    except Exception:
        return None


def _load_image(file_path: str) -> Optional[np.ndarray]:
    """Load an image file (JPEG, PNG, etc.) as an OpenCV BGR image."""
    try:
        img = cv2.imread(file_path)
        return img
    except Exception:
        return None


def _perform_ela(image: np.ndarray, quality: int = ELA_JPEG_QUALITY) -> np.ndarray:
    """
    Core ELA computation:
    1. Re-compress image at specified JPEG quality
    2. Compute pixel-wise absolute difference
    3. Scale the difference map for visibility
    """
    # Encode to JPEG in memory
    encode_params = [cv2.IMWRITE_JPEG_QUALITY, quality]
    _, encoded = cv2.imencode(".jpg", image, encode_params)

    # Decode back
    recompressed = cv2.imdecode(encoded, cv2.IMREAD_COLOR)

    # Compute absolute difference
    ela_diff = cv2.absdiff(image, recompressed)

    # Scale for visibility
    ela_scaled = np.clip(ela_diff * ELA_SCALE_FACTOR, 0, 255).astype(np.uint8)

    return ela_scaled


def _compute_block_scores(
    ela_gray: np.ndarray, grid_size: int = ELA_GRID_SIZE
) -> tuple[list[list[float]], float]:
    """
    Divide the ELA grayscale map into a grid and compute
    mean intensity per block. Returns block scores and document average.
    """
    h, w = ela_gray.shape
    block_h = h // grid_size
    block_w = w // grid_size

    scores = []
    all_intensities = []

    for row in range(grid_size):
        row_scores = []
        for col in range(grid_size):
            y0 = row * block_h
            y1 = (row + 1) * block_h if row < grid_size - 1 else h
            x0 = col * block_w
            x1 = (col + 1) * block_w if col < grid_size - 1 else w

            block = ela_gray[y0:y1, x0:x1]
            mean_val = float(np.mean(block))
            row_scores.append(mean_val)
            all_intensities.append(mean_val)
        scores.append(row_scores)

    doc_average = float(np.mean(all_intensities)) if all_intensities else 0.0
    return scores, doc_average


def _identify_suspicious_regions(
    block_scores: list[list[float]],
    doc_average: float,
    image_shape: tuple,
    grid_size: int = ELA_GRID_SIZE,
) -> list[SuspiciousRegion]:
    """
    Identify blocks with intensity significantly above average.
    """
    regions = []
    h, w = image_shape[:2]
    block_h = h // grid_size
    block_w = w // grid_size

    for row_idx, row in enumerate(block_scores):
        for col_idx, intensity in enumerate(row):
            if doc_average < 1.0:
                continue

            ratio = intensity / doc_average

            if intensity > ELA_INTENSITY_THRESHOLD and ratio > ELA_SUSPICIOUS_RATIO:
                y0 = row_idx * block_h
                y1 = (row_idx + 1) * block_h
                x0 = col_idx * block_w
                x1 = (col_idx + 1) * block_w

                severity = Severity.HIGH if ratio > 3.0 else (
                    Severity.MEDIUM if ratio > 2.0 else Severity.LOW
                )

                regions.append(SuspiciousRegion(
                    block_row=row_idx,
                    block_col=col_idx,
                    bbox=[float(x0), float(y0), float(x1), float(y1)],
                    mean_intensity=round(intensity, 2),
                    document_average=round(doc_average, 2),
                    ratio=round(ratio, 2),
                    severity=severity,
                ))

    return regions


import re

def _sanitize_filename(name: str) -> str:
    # Keep only ASCII alphanumeric characters, underscores, and dashes
    sanitized = re.sub(r'[^a-zA-Z0-9_\-]', '_', name)
    sanitized = re.sub(r'_+', '_', sanitized)
    return sanitized.strip('_')

def _generate_heatmap(
    ela_scaled: np.ndarray,
    original: np.ndarray,
    suspicious_regions: list[SuspiciousRegion],
    document_name: str,
    page: int,
) -> tuple[Optional[str], Optional[str]]:
    """
    Generate a color heatmap overlay and save both original + heatmap as PNGs.
    Returns (heatmap_path, original_path).
    """
    try:
        uid = uuid.uuid4().hex[:8]
        raw_stem = Path(document_name).stem
        base_name = _sanitize_filename(raw_stem)
        if not base_name:
            base_name = "document"

        # Convert ELA to grayscale for heatmap
        ela_gray = cv2.cvtColor(ela_scaled, cv2.COLOR_BGR2GRAY)

        # Apply color map
        heatmap = cv2.applyColorMap(ela_gray, cv2.COLORMAP_JET)

        # Blend with original (40% original + 60% heatmap)
        if original.shape[:2] != heatmap.shape[:2]:
            heatmap = cv2.resize(heatmap, (original.shape[1], original.shape[0]))

        blended = cv2.addWeighted(original, 0.4, heatmap, 0.6, 0)

        # Draw rectangles around suspicious regions
        for region in suspicious_regions:
            x0, y0, x1, y1 = [int(v) for v in region.bbox]
            color = (0, 0, 255) if region.severity == Severity.HIGH else (0, 165, 255)
            cv2.rectangle(blended, (x0, y0), (x1, y1), color, 2)

        # Scale down both original and blended images for reasonable file sizes
        scale_factor = min(1.0, 1200 / max(original.shape[1], 1))
        if scale_factor < 1.0:
            resized_blend = cv2.resize(blended, None, fx=scale_factor, fy=scale_factor)
            resized_orig = cv2.resize(original, None, fx=scale_factor, fy=scale_factor)
        else:
            resized_blend = blended
            resized_orig = original

        # Save files as JPG with 80% quality (reduces 14MB PNG to ~150KB JPEG)
        heatmap_path = str(HEATMAP_DIR / f"{base_name}_p{page}_ela_{uid}.jpg")
        original_path = str(HEATMAP_DIR / f"{base_name}_p{page}_orig_{uid}.jpg")

        cv2.imwrite(heatmap_path, resized_blend, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
        cv2.imwrite(original_path, resized_orig, [int(cv2.IMWRITE_JPEG_QUALITY), 80])

        return heatmap_path, original_path

    except Exception:
        return None, None


def analyze(
    file_path: str,
    document_name: str,
    page_num: int = 0,
    is_image: bool = False,
) -> ELAResult:
    """
    Execute full Error Level Analysis on a document page.
    
    Supports both PDF pages (rendered via PyMuPDF) and direct image files.
    Generates a heatmap overlay highlighting compression artifact
    inconsistencies that indicate image tampering.
    """
    # Load image
    if is_image:
        original = _load_image(file_path)
    else:
        original = _render_pdf_page_to_image(file_path, page_num)

    if original is None:
        return ELAResult(
            document_name=document_name,
            page=page_num + 1,
            overall_score=0,
            verdict=Verdict.CLEAN,
        )

    # Perform ELA
    ela_scaled = _perform_ela(original)

    # Convert to grayscale for scoring
    ela_gray = cv2.cvtColor(ela_scaled, cv2.COLOR_BGR2GRAY)

    # Compute block scores
    block_scores, doc_average = _compute_block_scores(ela_gray)

    # Identify suspicious regions
    suspicious = _identify_suspicious_regions(
        block_scores, doc_average, original.shape
    )

    # Generate heatmap
    heatmap_path, original_path = _generate_heatmap(
        ela_scaled, original, suspicious, document_name, page_num + 1
    )

    # Calculate overall score
    if suspicious:
        max_ratio = max(r.ratio for r in suspicious)
        score = min(100.0, len(suspicious) * 8.0 + (max_ratio - 1.0) * 15.0)
    else:
        score = max(0.0, min(20.0, doc_average * 0.5))

    if score >= 60:
        verdict = Verdict.TAMPERED
    elif score >= 25:
        verdict = Verdict.SUSPICIOUS
    else:
        verdict = Verdict.CLEAN

    return ELAResult(
        document_name=document_name,
        page=page_num + 1,
        overall_score=round(score, 2),
        suspicious_regions=suspicious,
        heatmap_path=heatmap_path,
        original_image_path=original_path,
        verdict=verdict,
    )


def analyze_all_pages(file_path: str, document_name: str) -> list[ELAResult]:
    """Analyze all pages of a PDF document."""
    results = []

    ext = Path(file_path).suffix.lower()
    if ext in {".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp"}:
        results.append(analyze(file_path, document_name, page_num=0, is_image=True))
        return results

    try:
        doc = fitz.open(file_path)
        page_count = len(doc)
        doc.close()
    except Exception:
        return [analyze(file_path, document_name, page_num=0)]

    for p in range(min(page_count, 3)):  # Limit ELA to first 3 pages for speed
        results.append(analyze(file_path, document_name, page_num=p))

    return results
