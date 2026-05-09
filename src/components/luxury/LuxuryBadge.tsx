import { cn } from '@/lib/utils';

type BadgeVariant = 'gold' | 'dark' | 'emerald' | 'sky' | 'rose' | 'amber';

interface Props {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const VARIANTS: Record<BadgeVariant, string> = {
  gold:    'bg-gradient-to-r from-[#C66A30] to-[#E8892A] text-white',
  dark:    'bg-[#2A2522] text-white',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  sky:     'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  rose:    'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  amber:   'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
};

export function LuxuryBadge({ children, variant = 'gold', className }: Props) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide',
      VARIANTS[variant], className
    )}>
      {children}
    </span>
  );
}
