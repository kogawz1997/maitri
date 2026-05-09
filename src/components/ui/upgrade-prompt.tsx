'use client';

import Link from 'next/link';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';

interface Props {
  feature: string;
  requiredPlan?: string;
  description?: string;
}

export function UpgradePrompt({ feature, requiredPlan = 'Pro', description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 bg-violet-100 dark:bg-violet-950/30 rounded-full flex items-center justify-center mb-4">
        <Lock className="h-8 w-8 text-violet-500" />
      </div>
      <h3 className="font-bold text-lg mb-1">{feature}</h3>
      <p className="text-sm text-muted-foreground mb-2">
        {description || `ต้องการแผน ${requiredPlan} หรือสูงกว่า`}
      </p>
      <div className="inline-flex items-center gap-1.5 bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
        <Sparkles className="h-3.5 w-3.5" />
        ต้องการแผน {requiredPlan}
      </div>
      <Link href="/dashboard/billing"
        className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium text-sm transition-colors">
        อัพเกรดแผน <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

// Inline lock badge for sidebar items
export function FeatureLocked({ requiredPlan }: { requiredPlan: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-2xs bg-violet-100 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-full font-medium">
      <Lock className="h-2.5 w-2.5" />
      {requiredPlan}
    </span>
  );
}
