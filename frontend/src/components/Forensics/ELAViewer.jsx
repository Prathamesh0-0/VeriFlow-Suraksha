import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Scan, Eye, ZoomIn, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getHeatmapUrl } from '../../api/veriflow.js';

export default function ELAViewer({ report }) {
  const [selectedPage, setSelectedPage] = useState(0);

  // Collect all ELA results across documents
  const allELA = [];
  report.document_reports?.forEach((dr) => {
    dr.ela_results?.forEach((ela) => {
      allELA.push({ ...ela, docName: dr.document_name });
    });
  });

  if (allELA.length === 0) {
    return null;
  }

  const current = allELA[selectedPage];
  const verdictColor = current?.verdict === 'clean' ? 'accent-emerald' :
                       current?.verdict === 'suspicious' ? 'accent-amber' : 'accent-red';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Scan size={18} className="text-accent-purple" />
        <h2 className="text-lg font-bold text-text-primary">Layer 1: Error Level Analysis</h2>
      </div>

      <div className="glass-panel p-6 space-y-4">
        {/* Page selector */}
        {allELA.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {allELA.map((ela, i) => (
              <button
                key={i}
                onClick={() => setSelectedPage(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all
                  ${i === selectedPage
                    ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/30'
                    : 'bg-surface-700/30 text-text-muted hover:text-text-secondary border border-transparent'
                  }`}
              >
                {ela.docName} - P{ela.page}
              </button>
            ))}
          </div>
        )}

        {/* ELA Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Original Image */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Eye size={14} className="text-text-muted" />
              <span className="text-xs font-mono text-text-muted">ORIGINAL DOCUMENT</span>
            </div>
            <div className="relative rounded-xl overflow-hidden bg-surface-700/20 border border-surface-700/30 min-h-[300px] flex items-center justify-center">
              {current?.original_image_path ? (
                <img
                  src={getHeatmapUrl(current.original_image_path)}
                  alt="Original document"
                  className="w-full h-auto"
                />
              ) : (
                <div className="text-center p-8">
                  <Eye size={32} className="mx-auto text-text-muted/30 mb-2" />
                  <p className="text-xs text-text-muted">Original preview not available</p>
                </div>
              )}
            </div>
          </div>

          {/* ELA Heatmap */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ZoomIn size={14} className="text-accent-purple" />
              <span className="text-xs font-mono text-accent-purple">ELA HEATMAP OVERLAY</span>
            </div>
            <div className="relative rounded-xl overflow-hidden bg-surface-700/20 border border-surface-700/30 min-h-[300px] flex items-center justify-center">
              {current?.heatmap_path ? (
                <img
                  src={getHeatmapUrl(current.heatmap_path)}
                  alt="ELA heatmap"
                  className="w-full h-auto"
                />
              ) : (
                <div className="text-center p-8">
                  <Scan size={32} className="mx-auto text-accent-purple/30 mb-2" />
                  <p className="text-xs text-text-muted">Heatmap generated during analysis</p>
                  <p className="text-[10px] text-text-muted mt-1">Brighter regions indicate compression inconsistencies</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Score and Suspicious Regions */}
        <div className="flex items-center justify-between pt-4 border-t border-surface-700/30">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[10px] text-text-muted block">ELA Score</span>
              <span className={`text-xl font-bold font-mono text-${verdictColor}`}>
                {current?.overall_score?.toFixed(1)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-text-muted block">Suspicious Regions</span>
              <span className="text-xl font-bold font-mono text-text-primary">
                {current?.suspicious_regions?.length || 0}
              </span>
            </div>
          </div>

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
            current?.verdict === 'clean' ? 'badge-clean' :
            current?.verdict === 'suspicious' ? 'badge-suspicious' : 'badge-tampered'
          }`}>
            {current?.verdict === 'clean'
              ? <CheckCircle2 size={14} />
              : <AlertTriangle size={14} />
            }
            <span className="text-xs font-mono font-bold">
              {current?.verdict?.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Suspicious Region Details */}
        {current?.suspicious_regions?.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-mono text-text-muted tracking-wider">DETECTED REGIONS</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {current.suspicious_regions.map((region, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-lg border ${
                    region.severity === 'high' ? 'bg-accent-red/5 border-accent-red/20' :
                    region.severity === 'medium' ? 'bg-accent-amber/5 border-accent-amber/20' :
                    'bg-surface-700/20 border-surface-700/30'
                  }`}
                >
                  <span className="text-[10px] text-text-muted">Block [{region.block_row},{region.block_col}]</span>
                  <p className="text-xs font-mono text-text-primary">
                    Intensity: {region.mean_intensity?.toFixed(1)}
                  </p>
                  <p className="text-[10px] text-text-muted">
                    {region.ratio?.toFixed(1)}× average
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
