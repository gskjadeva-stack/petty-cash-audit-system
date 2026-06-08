import jsPDF from 'jspdf';

const LOGO_PATH = '/gsdc4.png';
function logoUrl() {
  if (typeof window !== 'undefined') return `${window.location.origin}${LOGO_PATH}`;
  return LOGO_PATH;
}
const NAVY = [30, 58, 95];

const fmtPHP = (n) =>
  `PHP ${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

export function computeTotals(record, disbursements) {
  const bills =
    (record.bills_1000 || 0) * 1000 + (record.bills_500 || 0) * 500 +
    (record.bills_200 || 0) * 200 + (record.bills_100 || 0) * 100 +
    (record.bills_50 || 0) * 50 + (record.bills_20 || 0) * 20;
  const coins =
    (record.coins_20 || 0) * 20 + (record.coins_10 || 0) * 10 +
    (record.coins_5 || 0) * 5 + (record.coins_1 || 0) * 1 +
    (record.coins_025 || 0) * 0.25 + (record.coins_010 || 0) * 0.10 +
    (record.coins_005 || 0) * 0.05;
  const cashActual = bills + coins + (record.gcash_amount || 0) + (record.atm_bank_amount || 0) + (record.by_hand_amount || 0);
  const unliqDisbs = disbursements.filter(d => d.type === 'Unliquidated');
  const liqDisbs = disbursements.filter(d => d.type === 'Liquidated');
  const repDisbs = disbursements.filter(d => d.type === 'Replenished');
  const totalUnliq = unliqDisbs.reduce((s, d) => s + (d.amount || 0), 0);
  const totalLiq = liqDisbs.reduce((s, d) => s + (d.amount || 0), 0);
  const totalRep = repDisbs.reduce((s, d) => s + (d.amount || 0), 0);
  const totalRepGcash = repDisbs.filter(d => d.remittance_status === 'GCash').reduce((s, d) => s + (d.amount || 0), 0);
  const totalRepAtm = repDisbs.filter(d => d.remittance_status === 'ATM/Bank').reduce((s, d) => s + (d.amount || 0), 0);
  const totalRepByHand = repDisbs.filter(d => d.remittance_status === 'By Hand').reduce((s, d) => s + (d.amount || 0), 0);
  const totalRepPending = repDisbs.filter(d => d.remittance_status === 'Not Remitted').reduce((s, d) => s + (d.amount || 0), 0);
  const beginningBalance = record.beginning_balance || 0;
  // Total Expense = Unliquidated + Liquidated
  const totalExpense = totalUnliq + totalLiq;
  const cashDeclared = beginningBalance + totalRep - totalExpense;
  const accountable = cashActual + totalUnliq + totalLiq;
  const shortOver = accountable - (record.revolving_fund || 0);
  return { bills, coins, cashActual, cashDeclared, beginningBalance, totalUnliq, totalLiq, totalRep, totalRepGcash, totalRepAtm, totalRepByHand, totalRepPending, totalExpense, accountable, shortOver, unliqDisbs, liqDisbs, repDisbs };
}

// ─── PDF ────────────────────────────────────────────────────────────────────

export async function generatePDF(record, disbursements) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const PW = 210;
  const M = 15;
  const CW = PW - 2 * M;
  let y = 10;

  let logoData = null;
  try { logoData = await getLogoBase64(); } catch (_) {}

  const checkBreak = (needed) => {
    if (y + needed > 280) { doc.addPage(); y = 10; drawPageHeader(); }
  };

  const drawPageHeader = () => {
    if (logoData) doc.addImage(logoData, 'PNG', M, y, 16, 16);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY);
    doc.text('GREAT SIERRA DEVELOPMENT CORPORATION', M + 20, y + 6);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
    doc.text('Fund Computation Worksheet', M + 20, y + 11);
    y += 19;
    doc.setDrawColor(...NAVY); doc.setLineWidth(0.5);
    doc.line(M, y, PW - M, y); y += 4;
  };

  drawPageHeader();

  const { bills, coins, cashActual, cashDeclared, beginningBalance, totalUnliq, totalLiq, totalRep, totalRepGcash, totalRepAtm, totalRepByHand, totalRepPending, totalExpense, accountable, shortOver, unliqDisbs, liqDisbs, repDisbs } = computeTotals(record, disbursements);

  // ── Section header
  const sectionHeader = (text) => {
    checkBreak(10);
    doc.setFillColor(...NAVY);
    doc.rect(M, y, CW, 6.5, 'F');
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text(text, M + 3, y + 4.5); y += 8;
  };

  // ── Summary row
  const sRow = (label, value, opts = {}) => {
    checkBreak(6.5);
    const rowH = 6;
    if (opts.shade) { doc.setFillColor(245, 248, 252); doc.rect(M, y, CW, rowH, 'F'); }
    if (opts.topBorder) { doc.setDrawColor(...NAVY); doc.setLineWidth(0.5); doc.line(M, y, PW - M, y); }
    doc.setFontSize(8.5);
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    const indent = opts.indent || 0;
    if (opts.red) { doc.setTextColor(185, 28, 28); }
    else if (opts.bold) { doc.setTextColor(...NAVY); }
    else { doc.setTextColor(40, 40, 40); }
    doc.text(label, M + 3 + indent, y + 4);
    doc.text(value, PW - M - 2, y + 4, { align: 'right' });
    y += rowH;
  };

  // ── Disbursement table
  const disbTable = (rows, cols, striped = true) => {
    if (!rows.length) {
      checkBreak(7);
      doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(150, 150, 150);
      doc.text('No entries.', M + 3, y + 4); y += 7;
      return;
    }
    checkBreak(10);
    doc.setFillColor(230, 236, 245);
    doc.rect(M, y, CW, 6, 'F');
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY);
    cols.forEach(c => {
      c.align === 'right'
        ? doc.text(c.header, M + c.x + c.w, y + 4, { align: 'right' })
        : doc.text(c.header, M + c.x + 1, y + 4);
    });
    y += 6;

    rows.forEach((d, idx) => {
      checkBreak(6);
      if (striped && idx % 2 === 0) { doc.setFillColor(250, 252, 255); doc.rect(M, y, CW, 5.5, 'F'); }
      doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
      cols.forEach(c => {
        const text = String(d[c.key] || '');
        if (c.align === 'right') {
          doc.text(text, M + c.x + c.w, y + 3.8, { align: 'right' });
        } else {
          const clipped = doc.splitTextToSize(text, c.w - 2)[0];
          doc.text(clipped, M + c.x + 1, y + 3.8);
        }
      });
      y += 5.5;
    });

    doc.setDrawColor(...NAVY); doc.setLineWidth(0.4); doc.line(M, y, PW - M, y); y += 1;
    const lastCol = cols[cols.length - 1];
    const total = rows.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY);
    doc.text('TOTAL', M + 3, y + 4);
    doc.text(fmtPHP(total), M + lastCol.x + lastCol.w, y + 4, { align: 'right' });
    y += 7;
  };

  const disbCols = [
    { header: 'Ref. No.', key: 'reference_number', x: 0, w: 30 },
    { header: 'Date', key: 'date', x: 31, w: 24 },
    { header: 'Description', key: 'description', x: 56, w: 82 },
    { header: 'Amount (PHP)', key: 'amount', x: 139, w: 36, align: 'right' },
  ];

  // ══ PCF TALLY DETAILED RECORD ══
  sectionHeader('PCF TALLY DETAILED RECORD');

  // Session Information sub-section
  checkBreak(8);
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80);
  doc.text('Session Information', M + 3, y + 4); y += 7;

  const sessionFields = [
    ['Site Office', record.site_office || '—', 'Tally No.', record.tally_number || '—'],
    ['Audit Date', record.audit_date || '—', 'Auditor', record.auditor_name || '—'],
    ['Fund Type', record.fund_type || '—', 'Revolving Fund', fmtPHP(record.revolving_fund || 0)],
    ['Beginning Balance', fmtPHP(record.beginning_balance || 0), 'As of', record.beginning_balance_as_of ? record.beginning_balance_as_of.replace('T', ' ') : '—'],
  ];
  sessionFields.forEach((row) => {
    checkBreak(6);
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80);
    doc.text(row[0] + ':', M + 3, y + 3.8);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
    doc.text(String(row[1]), M + 45, y + 3.8);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80);
    doc.text(row[2] + ':', M + 90, y + 3.8);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
    doc.text(String(row[3]), M + 130, y + 3.8);
    y += 5.5;
  });
  y += 4;

  // Cash Released: Unliquidated
  checkBreak(10);
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(185, 28, 28);
  doc.text('Cash Released: UNLIQUIDATED', M + 3, y + 4); y += 7;
  disbTable(unliqDisbs, disbCols, false);

  // Cash Released: Liquidated
  checkBreak(10);
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 130);
  doc.text('Cash Released: LIQUIDATED', M + 3, y + 4); y += 7;
  disbTable(liqDisbs, disbCols, false);

  // Replenished Fund
  checkBreak(10);
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY);
  doc.text('Replenished Fund', M + 3, y + 4); y += 7;
  const repCols = [
    { header: 'Ref. No.', key: 'reference_number', x: 0, w: 28 },
    { header: 'Date', key: 'date', x: 29, w: 22 },
    { header: 'Description', key: 'description', x: 52, w: 60 },
    { header: 'Remittance', key: 'remittance_status', x: 113, w: 26 },
    { header: 'Amount (PHP)', key: 'amount', x: 140, w: 35, align: 'right' },
  ];
  disbTable(repDisbs, repCols, false);

  if (repDisbs.length > 0) {
    y += 1;
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
    if (totalRepGcash > 0) { checkBreak(5); doc.text(`Via GCash: ${fmtPHP(totalRepGcash)}`, PW - M - 2, y, { align: 'right' }); y += 4.5; }
    if (totalRepAtm > 0) { checkBreak(5); doc.text(`Via ATM/Bank: ${fmtPHP(totalRepAtm)}`, PW - M - 2, y, { align: 'right' }); y += 4.5; }
    if (totalRepByHand > 0) { checkBreak(5); doc.text(`Via By Hand: ${fmtPHP(totalRepByHand)}`, PW - M - 2, y, { align: 'right' }); y += 4.5; }
    if (totalRepPending > 0) { checkBreak(5); doc.text(`Not Yet Remitted: ${fmtPHP(totalRepPending)}`, PW - M - 2, y, { align: 'right' }); y += 4.5; }
    y += 2;
  }

  // ══ TALLY SUMMARY ══
  checkBreak(80);
  sectionHeader('TALLY SUMMARY');

  sRow('Revolving Fund', fmtPHP(record.revolving_fund || 0), { bold: true });
  y += 1;
  sRow('Cash on Hand (Declared)', fmtPHP(cashDeclared), { shade: true });
  sRow('  · Beginning Balance', fmtPHP(beginningBalance), { indent: 5 });
  sRow('  · Replenished', fmtPHP(totalRep), { shade: true, indent: 5 });
  sRow('  · Total Expense', `(${fmtPHP(totalExpense)})`, { indent: 5 });
  y += 1;
  sRow('Cash on Hand (Actual)', fmtPHP(cashActual), { shade: false });
  sRow('  · Bills', fmtPHP(bills), { shade: true, indent: 5 });
  sRow('  · Coins', fmtPHP(coins), { indent: 5 });
  sRow('  · GCash Current', fmtPHP(record.gcash_amount || 0), { shade: true, indent: 5 });
  sRow('  · ATM/Bank Current', fmtPHP(record.atm_bank_amount || 0), { indent: 5 });
  y += 1;

  // COH Variance
  const cohVariance = cashDeclared - cashActual;
  sRow('COH Variance', cohVariance < 0 ? `(${fmtPHP(Math.abs(cohVariance))})` : fmtPHP(cohVariance), { red: true });
  y += 1;

  sRow('Unliquidated', fmtPHP(totalUnliq), { red: true });
  sRow('Liquidated', fmtPHP(totalLiq), { shade: true });
  sRow('Total Accountable', fmtPHP(accountable), { bold: true, topBorder: true });

  // Short/Overage box
  checkBreak(22);
  y += 3;
  const isShort = shortOver < 0;
  const isOver = shortOver > 0;
  const boxFill = isShort ? [254, 226, 226] : isOver ? [254, 243, 199] : [209, 250, 229];
  const boxText = isShort ? [185, 28, 28] : isOver ? [146, 64, 14] : [6, 95, 70];
  doc.setFillColor(...boxFill);
  doc.roundedRect(M, y, CW, 16, 2, 2, 'F');
  doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...boxText);
  doc.text(isShort ? 'SHORT' : isOver ? 'OVERAGE' : 'BALANCED', M + 5, y + 6);
  doc.setFontSize(12);
  const shortStr = isShort ? `(${fmtPHP(Math.abs(shortOver))})` : fmtPHP(Math.abs(shortOver));
  doc.text(shortStr, PW - M - 5, y + 11, { align: 'right' });
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
  doc.text(isShort ? 'Cash is short vs. revolving fund' : isOver ? 'Cash exceeds revolving fund' : 'Cash matches revolving fund exactly', M + 5, y + 12);
  y += 20;

  // ══ REMARKS / NOTES ══
  if (record.notes) {
    checkBreak(20);
    sectionHeader('REMARKS / NOTES');
    const lines = doc.splitTextToSize(record.notes, CW - 6);
    lines.forEach(line => {
      checkBreak(6);
      doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
      doc.text(line, M + 3, y + 4); y += 5.5;
    });
    y += 3;
  }

  // ══ SIGNATORIES ══
  checkBreak(60);
  sectionHeader('SIGNATORIES');

  const signCol = CW / 3;
  const roles = ['Audited By:', 'Noted By:', 'Assisted By:'];
  const startY = y;

  roles.forEach((role, i) => {
    const cx = M + i * signCol;
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY);
    doc.text(role, cx + 3, startY + 5);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
    doc.setFontSize(7.5);
    doc.text('Fullname', cx + 3, startY + 14);
    doc.setDrawColor(100, 100, 100); doc.setLineWidth(0.3);
    doc.line(cx + 3, startY + 15, cx + signCol - 5, startY + 15);
    doc.text('Job Position', cx + 3, startY + 21);
    doc.line(cx + 3, startY + 22, cx + signCol - 5, startY + 22);
    doc.text('Department', cx + 3, startY + 28);
    doc.line(cx + 3, startY + 29, cx + signCol - 5, startY + 29);
  });
  y = startY + 35;

  // ── Footer
  checkBreak(10);
  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3); doc.line(M, y, PW - M, y); y += 4;
  doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.setTextColor(160, 160, 160);
  doc.text(`Generated: ${new Date().toLocaleString('en-PH')}  |  ${record.tally_number || ''}  |  Great Sierra Development Corporation`, PW / 2, y, { align: 'center' });

  doc.save(`PCF_Tally_${record.tally_number || record.audit_date || 'export'}.pdf`);
}

// ─── WORD (.doc via HTML) ───────────────────────────────────────────────────

export function generateWord(record, disbursements) {
  const { bills, coins, cashActual, cashDeclared, beginningBalance, totalUnliq, totalLiq, totalRep, totalRepGcash, totalRepAtm, totalRepByHand, totalRepPending, totalExpense, accountable, shortOver, unliqDisbs, liqDisbs, repDisbs } = computeTotals(record, disbursements);
  const isShort = shortOver < 0;
  const isOver = shortOver > 0;
  const cohVariance = cashDeclared - cashActual;

  const fmtW = (n) => `PHP ${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const disbRows = (rows, includeRemittance = false, striped = true) => {
    if (!rows.length) return `<tr><td colspan="${includeRemittance ? 5 : 4}" style="text-align:center;color:#aaa;font-style:italic;padding:5pt">No entries</td></tr>`;
    const body = rows.map((d, i) => `
      <tr style="${striped && i % 2 === 0 ? 'background:#f5f8fc;' : ''}">
        <td>${d.reference_number || ''}</td>
        <td>${d.date || ''}</td>
        <td>${d.description || ''}</td>
        ${includeRemittance ? `<td>${d.remittance_status || ''}</td>` : ''}
        <td style="text-align:right">${fmtW(d.amount)}</td>
      </tr>`).join('');
    const total = rows.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
    return body + `<tr style="font-weight:bold;border-top:2pt solid #1E3A5F;color:#1E3A5F"><td colspan="${includeRemittance ? 4 : 3}">TOTAL</td><td style="text-align:right">${fmtW(total)}</td></tr>`;
  };

  const shortColor = isShort ? '#b91c1c' : isOver ? '#92400e' : '#065f46';
  const shortBg = isShort ? '#fee2e2' : isOver ? '#fef3c7' : '#d1fae5';
  const shortLabel = isShort ? 'SHORT' : isOver ? 'OVERAGE' : 'BALANCED';
  const shortVal = isShort ? `(${fmtW(Math.abs(shortOver))})` : fmtW(Math.abs(shortOver));

  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>PCF Tally</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 9pt; margin: 1.8cm 1.5cm; color: #1a1a1a; }
  .header-wrap { display:flex; align-items:center; gap:12pt; margin-bottom:6pt; }
  .company { font-size:12pt; font-weight:bold; color:#1E3A5F; }
  .company-sub { font-size:7.5pt; color:#888; }
  hr { border:none; border-top:1.5px solid #1E3A5F; margin:6pt 0; }
  .session-table { border-collapse:collapse; width:100%; margin-bottom:8pt; }
  .session-table td { font-size:8.5pt; padding:3pt 5pt; }
  .session-table .lbl { font-weight:bold; color:#555; width:15%; }
  .session-table .val { color:#1a1a1a; width:35%; }
  .sub-title { font-size:8.5pt; font-weight:bold; padding:4pt 0 3pt 0; margin-top:4pt; }
  .unliq { color:#b91c1c; }
  .liq { color:#1e3a82; }
  .rep { color:#1E3A5F; }
  .section-title { background:#1E3A5F; color:#fff; font-size:8.5pt; font-weight:bold; padding:4pt 7pt; margin:10pt 0 0 0; }
  table.disb { border-collapse:collapse; width:100%; margin:0 0 5pt 0; }
  table.disb th { background:#e6ecf5; color:#1E3A5F; font-weight:bold; padding:3pt 5pt; font-size:8pt; border-bottom:1.5pt solid #1E3A5F; text-align:left; }
  table.disb td { font-size:8pt; padding:2.5pt 5pt; border-bottom:0.5pt solid #eee; }
  table.summary { border-collapse:collapse; width:100%; margin:0 0 5pt 0; }
  table.summary th { background:#e6ecf5; color:#1E3A5F; font-weight:bold; padding:3pt 5pt; font-size:8pt; border-bottom:1.5pt solid #1E3A5F; text-align:left; }
  table.summary td { font-size:8pt; padding:2.5pt 6pt; border-bottom:0.5pt solid #eee; }
  .sep-top td { border-top:1.5pt solid #1E3A5F !important; font-weight:bold; color:#1E3A5F; }
  .shade td { background:#f5f8fc; }
  .bold td { font-weight:bold; }
  .red td { color:#b91c1c; }
  .navy td { color:#1E3A5F; }
  .indent td:first-child { padding-left:18pt; }
  .summary-box { padding:7pt 12pt; margin:8pt 0; }
  .summary-box .s-label { font-size:8.5pt; font-weight:bold; }
  .summary-box .s-amount { font-size:13pt; font-weight:bold; }
  .remit-mini { width:45%; margin-left:auto; border-collapse:collapse; }
  .remit-mini td { font-size:8pt; padding:2pt 5pt; border-bottom:0.5pt solid #eee; }
  .sig-table { border-collapse:collapse; width:100%; margin-top:10pt; }
  .sig-table td { width:33%; vertical-align:top; padding:4pt 8pt; }
  .sig-label { font-size:8pt; font-weight:bold; color:#1E3A5F; margin-bottom:14pt; }
  .sig-line { border-top:1pt solid #555; margin-top:12pt; padding-top:2pt; font-size:7.5pt; color:#555; }
  .footer { text-align:center; font-size:7pt; color:#aaa; margin-top:10pt; font-style:italic; }
</style>
</head>
<body>

<!-- HEADER -->
<div class="header-wrap">
  <img src="${logoUrl()}" style="height:45pt" />
  <div>
    <div class="company">GREAT SIERRA DEVELOPMENT CORPORATION</div>
    <div class="company-sub">Fund Computation Worksheet</div>
  </div>
</div>
<hr/>

<!-- SESSION INFO -->
<div class="section-title">PCF TALLY DETAILED RECORD</div>
<div class="sub-title" style="color:#555;font-size:8pt;padding:5pt 0 2pt 3pt;">Session Information</div>
<table class="session-table">
  <tr>
    <td class="lbl">Site Office</td><td class="val">${record.site_office || '—'}</td>
    <td class="lbl">Tally No.</td><td class="val">${record.tally_number || '—'}</td>
  </tr>
  <tr>
    <td class="lbl">Audit Date</td><td class="val">${record.audit_date || '—'}</td>
    <td class="lbl">Auditor</td><td class="val">${record.auditor_name || '—'}</td>
  </tr>
  <tr>
    <td class="lbl">Fund Type</td><td class="val">${record.fund_type || '—'}</td>
    <td class="lbl">Revolving Fund</td><td class="val">${fmtW(record.revolving_fund || 0)}</td>
  </tr>
  <tr>
    <td class="lbl">Beginning Balance</td><td class="val">${fmtW(record.beginning_balance || 0)}</td>
    <td class="lbl">As of</td><td class="val">${record.beginning_balance_as_of ? record.beginning_balance_as_of.replace('T', ' ') : '—'}</td>
  </tr>
</table>

<!-- UNLIQUIDATED -->
<div class="sub-title unliq">Cash Released: UNLIQUIDATED</div>
<table class="disb">
  <tr><th>Ref. No.</th><th>Date</th><th>Description</th><th style="text-align:right">Amount (PHP)</th></tr>
  ${disbRows(unliqDisbs, false, false)}
</table>

<!-- LIQUIDATED -->
<div class="sub-title liq">Cash Released: LIQUIDATED</div>
<table class="disb">
  <tr><th>Ref. No.</th><th>Date</th><th>Description</th><th style="text-align:right">Amount (PHP)</th></tr>
  ${disbRows(liqDisbs, false, false)}
</table>

<!-- REPLENISHED -->
<div class="sub-title rep">Replenished Fund</div>
<table class="disb">
  <tr><th>Ref. No.</th><th>Date</th><th>Description</th><th>Remittance</th><th style="text-align:right">Amount (PHP)</th></tr>
  ${disbRows(repDisbs, true, false)}
</table>
${repDisbs.length > 0 ? `
<table class="remit-mini">
  ${totalRepGcash > 0 ? `<tr><td>Via GCash</td><td style="text-align:right">${fmtW(totalRepGcash)}</td></tr>` : ''}
  ${totalRepAtm > 0 ? `<tr style="background:#f5f8fc"><td>Via ATM/Bank</td><td style="text-align:right">${fmtW(totalRepAtm)}</td></tr>` : ''}
  ${totalRepByHand > 0 ? `<tr><td>Via By Hand</td><td style="text-align:right">${fmtW(totalRepByHand)}</td></tr>` : ''}
  ${totalRepPending > 0 ? `<tr style="background:#f5f8fc"><td>Not Yet Remitted</td><td style="text-align:right">${fmtW(totalRepPending)}</td></tr>` : ''}
</table>` : ''}

<!-- TALLY SUMMARY -->
<div class="section-title">TALLY SUMMARY</div>
<table class="summary">
  <tr><th style="width:70%">Description</th><th style="text-align:right">Amount (PHP)</th></tr>
  <tr class="bold navy"><td>Revolving Fund</td><td style="text-align:right">${fmtW(record.revolving_fund || 0)}</td></tr>
  <tr class="shade"><td>Cash on Hand (Declared)</td><td style="text-align:right">${fmtW(cashDeclared)}</td></tr>
  <tr class="indent"><td>&nbsp;&nbsp;&nbsp;· Beginning Balance</td><td style="text-align:right">${fmtW(beginningBalance)}</td></tr>
  <tr class="shade indent"><td>&nbsp;&nbsp;&nbsp;· Replenished</td><td style="text-align:right">${fmtW(totalRep)}</td></tr>
  <tr class="indent"><td>&nbsp;&nbsp;&nbsp;· Total Expense</td><td style="text-align:right">(${fmtW(totalExpense)})</td></tr>
  <tr><td>Cash on Hand (Actual)</td><td style="text-align:right">${fmtW(cashActual)}</td></tr>
  <tr class="shade indent"><td>&nbsp;&nbsp;&nbsp;· Bills</td><td style="text-align:right">${fmtW(bills)}</td></tr>
  <tr class="indent"><td>&nbsp;&nbsp;&nbsp;· Coins</td><td style="text-align:right">${fmtW(coins)}</td></tr>
  <tr class="shade indent"><td>&nbsp;&nbsp;&nbsp;· GCash Current</td><td style="text-align:right">${fmtW(record.gcash_amount || 0)}</td></tr>
  <tr class="indent"><td>&nbsp;&nbsp;&nbsp;· ATM/Bank Current</td><td style="text-align:right">${fmtW(record.atm_bank_amount || 0)}</td></tr>
  <tr class="red"><td><strong>COH Variance</strong></td><td style="text-align:right;font-weight:bold">${cohVariance < 0 ? `(${fmtW(Math.abs(cohVariance))})` : fmtW(cohVariance)}</td></tr>
  <tr class="red"><td>Unliquidated</td><td style="text-align:right">${fmtW(totalUnliq)}</td></tr>
  <tr class="shade"><td>Liquidated</td><td style="text-align:right">${fmtW(totalLiq)}</td></tr>
  <tr class="sep-top"><td>Total Accountable</td><td style="text-align:right">${fmtW(accountable)}</td></tr>
</table>

<div class="summary-box" style="background:${shortBg};color:${shortColor};">
  <div class="s-label">${shortLabel}</div>
  <div class="s-amount">${shortVal}</div>
  <div style="font-size:7.5pt;margin-top:3pt">${isShort ? 'Cash is short vs. revolving fund' : isOver ? 'Cash exceeds revolving fund' : 'Cash matches revolving fund exactly'}</div>
</div>

<!-- REMARKS / NOTES -->
${record.notes ? `
<div class="section-title">REMARKS / NOTES</div>
<p style="font-size:8.5pt;padding:5pt 5pt;margin:0">${record.notes.replace(/\n/g, '<br/>')}</p>
` : ''}

<!-- SIGNATORIES -->
<div class="section-title">SIGNATORIES</div>
<table class="sig-table">
  <tr>
    <td>
      <div class="sig-label">Audited By:</div>
      <div class="sig-line">Fullname</div>
      <div class="sig-line">Job Position</div>
      <div class="sig-line">Department</div>
    </td>
    <td>
      <div class="sig-label">Noted By:</div>
      <div class="sig-line">Fullname</div>
      <div class="sig-line">Job Position</div>
      <div class="sig-line">Department</div>
    </td>
    <td>
      <div class="sig-label">Assisted By:</div>
      <div class="sig-line">Fullname</div>
      <div class="sig-line">Job Position</div>
      <div class="sig-line">Department</div>
    </td>
  </tr>
</table>

<div class="footer">
  Generated: ${new Date().toLocaleString('en-PH')} &nbsp;|&nbsp; ${record.tally_number || ''} &nbsp;|&nbsp; Great Sierra Development Corporation
</div>

</body>
</html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PCF_Tally_${record.tally_number || record.audit_date || 'export'}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}