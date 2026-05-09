'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LuxuryInput } from '@/components/luxury/LuxuryInput';
import { LuxuryButton } from '@/components/luxury/LuxuryButton';

const GuestSchema = z.object({
  firstName:       z.string().min(1, 'กรุณากรอกชื่อ').max(100),
  lastName:        z.string().max(100).optional(),
  email:           z.string().email('อีเมลไม่ถูกต้อง').optional().or(z.literal('')),
  phone:           z.string().regex(/^[0-9+\-\s]{6,20}$/, 'เบอร์โทรไม่ถูกต้อง').optional().or(z.literal('')),
  nationality:     z.string().length(2).optional().or(z.literal('')),
  specialRequests: z.string().max(500).optional(),
  estimatedArrival:z.string().optional(),
});

export type GuestFormData = z.infer<typeof GuestSchema>;

interface Props {
  onSubmit: (data: GuestFormData) => void;
  loading?: boolean;
  initialData?: Partial<GuestFormData>;
}

export function GuestForm({ onSubmit, loading, initialData }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<GuestFormData>({
    resolver: zodResolver(GuestSchema),
    defaultValues: initialData || {},
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <LuxuryInput label="ชื่อ" required placeholder="สมชาย"
          {...register('firstName')} error={errors.firstName?.message} />
        <LuxuryInput label="นามสกุล" placeholder="ใจดี"
          {...register('lastName')} error={errors.lastName?.message} />
      </div>
      <LuxuryInput label="อีเมล" type="email" placeholder="example@email.com"
        hint="ส่งยืนยันการจองไปที่อีเมลนี้"
        {...register('email')} error={errors.email?.message} />
      <LuxuryInput label="เบอร์โทรศัพท์" type="tel" placeholder="08X-XXX-XXXX"
        {...register('phone')} error={errors.phone?.message} />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-[#2A2522]/60 uppercase tracking-wider block mb-1.5">สัญชาติ</label>
          <select {...register('nationality')}
            className="w-full px-4 py-3 bg-[#FAF7F2] border border-black/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C66A30]/30 min-h-[44px]">
            <option value="">ไม่ระบุ</option>
            <option value="TH">🇹🇭 ไทย</option>
            <option value="CN">🇨🇳 จีน</option>
            <option value="JP">🇯🇵 ญี่ปุ่น</option>
            <option value="KR">🇰🇷 เกาหลี</option>
            <option value="US">🇺🇸 อเมริกา</option>
            <option value="GB">🇬🇧 อังกฤษ</option>
            <option value="SG">🇸🇬 สิงคโปร์</option>
            <option value="AU">🇦🇺 ออสเตรเลีย</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-[#2A2522]/60 uppercase tracking-wider block mb-1.5">เวลาเช็คอิน (ประมาณ)</label>
          <select {...register('estimatedArrival')}
            className="w-full px-4 py-3 bg-[#FAF7F2] border border-black/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C66A30]/30 min-h-[44px]">
            <option value="">ไม่ระบุ</option>
            {['14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','หลังเที่ยงคืน'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-[#2A2522]/60 uppercase tracking-wider block mb-1.5">คำขอพิเศษ</label>
        <textarea {...register('specialRequests')} rows={3}
          placeholder="เช่น ต้องการห้องชั้นสูง, ห้องห่างลิฟต์, เตียงเสริม..."
          className="w-full px-4 py-3 bg-[#FAF7F2] border border-black/8 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#C66A30]/30" />
        <p className="text-2xs text-[#2A2522]/40 mt-1">ไม่สามารถรับประกันได้ แต่เราจะพยายามอย่างเต็มที่</p>
      </div>

      <LuxuryButton type="submit" fullWidth loading={loading} size="lg">
        ถัดไป → ตรวจสอบและชำระเงิน
      </LuxuryButton>
    </form>
  );
}
