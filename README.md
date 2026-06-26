# VeriFlow 🔍

**Document DNA & Cross-Document Coherence Engine for Real-Time Underwriting Forensics**

VeriFlow is a 100% offline, deterministic document verification and forensic analysis engine built for bank underwriting and loan application processing. It analyzes loan applicant document packets (Salary Slips, Bank Statements, Employment Letters, Loan Applications, ITR Forms) to detect tampering, numerical inflation, and chronological anomalies.

Unlike black-box AI tools, VeriFlow produces 100% explainable, mathematically provable results — every flag comes with hard evidence and exact calculations.

![Status](https://img.shields.io/badge/Status-Active-success)
![Python](https://img.shields.io/badge/Python-3.10+-blue)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)
![React](https://img.shields.io/badge/Frontend-React-61DAFB)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## 🎯 Key Features

VeriFlow operates a **Two-Tiered Forensic Pipeline**:

### Layer 1: Structural DNA Forensics
Detects physical and digital manipulations at the file level — before reading any text.

| Analysis | What it detects |
|---|---|
| **Syntax & Geometry** | Font size micro-deviations (0.1–0.8pt), baseline drift, abnormal character spacing — hallmarks of copy-paste text replacement in PDF editors |
| **Error Level Analysis (ELA)** | JPEG compression artifact inconsistencies that reveal digitally altered or pasted regions in scanned documents |
| **Chronological Forensics** | Suspicious PDF producers (e.g., `ilovepdf`, `canva`, `photoshop`), timezone mismatches against IST, and temporal inconsistencies in creation/modification dates |

### Layer 2: Coherence Engine
Extracts financial fields via OCR and cross-validates them across the entire document packet using hard math.

| Analysis | What it detects |
|---|---|
| **Cross-Document Math** | Net pay on salary slip vs. bank salary credit mismatch, income inflation on loan applications |
| **Tax Logic Recalculation** | Independently recalculates TDS (FY 2024-25 New Tax Regime slabs) and PF (12% of basic) to catch fabricated deduction figures |
| **12-Rule Forensic Engine** | Arithmetic fraud (Gross - Deductions ≠ Net), impossible values (Net > Gross), round number suspicion, CTC vs monthly mismatch, and more |

### 5 Pre-loaded Test Packets

| Packet | Scenario | Expected Decision |
|---|---|---|
| **Packet A** — Genuine | All documents consistent, no fraud | ✅ APPROVE |
| **Packet B** — Income Mismatch | Salary slip ₹77,400 but Loan Application claims ₹99,400 | ❌ REJECT |
| **Packet C** — Math Fraud | Gross - Deductions = ₹77,400 but Net Pay shows ₹99,400 | ❌ REJECT |
| **Packet D** — Visual Anomaly | Basic Pay changed from ₹60,000 to ₹80,000 but Gross unchanged | ❌ REJECT |
| **Packet E** — Perfect Forgery | Internally consistent but OCR confidence anomalies | ⚠️ MANUAL REVIEW |

---

## 🚀 Tech Stack

### Backend (Python)
- **FastAPI** — High-performance async API with auto-generated OpenAPI docs
- **PyMuPDF** — PDF content stream parsing and text extraction
- **OpenCV + NumPy** — Error Level Analysis and image forensics
- **EasyOCR** — Offline OCR for image-based (scanned) PDFs
- **Pydantic v2** — Strict data validation and serialization

### Frontend (React + Vite)
- **React 19** — Component-based UI with React Router
- **Vite 8** — Lightning-fast HMR and build
- **Vanilla CSS** — Custom design system with CSS variables (no framework dependency)

---

## 🛠️ Installation & Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- Tesseract OCR (optional — EasyOCR is used as primary fallback)

### 1. Clone the repository
```bash
git clone https://github.com/Prathamesh0-0/VeriFlow-Suraksha.git
cd VeriFlow-Suraksha
```

### 2. Install Backend Dependencies
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
cd ..
```

### 3. Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 4. Run the Project

**Option A:** Use the PowerShell launch script (Windows):
```powershell
.\start.ps1
```

**Option B:** Start manually in two terminals:
```bash
# Terminal 1 — Backend
cd backend
python -m uvicorn main:app --reload

# Terminal 2 — Frontend
cd frontend
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

---

## 📂 Project Structure

```
VeriFlow/
├── backend/
│   ├── main.py                    # FastAPI entry point
│   ├── config.py                  # Forensic thresholds & Indian financial constants
│   ├── requirements.txt           # Python dependencies
│   ├── engine/
│   │   ├── orchestrator.py        # Master pipeline sequencer
│   │   ├── models.py              # Pydantic data models
│   │   ├── local_ai.py            # 12-rule deterministic fraud engine
│   │   ├── structural_dna/
│   │   │   ├── syntax_geometry.py # Font/baseline/spacing analysis
│   │   │   ├── chronological.py   # Metadata timestamp forensics
│   │   │   └── ela.py             # Error Level Analysis (OpenCV)
│   │   └── coherence/
│   │       ├── ocr_extractor.py   # OCR field extraction (PyMuPDF + EasyOCR)
│   │       ├── cross_document.py  # Cross-document consistency validation
│   │       └── tax_logic.py       # Indian tax slab recalculation engine
│   └── routers/
│       ├── upload.py              # File upload & demo packet endpoints
│       └── results.py             # Health check, heatmaps, system info
├── frontend/
│   ├── index.html
│   ├── vite.config.ts             # Vite config with API proxy
│   └── src/
│       ├── App.jsx                # Root component with routing
│       ├── main.jsx               # React entry point
│       ├── index.css              # Complete design system
│       ├── api/veriflow.js        # Backend API client
│       ├── context/               # Global state management
│       ├── pages/                 # Upload & Report pages
│       └── components/
│           ├── Dashboard/         # Overview, AI Analysis panels
│           ├── Forensics/         # Structural DNA, ELA viewer
│           └── Coherence/         # Cross-doc matrix, Tax recalc, Extracted fields
├── DS/                            # Pre-loaded test datasets (5 packets)
├── start.ps1                      # PowerShell launcher
└── VeriFlow_Architecture.md       # System architecture documentation
```

---

## ⚙️ Configuration

All forensic thresholds and Indian financial constants are centralized in [`backend/config.py`](backend/config.py):

### Key Thresholds
| Parameter | Default | Description |
|---|---|---|
| `FONT_SIZE_DEVIATION_TOLERANCE` | 0.8pt | Max font deviation to flag as suspicious |
| `COORDINATE_SHIFT_THRESHOLD_PX` | 2.0px | Min baseline drift to flag |
| `ELA_INTENSITY_THRESHOLD` | 35 | Mean ELA intensity above this = suspicious |
| `SALARY_BANK_TOLERANCE` | ₹500 | Allowed difference between salary slip and bank credit |
| `TDS_DEVIATION_TOLERANCE` | 50% | TDS comparison tolerance (covers old vs new regime) |

### Indian Financial Constants (FY 2024-25)
- New Tax Regime slabs with Section 87A rebate
- Standard Deduction: ₹50,000
- EPF Employee Rate: 12% (with ₹15,000 wage ceiling)
- Professional Tax: ₹200/month (Maharashtra)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    DOCUMENT PACKET                       │
│   Salary Slip + Bank Statement + Employment Letter +    │
│   Loan Application + ITR Form                           │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────▼──────────────┐
        │      ORCHESTRATOR           │
        │   (Sequences all layers)    │
        └──────────────┬──────────────┘
                       │
    ┌──────────────────┼──────────────────┐
    │                  │                  │
    ▼                  ▼                  ▼
┌────────┐      ┌────────────┐     ┌──────────┐
│Syntax  │      │Chronological│    │   ELA    │
│Geometry│      │ Forensics  │     │ Heatmap  │
└────┬───┘      └─────┬──────┘     └────┬─────┘
     │                │                  │
     └────────────────┼──────────────────┘
                      │  LAYER 1 COMPLETE
    ┌─────────────────┼─────────────────┐
    │                 │                 │
    ▼                 ▼                 ▼
┌─────────┐    ┌───────────┐    ┌──────────┐
│Cross-Doc│    │ Tax Logic │    │12-Rule   │
│Coherence│    │  Engine   │    │ Forensic │
└────┬────┘    └─────┬─────┘    │  Engine  │
     │               │          └────┬─────┘
     └───────────────┼───────────────┘
                     │  LAYER 2 COMPLETE
              ┌──────▼──────┐
              │  FORENSIC   │
              │   REPORT    │
              │ Risk Score  │
              │  + Verdict  │
              └─────────────┘
```

---

## 🛡️ Why Deterministic (No AI)?

During development, VeriFlow integrated LLMs for narrative analysis. It was intentionally re-architected into a **pure deterministic engine** to meet banking compliance standards:

1. **100% Explainable** — Every flag includes exact numbers, calculations, and evidence
2. **No Internet Required** — Runs completely offline, no API keys or cloud dependencies
3. **Instant Results** — Rule engine completes in milliseconds, not seconds
4. **Reproducible** — Same input always produces same output
5. **Audit-Ready** — Banks require mathematically provable reasons for loan rejection

---

## 📄 License

MIT License — Built for the Suraksha Hackathon.
