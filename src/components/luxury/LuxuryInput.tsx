import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const LuxuryInput = forwardRef<HTMLInputElement, Props>(
  ({ label, error, hint, className, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs font-semibold text-[#2A2522]/60 uppercase tracking-wider block">
          {label}{props.required && <span className="text-[#C66A30] ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          'w-full px-4 py-3 bg-[#FAF7F2] border rounded-xl text-sm text-[#2A2522] placeholder:text-[#2A2522]/30',
          'focus:outline-none focus:ring-2 focus:ring-[#C66A30]/30 focus:border-[#C66A30]',
          'transition-all duration-200',
          error ? 'border-red-400 bg-red-50' : 'border-black/8',
          'min-h-[44px]',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600 flex items-center gap-1">⚠️ {error}</p>}
      {hint && !error && <p className="text-xs text-[#2A2522]/40">{hint}</p>}
    </div>
  )
);
LuxuryInput.displayName = 'LuxuryInput';
