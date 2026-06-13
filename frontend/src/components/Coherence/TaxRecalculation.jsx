import React from 'react';

function fmt(val) {
  if (val == null) return '—';
  return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function TaxRecalculation({ taxResult }) {
  if (!taxResult) return null;
  const recalc = taxResult.recalculated;

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="section-title">Tax & Deduction Verification</div>
      <div className="panel">
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {/* Stated */}
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>STATED ON DOCUMENT</div>
            <table style={{ fontSize: 12 }}>
              <tbody>
                <tr><th>Gross Monthly</th><td>{fmt(taxResult.stated_gross_monthly)}</td></tr>
                <tr>
                  <th>TDS Deducted</th>
                  <td className={taxResult.tds_valid === false ? 'status-fail' : 'status-pass'}>
                    {fmt(taxResult.stated_tds)}
                    {taxResult.tds_valid === false && ' ✗'}
                    {taxResult.tds_valid === true && ' ✓'}
                  </td>
                </tr>
                <tr>
                  <th>PF Deducted</th>
                  <td className={taxResult.pf_valid === false ? 'status-fail' : 'status-pass'}>
                    {fmt(taxResult.stated_pf)}
                    {taxResult.pf_valid === false && ' ✗'}
                    {taxResult.pf_valid === true && ' ✓'}
                  </td>
                </tr>
                <tr><th>Net Pay</th><td>{fmt(taxResult.stated_net)}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Recalculated */}
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>VERIFLOW RECALCULATED</div>
            {recalc ? (
              <table style={{ fontSize: 12 }}>
                <tbody>
                  <tr><th>Gross Annual</th><td>{fmt(recalc.gross_annual)}</td></tr>
                  <tr><th>Standard Deduction</th><td>{fmt(recalc.standard_deduction)}</td></tr>
                  <tr><th>Taxable Income</th><td>{fmt(recalc.taxable_income)}</td></tr>
                  <tr><th>Tax (before cess)</th><td>{fmt(recalc.tax_before_cess)}</td></tr>
                  <tr><th>Cess (4%)</th><td>{fmt(recalc.cess)}</td></tr>
                  <tr><th>Total Annual Tax</th><td>{fmt(recalc.total_tax)}</td></tr>
                  <tr style={{ background: '#eff6ff' }}>
                    <th style={{ fontWeight: 700 }}>Expected Monthly TDS</th>
                    <td style={{ fontWeight: 700 }}>{fmt(recalc.monthly_tds)}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <div style={{ color: '#9ca3af', fontSize: 12 }}>Not available</div>
            )}
          </div>
        </div>

        {/* Deviation */}
        <table style={{ fontSize: 12, marginTop: 16 }}>
          <thead><tr><th>Check</th><th>Deviation</th><th>Tolerance</th><th>Result</th></tr></thead>
          <tbody>
            <tr>
              <td>TDS Validation</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>
                {taxResult.tds_deviation_pct != null ? `${taxResult.tds_deviation_pct.toFixed(1)}%` : 'N/A'}
              </td>
              <td>±2%</td>
              <td className={taxResult.tds_valid ? 'status-pass' : 'status-fail'}>
                {taxResult.tds_valid ? 'PASS' : 'FAIL'}
              </td>
            </tr>
            <tr>
              <td>PF Validation</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>
                {taxResult.pf_deviation_pct != null ? `${taxResult.pf_deviation_pct.toFixed(1)}%` : 'N/A'}
              </td>
              <td>±2% (12% of Basic)</td>
              <td className={taxResult.pf_valid ? 'status-pass' : 'status-fail'}>
                {taxResult.pf_valid ? 'PASS' : 'FAIL'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Log */}
        {taxResult.notes?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>CALCULATION LOG</div>
            <pre style={{
              padding: 10, background: '#f9fafb', border: '1px solid #d1d5db',
              fontSize: 11, fontFamily: 'var(--font-mono)', maxHeight: 200,
              overflow: 'auto', whiteSpace: 'pre-wrap', margin: 0,
            }}>
              {taxResult.notes.join('\n')}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
