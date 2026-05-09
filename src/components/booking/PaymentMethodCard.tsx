'use client';

import { cn } from '@/lib/utils';

export type PaymentMethod = 'online' | 'at_hotel' | 'deposit';

interface MethodOption {
  key: PaymentMethod;
  label: string;
  description?: string;
  badge?: string;
}

interface PaymentMethodCardProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  options?: MethodOption[];
}

const defaultOptions: MethodOption[] = [
  { key: 'online', label: 'ชำระออนไลน์', description: 'ชำระทันทีเพื่อยืนยันการจอง' },
  { key: 'at_hotel', label: 'ชำระที่โรงแรม', description: 'จ่ายตอนเช็คอิน เหมาะกับการจองยืดหยุ่น' },
  { key: 'deposit', label: 'ชำระมัดจำ', description: 'ชำระบางส่วนเพื่อยืนยัน และจ่ายส่วนที่เหลือที่โรงแรม' },
];

export function PaymentMethodCard({ value, onChange, options = defaultOptions }: PaymentMethodCardProps) {
  return (
    <div className="space-y-3">
      {options.map((option) => (
        <label
          key={option.key}
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-all',
            value === option.key ? 'border-[#C66A30] bg-[#C66A30]/5' : 'border-black/10 hover:border-[#C66A30]/40'
          )}
        >
          <input
            type="radio"
            name="payment-method"
            className="mt-1"
            checked={value === option.key}
            onChange={() => onChange(option.key)}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-[#2A2522]">{option.label}</p>
              {option.badge ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  {option.badge}
                </span>
              ) : null}
            </div>
            {option.description ? <p className="mt-1 text-xs text-[#2A2522]/60">{option.description}</p> : null}
          </div>
        </label>
      ))}
    </div>
  );
}
