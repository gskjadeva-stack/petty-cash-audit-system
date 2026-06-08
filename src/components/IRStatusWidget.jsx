import { useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '@/api/client';

import { AlertCircle, FileText, CheckCircle2, ArrowRight } from 'lucide-react';

export default function IRStatusWidget({ records, siteOffices, onRecordUpdated }) {
  const [updating, setUpdating] = useState({});

  const irRecords = records.filter(r =>
    r.status !== 'Closed' && (r.need_ir_filing === true || r.ir_status === 'Not Filed' || r.ir_status === 'Filed')
  );

  // Group by site office
  const bySite = siteOffices.reduce((acc, site) => {
    const siteRecs = irRecords.filter(r => r.site_office === site.name);
    if (siteRecs.length > 0) acc.push({ site: site.name, records: siteRecs });
    return acc;
  }, []);

  // Also include records for sites not in the siteOffices list
  const knownSiteNames = new Set(siteOffices.map(s => s.name));
  const otherRecs = irRecords.filter(r => !knownSiteNames.has(r.site_office));
  if (otherRecs.length > 0) {
    const otherBySite = Object.entries(
      otherRecs.reduce((acc, r) => { acc[r.site_office] = [...(acc[r.site_office] || []), r]; return acc; }, {})
    ).map(([site, records]) => ({ site, records }));
    bySite.push(...otherBySite);
  }

  const totalNotFiled = irRecords.filter(r => r.ir_status === 'Not Filed').length;

  const toggleNeedIR = async (record, value) => {
    setUpdating(p => ({ ...p, [record.id]: true }));
    await db.entities.PCARecord.update(record.id, { need_ir_filing: value });
    setUpdating(p => ({ ...p, [record.id]: false }));
    if (onRecordUpdated) onRecordUpdated();
  };

  const updateIRStatus = async (record, status) => {
    setUpdating(p => ({ ...p, [record.id + '_status']: true }));
    await db.entities.PCARecord.update(record.id, { ir_status: status });
    setUpdating(p => ({ ...p, [record.id + '_status']: false }));
    if (onRecordUpdated) onRecordUpdated();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-800 text-sm">IR Filing Status</h2>
          <p className="text-xs text-slate-400 mt-0.5">Sites with open records requiring Incident Report filing</p>
        </div>
        {totalNotFiled > 0 && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-lg">
            <AlertCircle size={11} /> {totalNotFiled} Not Filed
          </span>
        )}
      </div>

      <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
        {bySite.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">No open records with IR filing requirements</p>
        )}
        {bySite.map(({ site, records: siteRecs }) => {
          const notFiled = siteRecs.filter(r => r.ir_status === 'Not Filed').length;
          const filed = siteRecs.filter(r => r.ir_status === 'Filed').length;
          return (
            <div key={site} className="px-5 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">{site}</span>
                <span className="text-[10px] text-slate-400">{siteRecs.length} record{siteRecs.length > 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {notFiled > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold border rounded-full px-2 py-0.5 bg-red-50 text-red-700 border-red-200">
                    <AlertCircle size={9} /> {notFiled} Not Filed
                  </span>
                )}
                {filed > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold border rounded-full px-2 py-0.5 bg-sky-50 text-sky-700 border-sky-200">
                    <FileText size={9} /> {filed} Filed
                  </span>
                )}
              </div>

              {/* Individual records */}
              <div className="space-y-2">
                {siteRecs.map(r => (
                  <div key={r.id} className="pl-2 border-l-2 border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Link to={`/records/${r.id}`} className="text-[11px] font-semibold hover:underline truncate" style={{ color: '#1E3A5F' }}>
                        {r.record_number} — {r.title}
                      </Link>
                      <Link to={`/records/${r.id}`} className="text-slate-300 hover:text-slate-500 flex-shrink-0">
                        <ArrowRight size={12} />
                      </Link>
                    </div>

                    {/* Need IR Filing toggle */}
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400 font-medium">Need IR Filing?</span>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name={`need_ir_${r.id}`}
                            checked={r.need_ir_filing === true}
                            onChange={() => toggleNeedIR(r, true)}
                            disabled={!!updating[r.id]}
                            className="w-3 h-3 accent-[#1E3A5F]"
                          />
                          <span className="text-[10px] text-slate-600">Yes</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name={`need_ir_${r.id}`}
                            checked={r.need_ir_filing === false || r.need_ir_filing === undefined}
                            onChange={() => toggleNeedIR(r, false)}
                            disabled={!!updating[r.id]}
                            className="w-3 h-3 accent-[#1E3A5F]"
                          />
                          <span className="text-[10px] text-slate-600">No</span>
                        </label>
                      </div>

                      {/* IR Status dropdown */}
                      {r.need_ir_filing && (
                        <select
                          value={r.ir_status || 'Not Filed'}
                          onChange={e => updateIRStatus(r, e.target.value)}
                          disabled={!!updating[r.id + '_status']}
                          className={`text-[10px] border rounded px-1.5 py-0.5 focus:outline-none ml-2 ${
                            r.ir_status === 'Not Filed' ? 'border-red-200 text-red-700 bg-red-50' :
                            r.ir_status === 'Filed' ? 'border-sky-200 text-sky-700 bg-sky-50' :
                            'border-emerald-200 text-emerald-700 bg-emerald-50'
                          }`}>
                          <option value="Not Filed">Not Filed</option>
                          <option value="Filed">Filed</option>
                          <option value="N/A">N/A</option>
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}