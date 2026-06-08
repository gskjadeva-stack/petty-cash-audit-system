import { useState, useEffect } from 'react';
import { db } from '@/api/client';

import { Plus, Trash2, Edit2, Check, X, Shield } from 'lucide-react';

const TABS = ['Classifications', 'Site Offices'];

export default function Settings() {
  const [tab, setTab] = useState('Classifications');
  const [data, setData] = useState({ Classifications: [], 'Site Offices': [] });
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({ name: '', description: '', code: '', region: '', manager: '' });
  const [editId, setEditId] = useState(null);
  const [editVal, setEditVal] = useState('');

  useEffect(() => {
    Promise.all([
      db.entities.Classification.list(),
      db.entities.SiteOffice.list(),
    ]).then(([cls, sites]) => {
      setData({ Classifications: cls, 'Site Offices': sites });
      setLoading(false);
    });
  }, []);

  const entity = () => ({
    Classifications: db.entities.Classification,
    'Site Offices': db.entities.SiteOffice,
  }[tab]);

  const items = data[tab] || [];

  const add = async () => {
    if (!newItem.name.trim()) return;
    const payload = tab === 'Site Offices'
      ? { name: newItem.name, code: newItem.code, region: newItem.region, manager: newItem.manager, is_active: true }
      : { name: newItem.name, description: newItem.description, is_active: true };
    const item = await entity().create(payload);
    setData(p => ({ ...p, [tab]: [...p[tab], item] }));
    setNewItem({ name: '', description: '', code: '', region: '', manager: '' });
  };

  const del = async (id) => {
    await entity().delete(id);
    setData(p => ({ ...p, [tab]: p[tab].filter(i => i.id !== id) }));
  };

  const saveEdit = async (id) => {
    await entity().update(id, { name: editVal });
    setData(p => ({ ...p, [tab]: p[tab].map(i => i.id === id ? { ...i, name: editVal } : i) }));
    setEditId(null);
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 rounded-full animate-spin" style={{ borderTopColor: '#1E3A5F' }} />
    </div>
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EFF6FF' }}>
          <Shield size={18} style={{ color: '#1E3A5F' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">System Settings</h1>
          <p className="text-sm text-slate-400 mt-0.5">Manage system-wide taxonomy, reference data, and configurations</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3.5 text-sm font-medium transition-all ${tab === t ? 'font-semibold border-b-2' : 'text-slate-500 hover:text-slate-700'}`}
              style={tab === t ? { color: '#1E3A5F', borderBottomColor: '#1E3A5F' } : {}}>
              {t}
              <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-semibold">
                {(data[t] || []).length}
              </span>
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {/* Add new */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Add New {tab.slice(0, -1)}</p>
            <div className="flex gap-2 flex-wrap">
              <input
                className="flex-1 min-w-[180px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1E3A5F] bg-white"
                placeholder={`${tab.slice(0, -1)} name *`}
                value={newItem.name}
                onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && add()}
              />
              {tab !== 'Site Offices' && (
                <input
                  className="flex-1 min-w-[160px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1E3A5F] bg-white"
                  placeholder="Description (optional)"
                  value={newItem.description}
                  onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))}
                />
              )}
              {tab === 'Site Offices' && (
                <>
                  <input className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1E3A5F] bg-white" placeholder="Code *" value={newItem.code} onChange={e => setNewItem(p => ({ ...p, code: e.target.value }))} />
                  <input className="w-32 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1E3A5F] bg-white" placeholder="Region" value={newItem.region} onChange={e => setNewItem(p => ({ ...p, region: e.target.value }))} />
                  <input className="w-36 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1E3A5F] bg-white" placeholder="Manager" value={newItem.manager} onChange={e => setNewItem(p => ({ ...p, manager: e.target.value }))} />
                </>
              )}
              <button onClick={add} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-opacity" style={{ backgroundColor: '#1E3A5F' }}>
                <Plus size={14} /> Add
              </button>
            </div>
          </div>

          {/* List */}
          <div className="divide-y divide-slate-100">
            {items.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">No {tab.toLowerCase()} defined yet. Add one above.</p>
            )}
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-3 py-3.5 group">
                {editId === item.id ? (
                  <>
                    <input
                      className="flex-1 border border-[#1E3A5F] rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(item.id); if (e.key === 'Escape') setEditId(null); }}
                      autoFocus
                    />
                    <button onClick={() => saveEdit(item.id)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"><Check size={14} /></button>
                    <button onClick={() => setEditId(null)} className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-slate-200"><X size={14} /></button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 font-semibold">{item.name}</p>
                      {item.code && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {item.code}{item.region ? ` · ${item.region}` : ''}{item.manager ? ` · ${item.manager}` : ''}
                        </p>
                      )}
                      {item.description && <p className="text-xs text-slate-400 mt-0.5 italic">{item.description}</p>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditId(item.id); setEditVal(item.name); }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-slate-500 transition-colors">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => del(item.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}