import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireHotelAccess } from '@/lib/auth/guards';
import { rateLimit } from '@/lib/security/rate-limit';

const querySchema = z.object({
  hotelId: z.string().uuid(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  format: z.enum(['csv', 'json']).default('csv'),
});

function escapeCsv(value: unknown) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request: Request) {
  const limited = await rateLimit(request, 'accounting.exports', 20, 60_000);
  if (limited) return limited;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    hotelId: url.searchParams.get('hotelId'),
    from: url.searchParams.get('from'),
    to: url.searchParams.get('to'),
    format: url.searchParams.get('format') || 'csv',
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { hotelId, from, to, format } = parsed.data;
  const ctx = await requireHotelAccess(hotelId, ['owner', 'admin', 'manager']);
  if (ctx.error) return ctx.error;

  const admin = createAdminClient();
  const [{ data: invoices, error: invError }, { data: payments, error: payError }] = await Promise.all([
    admin
      .from('invoices')
      .select('id,invoice_number,invoice_type,issue_date,total_amount,vat_amount,status,currency,guest_id,reservation_id')
      .eq('hotel_id', hotelId)
      .gte('issue_date', from)
      .lte('issue_date', to)
      .order('issue_date', { ascending: true }),
    admin
      .from('payments')
      .select('id,amount,currency,payment_method,status,paid_at,gateway,folio_id,reservation_id')
      .eq('hotel_id', hotelId)
      .gte('paid_at', `${from}T00:00:00.000Z`)
      .lte('paid_at', `${to}T23:59:59.999Z`)
      .order('paid_at', { ascending: true }),
  ]);
  if (invError || payError) return NextResponse.json({ error: invError?.message || payError?.message }, { status: 500 });

  const payload = { hotelId, from, to, generatedAt: new Date().toISOString(), invoices: invoices || [], payments: payments || [] };
  await admin.from('audit_logs').insert({
    hotel_id: hotelId,
    user_id: ctx.user.id,
    action: 'accounting.export.generated',
    entity_type: 'hotel',
    entity_id: hotelId,
    changes: { from, to, invoiceCount: payload.invoices.length, paymentCount: payload.payments.length, format },
  });

  if (format === 'json') return NextResponse.json(payload);

  const rows = [
    'record_type,id,date,number_or_method,status,currency,total_amount,vat_amount,reservation_id,folio_id',
    ...payload.invoices.map((i: any) =>
      ['invoice', i.id, i.issue_date, i.invoice_number, i.status || '', i.currency || 'THB', i.total_amount || 0, i.vat_amount || 0, i.reservation_id || '', ''].map(escapeCsv).join(',')),
    ...payload.payments.map((p: any) =>
      ['payment', p.id, p.paid_at || '', p.payment_method || '', p.status || '', p.currency || 'THB', p.amount || 0, '', p.reservation_id || '', p.folio_id || ''].map(escapeCsv).join(',')),
  ];
  return new NextResponse(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=\"accounting-export-${hotelId}-${from}-to-${to}.csv\"`,
    },
  });
}
