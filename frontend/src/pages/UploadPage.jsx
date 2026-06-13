import React, { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useAnalysis } from '../context/AnalysisContext.jsx';
import { uploadDocuments, getDatasets, runDatasetDemo } from '../api/veriflow.js';

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
  });

  const removeFile = (i) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  const simulateProgress = async () => {
    const stages = [
      { progress: 15, message: 'Parsing document streams...' },
      { progress: 30, message: 'Analyzing metadata...' },
      { progress: 40, message: 'Running OCR extraction...' },
      { progress: 55, message: 'Extracting financial fields...' },
      { progress: 70, message: 'Cross-document validation...' },
      { progress: 80, message: 'Tax recalculation...' },
      { progress: 90, message: 'Running AI analysis...' },
      { progress: 95, message: 'Generating report...' },
    ];
    for (const s of stages) {
      await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
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
      const progressPromise = simulateProgress();
      const report = await uploadDocuments(files);
      await progressPromise;
      dispatch({ type: 'ANALYSIS_COMPLETE', report });
      setTimeout(() => navigate('/report'), 200);
    } catch (err) {
      dispatch({ type: 'ANALYSIS_ERROR', error: err.message });
    } finally { setAnalyzing(false); }
  };

  const handleDemo = async (packetId) => {
    setAnalyzing(true);
    dispatch({ type: 'START_UPLOAD' });
    try {
      dispatch({ type: 'START_ANALYSIS' });
      const progressPromise = simulateProgress();
      const report = await runDatasetDemo(packetId);
      await progressPromise;
      dispatch({ type: 'ANALYSIS_COMPLETE', report });
      setTimeout(() => navigate('/report'), 200);
    } catch (err) {
      dispatch({ type: 'ANALYSIS_ERROR', error: err.message });
    } finally { setAnalyzing(false); }
  };

  const busy = state.status === 'uploading' || state.status === 'analyzing';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Upload Documents</h2>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
        Upload applicant documents for forensic verification, or select a pre-loaded test packet.
      </p>

      {/* Upload zone */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div
          {...getRootProps()}
          style={{
            border: '2px dashed ' + (isDragActive ? '#0056b3' : '#d1d5db'),
            background: isDragActive ? '#eff6ff' : '#f9fafb',
            padding: '40px 20px',
            textAlign: 'center',
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.5 : 1,
          }}
        >
          <input {...getInputProps()} />
          <p style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
            {isDragActive ? 'Drop files here' : 'Click or drag files to upload'}
          </p>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
            PDF, JPEG, PNG — Max 25 MB per file
          </p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>File</th>
                  <th style={{ width: 100 }}>Size</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {files.map((f, i) => (
                  <tr key={`${f.name}-${i}`}>
                    <td>{f.name}</td>
                    <td>{(f.size / 1024).toFixed(1)} KB</td>
                    <td>
                      <button
                        className="btn"
                        style={{ padding: '2px 8px', fontSize: 11 }}
                        onClick={() => removeFile(i)}
                        disabled={busy}
                      >Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <button className="btn btn-primary" onClick={handleAnalyze} disabled={busy}>
                {busy ? 'Processing...' : 'Run Analysis'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Progress */}
      {busy && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span>{analyzeStage || state.progressMessage}</span>
            <span style={{ fontWeight: 600 }}>{state.progress}%</span>
          </div>
          <div style={{ height: 6, background: '#e5e7eb', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${state.progress}%`,
              background: '#0056b3',
              transition: 'width 0.3s',
            }} />
          </div>
        </div>
      )}

      {/* Error */}
      {state.status === 'error' && (
        <div className="alert alert-danger">
          <strong>Error:</strong> {state.error}
        </div>
      )}

      {/* Test packets */}
      <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 24, marginBottom: 12 }}>
        Pre-loaded Test Packets
      </h3>
      <table>
        <thead>
          <tr>
            <th>Packet</th>
            <th>Description</th>
            <th>Expected</th>
            <th style={{ width: 100 }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {datasets.map(p => (
            <tr key={p.id}>
              <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{p.name}</td>
              <td style={{ fontSize: 12 }}>{p.description}</td>
              <td>
                <span className={
                  p.expected_decision === 'APPROVE' ? 'status-pass' :
                  p.expected_decision === 'REJECT' ? 'status-fail' : 'status-warn'
                }>
                  {p.expected_decision}
                </span>
              </td>
              <td>
                <button
                  className="btn btn-primary"
                  style={{ padding: '4px 12px', fontSize: 12 }}
                  onClick={() => handleDemo(p.id)}
                  disabled={busy || !p.available}
                >
                  {p.available ? 'Run' : 'N/A'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
