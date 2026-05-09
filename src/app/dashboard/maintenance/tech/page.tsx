export default function MaintenanceTechPage() {
  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">หน้าพนักงานซ่อม (Maintenance)</h1>
      <p className="text-sm text-muted-foreground">สำหรับรับงานซ่อม แจ้งสถานะ และปิดงานเท่านั้น</p>
      <div className="rounded-xl border border-border bg-card p-4 text-sm">
        <ul className="list-disc pl-5 space-y-1">
          <li>ดูรายการงานซ่อมที่ได้รับมอบหมาย</li>
          <li>อัปเดตสถานะงาน: รอดำเนินการ / กำลังซ่อม / เสร็จสิ้น</li>
          <li>แนบโน้ตการซ่อมและเวลาที่ใช้</li>
        </ul>
      </div>
    </div>
  );
}
