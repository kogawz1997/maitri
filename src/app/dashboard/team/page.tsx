'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { TopBar } from '@/components/layout/top-bar';
import { UserPlus, Shield, Crown, Users, Sparkles, Bed, Eye, Pencil, UserX, Wrench } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_META: Record<string, { label: string; icon: any; description: string; color: string }> = {
  owner:       { label: 'Owner',      icon: Crown,   description: 'ทุกอย่าง + billing', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200' },
  admin:       { label: 'Admin',      icon: Shield,  description: 'ทุกอย่าง ยกเว้น billing', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200' },
  manager:     { label: 'Manager',    icon: Users,   description: 'Ops, การเงิน, รายงาน', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200' },
  front_desk:  { label: 'Front Desk', icon: Pencil,  description: 'จอง, Inbox, Check-in/out', color: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200' },
  housekeeping:{ label: 'Housekeeping',icon: Sparkles, description: 'งานแม่บ้านเท่านั้น', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' },
  maintenance: { label: 'Maintenance', icon: Wrench, description: 'งานซ่อมบำรุงและแจ้งงานช่าง', color: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200' },
  staff:       { label: 'Staff',      icon: Eye,     description: 'View-only', color: 'bg-secondary text-muted-foreground' },
};

interface Member {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  active: boolean;
  created_at: string;
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('front_desk');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [editRole, setEditRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [staffLoginLink, setStaffLoginLink] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/team/members');
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch { toast.error('ไม่สามารถโหลดรายชื่อทีมได้'); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim().toLowerCase(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`ส่งคำเชิญไปที่ ${inviteEmail} แล้ว`);
      setShowInvite(false);
      setInviteEmail('');
    } catch (e: any) {
      toast.error(e.message || 'เกิดข้อผิดพลาด');
    } finally { setInviting(false); }
  }


  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim() || !newPassword.trim() || !newFullName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/team/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          password: newPassword,
          fullName: newFullName,
          role: inviteRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('สร้างบัญชีพนักงานสำเร็จ');
      setShowCreate(false);
      setInviteEmail(''); setNewPassword(''); setNewFullName('');
      load();
    } catch (e: any) {
      toast.error(e.message || 'เกิดข้อผิดพลาด');
    } finally { setCreating(false); }
  }

  async function handleUpdateMember(memberId: string, updates: Record<string, any>) {
    setSaving(true);
    try {
      const res = await fetch('/api/team/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, ...updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('อัพเดตสำเร็จ');
      setEditMember(null);
      load();
    } catch (e: any) {
      toast.error(e.message || 'เกิดข้อผิดพลาด');
    } finally { setSaving(false); }
  }


  async function generateStaffLoginLink() {
    try {
      const res = await fetch('/api/team/staff-login-link', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'สร้างลิงก์ไม่สำเร็จ');
      setStaffLoginLink(data.loginUrl);
      await navigator.clipboard.writeText(data.loginUrl).catch(() => undefined);
      toast.success('สร้างลิงก์ login พนักงานแล้ว (คัดลอกให้อัตโนมัติ)');
    } catch (e: any) {
      toast.error(e.message || 'สร้างลิงก์ไม่สำเร็จ');
    }
  }

  const activeCount = members.filter(m => m.active).length;

  return (
    <div className="container max-w-4xl py-8 animate-fade-in">
      <TopBar
        title="ทีมงาน"
        description={`${activeCount} คนที่ active`}
        action={
          <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setShowInvite(true)}>
            <UserPlus className="h-3.5 w-3.5" /> เชิญสมาชิก
          </Button><Button size="sm" onClick={() => setShowCreate(true)}><UserPlus className="h-3.5 w-3.5" /> สร้างบัญชีพนักงาน</Button><Button size="sm" variant="secondary" onClick={generateStaffLoginLink}>สร้างลิงก์ Login พนักงาน</Button><Button asChild size="sm" variant="ghost"><Link href="/dashboard/team/create-user">หน้าเพิ่ม User/Password</Link></Button></div>
        }
      />

      {staffLoginLink && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">ลิงก์พนักงานเฉพาะโรงแรม: <span className="font-mono break-all">{staffLoginLink}</span></div>}

      {/* Role legend */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {Object.entries(ROLE_META).filter(([k]) => k !== 'owner').map(([key, meta]) => {
          const Icon = meta.icon;
          return (
            <div key={key} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card">
              <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium">{meta.label}</div>
                <div className="text-2xs text-muted-foreground">{meta.description}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Member list */}
      <Card>
        <CardHeader>
          <CardTitle>สมาชิกทั้งหมด</CardTitle>
          <CardDescription>จัดการสิทธิ์และสถานะของทีมงาน</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 bg-secondary rounded-xl animate-pulse" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              ยังไม่มีสมาชิก — กด &quot;เชิญสมาชิก&quot; เพื่อเริ่มต้น
            </div>
          ) : (
            <div className="divide-y divide-border">
              {members.map(member => {
                const meta = ROLE_META[member.role];
                const Icon = meta?.icon || Users;
                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-4 px-6 py-4 transition-colors ${!member.active ? 'opacity-40' : 'hover:bg-secondary/30'}`}
                  >
                    <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium text-sm shrink-0">
                      {(member.full_name || member.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{member.full_name || '—'}</span>
                        {!member.active && <Badge variant="secondary" className="text-2xs">ปิดใช้งาน</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{member.email}</div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${meta?.color}`}>
                      <Icon className="h-3 w-3" />
                      {meta?.label || member.role}
                    </div>
                    {member.role !== 'owner' && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => { setEditMember(member); setEditRole(member.role); }}
                        >
                          แก้ไข
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className={member.active ? 'text-destructive hover:text-destructive' : 'text-emerald-600'}
                          onClick={() => handleUpdateMember(member.id, { active: !member.active })}
                        >
                          {member.active ? <UserX className="h-3.5 w-3.5" /> : 'เปิดใช้'}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>


      <Dialog open={showCreate} onOpenChange={(o) => !o && setShowCreate(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Owner สร้างบัญชีพนักงาน</DialogTitle>
            <DialogDescription>บัญชีนี้เข้าได้เฉพาะลิงก์ระบบพนักงาน และสร้างโดยเจ้าของเท่านั้น</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <input type="text" required value={newFullName} onChange={e => setNewFullName(e.target.value)} placeholder="ชื่อพนักงาน" className="w-full px-3 py-2 bg-secondary border-0 rounded-lg text-sm" />
            <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="staff@hotel.com" className="w-full px-3 py-2 bg-secondary border-0 rounded-lg text-sm" />
            <input type="password" required minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="รหัสผ่านขั้นต่ำ 8 ตัว" className="w-full px-3 py-2 bg-secondary border-0 rounded-lg text-sm" />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>ยกเลิก</Button>
              <Button type="submit" disabled={creating}>{creating ? 'กำลังสร้าง...' : 'สร้างบัญชี'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite Modal */}
      <Dialog open={showInvite} onOpenChange={(o) => !o && setShowInvite(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>เชิญสมาชิกใหม่</DialogTitle>
            <DialogDescription>ระบบจะส่ง email คำเชิญพร้อมลิงก์เข้าร่วมทีม</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">อีเมล</label>
              <input
                type="email" required value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="staff@hotel.com"
                className="w-full px-3 py-2 bg-secondary border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">สิทธิ์การเข้าถึง</label>
              <div className="space-y-2">
                {Object.entries(ROLE_META).filter(([k]) => k !== 'owner').map(([key, meta]) => {
                  const Icon = meta.icon;
                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${inviteRole === key ? 'border-accent bg-accent/5' : 'border-border hover:bg-secondary/50'}`}
                    >
                      <input type="radio" name="role" value={key} checked={inviteRole === key}
                        onChange={e => setInviteRole(e.target.value)} className="sr-only" />
                      <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{meta.label}</div>
                        <div className="text-2xs text-muted-foreground">{meta.description}</div>
                      </div>
                      {inviteRole === key && <div className="h-4 w-4 rounded-full bg-accent flex items-center justify-center text-white text-xs">✓</div>}
                    </label>
                  );
                })}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowInvite(false)}>ยกเลิก</Button>
              <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
                {inviting ? 'กำลังส่ง...' : 'ส่งคำเชิญ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Role Modal */}
      <Dialog open={!!editMember} onOpenChange={(o) => !o && setEditMember(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>แก้ไขสิทธิ์ {editMember?.full_name || editMember?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {Object.entries(ROLE_META).filter(([k]) => k !== 'owner').map(([key, meta]) => {
              const Icon = meta.icon;
              return (
                <label
                  key={key}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${editRole === key ? 'border-accent bg-accent/5' : 'border-border hover:bg-secondary/50'}`}
                >
                  <input type="radio" name="editRole" value={key} checked={editRole === key}
                    onChange={e => setEditRole(e.target.value)} className="sr-only" />
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{meta.label}</div>
                    <div className="text-2xs text-muted-foreground">{meta.description}</div>
                  </div>
                  {editRole === key && <div className="h-4 w-4 rounded-full bg-accent flex items-center justify-center text-white text-xs">✓</div>}
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMember(null)}>ยกเลิก</Button>
            <Button disabled={saving || editRole === editMember?.role}
              onClick={() => editMember && handleUpdateMember(editMember.id, { role: editRole })}>
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
