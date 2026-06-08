import { useState, useEffect } from 'react';
import { db } from '@/api/client';
import { Link, useNavigate } from 'react-router-dom';

import StatusBadge from '../components/StatusBadge';
import { Search, Download, Plus, SlidersHorizontal, X } from 'lucide-react';

export default function PCARecords() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [meta, setMeta] = useState({ classifications: [], siteOffices: [] });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState({ key: 'created_date', dir: -1 });
  const [filters, setFilters] = useState({
    search: '', status: '', classification: '',
    site_office: '', severity: '', ir_status: '', date_from: '', date_to: '',
  });

  useEffect(() => {
    Promise.all([
      db.entities.PCARecord.list('-created_date', 500),
      db.entities.Classification.list(),
      db.entities.SiteOffice.list(),
    ]).then(([recs, cls, sites]) => {
      setRecords(recs);
      setMeta({ classifications: cls, siteOffices: sites });
      setLoading(false);
    });
  }, []);

  const set = (key, val) => setFilters(p => ({ ...p, [key]: val }));
  const clearFilters = () => setFilters({ search: '', status: '', classification: '', site_office: '', severity: '', ir_status: '', date_from: '', date_to: '' });
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const filtered = records.filter(r => {
    const q = filters.search.toLowerCase();
    if (q && !r.title?.toLowerCase().includes(q) && !r.record_number?.toLowerCase().includes(q) && !r.description?.toLowerCase().includes(q)) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.classification && r.classification !== filters.classification) return false;
    if (filters.site_office && r.site_office !== filters.site_office) return false;
    if (filters.severity && r.severity !== filters.severity) return false;
    if (filters.ir_status && r.ir_status !== filters.ir_status) return false;
    if (filters.date_from && r.audit_date < filters.date_from) return false;
    if (filters.date_to && r.audit_date > filters.date_to) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sort.key] || '', bv = b[sort.key] || '';
    return sort.dir * (av > bv ? 1 : av < bv ? -1 : 0);
  });

  const toggleSort = (key) => setSort(prev => ({ key, dir: prev.key === key ? -prev.dir : -1 }));

  const exportCSV = () => {
    const headers = ['Record #', 'Title', 'Site Office', 'Classification', 'Status', 'Severity', 'Audit Date', 'IR Status', 'Amount'];
    const rows = sorted.map(r => [r.record_number, r.title, r.site_office, r.classification, r.status, r.severity, r.audit_date, r.ir_status, r.amount_involved || '']);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'pca_records.csv'; a.click();
  };

  const COL = [
    { key: 'record_number', label: 'Record #', w: 'w-28' },
    { key: 'title', label: 'Title', w: 'w-52' },
    { key: 'site_office', label: 'Site Office', w: 'w-36' },
    { key: 'classification', label: 'Classification', w: 'w-48' },
    { key: 'status', label: 'Status', w: 'w-28' },
    { key: 'audit_date', label: 'Audit Date', w: 'w-28' },
    { key: 'ir_status', label: 'IR Status', w: 'w-24' },
  ];

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 rounded-full animate-spin" style={{ borderTopColor: '#1E3A5F' }} />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">PCA Records</h1>
          <p className="text-sm text-slate-400 mt-0.5">{filtered.length} of {records.length} records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <Download size={13} /> Export CSV
          </button>
          <Link to="/records/new" className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white rounded-lg hover:opacity-90 transition-opacity" style={{ backgroundColor: '#1E3A5F' }}>
            <Plus size={13} /> New Record
          </Link>
        </div>
      </div>

      {/* Search + Filter bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:border-[#1E3A5F]"
              placeholder="Search by record number, title, or description…"
              value={filters.search}
              onChange={e => set('search', e.target.value)}
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border rounded-lg transition-colors ${showFilters ? 'border-[#1E3A5F] text-[#1E3A5F] bg-blue-50/30' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <SlidersHorizontal size={13} />
            Filters
            {activeFilterCount > 0 && <span className="w-4 h-4 rounded-full bg-[#1E3A5F] text-white text-[10px] flex items-center justify-center font-bold">{activeFilterCount}</span>}
          </button>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-2 py-2 text-xs text-slate-400 hover:text-slate-600">
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 pt-1 border-t border-slate-100">
            {[
              { key: 'status', label: 'Status', opts: ['Open', 'Under Review', 'Closed'] },
              { key: 'ir_status', label: 'IR Status', opts: ['Not Filed', 'Filed', 'N/A'] },
            ].map(({ key, label, opts }) => (
              <select key={key} value={filters[key]} onChange={e => set(key, e.target.value)}
                className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 focus:outline-none">
                <option value="">{label}</option>
                {opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ))}
            <select value={filters.classification} onChange={e => set('classification', e.target.value)}
              className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 focus:outline-none col-span-2">
              <option value="">Classification</option>
              {meta.classifications.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <select value={filters.site_office} onChange={e => set('site_office', e.target.value)}
              className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 focus:outline-none">
              <option value="">Site Office</option>
              {meta.siteOffices.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
            <div className="flex gap-1 items-center col-span-2">
              <input type="date" value={filters.date_from} onChange={e => set('date_from', e.target.value)}
                className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none" placeholder="From" />
              <span className="text-slate-300 text-xs">–</span>
              <input type="date" value={filters.date_to} onChange={e => set('date_to', e.target.value)}
                className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none" placeholder="To" />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {COL.map(c => (
                  <th key={c.key} onClick={() => toggleSort(c.key)}
                    className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:text-slate-600 select-none">
                    {c.label}
                    {sort.key === c.key && <span className="ml-1">{sort.dir === -1 ? '↓' : '↑'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map(r => (
                <tr key={r.id} onClick={() => navigate(`/records/${r.id}`)}
                  className="hover:bg-blue-50/30 transition-colors cursor-pointer group">
                  <td className="px-4 py-3 font-bold text-xs whitespace-nowrap" style={{ color: '#1E3A5F' }}>{r.record_number}</td>
                  <td className="px-4 py-3 max-w-[200px]"><div className="text-xs text-slate-700 truncate font-medium">{r.title}</div></td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{r.site_office}</td>
                  <td className="px-4 py-3 max-w-[180px]"><div className="text-xs text-slate-500 truncate">{r.classification}</div></td>
                  <td className="px-4 py-3 whitespace-nowrap"><StatusBadge value={r.status} dot /></td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap font-mono">{r.audit_date}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><StatusBadge value={r.ir_status} /></td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400 text-sm">No records match the current filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}