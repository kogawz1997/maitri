'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

type ReservationAction = 'check_in' | 'check_out' | 'cancel';

const ACTION_LABELS: Record<ReservationAction, string> = {
  check_in: 'เช็คอิน',
  check_out: 'เช็คเอาท์',
  cancel: 'ยกเลิก',
};

export function ReservationActionButtons({
  reservationId,
  status,
  compact = false,
}: {
  reservationId: string;
  status: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<ReservationAction | null>(null);
  const [isPending, startTransition] = useTransition();

  const actions: ReservationAction[] = [];
  if (status === 'pending' || status === 'confirmed') actions.push('check_in');
  if (status === 'checked_in') actions.push('check_out');
  if (!['checked_out', 'cancelled', 'no_show'].includes(status)) actions.push('cancel');

  if (actions.length === 0) return null;

  async function run(action: ReservationAction) {
    if (action === 'cancel' && !window.confirm('ยืนยันยกเลิกการจองนี้?')) return;

    setPendingAction(action);
    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'ทำรายการไม่สำเร็จ');

      toast.success(`${ACTION_LABELS[action]}สำเร็จ`);
      startTransition(() => router.refresh());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ทำรายการไม่สำเร็จ');
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
      {actions.map((action) => (
        <Button
          key={action}
          size={compact ? 'sm' : 'default'}
          variant={action === 'cancel' ? 'outline' : 'default'}
          className={action === 'cancel' ? 'text-destructive hover:bg-destructive/10' : undefined}
          disabled={Boolean(pendingAction) || isPending}
          onClick={() => run(action)}
        >
          {pendingAction === action ? 'กำลังทำ...' : ACTION_LABELS[action]}
        </Button>
      ))}
    </div>
  );
}
