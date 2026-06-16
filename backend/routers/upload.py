"""
VeriFlow — Upload Router (v2 — Real Data)
Handles multi-file document uploads and dataset packet demos.
"""
from __future__ import annotations

import os
import uuid
import shutil
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse

from config import UPLOAD_DIR, MAX_FILE_SIZE_MB, ALLOWED_MIME_TYPES, DATASET_DIR
from engine.orchestrator import analyze_packet

router = APIRouter(prefix="/api", tags=["upload"])

# ─── Dataset Packet Mapping ─────────────────────────────────────────────────

DATASET_PACKETS = {
    "packet_a": {
        "name": "Packet A — Genuine",
        "dir": "Packet_A_Genuine",
        "description": "All documents consistent. No fraud indicators.",
        "expected_decision": "APPROVE",
        "expected_risk": 5,
    },
    "packet_b": {
        "name": "Packet B — Income Mismatch",
        "dir": "Packet_B_IncomeMismatch",
        "description": "Salary slip shows ₹77,400 but Loan Application claims ₹99,400.",
        "expected_decision": "REJECT",
        "expected_risk": 82,
    },
    "packet_c": {
        "name": "Packet C — Math Fraud",
        "dir": "Packet_C_MathFraud",
        "description": "Gross ₹89,000 - Deductions ₹11,600 = ₹77,400 but Net Pay shows ₹99,400.",
        "expected_decision": "REJECT",
        "expected_risk": 91,
    },
    "packet_d": {
        "name": "Packet D — Visual Anomaly",
        "dir": "Packet_D_VisualAnomaly",
        "description": "Basic Pay changed from ₹60,000 to ₹80,000 but Gross stays ₹89,000.",
        "expected_decision": "REJECT",
        "expected_risk": 94,
    },
    "packet_e": {
        "name": "Packet E — Perfect Forgery",
        "dir": "Packet_E_PerfectForgery",
        "description": "Internally consistent but OCR confidence anomalies detected.",
        "expected_decision": "MANUAL REVIEW",
        "expected_risk": 38,
    },
}


@router.post("/upload")
async def upload_and_analyze(
    files: list[UploadFile] = File(...),
    demo_mode: Optional[str] = Form(None),
):
    """
    Upload documents and execute the full forensic pipeline.
    Accepts PDF, JPEG, PNG files. Returns complete ForensicReport.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files per packet.")

    packet_id = uuid.uuid4().hex[:12]
    packet_dir = UPLOAD_DIR / packet_id
    packet_dir.mkdir(parents=True, exist_ok=True)

    saved_paths: list[str] = []
    saved_names: list[str] = []

    try:
        for file in files:
            ext = Path(file.filename or "unknown").suffix.lower()
            valid_extensions = {".pdf", ".jpg", ".jpeg", ".png", ".tiff", ".tif"}

            content_type = file.content_type or ""
            if ext not in valid_extensions and content_type not in ALLOWED_MIME_TYPES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file type: {file.filename} ({content_type})",
                )

            contents = await file.read()
            size_mb = len(contents) / (1024 * 1024)
            if size_mb > MAX_FILE_SIZE_MB:
                raise HTTPException(
                    status_code=400,
                    detail=f"File {file.filename} exceeds {MAX_FILE_SIZE_MB}MB limit.",
                )

            safe_name = f"{uuid.uuid4().hex[:8]}_{file.filename}"
            file_path = packet_dir / safe_name
            with open(file_path, "wb") as f:
                f.write(contents)

            saved_paths.append(str(file_path))
            saved_names.append(file.filename or "unknown")

        report = await analyze_packet(
            file_paths=saved_paths,
            file_names=saved_names,
        )

        return report.model_dump()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/ai-status/{packet_id}")
async def get_ai_status(packet_id: str):
    """Poll for background offline AI analysis completion."""
    from engine.orchestrator import AI_TASK_STORE
    task = AI_TASK_STORE.get(packet_id)
    
    if not task:
        return JSONResponse({"status": "processing"})
        
    if task["status"] == "complete":
        return JSONResponse({"status": "complete", "result": task["result"].dict()})
    elif task["status"] == "error":
        return JSONResponse({"status": "error", "error": task["error"]})
        
    return JSONResponse({"status": "processing"})


@router.get("/datasets")
async def list_datasets():
    """List available dataset packets for testing."""
    packets = []
    for key, meta in DATASET_PACKETS.items():
        packet_dir = DATASET_DIR / meta["dir"]
        exists = packet_dir.exists()
        pdf_count = len(list(packet_dir.glob("*.pdf"))) if exists else 0
        packets.append({
            "id": key,
            "name": meta["name"],
            "description": meta["description"],
            "expected_decision": meta["expected_decision"],
            "expected_risk": meta["expected_risk"],
            "available": exists,
            "document_count": pdf_count,
        })
    return {"packets": packets}


@router.post("/demo/{packet_id}")
async def run_dataset_demo(packet_id: str):
    """
    Run forensic analysis on a dataset packet.
    Loads real PDFs from the DS/ folder and runs the full pipeline.
    """
    if packet_id not in DATASET_PACKETS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown packet. Available: {list(DATASET_PACKETS.keys())}",
        )

    meta = DATASET_PACKETS[packet_id]
    packet_dir = DATASET_DIR / meta["dir"]

    if not packet_dir.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Dataset directory not found: {packet_dir}",
        )

    # Collect PDF files (exclude ExpectedResult and DecisionReport)
    pdf_files = sorted([
        f for f in packet_dir.iterdir()
        if f.suffix.lower() == ".pdf"
        and "DecisionReport" not in f.name
        and "ExpectedResult" not in f.name
    ])

    if not pdf_files:
        raise HTTPException(
            status_code=404,
            detail="No PDF documents found in packet directory.",
        )

    saved_paths = [str(f) for f in pdf_files]
    saved_names = [f.name for f in pdf_files]

    try:
        report = await analyze_packet(
            file_paths=saved_paths,
            file_names=saved_names,
        )

        result = report.model_dump()
        result["dataset_meta"] = {
            "packet_id": packet_id,
            "packet_name": meta["name"],
            "expected_decision": meta["expected_decision"],
            "expected_risk": meta["expected_risk"],
            "description": meta["description"],
        }

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
