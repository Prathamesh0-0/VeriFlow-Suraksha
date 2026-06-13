import React from 'react';

const FIELD_LABELS = {
  employee_name: 'Employee Name', account_holder: 'Account Holder',
  gross_salary: 'Gross Salary', basic_pay: 'Basic Pay', hra: 'HRA',
  da: 'Dearness Allowance', pf_deduction: 'PF Deduction', provident_fund: 'Provident Fund',
  tds: 'TDS', income_tax: 'Income Tax', professional_tax: 'Professional Tax',
  net_pay: 'Net Pay', salary_credit: 'Salary Credit',
  opening_balance: 'Opening Balance', closing_balance: 'Closing Balance',
  account_number: 'Account Number', ifsc: 'IFSC Code', pan: 'PAN',
  gross_total_income: 'Gross Total Income', total_deductions: 'Total Deductions',
  taxable_income: 'Taxable Income', tds_claimed: 'TDS Claimed',
  assessment_year: 'Assessment Year', applicant_name: 'Applicant Name',
  employer_name: 'Employer Name', designation: 'Designation',
  monthly_net_income: 'Monthly Net Income', monthly_salary: 'Monthly Salary',
  annual_ctc: 'Annual CTC', loan_amount: 'Loan Amount',
  date_of_joining: 'Date of Joining', house_allowance: 'House Allowance',
  special_allowance: 'Special Allowance', employee_id: 'Employee ID',
  total_credits: 'Total Credits', department: 'Department',
  loan_type: 'Loan Type', loan_tenure: 'Loan Tenure',
};

const DOC_LABELS = {
  salary_slip: 'Salary Slip', bank_statement: 'Bank Statement',
  itr_form: 'IT Return', land_record: 'Land Record',
  employment_verification: 'Employment Verification',
  loan_application: 'Loan Application', unknown: 'Unknown',
};

export default function CoherenceMatrix({ coherence, documentReports }) {
  if (!coherence) return null;

  const checks = [
    { label: 'Name Consistency', pass: coherence.name_consistency },
    { label: 'Salary vs Bank Statement', pass: coherence.salary_bank_match },
    { label: 'Salary vs IT Return', pass: coherence.salary_itr_match },
  ];

  const docs = documentReports?.filter(d => d.extracted_fields?.fields?.length > 0) || [];

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="section-title">Cross-Document Verification</div>
      <div className="panel">
        {/* Quick checks */}
        <table style={{ marginBottom: 16 }}>
          <thead><tr><th>Check</th><th style={{ width: 100 }}>Result</th></tr></thead>
          <tbody>
            {checks.map((c, i) => (
              <tr key={i}>
                <td>{c.label}</td>
                <td className={c.pass ? 'status-pass' : 'status-fail'}>
                  {c.pass ? 'PASS' : 'FAIL'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Field comparison */}
        {docs.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Field Comparison</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Field</th>
                    {docs.map((d, i) => (
                      <th key={i}>{DOC_LABELS[d.extracted_fields?.document_type] || d.document_name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const names = new Set();
                    docs.forEach(d => d.extracted_fields?.fields?.forEach(f => names.add(f.field_name)));
                    return [...names].map(fn => (
                      <tr key={fn}>
                        <td style={{ fontWeight: 500 }}>{FIELD_LABELS[fn] || fn}</td>
                        {docs.map((d, di) => {
                          const f = d.extracted_fields?.fields?.find(x => x.field_name === fn);
                          return (
                            <td key={di} style={{ fontFamily: 'var(--font-mono)' }}>
                              {f ? (f.numeric_value != null ? `₹${f.numeric_value.toLocaleString('en-IN')}` : f.value) : '—'}
                            </td>
                          );
                        })}
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Contradictions */}
        {coherence.contradictions?.length > 0 ? (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#b91c1c' }}>
              {coherence.contradictions.length} Contradiction{coherence.contradictions.length > 1 ? 's' : ''} Found
            </div>
            <table style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Severity</th>
                  <th>Source A</th>
                  <th>Value A</th>
                  <th>Source B</th>
                  <th>Value B</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {coherence.contradictions.map((c, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td><span className={`sev-${c.severity}`}>{c.severity?.toUpperCase()}</span></td>
                    <td style={{ fontSize: 11 }}>{c.field_a?.source_document}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {c.field_a?.numeric_value != null ? `₹${c.field_a.numeric_value.toLocaleString('en-IN')}` : c.field_a?.value}
                    </td>
                    <td style={{ fontSize: 11 }}>{c.field_b?.source_document}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {c.field_b?.numeric_value != null ? `₹${c.field_b.numeric_value.toLocaleString('en-IN')}` : c.field_b?.value}
                    </td>
                    <td>{c.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="alert alert-success" style={{ marginTop: 16 }}>
            No cross-document contradictions detected.
          </div>
        )}
      </div>
    </div>
  );
}
