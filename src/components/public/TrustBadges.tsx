import { ShieldCheck, Lock, BadgeCheck } from 'lucide-react';

const badges = [
  { icon: Lock, title: 'Secure Payment', desc: 'ธุรกรรมเข้ารหัสมาตรฐานอุตสาหกรรม' },
  { icon: ShieldCheck, title: 'SSL Protected', desc: 'ข้อมูลส่วนบุคคลได้รับการปกป้อง' },
  { icon: BadgeCheck, title: 'Verified Hotel', desc: 'ที่พักผ่านการยืนยันตัวตนแล้ว' },
];

export function TrustBadges() {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {badges.map((badge) => (
        <div key={badge.title} className="flex items-start gap-2 rounded-lg border border-black/10 bg-white px-3 py-2">
          <badge.icon className="mt-0.5 h-4 w-4 text-emerald-600" />
          <div>
            <p className="text-xs font-semibold text-[#2A2522]">{badge.title}</p>
            <p className="text-2xs text-[#2A2522]/60">{badge.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
