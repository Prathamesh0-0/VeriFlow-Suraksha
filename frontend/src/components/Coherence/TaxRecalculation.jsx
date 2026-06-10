import React from 'react';
import { motion } from 'framer-motion';
import { Calculator, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

function formatCurrency(val) {
  if (val == null) return '—';
  return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function TaxRecalculation({ taxResult }) {
  if (!taxResult) return null;

  const recalc = taxResult.recalculated;
  const tdsMatch = taxResult.tds_valid;
  const pfMatch = taxResult.pf_valid;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calculator size={18} className="text-accent-amber" />
        <h2 className="text-lg font-bold text-text-primary">Layer 2: TDS & PF Recalculation</h2>
      </div>

      <div className="glass-panel p-6 space-y-6">
        {/* Side by side comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stated Values */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono text-text-muted tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-cyan" />
              STATED ON DOCUMENT
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Gross Monthly Salary', value: formatCurrency(taxResult.stated_gross_monthly) },
                { label: 'TDS Deducted', value: formatCurrency(taxResult.stated_tds), ok: tdsMatch },
                { label: 'PF Deducted', value: formatCurrency(taxResult.stated_pf), ok: pfMatch },
                { label: 'Net Pay', value: formatCurrency(taxResult.stated_net) },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-surface-800/30">
                  <span className="text-xs text-text-secondary">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-text-primary">{item.value}</span>
                    {item.ok === false && <XCircle size={14} className="text-accent-red" />}
                    {item.ok === true && <CheckCircle2 size={14} className="text-accent-emerald" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recalculated Values */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono text-accent-emerald tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-emerald" />
              VERIFLOW RECALCULATED
            </h3>
            {recalc ? (
              <div className="space-y-2">
                {[
                  { label: 'Gross Annual', value: formatCurrency(recalc.gross_annual) },
                  { label: 'Standard Deduction', value: formatCurrency(recalc.standard_deduction) },
                  { label: 'Taxable Income', value: formatCurrency(recalc.taxable_income) },
                  { label: 'Tax (before cess)', value: formatCurrency(recalc.tax_before_cess) },
                  { label: 'Health & Edu Cess (4%)', value: formatCurrency(recalc.cess) },
                  { label: 'Total Annual Tax', value: formatCurrency(recalc.total_tax) },
                  { label: 'Expected Monthly TDS', value: formatCurrency(recalc.monthly_tds), highlight: true },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      item.highlight ? 'bg-accent-emerald/10 border border-accent-emerald/20' : 'bg-surface-800/30'
                    }`}
                  >
                    <span className={`text-xs ${item.highlight ? 'text-accent-emerald font-medium' : 'text-text-secondary'}`}>
                      {item.label}
                    </span>
                    <span className={`text-sm font-mono font-bold ${
                      item.highlight ? 'text-accent-emerald' : 'text-text-primary'
                    }`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-text-muted text-xs">
                Tax recalculation not available
              </div>
            )}
          </div>
        </div>

        {/* Deviation Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-surface-700/30">
          {/* TDS Deviation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-4 rounded-xl ${
              tdsMatch ? 'bg-accent-emerald/5 border border-accent-emerald/20' : 'bg-accent-red/5 border border-accent-red/20'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-text-primary">TDS Validation</span>
              {tdsMatch
                ? <CheckCircle2 size={18} className="text-accent-emerald" />
                : <XCircle size={18} className="text-accent-red" />
              }
            </div>
            {taxResult.tds_deviation_pct != null ? (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Deviation</span>
                  <span className={`font-mono font-bold ${tdsMatch ? 'text-accent-emerald' : 'text-accent-red'}`}>
                    {taxResult.tds_deviation_pct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-surface-700/30 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${tdsMatch ? 'bg-accent-emerald' : 'bg-accent-red'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, taxResult.tds_deviation_pct * 2)}%` }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                  />
                </div>
                <p className="text-[10px] text-text-muted">Tolerance: ±2%</p>
              </div>
            ) : (
              <p className="text-xs text-text-muted">Not enough data</p>
            )}
          </motion.div>

          {/* PF Deviation */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-4 rounded-xl ${
              pfMatch ? 'bg-accent-emerald/5 border border-accent-emerald/20' : 'bg-accent-red/5 border border-accent-red/20'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-text-primary">PF Validation</span>
              {pfMatch
                ? <CheckCircle2 size={18} className="text-accent-emerald" />
                : <XCircle size={18} className="text-accent-red" />
              }
            </div>
            {taxResult.pf_deviation_pct != null ? (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Deviation</span>
                  <span className={`font-mono font-bold ${pfMatch ? 'text-accent-emerald' : 'text-accent-red'}`}>
                    {taxResult.pf_deviation_pct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-surface-700/30 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${pfMatch ? 'bg-accent-emerald' : 'bg-accent-red'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, taxResult.pf_deviation_pct * 2)}%` }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                  />
                </div>
                <p className="text-[10px] text-text-muted">Tolerance: ±2% | Rate: 12% of Basic</p>
              </div>
            ) : (
              <p className="text-xs text-text-muted">Not enough data</p>
            )}
          </motion.div>
        </div>

        {/* Notes */}
        {taxResult.notes?.length > 0 && (
          <div className="space-y-1 pt-4 border-t border-surface-700/30">
            <span className="text-xs font-mono text-text-muted tracking-wider">CALCULATION LOG</span>
            <div className="p-3 rounded-lg bg-surface-800/30 font-mono text-xs text-text-secondary space-y-0.5 max-h-40 overflow-y-auto">
              {taxResult.notes.map((note, i) => (
                <p key={i} className={note.startsWith('⚠') ? 'text-accent-red' : note.startsWith('✓') ? 'text-accent-emerald' : ''}>
                  {note}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
