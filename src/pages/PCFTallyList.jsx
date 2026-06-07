import { useState, useEffect } from 'react';
import { db } from '@/api/client';
import { Link, useNavigate } from 'react-router-dom';

import { Plus, Calculator, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { format } from 'date-fns';

function computeTotals(r) {
  const bills =
    (r.bills_1000 || 0) * 1000 + (r.bills_500 || 0) * 500 + (r.bills_200 || 0) * 200 +
    (r.bills_100 || 0) * 100 + (r.bills_50 || 0) * 50 + (r.bills_20 || 0) * 20;
  const coins =
    (r.coins_20 || 0) * 20 + (r.coins_10 || 0) * 10 + (r.coins_5 || 0) * 5 +
    (r.coins_1 || 0) * 1 + (r.coins_025 || 0) * 0.25 + (r.coins_010 || 0) * 0.10 + (r.coins_005 || 0) * 0.05;
  const cashOnHand = bills + coins + (r.gcash_amount || 0) + (r.atm_bank_amount || 0) + (r.by_hand_amount || 0);
  return { bills, coins, cashOnHand };
}

export default function PCFTallyList() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [disbursements, setDisbursements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      db.entities.PCFCashCount.list('-audit_date', 200),
      db.entities.PCFDisbursement.list('-created_date', 1000),
    ]).then(([recs, disbs]) => {
      setRecords(recs);
      setDisbursements(disbs);
      setLoading(false);
    });
  }, []);

  const getSummary = (rec) => {
    const { cashOnHand } = computeTotals(rec);
    const recDisbs = disbursements.filter(d => d.cash_count_id === rec.id);
    const totalUnliquidated = recDisbs.filter(d => d.type === 'Unliquidated').reduce((s, d) => s + (d.amount || 0), 0);
    const totalLiquidated = recDisbs.filter(d => d.type === 'Liquidated').reduce((s, d) => s + (d.amount || 0), 0);
    const accountable = cashOnHand + totalUnliquidated + totalLiquidated;
    const shortOverage = accountable - (rec.revolving_fund || 0);
    return { cashOnHand, totalUnliquidated, totalLiquidated, accountable, shortOverage };
  };

  const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 rounded-full animate-spin" style={{ borderTopColor: '#1E3A5F' }} />
    </div>
  );

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">PCF Cycle Tally</h1>
          <p className="text-sm text-slate-400 mt-0.5">Tally and Cash Count sessions</p>
        </div>
        <Link to="/pcf-tally/new"
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#1E3A5F' }}>
          <Plus size={14} /> New Tally Session
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-16 text-center">
          <Calculator size={40} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-500 font-medium">No tally sessions yet</p>
          <p className="text-slate-400 text-sm mt-1">Create your first PCF cash count tally session.</p>
          <Link to="/pcf-tally/new" className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-semibold text-white rounded-lg" style={{ backgroundColor: '#1E3A5F' }}>
            <Plus size={13} /> New Tally Session
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(rec => {
            const { cashOnHand, totalUnliquidated, totalReplenished, accountable, shortOverage } = getSummary(rec);
            const isShort = shortOverage < 0;
            const isOver = shortOverage > 0;
            return (
              <div key={rec.id} onClick={() => navigate(`/pcf-tally/${rec.id}`)}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:border-[#1E3A5F]/30 hover:shadow-sm transition-all cursor-pointer">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EFF6FF' }}>
                      <Calculator size={18} style={{ color: '#1E3A5F' }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-bold text-sm" style={{ color: '#1E3A5F' }}>{rec.tally_number || rec.id?.slice(0, 8)}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${rec.status === 'Finalized' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {rec.status || 'Draft'}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-700 mt-0.5">{rec.site_office}</p>
                      <p className="text-xs text-slate-400">{rec.audit_date} {rec.auditor_name ? `· ${rec.auditor_name}` : ''}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Revolving Fund</p>
                      <p className="text-sm font-bold text-slate-700">{fmt(rec.revolving_fund)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Cash on Hand</p>
                      <p className="text-sm font-bold text-slate-700">{fmt(cashOnHand)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Accountable</p>
                      <p className="text-sm font-bold text-slate-700">{fmt(accountable)}</p>
                    </div>
                    <div className={`text-right px-3 py-2 rounded-lg ${isShort ? 'bg-red-50' : isOver ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                      <p className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-1 justify-end">
                        {isShort ? <TrendingDown size={10} className="text-red-500" /> : isOver ? <TrendingUp size={10} className="text-amber-500" /> : <Minus size={10} className="text-emerald-500" />}
                        <span className={isShort ? 'text-red-500' : isOver ? 'text-amber-500' : 'text-emerald-500'}>
                          {isShort ? 'SHORT' : isOver ? 'OVERAGE' : 'BALANCED'}
                        </span>
                      </p>
                      <p className={`text-sm font-bold ${isShort ? 'text-red-600' : isOver ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {isShort ? '-' : isOver ? '+' : ''}{fmt(Math.abs(shortOverage))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}