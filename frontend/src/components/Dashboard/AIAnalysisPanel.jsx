import React, { useState, useEffect } from 'react';
import { getAIStatus } from '../../api/veriflow.js';

export default function AIAnalysisPanel({ aiAnalysis, packetId }) {
  const [status, setStatus] = useState(aiAnalysis ? 'complete' : 'processing');
  const [result, setResult] = useState(aiAnalysis);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (status === 'complete' || status === 'error') return;

    let pollInterval;
    const poll = async () => {
      try {
        const res = await getAIStatus(packetId);
        if (res.status === 'complete') {
          setResult(res.result);
          setStatus('complete');
          clearInterval(pollInterval);
        } else if (res.status === 'error') {
          setError(res.error);
          setStatus('error');
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error("AI polling failed", err);
      }
    };

    pollInterval = setInterval(poll, 2000);
    return () => clearInterval(pollInterval);
  }, [packetId, status]);

  return (
    <div className="panel" style={{ height: '100%' }}>
      <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Local Offline AI Analysis</span>
        {status === 'processing' && (
          <span className="badge badge-warn">Analyzing...</span>
        )}
      </div>

      {status === 'processing' && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
          <div className="spinner" style={{ marginBottom: 16 }}></div>
          <p style={{ fontSize: 13 }}>The offline LLM is reviewing extracted data...</p>
          <p style={{ fontSize: 11, marginTop: 4 }}>This may take 15-30s on CPU.</p>
        </div>
      )}

      {status === 'error' && (
        <div className="alert alert-danger">
          <strong>AI Analysis Failed:</strong> {error || 'Could not reach local AI.'}
        </div>
      )}

      {status === 'complete' && result && (
        <div>
          <div style={{
            padding: 12,
            background: result.is_suspicious ? '#fef2f2' : '#f0fdf4',
            borderLeft: `4px solid ${result.is_suspicious ? '#ef4444' : '#22c55e'}`,
            marginBottom: 16,
            fontSize: 13,
            lineHeight: 1.5
          }}>
            <p><strong>Offline LLM Summary:</strong></p>
            <p>{result.summary}</p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#4b5563' }}>AI SUSPICION SCORE</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <div style={{ flex: 1, height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${result.suspicion_score}%`,
                  background: result.suspicion_score > 50 ? '#ef4444' : result.suspicion_score > 20 ? '#f59e0b' : '#22c55e'
                }} />
              </div>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{result.suspicion_score}/100</span>
            </div>
          </div>

          {result.flags?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#374151' }}>AI DETECTED FLAGS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.flags.map((flag, i) => (
                  <div key={i} style={{ padding: 10, border: '1px solid #e5e7eb', borderRadius: 4, background: '#f9fafb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className={`sev-${flag.severity || 'low'}`} style={{ fontSize: 10 }}>{flag.severity?.toUpperCase()}</span>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>{flag.affected_document || 'General'}</span>
                    </div>
                    <p style={{ fontSize: 12, margin: 0, color: '#374151' }}>{flag.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
