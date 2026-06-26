# VeriFlow — Comprehensive Project Report
## Real-Time Offline Document Forensic Engine

---

## 1. Executive Summary
VeriFlow is an advanced, fully offline document forensic engine designed to detect tampered and fabricated financial documents during the underwriting process. Financial institutions frequently face fraud where applicants submit manipulated salary slips, bank statements, and tax returns to inflate their income and secure larger loans. VeriFlow automates the detection of both visual manipulations (photoshopping) and semantic manipulations (forged numbers, impossible tax arithmetic, cross-document contradictions).

## 2. The Problem Statement
In the modern lending landscape, fraudsters use sophisticated tools to alter financial documents:
*   **Packet A Fraud (Visual Tampering):** Modifying an existing document using PDF editors or Photoshop to change names or figures.
*   **Packet B & C Fraud (Income Inflation & Inconsistency):** Creating completely fake documents where the numbers don't add up (e.g., claiming a salary of ₹1,50,000 but the bank statement shows a credit of only ₹40,000).
*   **Packet D Fraud (Mathematical Fabrication):** Altering the gross pay but failing to adjust the mathematically required deductions like Income Tax (TDS) and Provident Fund (PF) according to Indian tax laws.

Human underwriters often miss these subtle anomalies because manually recalculating taxes and checking PDF metadata for hundreds of applications is impossible at scale.

## 3. Technical Architecture & Stack
VeriFlow is built as a decoupled, high-performance Full-Stack application.

### Backend (Forensic Engine)
*   **Framework:** FastAPI (Python) for asynchronous, high-throughput endpoints.
*   **Pipeline Orchestration:** `orchestrator.py` manages a multi-threaded, asynchronous workflow that runs extraction and forensic checks simultaneously across documents.
*   **Document Processing:** `PyMuPDF (fitz)` is used heavily for reading raw PDF content streams, text layers, embedded fonts, and XMP metadata at the lowest level.
*   **Computer Vision & OCR:** 
    *   `OpenCV` and `NumPy` are used for image manipulation and computing pixel-wise absolute differences for Error Level Analysis (ELA).
    *   `EasyOCR` is lazy-loaded as a fallback to extract text from flattened, image-based PDF scans.
*   **Architecture Principle:** 100% Offline execution. No external APIs (like OpenAI) are used, ensuring zero data leakage and strict compliance with financial privacy regulations.

### Frontend (User Interface)
*   **Framework:** React (Vite) with a robust Context API (`AnalysisContext.jsx`) for managing pipeline state.
*   **Styling:** Pure vanilla CSS implementing a "Static Enterprise Bank" UI. This ensures the application looks and feels like a highly secure, professional banking portal (deep blue headers, sharp borders, standard typography) rather than a bouncy consumer web app.

---

## 4. How VeriFlow Works: The Two-Tiered Pipeline

When a user uploads a packet of documents (e.g., a Salary Slip, a Bank Statement, and a Loan Application), VeriFlow executes a deterministic, multi-layered forensic pipeline.

### Stage 1: Ingestion & Classification
The backend (`ocr_extractor.py`) automatically classifies each document based on filename heuristics and its internal text contents. It uses complex Regex patterns (e.g., matching keywords like `gross pay`, `ifsc`, or `assessment year`) to identify Salary Slips, Bank Statements, or ITR Forms.

### Stage 2: Layer 1 — Structural DNA Analysis (Document Level)
Before reading what the document *says*, VeriFlow analyzes how the document was *built*.
1.  **Syntax & Geometry (`syntax_geometry.py`):** Parses the PDF content stream. 
    *   **Font Deviations:** If a fraudster pastes a new "Net Pay" figure over an old one, VeriFlow detects micro-deviations in font size (e.g., between 0.1pt and 0.8pt difference from the median document size).
    *   **Baseline Drift:** It groups text spans by Y-coordinate and checks for 2-15px vertical drift, indicating the pasted text doesn't perfectly align with the original Y-axis.
    *   **Character Spacing:** It flags words where characters are artificially squeezed (<20% normal width) or stretched (>350%), indicating a forced fit into an erased box.
2.  **Chronological Forensics (`chronological.py`):** Examines internal XMP metadata. It flags documents where the "Modified Date" is later than the "Creation Date" or if the "Producer" tag indicates editing software like *Adobe Acrobat*, *iLovePDF*, or *Foxit*.
3.  **Error Level Analysis (`ela.py`):** For scanned or flattened image documents, VeriFlow renders the PDF to an image using PyMuPDF. It then resaves the image at a known JPEG quality (`90`) and computes an absolute difference using OpenCV (`cv2.absdiff`). Areas that were recently pasted/photoshopped will compress differently, showing up as bright red "hotspots" on the generated OpenCV colormap heatmap.

### Stage 3: Layer 2 — Coherence Engine (Cross-Document Level)
After verifying the physical structure, VeriFlow extracts the semantic data to ensure the numbers actually make sense.
1.  **OCR Extraction (`ocr_extractor.py`):** Extracts specific financial fields. It relies on a two-pass system: First, exact regex matching. If that fails for numeric fields, it drops to a proximity-based fallback, finding the nearest OCR number (fixing common OCR typos like `S` to `5`, `O` to `0`) within a 120-character window of the keyword.
2.  **Cross-Document Validation (`cross_document.py`):** Treats the document packet as a connected graph. 
    *   *Does the Applicant Name match exactly across the Bank Statement and Salary Slip?*
    *   *Does the "Net Pay" on the Salary Slip match the "Salary Credit" line item in the Bank Statement?*
    *   *Does the "Monthly Income" claimed on the Loan Application match the actual Salary Slip?*
3.  **Tax Logic Validation (`tax_logic.py`):** This is the ultimate mathematical trap. VeriFlow reverse-engineers the FY 2024-25 New Tax Regime. It takes the stated Gross Salary, computes the ₹50,000 standard deduction, calculates the taxable income, applies the exact progressive tax slabs, adds the 4% Health & Education Cess, and outputs the expected monthly TDS. It also computes expected PF (capped at the ₹15,000 wage ceiling). If the stated TDS deviates by more than the tolerance, it flags the document as mathematically forged.

### Stage 4: The Forensic Intelligence Engine (`local_ai.py`)
Replacing the need for a slow, unpredictable LLM, VeriFlow runs a blazing-fast 12-rule deterministic engine against the extracted numeric fields:
1.  **Arithmetic Consistency:** *Gross Pay* minus *Total Deductions* must exactly equal *Net Pay*.
2.  **Salary-Bank Match:** Cross-references slip net pay vs bank credit.
3.  **Loan Income Inflation:** Cross-references loan app claimed income vs actual slip.
4.  **PF Percentage:** Checks if PF is actually 12% of Basic Pay (testing both capped and uncapped methods).
5.  **Round Number Suspicion:** Flags suspiciously perfect salaries (e.g., exactly ₹1,00,000) not matching real-world fractional payroll computations.
6.  **CTC vs Monthly Consistency:** Ensures Annual CTC / 12 approximates Net Pay within a 40% tolerance.
7.  **Net > Gross Impossibility:** Flags mathematically impossible scenarios where Net Pay > Gross Pay.
8.  **Excess Deductions:** Flags if deductions exceed 60% of gross pay.
9.  **Basic > Gross Impossibility:** Flags if a component (Basic) is larger than the total (Gross).
10. **Loan-to-Income Stress Test:** Generates an estimated EMI for the requested loan and flags if the EMI-to-Income ratio exceeds 60%.
11. **Missing Mandatory Deductions:** Flags if a high-income salary slip suspiciously has exactly ₹0 TDS and ₹0 PF.
12. **Cross-Document Net Pay:** Ensures the net pay figure remains completely identical across all documents referencing it.

### Stage 5: Aggregation and Reporting
The Orchestrator computes a final weighted Risk Score (0-100) combining Coherence, Structural DNA, ELA, and Tax Logic scores:
*   `0 - 24`: **CLEAN** (Authentic packet)
*   `25 - 59`: **SUSPICIOUS** (Minor anomalies, manual review required)
*   `60 - 100`: **TAMPERED** (Mathematical impossibilities or severe structural editing, automatic rejection recommended)

---

## 5. System Deployment & File Structure

The project is structured to easily deploy on local bank infrastructure without cloud dependencies.

```text
/Suraksha Hackathon
├── backend/
│   ├── main.py                 # FastAPI server and endpoints
│   ├── config.py               # Global constants, thresholds, and tax slabs
│   ├── engine/                 # Core Forensic Logic
│   │   ├── orchestrator.py     # Pipeline coordinator
│   │   ├── models.py           # Pydantic schemas for structured reporting
│   │   ├── local_ai.py         # 12-rule deterministic intelligence engine
│   │   ├── structural_dna/     # Layer 1 logic (fonts, baselines, metadata, ELA)
│   │   └── coherence/          # Layer 2 logic (OCR, cross-doc matching, tax rules)
│   └── uploads/                # Temporary secure storage for processing
│
└── frontend/
    ├── package.json            # React dependencies
    └── src/
        ├── index.css           # Static enterprise bank UI design system
        ├── App.jsx             # React application shell and routing
        ├── api/veriflow.js     # API communication layer
        └── components/         # Modular dashboard panels (Risk Gauge, Tables, Heatmaps)
```

## 6. Conclusion
VeriFlow transforms underwriting from a manual, error-prone guessing game into a mathematically rigorous, deterministic science. By combining pixel-level structural analysis with deep financial coherence logic, it catches fraud that is invisible to the human eye, all while running securely on local infrastructure in milliseconds.
