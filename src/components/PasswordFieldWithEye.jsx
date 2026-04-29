import React from 'react';
import { Lock, Eye } from 'lucide-react';

/**
 * Password input with optional lock icon and visibility toggle.
 * @param {'zinc'|'slate'} variant - color theme to match page
 */
export default function PasswordFieldWithEye({
  id,
  name,
  value,
  onChange,
  show,
  onToggleShow,
  showLabel,
  hideLabel,
  autoComplete = 'current-password',
  placeholder,
  className = '',
  leftIcon = true,
  variant = 'zinc',
}) {
  const wrap =
    variant === 'slate'
      ? 'flex rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20'
      : 'flex rounded-xl border border-[#d1d5db] bg-white focus-within:border-[#22c55e] focus-within:ring-4 focus-within:ring-[#22c55e]/15';
  const padL = leftIcon ? 'pl-11' : 'pl-3';
  const input =
    variant === 'slate'
      ? 'min-w-0 flex-1 rounded-xl border-0 bg-transparent py-2.5 text-slate-900 outline-none placeholder:text-slate-400'
      : 'min-w-0 flex-1 rounded-xl border-0 bg-transparent py-3 text-zinc-900 outline-none placeholder:text-zinc-400';
  const lockClass =
    variant === 'slate' ? 'text-slate-400' : 'text-zinc-400';

  return (
    <div className={`relative ${wrap} ${className}`}>
      {leftIcon ? <Lock className={`pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 ${lockClass}`} aria-hidden /> : null}
      <input
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${input} ${padL} pr-12`}
      />
      <button
        type="button"
        onClick={onToggleShow}
        className={
          variant === 'slate'
            ? 'absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            : 'absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800'
        }
        aria-label={show ? hideLabel : showLabel}
      >
        <Eye className="size-5" strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
