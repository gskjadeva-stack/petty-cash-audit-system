/** Shared styles matching PETTY CASH FUND AUDIT REPORT (Template).docx */
export const REPORT_TEMPLATE_STYLES = {
  navy: '#1E3A5F',
  bodyColor: '#1a1a1a',
  mutedColor: '#282828',
  tableHeaderBg: '#e6ecf5',
  tableBorder: '#ccc',
  fontFamily: 'Calibri, Arial, sans-serif',
  titleSize: '14pt',
  subtitleSize: '11pt',
  sectionSize: '10pt',
  bodySize: '9pt',
  annexSize: '8pt',
};

export const REPORT_PREVIEW_CSS = `
  .report-doc {
    font-family: ${REPORT_TEMPLATE_STYLES.fontFamily};
    font-size: ${REPORT_TEMPLATE_STYLES.bodySize};
    color: ${REPORT_TEMPLATE_STYLES.bodyColor};
    line-height: 1.4;
  }
  .report-doc-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12pt;
    margin-bottom: 8pt;
  }
  .report-doc-header img { height: 50pt; object-fit: contain; }
  .report-doc h1 {
    font-size: ${REPORT_TEMPLATE_STYLES.titleSize};
    color: ${REPORT_TEMPLATE_STYLES.navy};
    text-align: center;
    margin: 0;
    font-weight: bold;
  }
  .report-doc h2 {
    font-size: ${REPORT_TEMPLATE_STYLES.subtitleSize};
    color: ${REPORT_TEMPLATE_STYLES.navy};
    text-align: center;
    margin: 4pt 0 0 0;
    font-weight: normal;
  }
  .report-doc hr {
    border: none;
    border-top: 1.5pt solid ${REPORT_TEMPLATE_STYLES.navy};
    margin: 10pt 0;
  }
  .report-doc .section {
    font-size: ${REPORT_TEMPLATE_STYLES.sectionSize};
    font-weight: bold;
    color: ${REPORT_TEMPLATE_STYLES.navy};
    margin: 12pt 0 4pt 0;
  }
  .report-doc p { font-size: ${REPORT_TEMPLATE_STYLES.bodySize}; margin: 0 0 6pt 0; }
  .report-doc ul { margin: 4pt 0; padding-left: 18pt; }
  .report-doc li { font-size: ${REPORT_TEMPLATE_STYLES.bodySize}; margin-bottom: 3pt; }
  .report-doc .finding-title {
    font-weight: bold;
    margin: 8pt 0 3pt 0;
    font-size: ${REPORT_TEMPLATE_STYLES.bodySize};
    color: ${REPORT_TEMPLATE_STYLES.mutedColor};
  }
  .report-doc .finding-text { margin: 0 0 6pt 12pt; font-size: ${REPORT_TEMPLATE_STYLES.bodySize}; }
  .report-doc .fund-table {
    border-collapse: collapse;
    width: 100%;
    margin: 6pt 0;
  }
  .report-doc .fund-table th,
  .report-doc .fund-table td {
    border: 0.5pt solid ${REPORT_TEMPLATE_STYLES.tableBorder};
    padding: 4pt 6pt;
    font-size: ${REPORT_TEMPLATE_STYLES.bodySize};
  }
  .report-doc .fund-table th {
    background: ${REPORT_TEMPLATE_STYLES.tableHeaderBg};
    color: ${REPORT_TEMPLATE_STYLES.navy};
    font-weight: bold;
  }
  .report-doc .annex-table {
    border-collapse: collapse;
    width: 100%;
    font-size: ${REPORT_TEMPLATE_STYLES.annexSize};
  }
  .report-doc .annex-table th,
  .report-doc .annex-table td {
    padding: 2pt 5pt;
    border-bottom: 0.5pt solid #eee;
    text-align: left;
  }
  .report-doc .annex-table th {
    background: ${REPORT_TEMPLATE_STYLES.tableHeaderBg};
    color: ${REPORT_TEMPLATE_STYLES.navy};
    font-weight: bold;
  }
`;
