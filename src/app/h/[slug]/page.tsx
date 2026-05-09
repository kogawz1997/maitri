import { createAdminClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { MapPin, Phone, Mail, Star, Clock, ChevronRight, Bed, Users, Maximize2, Wifi, Wind, Coffee, Car, Waves } from 'lucide-react';
import { format } from 'date-fns';
import { GuestChatWidget } from '@/components/booking/guest-chat-widget';
import { WishlistButton } from '@/components/ui/wishlist-button';
import { HotelGallery } from '@/components/booking/hotel-gallery';
import type { Metadata } from 'next';


export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';
  const supabase = createAdminClient();
  const { data: h } = await supabase.from('hotels').select('name,description,hero_image_url,city').eq('slug', slug).single();
  if (!h) return {};
  return {
    metadataBase: new URL(appUrl),
    title: `${h.name} — จองห้องพักออนไลน์`,
    description: h.description || `จองห้องพักที่ ${h.name} ${h.city} ราคาดีที่สุด`,
    alternates: {
      canonical: `/h/${slug}`,
    },
    openGraph: {
      title: `${h.name}`,
      description: h.description || `ที่พักใน ${h.city}`,
      url: `/h/${slug}`,
      images: h.hero_image_url ? [{ url: h.hero_image_url, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${h.name} — จองห้องพักออนไลน์`,
      description: h.description || `ที่พักใน ${h.city}`,
      images: h.hero_image_url ? [h.hero_image_url] : [],
    },
  };
}

const AMENITY_ICONS: Record<string, any> = { wifi: Wifi, 'air conditioning': Wind, ac: Wind, breakfast: Coffee, pool: Waves, parking: Car };

export default async function HotelLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: hotel } = await supabase
    .from('hotels')
    .select('*, hotel_gallery(id, image_url, alt_text, display_order)')
    .eq('slug', slug)
    .single();
  if (!hotel) notFound();

  const { data: roomTypes } = await supabase
    .from('room_types')
    .select('*, room_type_images(image_url, display_order)')
    .eq('hotel_id', hotel.id)
    .order('base_rate');

  const { data: reviews } = await supabase
    .from('booking_reviews')
    .select('id, rating, rating_clean, rating_service, rating_location, rating_value, title, comment, reviewer_name, verified_stay, reply_text, created_at')
    .eq('hotel_id', hotel.id)
    .order('created_at', { ascending: false })
    .limit(8);

  const gallery = (hotel.hotel_gallery || []).sort((a: any, b: any) => a.display_order - b.display_order);
  const avgRating = reviews?.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

  const ratingBreakdown = reviews?.length ? {
    clean:    reviews.filter(r => r.rating_clean).reduce((s, r) => s + (r.rating_clean || 0), 0) / reviews.filter(r => r.rating_clean).length || 0,
    service:  reviews.filter(r => r.rating_service).reduce((s, r) => s + (r.rating_service || 0), 0) / reviews.filter(r => r.rating_service).length || 0,
    location: reviews.filter(r => r.rating_location).reduce((s, r) => s + (r.rating_location || 0), 0) / reviews.filter(r => r.rating_location).length || 0,
    value:    reviews.filter(r => r.rating_value).reduce((s, r) => s + (r.rating_value || 0), 0) / reviews.filter(r => r.rating_value).length || 0,
  } : null;

  const minRate = roomTypes?.length ? Math.min(...roomTypes.map((r: any) => Number(r.base_rate))) : 0;
  const hotelJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: hotel.name,
    description: hotel.description || undefined,
    image: hotel.hero_image_url || undefined,
    telephone: hotel.phone || undefined,
    email: hotel.email || undefined,
    address: hotel.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: hotel.address,
          addressLocality: hotel.city || undefined,
          addressCountry: 'TH',
        }
      : undefined,
    aggregateRating: avgRating
      ? {
          '@type': 'AggregateRating',
          ratingValue: Number(avgRating.toFixed(1)),
          reviewCount: reviews?.length || 0,
        }
      : undefined,
    priceRange: minRate ? `THB ${Math.round(minRate).toLocaleString()}+` : undefined,
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'หน้าแรก', item: `${process.env.NEXT_PUBLIC_APP_URL || ''}/` },
      { '@type': 'ListItem', position: 2, name: 'โรงแรม', item: `${process.env.NEXT_PUBLIC_APP_URL || ''}/search` },
      { '@type': 'ListItem', position: 3, name: hotel.name, item: `${process.env.NEXT_PUBLIC_APP_URL || ''}/h/${slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(hotelJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {/* Sticky nav */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-black/5">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {hotel.logo_url && <img src={hotel.logo_url} alt="logo" className="h-8 object-contain" />}
            <div>
              <div className="font-bold text-[#2A2522] text-sm">{hotel.name}</div>
              {hotel.city && <div className="text-2xs text-[#2A2522]/50 flex items-center gap-0.5"><MapPin className="h-3 w-3" />{hotel.city}</div>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <WishlistButton hotelId={hotel.id} />
            <Link href={`/booking/${slug}`}
              className="px-5 py-2 bg-[#C66A30] text-white rounded-full text-sm font-medium hover:bg-[#A4522A] transition-colors">
              จองเลย
            </Link>
          </div>
        </div>
      </nav>

      {/* Airbnb-style gallery grid */}
      <HotelGallery
        images={gallery.length > 0
          ? gallery.map((g: any) => ({ url: g.image_url, alt: g.alt_text || hotel.name }))
          : hotel.hero_image_url
            ? [{ url: hotel.hero_image_url, alt: hotel.name }]
            : []
        }
        hotelName={hotel.name}
      />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-10">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-10">

            {/* Header */}
            <div className="border-b border-black/8 pb-8">
              <h1 className="text-2xl font-bold text-[#2A2522] mb-2">{hotel.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-[#2A2522]/60 mb-4">
                {hotel.city && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{hotel.city}</span>}
                {avgRating && (
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                    <strong className="text-[#2A2522]">{avgRating.toFixed(1)}</strong>
                    <span className="text-[#2A2522]/40">({reviews?.length} รีวิว)</span>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-[#2A2522]/60">
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />เช็คอิน {hotel.check_in_time || '14:00'} น.</span>
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />เช็คเอาท์ {hotel.check_out_time || '12:00'} น.</span>
              </div>
            </div>

            {/* About */}
            {hotel.description && (
              <div className="border-b border-black/8 pb-8">
                <h2 className="text-lg font-bold text-[#2A2522] mb-3">เกี่ยวกับที่พัก</h2>
                <p className="text-[#2A2522]/70 leading-relaxed">{hotel.description}</p>
              </div>
            )}

            {/* Policies */}
            <div className="border-b border-black/8 pb-8" id="policies">
              <h2 className="text-lg font-bold text-[#2A2522] mb-4">นโยบายที่พัก</h2>
              <div className="grid sm:grid-cols-2 gap-4 text-sm text-[#2A2522]/70">
                <div className="p-4 rounded-xl bg-[#FAF7F2]">
                  <p className="font-semibold text-[#2A2522] mb-1">เวลาเช็คอิน / เช็คเอาท์</p>
                  <p>เช็คอิน: {hotel.check_in_time || '14:00'} น.</p>
                  <p>เช็คเอาท์: {hotel.check_out_time || '12:00'} น.</p>
                </div>
                <div className="p-4 rounded-xl bg-[#FAF7F2]">
                  <p className="font-semibold text-[#2A2522] mb-1">นโยบายการยกเลิก</p>
                  <p>ยกเลิกฟรีก่อนวันเช็คอินอย่างน้อย 24 ชั่วโมง</p>
                </div>
                <div className="p-4 rounded-xl bg-[#FAF7F2]">
                  <p className="font-semibold text-[#2A2522] mb-1">เด็กและเตียงเสริม</p>
                  <p>รองรับผู้เข้าพักได้สูงสุดตามประเภทห้องพัก</p>
                </div>
                <div className="p-4 rounded-xl bg-[#FAF7F2]">
                  <p className="font-semibold text-[#2A2522] mb-1">สัตว์เลี้ยง</p>
                  <p>กรุณาติดต่อโรงแรมล่วงหน้าเพื่อยืนยันเงื่อนไข</p>
                </div>
              </div>
            </div>

            {/* Nearby places */}
            <div className="border-b border-black/8 pb-8" id="nearby">
              <h2 className="text-lg font-bold text-[#2A2522] mb-4">สถานที่ใกล้เคียง</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {[`แหล่งท่องเที่ยวหลักใน${hotel.city || 'พื้นที่ใกล้เคียง'}`, 'ร้านอาหารยอดนิยม', 'ศูนย์การค้า', 'สถานีขนส่ง / รถไฟฟ้า'].map((place) => (
                  <div key={place} className="p-4 rounded-xl border border-black/10 bg-white text-sm text-[#2A2522]/70">
                    <p className="font-medium text-[#2A2522]">{place}</p>
                    <p className="text-xs mt-1">ระยะทางโดยประมาณ 1–3 กม.</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Map */}
            <div className="border-b border-black/8 pb-8" id="map">
              <h2 className="text-lg font-bold text-[#2A2522] mb-4">แผนที่</h2>
              <div className="rounded-2xl overflow-hidden border border-black/10">
                <iframe
                  title={`Map of ${hotel.name}`}
                  src={`https://www.google.com/maps?q=${encodeURIComponent(`${hotel.name} ${hotel.address || hotel.city || ''}`)}&output=embed`}
                  className="w-full h-80"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>

            {/* Room types */}
            {roomTypes && roomTypes.length > 0 && (
              <div className="border-b border-black/8 pb-8" id="rooms">
                <h2 className="text-lg font-bold text-[#2A2522] mb-5">ห้องพักที่มี</h2>
                <div className="space-y-4">
                  {roomTypes.map((rt: any) => {
                    const imgs = (rt.room_type_images || []).sort((a: any, b: any) => a.display_order - b.display_order);
                    const amenities: string[] = rt.amenities || [];
                    return (
                      <div key={rt.id} className="flex flex-col sm:flex-row gap-4 p-4 border border-black/8 rounded-2xl hover:border-[#C66A30]/30 transition-colors">
                        <div className="sm:w-40 h-36 sm:h-auto bg-[#FAF7F2] rounded-xl overflow-hidden shrink-0">
                          {imgs[0]?.image_url
                            ? <img src={imgs[0].image_url} alt={rt.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-[#2A2522]/10"><Bed className="h-10 w-10" /></div>
                          }
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-[#2A2522]">{rt.name}</h3>
                            <div className="text-right">
                              <div className="font-bold text-[#2A2522]">{formatCurrency(rt.base_rate)}</div>
                              <div className="text-xs text-[#2A2522]/40">/ คืน</div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-[#2A2522]/50 mb-2">
                            {rt.size_sqm && <span className="flex items-center gap-1"><Maximize2 className="h-3 w-3" />{rt.size_sqm} ตร.ม.</span>}
                            {rt.max_occupancy && <span className="flex items-center gap-1"><Users className="h-3 w-3" />สูงสุด {rt.max_occupancy} คน</span>}
                            {rt.bed_type && <span className="flex items-center gap-1"><Bed className="h-3 w-3" />{rt.bed_type}</span>}
                          </div>
                          {amenities.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {amenities.slice(0, 5).map((a: string) => (
                                <span key={a} className="text-2xs bg-[#FAF7F2] text-[#2A2522]/60 px-2 py-0.5 rounded-full">{a}</span>
                              ))}
                            </div>
                          )}
                          <Link href={`/booking/${slug}`}
                            className="inline-flex items-center gap-1 text-sm text-[#C66A30] font-medium hover:underline">
                            ดูห้องนี้ <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reviews */}
            {reviews && reviews.length > 0 && (
              <div id="reviews">
                <div className="flex items-center gap-4 mb-6">
                  <h2 className="text-lg font-bold text-[#2A2522]">รีวิวจากแขก</h2>
                  {avgRating && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      <span className="font-bold text-amber-700">{avgRating.toFixed(1)}</span>
                      <span className="text-xs text-amber-600">/ 5 · {reviews.length} รีวิว</span>
                    </div>
                  )}
                </div>

                {/* Rating breakdown */}
                {ratingBreakdown && (
                  <div className="grid grid-cols-2 gap-3 mb-6 p-4 bg-[#FAF7F2] rounded-2xl">
                    {[
                      { k: 'clean',    l: 'ความสะอาด' },
                      { k: 'service',  l: 'บริการ' },
                      { k: 'location', l: 'ทำเล' },
                      { k: 'value',    l: 'ความคุ้มค่า' },
                    ].map(({ k, l }) => {
                      const v = (ratingBreakdown as any)[k];
                      if (!v) return null;
                      return (
                        <div key={k} className="flex items-center gap-2">
                          <span className="text-xs text-[#2A2522]/50 w-20">{l}</span>
                          <div className="flex-1 h-1.5 bg-black/10 rounded-full overflow-hidden">
                            <div className="h-full bg-[#C66A30] rounded-full" style={{ width: `${(v / 5) * 100}%` }} />
                          </div>
                          <span className="text-xs font-medium text-[#2A2522] w-6">{v.toFixed(1)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  {reviews.map(r => (
                    <div key={r.id} className="p-4 border border-black/8 rounded-2xl">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-[#2A2522] text-white flex items-center justify-center text-sm font-bold">
                            {(r.reviewer_name || 'A').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#2A2522]">{r.reviewer_name || 'แขกผู้เข้าพัก'}</p>
                            {r.verified_stay && <p className="text-2xs text-emerald-600">✓ เข้าพักจริง</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-sm font-bold text-[#2A2522]">{r.rating}</span>
                        </div>
                      </div>
                      {r.title && <p className="text-sm font-semibold text-[#2A2522] mb-1">{r.title}</p>}
                      {r.comment && <p className="text-sm text-[#2A2522]/60 line-clamp-3 leading-relaxed">{r.comment}</p>}
                      {r.reply_text && (
                        <div className="mt-3 pl-3 border-l-2 border-[#C66A30]/40">
                          <p className="text-2xs text-[#C66A30] font-semibold mb-0.5">ตอบกลับจากโรงแรม</p>
                          <p className="text-xs text-[#2A2522]/60">{r.reply_text}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact */}
            <div id="contact" className="border-t border-black/8 pt-8">
              <h2 className="text-lg font-bold text-[#2A2522] mb-4">ติดต่อและที่ตั้ง</h2>
              <div className="space-y-3 text-sm">
                {hotel.address && <div className="flex items-start gap-3"><MapPin className="h-4 w-4 text-[#C66A30] mt-0.5 shrink-0" /><span className="text-[#2A2522]/70">{hotel.address}</span></div>}
                {hotel.phone && <a href={`tel:${hotel.phone}`} className="flex items-center gap-3 hover:text-[#C66A30] transition-colors"><Phone className="h-4 w-4 text-[#C66A30] shrink-0" /><span className="text-[#2A2522]/70">{hotel.phone}</span></a>}
                {hotel.email && <a href={`mailto:${hotel.email}`} className="flex items-center gap-3 hover:text-[#C66A30] transition-colors"><Mail className="h-4 w-4 text-[#C66A30] shrink-0" /><span className="text-[#2A2522]/70">{hotel.email}</span></a>}
              </div>
            </div>
          </div>

          {/* Sticky Booking Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-24 bg-white border border-black/10 rounded-2xl shadow-lg p-6">
              <div className="mb-4">
                <div className="text-xs text-[#2A2522]/40 mb-0.5">ราคาเริ่มต้น</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-[#2A2522]">{formatCurrency(minRate)}</span>
                  <span className="text-sm text-[#2A2522]/40">/ คืน</span>
                </div>
                {avgRating && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-semibold text-[#2A2522]">{avgRating.toFixed(1)}</span>
                    <span className="text-xs text-[#2A2522]/40">({reviews?.length} รีวิว)</span>
                  </div>
                )}
              </div>

              {/* Mini date picker */}
              <div className="border border-black/10 rounded-xl overflow-hidden mb-3">
                <div className="grid grid-cols-2 divide-x divide-black/10">
                  <div className="p-3">
                    <div className="text-2xs font-semibold text-[#2A2522]/50 uppercase tracking-wider mb-1">เช็คอิน</div>
                    <input type="date" className="w-full text-sm text-[#2A2522] bg-transparent focus:outline-none"
                      defaultValue={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} />
                  </div>
                  <div className="p-3">
                    <div className="text-2xs font-semibold text-[#2A2522]/50 uppercase tracking-wider mb-1">เช็คเอาท์</div>
                    <input type="date" className="w-full text-sm text-[#2A2522] bg-transparent focus:outline-none"
                      defaultValue={new Date(Date.now() + 172800000).toISOString().slice(0, 10)} />
                  </div>
                </div>
                <div className="border-t border-black/10 p-3">
                  <div className="text-2xs font-semibold text-[#2A2522]/50 uppercase tracking-wider mb-1">ผู้เข้าพัก</div>
                  <select className="w-full text-sm text-[#2A2522] bg-transparent focus:outline-none">
                    {[1,2,3,4].map(n => <option key={n} value={n}>{n} ผู้ใหญ่</option>)}
                  </select>
                </div>
              </div>

              <Link href={`/booking/${slug}`}
                className="block w-full text-center bg-[#C66A30] hover:bg-[#A4522A] text-white py-3.5 rounded-xl font-semibold text-sm transition-colors mb-3">
                ดูห้องว่าง
              </Link>

              <div className="flex items-center gap-2 text-xs text-[#2A2522]/40 justify-center mb-3">
                🔒 ไม่มีค่าธรรมเนียมการจอง
              </div>

              {/* Quick info */}
              <div className="space-y-2 text-xs text-[#2A2522]/60 border-t border-black/8 pt-3">
                <div className="flex justify-between"><span>เช็คอิน</span><span className="font-medium text-[#2A2522]">{hotel.check_in_time || '14:00'} น.</span></div>
                <div className="flex justify-between"><span>เช็คเอาท์</span><span className="font-medium text-[#2A2522]">{hotel.check_out_time || '12:00'} น.</span></div>
                <div className="flex justify-between"><span>ยกเลิกฟรี</span><span className="font-medium text-emerald-600">24 ชม.ก่อนเช็คอิน</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-black/8 p-4 flex items-center justify-between z-30">
        <div>
          <div className="font-bold text-[#2A2522]">{formatCurrency(minRate)}<span className="text-xs font-normal text-[#2A2522]/50"> / คืน</span></div>
          {avgRating && <div className="text-xs text-[#2A2522]/50 flex items-center gap-1"><Star className="h-3 w-3 text-amber-400 fill-amber-400" />{avgRating.toFixed(1)}</div>}
        </div>
        <Link href={`/booking/${slug}`}
          className="px-8 py-3 bg-[#C66A30] text-white rounded-xl font-semibold text-sm hover:bg-[#A4522A] transition-colors">
          จองเลย
        </Link>
      </div>

      <GuestChatWidget hotelId={hotel.id} hotelName={hotel.name} />

      <footer className="bg-[#2A2522] text-white/50 py-6 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm">
          © {new Date().getFullYear()} {hotel.name} · Powered by <Link href="/" className="text-[#C66A30] font-semibold">Maitri</Link>
        </div>
      </footer>
    </div>
  );
}
