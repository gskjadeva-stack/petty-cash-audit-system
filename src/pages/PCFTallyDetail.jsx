import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '@/api/client';

import { ArrowLeft, Plus, Trash2, Save, CheckCircle2, TrendingDown, TrendingUp, Minus, AlertCircle, FileDown, Upload } from 'lucide-react';
import { generatePDF, generateWord } from '../utils/reportGenerator';
import AmountInput, { formatAmountDisplay } from '@/components/AmountInput';

const BILLS = [
  { key: 'bills_1000', label: '1,000', value: 1000 },
  { key: 'bills_500', label: '500', value: 500 },
  { key: 'bills_200', label: '200', value: 200 },
  { key: 'bills_100', label: '100', value: 100 },
  { key: 'bills_50', label: '50', value: 50 },
  { key: 'bills_20', label: '20', value: 20 },
];
const COINS = [
  { key: 'coins_20', label: '20', value: 20 },
  { key: 'coins_10', label: '10', value: 10 },
  { key: 'coins_5', label: '5', value: 5 },
  { key: 'coins_1', label: '1', value: 1 },
  { key: 'coins_025', label: '0.25', value: 0.25 },
  { key: 'coins_010', label: '0.10', value: 0.10 },
  { key: 'coins_005', label: '0.05', value: 0.05 },
];
const BLANK_DISB = { reference_number: '', date: '', description: '', amount: '', type: 'Unliquidated', remittance_status: 'Not Remitted' };

// Format number with commas while preserving decimal input
function fmtComma(v) {
  if (v === '' || v === null || v === undefined) return '';
  const str = String(v);
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}
function parseComma(v) { return String(v).replace(/,/g, ''); }

const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (v) => parseFloat(v) || 0;
const fmtBlur = (v) => { const n = parseFloat(v); return isNaN(n) ? '' : n.toFixed(2); };

function buildExportPayload(form, currentId, disbursements) {
  const record = {
    ...form,
    id: currentId,
    revolving_fund: num(parseComma(form.revolving_fund)),
    beginning_balance: num(parseComma(form.beginning_balance)),
    gcash_amount: num(parseComma(form.gcash_amount)),
    atm_bank_amount: num(parseComma(form.atm_bank_amount)),
    by_hand_amount: num(parseComma(form.by_hand_amount)),
    bills_1000: num(form.bills_1000), bills_500: num(form.bills_500), bills_200: num(form.bills_200),
    bills_100: num(form.bills_100), bills_50: num(form.bills_50), bills_20: num(form.bills_20),
    coins_20: num(form.coins_20), coins_10: num(form.coins_10), coins_5: num(form.coins_5),
    coins_1: num(form.coins_1), coins_025: num(form.coins_025), coins_010: num(form.coins_010), coins_005: num(form.coins_005),
  };
  const disbs = disbursements
    .filter(d => d.amount !== '' && d.amount != null)
    .map(d => ({ ...d, amount: num(parseComma(d.amount)) }));
  return { record, disbs };
}

function Section({ title, children, action }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between" style={{ backgroundColor: '#F8FAFC' }}>
        <h2 className="text-sm font-bold text-slate-700 tracking-wide">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function PCFTallyDetail() {
  const { tallyId } = useParams();
  const navigate = useNavigate();
  const isNew = tallyId === 'new';

  const [form, setForm] = useState({
    tally_number: '', site_office: '', audit_date: '', auditor_name: '', fund_type: '',
    revolving_fund: '', beginning_balance: '', beginning_balance_as_of: '', total_expense: '', total_expense_as_of: '', notes: '', status: 'Draft',
    bills_1000: '', bills_500: '', bills_200: '', bills_100: '', bills_50: '', bills_20: '',
    coins_20: '', coins_10: '', coins_5: '', coins_1: '', coins_025: '', coins_010: '', coins_005: '',
    gcash_amount: '', atm_bank_amount: '', by_hand_amount: '',
  });
  const [csvImportWarning, setCsvImportWarning] = useState('');
  const csvInputRef = useRef(null);
  const [disbursements, setDisbursements] = useState([]);
  const [siteOffices, setSiteOffices] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [genPDF, setGenPDF] = useState(false);
  const [currentId, setCurrentId] = useState(isNew ? null : tallyId);
  const [user, setUser] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    db.auth.me().then(setUser).catch(() => {});
    db.entities.SiteOffice.list().then(setSiteOffices);
    if (!isNew) load();
  }, [tallyId]);

  async function load() {
    const [recs, disbs] = await Promise.all([
      db.entities.PCFCashCount.filter({ id: tallyId }),
      db.entities.PCFDisbursement.filter({ cash_count_id: tallyId }, 'date'),
    ]);
    const rec = recs[0];
    if (rec) {
      setForm({
        tally_number: rec.tally_number || '',
        site_office: rec.site_office || '',
        audit_date: rec.audit_date || '',
        auditor_name: rec.auditor_name || '',
        fund_type: rec.fund_type || '',
        revolving_fund: formatAmountDisplay(rec.revolving_fund),
        beginning_balance: formatAmountDisplay(rec.beginning_balance),
        beginning_balance_as_of: rec.beginning_balance_as_of || '',
        total_expense: rec.total_expense || '',
        total_expense_as_of: rec.total_expense_as_of || '',
        notes: rec.notes || '',
        status: rec.status || 'Draft',
        bills_1000: rec.bills_1000 || '',
        bills_500: rec.bills_500 || '',
        bills_200: rec.bills_200 || '',
        bills_100: rec.bills_100 || '',
        bills_50: rec.bills_50 || '',
        bills_20: rec.bills_20 || '',
        coins_20: rec.coins_20 || '',
        coins_10: rec.coins_10 || '',
        coins_5: rec.coins_5 || '',
        coins_1: rec.coins_1 || '',
        coins_025: rec.coins_025 || '',
        coins_010: rec.coins_010 || '',
        coins_005: rec.coins_005 || '',
        gcash_amount: formatAmountDisplay(rec.gcash_amount),
        atm_bank_amount: formatAmountDisplay(rec.atm_bank_amount),
        by_hand_amount: rec.by_hand_amount || '',
      });
      setDisbursements(disbs.map(d => ({ ...d, amount: formatAmountDisplay(d.amount), _saved: true })));
    }
    setLoading(false);
  }

  const upd = useCallback((k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => p[k] ? { ...p, [k]: null } : p);
  }, []);

  // Auto-computations
  const totalBills = BILLS.reduce((s, b) => s + num(form[b.key]) * b.value, 0);
  const totalCoins = COINS.reduce((s, c) => s + num(form[c.key]) * c.value, 0);
  const totalCashActual = totalBills + totalCoins + num(parseComma(form.gcash_amount)) + num(parseComma(form.atm_bank_amount)) + num(parseComma(form.by_hand_amount));
  // Keep totalCash as alias for actual cash (used in accountable)
  const totalCash = totalCashActual;

  const savedDisbs = disbursements.filter(d => d._saved);
  const unliquidatedList = disbursements.filter(d => d.type === 'Unliquidated');
  const liquidatedList = disbursements.filter(d => d.type === 'Liquidated');
  const replenishedList = disbursements.filter(d => d.type === 'Replenished');
  const totalUnliquidated = unliquidatedList.reduce((s, d) => s + num(parseComma(d.amount)), 0);
  const totalLiquidated = liquidatedList.reduce((s, d) => s + num(parseComma(d.amount)), 0);
  const totalReplenished = replenishedList.reduce((s, d) => s + num(parseComma(d.amount)), 0);
  const totalRemittedGcash = replenishedList.filter(d => d.remittance_status === 'GCash').reduce((s, d) => s + num(parseComma(d.amount)), 0);
  const totalRemittedAtm = replenishedList.filter(d => d.remittance_status === 'ATM/Bank').reduce((s, d) => s + num(parseComma(d.amount)), 0);
  const totalRemittedByHand = replenishedList.filter(d => d.remittance_status === 'By Hand').reduce((s, d) => s + num(parseComma(d.amount)), 0);
  const totalNotRemitted = replenishedList.filter(d => d.remittance_status === 'Not Remitted').reduce((s, d) => s + num(parseComma(d.amount)), 0);
  const totalBeginningBalance = num(parseComma(form.beginning_balance));
  // Fund balance reference only — not used in accountable / short-over tally
  const totalExpense = totalUnliquidated + totalLiquidated;
  const accountable = totalCashActual + totalUnliquidated + totalLiquidated;
  const shortOverage = accountable - num(parseComma(form.revolving_fund));
  const isShort = shortOverage < 0;
  const isOver = shortOverage > 0;

  const validate = () => {
    const e = {};
    if (!form.site_office) e.site_office = 'Required';
    if (!form.audit_date) e.audit_date = 'Required';
    if (!form.revolving_fund) e.revolving_fund = 'Required';
    return e;
  };

  const saveRecord = async (finalizeStatus) => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);

    const payload = {
      site_office: form.site_office,
      audit_date: form.audit_date,
      auditor_name: form.auditor_name,
      fund_type: form.fund_type,
      revolving_fund: num(parseComma(form.revolving_fund)),
      beginning_balance: num(parseComma(form.beginning_balance)),
      beginning_balance_as_of: form.beginning_balance_as_of,
      total_expense: num(parseComma(form.total_expense)),
      total_expense_as_of: form.total_expense_as_of,
      bills_1000: num(form.bills_1000),
      bills_500: num(form.bills_500),
      bills_200: num(form.bills_200),
      bills_100: num(form.bills_100),
      bills_50: num(form.bills_50),
      bills_20: num(form.bills_20),
      coins_20: num(form.coins_20),
      coins_10: num(form.coins_10),
      coins_5: num(form.coins_5),
      coins_1: num(form.coins_1),
      coins_025: num(form.coins_025),
      coins_010: num(form.coins_010),
      coins_005: num(form.coins_005),
      gcash_amount: num(parseComma(form.gcash_amount)),
      atm_bank_amount: num(parseComma(form.atm_bank_amount)),
      by_hand_amount: num(parseComma(form.by_hand_amount)),
      notes: form.notes,
      status: finalizeStatus || form.status,
    };

    let recId = currentId;
    if (isNew && !currentId) {
      const all = await db.entities.PCFCashCount.list('-created_date', 1000);
      const nextNum = String(all.length + 1).padStart(4, '0');
      payload.tally_number = `PCF-${new Date().getFullYear()}-${nextNum}`;
      const rec = await db.entities.PCFCashCount.create(payload);
      recId = rec.id;
      setCurrentId(rec.id);
      upd('tally_number', payload.tally_number);
    } else {
      await db.entities.PCFCashCount.update(recId, payload);
    }

    // Save unsaved disbursements
    const toSave = disbursements.filter(d => !d._saved && d.reference_number && d.amount);
    for (const d of toSave) {
      await db.entities.PCFDisbursement.create({
        cash_count_id: recId,
        reference_number: d.reference_number,
        date: d.date,
        description: d.description,
        amount: num(parseComma(d.amount)),
        type: d.type,
        remittance_status: d.remittance_status || 'Not Remitted',
      });
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);

    if (isNew && !currentId) {
      navigate(`/pcf-tally/${recId}`, { replace: true });
    } else {
      load();
    }
  };

  const addDisbursement = (type) => {
    setDisbursements(p => [...p, { ...BLANK_DISB, type, _saved: false, _id: Date.now() }]);
  };

  const updateDisb = (idx, key, val) => {
    setDisbursements(p => p.map((d, i) => i === idx ? { ...d, [key]: val } : d));
  };

  const removeDisb = async (idx) => {
    const d = disbursements[idx];
    if (d._saved && d.id) await db.entities.PCFDisbursement.delete(d.id);
    setDisbursements(p => p.filter((_, i) => i !== idx));
  };

  const handleCsvImport = (e, importType) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { setCsvImportWarning('CSV file is empty or has no data rows.'); return; }

      // Detect header
      const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
      const reqHeaders = ['ref.no.', 'date', 'description', 'amount'];
      // Allow variations
      const colMap = {};
      header.forEach((h, i) => {
        if (h.includes('ref') || h.includes('reference')) colMap.ref = i;
        else if (h === 'date') colMap.date = i;
        else if (h.includes('desc')) colMap.description = i;
        else if (h.includes('amount')) colMap.amount = i;
      });

      if (colMap.ref === undefined || colMap.date === undefined || colMap.description === undefined || colMap.amount === undefined) {
        setCsvImportWarning('Invalid CSV format. Required columns: Ref.No., Date, Description, Amount');
        return;
      }

      setCsvImportWarning('');
      const newRows = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.every(c => !c)) continue;
        const rawAmt = cols[colMap.amount]?.replace(/,/g, '') || '';
        const n = parseFloat(rawAmt);
        const formattedAmt = isNaN(n) ? '' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        newRows.push({
          reference_number: cols[colMap.ref] || '',
          date: cols[colMap.date] || '',
          description: cols[colMap.description] || '',
          amount: formattedAmt,
          type: importType,
          remittance_status: 'Not Remitted',
          _saved: false,
          _id: Date.now() + i,
        });
      }
      if (newRows.length === 0) { setCsvImportWarning('No valid data rows found in CSV.'); return; }
      setDisbursements(p => [...p, ...newRows]);
    };
    reader.readAsText(file);
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 rounded-full animate-spin" style={{ borderTopColor: '#1E3A5F' }} />
    </div>
  );

  const inp = (k, type = 'text', placeholder = '') => (
    <input type={type} placeholder={placeholder}
      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1E3A5F] transition-all"
      value={form[k]} onChange={e => upd(k, e.target.value)} />
  );

  const disbTable = (list, type) => {
    const indices = disbursements.map((d, i) => ({ d, i })).filter(({ d }) => d.type === type);
    return (
      <div className="space-y-2">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 pr-3 text-slate-400 font-semibold w-32">Ref. No.</th>
                <th className="text-left py-2 pr-3 text-slate-400 font-semibold w-28">Date</th>
                <th className="text-left py-2 pr-3 text-slate-400 font-semibold">Description</th>
                <th className="text-right py-2 pr-3 text-slate-400 font-semibold w-28">Amount (₱)</th>
                {type === 'Replenished' && <th className="text-left py-2 pr-3 text-slate-400 font-semibold w-32">Remittance</th>}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {indices.map(({ d, i }) => (
                <tr key={d.id || d._id || i} className="border-b border-slate-50">
                  <td className="py-1.5 pr-2">
                    <input className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#1E3A5F]"
                      value={d.reference_number} onChange={e => updateDisb(i, 'reference_number', e.target.value)}
                      placeholder="PCV-0000" readOnly={d._saved} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input type="date" className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#1E3A5F]"
                      value={d.date} onChange={e => updateDisb(i, 'date', e.target.value)} readOnly={d._saved} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#1E3A5F]"
                      value={d.description} onChange={e => updateDisb(i, 'description', e.target.value)}
                      placeholder="Description" readOnly={d._saved} />
                  </td>
                  <td className="py-1.5 pr-2 text-right">
                    <AmountInput
                      value={d.amount}
                      onChange={v => updateDisb(i, 'amount', v)}
                      onBlur={v => {
                        updateDisb(i, 'amount', v);
                        if (d._saved && d.id && v !== '') {
                          const n = parseFloat(parseComma(v));
                          if (!isNaN(n)) db.entities.PCFDisbursement.update(d.id, { amount: n });
                        }
                      }}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-xs text-right focus:outline-none focus:border-[#1E3A5F]"
                      placeholder="0.00"
                    />
                  </td>
                  {type === 'Replenished' && (
                    <td className="py-1.5 pr-2">
                      <select className={`w-full border rounded px-2 py-1 text-xs focus:outline-none ${
                        d.remittance_status === 'Not Remitted' ? 'border-slate-200 text-slate-500' :
                        d.remittance_status === 'GCash' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                        d.remittance_status === 'By Hand' ? 'border-purple-200 text-purple-700 bg-purple-50' :
                        'border-emerald-200 text-emerald-700 bg-emerald-50'}`}
                        value={d.remittance_status}
                        onChange={e => {
                          updateDisb(i, 'remittance_status', e.target.value);
                          // If saved, update in DB
                          if (d._saved && d.id) {
                            db.entities.PCFDisbursement.update(d.id, { remittance_status: e.target.value });
                          }
                        }}>
                        <option value="Not Remitted">Not Remitted</option>
                        <option value="GCash">GCash</option>
                        <option value="ATM/Bank">ATM/Bank</option>
                        <option value="By Hand">By Hand</option>
                      </select>
                    </td>
                  )}
                  <td className="py-1.5">
                    <button onClick={() => removeDisb(i)} className="text-slate-200 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {indices.length === 0 && (
                <tr><td colSpan={type === 'Replenished' ? 6 : 5} className="py-4 text-center text-slate-400 text-xs">No items. Click Add below.</td></tr>
              )}
            </tbody>
            {indices.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td colSpan={type === 'Replenished' ? 3 : 3} className="py-2 text-xs font-bold text-slate-600">TOTAL</td>
                  <td className="py-2 text-right text-xs font-bold" style={{ color: '#1E3A5F' }}>
                    {fmt(type === 'Unliquidated' ? totalUnliquidated : type === 'Liquidated' ? totalLiquidated : totalReplenished)}
                  </td>
                  {type === 'Replenished' && (
                    <td className="py-2 pl-2">
                      <div className="space-y-0.5">
                        {totalRemittedGcash > 0 && <p className="text-[10px] text-blue-600 font-semibold">GCash: {fmt(totalRemittedGcash)}</p>}
                        {totalRemittedAtm > 0 && <p className="text-[10px] text-emerald-600 font-semibold">ATM: {fmt(totalRemittedAtm)}</p>}
                        {totalRemittedByHand > 0 && <p className="text-[10px] text-purple-600 font-semibold">By Hand: {fmt(totalRemittedByHand)}</p>}
                        {totalNotRemitted > 0 && <p className="text-[10px] text-slate-500 font-semibold">Pending: {fmt(totalNotRemitted)}</p>}
                      </div>
                    </td>
                  )}
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <button onClick={() => addDisbursement(type)}
          className="flex items-center gap-1.5 text-xs font-medium mt-1 hover:opacity-80 transition-opacity"
          style={{ color: '#1E3A5F' }}>
          <Plus size={12} /> Add {type} Item
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-5xl space-y-5">
      <div>
        <button onClick={() => navigate('/pcf-tally')} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 mb-3 transition-colors">
          <ArrowLeft size={13} /> Back to Tally Sessions
        </button>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              {isNew ? 'New PCF Tally Session' : (form.tally_number || 'PCF Tally Session')}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">Fund Computation Worksheet</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => saveRecord()} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-[#1E3A5F] rounded-lg transition-colors hover:bg-blue-50"
              style={{ color: '#1E3A5F' }}>
              {saved ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Save size={14} />}
              {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button onClick={() => saveRecord('Finalized')} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#1E3A5F' }}>
              <CheckCircle2 size={14} /> Finalize
            </button>
            {currentId && (
              <>
                <button
                  onClick={async () => {
                    setGenPDF(true);
                    const { record: exportRecord, disbs: exportDisbs } = buildExportPayload(form, currentId, disbursements);
                    await generatePDF(exportRecord, exportDisbs);
                    setGenPDF(false);
                  }}
                  disabled={genPDF}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-700">
                  <FileDown size={14} className="text-red-500" />
                  {genPDF ? 'Generating…' : 'Export PDF'}
                </button>
                <button
                  onClick={() => {
                    const { record: exportRecord, disbs: exportDisbs } = buildExportPayload(form, currentId, disbursements);
                    generateWord(exportRecord, exportDisbs);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-700">
                  <FileDown size={14} className="text-blue-500" /> Export Word
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left: Form sections */}
        <div className="xl:col-span-2 space-y-5">
          {/* Header info */}
          <Section title="Session Information">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Site Office <span className="text-red-500">*</span>
                </label>
                <select className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1E3A5F] ${errors.site_office ? 'border-red-300' : 'border-slate-200'}`}
                  value={form.site_office} onChange={e => upd('site_office', e.target.value)}>
                  <option value="">Select site office…</option>
                  {siteOffices.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
                {errors.site_office && <p className="text-xs text-red-500 mt-1">{errors.site_office}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Audit Date <span className="text-red-500">*</span>
                </label>
                {inp('audit_date', 'date')}
                {errors.audit_date && <p className="text-xs text-red-500 mt-1">{errors.audit_date}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Auditor Name</label>
                {inp('auditor_name', 'text', 'Auditor / Custodian name')}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Fund Type</label>
                {inp('fund_type', 'text', 'e.g. Petty Cash Fund, Revolving Fund…')}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Revolving Fund <span className="text-red-500">*</span>
                </label>
                <AmountInput
                  value={form.revolving_fund}
                  onChange={v => upd('revolving_fund', v)}
                  onBlur={v => upd('revolving_fund', v)}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1E3A5F] transition-all ${errors.revolving_fund ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                  placeholder="0.00"
                />
                {errors.revolving_fund && <p className="text-xs text-red-500 mt-1">{errors.revolving_fund}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Beginning Balance</label>
                <AmountInput
                  value={form.beginning_balance}
                  onChange={v => upd('beginning_balance', v)}
                  onBlur={v => upd('beginning_balance', v)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1E3A5F] transition-all"
                  placeholder="0.00"
                />
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 mb-1">As of</label>
                <input type="datetime-local"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1E3A5F] transition-all"
                  value={form.beginning_balance_as_of} onChange={e => upd('beginning_balance_as_of', e.target.value)} />
              </div>

            </div>
          </Section>

          {/* Cash on Hand */}
          <Section title="Cash on Hand — Denomination Breakdown">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Bills */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Paper Bills</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-1.5 text-xs text-slate-400 font-semibold">Denomination</th>
                      <th className="text-center py-1.5 text-xs text-slate-400 font-semibold w-24">Qty</th>
                      <th className="text-right py-1.5 text-xs text-slate-400 font-semibold w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BILLS.map(b => (
                      <tr key={b.key} className="border-b border-slate-50">
                        <td className="py-2 text-sm font-semibold text-slate-700">{b.label}</td>
                        <td className="py-2 px-2">
                          <input type="text" inputMode="numeric"
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:border-[#1E3A5F]"
                            value={form[b.key]} onChange={e => upd(b.key, e.target.value)}
                            onBlur={e => { const n = parseFloat(e.target.value); if (!isNaN(n)) upd(b.key, String(n)); }}
                            placeholder="0" />
                        </td>
                        <td className="py-2 text-right text-sm font-medium text-slate-600">
                          {fmt(num(form[b.key]) * b.value)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-200">
                      <td className="py-2 text-xs font-bold text-slate-600 uppercase tracking-wide" colSpan={2}>Total Bills</td>
                      <td className="py-2 text-right text-sm font-bold" style={{ color: '#1E3A5F' }}>{fmt(totalBills)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Coins */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Coins</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-1.5 text-xs text-slate-400 font-semibold">Denomination</th>
                      <th className="text-center py-1.5 text-xs text-slate-400 font-semibold w-24">Qty</th>
                      <th className="text-right py-1.5 text-xs text-slate-400 font-semibold w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COINS.map(c => (
                      <tr key={c.key} className="border-b border-slate-50">
                        <td className="py-2 text-sm font-semibold text-slate-700">{c.label}</td>
                        <td className="py-2 px-2">
                          <input type="text" inputMode="numeric"
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:border-[#1E3A5F]"
                            value={form[c.key]} onChange={e => upd(c.key, e.target.value)}
                            onBlur={e => { const n = parseFloat(e.target.value); if (!isNaN(n)) upd(c.key, String(n)); }}
                            placeholder="0" />
                        </td>
                        <td className="py-2 text-right text-sm font-medium text-slate-600">
                          {fmt(num(form[c.key]) * c.value)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-200">
                      <td className="py-2 text-xs font-bold text-slate-600 uppercase tracking-wide" colSpan={2}>Total Coins</td>
                      <td className="py-2 text-right text-sm font-bold" style={{ color: '#1E3A5F' }}>{fmt(totalCoins)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* GCash + ATM */}
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">GCash Current</label>
                <AmountInput
                  value={form.gcash_amount}
                  onChange={v => upd('gcash_amount', v)}
                  onBlur={v => upd('gcash_amount', v)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1E3A5F]"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">ATM / Bank Current</label>
                <AmountInput
                  value={form.atm_bank_amount}
                  onChange={v => upd('atm_bank_amount', v)}
                  onBlur={v => upd('atm_bank_amount', v)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1E3A5F]"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="mt-3 p-3 rounded-xl flex items-center justify-between" style={{ backgroundColor: '#EFF6FF' }}>
              <span className="text-sm font-bold text-slate-600 uppercase tracking-wide">Total Cash on Hand (Actual)</span>
              <span className="text-xl font-bold" style={{ color: '#1E3A5F' }}>{fmt(totalCashActual)}</span>
            </div>
          </Section>

          {/* Unliquidated */}
          <Section
            title={<span>Cash Released: <span className="text-red-600 font-bold">UNLIQUIDATED</span></span>}
            action={
              <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 cursor-pointer border border-slate-200 rounded-lg px-2 py-1 hover:bg-slate-50 transition-colors">
                <Upload size={11} /> Import CSV
                <input type="file" accept=".csv" className="hidden" onChange={e => handleCsvImport(e, 'Unliquidated')} />
              </label>
            }>
            {csvImportWarning && (
              <div className="mb-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertCircle size={13} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700">{csvImportWarning}</p>
                <button onClick={() => setCsvImportWarning('')} className="ml-auto text-amber-400 hover:text-amber-600 text-xs">✕</button>
              </div>
            )}
            {disbTable(unliquidatedList, 'Unliquidated')}
          </Section>

          {/* Liquidated */}
          <Section
            title={<span>Cash Released: <span className="text-blue-600 font-bold">LIQUIDATED</span></span>}
            action={
              <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 cursor-pointer border border-slate-200 rounded-lg px-2 py-1 hover:bg-slate-50 transition-colors">
                <Upload size={11} /> Import CSV
                <input type="file" accept=".csv" className="hidden" onChange={e => handleCsvImport(e, 'Liquidated')} />
              </label>
            }>
            {disbTable(liquidatedList, 'Liquidated')}
          </Section>

          {/* Replenished */}
          <Section
            title="Replenished Fund"
            action={<span className="text-xs font-bold" style={{ color: '#1E3A5F' }}>{fmt(totalReplenished)}</span>}>
            {disbTable(replenishedList, 'Replenished')}
          </Section>

          {/* Notes */}
          <Section title="Remarks / Notes">
            <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#1E3A5F]"
              rows={3} value={form.notes} onChange={e => upd('notes', e.target.value)}
              placeholder="Additional remarks or observations during cash count…" />
          </Section>
        </div>

        {/* Right: Summary Panel */}
        <div className="space-y-4">
          <div className="sticky top-4 space-y-4">
            {/* Tally Summary */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-slate-100" style={{ backgroundColor: '#1E3A5F' }}>
                <h2 className="text-sm font-bold text-white uppercase tracking-wide">Tally Summary</h2>
                <p className="text-white/50 text-xs mt-0.5">{form.site_office || '—'} · {form.audit_date || '—'}</p>
              </div>
              <div className="p-5 space-y-2">
                {/* Revolving Fund */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Revolving Fund</span>
                  <span className="text-sm font-bold text-slate-800">{fmt(num(parseComma(form.revolving_fund)))}</span>
                </div>

                {/* Fund balance reference — separate from accountable tally */}
                <div className="mt-2 pt-2 border-t border-dashed border-slate-200 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fund Balance Reference</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">Beginning Balance</span>
                    <span className="text-sm font-semibold text-slate-600">{fmt(totalBeginningBalance)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">Replenished</span>
                    <span className="text-sm font-semibold text-slate-600">{fmt(totalReplenished)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">Total Expense</span>
                    <span className="text-sm font-semibold text-slate-600">({fmt(totalExpense)})</span>
                  </div>
                </div>

                {/* Cash on Hand (Actual) — tally computation */}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-medium text-slate-600">— Cash on Hand (Actual)</span>
                  <span className="text-sm font-semibold text-slate-600">{fmt(totalCashActual)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] pl-3 font-medium text-slate-400">· Bills</span>
                  <span className="text-[11px] font-semibold text-slate-400">{fmt(totalBills)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] pl-3 font-medium text-slate-400">· Coins</span>
                  <span className="text-[11px] font-semibold text-slate-400">{fmt(totalCoins)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] pl-3 font-medium text-slate-400">· GCash</span>
                  <span className="text-[11px] font-semibold text-slate-400">{fmt(num(parseComma(form.gcash_amount)))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] pl-3 font-medium text-slate-400">· ATM/Bank</span>
                  <span className="text-[11px] font-semibold text-slate-400">{fmt(num(parseComma(form.atm_bank_amount)))}</span>
                </div>

                {/* Unliquidated & Liquidated */}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-medium text-red-600">— Unliquidated</span>
                  <span className="text-sm font-semibold text-red-600">{fmt(totalUnliquidated)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">— Liquidated</span>
                  <span className="text-sm font-semibold text-slate-600">{fmt(totalLiquidated)}</span>
                </div>

                <div className="border-t-2 border-slate-200 pt-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Total Accountable</span>
                  <span className="text-sm font-bold text-slate-800">{fmt(accountable)}</span>
                </div>
              </div>

              {/* Short/Overage */}
              <div className={`mx-4 mb-4 p-4 rounded-xl ${isShort ? 'bg-red-50 border border-red-200' : isOver ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {isShort ? <TrendingDown size={14} className="text-red-500" /> : isOver ? <TrendingUp size={14} className="text-amber-500" /> : <Minus size={14} className="text-emerald-500" />}
                  <span className={`text-xs font-bold uppercase tracking-wider ${isShort ? 'text-red-600' : isOver ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {isShort ? 'Short' : isOver ? 'Overage' : 'Balanced'}
                  </span>
                </div>
                <p className={`text-2xl font-bold ${isShort ? 'text-red-600' : isOver ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {isShort ? '(' : ''}{fmt(Math.abs(shortOverage))}{isShort ? ')' : ''}
                </p>
                <p className="text-xs mt-1 text-slate-500">
                  {isShort ? 'Cash is short vs. revolving fund' : isOver ? 'Cash exceeds revolving fund' : 'Cash matches revolving fund'}
                </p>
              </div>
            </div>

            {/* Replenishment Remittance Summary */}
            {totalReplenished > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-3.5 border-b border-slate-100" style={{ backgroundColor: '#F8FAFC' }}>
                  <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Replenishment Remittance</h2>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-700 font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" /> Via GCash
                    </span>
                    <span className="text-xs font-bold text-blue-700">{fmt(totalRemittedGcash)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Via ATM/Bank
                    </span>
                    <span className="text-xs font-bold text-emerald-700">{fmt(totalRemittedAtm)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-purple-700 font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500" /> Via By Hand
                    </span>
                    <span className="text-xs font-bold text-purple-700">{fmt(totalRemittedByHand)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-300" /> Not Yet Remitted
                    </span>
                    <span className="text-xs font-bold text-slate-600">{fmt(totalNotRemitted)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t-2 border-slate-200 pt-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Total Replenished</span>
                    <span className="text-xs font-bold" style={{ color: '#1E3A5F' }}>{fmt(totalReplenished)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}