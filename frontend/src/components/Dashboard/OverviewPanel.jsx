import React from 'react';
import { motion } from 'framer-motion';
import { FileText, AlertTriangle, Clock, Shield } from 'lucide-react';

export default function OverviewPanel({ report }) {
  const flags = report.flags_count || {};
  const totalFlags = (flags.critical || 0) + (flags.high || 0) + (flags.medium || 0) + (flags.low || 0);

  const cards = [
    {
      label: 'Documents Analyzed',
      value: report.total_documents,
      icon: FileText,
      color: 'accent-cyan',
      bg: 'rgba(6, 182, 212, 0.1)',
    },
    {
      label: 'Anomalies Found',
      value: totalFlags,
      icon: AlertTriangle,
      color: totalFlags > 0 ? 'accent-red' : 'accent-emerald',
      bg: totalFlags > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
    },
    {
      label: 'Processing Time',
      value: `${report.processing_time_seconds}s`,
      icon: Clock,
      color: 'accent-purple',
      bg: 'rgba(139, 92, 246, 0.1)',
    },
    {
      label: 'Verdict',
      value: report.overall_verdict?.toUpperCase() || 'N/A',
      icon: Shield,
      color: report.overall_verdict === 'clean' ? 'accent-emerald' :
             report.overall_verdict === 'suspicious' ? 'accent-amber' : 'accent-red',
      bg: report.overall_verdict === 'clean' ? 'rgba(16, 185, 129, 0.1)' :
          report.overall_verdict === 'suspicious' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
    },
  ];

  return (
    <div className="glass-panel p-6 space-y-4">
      <h3 className="text-xs font-mono text-text-muted tracking-wider">ANALYSIS OVERVIEW</h3>

      <div className="grid grid-cols-2 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="p-4 rounded-xl"
            style={{ backgroundColor: card.bg }}
          >
            <div className="flex items-center gap-2 mb-2">
              <card.icon size={14} className={`text-${card.color}`} />
              <span className="text-xs text-text-muted">{card.label}</span>
            </div>
            <p className={`text-2xl font-bold font-mono text-${card.color}`}>
              {card.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Flag breakdown */}
      {totalFlags > 0 && (
        <div className="flex items-center gap-4 pt-2 border-t border-surface-700/30">
          <span className="text-xs text-text-muted">Flags:</span>
          {flags.critical > 0 && (
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-accent-red/15 text-accent-red">
              {flags.critical} CRITICAL
            </span>
          )}
          {flags.high > 0 && (
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-accent-amber/15 text-accent-amber">
              {flags.high} HIGH
            </span>
          )}
          {flags.medium > 0 && (
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-accent-purple/15 text-accent-purple">
              {flags.medium} MEDIUM
            </span>
          )}
          {flags.low > 0 && (
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-600/30 text-text-muted">
              {flags.low} LOW
            </span>
          )}
        </div>
      )}
    </div>
  );
}
