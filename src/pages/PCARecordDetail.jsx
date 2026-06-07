import { useState, useEffect } from 'react';
import { db } from '@/api/client';
import { useParams, useNavigate } from 'react-router-dom';

import StatusBadge from '../components/StatusBadge';
import ActivityFeed from '../components/ActivityFeed';
import CommentThread from '../components/CommentThread';
import { ArrowLeft, ChevronDown } from 'lucide-react';

const STATUS_OPTIONS = ['Open', 'Under Review', 'Closed'];
const TABS = ['Overview', 'Comments', 'Activity'];

export default function PCARecordDetail() {
  const { recordId } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [comments, setComments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [statusMenu, setStatusMenu] = useState(false);

  useEffect(() => {
    db.auth.me().then(setUser).catch(() => {});
    load();
  }, [recordId]);

  async function load() {
    const [recs, comms, actLogs] = await Promise.all([
      db.entities.PCARecord.filter({ id: recordId }),
      db.entities.Comment.filter({ pca_record_id: recordId }, 'created_date'),
      db.entities.ActivityLog.filter({ pca_record_id: recordId }, '-created_date'),
    ]);
    setRecord(recs[0] || null);
    setComments(comms);
    setLogs(actLogs);
    setLoading(false);
  }

  async function changeStatus(newStatus) {
    const old = record.status;
    const updated = { status: newStatus };
    if (newStatus === 'Escalated') updated.escalation_level = (record.escalation_level || 0) + 1;
    if (newStatus === 'Closed' && !record.resolution_date) updated.resolution_date = new Date().toISOString().split('T')[0];
    await db.entities.PCARecord.update(recordId, updated);
    await db.entities.ActivityLog.create({
      pca_record_id: recordId,
      action_type: 'Status Change',
      description: `Status changed: ${old} → ${newStatus}`,
      actor_name: user?.full_name || 'User',
      actor_role: user?.role || '',
      old_value: old,
      new_value: newStatus,
    });
    await db.entities.Notification.create({
      type: newStatus === 'Escalated' ? 'Escalation' : newStatus === 'Overdue' ? 'Warning' : 'Informational',
      title: `Status Update: ${record.record_number}`,
      message: `${record.record_number} status changed to ${newStatus}`,
      is_read: false,
      related_record_id: recordId,
      trigger_event: 'Status Change',
    });
    setStatusMenu(false);
    load();
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 rounded-full animate-spin" style={{ borderTopColor: '#1E3A5F' }} />
    </div>
  );

  if (!record) return <div className="text-center py-12 text-slate-400">Record not found.</div>;

  const today = new Date();

  const INFO = [
    { label: 'Site Office', value: record.site_office },
    { label: 'Audit Date', value: record.audit_date },
    { label: 'Classification', value: record.classification },
    { label: 'Issue Type', value: record.issue_type || '—' },
    { label: 'Assigned To', value: record.assigned_to || '—' },
    { label: 'IR Status', value: record.ir_status },
    { label: 'Amount Involved', value: record.amount_involved ? `₱${Number(record.amount_involved).toLocaleString()}` : '—' },
    { label: 'Resolution Date', value: record.resolution_date || '—' },
    { label: 'Is Recurring', value: record.is_recurring ? 'Yes' : 'No' },
  ];

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div>
        <button onClick={() => navigate('/records')} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 mb-3 transition-colors">
          <ArrowLeft size={13} /> Back to PCA Records
        </button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-lg font-bold tracking-tight" style={{ color: '#1E3A5F' }}>{record.record_number}</span>
              <StatusBadge value={record.status} dot size="md" />
            </div>
            <p className="text-slate-700 font-semibold mt-1.5">{record.title}</p>
          </div>
          <div className="relative">
            <button onClick={() => setStatusMenu(!statusMenu)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              Change Status <ChevronDown size={12} />
            </button>
            {statusMenu && (
              <div className="absolute right-0 top-9 bg-white border border-slate-200 rounded-xl shadow-xl z-20 w-40 overflow-hidden">
                {STATUS_OPTIONS.map(s => (
                  <button key={s} onClick={() => changeStatus(s)}
                    className="block w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 transition-colors font-medium text-slate-700 first:rounded-t-xl last:rounded-b-xl">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        {INFO.map(({ label, value }) => (
          <div key={label}>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">{label}</p>
            <p className="text-sm text-slate-700 font-medium">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium transition-all ${activeTab === tab ? 'border-b-2 font-semibold' : 'text-slate-500 hover:text-slate-700'}`}
              style={activeTab === tab ? { color: '#1E3A5F', borderBottomColor: '#1E3A5F' } : {}}>
              {tab}
              {tab === 'Comments' && comments.length > 0 && (
                <span className="ml-1.5 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-semibold">{comments.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'Overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Description</h3>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{record.description || '—'}</p>
              </div>
              {record.corrective_action && (
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Corrective Action</h3>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{record.corrective_action}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Comments' && (
            <CommentThread recordId={recordId} comments={comments} user={user} onRefresh={load} />
          )}

          {activeTab === 'Activity' && (
            <ActivityFeed logs={logs} />
          )}
        </div>
      </div>
    </div>
  );
}