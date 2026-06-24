import React, { useState, useEffect } from 'react';
import { getAIStatus } from '../../api/veriflow.js';

export default function ForensicEnginePanel({ aiAnalysis, packetId }) {
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
        console.error('Forensic engine polling failed', err);
      }
    };

    // Poll immediately then every 2s
    poll();
    pollInterval = setInterval(poll, 2000);
    return () => clearInterval(pollInterval);
  }, [packetId, status]);

  return (
    <div className="panel" style={{ height: '100%' }}>
      <div className="engine-header">
        <div className="engine-icon">FE</div>
        <div>
          <div className="engine-title">Forensic Intelligence Engine</div>
          <div className="engine-subtitle">12-rule deterministic fraud analysis · Offline</div>
        </div>
        {status === 'processing' && (
          <span className="badge badge-warn" style={{ marginLeft: 'auto' }}>Running...</span>
        )}
        {status === 'complete' && result && (
          <span className={`badge ${result.is_suspicious ? 'badge-danger' : 'badge-clean'}`} style={{ marginLeft: 'auto' }}>
            {result.is_suspicious ? 'SUSPICIOUS' : 'PASSED'}
          </span>
        )}
      </div>

      {status === 'processing' && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ marginBottom: 16 }} />
          <p style={{ fontSize: 13 }}>Running forensic rule checks...</p>
          <p style={{ fontSize: 11, marginTop: 4, color: 'var(--text-muted)' }}>
            Checking 12 fraud indicators across all documents
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="alert alert-danger">
          <strong>Engine Error:</strong> {error || 'Could not complete analysis.'}
        </div>
      )}

      {status === 'complete' && result && (
        <div>
          {/* Suspicion Score */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                Engine Score
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 20,
                fontWeight: 700,
                color: result.suspicion_score >= 60 ? 'var(--risk-danger)' :
                       result.suspicion_score >= 30 ? 'var(--risk-warn)' : 'var(--risk-clean)',
              }}>
                {result.suspicion_score}/100
              </span>
            </div>
            <div className="risk-bar-track">
              <div
                className={`risk-bar-fill ${result.suspicion_score >= 60 ? 'tampered' : result.suspicion_score >= 30 ? 'suspicious' : 'clean'}`}
                style={{ width: `${result.suspicion_score}%` }}
              />
            </div>
          </div>

          {/* Summary */}
          <div style={{
            padding: '12px 14px',
            background: result.is_suspicious ? 'var(--risk-danger-bg)' : 'var(--risk-clean-bg)',
            border: `1px solid ${result.is_suspicious ? 'var(--risk-danger-border)' : 'var(--risk-clean-border)'}`,
            borderRadius: 'var(--radius)',
            marginBottom: 16,
            fontSize: 12,
            lineHeight: 1.6,
            color: 'var(--text-primary)',
          }}>
            {result.summary}
          </div>

          {/* Flags */}
          {result.flags?.length > 0 ? (
            <div>
              <div className="panel-title" style={{ marginBottom: 10 }}>
                Violations Detected ({result.flags.length})
              </div>
              <div className="flag-list">
                {result.flags.map((flag, i) => (
                  <div key={i} className={`flag-item ${flag.severity || 'low'}`}>
                    <div className="flag-content">
                      <div style={{ marginBottom: 4 }}>
                        <span className={`flag-badge ${flag.severity || 'low'}`}>
                          {(flag.severity || 'low').toUpperCase()}
                        </span>
                      </div>
                      {flag.description}
                      {flag.affected_document && (
                        <div className="flag-meta">
                          Source: {flag.affected_document}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="alert alert-success">
              All 12 forensic rules passed. No mathematical fraud, income inflation, or arithmetic inconsistencies detected.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
