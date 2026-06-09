import { useState, useEffect } from 'react';
import { db } from '@/api/client';
import { buildReportData, generateAuditPDF, generateAuditWord, NO_DATA } from '@/utils/pcaAuditReportGenerator';
import ReportDocumentPreview from '@/components/ReportDocumentPreview';
import { FileDown, FileText, AlertCircle, AlertTriangle } from 'lucide-react';

export default function Reports() {
  const [pcaRecords, setPcaRecords] = useState([]);
  const [pcfRecords, setPcfRecords] = useState([]);
  const [disbursements, setDisbursements] = useState([]);
  const [siteOffices, setSiteOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ site: '', dateFrom: '', dateTo: '' });
  const [reportData, setReportData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([
      db.entities.PCARecord.list('-audit_date', 2000),
      db.entities.PCFCashCount.list('-audit_date', 500),
      db.entities.PCFDisbursement.list('-date', 5000),
      db.entities.SiteOffice.list(),
    ]).then(([pca, pcf, disbs, sites]) => {
      setPcaRecords(pca);
      setPcfRecords(pcf);
      setDisbursements(disbs);
      setSiteOffices(sites);
      setLoading(false);
    });
  }, []);

  const findPcfForSite = (site, dateFrom, dateTo) => {
    const matches = pcfRecords.filter(r => {
      if (r.site_office !== site) return false;
      if (dateFrom && r.audit_date < dateFrom) return false;
      if (dateTo && r.audit_date > dateTo) return false;
      return true;
    });
    return matches.sort((a, b) => (b.audit_date || '').localeCompare(a.audit_date || ''))[0] || null;
  };

  const generate = () => {
    if (!filters.site) return;
    setGenerating(true);
    const pcf = findPcfForSite(filters.site, filters.dateFrom, filters.dateTo);
    const disbs = pcf ? disbursements.filter(d => d.cash_count_id === pcf.id) : [];
    const data = buildReportData({
      siteOffice: filters.site,
      pcaRecords,
      pcfRecord: pcf,
      disbursements: disbs,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });
    setReportData(data);
    setGenerating(false);
  };

  const exportPDF = async () => {
    if (!reportData) return;
    setExporting(true);
    try { await generateAuditPDF(reportData); } finally { setExporting(false); }
  };

  const exportWord = () => {
    if (!reportData) return;
    generateAuditWord(reportData);
  };

  const fundSummaryMissing = reportData && !reportData.fundSummary.hasPcfTally;

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 rounded-full animate-spin" style={{ borderTopColor: '#1E3A5F' }} />
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Reports</h1>
        <p className="text-sm text-slate-400 mt-0.5">Generate Petty Cash Fund Audit Report per site office</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Report Filters</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Site Office *</label>
            <select value={filters.site} onChange={e => { setFilters(p => ({ ...p, site: e.target.value })); setReportData(null); }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1E3A5F]">
              <option value="">Select site office…</option>
              {siteOffices.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">From</label>
            <input type="date" value={filters.dateFrom} onChange={e => { setFilters(p => ({ ...p, dateFrom: e.target.value })); setReportData(null); }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1E3A5F]" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">To</label>
            <input type="date" value={filters.dateTo} onChange={e => { setFilters(p => ({ ...p, dateTo: e.target.value })); setReportData(null); }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1E3A5F]" />
          </div>
        </div>
        <p className="text-[10px] text-slate-400 flex items-start gap-1.5">
          <AlertCircle size={11} className="mt-0.5 flex-shrink-0" />
          Finding sections populate from PCA Records whose Classification matches template section names. Fund summary uses the most recent PCF Tally for the selected site. Missing fields display {NO_DATA}.
        </p>
        <button onClick={generate} disabled={!filters.site || generating}
          className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#1E3A5F' }}>
          {generating ? 'Generating…' : '▶ Generate Report'}
        </button>
      </div>

      {!reportData ? (
        <div className="bg-white border border-slate-200 rounded-xl h-64 flex items-center justify-center">
          <div className="text-center">
            <FileText size={36} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm text-slate-400">Select a site office and generate the audit report</p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-semibold text-slate-800 text-sm">Petty Cash Fund Audit Report — GSDC {reportData.siteOffice}</h2>
              <p className="text-xs text-slate-400">
                As of {reportData.auditAsOf} · {reportData.annexRecords.length} PCA record{reportData.annexRecords.length !== 1 ? 's' : ''}
                {reportData.pcfRecord
                  ? ` · PCF Tally ${reportData.pcfTallyNumber || reportData.pcfRecord.id.slice(0, 8)}`
                  : ' · No PCF Tally in range'}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={exportWord} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50">
                <FileDown size={12} /> Export Word
              </button>
              <button onClick={exportPDF} disabled={exporting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#1E3A5F' }}>
                <FileDown size={12} /> {exporting ? 'Exporting…' : 'Export PDF'}
              </button>
            </div>
          </div>

          {(fundSummaryMissing || reportData.discrepancies?.length > 0) && (
            <div className="px-5 py-3 border-b border-amber-100 bg-amber-50 space-y-2">
              {fundSummaryMissing && (
                <p className="text-xs text-amber-800 flex items-start gap-1.5">
                  <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                  Fund summary requires a PCF Tally for the selected site and date range. Fund summary fields will show {NO_DATA}.
                </p>
              )}
              {reportData.discrepancies?.length > 0 && (
                <p className="text-xs text-amber-800 flex items-start gap-1.5">
                  <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                  <span><strong>Discrepancies noted:</strong> {reportData.discrepancies.join('; ')}</span>
                </p>
              )}
            </div>
          )}

          <div className="p-5 max-h-[600px] overflow-y-auto bg-white">
            <ReportDocumentPreview data={reportData} />
          </div>
        </div>
      )}
    </div>
  );
}
