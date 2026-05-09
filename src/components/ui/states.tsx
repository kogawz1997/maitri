/**
 * Reusable UI states: Loading, Empty, Error
 * Use in every dashboard page
 */
import { Loader2, Inbox, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// Loading skeleton
export function LoadingSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3 animate-pulse', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 bg-secondary rounded-xl" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  );
}

// Loading spinner
export function LoadingSpinner({ text = 'กำลังโหลด...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

// Empty state
export function EmptyState({ icon: Icon = Inbox, title, description, action }: {
  icon?: any; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-14 w-14 bg-secondary rounded-full flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-muted-foreground/50" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}

// Error state
export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-14 w-14 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center mb-4">
        <AlertTriangle className="h-7 w-7 text-red-500" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">เกิดข้อผิดพลาด</h3>
      {message && <p className="text-sm text-muted-foreground max-w-sm mb-4">{message}</p>}
      {onRetry && (
        <button onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/70 rounded-xl text-sm transition-colors">
          <RefreshCw className="h-3.5 w-3.5" /> ลองอีกครั้ง
        </button>
      )}
    </div>
  );
}

// Permission denied
export function PermissionDenied({ requiredRole }: { requiredRole?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4">🔒</div>
      <h3 className="font-semibold">ไม่มีสิทธิ์เข้าถึง</h3>
      {requiredRole && <p className="text-sm text-muted-foreground mt-1">ต้องการสิทธิ์: {requiredRole}</p>}
    </div>
  );
}
