import React, { useState } from 'react';

const CURRENCY_FIELDS = new Set([
  'gross_salary', 'basic_pay', 'net_pay', 'house_allowance', 'special_allowance',
  'income_tax', 'provident_fund', 'total_deductions', 'salary_credit',
  'opening_balance', 'closing_balance', 'total_credits', 'monthly_salary',
  'annual_ctc', 'monthly_net_income', 'loan_amount', 'gross_total_income',
  'tax_payable', 'tds_deducted', 'net_tax_payable', 'salary_income',
]);

function formatValue(fieldName, value, numericValue) {
  if (CURRENCY_FIELDS.has(fieldName) && numericValue != null) {
    return `₹${numericValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }
  return value;
}

function formatLabel(fieldName) {
  return fieldName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default function ExtractedFieldsPanel({ documentReports }) {
  const [openDoc, setOpenDoc] = useState(0);

  const docsWithFields = documentReports.filter(
    dr => dr.extracted_fields?.fields?.length > 0
  );

  if (!docsWithFields.length) return null;

  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-title">🔍 OCR-Extracted Financial Fields</div>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
        These are the actual values the system read from the documents using PyMuPDF text extraction.
        The coherence engine cross-validates these fields across all documents.
      </p>

      {docsWithFields.map((dr, i) => {
        const fields = dr.extracted_fields.fields;
        const isOpen = openDoc === i;
        const docType = dr.extracted_fields.document_type?.replace(/_/g, ' ') || 'Unknown';

        return (
          <div key={i} className="doc-accordion">
            <div
              className="doc-accordion-header"
              onClick={() => setOpenDoc(isOpen ? -1 : i)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  {dr.document_name}
                </span>
                <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                  {docType}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {fields.length} fields extracted
                </span>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                {isOpen ? '▼' : '▶'}
              </span>
            </div>

            {isOpen && (
              <div className="doc-accordion-body">
                <div className="field-grid">
                  {fields.map((f, j) => (
                    <div key={j} className="field-chip">
                      <div className="field-chip-label">
                        {formatLabel(f.field_name)}
                      </div>
                      <div className="field-chip-value">
                        {formatValue(f.field_name, f.value, f.numeric_value)}
                      </div>
                      <div className="field-chip-conf">
                        conf: {(f.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
