import { ImageResponse } from 'next/og';
import { createAdminClient } from '@/lib/supabase/server';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: hotel } = await supabase
    .from('hotels')
    .select('name,city,hero_image_url')
    .eq('slug', slug)
    .single();

  const title = hotel?.name || 'Maitri Hotel';
  const city = hotel?.city || 'Thailand';
  const hero = hotel?.hero_image_url;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: '#1f2937',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt={title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : null}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.75))',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 48, zIndex: 1 }}>
          <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1 }}>{title}</div>
          <div style={{ marginTop: 16, fontSize: 28, opacity: 0.9 }}>{city} • Book direct with confidence</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
