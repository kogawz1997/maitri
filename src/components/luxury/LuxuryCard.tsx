import { cn } from '@/lib/utils';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function LuxuryCard({ hover = true, padding = 'md', className, children, ...props }: Props) {
  const paddings = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' };
  return (
    <div
      className={cn(
        'bg-white rounded-3xl border border-black/5',
        hover && 'transition-all duration-400 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-12px_rgba(42,37,34,0.15)]',
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
