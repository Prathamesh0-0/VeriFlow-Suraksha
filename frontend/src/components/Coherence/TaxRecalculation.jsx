import React from 'react';

function fmt(val) {
  if (val == null) return '—';
  return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtPct(val) {
  if (val == null) return 'N/A';
  return `${val.toFixed(1)}%`;
}

export default function TaxRecalculation({ taxResult }) {
  if (!taxResult) return null;
  const recalc = taxResult.recalculated;
  const isClean = taxResult.tds_valid && taxResult.pf_valid;
  const riskColor = taxResult.risk_score >= 60 ? 'var(--risk-danger)' :
                    taxResult.risk_score >= 25 ? 'var(--risk-warn)' : 'var(--risk-clean)';

  return (
    <div className="panel" style={{ marginBottom: 20 }}>
      <div className="panel-title">
        🧮 Layer 2 — Indian Tax Logic Engine
        <span style={{
          marginLeft: 'auto',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 700,
          color: riskColor,
        }}>
          Risk: {taxResult.risk_score}/100
        </span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
        Independently recalculates expected TDS and PF using FY 2024-25 New Tax Regime slabs.
        Detects forged deduction figures that don't match the stated salary.
      </p>

      {/* Two Column Comparison */}
      <div className="tax-comparison">
        {/* Stated Values */}
        <div className="tax-col">
          <div className="tax-col-title">Stated on Document</div>
          <div className="tax-row">
            <span className="key">Gross Monthly</span>
            <span className="val">{fmt(taxResult.stated_gross_monthly)}</span>
          </div>
          <div className="tax-row">
            <span className="key">TDS Deducted</span>
            <span className={`val ${taxResult.tds_valid === false ? 'mismatch' : 'match'}`}>
              {fmt(taxResult.stated_tds)}
              {taxResult.stated_tds != null && (taxResult.tds_valid ? ' ✓' : ' ✗')}
            </span>
          </div>
          <div className="tax-row">
            <span className="key">PF Deducted</span>
            <span className={`val ${taxResult.pf_valid === false ? 'mismatch' : 'match'}`}>
              {fmt(taxResult.stated_pf)}
              {taxResult.stated_pf != null && (taxResult.pf_valid ? ' ✓' : ' ✗')}
            </span>
          </div>
          <div className="tax-row">
            <span className="key">Net Pay</span>
            <span className="val">{fmt(taxResult.stated_net)}</span>
          </div>
        </div>

        {/* Recalculated Values */}
        <div className="tax-col">
          <div className="tax-col-title">VeriFlow Recalculated (FY 2024-25)</div>
          {recalc ? (
            <>
              <div className="tax-row">
                <span className="key">Gross Annual</span>
                <span className="val">{fmt(recalc.gross_annual)}</span>
              </div>
              <div className="tax-row">
                <span className="key">Std Deduction</span>
                <span className="val">{fmt(recalc.standard_deduction)}</span>
              </div>
              <div className="tax-row">
                <span className="key">Taxable Income</span>
                <span className="val">{fmt(recalc.taxable_income)}</span>
              </div>
              <div className="tax-row">
                <span className="key">Tax + 4% Cess</span>
                <span className="val">{fmt(recalc.total_tax)}</span>
              </div>
              <div className="tax-row" style={{ borderTop: '1px solid var(--border-hover)', paddingTop: 6, marginTop: 4 }}>
                <span className="key" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Expected Monthly TDS</span>
                <span className={`val ${taxResult.tds_valid === false ? 'mismatch' : 'match'}`} style={{ fontSize: 14 }}>
                  {fmt(recalc.monthly_tds)}
                </span>
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '12px 0' }}>
              Gross salary not extracted — tax recalculation skipped.
            </div>
          )}
        </div>
      </div>

      {/* Deviation Summary */}
      <table className="data-table" style={{ marginBottom: 16 }}>
        <thead>
          <tr>
            <th>Check</th>
            <th>Stated</th>
            <th>Expected</th>
            <th>Deviation</th>
            <th style={{ width: 80 }}>Result</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ fontWeight: 500 }}>TDS Validation</td>
            <td style={{ fontFamily: 'var(--font-mono)' }}>{fmt(taxResult.stated_tds)}</td>
            <td style={{ fontFamily: 'var(--font-mono)' }}>{recalc ? fmt(recalc.monthly_tds) : '—'}</td>
            <td style={{ fontFamily: 'var(--font-mono)', color: taxResult.tds_valid === false ? 'var(--risk-danger)' : 'var(--text-secondary)' }}>
              {fmtPct(taxResult.tds_deviation_pct)}
            </td>
            <td>
              <span className={taxResult.tds_valid ? 'status-pass' : 'status-fail'}>
                {taxResult.tds_valid ? '✓ PASS' : '✗ FAIL'}
              </span>
            </td>
          </tr>
          <tr>
            <td style={{ fontWeight: 500 }}>PF Validation</td>
            <td style={{ fontFamily: 'var(--font-mono)' }}>{fmt(taxResult.stated_pf)}</td>
            <td style={{ fontFamily: 'var(--font-mono)' }}>{fmt(taxResult.expected_pf)}</td>
            <td style={{ fontFamily: 'var(--font-mono)', color: taxResult.pf_valid === false ? 'var(--risk-danger)' : 'var(--text-secondary)' }}>
              {fmtPct(taxResult.pf_deviation_pct)}
            </td>
            <td>
              <span className={taxResult.pf_valid ? 'status-pass' : 'status-fail'}>
                {taxResult.pf_valid ? '✓ PASS' : '✗ FAIL'}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Verdict */}
      {isClean ? (
        <div className="alert alert-success">
          ✓ TDS and PF deductions are within the expected range based on FY 2024-25 New Tax Regime calculations. No mathematical anomalies detected.
        </div>
      ) : (
        <div className="alert alert-danger">
          ✗ Tax deduction mismatches detected. The salary figures on this document produce different tax obligations than what is stated. This is a strong indicator of income fabrication.
        </div>
      )}

      {/* Calculation Log */}
      {taxResult.notes?.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary style={{ fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 0' }}>
            View calculation log ({taxResult.notes.length} entries)
          </summary>
          <pre style={{
            marginTop: 8,
            padding: '12px 14px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius)',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            maxHeight: 200,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
          }}>
            {taxResult.notes.join('\n')}
          </pre>
        </details>
      )}
    </div>
  );
}
