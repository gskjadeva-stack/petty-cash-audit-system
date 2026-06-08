import { useState, useEffect } from 'react';
import { db } from '@/api/client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

const PALETTE = ['#1E3A5F', '#2563EB', '#0EA5E9', '#06B6D4', '#14B8A6', '#10B981', '#F59E0B', '#EF4444'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2">
      <p className="text-xs font-semibold text-slate-700">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs text-slate-500 mt-0.5">{p.name || 'Count'}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

export default function TrendAnalysis() {
  const [records, setRecords] = useState([]);
  const [siteOffices, setSiteOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ site: '', dateFrom: '', dateTo: '' });

  useEffect(() => {
    Promise.all([
      db.entities.PCARecord.list('-audit_date', 1000),
      db.entities.SiteOffice.list(),
    ]).then(([recs, sites]) => {
      setRecords(recs);
      setSiteOffices(sites);
      setLoading(false);
    });
  }, []);

  const filtered = records.filter(r => {
    if (filters.site && r.site_office !== filters.site) return false;
    if (filters.dateFrom && r.audit_date < filters.dateFrom) return false;
    if (filters.dateTo && r.audit_date > filters.dateTo) return false;
    return true;
  });

  const byClassif = Object.entries(
    filtered.reduce((acc, r) => { if (r.classification) acc[r.classification] = (acc[r.classification] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({
    name: name.length > 28 ? name.substring(0, 28) + '...' : name,
    count,
  }));

  const byMonth = Object.entries(
    filtered.reduce((acc, r) => {
      if (!r.audit_date) return acc;
      const m = r.audit_date.substring(0, 7);
      acc[m] = (acc[m] || 0) + 1;
      return acc;
    }, {})
  ).sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count }));

  const classifCounts = filtered.reduce((acc, r) => { if (r.classification) acc[r.classification] = (acc[r.classification] || 0) + 1; return acc; }, {});
  const systemic = Object.values(classifCounts).filter(c => c >= 3).reduce((a, b) => a + b, 0);
  const isolated = filtered.length - systemic;

  const sites = [...new Set(filtered.map(r => r.site_office).filter(Boolean))];
  const classifs = Object.keys(classifCounts).sort((a, b) => classifCounts[b] - classifCounts[a]).slice(0, 5);
  const heatmap = sites.map(site => {
    const row = { site };
    classifs.forEach(c => { row[c] = filtered.filter(r => r.site_office === site && r.classification === c).length; });
    return row;
  });
  const maxHeat = Math.max(1, ...heatmap.flatMap(r => classifs.map(c => r[c] || 0)));
  const heatCls = (v) => {
    const pct = v / maxHeat;
    if (pct === 0) return 'bg-slate-50 text-slate-300';
    if (pct < 0.25) return 'bg-sky-100 text-sky-700';
    if (pct < 0.5) return 'bg-amber-100 text-amber-700';
    if (pct < 0.75) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700 font-bold';
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 rounded-full animate-spin" style={{ borderTopColor: '#1E3A5F' }} />
    </div>
  );

  const Stat = ({ label, val, color }) => (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{val}</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Trend &amp; Pattern Analysis</h1>
        <p className="text-sm text-slate-400 mt-0.5">Systemic issue detection and enterprise-level pattern visibility</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">From</label>
          <input type="date" value={filters.dateFrom} onChange={e => setFilters(p => ({ ...p, dateFrom: e.target.value }))}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#1E3A5F]" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">To</label>
          <input type="date" value={filters.dateTo} onChange={e => setFilters(p => ({ ...p, dateTo: e.target.value }))}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#1E3A5F]" />
        </div>
        <select value={filters.site} onChange={e => setFilters(p => ({ ...p, site: e.target.value }))}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#1E3A5F]">
          <option value="">All Site Offices</option>
          {siteOffices.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
        <span className="ml-auto text-xs text-slate-400 font-medium">{filtered.length} records analyzed</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Analyzed" val={filtered.length} color="text-[#1E3A5F]" />
        <Stat label="Systemic Findings" val={systemic} color="text-red-600" />
        <Stat label="Isolated Findings" val={isolated} color="text-amber-600" />
        <Stat label="Classification Types" val={Object.keys(classifCounts).length} color="text-blue-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Findings by Classification</h2>
          {byClassif.length === 0 ? <p className="text-xs text-slate-400 py-8 text-center">No data available</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byClassif} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-10} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Monthly Finding Volume</h2>
          {byMonth.length === 0 ? <p className="text-xs text-slate-400 py-8 text-center">No data available</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={byMonth} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="count" stroke="#1E3A5F" strokeWidth={2.5} dot={{ r: 4, fill: '#1E3A5F' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Systemic vs. Isolated Ratio</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Systemic (3+ occurrences)', value: Math.max(0, systemic) },
                  { name: 'Isolated (fewer than 3)', value: Math.max(0, isolated) },
                ]}
                dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                <Cell fill="#EF4444" />
                <Cell fill="#94A3B8" />
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {heatmap.length > 0 && classifs.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">Finding Concentration Heat Map</h2>
          <p className="text-xs text-slate-400 mb-4">Site Office x Classification — darker cells indicate higher concentration</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-6 text-slate-500 font-semibold whitespace-nowrap">Site Office</th>
                  {classifs.map(c => (
                    <th key={c} className="px-3 py-2 text-center text-slate-500 font-medium">
                      <div className="truncate max-w-[110px]" title={c}>{c.length > 18 ? c.substring(0, 18) + '...' : c}</div>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center text-slate-500 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {heatmap.map(row => {
                  const total = classifs.reduce((s, c) => s + (row[c] || 0), 0);
                  return (
                    <tr key={row.site} className="border-t border-slate-100">
                      <td className="py-2.5 pr-6 font-semibold text-slate-700 whitespace-nowrap">{row.site}</td>
                      {classifs.map(c => (
                        <td key={c} className={`px-3 py-2.5 text-center rounded ${heatCls(row[c] || 0)}`}>{row[c] || 0}</td>
                      ))}
                      <td className="px-3 py-2.5 text-center font-bold text-slate-700">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {Object.entries(classifCounts).some(([, c]) => c > 1) && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Recurrence Timeline by Classification</h2>
          <div className="space-y-3">
            {Object.entries(classifCounts).filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-slate-700 font-medium">{name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{count} occurrences</span>
                    {count >= 3 && <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-700 rounded font-bold">SYSTEMIC</span>}
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ backgroundColor: count >= 3 ? '#EF4444' : '#F59E0B', width: `${Math.min(100, (count / filtered.length) * 100 * 3)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}