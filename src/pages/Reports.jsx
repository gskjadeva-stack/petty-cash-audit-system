import { useState, useEffect } from 'react';
import { db } from '@/api/client';

import StatusBadge from '../components/StatusBadge';
import { FileDown, Clock, RefreshCw, CheckSquare, AlertTriangle, TrendingUp, Activity, BarChart2 } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import jsPDF from 'jspdf';

const REPORTS = [
  { id: 'aging', label: 'Aging Report', icon: Clock, desc: 'Open issues by duration (0–30, 31–60, 61–90, 90+ days)' },
  { id: 'status', label: 'Status Summary', icon: CheckSquare, desc: 'All issues by current status with counts' },
  { id: 'recurrence', label: 'Recurrence Report', icon: RefreshCw, desc: 'Recurring issues with frequency analysis' },
  { id: 'escalation', label: 'Escalation Report', icon: AlertTriangle, desc: 'Issues that triggered escalation' },
  { id: 'trend', label: 'Trend Report', icon: TrendingUp, desc: 'Longitudinal analysis over time' },
  { id: 'sla', label: 'SLA Performance', icon: Activity, desc: 'Resolution vs. defined service-level agreements' },
];

const COLS = {
  aging: ['record_number', 'title', 'site_office', 'classification', 'status', 'aging_days', 'aging_bucket'],
  status: ['status', 'count', 'pct'],
  recurrence: ['classification', 'frequency', 'pattern'],
  escalation: ['record_number', 'title', 'site_office', 'status', 'escalation_level'],
  trend: ['record_number', 'title', 'audit_date', 'classification', 'category', 'status'],
  sla: ['record_number', 'title', 'site_office', 'sla_due_date', 'status', 'sla_breached', 'days_to_sla'],
};

export default function Reports() {
  const [type, setType] = useState('aging');
  const [records, setRecords] = useState([]);
  const [meta, setMeta] = useState({ sites: [], classifications: [] });
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', site: '', classification: '', status: '' });

  useEffect(() => {
    Promise.all([
      db.entities.PCARecord.list('-created_date', 1000),
      db.entities.SiteOffice.list(),
      db.entities.Classification.list(),
    ]).then(([recs, sites, cls]) => {
      setRecords(recs);
      setMeta({ sites, classifications: cls });
      setLoading(false);
    });
  }, []);

  const applyFilters = (recs) => recs.filter(r => {
    if (filters.dateFrom && r.audit_date < filters.dateFrom) return false;
    if (filters.dateTo && r.audit_date > filters.dateTo) return false;
    if (filters.site && r.site_office !== filters.site) return false;
    if (filters.classification && r.classification !== filters.classification) return false;
    if (filters.status && r.status !== filters.status) return false;
    return true;
  });

  const generate = () => {
    setGenerating(true);
    const base = applyFilters(records);
    const today = new Date();
    let data = [];

    if (type === 'aging') {
      data = base.filter(r => r.status !== 'Closed').map(r => {
        const days = differenceInDays(today, new Date(r.audit_date || today));
        const bucket = days <= 30 ? '0–30 days' : days <= 60 ? '31–60 days' : days <= 90 ? '61–90 days' : '90+ days';
        return { record_number: r.record_number, title: r.title, site_office: r.site_office, classification: r.classification, status: r.status, aging_days: days, aging_bucket: bucket };
      }).sort((a, b) => b.aging_days - a.aging_days);
    } else if (type === 'status') {
      const counts = base.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
      data = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([status, count]) => ({
        status, count, pct: base.length ? ((count / base.length) * 100).toFixed(1) + '%' : '0%'
      }));
    } else if (type === 'recurrence') {
      const cc = base.reduce((acc, r) => { if (r.classification) acc[r.classification] = (acc[r.classification] || 0) + 1; return acc; }, {});
      data = Object.entries(cc).filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]).map(([classification, frequency]) => ({
        classification, frequency, pattern: frequency >= 3 ? 'Systemic' : 'Recurring'
      }));
    } else if (type === 'escalation') {
      data = base.filter(r => r.status === 'Escalated' || (r.escalation_level || 0) > 0).map(r => ({
        record_number: r.record_number, title: r.title, site_office: r.site_office,
        status: r.status, escalation_level: r.escalation_level || 0, severity: r.severity
      }));
    } else if (type === 'sla') {
      const todayStr = today.toISOString().split('T')[0];
      data = base.map(r => ({
        record_number: r.record_number, title: r.title, site_office: r.site_office,
        sla_due_date: r.sla_due_date || '—', status: r.status,
        sla_breached: r.sla_due_date && r.status !== 'Closed' && r.sla_due_date < todayStr ? 'Yes' : 'No',
        days_to_sla: r.sla_due_date ? differenceInDays(new Date(r.sla_due_date), today) : '—',
      }));
    } else {
      data = base.map(r => ({
        record_number: r.record_number, title: r.title, audit_date: r.audit_date,
        classification: r.classification, category: r.category, status: r.status, severity: r.severity,
      }));
    }

    setResults(data);
    setGenerating(false);
  };

  const exportCSV = () => {
    if (!results?.length) return;
    const cols = COLS[type] || [];
    const csv = [cols, ...results.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`))]
      .map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `pca_${type}_report.csv`; a.click();
  };

  const exportPDF = () => {
    if (!results?.length) return;
    const doc = new jsPDF();
    const rpt = REPORTS.find(r => r.id === type);
    doc.setFontSize(16); doc.setTextColor(30, 58, 95);
    doc.text(`PCA Audit — ${rpt?.label}`, 14, 22);
    doc.setFontSize(9); doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleString()} | Records: ${results.length}`, 14, 30);
    doc.setTextColor(30, 41, 59);
    let y = 42;
    const cols = COLS[type] || [];
    results.slice(0, 40).forEach((row, i) => {
      if (y > 275) { doc.addPage(); y = 20; }
      const line = cols.slice(0, 5).map(c => `${c.replace(/_/g, ' ')}: ${row[c] ?? '—'}`).join(' | ');
      doc.setFontSize(8);
      doc.text(`${i + 1}. ${line}`.substring(0, 190), 14, y);
      y += 6;
    });
    doc.save(`pca_${type}_report.pdf`);
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 rounded-full animate-spin" style={{ borderTopColor: '#1E3A5F' }} />
    </div>
  );

  const cols = COLS[type] || [];

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Reports</h1>
        <p className="text-sm text-slate-400 mt-0.5">Generate standard reports for operational monitoring and compliance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left panel */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Report Type</p>
            </div>
            <div className="p-2 space-y-1">
              {REPORTS.map(rpt => (
                <button key={rpt.id} onClick={() => { setType(rpt.id); setResults(null); }}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-150 ${type === rpt.id ? 'text-white' : 'hover:bg-slate-50 text-slate-700'}`}
                  style={type === rpt.id ? { backgroundColor: '#1E3A5F' } : {}}>
                  <div className="flex items-center gap-2">
                    <rpt.icon size={13} />
                    <span className="text-xs font-semibold">{rpt.label}</span>
                  </div>
                  <p className={`text-[10px] mt-0.5 leading-tight ${type === rpt.id ? 'text-white/60' : 'text-slate-400'}`}>{rpt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Filters</p>
            {[{ k: 'dateFrom', l: 'From', t: 'date' }, { k: 'dateTo', l: 'To', t: 'date' }].map(f => (
              <div key={f.k}>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">{f.l}</label>
                <input type={f.t} value={filters[f.k]} onChange={e => setFilters(p => ({ ...p, [f.k]: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#1E3A5F]" />
              </div>
            ))}
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Site Office</label>
              <select value={filters.site} onChange={e => setFilters(p => ({ ...p, site: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                <option value="">All</option>
                {meta.sites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Status</label>
              <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                <option value="">All</option>
                {['Open', 'Under Review', 'Closed', 'Reopened', 'Escalated', 'Overdue'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <button onClick={generate} disabled={generating}
              className="w-full py-2 text-xs font-semibold text-white rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#1E3A5F' }}>
              {generating ? 'Generating…' : '▶ Generate Report'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          {!results ? (
            <div className="bg-white border border-slate-200 rounded-xl h-80 flex items-center justify-center">
              <div className="text-center">
                <BarChart2 size={36} className="mx-auto text-slate-200 mb-3" />
                <p className="text-sm text-slate-400 font-medium">Select a report type and generate</p>
                <p className="text-xs text-slate-300 mt-1">Results will appear here</p>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-800 text-sm">{REPORTS.find(r => r.id === type)?.label}</h2>
                  <p className="text-xs text-slate-400">{results.length} record{results.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50">
                    <FileDown size={12} /> CSV
                  </button>
                  <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90" style={{ backgroundColor: '#1E3A5F' }}>
                    <FileDown size={12} /> PDF
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      {cols.map(c => (
                        <th key={c} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                          {c.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        {cols.map(c => (
                          <td key={c} className="px-4 py-2.5 text-slate-700">
                            {(c === 'status' || c === 'severity') && row[c] ? (
                              <StatusBadge value={String(row[c])} />
                            ) : (
                              <span className="max-w-[180px] truncate block">{row[c] ?? '—'}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}