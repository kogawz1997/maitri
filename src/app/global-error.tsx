'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body style={{ fontFamily: 'sans-serif', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😵</div>
          <h2 style={{ color: '#2A2522', marginBottom: 8 }}>เกิดข้อผิดพลาด</h2>
          <p style={{ color: '#888', fontSize: 14, marginBottom: 24 }}>
            ทีมงานได้รับแจ้งแล้วและกำลังแก้ไข
            {error.digest && <><br /><code style={{ fontSize: 11 }}>Error ID: {error.digest}</code></>}
          </p>
          <button onClick={reset}
            style={{ background: '#C66A30', color: '#fff', border: 0, padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            ลองอีกครั้ง
          </button>
        </div>
      </body>
    </html>
  );
}
