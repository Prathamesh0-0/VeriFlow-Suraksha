"""
VeriFlow Configuration
Global constants, thresholds, and Indian financial parameters.
"""
import os
from pathlib import Path

# ─── Paths ───────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
UPLOAD_DIR = BASE_DIR / "uploads"
HEATMAP_DIR = BASE_DIR / "heatmaps"
DATASET_DIR = PROJECT_ROOT / "DS"
UPLOAD_DIR.mkdir(exist_ok=True)
HEATMAP_DIR.mkdir(exist_ok=True)


# ─── Upload Constraints ─────────────────────────────────────────────────────
MAX_FILE_SIZE_MB = 25
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/tiff",
}

# ─── Layer 1: Structural DNA Thresholds ─────────────────────────────────────
# Font analysis — only flag subtle deviations (0.1–0.8pt) in the dominant font.
# Large deviations (>1.5pt) are headings/titles and should NOT be flagged.
FONT_SIZE_DEVIATION_TOLERANCE = 0.8      # Max deviation (pt) to flag as suspicious
FONT_SIZE_DEVIATION_MIN = 0.1            # Min deviation (pt) to consider (ignore rounding)
FONT_COUNT_ANOMALY_MIN = 5               # Flag fonts used in ≤ N characters (rare outlier font)
COORDINATE_SHIFT_THRESHOLD_PX = 2.0     # Minimum baseline drift to flag (px)
COORDINATE_SHIFT_MAX_PX = 15.0          # Maximum drift to flag — above this = section break

# Spacing analysis
CHAR_SPACING_VARIANCE_THRESHOLD = 1.5   # Std dev multiplier for spacing anomaly

# Chronological forensics
EXPECTED_TIMEZONE_OFFSET = "+05'30'"    # IST
SUSPICIOUS_PRODUCERS = [
    "adobe acrobat",
    "foxit",
    "libreoffice",
    "nitro",
    "pdfelement",
    "ilovepdf",
    "smallpdf",
    "canva",
    "sejda",
    "pdf-xchange",
    "inkscape",
    "photoshop",
    "gimp",
    "microsoft word",
    "google docs",
]
TRUSTED_PRODUCERS = [
    "incometax.gov.in",
    "traces",
    "nsdl",
    "cra-nsdl",
    "sbi",
    "hdfc",
    "icici",
    "axis bank",
    "kotak",
    "government",
    "epfindia",
    "finacle",
    "temenos",
    "infosys finacle",
]

# ELA analysis
ELA_JPEG_QUALITY = 90
ELA_SCALE_FACTOR = 20
ELA_GRID_SIZE = 8                       # 8×8 block grid
ELA_INTENSITY_THRESHOLD = 35            # Mean intensity above this = suspicious
ELA_SUSPICIOUS_RATIO = 2.0              # Block intensity / doc average

# ─── Layer 2: Coherence Thresholds ──────────────────────────────────────────
NAME_MATCH_THRESHOLD = 0.80             # Fuzzy string ratio — allows minor OCR errors
# ₹500 tolerance covers bank charges, professional tax rounding, LWF, etc.
SALARY_BANK_TOLERANCE = 500
ANNUAL_INCOME_DEVIATION = 0.05          # 5% tolerance for ITR vs salary
# 15% TDS tolerance — real payroll has rounding, professional tax, perquisite tax, etc.
TDS_DEVIATION_TOLERANCE = 0.50          # 50% tolerance — tax regime (old vs new), perquisites, etc.

# ─── Indian Financial Constants (FY 2024-25 / AY 2025-26) ──────────────────
STANDARD_DEDUCTION = 50_000

# New Tax Regime Slabs (FY 2024-25)
NEW_REGIME_SLABS = [
    (300_000, 0.00),     # Up to 3L: 0%
    (600_000, 0.05),     # 3L - 6L: 5%
    (900_000, 0.10),     # 6L - 9L: 10%
    (1_200_000, 0.15),   # 9L - 12L: 15%
    (1_500_000, 0.20),   # 12L - 15L: 20%
    (float('inf'), 0.30),# Above 15L: 30%
]

# Old Tax Regime Slabs (for reference/comparison)
OLD_REGIME_SLABS = [
    (250_000, 0.00),
    (500_000, 0.05),
    (1_000_000, 0.20),
    (float('inf'), 0.30),
]

HEALTH_EDUCATION_CESS = 0.04  # 4% on total tax

# EPF/PF Rates
EPF_EMPLOYEE_RATE = 0.12        # 12% of Basic + DA
EPF_EMPLOYER_RATE = 0.12        # 12% of Basic + DA
EPS_RATE = 0.0833               # 8.33% of Basic + DA (employer share)
EPF_EMPLOYER_NET_RATE = 0.0367  # 3.67% (employer EPF = 12% - 8.33%)

# Professional Tax (Maharashtra as default)
PROFESSIONAL_TAX_MONTHLY = 200  # ₹200/month for most states

# ─── Risk Score Weights ─────────────────────────────────────────────────────
# Coherence (cross-doc) is the most reliable fraud signal — raise its weight.
# ELA is useful for image-based forgeries but unreliable on text PDFs — lower weight.
WEIGHT_SYNTAX_GEOMETRY = 0.20
WEIGHT_CHRONOLOGICAL = 0.15
WEIGHT_ELA = 0.10
WEIGHT_CROSS_DOCUMENT = 0.35
WEIGHT_TAX_LOGIC = 0.20
