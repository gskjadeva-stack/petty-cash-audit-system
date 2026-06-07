import { useState, useEffect } from 'react';
import { db } from '@/api/client';
import { Link } from 'react-router-dom';

import KPICard from '../components/KPICard';
import StatusBadge from '../components/StatusBadge';
import { FileText, Clock, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';
import AuditScheduleWidget from '../components/AuditScheduleWidget';
import IRStatusWidget from '../components/IRStatusWidget';

export default function Dashboard() {
  const [records, setRecords] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [siteOffices, setSiteOffices] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    Promise.all([
      db.entities.PCARecord.list('-created_date', 200),
      db.entities.Notification.list('-created_date', 10),
      db.entities.SiteOffice.list('name', 200),
    ]).then(([recs, notifs, sites]) => {
      setRecords(recs);
      setNotifications(notifs);
      setSiteOffices(sites);
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []);

  const now = new Date();
  const kpis = {
    total: records.length,
    open: records.filter(r => r.status === 'Open').length,
    escalated: records.filter(r => r.status === 'Escalated').length,
    closedMonth: records.filter(r => {
      if (r.status !== 'Closed') return false;
      const d = new Date(r.updated_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
  };

  // Distribution by classification for quick view
  const byClass = records.reduce((acc, r) => {
    if (r.classification) acc[r.classification] = (acc[r.classification] || 0) + 1;
    return acc;
  }, {});
  const topClass = Object.entries(byClass).sort((a, b) => b[1] - a[1]).slice(0, 4);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 rounded-full animate-spin" style={{ borderTopColor: '#1E3A5F' }} />
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-0.5">Petty Cash Audit — Enterprise Overview</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Records" value={kpis.total} icon={FileText} variant="navy" />
        <KPICard title="Open" value={kpis.open} icon={Clock} variant="blue" subtitle="Awaiting action" />
        <KPICard title="Escalated" value={kpis.escalated} icon={TrendingUp} variant="amber" subtitle="Requires attention" />
        <KPICard title="Closed This Month" value={kpis.closedMonth} icon={CheckCircle2} variant="green" subtitle="Resolved" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: IR Status */}
        <div className="xl:col-span-2 space-y-6">
          <IRStatusWidget records={records} siteOffices={siteOffices} onRecordUpdated={loadData} />

          {/* Top Classifications */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 text-sm mb-4">Top Classifications</h2>
            <div className="space-y-3">
              {topClass.length === 0 && <p className="text-xs text-slate-400">No data yet</p>}
              {topClass.map(([name, count]) => (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-slate-600 font-medium truncate pr-2">{name}</p>
                    <span className="text-xs font-bold text-slate-700">{count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ backgroundColor: '#1E3A5F', width: `${Math.min(100, (count / kpis.total) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Audit Schedule */}
          <AuditScheduleWidget siteOffices={siteOffices} />

          {/* Notifications */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800 text-sm">Recent Alerts</h2>
            </div>
            <div className="divide-y divide-slate-50 max-h-56 overflow-y-auto">
              {notifications.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">No recent alerts</p>
              )}
              {notifications.map(n => (
                <div key={n.id} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${n.type === 'Critical' ? 'bg-red-500' : n.type === 'Warning' ? 'bg-amber-500' : n.type === 'Escalation' ? 'bg-red-400' : 'bg-blue-400'}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700">{n.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{n.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}