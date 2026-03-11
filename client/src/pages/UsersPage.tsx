import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/query";
import { useAuth } from "@/context/AuthContext";
import { ROLE_PERMISSIONS } from "@shared/schema";
import type { SafeUser, Role } from "@shared/schema";
import { Plus, Pencil, PowerOff, X, Eye, EyeOff, Shield } from "lucide-react";

const ROLES: Role[] = ["owner", "manager", "staff", "customer"];

const ROLE_PERMS_LABELS: { key: keyof typeof ROLE_PERMISSIONS[Role]; label: string }[] = [
  { key: "canSell",          label: "Sell / Checkout" },
  { key: "canViewDash",      label: "View Dashboard" },
  { key: "canManageStock",   label: "Manage Inventory" },
  { key: "canManageUsers",   label: "Manage Users" },
  { key: "canViewReports",   label: "View Reports" },
  { key: "canApplyDiscount", label: "Apply Discounts" },
  { key: "canViewCost",      label: "View Cost Price" },
  { key: "canDeleteOrders",  label: "Delete Orders" },
  { key: "canManageClients", label: "Manage Clients" },
];

function RoleBadge({ role }: { role: Role }) {
  const p = ROLE_PERMISSIONS[role];
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border"
      style={{ color: p.color, borderColor: p.color + "44", background: p.color + "11" }}>
      {p.badge} {p.label}
    </span>
  );
}

function UserModal({ user, onClose }: { user?: SafeUser; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!user;
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    role: (user?.role ?? "staff") as Role,
    password: "",
    pin: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function save() {
    if (!form.name || !form.email) return setErr("Name and email required");
    if (!isEdit && !form.password) return setErr("Password required for new users");
    setSaving(true); setErr("");
    try {
      const body: any = { name: form.name, email: form.email, role: form.role };
      if (form.password) body.password = form.password;
      if (form.pin) body.pin = form.pin;
      if (isEdit) await api.patch(`/api/users/${user!.id}`, body);
      else await api.post("/api/users", body);
      qc.invalidateQueries({ queryKey: ["/api/users"] });
      onClose();
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  const p = ROLE_PERMISSIONS[form.role];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="bg-[#111815] border border-[#1a2620] rounded-2xl p-6 w-[520px] max-h-[90vh] overflow-y-auto"
        style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>
            {isEdit ? "Edit User" : "New User"}
          </h3>
          <button onClick={onClose} className="text-[#4e6a5c] hover:text-white transition-colors"><X size={18}/></button>
        </div>

        {err && <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">{err}</div>}

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[10px] font-mono tracking-widest text-[#4e6a5c] uppercase mb-1.5">Full Name *</label>
            <input className="w-full bg-[#141c18] border border-[#1a2620] rounded-xl px-3 py-2.5 text-sm focus:border-[#00e87a] outline-none text-white" value={form.name} onChange={set("name")} placeholder="Jane Smith" />
          </div>
          <div>
            <label className="block text-[10px] font-mono tracking-widest text-[#4e6a5c] uppercase mb-1.5">Email *</label>
            <input type="email" className="w-full bg-[#141c18] border border-[#1a2620] rounded-xl px-3 py-2.5 text-sm focus:border-[#00e87a] outline-none text-white" value={form.email} onChange={set("email")} placeholder="jane@niksen.co" />
          </div>
          <div>
            <label className="block text-[10px] font-mono tracking-widest text-[#4e6a5c] uppercase mb-1.5">{isEdit ? "New Password" : "Password *"}</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} className="w-full bg-[#141c18] border border-[#1a2620] rounded-xl px-3 py-2.5 pr-9 text-sm focus:border-[#00e87a] outline-none text-white" value={form.password} onChange={set("password")} placeholder={isEdit ? "Leave blank to keep" : "Min 6 chars"} />
              <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4e6a5c] hover:text-white">
                {showPw ? <EyeOff size={13}/> : <Eye size={13}/>}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-mono tracking-widest text-[#4e6a5c] uppercase mb-1.5">PIN (4 digits)</label>
            <input maxLength={4} className="w-full bg-[#141c18] border border-[#1a2620] rounded-xl px-3 py-2.5 text-sm focus:border-[#00e87a] outline-none text-white font-mono tracking-widest" value={form.pin} onChange={set("pin")} placeholder="1234" />
          </div>
        </div>

        {/* Role selector */}
        <div className="mb-5">
          <label className="block text-[10px] font-mono tracking-widest text-[#4e6a5c] uppercase mb-2">Role</label>
          <div className="grid grid-cols-4 gap-2">
            {ROLES.map(r => {
              const rp = ROLE_PERMISSIONS[r];
              const active = form.role === r;
              return (
                <button key={r} type="button" onClick={() => setForm(f => ({ ...f, role: r }))}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all"
                  style={{
                    borderColor: active ? rp.color : "#1a2620",
                    background: active ? rp.color + "15" : "#141c18",
                  }}>
                  <span className="text-xl">{rp.badge}</span>
                  <span className="text-[10px] font-bold" style={{ color: active ? rp.color : "#4e6a5c", fontFamily: "'Syne', sans-serif" }}>{rp.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Permission preview */}
        <div className="bg-[#0d1210] border border-[#1a2620] rounded-xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={12} style={{ color: p.color }} />
            <span className="text-[10px] font-mono tracking-widest text-[#4e6a5c] uppercase">Permissions for {p.label}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {ROLE_PERMS_LABELS.map(({ key, label }) => {
              const granted = p[key] as boolean;
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-mono ${granted ? "" : "opacity-30"}`} style={{ color: granted ? p.color : "#4e6a5c" }}>
                    {granted ? "✓" : "✕"}
                  </span>
                  <span className={`text-[10px] ${granted ? "text-white" : "text-[#4e6a5c]"}`}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 bg-[#141c18] border border-[#1a2620] rounded-xl text-sm font-mono text-[#4e6a5c] hover:border-[#00e87a]/40 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all disabled:opacity-50"
            style={{ background: "#00e87a", color: "#000", fontFamily: "'Syne', sans-serif" }}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const { data: userList = [] } = useQuery<SafeUser[]>({
    queryKey: ["/api/users"],
    queryFn: () => api.get("/api/users"),
  });
  const [modal, setModal] = useState<"new" | SafeUser | null>(null);

  async function toggleActive(u: SafeUser) {
    await api.patch(`/api/users/${u.id}`, { active: !u.active });
    qc.invalidateQueries({ queryKey: ["/api/users"] });
  }

  const grouped = ROLES.reduce((acc, r) => {
    acc[r] = userList.filter(u => u.role === r);
    return acc;
  }, {} as Record<Role, SafeUser[]>);

  return (
    <div className="p-6 overflow-y-auto h-full" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ fontFamily: "'Syne', sans-serif" }}>Team & Roles</h1>
          <p className="text-sm text-[#4e6a5c] mt-1">{userList.length} users · NIKSEN / CHOWTO</p>
        </div>
        <button onClick={() => setModal("new")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm transition-all"
          style={{ background: "#00e87a", color: "#000", fontFamily: "'Syne', sans-serif" }}>
          <Plus size={14} /> Add User
        </button>
      </div>

      {/* Permission matrix */}
      <div className="bg-[#0f1510] border border-[#1a2620] rounded-2xl p-5 mb-6 overflow-x-auto">
        <h2 className="text-xs font-mono tracking-widest text-[#4e6a5c] uppercase mb-4 flex items-center gap-2">
          <Shield size={12} /> Permission Matrix
        </h2>
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left font-mono text-[#4e6a5c] pb-2 pr-4 text-[10px] tracking-wider">PERMISSION</th>
              {ROLES.map(r => {
                const rp = ROLE_PERMISSIONS[r];
                return (
                  <th key={r} className="text-center pb-2 px-3">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-base">{rp.badge}</span>
                      <span className="font-bold text-[10px]" style={{ color: rp.color }}>{rp.label}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {ROLE_PERMS_LABELS.map(({ key, label }) => (
              <tr key={key} className="border-t border-[#1a2620]">
                <td className="py-2 pr-4 text-[#4e6a5c] text-[11px]">{label}</td>
                {ROLES.map(r => {
                  const granted = ROLE_PERMISSIONS[r][key] as boolean;
                  const color = ROLE_PERMISSIONS[r].color;
                  return (
                    <td key={r} className="text-center py-2 px-3">
                      <span className="text-sm" style={{ color: granted ? color : "#1a2620" }}>
                        {granted ? "●" : "○"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Users by role */}
      <div className="space-y-6">
        {ROLES.map(role => {
          const list = grouped[role];
          const rp = ROLE_PERMISSIONS[role];
          return (
            <div key={role}>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="text-lg">{rp.badge}</span>
                <h2 className="font-bold text-sm" style={{ fontFamily: "'Syne', sans-serif", color: rp.color }}>{rp.label}</h2>
                <span className="text-[10px] font-mono text-[#4e6a5c] bg-[#141c18] border border-[#1a2620] px-2 py-0.5 rounded-full">
                  {list.length} {list.length === 1 ? "user" : "users"}
                </span>
              </div>

              {list.length === 0 ? (
                <div className="text-[11px] text-[#4e6a5c] font-mono pl-8">— No {rp.label.toLowerCase()}s yet</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {list.map(u => (
                    <div key={u.id} className={`bg-[#0f1510] border rounded-xl p-4 transition-all ${u.active ? "border-[#1a2620] hover:border-[#1f2e28]" : "border-[#1a2620] opacity-50"}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black" style={{ background: rp.color + "20", color: rp.color }}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-sm flex items-center gap-1.5" style={{ fontFamily: "'Syne', sans-serif" }}>
                              {u.name}
                              {u.id === me?.id && <span className="text-[8px] font-mono bg-[#00e87a]/10 text-[#00e87a] border border-[#00e87a]/25 px-1.5 py-0.5 rounded-full">YOU</span>}
                            </div>
                            <div className="text-[10px] font-mono text-[#4e6a5c] mt-0.5">{u.email}</div>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => setModal(u)} className="w-7 h-7 rounded-lg border border-[#1a2620] flex items-center justify-center text-[#4e6a5c] hover:border-[#00e87a]/50 hover:text-[#00e87a] transition-colors">
                            <Pencil size={11} />
                          </button>
                          {u.id !== me?.id && (
                            <button onClick={() => toggleActive(u)} className="w-7 h-7 rounded-lg border border-[#1a2620] flex items-center justify-center text-[#4e6a5c] hover:border-red-400/50 hover:text-red-400 transition-colors">
                              <PowerOff size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <RoleBadge role={u.role as Role} />
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${u.active ? "bg-[#00e87a]" : "bg-[#4e6a5c]"}`} />
                          <span className="text-[9px] font-mono text-[#4e6a5c]">{u.active ? "Active" : "Inactive"}</span>
                        </div>
                      </div>
                      {u.lastLogin && (
                        <div className="mt-2 text-[9px] font-mono text-[#4e6a5c]">
                          Last login: {new Date(u.lastLogin).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modal && (
        <UserModal
          user={modal === "new" ? undefined : modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
