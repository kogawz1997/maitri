import { createClient } from '@/lib/supabase/client';

const AUTH_TIMEOUT_MS = 15000;

async function signInWithTimeout(email: string, password: string) {
  const supabase = createClient();
  const result = await Promise.race([
    supabase.auth.signInWithPassword({ email, password }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('AUTH_TIMEOUT')), AUTH_TIMEOUT_MS)),
  ]);
  return { supabase, result };
}



export async function loginInternal(email: string, password: string) {
  const { supabase, result } = await signInWithTimeout(email, password);
  if (result.error) return { ok: false, message: result.error.message };

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role,active,organization_id')
    .eq('id', result.data.user?.id)
    .maybeSingle();

  if (!profile || !profile.active) {
    await supabase.auth.signOut();
    return { ok: false, message: 'บัญชีนี้ไม่ใช่ผู้ใช้งานภายในโรงแรม' };
  }

  if (['owner', 'admin'].includes(profile.role || '') && !profile.organization_id) {
    return { ok: true, redirectTo: '/admin' as const };
  }

  return { ok: true, redirectTo: '/dashboard' as const };
}

export async function loginManagement(email: string, password: string) {
  const { supabase, result } = await signInWithTimeout(email, password);
  if (result.error) return { ok: false, message: result.error.message };

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role,active,organization_id')
    .eq('id', result.data.user?.id)
    .maybeSingle();

  if (!profile || !profile.active || !['owner', 'admin'].includes(profile.role || '')) {
    await supabase.auth.signOut();
    return { ok: false, message: 'บัญชีนี้ไม่มีสิทธิ์กลุ่มบริหาร' };
  }

  return { ok: true, redirectTo: profile.organization_id ? '/dashboard' as const : '/admin' as const };
}

export async function loginOwner(email: string, password: string) {
  const { supabase, result } = await signInWithTimeout(email, password);
  if (result.error) return { ok: false, message: result.error.message };

  const { data: profile } = await supabase.from('user_profiles').select('role,active').eq('id', result.data.user?.id).maybeSingle();
  if (!profile || !profile.active || !['owner', 'admin'].includes(profile.role || '')) {
    await supabase.auth.signOut();
    return { ok: false, message: 'บัญชีนี้ไม่มีสิทธิ์หน้าเจ้าของโรงแรม' };
  }

  return { ok: true, redirectTo: '/dashboard' as const };
}

export async function loginStaff(email: string, password: string) {
  const { supabase, result } = await signInWithTimeout(email, password);
  if (result.error) return { ok: false, message: result.error.message };

  const { data: profile } = await supabase.from('user_profiles').select('id,active').eq('id', result.data.user?.id).maybeSingle();
  if (!profile || !profile.active) {
    await supabase.auth.signOut();
    return { ok: false, message: 'บัญชีนี้ไม่มีสิทธิ์หน้าพนักงาน' };
  }

  return { ok: true, redirectTo: '/dashboard' as const };
}

export async function loginWebAdmin(email: string, password: string) {
  const { supabase, result } = await signInWithTimeout(email, password);
  if (result.error) return { ok: false, message: result.error.message };

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', result.data.user?.id).maybeSingle();
  if (!profile || !['owner', 'admin'].includes(profile.role || '')) {
    await supabase.auth.signOut();
    return { ok: false, message: 'บัญชีนี้ไม่มีสิทธิ์เว็บแอดมิน' };
  }

  return { ok: true, redirectTo: '/admin' as const };
}
