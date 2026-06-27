import React, { useState } from 'react';

const SEV_CLASS = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
};

function FlagBadge({ severity }) {
  const cls = SEV_CLASS[severity] || 'low';
  return <span className={`flag-badge ${cls}`}>{(severity || 'low').toUpperCase()}</span>;
}

function DocumentSection({ docReport, index }) {
  const [open, setOpen] = useState(index === 0);
  const sg = docReport.syntax_geometry;
  const chrono = docReport.chronological;

  // Collect all anomalies from structural analysis
  const structuralAnomalies = [
    ...(sg?.font_anomalies || []).map(a => ({ ...a, type: 'Font Size Deviation' })),
    ...(sg?.coordinate_anomalies || []).map(a => ({ ...a, type: 'Baseline Drift' })),
    ...(sg?.spacing_anomalies || []).map(a => ({ ...a, type: 'Spacing Anomaly' })),
  ];

  // Only show non-LOW metadata flags (LOW are trusted-source info, not real flags)
  const metadataFlags = (chrono?.metadata_flags || [])
    .filter(f => f.severity !== 'low');

  const totalIssues = structuralAnomalies.length + metadataFlags.length;
  const verdict = sg?.verdict || chrono?.verdict || 'clean';
  const verdictClass = verdict === 'clean' ? 'status-pass' : verdict === 'suspicious' ? 'status-warn' : 'status-fail';

  // Doc type formatting
  const docTypeLabel = docReport.document_type?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN';

  return (
    <div className="doc-accordion">
      <div className="doc-accordion-header" onClick={() => setOpen(!open)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>
            {index + 1}. {docReport.document_name}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            {docTypeLabel}
          </span>
          <span className={verdictClass} style={{ fontSize: 11 }}>
            {verdict.toUpperCase()}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {totalIssues > 0 && (
            <span style={{
              fontSize: 12,
              color: 'var(--risk-danger)',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
            }}>
              {totalIssues} issue{totalIssues !== 1 ? 's' : ''}
            </span>
          )}
          {sg?.risk_score > 0 && (
            <span style={{
              fontSize: 11,
              color: sg.risk_score >= 60 ? 'var(--risk-danger)' : sg.risk_score >= 25 ? 'var(--risk-warn)' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}>
              risk: {sg.risk_score}
            </span>
          )}
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{open ? '▼' : '▶'}</span>
        </div>
      </div>

      <div className={`doc-accordion-body ${!open ? 'hide-on-screen' : ''} print-always`}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Left: Structural Anomalies */}
            <div>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--text-muted)',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                Structural Analysis
                {sg && (
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: sg.risk_score >= 60 ? 'var(--risk-danger)' : sg.risk_score >= 25 ? 'var(--risk-warn)' : 'var(--risk-clean)',
                    fontWeight: 700,
                  }}>
                    {sg.risk_score}/100
                  </span>
                )}
              </div>

              {sg?.fonts_detected?.length > 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, fontFamily: 'var(--font-mono)' }}>
                  Fonts: {sg.fonts_detected.slice(0, 4).map(f => f.name).join(', ')}
                  {sg.fonts_detected.length > 4 && ` +${sg.fonts_detected.length - 4} more`}
                </div>
              )}

              {structuralAnomalies.length > 0 ? (
                <div className="flag-list" style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {structuralAnomalies.map((a, i) => (
                    <div key={i} className={`flag-item ${a.severity || 'low'}`}>
                      <FlagBadge severity={a.severity} />
                      <div className="flag-content">
                        <div style={{ fontSize: 11, color: 'var(--text-accent)', marginBottom: 3, fontWeight: 600 }}>
                          {a.type} · Page {a.page}
                        </div>
                        {a.description}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="alert alert-success" style={{ marginBottom: 0 }}>
                  No structural anomalies detected. Font sizes, baselines, and character spacing are consistent.
                </div>
              )}
            </div>

            {/* Right: Metadata Forensics */}
            <div>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--text-muted)',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                Metadata Forensics
                {chrono && (
                  <span className={chrono.verdict === 'clean' ? 'status-pass' : 'status-fail'} style={{ fontSize: 11 }}>
                    {chrono.verdict?.toUpperCase()}
                  </span>
                )}
              </div>

              {chrono ? (
                <>
                  <table className="data-table" style={{ marginBottom: 12 }}>
                    <tbody>
                      <tr>
                        <td style={{ color: 'var(--text-muted)', fontSize: 11, width: 90 }}>Created</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                          {chrono.creation_date || <span style={{ color: 'var(--text-muted)' }}>N/A</span>}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>Modified</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                          {chrono.modification_date || <span style={{ color: 'var(--text-muted)' }}>N/A</span>}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>Producer</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, wordBreak: 'break-all' }}>
                          {chrono.producer || <span style={{ color: 'var(--text-muted)' }}>N/A</span>}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>Timezone</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                          <span className={chrono.timezone_valid === false ? 'status-fail' : 'status-pass'}>
                            {chrono.timezone_found || 'N/A'}
                          </span>
                          {chrono.timezone_valid && (
                            <span style={{ fontSize: 10, color: 'var(--risk-clean)', marginLeft: 6 }}>IST</span>
                          )}
                        </td>
                      </tr>
                      {chrono.tool_suspicious && (
                        <tr>
                          <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>Tool</td>
                          <td>
                            <span className="status-fail" style={{ fontSize: 11 }}>Editing software detected</span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {metadataFlags.length > 0 && (
                    <div className="flag-list">
                      {metadataFlags.map((f, i) => (
                        <div key={i} className={`flag-item ${f.severity || 'low'}`}>
                          <FlagBadge severity={f.severity} />
                          <div className="flag-content">
                            <div style={{ fontSize: 11, color: 'var(--text-accent)', marginBottom: 3, fontWeight: 600 }}>
                              {f.field}
                            </div>
                            {f.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  No metadata available for this document.
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
}

export default function StructuralDNA({ report }) {
  if (!report.document_reports?.length) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
        Layer 1 — Structural DNA Analysis
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
        Analyzes raw PDF content streams for subtle font deviations (0.1–0.8pt), baseline drift, abnormal character spacing, and metadata tampering indicators.
      </p>
      {report.document_reports.map((dr, i) => (
        <DocumentSection key={i} docReport={dr} index={i} />
      ))}
    </div>
  );
}
