import React, { useState } from 'react';
import { getHeatmapUrl } from '../../api/veriflow.js';

export default function ELAViewer({ report }) {
  const [selected, setSelected] = useState(0);
  const allELA = [];
  report.document_reports?.forEach(dr => {
    dr.ela_results?.forEach(ela => allELA.push({ ...ela, docName: dr.document_name }));
  });
  if (!allELA.length) return null;

  const cur = allELA[selected];

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="section-title">Error Level Analysis (ELA)</div>
      <div className="panel">
        {allELA.length > 1 && (
          <div style={{ marginBottom: 12, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {allELA.map((e, i) => (
              <button
                key={i}
                className={i === selected ? 'btn btn-primary' : 'btn'}
                style={{ fontSize: 11, padding: '3px 10px' }}
                onClick={() => setSelected(i)}
              >
                {e.docName} - P{e.page}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>ORIGINAL</div>
            <div style={{ border: '1px solid #d1d5db', background: '#f9fafb', minHeight: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {cur?.original_image_path
                ? <img src={getHeatmapUrl(cur.original_image_path)} alt="Original" style={{ maxWidth: '100%', maxHeight: 500 }} />
                : <span style={{ color: '#9ca3af', fontSize: 12 }}>Preview not available</span>
              }
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>ELA HEATMAP</div>
            <div style={{ border: '1px solid #d1d5db', background: '#f9fafb', minHeight: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {cur?.heatmap_path
                ? <img src={getHeatmapUrl(cur.heatmap_path)} alt="Heatmap" style={{ maxWidth: '100%', maxHeight: 500 }} />
                : <span style={{ color: '#9ca3af', fontSize: 12 }}>Heatmap not available</span>
              }
            </div>
          </div>
        </div>

        <table style={{ marginTop: 12, fontSize: 12 }}>
          <tbody>
            <tr>
              <th style={{ width: 160 }}>ELA Score</th>
              <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}
                  className={cur?.verdict === 'clean' ? 'status-pass' : 'status-fail'}>
                {cur?.overall_score?.toFixed(1)}
              </td>
            </tr>
            <tr>
              <th>Suspicious Regions</th>
              <td>{cur?.suspicious_regions?.length || 0}</td>
            </tr>
            <tr>
              <th>Verdict</th>
              <td className={cur?.verdict === 'clean' ? 'status-pass' : cur?.verdict === 'suspicious' ? 'status-warn' : 'status-fail'}
                  style={{ fontWeight: 600 }}>
                {cur?.verdict?.toUpperCase()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
