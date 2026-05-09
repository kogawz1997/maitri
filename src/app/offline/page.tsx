'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="text-7xl mb-6">📡</div>
        <h1 className="text-2xl font-bold text-[#2A2522] mb-3">ไม่มีการเชื่อมต่ออินเทอร์เน็ต</h1>
        <p className="text-[#2A2522]/60 mb-8 leading-relaxed">
          กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคุณ<br />
          แล้วลองใหม่อีกครั้ง
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-[#C66A30] text-white rounded-full font-medium hover:bg-[#A4522A] transition-colors">
          ลองอีกครั้ง
        </button>
      </div>
    </div>
  );
}
