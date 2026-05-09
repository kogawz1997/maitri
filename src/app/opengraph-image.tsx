import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'Maitri PMS — Hotel Operating System';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: 72, background: '#FAF7F2', color: '#2A2522',
        fontFamily: 'Arial, sans-serif', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -110, top: -110, width: 360, height: 360, borderRadius: 999, background: '#C66A30', opacity: 0.18 }} />
        <div style={{ position: 'absolute', left: -140, bottom: -180, width: 460, height: 460, borderRadius: 999, background: '#2A2522', opacity: 0.12 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 44 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: '#2A2522', color: '#C66A30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42, fontWeight: 900 }}>M</div>
          <div style={{ fontSize: 34, fontWeight: 800 }}>Maitri PMS</div>
        </div>
        <div style={{ fontSize: 70, lineHeight: 1.03, fontWeight: 900, maxWidth: 920 }}>
          Hotel Operating System for modern hospitality teams
        </div>
        <div style={{ marginTop: 32, fontSize: 30, color: '#6F625B', maxWidth: 850 }}>
          Booking · Inbox · Channel Manager · Compliance · Staff Operations
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 52 }}>
          {['AI-first', 'Thailand-ready', 'Multi-tenant SaaS'].map((x) => (
            <div key={x} style={{ padding: '12px 20px', borderRadius: 999, background: '#fff', border: '1px solid rgba(42,37,34,.12)', fontSize: 22, fontWeight: 700 }}>{x}</div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
