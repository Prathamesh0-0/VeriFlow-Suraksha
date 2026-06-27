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
      
      {/* SCREEN UI - Interactive Tabs */}
      <div className="panel hide-on-print">
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
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>ORIGINAL</div>
            <div style={{ border: '1px solid var(--border-color)', background: 'var(--bg-section)', minHeight: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius)' }}>
              {cur?.original_image_path
                ? <img src={getHeatmapUrl(cur.original_image_path)} alt="Original" style={{ maxWidth: '100%', maxHeight: 500 }} />
                : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Preview not available</span>
              }
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>ELA HEATMAP</div>
            <div style={{ border: '1px solid var(--border-color)', background: 'var(--bg-section)', minHeight: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius)' }}>
              {cur?.heatmap_path
                ? <img src={getHeatmapUrl(cur.heatmap_path)} alt="Heatmap" style={{ maxWidth: '100%', maxHeight: 500 }} />
                : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Heatmap not available</span>
              }
            </div>
          </div>
        </div>

        <table className="data-table" style={{ marginTop: 12 }}>
          <tbody>
            <tr>
              <td style={{ width: 160, fontWeight: 500, color: 'var(--text-secondary)' }}>ELA Score</td>
              <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}
                  className={cur?.verdict === 'clean' ? 'status-pass' : 'status-fail'}>
                {cur?.overall_score?.toFixed(1)}
              </td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Suspicious Regions</td>
              <td>{cur?.suspicious_regions?.length || 0}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Verdict</td>
              <td className={cur?.verdict === 'clean' ? 'status-pass' : cur?.verdict === 'suspicious' ? 'status-warn' : 'status-fail'}
                  style={{ fontWeight: 600 }}>
                {cur?.verdict?.toUpperCase()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* PRINT UI - Shows ALL Heatmaps */}
      <div className="print-only">
        {allELA.map((ela, i) => (
          <div key={i} className="panel" style={{ marginBottom: 20, pageBreakInside: 'avoid' }}>
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>
              {ela.docName} (Page {ela.page})
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
               <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4, color: '#555' }}>ORIGINAL</div>
                  {ela.original_image_path ? (
                    <img src={getHeatmapUrl(ela.original_image_path)} style={{ maxWidth: '100%', maxHeight: 350, border: '1px solid #ccc' }} />
                  ) : <div style={{ color: '#999', fontSize: 10 }}>N/A</div>}
               </div>
               <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4, color: '#555' }}>ELA HEATMAP</div>
                  {ela.heatmap_path ? (
                    <img src={getHeatmapUrl(ela.heatmap_path)} style={{ maxWidth: '100%', maxHeight: 350, border: '1px solid #ccc' }} />
                  ) : <div style={{ color: '#999', fontSize: 10 }}>N/A</div>}
               </div>
            </div>
            <div style={{ fontSize: 12 }}>
              <strong>Score:</strong> {ela.overall_score?.toFixed(1)} | <strong>Suspicious Regions:</strong> {ela.suspicious_regions?.length || 0} | <strong>Verdict:</strong> {ela.verdict?.toUpperCase()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
