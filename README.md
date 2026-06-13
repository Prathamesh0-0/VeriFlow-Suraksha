# VeriFlow 🔍

**VeriFlow** is a 100% offline, deterministic document verification and forensic analysis engine built specifically for bank underwriting and loan application processing. 

Unlike black-box AI tools, VeriFlow relies entirely on explainable, rule-based forensic logic. It analyzes loan applicant document packets (Salary Slips, Bank Statements, ITR Forms, etc.) to detect tampering, numerical inflation, and chronological anomalies.

![VeriFlow Dashboard](https://img.shields.io/badge/Status-Active-success) ![License](https://img.shields.io/badge/License-MIT-blue)

---

## 🎯 Key Features

VeriFlow operates using a **Two-Tiered Forensic Pipeline**:

### Layer 1: Structural DNA Forensics
Detects physical and digital manipulations at the file level before reading any text.
*   **Syntax & Geometry Analysis:** Detects hidden fonts, invisible text layers, and coordinate "baseline drift" (which occurs when text is manually spliced into a PDF).
*   **Error Level Analysis (ELA):** Analyzes JPEG compression artifacts to highlight regions of an image that have been digitally altered or pasted in.
*   **Chronological Forensics:** Validates PDF metadata, checks creation vs. modification timelines, flags suspicious PDF producers (e.g., `ilovepdf`, `canva`), and verifies timezone consistency.

### Layer 2: Coherence Engine
Uses local OCR to extract financial numbers and cross-verifies them across the document packet using hard math.
*   **Cross-Document Math Validation:** Ensures the net pay on the salary slip *exactly* matches the salary credit on the bank statement.
*   **Indian Tax Logic Recalculation:** Re-calculates expected TDS (based on New/Old Tax Regime slabs) and PF (12% of basic) deductions to catch fabricated or inflated salary slips.
*   **Data Consistency Check:** Flags name mismatches, PAN card inconsistencies, and inflated income claims across multiple documents.

---

## 🚀 Tech Stack

**Backend (Python)**
*   **FastAPI:** High-performance async API.
*   **PyMuPDF & Pillow:** PDF and image processing.
*   **EasyOCR & PyTesseract:** Local, offline Optical Character Recognition.
*   **OpenCV & NumPy:** Image forensics and Error Level Analysis calculations.

**Frontend (React)**
*   **Vite:** Lightning-fast build tool.
*   **React:** Component-based UI.
*   **Tailwind CSS:** Modern, responsive styling.

---

## 🛠️ Installation & Setup

Because VeriFlow is completely offline, you must install the dependencies locally.

### Prerequisites
*   Python 3.10+
*   Node.js 18+
*   Tesseract OCR installed on your system.

### 1. Clone the repository
```bash
git clone https://github.com/Prathamesh0-0/VeriFlow-Suraksha.git
cd VeriFlow-Suraksha
```

### 2. Install Backend Dependencies
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # On Windows
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
You can launch both the frontend and backend simultaneously using the provided PowerShell script:
```powershell
.\start.ps1
```
*   The **Frontend** will be available at: `http://localhost:5173`
*   The **Backend API** will be available at: `http://127.0.0.1:8000`

---

## 📂 Project Structure

```text
VeriFlow/
├── backend/
│   ├── api.py                 # API Configurations
│   ├── config.py              # Financial constants & forensic thresholds
│   ├── engine/                # Core Forensic Engine
│   │   ├── coherence/         # Layer 2: OCR and Math logic
│   │   ├── structural_dna/    # Layer 1: ELA, Geometry, and Metadata
│   │   ├── models.py          # Pydantic schemas
│   │   └── orchestrator.py    # Master pipeline sequencer
│   ├── routers/               # FastAPI endpoints
│   └── main.py                # Server entry point
├── frontend/
│   ├── src/
│   │   ├── components/        # React UI components (Dashboard, Forensics)
│   │   ├── pages/             # Route pages (Upload, Report)
│   │   └── context/           # Global state management
│   └── vite.config.ts         # Vite configuration
└── DS/                        # Pre-loaded Demo Datasets (Legit vs Fake)
```

---

## ⚙️ Configuration & Tuning

VeriFlow's forensic thresholds and Indian financial constants can be tuned in `backend/config.py`.

*   `COORDINATE_SHIFT_THRESHOLD_PX = 5.0`: Adjust this if the system flags too many false-positive baseline drifts.
*   `TDS_DEVIATION_TOLERANCE = 0.02`: Margin of error (2%) allowed for manual tax deductions.

---

## 🛡️ Why No AI?

During development, VeriFlow integrated LLMs for narrative analysis. However, it was intentionally architected into a **pure deterministic engine** to meet strict Banking & Underwriting compliance standards. Banks require 100% explainable, mathematically provable reasons for rejecting a loan application. VeriFlow provides hard evidence, not black-box assumptions.

---

*Built for the Suraksha Hackathon.*
