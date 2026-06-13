import React from 'react';

export default function OverviewPanel({ report }) {
  const flags = report.flags_count || {};
  const totalFlags = (flags.critical || 0) + (flags.high || 0) + (flags.medium || 0) + (flags.low || 0);

  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <div className="section-title">Summary</div>
      <table>
        <tbody>
          <tr>
            <th style={{ width: 200 }}>Reference ID</th>
            <td style={{ fontFamily: 'var(--font-mono)' }}>{report.packet_id}</td>
          </tr>
          <tr>
            <th>Documents Analyzed</th>
            <td>{report.total_documents}</td>
          </tr>
          <tr>
            <th>Processing Time</th>
            <td>{report.processing_time_seconds}s</td>
          </tr>
          <tr>
            <th>Total Anomalies</th>
            <td className={totalFlags > 0 ? 'status-fail' : 'status-pass'}>
              {totalFlags}
              {totalFlags > 0 && (
                <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 8, fontSize: 12 }}>
                  ({flags.critical || 0} critical, {flags.high || 0} high, {flags.medium || 0} medium, {flags.low || 0} low)
                </span>
              )}
            </td>
          </tr>
          <tr>
            <th>System Verdict</th>
            <td className={
              report.overall_verdict === 'clean' ? 'status-pass' :
              report.overall_verdict === 'suspicious' ? 'status-warn' : 'status-fail'
            } style={{ fontSize: 15 }}>
              {report.overall_verdict?.toUpperCase()}
            </td>
          </tr>
          <tr>
            <th>Risk Score</th>
            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700 }}>
              <span className={
                report.overall_risk_score < 25 ? 'status-pass' :
                report.overall_risk_score < 60 ? 'status-warn' : 'status-fail'
              }>{Math.round(report.overall_risk_score)}</span>
              <span style={{ color: '#9ca3af', fontSize: 13, fontWeight: 400 }}> / 100</span>
            </td>
          </tr>
        </tbody>
      </table>
      {report.summary && (
        <div style={{ marginTop: 12, padding: 10, background: '#f9fafb', border: '1px solid #d1d5db', fontSize: 13 }}>
          {report.summary}
        </div>
      )}
    </div>
  );
}
