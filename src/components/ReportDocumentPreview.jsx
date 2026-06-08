import { fmtPHP, fmtDate } from '@/utils/pcaAuditReportGenerator';
import { REPORT_PREVIEW_CSS } from '@/utils/reportTemplateStyles';

function FindingText({ text, boldAmount }) {
  if (!boldAmount || !text.includes(boldAmount)) {
    return <span>{text}</span>;
  }
  const parts = text.split(boldAmount);
  return (
    <>
      {parts[0]}
      <strong>{boldAmount}</strong>
      {parts.slice(1).join(boldAmount)}
    </>
  );
}

export default function ReportDocumentPreview({ data }) {
  const fundRows = [
    ['Revolving Fund', fmtPHP(data.fundSummary.revolvingFund)],
    ['Total Liquidated', fmtPHP(data.fundSummary.totalLiquidated)],
    ['Total Unliquidated', fmtPHP(data.fundSummary.totalUnliquidated)],
    ['Short / (Over)', data.fundSummary.shortOverLabel !== 'N/A' ? fmtPHP(data.fundSummary.shortOver) : 'N/A'],
  ];

  return (
    <>
      <style>{REPORT_PREVIEW_CSS}</style>
      <div className="report-doc">
        <div className="report-doc-header">
          <img src="/gsdc4.png" alt="GSDC" />
          <div>
            <h1>PETTY CASH FUND AUDIT REPORT</h1>
            <h2>GSDC {data.siteOffice}</h2>
          </div>
        </div>
        <hr />

        <p className="section">1. OBJECTIVE</p>
        <p>
          The purpose of this petty cash audit is to verify the accuracy, completeness, and proper utilization of petty cash funds, and to ensure that all disbursements are supported with valid documents and comply with company policies.
        </p>

        <p className="section">2. SCOPE OF AUDIT</p>
        <p>The audit of petty cash transactions is done as of {data.auditAsOf}, including:</p>
        <ul>
          <li>Petty Cash Vouchers (PCV)</li>
          <li>Official Receipts / Supporting Documents</li>
          <li>Cash on hand</li>
          <li>Liquidated and unliquidated expenses</li>
        </ul>

        <p className="section">3. AUDIT PROCEDURES</p>
        <p>The following procedures were performed:</p>
        <ul>
          <li>Physical cash count of petty cash on hand</li>
          <li>Reconciliation of cash on hand versus recorded balance</li>
          <li>Review of PCVs and attached receipts</li>
          <li>Verification of approvals and signatures</li>
          <li>Identification of discrepancies and policy deviations</li>
        </ul>

        <p className="section">4. SUMMARY OF FUND AUDIT</p>
        <table className="fund-table">
          <thead>
            <tr>
              <th>Description</th>
              <th style={{ textAlign: 'right' }}>Amount (PHP)</th>
            </tr>
          </thead>
          <tbody>
            {fundRows.map(([label, val]) => (
              <tr key={label}>
                <td>{label}</td>
                <td style={{ textAlign: 'right' }}>{val}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="section">5. DETAILED AUDIT FINDINGS</p>
        {data.findings.map(f => (
          <div key={f.title}>
            <p className="finding-title">{f.title}</p>
            {f.text.split('\n').map((line, i) => (
              <p key={i} className="finding-text">
                <FindingText text={line} boldAmount={f.boldAmount} />
              </p>
            ))}
          </div>
        ))}

        <p className="section">6. RECOMMENDATIONS</p>
        <ul>
          <li>Ensure all petty cash disbursements are supported by complete and valid documents.</li>
          <li>Liquidate petty cash within the prescribed period.</li>
          <li>All unliquidated amount covering {data.recommendationsMonth} should be completed until {data.completionDate}.</li>
          <li>Conduct regular petty cash monitoring and surprise cash counts.</li>
          <li>Have a thorough/cross-checking of the PCV against the register for accuracy and correctness of the records.</li>
        </ul>

        <p className="section">ANNEX A:</p>
        {data.annexRecords.length === 0 ? (
          <p>No PCA records for this site office in the selected period.</p>
        ) : (
          <table className="annex-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Record #</th>
                <th>Classification</th>
                <th>Title</th>
                <th>Audit Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.annexRecords.map((r, i) => (
                <tr key={r.id || i}>
                  <td>{i + 1}</td>
                  <td>{r.record_number || '—'}</td>
                  <td>{r.classification || '—'}</td>
                  <td>{r.title || '—'}</td>
                  <td>{fmtDate(r.audit_date)}</td>
                  <td>{r.amount_involved ? fmtPHP(r.amount_involved) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
