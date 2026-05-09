'use client';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  children: React.ReactNode;
  className?: string;
  reveal?: boolean;
  id?: string;
}

export function LuxurySection({ children, className, reveal = true, id }: Props) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!reveal) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); observer.disconnect(); } },
      { threshold: 0.08 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reveal]);

  return (
    <section
      id={id}
      ref={ref}
      className={cn(reveal && 'reveal', 'py-16 md:py-24', className)}
    >
      {children}
    </section>
  );
}

export function SectionHeader({ overline, title, subtitle, center = true }: {
  overline?: string; title: React.ReactNode; subtitle?: string; center?: boolean;
}) {
  return (
    <div className={cn('mb-12', center && 'text-center')}>
      {overline && <p className="overline text-[#C66A30] mb-3">{overline}</p>}
      <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight text-[#2A2522] mb-4">{title}</h2>
      {subtitle && <p className="text-[#2A2522]/60 max-w-xl mx-auto text-lg leading-relaxed">{subtitle}</p>}
    </div>
  );
}
