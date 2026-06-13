import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalysis } from '../context/AnalysisContext.jsx';
import OverviewPanel from '../components/Dashboard/OverviewPanel.jsx';
import StructuralDNA from '../components/Forensics/StructuralDNA.jsx';
import ELAViewer from '../components/Forensics/ELAViewer.jsx';
import CoherenceMatrix from '../components/Coherence/CoherenceMatrix.jsx';
import TaxRecalculation from '../components/Coherence/TaxRecalculation.jsx';
import AIAnalysisPanel from '../components/Dashboard/AIAnalysisPanel.jsx';

export default function ReportPage() {
  const { state, dispatch } = useAnalysis();
  const navigate = useNavigate();
  const report = state.report;

  if (!report) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <p style={{ color: '#6b7280', marginBottom: 16 }}>No report available.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Go to Upload
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div className="no-print" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #d1d5db',
      }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Analysis Report</h2>
          <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--font-mono)' }}>
            Ref: {report.packet_id} | {report.total_documents} doc(s) | {report.processing_time_seconds}s
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => window.print()}>Print</button>
          <button className="btn btn-primary" onClick={() => { dispatch({ type: 'RESET' }); navigate('/'); }}>
            New Analysis
          </button>
        </div>
      </div>

      {/* Verdict banner */}
      <div className={
        report.overall_verdict === 'clean' ? 'alert alert-success' :
        report.overall_verdict === 'suspicious' ? 'alert alert-warning' : 'alert alert-danger'
      } style={{ fontSize: 13 }}>
        {report.summary}
      </div>

      {/* Main content — two-column layout for Engine vs AI */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
        {/* Left: Engine results */}
        <div style={{ flex: 2, minWidth: 500 }}>
          <OverviewPanel report={report} />
        </div>
        {/* Right: AI analysis */}
        <div style={{ flex: 1, minWidth: 350 }}>
          <AIAnalysisPanel aiAnalysis={report.ai_analysis} packetId={report.packet_id} />
        </div>
      </div>

      {/* Detailed sections */}
      <StructuralDNA report={report} />

      {report.document_reports?.some(dr => dr.ela_results?.length > 0) && (
        <ELAViewer report={report} />
      )}

      {report.coherence && (
        <CoherenceMatrix coherence={report.coherence} documentReports={report.document_reports} />
      )}

      {report.tax_validation && (
        <TaxRecalculation taxResult={report.tax_validation} />
      )}
    </div>
  );
}
