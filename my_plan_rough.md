# Title

**VeriFlow: Document DNA and Cross Document Coherence Engine for Real Time Underwriting Forensics**

---

# Description

## Problem Statement

Loan underwriting departments face a surge in sophisticated document fraud. Fraud rings increasingly use advanced editing tools to alter specific financial figures or names on land records, IT Returns, and bank statements. Existing market solutions fail because they rely on basic text OCR, which cannot detect prior modifications, or high-level metadata checking, which can be easily stripped by advanced fraudsters. Consequently, underwriters spend up to 40 minutes manually cross-checking data fields across multiple documents, slowing down loan approval rates and leaving banks exposed to high-value credit fraud.

---

# Proposed Solution

VeriFlow is an automated, real-time document verification pipeline that removes human error from underwriting by executing a two-tiered forensic interrogation on submitted loan packets within 90 seconds.

## Layer 1: Structural DNA and Physical Integrity Engine

Instead of checking easily wiped surface-level metadata, VeriFlow intercepts the raw PDF page layout streams and visual compression layers.

### Syntax Geometry

Detects font vector discontinuities and text matrix operator anomalies to identify microscopic coordinate shifts injected by manual text overrides.

### Chronological Forensics

Validates PDF compilation timezone offsets against official Indian server standards (IST) and cross-references embedded digital creation dates against the physical execution dates on stamp papers.

### Optical Error Level Analysis

Utilizes OpenCV to expose hidden JPEG compression artifacts and pixel micro-anomalies in scanned land registries, highlighting physically cloned or pasted elements.

---

## Layer 2: Cross Document Coherence and Financial Logic Engine

If a document proves structurally authentic, the Coherence Engine uses targeted OCR extraction to validate the mathematical truth of the entire application packet. It builds an automated relationship matrix to catch contradictions that single-file scanners miss.

### Cross Document Math

Verifies that the net salary stated on a salary slip perfectly matches the corresponding monthly salary credit deposits on a bank statement.

### Tax and Progression Logic

Automatically recalculates Tax Deducted at Source (TDS) and provident fund deductions based on the extracted gross salary to catch mathematically impossible forgeries where fraudsters altered the top-line revenue but failed to adjust the tax brackets.

---

# Technical Architecture

The prototype is designed as a lightweight microservice pipeline to ensure real-time execution during high-volume loan onboarding.

### Backend API

Python FastAPI for high-performance, asynchronous handling of concurrent document streams.

### Forensic Stream Parser

PyMuPDF to extract raw PDF compilation layout operators, timezone offsets, and rendering matrices.

### Optical Analysis

OpenCV for Error Level Analysis on image-based document scans.

### Data Extraction Pipeline

PyTesseract integrated with pdf2image for localized region-of-interest OCR token tracking.

### Underwriter Dashboard

A React frontend styled with Tailwind CSS, delivering an instantaneous contradiction map that visually isolates and highlights tampered syntax lines or mismatched figures side by side.

---

# Business Impact on Indian Banking

### Operational Efficiency

Reduces document verification turnaround times from 40 minutes of manual checking to under 90 seconds of automated execution.

### Risk Mitigation

Stops financial forgery at the point of ingestion, preventing fraudulent disbursements.

### Audit Compliance

Generates an immutable forensic trail for every application packet, protecting the bank during regulatory audits.
