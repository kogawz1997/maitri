import { Star, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

interface ReviewCardProps {
  review: {
    id: string;
    rating: number;
    title?: string;
    comment?: string;
    reviewer_name?: string;
    verified_stay?: boolean;
    created_at: string;
    reply_text?: string;
    rating_clean?: number;
    rating_service?: number;
    rating_location?: number;
    rating_value?: number;
  };
}

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-black/5 p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#C66A30] to-[#2A2522] flex items-center justify-center text-white font-bold text-sm shrink-0">
            {(review.reviewer_name || 'A').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#2A2522]">{review.reviewer_name || 'แขกผู้เข้าพัก'}</p>
            <div className="flex items-center gap-2">
              {review.verified_stay && (
                <span className="flex items-center gap-0.5 text-2xs text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" /> เข้าพักจริง
                </span>
              )}
              <span className="text-2xs text-[#2A2522]/40">
                {format(parseISO(review.created_at), 'MMMM yyyy', { locale: th })}
              </span>
            </div>
          </div>
        </div>
        {/* Score */}
        <div className="flex items-center gap-1.5 bg-[#2A2522] text-white px-2.5 py-1.5 rounded-xl shrink-0">
          <Star className="h-3.5 w-3.5 fill-current text-amber-400" />
          <span className="font-bold text-sm">{review.rating.toFixed(1)}</span>
        </div>
      </div>

      {/* Sub-ratings */}
      {(review.rating_clean || review.rating_service) && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { label: 'ความสะอาด', v: review.rating_clean },
            { label: 'บริการ',    v: review.rating_service },
            { label: 'ทำเล',     v: review.rating_location },
            { label: 'คุ้มค่า',  v: review.rating_value },
          ].filter(r => r.v).map(r => (
            <div key={r.label} className="flex items-center gap-2 text-xs">
              <span className="text-[#2A2522]/40 w-16 shrink-0">{r.label}</span>
              <div className="flex-1 h-1.5 bg-black/8 rounded-full overflow-hidden">
                <div className="h-full bg-[#C66A30] rounded-full" style={{ width: `${((r.v || 0)/5)*100}%` }} />
              </div>
              <span className="text-[#2A2522]/60 w-6 text-right">{r.v!.toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}

      {review.title && <p className="font-semibold text-sm text-[#2A2522] mb-1">{review.title}</p>}
      {review.comment && <p className="text-sm text-[#2A2522]/60 leading-relaxed line-clamp-4">{review.comment}</p>}

      {/* Hotel reply */}
      {review.reply_text && (
        <div className="mt-3 pl-3 border-l-2 border-[#C66A30]/40 bg-[#FAF7F2] rounded-r-lg p-3">
          <p className="text-2xs font-semibold text-[#C66A30] mb-1">ตอบกลับจากโรงแรม</p>
          <p className="text-xs text-[#2A2522]/60 leading-relaxed">{review.reply_text}</p>
        </div>
      )}
    </div>
  );
}
