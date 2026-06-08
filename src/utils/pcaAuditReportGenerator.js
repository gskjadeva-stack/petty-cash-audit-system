import jsPDF from 'jspdf';
import { computeTotals } from './reportGenerator';
import { REPORT_TEMPLATE_STYLES } from './reportTemplateStyles';

const LOGO_PATH = '/gsdc4.png';
const NAVY = [30, 58, 95];

const FINDING_SECTIONS = [
  { key: 'missing', match: /missing|incomplete attachment/i, title: 'Missing / Incomplete Attachments' },
  { key: 'unliquidated', match: /unliquidated/i, title: 'Unliquidated Petty Cash Released' },
  { key: 'shortover', match: /over|short|cash count/i, title: 'Over / Short in Cash Count' },
  { key: 'approval', match: /approval/i, title: 'Approval Issues' },
  { key: 'double', match: /double encoding|inconsistent pcv/i, title: 'Double encoding / Inconsistent PCV info (Physical Voucher vs Petty Cash Register)' },
];

export const fmtPHP = (n) => {
  if (n == null || n === '' || Number.isNaN(Number(n))) return '—';
  return `PHP ${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const fmtDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const fmtMonthYear = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

function logoUrl() {
  if (typeof window !== 'undefined') return `${window.location.origin}${LOGO_PATH}`;
  return LOGO_PATH;
}

async function getLogoBase64() {
  const res = await fetch(LOGO_PATH);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function matchRecords(records, section) {
  return records.filter(r => section.match.test(r.classification || ''));
}

function dateRange(records) {
  const dates = records.map(r => r.audit_date).filter(Boolean).sort();
  if (!dates.length) return { from: '—', to: '—' };
  return { from: fmtDate(dates[0]), to: fmtDate(dates[dates.length - 1]) };
}

function sumAmount(records) {
  return records.reduce((s, r) => s + (Number(r.amount_involved) || 0), 0);
}

export function buildReportData({ siteOffice, pcaRecords, pcfRecord, disbursements, dateFrom, dateTo }) {
  const filtered = pcaRecords.filter(r => {
    if (r.site_office !== siteOffice) return false;
    if (dateFrom && r.audit_date < dateFrom) return false;
    if (dateTo && r.audit_date > dateTo) return false;
    return true;
  });

  const range = dateRange(filtered);
  const auditAsOf = dateTo ? fmtDate(dateTo) : (pcfRecord?.audit_date ? fmtDate(pcfRecord.audit_date) : range.to);

  let fundSummary = {
    revolvingFund: null,
    totalLiquidated: null,
    totalUnliquidated: null,
    shortOver: null,
    shortOverLabel: 'N/A',
  };

  if (pcfRecord && disbursements) {
    const totals = computeTotals(pcfRecord, disbursements);
    fundSummary = {
      revolvingFund: pcfRecord.revolving_fund,
      totalLiquidated: totals.totalLiq,
      totalUnliquidated: totals.totalUnliq,
      shortOver: Math.abs(totals.shortOver),
      shortOverLabel: totals.shortOver < 0 ? 'SHORTAGE' : totals.shortOver > 0 ? 'OVERAGE' : 'N/A',
    };
  }

  const findings = FINDING_SECTIONS.map(section => {
    const recs = matchRecords(filtered, section);
    const recRange = dateRange(recs);
    const totalAmt = sumAmount(recs);

    if (section.key === 'missing') {
      return {
        title: section.title,
        text: recs.length
          ? `Some PCVs were noted without official receipts or supporting documents covering the period of ${recRange.from} – ${recRange.to}`
          : 'N/A',
      };
    }
    if (section.key === 'unliquidated') {
      if (!recs.length) return { title: section.title, text: 'N/A' };
      const within = recs.filter(r => !r.resolution_date || r.resolution_date >= r.audit_date);
      const beyond = recs.filter(r => r.resolution_date && r.resolution_date < r.audit_date);
      const withinAmt = sumAmount(within);
      const beyondAmt = sumAmount(beyond);
      const wr = dateRange(within);
      const br = dateRange(beyond);
      return {
        title: section.title,
        text: [
          'There are outstanding petty cash released that remain unliquidated within and beyond the allowed period.',
          within.length ? `Within the allowed period ${wr.from} – ${wr.to} exactly ${fmtPHP(withinAmt)}.` : '',
          beyond.length ? `Beyond the allowed period ${br.from} – ${br.to} exactly ${fmtPHP(beyondAmt)}.` : '',
        ].filter(Boolean).join('\n'),
      };
    }
    if (section.key === 'shortover') {
      if (fundSummary.shortOverLabel !== 'N/A' && fundSummary.shortOver != null) {
        return {
          title: section.title,
          text: `A cash ${fundSummary.shortOverLabel} amounting to ${fmtPHP(fundSummary.shortOver)} was noted during the physical count.`,
          boldAmount: fmtPHP(fundSummary.shortOver),
        };
      }
      if (recs.length) {
        const amt = sumAmount(recs);
        return {
          title: section.title,
          text: `A cash variance amounting to ${fmtPHP(amt)} was noted during the physical count.`,
          boldAmount: fmtPHP(amt),
        };
      }
      return { title: section.title, text: 'A cash N/A amounting to PHP 0.00 was noted during the physical count.', boldAmount: 'PHP 0.00' };
    }
    if (!recs.length) return { title: section.title, text: 'N/A' };
    return {
      title: section.title,
      text: recs.map(r => r.description || r.title).join('; '),
    };
  });

  return {
    siteOffice,
    auditAsOf,
    range,
    fundSummary,
    findings,
    annexRecords: filtered,
    recommendationsMonth: fmtMonthYear(dateTo || pcfRecord?.audit_date || filtered[0]?.audit_date),
    completionDate: fmtDate(dateTo || new Date().toISOString().split('T')[0]),
  };
}

export async function generateAuditPDF(data) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const PW = 210;
  const M = 15;
  const CW = PW - 2 * M;
  let y = 10;

  let logoData = null;
  try { logoData = await getLogoBase64(); } catch (_) {}

  const checkBreak = (needed) => {
    if (y + needed > 280) { doc.addPage(); y = 15; }
  };

  const sectionTitle = (num, text) => {
    checkBreak(12);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY);
    doc.text(`${num}. ${text}`, M, y); y += 6;
  };

  const bodyText = (text, indent = 0) => {
    const lines = doc.splitTextToSize(text, CW - indent);
    lines.forEach(line => {
      checkBreak(6);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
      doc.text(line, M + indent, y); y += 5;
    });
    y += 2;
  };

  const bulletList = (items) => {
    items.forEach(item => {
      checkBreak(6);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
      doc.text(`• ${item}`, M + 4, y); y += 5;
    });
    y += 2;
  };

  // Header
  if (logoData) doc.addImage(logoData, 'PNG', M, y, 18, 18);
  doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY);
  doc.text('PETTY CASH FUND AUDIT REPORT', PW / 2, y + 6, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`GSDC ${data.siteOffice}`, PW / 2, y + 13, { align: 'center' });
  y += 22;
  doc.setDrawColor(...NAVY); doc.setLineWidth(0.5); doc.line(M, y, PW - M, y); y += 8;

  sectionTitle(1, 'OBJECTIVE');
  bodyText('The purpose of this petty cash audit is to verify the accuracy, completeness, and proper utilization of petty cash funds, and to ensure that all disbursements are supported with valid documents and comply with company policies.');

  sectionTitle(2, 'SCOPE OF AUDIT');
  bodyText(`The audit of petty cash transactions is done as of ${data.auditAsOf}, including:`);
  bulletList(['Petty Cash Vouchers (PCV)', 'Official Receipts / Supporting Documents', 'Cash on hand', 'Liquidated and unliquidated expenses']);

  sectionTitle(3, 'AUDIT PROCEDURES');
  bodyText('The following procedures were performed:');
  bulletList([
    'Physical cash count of petty cash on hand',
    'Reconciliation of cash on hand versus recorded balance',
    'Review of PCVs and attached receipts',
    'Verification of approvals and signatures',
    'Identification of discrepancies and policy deviations',
  ]);

  sectionTitle(4, 'SUMMARY OF FUND AUDIT');
  checkBreak(30);
  const fundRows = [
    ['Revolving Fund', fmtPHP(data.fundSummary.revolvingFund)],
    ['Total Liquidated', fmtPHP(data.fundSummary.totalLiquidated)],
    ['Total Unliquidated', fmtPHP(data.fundSummary.totalUnliquidated)],
    ['Short / (Over)', data.fundSummary.shortOverLabel !== 'N/A' ? fmtPHP(data.fundSummary.shortOver) : 'N/A'],
  ];
  doc.setFillColor(230, 236, 245);
  doc.rect(M, y, CW, 7, 'F');
  doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY);
  doc.text('Description', M + 3, y + 4.5);
  doc.text('Amount (PHP)', PW - M - 3, y + 4.5, { align: 'right' });
  y += 7;
  fundRows.forEach(([label, val]) => {
    checkBreak(7);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
    doc.text(label, M + 3, y + 4);
    doc.text(val, PW - M - 3, y + 4, { align: 'right' });
    doc.setDrawColor(220, 220, 220); doc.line(M, y + 6, PW - M, y + 6);
    y += 7;
  });
  y += 4;

  sectionTitle(5, 'DETAILED AUDIT FINDINGS');
  data.findings.forEach(f => {
    checkBreak(14);
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 60);
    doc.text(f.title, M, y); y += 5;
    const lines = doc.splitTextToSize(f.text, CW);
    lines.forEach(line => {
      checkBreak(6);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
      if (f.boldAmount && line.includes(f.boldAmount)) {
        const idx = line.indexOf(f.boldAmount);
        doc.text(line.substring(0, idx), M + 4, y);
        const w = doc.getTextWidth(line.substring(0, idx));
        doc.setFont('helvetica', 'bold');
        doc.text(f.boldAmount, M + 4 + w, y);
        doc.setFont('helvetica', 'normal');
        doc.text(line.substring(idx + f.boldAmount.length), M + 4 + w + doc.getTextWidth(f.boldAmount), y);
      } else {
        doc.text(line, M + 4, y);
      }
      y += 5;
    });
    y += 3;
  });

  sectionTitle(6, 'RECOMMENDATIONS');
  bulletList([
    'Ensure all petty cash disbursements are supported by complete and valid documents.',
    'Liquidate petty cash within the prescribed period.',
    `All unliquidated amount covering ${data.recommendationsMonth} should be completed until ${data.completionDate}.`,
    'Conduct regular petty cash monitoring and surprise cash counts.',
    'Have a thorough/cross-checking of the PCV against the register for accuracy and correctness of the records.',
  ]);

  checkBreak(20);
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY);
  doc.text('ANNEX A:', M, y); y += 6;
  if (!data.annexRecords.length) {
    bodyText('No PCA records for this site office in the selected period.');
  } else {
    data.annexRecords.forEach((r, i) => {
      checkBreak(8);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
      const line = `${i + 1}. ${r.record_number || '—'} | ${r.classification || '—'} | ${r.title || '—'} | ${fmtDate(r.audit_date)} | ${r.amount_involved ? fmtPHP(r.amount_involved) : '—'}`;
      const wrapped = doc.splitTextToSize(line, CW);
      wrapped.forEach(w => { doc.text(w, M, y); y += 4.5; });
      y += 1;
    });
  }

  doc.save(`PCA_Audit_Report_${data.siteOffice.replace(/\s+/g, '_')}.pdf`);
}

export function generateAuditWord(data) {
  const logo = logoUrl();
  const findingHtml = data.findings.map(f => `
    <p style="font-weight:bold;margin:8pt 0 3pt 0">${f.title}</p>
    <p style="margin:0 0 6pt 12pt;font-size:9pt">${f.text.replace(/\n/g, '<br/>')}</p>
  `).join('');

  const annexHtml = data.annexRecords.length
    ? `<table style="border-collapse:collapse;width:100%;font-size:8pt">
        <tr style="background:#e6ecf5;font-weight:bold"><td style="padding:3pt 5pt">#</td><td>Record #</td><td>Classification</td><td>Title</td><td>Audit Date</td><td>Amount</td></tr>
        ${data.annexRecords.map((r, i) => `
          <tr><td style="padding:2pt 5pt;border-bottom:0.5pt solid #eee">${i + 1}</td>
          <td style="padding:2pt 5pt;border-bottom:0.5pt solid #eee">${r.record_number || '—'}</td>
          <td style="padding:2pt 5pt;border-bottom:0.5pt solid #eee">${r.classification || '—'}</td>
          <td style="padding:2pt 5pt;border-bottom:0.5pt solid #eee">${r.title || '—'}</td>
          <td style="padding:2pt 5pt;border-bottom:0.5pt solid #eee">${fmtDate(r.audit_date)}</td>
          <td style="padding:2pt 5pt;border-bottom:0.5pt solid #eee">${r.amount_involved ? fmtPHP(r.amount_involved) : '—'}</td></tr>
        `).join('')}
      </table>`
    : '<p style="font-size:9pt">No PCA records for this site office in the selected period.</p>';

  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Petty Cash Fund Audit Report</title>
<style>
  body { font-family: ${REPORT_TEMPLATE_STYLES.fontFamily}; font-size: ${REPORT_TEMPLATE_STYLES.sectionSize}; margin: 1.8cm 1.5cm; color: ${REPORT_TEMPLATE_STYLES.bodyColor}; }
  h1 { font-size: ${REPORT_TEMPLATE_STYLES.titleSize}; color: ${REPORT_TEMPLATE_STYLES.navy}; text-align: center; margin: 0; }
  h2 { font-size: ${REPORT_TEMPLATE_STYLES.subtitleSize}; color: ${REPORT_TEMPLATE_STYLES.navy}; text-align: center; margin: 4pt 0 0 0; }
  .section { font-size: ${REPORT_TEMPLATE_STYLES.sectionSize}; font-weight: bold; color: ${REPORT_TEMPLATE_STYLES.navy}; margin: 12pt 0 4pt 0; }
  .fund-table { border-collapse: collapse; width: 100%; margin: 6pt 0; }
  .fund-table th, .fund-table td { border: 0.5pt solid ${REPORT_TEMPLATE_STYLES.tableBorder}; padding: 4pt 6pt; font-size: ${REPORT_TEMPLATE_STYLES.bodySize}; }
  .fund-table th { background: ${REPORT_TEMPLATE_STYLES.tableHeaderBg}; color: ${REPORT_TEMPLATE_STYLES.navy}; }
  ul { margin: 4pt 0; padding-left: 18pt; }
  li { font-size: ${REPORT_TEMPLATE_STYLES.bodySize}; margin-bottom: 3pt; }
  p { font-size: ${REPORT_TEMPLATE_STYLES.bodySize}; line-height: 1.4; }
  hr { border: none; border-top: 1.5pt solid ${REPORT_TEMPLATE_STYLES.navy}; margin: 10pt 0; }
</style></head>
<body>
<div style="display:flex;align-items:center;justify-content:center;gap:12pt;margin-bottom:8pt">
  <img src="${logo}" style="height:50pt" />
  <div><h1>PETTY CASH FUND AUDIT REPORT</h1><h2>GSDC ${data.siteOffice}</h2></div>
</div>
<hr/>

<p class="section">1. OBJECTIVE</p>
<p>The purpose of this petty cash audit is to verify the accuracy, completeness, and proper utilization of petty cash funds, and to ensure that all disbursements are supported with valid documents and comply with company policies.</p>

<p class="section">2. SCOPE OF AUDIT</p>
<p>The audit of petty cash transactions is done as of ${data.auditAsOf}, including:</p>
<ul><li>Petty Cash Vouchers (PCV)</li><li>Official Receipts / Supporting Documents</li><li>Cash on hand</li><li>Liquidated and unliquidated expenses</li></ul>

<p class="section">3. AUDIT PROCEDURES</p>
<p>The following procedures were performed:</p>
<ul>
  <li>Physical cash count of petty cash on hand</li>
  <li>Reconciliation of cash on hand versus recorded balance</li>
  <li>Review of PCVs and attached receipts</li>
  <li>Verification of approvals and signatures</li>
  <li>Identification of discrepancies and policy deviations</li>
</ul>

<p class="section">4. SUMMARY OF FUND AUDIT</p>
<table class="fund-table">
  <tr><th>Description</th><th style="text-align:right">Amount (PHP)</th></tr>
  <tr><td>Revolving Fund</td><td style="text-align:right">${fmtPHP(data.fundSummary.revolvingFund)}</td></tr>
  <tr><td>Total Liquidated</td><td style="text-align:right">${fmtPHP(data.fundSummary.totalLiquidated)}</td></tr>
  <tr><td>Total Unliquidated</td><td style="text-align:right">${fmtPHP(data.fundSummary.totalUnliquidated)}</td></tr>
  <tr><td>Short / (Over)</td><td style="text-align:right">${data.fundSummary.shortOverLabel !== 'N/A' ? fmtPHP(data.fundSummary.shortOver) : 'N/A'}</td></tr>
</table>

<p class="section">5. DETAILED AUDIT FINDINGS</p>
${findingHtml}

<p class="section">6. RECOMMENDATIONS</p>
<ul>
  <li>Ensure all petty cash disbursements are supported by complete and valid documents.</li>
  <li>Liquidate petty cash within the prescribed period.</li>
  <li>All unliquidated amount covering ${data.recommendationsMonth} should be completed until ${data.completionDate}.</li>
  <li>Conduct regular petty cash monitoring and surprise cash counts.</li>
  <li>Have a thorough/cross-checking of the PCV against the register for accuracy and correctness of the records.</li>
</ul>

<p class="section">ANNEX A:</p>
${annexHtml}

</body></html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PCA_Audit_Report_${data.siteOffice.replace(/\s+/g, '_')}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
