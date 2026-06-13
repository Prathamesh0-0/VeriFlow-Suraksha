"""
VeriFlow Data Models
Pydantic models for all forensic analysis results.
"""
from __future__ import annotations

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


# ─── Enums ───────────────────────────────────────────────────────────────────

class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class DocumentType(str, Enum):
    SALARY_SLIP = "salary_slip"
    BANK_STATEMENT = "bank_statement"
    ITR_FORM = "itr_form"
    LAND_RECORD = "land_record"
    EMPLOYMENT_VERIFICATION = "employment_verification"
    LOAN_APPLICATION = "loan_application"
    UNKNOWN = "unknown"


class Verdict(str, Enum):
    CLEAN = "clean"
    SUSPICIOUS = "suspicious"
    TAMPERED = "tampered"


# ─── Layer 1: Structural DNA Models ─────────────────────────────────────────

class FontAnomaly(BaseModel):
    """A detected font inconsistency in the PDF structure."""
    page: int
    location: str = Field(description="Human-readable location, e.g., 'Line 12, Col 34'")
    bbox: list[float] = Field(description="Bounding box [x0, y0, x1, y1]")
    expected_font: str
    found_font: str
    expected_size: float
    found_size: float
    severity: Severity
    description: str


class CoordinateAnomaly(BaseModel):
    """A detected baseline/coordinate shift anomaly."""
    page: int
    line_index: int
    expected_y: float
    actual_y: float
    drift_px: float
    severity: Severity
    description: str


class SpacingAnomaly(BaseModel):
    """Abnormal inter-character spacing within a word."""
    page: int
    word: str
    location: str
    bbox: list[float]
    variance: float
    threshold: float
    severity: Severity
    description: str


class SyntaxGeometryResult(BaseModel):
    """Complete result from syntax geometry analysis."""
    document_name: str
    total_pages: int
    fonts_detected: list[dict]
    font_anomalies: list[FontAnomaly] = []
    coordinate_anomalies: list[CoordinateAnomaly] = []
    spacing_anomalies: list[SpacingAnomaly] = []
    risk_score: float = Field(ge=0, le=100)
    verdict: Verdict


class MetadataFlag(BaseModel):
    """A flagged metadata attribute."""
    field: str
    value: str
    expected: str
    severity: Severity
    description: str


class ChronologicalResult(BaseModel):
    """Result from chronological / metadata forensics."""
    document_name: str
    creation_date: Optional[str] = None
    modification_date: Optional[str] = None
    producer: Optional[str] = None
    creator: Optional[str] = None
    timezone_valid: bool
    timezone_found: Optional[str] = None
    tool_suspicious: bool
    metadata_flags: list[MetadataFlag] = []
    temporal_consistency: bool
    risk_score: float = Field(ge=0, le=100)
    verdict: Verdict


class SuspiciousRegion(BaseModel):
    """A region flagged by ELA analysis."""
    block_row: int
    block_col: int
    bbox: list[float] = Field(description="[x0, y0, x1, y1] in pixels")
    mean_intensity: float
    document_average: float
    ratio: float
    severity: Severity


class ELAResult(BaseModel):
    """Result from Error Level Analysis."""
    document_name: str
    page: int
    overall_score: float = Field(ge=0, le=100)
    suspicious_regions: list[SuspiciousRegion] = []
    heatmap_path: Optional[str] = None
    original_image_path: Optional[str] = None
    verdict: Verdict


# ─── Layer 2: Coherence Engine Models ────────────────────────────────────────

class ExtractedField(BaseModel):
    """A single extracted financial field."""
    field_name: str
    value: str
    numeric_value: Optional[float] = None
    confidence: float = Field(ge=0, le=1.0)
    source_document: str
    source_page: int = 1
    bbox: Optional[list[float]] = None


class DocumentFields(BaseModel):
    """All extracted fields from a single document."""
    document_name: str
    document_type: DocumentType
    fields: list[ExtractedField] = []


class Contradiction(BaseModel):
    """A detected cross-document contradiction."""
    field_a: ExtractedField
    field_b: ExtractedField
    relationship: str = Field(description="Expected relationship, e.g., 'should match'")
    expected_value: Optional[str] = None
    actual_deviation: Optional[str] = None
    severity: Severity
    description: str


class CoherenceResult(BaseModel):
    """Result from cross-document coherence validation."""
    documents_compared: list[str]
    contradictions: list[Contradiction] = []
    name_consistency: bool
    salary_bank_match: bool
    salary_itr_match: bool
    risk_score: float = Field(ge=0, le=100)
    verdict: Verdict


class TaxBreakdown(BaseModel):
    """Detailed tax calculation breakdown."""
    gross_annual: float
    standard_deduction: float
    taxable_income: float
    tax_before_cess: float
    cess: float
    total_tax: float
    monthly_tds: float


class TaxValidationResult(BaseModel):
    """Result from TDS/PF recalculation and validation."""
    document_name: str
    stated_gross_monthly: Optional[float] = None
    stated_tds: Optional[float] = None
    stated_pf: Optional[float] = None
    stated_net: Optional[float] = None
    recalculated: Optional[TaxBreakdown] = None
    expected_pf: Optional[float] = None
    tds_deviation_pct: Optional[float] = None
    pf_deviation_pct: Optional[float] = None
    tds_valid: bool = True
    pf_valid: bool = True
    risk_score: float = Field(ge=0, le=100)
    verdict: Verdict
    notes: list[str] = []


# ─── Aggregate Report ────────────────────────────────────────────────────────

class DocumentReport(BaseModel):
    """Complete forensic report for a single document."""
    document_name: str
    document_type: DocumentType
    syntax_geometry: Optional[SyntaxGeometryResult] = None
    chronological: Optional[ChronologicalResult] = None
    ela_results: list[ELAResult] = []
    extracted_fields: Optional[DocumentFields] = None


class ForensicReport(BaseModel):
    """Complete forensic report for an entire document packet."""
    packet_id: str
    total_documents: int
    processing_time_seconds: float
    document_reports: list[DocumentReport] = []
    coherence: Optional[CoherenceResult] = None
    tax_validation: Optional[TaxValidationResult] = None
    overall_risk_score: float = Field(ge=0, le=100)
    overall_verdict: Verdict
    summary: str
    flags_count: dict = Field(
        default_factory=lambda: {"critical": 0, "high": 0, "medium": 0, "low": 0}
    )
