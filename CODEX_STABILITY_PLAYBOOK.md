# Codex Stability Playbook (Thai)

เอกสารนี้ใช้แก้อาการ Codex ตอบค้าง/ตอบว่างในงาน repo นี้

## สรุปสาเหตุที่พบบ่อย
- session เดิมยาวเกินไปหรือ context แตก
- คำสั่งยาวเกิน/รวมหลายงานในครั้งเดียว
- browser extension หรือ network แทรกแซง
- มี incident ฝั่งระบบชั่วคราว

## วิธีทำให้เสถียรที่สุด (ทำตามลำดับ)
1. เปิดแชทใหม่ทุกครั้งก่อนเริ่มงานใหญ่
2. วาง `environment_context` ให้ครบ
3. สั่งงานทีละ 1–3 ข้อเท่านั้น
4. ใส่ guardrail บังคับไม่ให้เงียบ:
   - `ถ้าข้อมูลไม่พอ ให้ถามกลับ 1 คำถาม ห้ามตอบว่าง`
5. กำหนดรูปแบบคำตอบตายตัว: `Summary / Commands / Next step`
6. ถ้าค้างเกิน 30 วินาที: รีเฟรช > Incognito > สลับเน็ต
7. เช็กสถานะระบบที่ https://status.openai.com

## Prompt Template (สั้น)
```txt
<environment_context>
  <cwd>/workspace/Full-hotel</cwd>
  <shell>bash</shell>
  <current_date>2026-05-08</current_date>
  <timezone>Etc/UTC</timezone>
</environment_context>

งาน:
1) [ใส่งานข้อ 1]
2) [ใส่งานข้อ 2]

ข้อกำหนด:
- ถ้าข้อมูลไม่พอ ให้ถามกลับ 1 คำถาม ห้ามตอบว่าง
- รายงานผลเป็น: Summary / Commands used / Next step
```

## Prompt Template (กู้ session ค้าง)
```txt
ทำต่อจากขั้นล่าสุดนี้: [อธิบายสั้น 1-2 บรรทัด]
ถ้าข้อมูลไม่พอ ให้ถามกลับ 1 คำถาม ห้ามตอบว่าง
```
