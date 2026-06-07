import { cn } from '@/lib/utils';

const STYLES = {
  // Status
  'Open':         'bg-blue-50 text-blue-700 border-blue-200',
  'Under Review': 'bg-amber-50 text-amber-700 border-amber-200',
  'Closed':       'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Reopened':     'bg-purple-50 text-purple-700 border-purple-200',
  'Escalated':    'bg-red-50 text-red-700 border-red-200',
  'Overdue':      'bg-orange-50 text-orange-700 border-orange-200',
  // Severity
  'Low':          'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Medium':       'bg-amber-50 text-amber-700 border-amber-200',
  'High':         'bg-orange-50 text-orange-700 border-orange-200',
  'Critical':     'bg-red-50 text-red-700 border-red-200',
  // IR Status
  'Not Filed':    'bg-slate-100 text-slate-500 border-slate-200',
  'Filed':        'bg-sky-50 text-sky-700 border-sky-200',
  // Finding status
  'Resolved':     'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Pending':      'bg-amber-50 text-amber-700 border-amber-200',
};

const DOTS = {
  'Open': 'bg-blue-500', 'Under Review': 'bg-amber-500', 'Closed': 'bg-emerald-500',
  'Reopened': 'bg-purple-500', 'Escalated': 'bg-red-500', 'Overdue': 'bg-orange-500',
  'Critical': 'bg-red-500', 'High': 'bg-orange-500',
};

export default function StatusBadge({ value, size = 'sm', dot = false }) {
  if (!value) return null;
  const style = STYLES[value] || 'bg-slate-100 text-slate-500 border-slate-200';
  return (
    <span className={cn(
      'inline-flex items-center gap-1 border rounded-full font-medium whitespace-nowrap',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
      style
    )}>
      {dot && DOTS[value] && <span className={cn('w-1.5 h-1.5 rounded-full', DOTS[value])} />}
      {value}
    </span>
  );
}