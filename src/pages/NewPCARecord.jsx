import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/api/client';
import AmountInput from '@/components/AmountInput';

import { AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

const INITIAL = {
  title: '', site_office: '', audit_date: '', classification: '', issue_type: '',
  description: '', amount_involved: '',
  assigned_to: '', ir_status: 'N/A', need_ir_filing: false,
  resolution_date: '', corrective_action: '',
};

export default function NewPCARecord() {
  const navigate = useNavigate();
  const [meta, setMeta] = useState({ classifications: [], siteOffices: [] });
  const [user, setUser] = useState(null);
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [duplicate, setDuplicate] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      db.entities.Classification.filter({ is_active: true }),
      db.entities.SiteOffice.filter({ is_active: true }),
      db.auth.me().catch(() => null),
    ]).then(([cls, sites, u]) => {
      setMeta({ classifications: cls, siteOffices: sites });
      setUser(u);
    });
  }, []);

  const upd = useCallback((k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => p[k] ? { ...p, [k]: null } : p);
  }, []);

  const setNeedIR = (value) => {
    setForm(p => ({
      ...p,
      need_ir_filing: value,
      ir_status: value ? (p.ir_status === 'N/A' ? 'Not Filed' : p.ir_status) : 'N/A',
    }));
  };

  const validate = () => {
    const e = {};
    ['title', 'site_office', 'audit_date', 'classification', 'description'].forEach(k => {
      if (!form[k]) e[k] = `${k.replace(/_/g, ' ')} is required.`;
    });
    if (form.resolution_date && form.audit_date && form.resolution_date < form.audit_date) {
      e.resolution_date = 'Resolution date cannot precede audit date.';
    }
    if (form.description && form.description.length > 2000) {
      e.description = 'Description cannot exceed 2,000 characters.';
    }
    return e;
  };

  const checkDuplicate = async () => {
    if (!form.classification || !form.description) return false;
    const existing = await db.entities.PCARecord.filter({ classification: form.classification });
    const match = existing.find(r =>
      r.description?.substring(0, 60).toLowerCase() === form.description.substring(0, 60).toLowerCase()
    );
    if (match) { setDuplicate(match.record_number); return true; }
    return false;
  };

  const handleSubmit = async (force = false) => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (!force) {
      const dup = await checkDuplicate();
      if (dup) return;
    }
    setSubmitting(true);
    const allRecords = await db.entities.PCARecord.list('-created_date', 1000);
    const nextNum = String(allRecords.length + 1).padStart(4, '0');
    const recordNumber = `AUD-${new Date().getFullYear()}-${nextNum}`;
    const record = await db.entities.PCARecord.create({
      ...form,
      record_number: recordNumber,
      status: 'Open',
      amount_involved: form.amount_involved ? parseFloat(form.amount_involved.replace(/,/g, '')) : null,
      is_recurring: false,
    });
    await db.entities.ActivityLog.create({
      pca_record_id: record.id,
      action_type: 'Created',
      description: `PCA Record ${recordNumber} created by ${user?.full_name || 'User'}.`,
      actor_name: user?.full_name || 'User',
      actor_role: user?.role || '',
    });
    navigate(`/records/${record.id}`);
  };

  const cls = (k) => `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:border-[#1E3A5F] transition-all ${errors[k] ? 'border-red-300 bg-red-50 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-100'}`;

  const F = ({ label, req, err, children, span }) => (
    <div className={span ? 'md:col-span-2' : ''}>
      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
        {label}{req && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {err && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={10} />{err}</p>}
    </div>
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <button onClick={() => navigate('/records')} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 mb-3 transition-colors">
          <ArrowLeft size={13} /> Back to Records
        </button>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">New PCA Record</h1>
        <p className="text-sm text-slate-400 mt-0.5">Create a new Petty Cash Audit finding record</p>
      </div>

      {duplicate && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">⚠ Potential Duplicate Detected</p>
            <p className="text-xs text-amber-700 mt-0.5">A similar issue (<strong>{duplicate}</strong>) already exists with the same classification and description.</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => handleSubmit(true)} className="px-3 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700">Continue Anyway</button>
              <button onClick={() => setDuplicate(null)} className="px-3 py-1.5 text-xs border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-100">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5" style={{ overflowAnchor: 'none' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <F label="Title" req err={errors.title} span>
            <input className={cls('title')} value={form.title} onChange={e => upd('title', e.target.value)} placeholder="Brief description of the finding" />
          </F>
          <F label="Site Office" req err={errors.site_office}>
            <select className={cls('site_office')} value={form.site_office} onChange={e => upd('site_office', e.target.value)}>
              <option value="">Select site office…</option>
              {meta.siteOffices.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </F>
          <F label="Audit Date" req err={errors.audit_date}>
            <input type="date" className={cls('audit_date')} value={form.audit_date} onChange={e => upd('audit_date', e.target.value)} />
          </F>
          <F label="Classification" req err={errors.classification}>
            <select className={cls('classification')} value={form.classification} onChange={e => upd('classification', e.target.value)}>
              <option value="">Select classification…</option>
              {meta.classifications.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </F>
          <F label="Issue Type" err={errors.issue_type}>
            <input className={cls('issue_type')} value={form.issue_type} onChange={e => upd('issue_type', e.target.value)} placeholder="Specific issue sub-type" />
          </F>
          <F label="Amount Involved (₱)" err={errors.amount_involved}>
            <AmountInput
              value={form.amount_involved}
              onChange={v => upd('amount_involved', v)}
              onBlur={v => upd('amount_involved', v)}
              className={cls('amount_involved')}
              placeholder="0.00"
            />
          </F>
          <F label="Assigned To" err={errors.assigned_to}>
            <input className={cls('assigned_to')} value={form.assigned_to} onChange={e => upd('assigned_to', e.target.value)} placeholder="Name of assignee" />
          </F>
          <F label="Need IR Filing?">
            <div className="flex items-center gap-6 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="need_ir_filing" checked={form.need_ir_filing === true}
                  onChange={() => setNeedIR(true)} className="w-4 h-4 accent-[#1E3A5F]" />
                <span className="text-sm text-slate-700">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="need_ir_filing" checked={form.need_ir_filing === false}
                  onChange={() => setNeedIR(false)} className="w-4 h-4 accent-[#1E3A5F]" />
                <span className="text-sm text-slate-700">No</span>
              </label>
            </div>
          </F>
          {form.need_ir_filing && (
            <F label="IR Status" err={errors.ir_status}>
              <select className={cls('ir_status')} value={form.ir_status} onChange={e => upd('ir_status', e.target.value)}>
                {['Not Filed', 'Filed'].map(s => <option key={s}>{s}</option>)}
              </select>
            </F>
          )}
          <F label="Resolution Date" err={errors.resolution_date}>
            <input type="date" className={cls('resolution_date')} value={form.resolution_date} onChange={e => upd('resolution_date', e.target.value)} />
          </F>
        </div>
        <F label="Description" req err={errors.description} span>
          <textarea className={`${cls('description')} resize-none`} rows={4} maxLength={2000}
            value={form.description} onChange={e => upd('description', e.target.value)}
            placeholder="Detailed description of the finding (max 2,000 characters)" />
          <p className={`text-xs mt-1 text-right ${form.description.length > 1800 ? 'text-amber-500' : 'text-slate-300'}`}>{form.description.length}/2,000</p>
        </F>
        <F label="Corrective Action" err={errors.corrective_action} span>
          <textarea className={`${cls('corrective_action')} resize-none`} rows={3}
            value={form.corrective_action} onChange={e => upd('corrective_action', e.target.value)}
            placeholder="Actions taken or planned to resolve this finding" />
        </F>
      </div>

      <div className="flex gap-3">
        <button onClick={() => handleSubmit(false)} disabled={submitting}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#1E3A5F' }}>
          {submitting
            ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : <CheckCircle2 size={15} />}
          Save PCA Record
        </button>
        <button onClick={() => navigate('/records')} className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
