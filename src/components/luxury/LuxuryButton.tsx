'use client';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export const LuxuryButton = forwardRef<HTMLButtonElement, Props>(({
  variant = 'primary', size = 'md', loading, fullWidth,
  className, children, disabled, ...props
}, ref) => {
  const base = 'relative inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-300 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C66A30] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const shimmer = "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-500";

  const variants = {
    primary:   `bg-[#C66A30] text-white hover:bg-[#A4522A] active:scale-[0.98] shadow-lg shadow-[#C66A30]/20 ${shimmer}`,
    secondary: `bg-[#2A2522] text-white hover:bg-black active:scale-[0.98] ${shimmer}`,
    ghost:     `bg-transparent text-[#2A2522] hover:bg-[#2A2522]/8 active:scale-[0.98]`,
    outline:   `bg-transparent border-2 border-[#2A2522]/20 text-[#2A2522] hover:border-[#C66A30] hover:text-[#C66A30] active:scale-[0.98]`,
  };

  const sizes = {
    sm: 'text-xs px-4 py-2 min-h-[36px]',
    md: 'text-sm px-6 py-3 min-h-[44px]',
    lg: 'text-base px-8 py-4 min-h-[52px]',
  };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
      {children}
    </button>
  );
});
LuxuryButton.displayName = 'LuxuryButton';
