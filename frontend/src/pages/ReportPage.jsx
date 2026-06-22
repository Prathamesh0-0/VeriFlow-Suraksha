import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalysis } from '../context/AnalysisContext.jsx';
import OverviewPanel from '../components/Dashboard/OverviewPanel.jsx';
import StructuralDNA from '../components/Forensics/StructuralDNA.jsx';
import ELAViewer from '../components/Forensics/ELAViewer.jsx';
import CoherenceMatrix from '../components/Coherence/CoherenceMatrix.jsx';
import TaxRecalculation from '../components/Coherence/TaxRecalculation.jsx';
import ForensicEnginePanel from '../components/Dashboard/AIAnalysisPanel.jsx';
import ExtractedFieldsPanel from '../components/Coherence/ExtractedFieldsPanel.jsx';

export default function ReportPage() {
  const { state, dispatch } = useAnalysis();
  const navigate = useNavigate();
  const report = state.report;

  if (!report) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: 14 }}>
          No forensic report available.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          ⚡ Start New Analysis
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1160, margin: '0 auto' }}>
      {/* Report Header */}
      <div className="no-print" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
            Forensic Analysis Report
          </h1>
          <span style={{
            fontSize: 11,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
          }}>
            Packet: {report.packet_id} · {report.total_documents} document(s) · {report.processing_time_seconds}s
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => window.print()}>🖨 Print</button>
          <button
            className="btn btn-primary"
            onClick={() => { dispatch({ type: 'RESET' }); navigate('/'); }}
          >
            ⚡ New Analysis
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="two-col" style={{ marginBottom: 20 }}>
        <OverviewPanel report={report} />
        <ForensicEnginePanel
          aiAnalysis={report.ai_analysis}
          packetId={report.packet_id}
        />
      </div>

      {/* Extracted Fields — what was actually read from the documents */}
      {report.document_reports?.some(dr => dr.extracted_fields?.fields?.length > 0) && (
        <ExtractedFieldsPanel documentReports={report.document_reports} />
      )}

      {/* Layer 1: Structural DNA */}
      <StructuralDNA report={report} />

      {/* Layer 1: ELA Heatmaps */}
      {report.document_reports?.some(dr => dr.ela_results?.length > 0) && (
        <ELAViewer report={report} />
      )}

      {/* Layer 2: Cross-Document Coherence */}
      {report.coherence && (
        <CoherenceMatrix coherence={report.coherence} documentReports={report.document_reports} />
      )}

      {/* Layer 2: Tax Logic */}
      {report.tax_validation && (
        <TaxRecalculation taxResult={report.tax_validation} />
      )}
    </div>
  );
}
