import React, { useState } from 'react';

function SeverityBadge({ severity }) {
  const cls = `sev-${severity || 'low'}`;
  return <span className={cls}>{(severity || 'low').toUpperCase()}</span>;
}

function DocumentSection({ docReport, index }) {
  const [open, setOpen] = useState(index === 0);
  const sg = docReport.syntax_geometry;
  const chrono = docReport.chronological;

  const anomalies = [
    ...(sg?.font_anomalies || []).map(a => ({ ...a, type: 'Font' })),
    ...(sg?.coordinate_anomalies || []).map(a => ({ ...a, type: 'Coordinate' })),
    ...(sg?.spacing_anomalies || []).map(a => ({ ...a, type: 'Spacing' })),
    ...(chrono?.metadata_flags?.filter(f => f.severity !== 'low') || []).map(f => ({
      severity: f.severity, page: 1, description: f.description, type: 'Metadata',
    })),
  ];

  const verdict = sg?.verdict || chrono?.verdict || 'clean';

  return (
    <div style={{ marginBottom: 12, border: '1px solid #d1d5db', background: '#fff' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: '10px 14px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: 'pointer', background: '#f9fafb', borderBottom: open ? '1px solid #d1d5db' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>
            {index + 1}. {docReport.document_name}
          </span>
          <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>
            {docReport.document_type?.replace('_', ' ')}
          </span>
          <span className={verdict === 'clean' ? 'status-pass' : verdict === 'suspicious' ? 'status-warn' : 'status-fail'}
                style={{ fontSize: 12 }}>
            {verdict.toUpperCase()}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {anomalies.length > 0 && (
            <span style={{ fontSize: 12, color: '#b91c1c', fontWeight: 600 }}>
              {anomalies.length} issue{anomalies.length !== 1 ? 's' : ''}
            </span>
          )}
          <span style={{ fontSize: 12, color: '#9ca3af' }}>{open ? '▼' : '▶'}</span>
        </div>
      </div>

      {open && (
        <div style={{ padding: 14 }}>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {/* Left: Structure */}
            <div style={{ flex: 1, minWidth: 300 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#374151' }}>
                STRUCTURE ANALYSIS
                {sg && (
                  <span style={{ marginLeft: 12, fontWeight: 400, color: '#6b7280' }}>
                    Risk: <span style={{ fontWeight: 600, color: (sg.risk_score || 0) > 25 ? '#b91c1c' : '#15803d' }}>
                      {sg.risk_score || 0}/100
                    </span>
                  </span>
                )}
              </div>

              {sg?.fonts_detected?.length > 0 && (
                <div style={{ marginBottom: 10, fontSize: 12, color: '#6b7280' }}>
                  Fonts: {sg.fonts_detected.slice(0, 5).map(f => f.name).join(', ')}
                </div>
              )}

              {anomalies.filter(a => a.type !== 'Metadata').length > 0 ? (
                <table style={{ fontSize: 12 }}>
                  <thead>
                    <tr><th>Severity</th><th>Type</th><th>Page</th><th>Description</th></tr>
                  </thead>
                  <tbody>
                    {anomalies.filter(a => a.type !== 'Metadata').map((a, i) => (
                      <tr key={i}>
                        <td><SeverityBadge severity={a.severity} /></td>
                        <td>{a.type}</td>
                        <td>{a.page}</td>
                        <td>{a.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 12, color: '#15803d' }}>
                  No structural anomalies detected.
                </div>
              )}
            </div>

            {/* Right: Metadata */}
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#374151' }}>
                METADATA FORENSICS
                {chrono && (
                  <span style={{ marginLeft: 12 }} className={chrono.verdict === 'clean' ? 'status-pass' : 'status-fail'}>
                    {chrono.verdict?.toUpperCase()}
                  </span>
                )}
              </div>

              {chrono ? (
                <>
                  <table style={{ fontSize: 12, marginBottom: 8 }}>
                    <tbody>
                      <tr><th>Created</th><td>{chrono.creation_date || 'N/A'}</td></tr>
                      <tr><th>Modified</th><td>{chrono.modification_date || 'N/A'}</td></tr>
                      <tr><th>Producer</th><td>{chrono.producer || 'N/A'}</td></tr>
                      <tr>
                        <th>Timezone</th>
                        <td className={chrono.timezone_valid === false ? 'status-fail' : chrono.timezone_valid === true ? 'status-pass' : ''}>
                          {chrono.timezone_found || 'N/A'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  {anomalies.filter(a => a.type === 'Metadata').length > 0 && (
                    <table style={{ fontSize: 12 }}>
                      <thead><tr><th>Severity</th><th>Issue</th></tr></thead>
                      <tbody>
                        {anomalies.filter(a => a.type === 'Metadata').map((a, i) => (
                          <tr key={i}>
                            <td><SeverityBadge severity={a.severity} /></td>
                            <td>{a.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              ) : (
                <div style={{ color: '#9ca3af', fontSize: 12 }}>No metadata extracted.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StructuralDNA({ report }) {
  if (!report.document_reports?.length) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <div className="section-title">Document Structure Analysis</div>
      {report.document_reports.map((dr, i) => (
        <DocumentSection key={i} docReport={dr} index={i} />
      ))}
    </div>
  );
}
