import React, { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useAnalysis } from '../context/AnalysisContext.jsx';
import { uploadDocuments, getDatasets, runDatasetDemo } from '../api/veriflow.js';

const EXPECTED_DECISIONS = {
  'APPROVE': 'badge-clean',
  'REJECT':  'badge-danger',
  'MANUAL REVIEW': 'badge-warn',
};

export default function UploadPage() {
  const { state, dispatch } = useAnalysis();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStage, setAnalyzeStage] = useState('');
  const [datasets, setDatasets] = useState([]);

  useEffect(() => {
    getDatasets()
      .then(data => { if (data?.packets) setDatasets(data.packets); })
      .catch(console.error);
  }, []);

  const onDrop = useCallback((accepted) => {
    setFiles(prev => [...prev, ...accepted]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    maxSize: 25 * 1024 * 1024,
    disabled: analyzing,
  });

  const removeFile = (i) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  const ANALYSIS_STAGES = [
    { progress: 12, message: 'Parsing PDF content streams...' },
    { progress: 25, message: 'Extracting PDF metadata & timestamps...' },
    { progress: 38, message: 'Running Error Level Analysis (ELA)...' },
    { progress: 52, message: 'OCR extraction — reading financial fields...' },
    { progress: 66, message: 'Cross-document coherence validation...' },
    { progress: 78, message: 'Recalculating TDS & PF from tax slabs...' },
    { progress: 88, message: 'Forensic intelligence engine running...' },
    { progress: 95, message: 'Aggregating risk scores...' },
  ];

  const simulateProgress = async () => {
    for (const s of ANALYSIS_STAGES) {
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
      setAnalyzeStage(s.message);
      dispatch({ type: 'UPDATE_PROGRESS', progress: s.progress, message: s.message });
    }
  };

  const handleAnalyze = async () => {
    if (!files.length) return;
    setAnalyzing(true);
    dispatch({ type: 'START_UPLOAD' });
    try {
      dispatch({ type: 'START_ANALYSIS' });
      const [report] = await Promise.all([
        uploadDocuments(files),
        simulateProgress(),
      ]);
      dispatch({ type: 'ANALYSIS_COMPLETE', report });
      setTimeout(() => navigate('/report'), 300);
    } catch (err) {
      dispatch({ type: 'ANALYSIS_ERROR', error: err.message });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDemo = async (packetId) => {
    setAnalyzing(true);
    dispatch({ type: 'START_UPLOAD' });
    try {
      dispatch({ type: 'START_ANALYSIS' });
      const [report] = await Promise.all([
        runDatasetDemo(packetId),
        simulateProgress(),
      ]);
      dispatch({ type: 'ANALYSIS_COMPLETE', report });
      setTimeout(() => navigate('/report'), 300);
    } catch (err) {
      dispatch({ type: 'ANALYSIS_ERROR', error: err.message });
    } finally {
      setAnalyzing(false);
    }
  };

  const busy = state.status === 'uploading' || state.status === 'analyzing';

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      {/* Page Title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>
          Document Forensics
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Upload a loan application packet for real-time multi-layer forensic analysis.
          The engine will detect mathematical fraud, income inflation, metadata tampering, and visual anomalies.
        </p>
      </div>

      {/* Upload Panel */}
      <div className="panel">
        <div className="panel-title">
          Upload Documents
        </div>

        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? 'active' : ''}`}
          style={{ opacity: busy ? 0.5 : 1, cursor: busy ? 'not-allowed' : 'pointer' }}
        >
          <input {...getInputProps()} />
          <div className="dropzone-icon">📄</div>
          <div className="dropzone-title">
            {isDragActive ? 'Drop documents here' : 'Drop documents or click to browse'}
          </div>
          <div className="dropzone-hint">
            Salary Slips · Bank Statements · Employment Letters · Loan Applications · ITR
            <br />PDF, JPEG, PNG — Max 25 MB per file
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Type</th>
                  <th style={{ width: 90 }}>Size</th>
                  <th style={{ width: 60 }} />
                </tr>
              </thead>
              <tbody>
                {files.map((f, i) => {
                  const ext = f.name.split('.').pop().toUpperCase();
                  return (
                    <tr key={`${f.name}-${i}`}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{f.name}</td>
                      <td>
                        <span className="badge badge-info">{ext}</span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {(f.size / 1024).toFixed(1)} KB
                      </td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => removeFile(i)}
                          disabled={busy}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn" onClick={() => setFiles([])} disabled={busy}>
                Clear All
              </button>
              <button className="btn btn-primary" onClick={handleAnalyze} disabled={busy}>
                {busy ? 'Analyzing...' : 'Run Forensic Analysis'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Progress */}
      {busy && (
        <div className="progress-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
              {analyzeStage || state.progressMessage}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent-blue)', fontWeight: 600 }}>
              {state.progress}%
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${state.progress}%` }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            Running 5-layer forensic pipeline: Structural DNA → ELA → OCR Extraction → Coherence Engine → Tax Logic
          </div>
        </div>
      )}

      {/* Error */}
      {state.status === 'error' && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          <strong>Analysis Failed:</strong> {state.error}
        </div>
      )}

      {/* Test Packets */}
      <div style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
            Pre-loaded Test Packets
          </h2>
          <span className="badge badge-info">{datasets.length} Scenarios</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Real documents crafted to test each fraud type. Run any packet to see the engine in action.
        </p>

        <div className="packet-grid">
          {datasets.map(p => {
            const badgeCls = EXPECTED_DECISIONS[p.expected_decision] || 'badge-info';
            return (
              <div key={p.id} className="packet-card">
                <div className="packet-card-header">
                  <div className="packet-card-name">{p.name}</div>
                  <span className={`badge ${badgeCls}`}>{p.expected_decision}</span>
                </div>
                <div className="packet-card-desc">{p.description}</div>
                <div className="packet-card-footer">
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {p.document_count} docs · Risk ~{p.expected_risk}%
                  </span>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleDemo(p.id)}
                    disabled={busy || !p.available}
                    id={`run-packet-${p.id}`}
                  >
                    {p.available ? 'Run' : 'N/A'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
