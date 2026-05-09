import { redirect } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return {
    title: `Hotel ${slug} | Maitri`,
    description: 'SEO landing URL for hotel detail. Redirects to canonical hotel page.',
    alternates: { canonical: `/h/${slug}` },
  };
}

export default async function HotelSeoRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/h/${slug}`);
}
