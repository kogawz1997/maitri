import { requireHotelAccess } from '@/lib/auth/guards';
import { SUPPORTED_LOCALES } from '@/lib/i18n/hotel-copy';
import { LanguagePreview } from '@/components/i18n/language-preview';
import type { Locale } from '@/lib/i18n/translations';

export default async function LocalizationPage() {
  const ctx = await requireHotelAccess(null, ['owner', 'admin', 'manager']);
  if (ctx.error) return <div className="p-6">Unauthorized</div>;

  const { data: settings } = await ctx.supabase
    .from('hotel_localization_settings')
    .select('*')
    .eq('hotel_id', ctx.hotelId)
    .maybeSingle();

  const enabled = settings?.enabled_locales || ['th', 'en'];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <p className="text-sm text-muted-foreground">Phase 5</p>
        <h1 className="text-2xl font-semibold tracking-tight">Localization</h1>
        <p className="text-sm text-muted-foreground">ตั้งค่าภาษาเริ่มต้นและภาษาที่เปิดให้แขกใช้</p>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div><div className="text-sm text-muted-foreground">Default Locale</div><div className="text-2xl font-semibold">{settings?.default_locale || 'th'}</div></div>
          <div><div className="text-sm text-muted-foreground">Auto Detect</div><div className="text-2xl font-semibold">{settings?.auto_detect_guest_language === false ? 'Off' : 'On'}</div></div>
          <div><div className="text-sm text-muted-foreground">Enabled</div><div className="text-2xl font-semibold">{enabled.length}</div></div>
        </div>
      </div>
      <LanguagePreview enabled={enabled as Locale[]} />
      <div className="grid gap-3 md:grid-cols-5">
        {SUPPORTED_LOCALES.map((locale) => (
          <div key={locale.code} className="rounded-xl border bg-card p-4">
            <div className="text-lg font-semibold">{locale.label}</div>
            <div className="text-sm text-muted-foreground">{enabled.includes(locale.code) ? 'Enabled' : 'Disabled'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
