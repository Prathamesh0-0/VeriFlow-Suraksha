import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dna, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, FileText, Type, Ruler, Space } from 'lucide-react';

const severityColors = {
  critical: 'accent-red',
  high: 'accent-amber',
  medium: 'accent-purple',
  low: 'text-muted',
};

function VerdictBadge({ verdict }) {
  const cls = verdict === 'clean' ? 'badge-clean' : verdict === 'suspicious' ? 'badge-suspicious' : 'badge-tampered';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${cls}`}>
      {verdict?.toUpperCase()}
    </span>
  );
}

function AnomalyRow({ anomaly, type }) {
  const color = severityColors[anomaly.severity] || 'text-muted';
  const icon = type === 'font' ? Type : type === 'coordinate' ? Ruler : Space;
  const Icon = icon;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-800/30 border border-surface-700/20">
      <div className={`mt-0.5 text-${color}`}>
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-mono px-1.5 py-0.5 rounded bg-${color}/10 text-${color}`}>
            {anomaly.severity?.toUpperCase()}
          </span>
          <span className="text-xs text-text-muted">Page {anomaly.page}</span>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">{anomaly.description}</p>
      </div>
    </div>
  );
}

function DocumentSection({ docReport }) {
  const [expanded, setExpanded] = useState(true);
  const sg = docReport.syntax_geometry;
  const chrono = docReport.chronological;

  const totalAnomalies =
    (sg?.font_anomalies?.length || 0) +
    (sg?.coordinate_anomalies?.length || 0) +
    (sg?.spacing_anomalies?.length || 0) +
    (chrono?.metadata_flags?.filter(f => f.severity !== 'low')?.length || 0);

  return (
    <div className="glass-panel-light overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-700/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <FileText size={16} className="text-accent-cyan" />
          <span className="text-sm font-medium text-text-primary">{docReport.document_name}</span>
          <span className="text-xs font-mono text-text-muted px-2 py-0.5 rounded bg-surface-700/30">
            {docReport.document_type?.replace('_', ' ')}
          </span>
          {sg && <VerdictBadge verdict={sg.verdict} />}
        </div>
        <div className="flex items-center gap-3">
          {totalAnomalies > 0 && (
            <span className="text-xs font-mono text-accent-amber">
              {totalAnomalies} anomal{totalAnomalies === 1 ? 'y' : 'ies'}
            </span>
          )}
          {expanded ? <ChevronDown size={16} className="text-text-muted" /> : <ChevronRight size={16} className="text-text-muted" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 pb-4 space-y-4"
          >
            {/* Syntax Geometry Results */}
            {sg && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono text-text-muted tracking-wider">SYNTAX GEOMETRY</h4>
                  <span className="text-xs font-mono text-text-muted">
                    Score: <span className={sg.risk_score > 25 ? 'text-accent-red' : 'text-accent-emerald'}>{sg.risk_score}</span>/100
                  </span>
                </div>

                {/* Font stats */}
                {sg.fonts_detected?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {sg.fonts_detected.slice(0, 6).map((f, i) => (
                      <span key={i} className="text-xs font-mono px-2 py-1 rounded bg-surface-700/30 text-text-secondary">
                        {f.name} <span className="text-text-muted">×{f.pages_used || f.usage_count}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Anomalies */}
                <div className="space-y-2">
                  {sg.font_anomalies?.map((a, i) => <AnomalyRow key={`f-${i}`} anomaly={a} type="font" />)}
                  {sg.coordinate_anomalies?.map((a, i) => <AnomalyRow key={`c-${i}`} anomaly={a} type="coordinate" />)}
                  {sg.spacing_anomalies?.map((a, i) => <AnomalyRow key={`s-${i}`} anomaly={a} type="spacing" />)}
                </div>

                {totalAnomalies === 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-accent-emerald/5">
                    <CheckCircle2 size={14} className="text-accent-emerald" />
                    <span className="text-xs text-accent-emerald">No structural anomalies detected</span>
                  </div>
                )}
              </div>
            )}

            {/* Chronological Results */}
            {chrono && (
              <div className="space-y-2 pt-3 border-t border-surface-700/30">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono text-text-muted tracking-wider">CHRONOLOGICAL FORENSICS</h4>
                  <VerdictBadge verdict={chrono.verdict} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Created', value: chrono.creation_date || 'N/A' },
                    { label: 'Modified', value: chrono.modification_date || 'N/A' },
                    { label: 'Producer', value: chrono.producer || 'N/A' },
                    { label: 'Timezone', value: chrono.timezone_found || 'N/A', ok: chrono.timezone_valid },
                  ].map((item, i) => (
                    <div key={i} className="p-2 rounded-lg bg-surface-800/30">
                      <span className="text-[10px] text-text-muted">{item.label}</span>
                      <p className={`text-xs font-mono ${
                        item.ok === false ? 'text-accent-red' :
                        item.ok === true ? 'text-accent-emerald' : 'text-text-secondary'
                      } truncate`}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                {chrono.metadata_flags?.filter(f => f.severity !== 'low').map((flag, i) => (
                  <AnomalyRow key={`mf-${i}`} anomaly={{ ...flag, page: 1 }} type="font" />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function StructuralDNA({ report }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Dna size={18} className="text-accent-cyan" />
        <h2 className="text-lg font-bold text-text-primary">Layer 1: Structural DNA Analysis</h2>
      </div>

      <div className="space-y-3">
        {report.document_reports?.map((dr, i) => (
          <DocumentSection key={i} docReport={dr} />
        ))}
      </div>
    </div>
  );
}
