export default function KPICard({ title, value, icon: Icon, variant = 'default', subtitle, delta }) {
  const variants = {
    navy:    { wrap: 'text-white shadow-lg', bg: '#1E3A5F', label: 'text-white/60', val: 'text-white', iconBg: 'bg-white/15', iconColor: 'text-white' },
    default: { wrap: 'bg-white border border-slate-200', label: 'text-slate-500', val: 'text-slate-800', iconBg: 'bg-slate-100', iconColor: 'text-slate-400' },
    blue:    { wrap: 'bg-white border border-slate-200', label: 'text-slate-500', val: 'text-blue-600', iconBg: 'bg-blue-50', iconColor: 'text-blue-500' },
    amber:   { wrap: 'bg-white border border-slate-200', label: 'text-slate-500', val: 'text-amber-600', iconBg: 'bg-amber-50', iconColor: 'text-amber-500' },
    red:     { wrap: 'bg-white border border-slate-200', label: 'text-slate-500', val: 'text-red-600', iconBg: 'bg-red-50', iconColor: 'text-red-500' },
    green:   { wrap: 'bg-white border border-slate-200', label: 'text-slate-500', val: 'text-emerald-600', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500' },
  };
  const v = variants[variant] || variants.default;
  return (
    <div className={`rounded-xl p-5 ${v.wrap}`} style={variant === 'navy' ? { backgroundColor: '#1E3A5F' } : {}}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-wider ${v.label}`}>{title}</p>
          <p className={`text-3xl font-bold mt-1.5 leading-none ${v.val}`}>{value}</p>
          {subtitle && <p className={`text-xs mt-1.5 ${v.label} opacity-80`}>{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${v.iconBg}`}>
            <Icon size={18} className={v.iconColor} />
          </div>
        )}
      </div>
    </div>
  );
}