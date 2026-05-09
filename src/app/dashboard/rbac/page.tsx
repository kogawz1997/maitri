import { RBAC_MATRIX } from '@/lib/rbac-matrix';

const roles = ['owner','admin','manager','front_desk','housekeeping','maintenance','concierge','security','accounting','staff'] as const;

export default function RBACPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">RBAC Permission Matrix</h1>
      <div className="overflow-auto rounded-xl border">
        <table className="min-w-[1100px] text-xs w-full">
          <thead><tr className="bg-secondary"><th className="p-2 text-left">Menu/Page</th>{roles.map((r)=><th key={r} className="p-2">{r}</th>)}</tr></thead>
          <tbody>
            {RBAC_MATRIX.map((row) => (
              <tr key={row.menu} className="border-t"><td className="p-2 font-medium">{row.menu}</td>{roles.map((r)=><td key={r} className="p-2 text-center">{(row as any)[r]}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
