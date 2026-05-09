export type IntegrationRole = 'owner' | 'admin' | 'manager' | 'staff';

export type IntegrationDef = {
  key: string;
  name: string;
  category: 'compliance' | 'distribution' | 'accounting' | 'messaging';
  description: string;
  requiredEnv: string[];
  roles: IntegrationRole[];
  setupRoute?: string;
  docsPath?: string;
};

export const INTEGRATIONS: IntegrationDef[] = [
  {
    key: 'tm30',
    name: 'TM30 (Immigration)',
    category: 'compliance',
    description: 'ส่งรายงาน TM30 อัตโนมัติ และ fallback manual file',
    requiredEnv: ['IMMIGRATION_API_KEY'],
    roles: ['owner', 'admin', 'manager'],
    docsPath: '/docs/TM30_SETUP.md',
  },
  {
    key: 'etax',
    name: 'e-Tax Invoice',
    category: 'compliance',
    description: 'ออกและส่ง e-Tax ตามผู้ให้บริการที่เลือก',
    requiredEnv: ['ETAX_USERNAME'],
    roles: ['owner', 'admin'],
    docsPath: '/docs/ETAX_SETUP.md',
  },
  {
    key: 'hotelrunner',
    name: 'HotelRunner',
    category: 'distribution',
    description: 'ซิงก์การจอง/สต็อกห้อง/อัปเดตราคา กับช่องทาง OTA',
    requiredEnv: ['CHANNEL_HOTELRUNNER_API_KEY'],
    roles: ['owner', 'admin', 'manager'],
  },
  {
    key: 'peak',
    name: 'PEAK Accounting',
    category: 'accounting',
    description: 'ซิงก์ใบแจ้งหนี้ การชำระเงิน และรายชื่อผู้ติดต่อ',
    requiredEnv: ['PEAK_API_KEY'],
    roles: ['owner', 'admin'],
  },
  {
    key: 'wechat',
    name: 'WeChat Official Account',
    category: 'messaging',
    description: 'รองรับการส่งข้อความและ webhook สำหรับลูกค้าจีน',
    requiredEnv: ['WECHAT_APP_ID', 'WECHAT_APP_SECRET'],
    roles: ['owner', 'admin', 'manager'],
  },
];
