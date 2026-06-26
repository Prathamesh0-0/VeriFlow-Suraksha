"""
VeriFlow — FastAPI Application Entry Point
Document DNA & Cross-Document Coherence Engine for Real-Time Underwriting Forensics.
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import HEATMAP_DIR, UPLOAD_DIR
from routers import upload, results

# ─── Create App ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="VeriFlow Forensic Engine",
    description=(
        "Real-time document forensics pipeline for loan underwriting. "
        "Performs structural DNA analysis, error level analysis, and "
        "cross-document coherence validation."
    ),
    version="1.0.0-prototype",
    docs_url="/docs",
    redoc_url="/redoc",
)

import os
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]

# FastAPI crashes on startup if allow_origins=["*"] and allow_credentials=True
allow_creds = "*" not in origins

# ─── CORS (allow frontend access) ───────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_creds,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Static Files ────────────────────────────────────────────────────────────
HEATMAP_DIR.mkdir(exist_ok=True)
app.mount("/heatmaps", StaticFiles(directory=str(HEATMAP_DIR)), name="heatmaps")

# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(upload.router)
app.include_router(results.router)


# ─── Root ────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "name": "VeriFlow Forensic Engine",
        "version": "1.0.0-prototype",
        "status": "operational",
        "docs": "/docs",
        "endpoints": {
            "upload": "POST /api/upload",
            "demo_clean": "POST /api/demo/clean",
            "demo_tampered": "POST /api/demo/tampered",
            "health": "GET /api/health",
            "system_info": "GET /api/system-info",
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
