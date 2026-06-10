import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitCompareArrows, CheckCircle2, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';

const FIELD_LABELS = {
  employee_name: 'Employee Name',
  account_holder: 'Account Holder',
  gross_salary: 'Gross Salary',
  basic_pay: 'Basic Pay',
  hra: 'HRA',
  da: 'Dearness Allowance',
  pf_deduction: 'PF Deduction',
  tds: 'TDS',
  professional_tax: 'Professional Tax',
  net_pay: 'Net Pay',
  salary_credit: 'Salary Credit',
  opening_balance: 'Opening Balance',
  closing_balance: 'Closing Balance',
  account_number: 'Account Number',
  ifsc: 'IFSC Code',
  pan: 'PAN',
  gross_total_income: 'Gross Total Income',
  total_deductions: 'Total Deductions',
  taxable_income: 'Taxable Income',
  tds_claimed: 'TDS Claimed',
  assessment_year: 'Assessment Year',
};

const DOC_TYPE_LABELS = {
  salary_slip: 'Salary Slip',
  bank_statement: 'Bank Statement',
  itr_form: 'IT Return',
  land_record: 'Land Record',
  unknown: 'Unknown',
};

function ContradictionCard({ contradiction, index }) {
  const [expanded, setExpanded] = useState(false);
  const color = contradiction.severity === 'critical' ? 'accent-red' :
                contradiction.severity === 'high' ? 'accent-amber' : 'accent-purple';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`glass-panel-light p-4 space-y-3 cursor-pointer border-l-2 border-${color}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <XCircle size={16} className={`text-${color}`} />
          <span className={`text-xs font-mono px-2 py-0.5 rounded bg-${color}/10 text-${color}`}>
            {contradiction.severity?.toUpperCase()}
          </span>
        </div>
        <span className="text-[10px] text-text-muted">#{index + 1}</span>
      </div>

      {/* Field comparison */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[120px]">
          <span className="text-[10px] text-text-muted block">{contradiction.field_a?.source_document}</span>
          <span className="text-xs font-mono text-text-primary">
            {FIELD_LABELS[contradiction.field_a?.field_name] || contradiction.field_a?.field_name}
          </span>
          <span className="text-sm font-mono font-bold text-text-primary block">
            {contradiction.field_a?.numeric_value != null
              ? `₹${contradiction.field_a.numeric_value.toLocaleString('en-IN')}`
              : contradiction.field_a?.value}
          </span>
        </div>

        <div className={`text-${color}`}>
          <ArrowRight size={16} />
        </div>

        <div className="flex-1 min-w-[120px]">
          <span className="text-[10px] text-text-muted block">{contradiction.field_b?.source_document}</span>
          <span className="text-xs font-mono text-text-primary">
            {FIELD_LABELS[contradiction.field_b?.field_name] || contradiction.field_b?.field_name}
          </span>
          <span className="text-sm font-mono font-bold text-text-primary block">
            {contradiction.field_b?.numeric_value != null
              ? `₹${contradiction.field_b.numeric_value.toLocaleString('en-IN')}`
              : contradiction.field_b?.value}
          </span>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="pt-3 border-t border-surface-700/30"
          >
            <p className="text-xs text-text-secondary leading-relaxed">{contradiction.description}</p>
            {contradiction.expected_value && (
              <p className="text-xs text-text-muted mt-2">
                <span className="text-text-secondary">Expected:</span> {contradiction.expected_value}
              </p>
            )}
            {contradiction.actual_deviation && (
              <p className="text-xs text-text-muted">
                <span className="text-text-secondary">Deviation:</span>{' '}
                <span className={`text-${color}`}>{contradiction.actual_deviation}</span>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function CoherenceMatrix({ coherence, documentReports }) {
  if (!coherence) return null;

  const checks = [
    { label: 'Name Consistency', pass: coherence.name_consistency, icon: coherence.name_consistency ? CheckCircle2 : XCircle },
    { label: 'Salary ↔ Bank', pass: coherence.salary_bank_match, icon: coherence.salary_bank_match ? CheckCircle2 : XCircle },
    { label: 'Salary ↔ ITR', pass: coherence.salary_itr_match, icon: coherence.salary_itr_match ? CheckCircle2 : XCircle },
  ];

  // Build cross-reference matrix
  const docs = documentReports?.filter(d => d.extracted_fields?.fields?.length > 0) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <GitCompareArrows size={18} className="text-accent-emerald" />
        <h2 className="text-lg font-bold text-text-primary">Layer 2: Cross-Document Coherence</h2>
      </div>

      <div className="glass-panel p-6 space-y-6">
        {/* Quick checks */}
        <div className="grid grid-cols-3 gap-4">
          {checks.map((check, i) => {
            const Icon = check.icon;
            return (
              <motion.div
                key={check.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.1 }}
                className={`p-4 rounded-xl text-center ${
                  check.pass ? 'bg-accent-emerald/5 border border-accent-emerald/20' : 'bg-accent-red/5 border border-accent-red/20'
                }`}
              >
                <Icon size={24} className={`mx-auto mb-2 ${check.pass ? 'text-accent-emerald' : 'text-accent-red'}`} />
                <p className="text-xs font-medium text-text-primary">{check.label}</p>
                <p className={`text-[10px] font-mono mt-1 ${check.pass ? 'text-accent-emerald' : 'text-accent-red'}`}>
                  {check.pass ? 'PASSED' : 'FAILED'}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Extracted Fields Matrix */}
        {docs.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-mono text-text-muted tracking-wider">EXTRACTED FIELDS BY DOCUMENT</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-surface-700/30">
                    <th className="text-left p-2 text-text-muted font-mono">Field</th>
                    {docs.map((d, i) => (
                      <th key={i} className="text-left p-2 text-text-muted font-mono">
                        {DOC_TYPE_LABELS[d.extracted_fields?.document_type] || d.document_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const allFieldNames = new Set();
                    docs.forEach(d => d.extracted_fields?.fields?.forEach(f => allFieldNames.add(f.field_name)));
                    return [...allFieldNames].map((fieldName) => (
                      <tr key={fieldName} className="border-b border-surface-700/10 hover:bg-surface-700/10">
                        <td className="p-2 font-mono text-text-secondary">
                          {FIELD_LABELS[fieldName] || fieldName}
                        </td>
                        {docs.map((d, di) => {
                          const field = d.extracted_fields?.fields?.find(f => f.field_name === fieldName);
                          return (
                            <td key={di} className="p-2 font-mono text-text-primary">
                              {field ? (
                                field.numeric_value != null
                                  ? `₹${field.numeric_value.toLocaleString('en-IN')}`
                                  : field.value
                              ) : (
                                <span className="text-text-muted/30">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Contradictions */}
        {coherence.contradictions?.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-accent-red" />
              <h3 className="text-xs font-mono text-accent-red tracking-wider">
                {coherence.contradictions.length} CONTRADICTION{coherence.contradictions.length > 1 ? 'S' : ''} DETECTED
              </h3>
            </div>
            {coherence.contradictions.map((c, i) => (
              <ContradictionCard key={i} contradiction={c} index={i} />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-accent-emerald/5 border border-accent-emerald/20">
            <CheckCircle2 size={16} className="text-accent-emerald" />
            <span className="text-sm text-accent-emerald">No cross-document contradictions detected</span>
          </div>
        )}
      </div>
    </div>
  );
}
