import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { useAnalysis } from '../context/AnalysisContext.jsx';
import OverviewPanel from '../components/Dashboard/OverviewPanel.jsx';
import RiskGauge from '../components/Dashboard/RiskGauge.jsx';
import StructuralDNA from '../components/Forensics/StructuralDNA.jsx';
import ELAViewer from '../components/Forensics/ELAViewer.jsx';
import CoherenceMatrix from '../components/Coherence/CoherenceMatrix.jsx';
import TaxRecalculation from '../components/Coherence/TaxRecalculation.jsx';

export default function ReportPage() {
  const { state, dispatch } = useAnalysis();
  const navigate = useNavigate();
  const report = state.report;

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <p className="text-text-muted">No forensic report available.</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-lg bg-accent-cyan/10 text-accent-cyan text-sm font-medium hover:bg-accent-cyan/20 transition-colors"
        >
          Upload Documents
        </button>
      </div>
    );
  }

  const verdictColor = {
    clean: 'accent-emerald',
    suspicious: 'accent-amber',
    tampered: 'accent-red',
  }[report.overall_verdict] || 'accent-cyan';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-surface-700/50 text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Forensic Report</h1>
            <p className="text-xs font-mono text-text-muted">
              Packet ID: {report.packet_id} • {report.total_documents} document(s) • {report.processing_time_seconds}s
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { dispatch({ type: 'RESET' }); navigate('/'); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-700/50 text-text-secondary text-sm hover:text-text-primary transition-colors"
          >
            <RefreshCw size={14} />
            New Analysis
          </button>
        </div>
      </div>

      {/* Summary Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass-panel p-5 border-l-4 border-${verdictColor}`}
      >
        <p className="text-sm text-text-secondary">{report.summary}</p>
      </motion.div>

      {/* Risk Gauge + Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <RiskGauge score={report.overall_risk_score} verdict={report.overall_verdict} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2"
        >
          <OverviewPanel report={report} />
        </motion.div>
      </div>

      {/* Layer 1: Structural DNA */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <StructuralDNA report={report} />
      </motion.div>

      {/* Layer 1: ELA Viewer */}
      {report.document_reports?.some(dr => dr.ela_results?.length > 0) && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <ELAViewer report={report} />
        </motion.div>
      )}

      {/* Layer 2: Coherence Matrix */}
      {report.coherence && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <CoherenceMatrix coherence={report.coherence} documentReports={report.document_reports} />
        </motion.div>
      )}

      {/* Layer 2: Tax Recalculation */}
      {report.tax_validation && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <TaxRecalculation taxResult={report.tax_validation} />
        </motion.div>
      )}
    </div>
  );
}
