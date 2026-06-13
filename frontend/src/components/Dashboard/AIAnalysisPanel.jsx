import React, { useState, useEffect } from 'react';

export default function AIAnalysisPanel({ aiAnalysis, packetId }) {
  const [data, setData] = useState(aiAnalysis);
  const [loading, setLoading] = useState(!aiAnalysis);

  useEffect(() => {
    // If we already have the analysis, don't poll
    if (aiAnalysis) {
      setData(aiAnalysis);
      setLoading(false);
      return;
    }

    if (!packetId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/ai-status/${packetId}`);
        const result = await res.json();
        
        if (result.status === 'completed') {
          setData(result.result);
          setLoading(false);
          clearInterval(interval);
          alert('AI has processed the documents');
        } else if (result.status === 'failed' || result.status === 'not_found') {
          setData(null);
          setLoading(false);
          clearInterval(interval);
        }
      } catch (e) {
        console.error('Polling AI status failed:', e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [aiAnalysis, packetId]);

  if (loading) {
    return (
      <div style={{ marginBottom: 20 }}>
        <div className="section-title">AI Analysis (Gemini)</div>
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 30, height: 30, border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 12 }}></div>
          <div style={{ color: '#6b7280', fontSize: 14 }}>Processing AI Analysis...</div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ marginBottom: 20 }}>
        <div className="section-title">AI Analysis (Gemini)</div>
        <div className="panel">
          <div style={{ color: '#9ca3af', fontSize: 13, padding: 10 }}>
            AI analysis not available or failed. Ensure GEMINI_API_KEY is configured on the server.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="section-title">AI Analysis (Gemini)</div>
      <div className="panel">
        {/* Verdict */}
        <table style={{ marginBottom: 16 }}>
          <tbody>
            <tr>
              <th style={{ width: 160 }}>AI Verdict</th>
              <td className={
                data.verdict === 'clean' ? 'status-pass' :
                data.verdict === 'suspicious' ? 'status-warn' : 'status-fail'
              } style={{ fontSize: 15, fontWeight: 700 }}>
                {data.verdict?.toUpperCase()}
              </td>
            </tr>
            <tr>
              <th>Confidence</th>
              <td style={{ fontFamily: 'var(--font-mono)' }}>
                {data.confidence != null ? `${(data.confidence * 100).toFixed(0)}%` : 'N/A'}
              </td>
            </tr>
            <tr>
              <th>Risk Score</th>
              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                {data.risk_score != null ? `${data.risk_score}/100` : 'N/A'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Reasoning */}
        {data.reasoning && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>REASONING</div>
            <div style={{
              padding: 12, background: '#f9fafb', border: '1px solid #d1d5db',
              fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
            }}>
              {data.reasoning}
            </div>
          </div>
        )}

        {/* Flags */}
        {data.flags?.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>FLAGS IDENTIFIED</div>
            <table style={{ fontSize: 12 }}>
              <thead>
                <tr><th>#</th><th>Severity</th><th>Category</th><th>Description</th></tr>
              </thead>
              <tbody>
                {data.flags.map((f, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td><span className={`sev-${f.severity || 'medium'}`}>{(f.severity || 'medium').toUpperCase()}</span></td>
                    <td>{f.category || 'General'}</td>
                    <td>{f.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.flags?.length === 0 && (
          <div className="alert alert-success">
            AI analysis found no suspicious patterns in this document packet.
          </div>
        )}
      </div>
    </div>
  );
}
