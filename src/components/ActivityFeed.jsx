import { format } from 'date-fns';
import { Activity, MessageSquare, AlertTriangle, UserCheck, PlusCircle, RefreshCw, Upload } from 'lucide-react';

const CFG = {
  'Status Change':   { Icon: RefreshCw,     bg: 'bg-blue-50',   text: 'text-blue-600' },
  'Comment Added':   { Icon: MessageSquare, bg: 'bg-slate-100',  text: 'text-slate-500' },
  'Escalation':      { Icon: AlertTriangle, bg: 'bg-red-50',    text: 'text-red-600' },
  'Assignment':      { Icon: UserCheck,     bg: 'bg-purple-50', text: 'text-purple-600' },
  'Created':         { Icon: PlusCircle,    bg: 'bg-emerald-50', text: 'text-emerald-600' },
  'Updated':         { Icon: Activity,      bg: 'bg-amber-50',  text: 'text-amber-600' },
  'Finding Added':   { Icon: PlusCircle,    bg: 'bg-sky-50',    text: 'text-sky-600' },
  'Document Upload': { Icon: Upload,        bg: 'bg-indigo-50', text: 'text-indigo-600' },
};

export default function ActivityFeed({ logs }) {
  if (!logs?.length) {
    return (
      <div className="text-center py-10">
        <Activity size={28} className="mx-auto text-slate-200 mb-2" />
        <p className="text-sm text-slate-400">No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-100" />
      <div className="space-y-5 pl-12">
        {logs.map((log, i) => {
          const { Icon, bg, text } = CFG[log.action_type] || { Icon: Activity, bg: 'bg-slate-50', text: 'text-slate-500' };
          return (
            <div key={log.id || i} className="relative">
              <div className={`absolute -left-8 w-8 h-8 rounded-full flex items-center justify-center ${bg} border-2 border-white shadow-sm`} style={{ left: '-2.5rem' }}>
                <Icon size={13} className={text} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-800">{log.actor_name || 'SYSTEM'}</span>
                  {log.actor_role && <span className="text-xs text-slate-400 capitalize">({log.actor_role})</span>}
                  <span className="text-xs text-slate-400 ml-auto">
                    {log.created_date ? format(new Date(log.created_date), 'MMM d, yyyy · HH:mm') : ''}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-0.5">{log.description}</p>
                {log.old_value && log.new_value && (
                  <p className="text-xs mt-1 bg-slate-50 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-slate-500">
                    <span className="line-through">{log.old_value}</span>
                    <span>→</span>
                    <span className="font-semibold text-slate-700">{log.new_value}</span>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}