import { useRef, useEffect } from 'react';

function formatWithCommas(raw) {
  const parts = raw.split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.length > 1 ? intPart + '.' + parts[1] : intPart;
}

export function formatAmountDisplay(v) {
  if (v === '' || v == null) return '';
  const raw = String(v).replace(/,/g, '');
  if (raw === '') return '';
  const n = parseFloat(raw);
  if (isNaN(n)) return String(v);
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AmountInput({ value, onChange, onBlur, className, placeholder }) {
  const ref = useRef(null);
  const focused = useRef(false);

  useEffect(() => {
    if (ref.current && !focused.current) {
      ref.current.value = formatAmountDisplay(value) || '';
    }
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return;

    const formatted = formatWithCommas(raw);
    const el = e.target;
    const selStart = el.selectionStart;
    const prevLen = el.value.length;
    el.value = formatted;
    const diff = formatted.length - prevLen;
    el.setSelectionRange(selStart + diff, selStart + diff);
    onChange(formatted);
  };

  const handleBlur = (e) => {
    focused.current = false;
    const raw = e.target.value.replace(/,/g, '');
    const n = parseFloat(raw);
    if (!isNaN(n)) {
      const formatted = formatAmountDisplay(n);
      if (ref.current) ref.current.value = formatted;
      onBlur(formatted);
    } else if (raw === '') {
      onBlur('');
    }
  };

  const handleFocus = () => {
    focused.current = true;
  };

  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      defaultValue={formatAmountDisplay(value) || ''}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      className={className}
      placeholder={placeholder}
    />
  );
}
