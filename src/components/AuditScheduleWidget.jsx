import { useState, useEffect } from 'react';
import { db } from '@/api/client';

import { format, differenceInDays, parseISO, addMonths, addDays } from 'date-fns';
import { Calendar, CheckCircle2, AlertTriangle, Plus, X, ArrowRight } from 'lucide-react';

const STATUS_STYLE = {
  Scheduled:    'bg-blue-50 text-blue-700 border-blue-200',
  'In Progress':'bg-amber-50 text-amber-700 border-amber-200',
  Completed:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  Missed:       'bg-red-50 text-red-700 border-red-200',
  Rescheduled:  'bg-purple-50 text-purple-700 border-purple-200',
};

const FREQUENCIES = ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'One-time'];
const STATUSES = ['Scheduled', 'In Progress', 'Completed', 'Missed', 'Rescheduled'];

/**
 * Calculate the next audit date from a scheduled date and frequency.
 * Always adds one frequency period to the scheduled_date regardless of status.
 * Returns null for One-time frequency.
 */
function calcNextDate(scheduledDate, frequency) {
  const base = parseISO(scheduledDate);
  switch (frequency) {
    case 'Monthly':     return addMonths(base, 1);
    case 'Quarterly':   return addMonths(base, 3);
    case 'Semi-Annual': return addMonths(base, 6);
    case 'Annual':      return addMonths(base, 12);
    case 'One-time':    return null;
    default:            return addMonths(base, 1);
  }
}

function DaysBadge({ date }) {
  const diff = differenceInDays(date, new Date());
  if (diff < 0)  return <span className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">{Math.abs(diff)}d overdue</span>;
  if (diff === 0) return <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">Today</span>;
  if (diff <= 7)  return <span className="text-[10px] font-bold text-amber-500 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">In {diff}d</span>;
  return <span className="text-[10px] text-slate-400">In {diff}d</span>;
}

export default function AuditScheduleWidget({ siteOffices }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ site_office: '', scheduled_date: '', frequency: 'Monthly', assigned_auditor: '', status: 'Scheduled', notes: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    db.entities.AuditSchedule.list('scheduled_date', 100).then(data => {
      setSchedules(data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const openAdd = (prefillSite = '') => {
    setForm({ site_office: prefillSite, scheduled_date: '', frequency: 'Monthly', assigned_auditor: '', status: 'Scheduled', notes: '', reason: '' });
    setEditId(null);
    setShowAdd(true);
  };

  const openEdit = (s) => {
    setForm({
      site_office: s.site_office || '',
      scheduled_date: s.scheduled_date || '',
      frequency: s.frequency || 'Monthly',
      assigned_auditor: s.assigned_auditor || '',
      status: s.status || 'Scheduled',
      notes: s.notes || '',
      reason: s.reason || '',
    });
    setEditId(s.id);
    setShowAdd(true);
  };

  const save = async () => {
    if (!form.site_office || !form.scheduled_date) return;
    setSaving(true);
    if (editId) {
      await db.entities.AuditSchedule.update(editId, form);
    } else {
      await db.entities.AuditSchedule.create(form);
    }
    setSaving(false);
    setShowAdd(false);
    load();
  };

  const del = async (id) => {
    await db.entities.AuditSchedule.delete(id);
    load();
  };

  const upcoming = schedules.filter(s => s.status !== 'Completed').sort((a, b) => a.scheduled_date > b.scheduled_date ? 1 : -1);
  const completed = schedules.filter(s => s.status === 'Completed').sort((a, b) => a.scheduled_date < b.scheduled_date ? 1 : -1);

  // Sites with no non-completed schedule entry
  const scheduledSites = new Set(upcoming.map(s => s.site_office));
  const pendingSites = siteOffices.filter(s => s.is_active && !scheduledSites.has(s.name));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between" style={{ backgroundColor: '#1E3A5F' }}>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-white/70" />
          <h2 className="font-semibold text-white text-sm">Audit Schedule</h2>
        </div>
        <button onClick={() => openAdd()} className="flex items-center gap-1 text-[11px] font-semibold text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg">
          <Plus size={11} /> Schedule
        </button>
      </div>

      {/* Add / Edit Form */}
      {showAdd && (
        <div className="border-b border-slate-100 p-4 bg-slate-50 space-y-3">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">{editId ? 'Edit Schedule' : 'New Schedule'}</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Site Office *</label>
              <select className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1E3A5F]"
                value={form.site_office} onChange={e => setForm(p => ({ ...p, site_office: e.target.value }))}>
                <option value="">Select…</option>
                {siteOffices.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Frequency</label>
              <select className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1E3A5F]"
                value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))}>
                {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Scheduled Date *</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1E3A5F]"
                value={form.scheduled_date} onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Auditor</label>
              <input type="text" placeholder="Assigned auditor" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1E3A5F]"
                value={form.assigned_auditor} onChange={e => setForm(p => ({ ...p, assigned_auditor: e.target.value }))} />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Status</label>
              <select className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1E3A5F]"
                value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Reason / Notes</label>
              <textarea rows={2} placeholder="Reason for scheduling, special instructions, or remarks…"
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1E3A5F] resize-none"
                value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving || !form.site_office || !form.scheduled_date}
              className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg disabled:opacity-50"
              style={{ backgroundColor: '#1E3A5F' }}>
              {saving ? 'Saving…' : editId ? 'Update' : 'Add Schedule'}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-4 border-slate-200 rounded-full animate-spin" style={{ borderTopColor: '#1E3A5F' }} />
        </div>
      ) : (
        <div className="max-h-[480px] overflow-y-auto divide-y divide-slate-50">
          {upcoming.length === 0 && pendingSites.length === 0 && completed.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              No schedules yet. Click <strong>Schedule</strong> to add one.
            </div>
          )}

          {/* Upcoming / Active */}
          {upcoming.map(s => {
            const nextDate = calcNextDate(s.scheduled_date, s.frequency);
            return (
              <div key={s.id} className="px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => openEdit(s)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-800 truncate">{s.site_office}</span>
                      <span className={`text-[10px] border rounded-full px-1.5 py-0.5 font-semibold ${STATUS_STYLE[s.status]}`}>{s.status}</span>
                      {nextDate && <DaysBadge date={nextDate} />}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-400">
                        <span className="font-medium text-slate-500">Scheduled:</span> {format(parseISO(s.scheduled_date), 'MMM d, yyyy')}
                      </span>
                      {nextDate && (
                        <>
                          <ArrowRight size={9} className="text-slate-300" />
                          <span className="text-[11px] font-semibold" style={{ color: '#1E3A5F' }}>
                            Next: {format(nextDate, 'MMM d, yyyy')}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400">{s.frequency}</span>
                      {s.assigned_auditor && <span className="text-[10px] text-slate-400">· {s.assigned_auditor}</span>}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); del(s.id); }}
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all flex-shrink-0 mt-0.5">
                    <X size={12} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Pending Sites (no schedule at all) */}
          {pendingSites.length > 0 && (
            <>
              <div className="px-4 py-2 bg-amber-50/60">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest flex items-center gap-1.5">
                  <AlertTriangle size={10} /> {pendingSites.length} Site{pendingSites.length > 1 ? 's' : ''} Not Yet Scheduled
                </p>
              </div>
              {pendingSites.map(s => (
                <div key={s.id} className="px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50">
                  <div>
                    <span className="text-xs font-semibold text-slate-600">{s.name}</span>
                    {s.region && <span className="text-[10px] text-slate-400 ml-2">{s.region}</span>}
                  </div>
                  <button onClick={() => openAdd(s.name)}
                    className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-[#1E3A5F] hover:text-[#1E3A5F] transition-colors">
                    + Schedule
                  </button>
                </div>
              ))}
            </>
          )}

          {/* Completed — show next cycle date */}
          {completed.length > 0 && (
            <>
              <div className="px-4 py-2 bg-emerald-50/60">
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-1.5">
                  <CheckCircle2 size={10} /> {completed.length} Completed
                </p>
              </div>
              {completed.slice(0, 5).map(s => {
                const nextDate = calcNextDate(s.scheduled_date, s.frequency);
                return (
                  <div key={s.id} className="px-4 py-2.5 opacity-60 hover:opacity-80 cursor-pointer transition-opacity" onClick={() => openEdit(s)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-600">{s.site_office}</span>
                      <span className="text-[10px] text-slate-400">{format(parseISO(s.scheduled_date), 'MMM d, yyyy')}</span>
                      {nextDate && (
                        <>
                          <ArrowRight size={9} className="text-slate-300" />
                          <span className="text-[10px] font-bold text-slate-500">Next: {format(nextDate, 'MMM d, yyyy')}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}