import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import type { Metadata } from 'next';
import { LuxuryCard } from '@/components/luxury/LuxuryCard';
import { LuxuryBadge } from '@/components/luxury/LuxuryBadge';


export const dynamic = 'force-dynamic';
const DESTINATIONS = ['bangkok', 'chiang-mai', 'phuket', 'samui'] as const;

function normalizeCity(slug: string) {
  return slug.replace(/-/g, ' ').trim().toLowerCase();
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  const pretty = city.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const canonical = `/destinations/${city}`;
  return {
    title: `โรงแรมใน ${pretty} | Maitri`,
    description: `รวมโรงแรมแนะนำใน ${pretty} พร้อมราคาเริ่มต้น คะแนนรีวิว และลิงก์จองตรงกับโรงแรม`,
    alternates: { canonical },
    openGraph: {
      title: `โรงแรมใน ${pretty} | Maitri`,
      description: `รวมโรงแรมแนะนำใน ${pretty} พร้อมราคาเริ่มต้น คะแนนรีวิว และลิงก์จองตรงกับโรงแรม`,
      url: canonical,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `โรงแรมใน ${pretty} | Maitri`,
      description: `รวมโรงแรมแนะนำใน ${pretty} พร้อมราคาเริ่มต้น คะแนนรีวิว และลิงก์จองตรงกับโรงแรม`,
    },
  };
}

export default async function DestinationPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  if (!DESTINATIONS.includes(city as any)) notFound();

  const supabase = await createClient();
  const cityName = normalizeCity(city);
  const { data: hotels } = await supabase
    .from('hotels')
    .select('id,name,slug,city,description')
    .ilike('city', `%${cityName}%`)
    .limit(24);

  const { data: rates } = hotels?.length
    ? await supabase
        .from('room_types')
        .select('hotel_id,base_rate')
        .in('hotel_id', hotels.map((h: any) => h.id))
    : { data: [] as any[] };

  const priceByHotel = new Map<string, number>();
  (rates || []).forEach((r: any) => {
    const prev = priceByHotel.get(r.hotel_id);
    const rate = Number(r.base_rate || 0);
    if (!prev || (rate > 0 && rate < prev)) priceByHotel.set(r.hotel_id, rate);
  });

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Hotels in ${cityName}`,
    url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/destinations/${city}`,
    mainEntity: (hotels || []).map((h: any) => ({
      '@type': 'Hotel',
      name: h.name,
      address: { '@type': 'PostalAddress', addressLocality: h.city || cityName },
      url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/h/${h.slug}`,
    })),
  };

  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'หน้าแรก', item: `${process.env.NEXT_PUBLIC_APP_URL || ''}/` },
      { '@type': 'ListItem', position: 2, name: 'Destinations', item: `${process.env.NEXT_PUBLIC_APP_URL || ''}/destinations` },
      { '@type': 'ListItem', position: 3, name: cityName, item: `${process.env.NEXT_PUBLIC_APP_URL || ''}/destinations/${city}` },
    ],
  };

  return (
    <main className="min-h-screen bg-[#FAF7F2] py-10 px-4">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold text-[#2A2522]">โรงแรมแนะนำใน {cityName}</h1>
        <p className="mt-2 text-sm text-[#2A2522]/60">หน้า Destination Landing สำหรับ SEO และการค้นหาแบบเมือง</p>
        <div className="mt-3">
          <LuxuryBadge variant="amber">Curated Destination Picks</LuxuryBadge>
        </div>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }} />

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {(hotels || []).map((h: any) => (
            <LuxuryCard key={h.id} className="rounded-2xl border border-black/10" padding="sm">
              <h2 className="text-lg font-semibold text-[#2A2522]">{h.name}</h2>
              <p className="text-xs text-[#2A2522]/50">{h.city || cityName}</p>
              <p className="mt-2 text-sm text-[#2A2522]/70 line-clamp-3">{h.description || 'ที่พักคุณภาพ พร้อมจองตรงกับโรงแรม'}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-medium text-[#C66A30]">เริ่ม {formatCurrency(priceByHotel.get(h.id) || 0)}</span>
                <Link className="text-sm underline text-[#2A2522]" href={`/h/${h.slug}`}>ดูรายละเอียด</Link>
              </div>
            </LuxuryCard>
          ))}
        </div>
      </div>
    </main>
  );
}
