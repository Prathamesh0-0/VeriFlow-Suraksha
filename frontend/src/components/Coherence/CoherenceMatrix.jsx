import React from 'react';

const DOC_LABELS = {
  salary_slip: 'Salary Slip',
  bank_statement: 'Bank Statement',
  itr_form: 'IT Return',
  land_record: 'Land Record',
  employment_verification: 'Employment Letter',
  loan_application: 'Loan Application',
  unknown: 'Unknown',
};

const SEV_ICONS = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🔵',
};

export default function CoherenceMatrix({ coherence, documentReports }) {
  if (!coherence) return null;

  const checks = [
    {
      label: 'Applicant Name Consistency',
      desc: 'Same name across all submitted documents',
      pass: coherence.name_consistency,
    },
    {
      label: 'Salary vs Bank Statement',
      desc: 'Net pay on salary slip matches bank salary credit',
      pass: coherence.salary_bank_match,
    },
    {
      label: 'Salary vs Tax Return',
      desc: 'Salary income matches ITR filing',
      pass: coherence.salary_itr_match,
    },
  ];

  const contradictions = coherence.contradictions || [];
  const riskCls = coherence.risk_score >= 60 ? 'tampered' : coherence.risk_score >= 25 ? 'suspicious' : 'clean';
  const riskColor = coherence.risk_score >= 60 ? 'var(--risk-danger)' : coherence.risk_score >= 25 ? 'var(--risk-warn)' : 'var(--risk-clean)';

  return (
    <div className="panel" style={{ marginBottom: 20 }}>
      <div className="panel-title">
        🔗 Layer 2 — Cross-Document Coherence Engine
        <span style={{
          marginLeft: 'auto',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 700,
          color: riskColor,
        }}>
          Risk: {coherence.risk_score}/100
        </span>
      </div>

      {/* Quick Checks Table */}
      <div style={{ marginBottom: 20 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Coherence Check</th>
              <th>Description</th>
              <th style={{ width: 80 }}>Result</th>
            </tr>
          </thead>
          <tbody>
            {checks.map((c, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{c.label}</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{c.desc}</td>
                <td>
                  <span className={c.pass ? 'status-pass' : 'status-fail'}>
                    {c.pass ? '✓ PASS' : '✗ FAIL'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Contradictions */}
      {contradictions.length > 0 ? (
        <div>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            color: 'var(--risk-danger)',
            marginBottom: 12,
          }}>
            ⚠ {contradictions.length} Contradiction{contradictions.length > 1 ? 's' : ''} Detected
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {contradictions.map((c, i) => (
              <div key={i} className={`contradiction-card ${c.severity || 'low'}`}>
                <div className="contradiction-header">
                  <span style={{ fontSize: 14 }}>{SEV_ICONS[c.severity] || '⚪'}</span>
                  <span className={`flag-badge ${c.severity || 'low'}`}>
                    {(c.severity || 'low').toUpperCase()}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {c.relationship}
                  </span>
                </div>
                <div className="contradiction-desc">{c.description}</div>
                <div className="contradiction-values">
                  <span>
                    Doc A: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {c.field_a?.source_document}
                    </span>
                    {' → '}
                    <span className="val-expected">
                      {c.field_a?.numeric_value != null
                        ? `₹${c.field_a.numeric_value.toLocaleString('en-IN')}`
                        : c.field_a?.value || 'N/A'}
                    </span>
                  </span>
                  <span>
                    Doc B: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {c.field_b?.source_document}
                    </span>
                    {' → '}
                    <span className="val-actual">
                      {c.field_b?.numeric_value != null
                        ? `₹${c.field_b.numeric_value.toLocaleString('en-IN')}`
                        : c.field_b?.value || 'N/A'}
                    </span>
                  </span>
                  {c.actual_deviation && (
                    <span style={{ color: 'var(--risk-danger)' }}>
                      Deviation: {c.actual_deviation}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="alert alert-success">
          ✓ All cross-document coherence checks passed. Names, salaries, and financial figures are consistent across submitted documents.
        </div>
      )}

      {/* Documents compared */}
      <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text-muted)' }}>
        Documents compared: {coherence.documents_compared?.join(' · ')}
      </div>
    </div>
  );
}
