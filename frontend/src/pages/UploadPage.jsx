import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, X, AlertTriangle, Zap, Shield,
  Play, Loader2, CheckCircle2, Dna, Scan
} from 'lucide-react';
import { useAnalysis } from '../context/AnalysisContext.jsx';
import { uploadDocuments, runDemo } from '../api/veriflow.js';

export default function UploadPage() {
  const { state, dispatch } = useAnalysis();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStage, setAnalyzeStage] = useState('');

  const onDrop = useCallback((acceptedFiles) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxSize: 25 * 1024 * 1024,
  });

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const simulateProgress = async (dispatch) => {
    const stages = [
      { progress: 15, message: 'Parsing PDF content streams...' },
      { progress: 30, message: 'Analyzing font vector geometry...' },
      { progress: 40, message: 'Running Error Level Analysis...' },
      { progress: 55, message: 'Extracting financial fields via OCR...' },
      { progress: 70, message: 'Building cross-document contradiction matrix...' },
      { progress: 85, message: 'Recalculating TDS & PF deductions...' },
      { progress: 95, message: 'Generating forensic report...' },
    ];
    for (const stage of stages) {
      await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
      setAnalyzeStage(stage.message);
      dispatch({ type: 'UPDATE_PROGRESS', progress: stage.progress, message: stage.message });
    }
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;
    setAnalyzing(true);
    dispatch({ type: 'START_UPLOAD' });

    try {
      dispatch({ type: 'START_ANALYSIS' });
      const progressPromise = simulateProgress(dispatch);
      const report = await uploadDocuments(files);
      await progressPromise;

      dispatch({ type: 'ANALYSIS_COMPLETE', report });
      setTimeout(() => navigate('/report'), 500);
    } catch (err) {
      dispatch({ type: 'ANALYSIS_ERROR', error: err.message });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDemo = async (scenario) => {
    setAnalyzing(true);
    dispatch({ type: 'START_UPLOAD' });

    try {
      dispatch({ type: 'START_ANALYSIS' });
      const progressPromise = simulateProgress(dispatch);
      const report = await runDemo(scenario);
      await progressPromise;

      dispatch({ type: 'ANALYSIS_COMPLETE', report });
      setTimeout(() => navigate('/report'), 500);
    } catch (err) {
      dispatch({ type: 'ANALYSIS_ERROR', error: err.message });
    } finally {
      setAnalyzing(false);
    }
  };

  const isProcessing = state.status === 'uploading' || state.status === 'analyzing';

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-xs font-mono tracking-wider mb-2">
          <Dna size={14} />
          DOCUMENT DNA ANALYSIS
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-accent-cyan via-accent-emerald to-accent-purple bg-clip-text text-transparent">
          Upload Loan Documents
        </h1>
        <p className="text-text-secondary max-w-2xl mx-auto">
          Upload salary slips, bank statements, and IT returns for real-time forensic verification.
          VeriFlow analyzes structural DNA and cross-document coherence in under 90 seconds.
        </p>
      </motion.div>

      {/* Upload Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div
          {...getRootProps()}
          className={`relative glass-panel p-12 text-center cursor-pointer transition-all duration-300
            ${isDragActive ? 'border-accent-cyan/50 glow-cyan' : 'hover:border-surface-500/50'}
            ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
        >
          <input {...getInputProps()} />
          {isDragActive && <div className="scan-line" />}

          <div className="space-y-4">
            <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center transition-colors
              ${isDragActive ? 'bg-accent-cyan/20' : 'bg-surface-700/50'}`}>
              <Upload size={28} className={isDragActive ? 'text-accent-cyan' : 'text-text-muted'} />
            </div>
            <div>
              <p className="text-lg font-medium text-text-primary">
                {isDragActive ? 'Drop documents here' : 'Drag & drop documents here'}
              </p>
              <p className="text-sm text-text-muted mt-1">
                PDF, JPEG, PNG • Max 25MB per file • Up to 10 documents
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <h3 className="text-sm font-medium text-text-secondary">
              {files.length} document{files.length > 1 ? 's' : ''} selected
            </h3>
            {files.map((file, index) => (
              <motion.div
                key={`${file.name}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center justify-between p-3 rounded-xl bg-surface-800/50 border border-surface-700/30"
              >
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-accent-cyan" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{file.name}</p>
                    <p className="text-xs text-text-muted">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1.5 rounded-lg hover:bg-surface-700/50 text-text-muted hover:text-accent-red transition-colors"
                  disabled={isProcessing}
                >
                  <X size={16} />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analyze Button */}
      {files.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
          <button
            onClick={handleAnalyze}
            disabled={isProcessing}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-accent-cyan to-accent-emerald text-white font-semibold text-sm
              hover:shadow-lg hover:shadow-accent-cyan/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Scan size={18} />
                Run Forensic Analysis
              </>
            )}
          </button>
        </motion.div>
      )}

      {/* Progress Bar */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-panel p-6 space-y-3"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary font-mono">{analyzeStage || state.progressMessage}</span>
              <span className="text-accent-cyan font-mono font-bold">{state.progress}%</span>
            </div>
            <div className="h-2 bg-surface-700/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-accent-cyan to-accent-emerald rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${state.progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      {state.status === 'error' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-accent-red/10 border border-accent-red/20"
        >
          <AlertTriangle size={20} className="text-accent-red" />
          <div>
            <p className="text-sm font-medium text-accent-red">Analysis Failed</p>
            <p className="text-xs text-text-muted mt-0.5">{state.error}</p>
          </div>
        </motion.div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-surface-700/50" />
        <span className="text-xs text-text-muted font-mono">OR RUN A DEMO</span>
        <div className="flex-1 h-px bg-surface-700/50" />
      </div>

      {/* Demo Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {/* Clean Demo */}
        <button
          onClick={() => handleDemo('clean')}
          disabled={isProcessing}
          className="glass-panel p-6 text-left hover:glow-emerald transition-all duration-300 group disabled:opacity-50"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-accent-emerald/10 flex items-center justify-center group-hover:bg-accent-emerald/20 transition-colors">
              <CheckCircle2 size={20} className="text-accent-emerald" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Clean Document Packet</h3>
              <p className="text-xs text-text-muted">All documents consistent</p>
            </div>
          </div>
          <p className="text-xs text-text-secondary">
            3 documents (salary slip, bank statement, ITR) with matching data.
            Expected result: <span className="text-accent-emerald font-medium">LOW RISK</span>
          </p>
        </button>

        {/* Tampered Demo */}
        <button
          onClick={() => handleDemo('tampered')}
          disabled={isProcessing}
          className="glass-panel p-6 text-left hover:glow-red transition-all duration-300 group disabled:opacity-50"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-accent-red/10 flex items-center justify-center group-hover:bg-accent-red/20 transition-colors">
              <AlertTriangle size={20} className="text-accent-red" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Tampered Document Packet</h3>
              <p className="text-xs text-text-muted">Modified figures & font anomalies</p>
            </div>
          </div>
          <p className="text-xs text-text-secondary">
            3 documents with inflated salary, mismatched bank credit & font tampering.
            Expected result: <span className="text-accent-red font-medium">HIGH RISK</span>
          </p>
        </button>
      </motion.div>

      {/* Feature Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8"
      >
        {[
          { icon: Dna, title: 'Structural DNA', desc: 'PDF stream parsing, font vector analysis, coordinate drift detection', color: 'accent-cyan' },
          { icon: Scan, title: 'Error Level Analysis', desc: 'JPEG compression artifact detection with visual heatmap overlays', color: 'accent-purple' },
          { icon: Shield, title: 'Coherence Engine', desc: 'Cross-document math validation, TDS/PF recalculation', color: 'accent-emerald' },
        ].map((feature, i) => (
          <div key={i} className="glass-panel-light p-5 space-y-2">
            <feature.icon size={20} className={`text-${feature.color}`} />
            <h3 className="text-sm font-semibold text-text-primary">{feature.title}</h3>
            <p className="text-xs text-text-muted leading-relaxed">{feature.desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
