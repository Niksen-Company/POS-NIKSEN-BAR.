import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ROLE_PERMISSIONS } from "@shared/schema";
import type { Role } from "@shared/schema";
import { api } from "@/lib/query";
import { User, Lock, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  if (!user) return null;

  const role = user.role as Role;
  const rp = ROLE_PERMISSIONS[role];

  // ── Info form ──────────────────────────────────────────────────────────────
  const [infoForm, setInfoForm] = useState({ name: user.name, email: user.email });
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoMsg, setInfoMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const setInfo = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInfoForm(f => ({ ...f, [k]: e.target.value }));

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!infoForm.name.trim() || !infoForm.email.trim()) {
      setInfoMsg({ ok: false, text: "Name and email are required." });
      return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(infoForm.email.trim())) {
      setInfoMsg({ ok: false, text: "Please enter a valid email address." });
      return;
    }
    setInfoSaving(true);
    setInfoMsg(null);
    try {
      await api.patch("/api/auth/profile", { name: infoForm.name, email: infoForm.email });
      await refreshUser();
      setInfoMsg({ ok: true, text: "Profile updated successfully." });
    } catch (e: any) {
      setInfoMsg({ ok: false, text: e.message || "Failed to update profile." });
    } finally {
      setInfoSaving(false);
    }
  }

  // ── Password form ──────────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ newPassword: "", confirmPassword: "" });
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const setPw = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setPwForm(f => ({ ...f, [k]: e.target.value }));

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pwForm.newPassword) return setPwMsg({ ok: false, text: "New password is required." });
    if (pwForm.newPassword.length < 6) return setPwMsg({ ok: false, text: "Password must be at least 6 characters." });
    if (pwForm.newPassword !== pwForm.confirmPassword)
      return setPwMsg({ ok: false, text: "Passwords do not match." });
    setPwSaving(true);
    setPwMsg(null);
    try {
      await api.patch("/api/auth/profile", { password: pwForm.newPassword });
      setPwForm({ newPassword: "", confirmPassword: "" });
      setPwMsg({ ok: true, text: "Password changed successfully." });
    } catch (e: any) {
      setPwMsg({ ok: false, text: e.message || "Failed to change password." });
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="p-6 overflow-y-auto h-full" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black" style={{ fontFamily: "'Syne', sans-serif" }}>My Profile</h1>
          <p className="text-sm text-[#4e6a5c] mt-1">Manage your account details and password</p>
        </div>

        {/* Avatar / identity card */}
        <div className="bg-[#0f1510] border border-[#1a2620] rounded-2xl p-5 mb-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black shrink-0"
            style={{ background: rp.color + "20", color: rp.color }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-black text-lg leading-tight" style={{ fontFamily: "'Syne', sans-serif" }}>{user.name}</div>
            <div className="text-[11px] font-mono text-[#4e6a5c] mt-0.5">{user.email}</div>
            <div className="mt-2 inline-flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border"
              style={{ color: rp.color, borderColor: rp.color + "44", background: rp.color + "11" }}>
              {rp.badge} {rp.label}
            </div>
          </div>
        </div>

        {/* Info form */}
        <div className="bg-[#0f1510] border border-[#1a2620] rounded-2xl p-5 mb-5">
          <h2 className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#4e6a5c] uppercase mb-4">
            <User size={12} /> Account Details
          </h2>

          <form onSubmit={saveInfo} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono tracking-widest text-[#4e6a5c] uppercase mb-1.5">
                Full Name
              </label>
              <input
                className="w-full bg-[#141c18] border border-[#1a2620] rounded-xl px-3 py-2.5 text-sm focus:border-[#00e87a] outline-none text-white"
                value={infoForm.name}
                onChange={setInfo("name")}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono tracking-widest text-[#4e6a5c] uppercase mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                className="w-full bg-[#141c18] border border-[#1a2620] rounded-xl px-3 py-2.5 text-sm focus:border-[#00e87a] outline-none text-white"
                value={infoForm.email}
                onChange={setInfo("email")}
                placeholder="you@example.com"
              />
            </div>

            {infoMsg && (
              <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border ${
                infoMsg.ok
                  ? "bg-[#00e87a]/10 border-[#00e87a]/25 text-[#00e87a]"
                  : "bg-red-500/10 border-red-500/25 text-red-400"
              }`}>
                {infoMsg.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                {infoMsg.text}
              </div>
            )}

            <button
              type="submit"
              disabled={infoSaving}
              className="w-full py-2.5 rounded-xl text-sm font-black transition-all disabled:opacity-50"
              style={{ background: "#00e87a", color: "#000", fontFamily: "'Syne', sans-serif" }}>
              {infoSaving ? "Saving…" : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Password form */}
        <div className="bg-[#0f1510] border border-[#1a2620] rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#4e6a5c] uppercase mb-4">
            <Lock size={12} /> Change Password
          </h2>

          <form onSubmit={savePassword} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono tracking-widest text-[#4e6a5c] uppercase mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  className="w-full bg-[#141c18] border border-[#1a2620] rounded-xl px-3 py-2.5 pr-9 text-sm focus:border-[#00e87a] outline-none text-white"
                  value={pwForm.newPassword}
                  onChange={setPw("newPassword")}
                  placeholder="Min 6 characters"
                />
                <button type="button" onClick={() => setShowNew(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4e6a5c] hover:text-white transition-colors">
                  {showNew ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-mono tracking-widest text-[#4e6a5c] uppercase mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  className="w-full bg-[#141c18] border border-[#1a2620] rounded-xl px-3 py-2.5 pr-9 text-sm focus:border-[#00e87a] outline-none text-white"
                  value={pwForm.confirmPassword}
                  onChange={setPw("confirmPassword")}
                  placeholder="Repeat new password"
                />
                <button type="button" onClick={() => setShowConfirm(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4e6a5c] hover:text-white transition-colors">
                  {showConfirm ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {pwMsg && (
              <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border ${
                pwMsg.ok
                  ? "bg-[#00e87a]/10 border-[#00e87a]/25 text-[#00e87a]"
                  : "bg-red-500/10 border-red-500/25 text-red-400"
              }`}>
                {pwMsg.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                {pwMsg.text}
              </div>
            )}

            <button
              type="submit"
              disabled={pwSaving}
              className="w-full py-2.5 rounded-xl text-sm font-black transition-all disabled:opacity-50"
              style={{ background: "#00e87a", color: "#000", fontFamily: "'Syne', sans-serif" }}>
              {pwSaving ? "Changing…" : "Change Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
