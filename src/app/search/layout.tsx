import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ค้นหาโรงแรม | Maitri',
  description: 'ค้นหาโรงแรมและที่พัก พร้อมกรองราคา คะแนน และความสะดวกได้ในหน้าเดียว',
  alternates: {
    canonical: '/search',
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
