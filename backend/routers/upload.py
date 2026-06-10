"""
VeriFlow — Upload Router
Handles multi-file document uploads and triggers the forensic pipeline.
"""
from __future__ import annotations

import os
import uuid
import shutil
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse

from config import UPLOAD_DIR, MAX_FILE_SIZE_MB, ALLOWED_MIME_TYPES
from engine.orchestrator import analyze_packet

router = APIRouter(prefix="/api", tags=["upload"])


@router.post("/upload")
async def upload_and_analyze(
    files: list[UploadFile] = File(...),
    demo_mode: Optional[str] = Form(None),
):
    """
    Upload one or more documents and execute the full forensic pipeline.
    
    - Accepts PDF, JPEG, PNG, TIFF files
    - Maximum 25MB per file
    - Returns complete ForensicReport
    
    Query params:
    - demo_mode: "clean" | "tampered" — use mock data for demonstration
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files per packet.")

    # Create unique upload directory for this packet
    packet_id = uuid.uuid4().hex[:12]
    packet_dir = UPLOAD_DIR / packet_id
    packet_dir.mkdir(parents=True, exist_ok=True)

    saved_paths: list[str] = []
    saved_names: list[str] = []

    try:
        for file in files:
            # Validate file type
            content_type = file.content_type or ""
            ext = Path(file.filename or "unknown").suffix.lower()

            # Allow common document types
            valid_extensions = {".pdf", ".jpg", ".jpeg", ".png", ".tiff", ".tif"}
            if ext not in valid_extensions and content_type not in ALLOWED_MIME_TYPES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file type: {file.filename} ({content_type})",
                )

            # Read and validate size
            contents = await file.read()
            size_mb = len(contents) / (1024 * 1024)
            if size_mb > MAX_FILE_SIZE_MB:
                raise HTTPException(
                    status_code=400,
                    detail=f"File {file.filename} exceeds {MAX_FILE_SIZE_MB}MB limit ({size_mb:.1f}MB).",
                )

            # Save file
            safe_name = f"{uuid.uuid4().hex[:8]}_{file.filename}"
            file_path = packet_dir / safe_name
            with open(file_path, "wb") as f:
                f.write(contents)

            saved_paths.append(str(file_path))
            saved_names.append(file.filename or "unknown")

        # Determine demo mode
        is_demo = demo_mode is not None
        is_tampered = demo_mode == "tampered"

        # Execute forensic pipeline
        report = await analyze_packet(
            file_paths=saved_paths,
            file_names=saved_names,
            is_demo=is_demo,
            is_tampered_demo=is_tampered,
        )

        return report.model_dump()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    finally:
        # Cleanup uploaded files (keep heatmaps)
        # In production, you'd persist these to cloud storage
        pass


@router.post("/demo/{scenario}")
async def run_demo(scenario: str):
    """
    Run a demo scenario without requiring actual file uploads.
    
    Scenarios:
    - "clean": All documents consistent, no tampering
    - "tampered": Modified salary figures, font inconsistencies, TDS mismatch
    """
    if scenario not in ("clean", "tampered"):
        raise HTTPException(
            status_code=400,
            detail="Scenario must be 'clean' or 'tampered'.",
        )

    # Create mock file paths (empty PDFs — the mock data engine handles content)
    import pymupdf as fitz
    packet_id = uuid.uuid4().hex[:12]
    packet_dir = UPLOAD_DIR / packet_id
    packet_dir.mkdir(parents=True, exist_ok=True)

    mock_files = [
        ("Rajesh_Kumar_Salary_Slip_March2025.pdf", "salary_slip"),
        ("HDFC_Bank_Statement_March2025.pdf", "bank_statement"),
        ("ITR_Form_AY2025-26.pdf", "itr_form"),
    ]

    saved_paths = []
    saved_names = []

    for fname, doc_type in mock_files:
        fpath = packet_dir / fname
        # Create a minimal valid PDF
        doc = fitz.open()
        page = doc.new_page()

        # Add realistic text content based on document type
        if doc_type == "salary_slip":
            text = (
                "SALARY SLIP - March 2025\n"
                "Employee: Rajesh Kumar Sharma\n"
                "Emp ID: EMP-2024-1847\n\n"
                "Earnings:\n"
                "  Basic Pay: Rs. 42,500\n"
                "  HRA: Rs. 21,250\n"
                "  DA: Rs. 8,500\n"
                "  Other Allowances: Rs. 12,750\n"
                "  Gross Salary: Rs. 85,000\n\n"
                "Deductions:\n"
                "  PF: Rs. 5,100\n"
                "  TDS: Rs. 6,250\n"
                "  Professional Tax: Rs. 200\n"
                "  Net Pay: Rs. 73,450"
            )
        elif doc_type == "bank_statement":
            credit = "78,450" if scenario == "tampered" else "73,450"
            text = (
                "HDFC BANK - Account Statement\n"
                "Account Holder: Rajesh Kumar Sharma\n"
                f"A/C No: 50200041234567\n"
                f"IFSC: HDFC0001234\n\n"
                f"Opening Balance: Rs. 1,45,230\n"
                f"01/03/2025 - Salary Credit: Rs. {credit}\n"
                f"Closing Balance: Rs. 2,18,680"
            )
        else:
            gross = "12,50,000" if scenario == "tampered" else "10,20,000"
            text = (
                "INCOME TAX RETURN\n"
                "Assessment Year: 2025-26\n"
                "PAN: ABCPS1234K\n"
                "Name: Rajesh Kumar Sharma\n\n"
                f"Gross Total Income: Rs. {gross}\n"
                "Total Deductions: Rs. 1,50,000\n"
                "TDS Claimed: Rs. 75,000"
            )

        # Insert text with specific fonts for demo
        text_point = fitz.Point(50, 50)
        page.insert_text(text_point, text, fontsize=11, fontname="helv")

        if scenario == "tampered" and doc_type == "salary_slip":
            # Inject a different font for the salary figure (simulating tampering)
            page.insert_text(
                fitz.Point(200, 260),
                "85,000",
                fontsize=11.3,  # Slightly different size
                fontname="cour",  # Different font
                color=(0, 0, 0),
            )

        # Set metadata
        doc.set_metadata({
            "title": fname,
            "producer": "Adobe Acrobat Pro DC" if (scenario == "tampered" and doc_type == "salary_slip") else "HDFC NetBanking Portal",
            "creator": "VeriFlow Demo Generator",
            "creationDate": "D:20250315103000+05'30'",
            "modDate": "D:20250420153000+05'30'" if scenario == "tampered" else "D:20250315103500+05'30'",
        })

        doc.save(str(fpath))
        doc.close()

        saved_paths.append(str(fpath))
        saved_names.append(fname)

    # Run the forensic pipeline
    report = await analyze_packet(
        file_paths=saved_paths,
        file_names=saved_names,
        is_demo=True,
        is_tampered_demo=(scenario == "tampered"),
    )

    # Cleanup mock files
    try:
        shutil.rmtree(packet_dir)
    except Exception:
        pass

    return report.model_dump()
