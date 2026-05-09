'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function TeamApprovalsPage() {
  const [pending, setPending] = useState<any[]>([]);
  async function load(){
    const res = await fetch('/api/team/members');
    const data = await res.json();
    setPending((data.members||[]).filter((m:any)=>m.active===false));
  }
  useEffect(()=>{load();},[]);
  async function approve(userId:string){
    const res=await fetch('/api/team/approve-account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId})});
    if(!res.ok){toast.error('อนุมัติไม่สำเร็จ');return;} toast.success('อนุมัติแล้ว'); load();
  }
  return <div className='p-6 space-y-4'><h1 className='text-2xl font-semibold'>อนุมัติบัญชีพนักงาน (Owner)</h1>{pending.map(p=><div key={p.id} className='rounded border p-3 flex justify-between'><span>{p.email} ({p.role})</span><button onClick={()=>approve(p.id)} className='text-sm underline'>อนุมัติ</button></div>)}</div>;
}
