"""
VeriFlow — Results Router
Serves analysis results, heatmap images, and status endpoints.
"""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from config import HEATMAP_DIR

router = APIRouter(prefix="/api", tags=["results"])


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "VeriFlow Forensic Engine",
        "version": "1.0.0-prototype",
    }


@router.get("/heatmap/{filename}")
async def get_heatmap(filename: str):
    """
    Serve an ELA heatmap image by filename.
    Used by the frontend ELA viewer component.
    """
    # Sanitize filename to prevent path traversal
    safe_name = Path(filename).name
    file_path = HEATMAP_DIR / safe_name

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Heatmap not found.")

    return FileResponse(
        str(file_path),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/system-info")
async def system_info():
    """
    Return system capability information.
    Useful for the frontend to know what features are available.
    """
    # Check Tesseract availability
    tesseract_available = False
    try:
        import pytesseract
        pytesseract.get_tesseract_version()
        tesseract_available = True
    except Exception:
        pass

    # Check OpenCV availability
    opencv_available = False
    try:
        import cv2
        opencv_available = True
    except Exception:
        pass

    # Check PyMuPDF availability
    pymupdf_available = False
    try:
        import pymupdf
        pymupdf_available = True
    except Exception:
        pass

    # Check EasyOCR availability
    easyocr_available = False
    try:
        import easyocr
        easyocr_available = True
    except Exception:
        pass

    return {
        "tesseract": tesseract_available,
        "opencv": opencv_available,
        "pymupdf": pymupdf_available,
        "easyocr": easyocr_available,
        "ocr_ready": tesseract_available or easyocr_available,
    }
