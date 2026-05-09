import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: {
    canonical: '/destinations',
  },
};

export default function DestinationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
