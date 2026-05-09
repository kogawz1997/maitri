export type GuestIntent = 'spa' | 'food' | 'late_checkout' | 'booking' | 'complaint' | 'general';
export function detectGuestIntent(text: string): { intent: GuestIntent; confidence: number } {
  const value = text.toLowerCase();
  if (/spa|massage|นวด|สปา/.test(value)) return { intent: 'spa', confidence: 0.86 };
  if (/food|hungry|menu|restaurant|อาหาร|หิว|เมนู/.test(value)) return { intent: 'food', confidence: 0.84 };
  if (/late checkout|extend|เช็กเอาต์ช้า|เลทเช็คเอาท์|ต่อเวลา/.test(value)) return { intent: 'late_checkout', confidence: 0.82 };
  if (/book|reservation|ห้องว่าง|จอง|booking/.test(value)) return { intent: 'booking', confidence: 0.78 };
  if (/angry|bad|refund|complain|แย่|คืนเงิน|ร้องเรียน/.test(value)) return { intent: 'complaint', confidence: 0.9 };
  return { intent: 'general', confidence: 0.55 };
}
export function fallbackReply(intent: GuestIntent, locale = 'en') {
  const th = locale === 'th';
  const replies: Record<GuestIntent, string> = {
    spa: th ? 'มีบริการสปาและนวดค่ะ/ครับ ต้องการให้เราช่วยจองเวลาให้ไหม?' : 'We have spa services available. Would you like me to help book a time?',
    food: th ? 'สามารถสั่งอาหารไปที่ห้องได้ค่ะ/ครับ ต้องการดูเมนูไหม?' : 'You can order food to your room. Would you like to see the menu?',
    late_checkout: th ? 'เราจะเช็กห้องว่างสำหรับ late checkout ให้ค่ะ/ครับ' : 'I can check late checkout availability for you.',
    booking: th ? 'เราช่วยตรวจสอบห้องว่างและรายละเอียดการจองให้ได้ค่ะ/ครับ' : 'I can help check availability and booking details.',
    complaint: th ? 'ขออภัยสำหรับปัญหานี้ค่ะ/ครับ เราจะส่งต่อให้พนักงานดูแลทันที' : 'I’m sorry about that. I’ll escalate this to our staff right away.',
    general: th ? 'พนักงานของเราจะช่วยดูแลคุณต่อค่ะ/ครับ' : 'Our staff will assist you shortly.',
  };
  return replies[intent];
}
