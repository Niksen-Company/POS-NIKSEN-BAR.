import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, LogIn } from "lucide-react";

const DEMO_ACCOUNTS = [
  { role: "owner",    email: "owner@niksen.co",   password: "niksen2024", badge: "👑", color: "#ffd43b", label: "Owner" },
  { role: "manager",  email: "manager@niksen.co", password: "manager123", badge: "🔷", color: "#4da8f7", label: "Manager" },
  { role: "staff",    email: "staff@niksen.co",   password: "staff123",   badge: "🟢", color: "#00e87a", label: "Staff" },
  { role: "customer", email: "customer@niksen.co",password: "guest123",   badge: "🛒", color: "#cc5de8", label: "Customer" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const oauthError = new URLSearchParams(window.location.search).get("error");
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(
    oauthError === "google_auth_failed"
      ? "Google sign-in failed or your account is not allowed."
      : "",
  );

  function signInWithGoogle() {
    window.location.href = "/auth/google";
  }

  useEffect(() => {
    fetch("/api/auth/google/enabled")
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((d) => setGoogleEnabled(Boolean(d?.enabled)))
      .catch(() => setGoogleEnabled(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try { await login(email, password); }
    catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function quickLogin(acc: typeof DEMO_ACCOUNTS[0]) {
    setError(""); setLoading(true);
    try { await login(acc.email, acc.password); }
    catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[#080d0b] flex flex-col items-center justify-center p-4"
      style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="text-5xl font-black tracking-tight mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>
          <span style={{ color: "#00e87a" }}>NIKSEN</span>
          <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 300 }}> POS</span>
        </div>
        <p className="text-xs font-mono tracking-widest" style={{ color: "#4e6a5c" }}>
          CHOWTO · KOH SAMUI
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-[#0f1510] border border-[#1a2620] rounded-2xl p-8 shadow-2xl">
        <h2 className="text-lg font-bold mb-6" style={{ fontFamily: "'Syne', sans-serif" }}>Sign in</h2>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono tracking-widest text-[#4e6a5c] uppercase mb-2">Email</label>
            <input
              type="email" autoComplete="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@niksen.co"
              className="w-full bg-[#141c18] border border-[#1a2620] rounded-xl px-4 py-3 text-sm outline-none text-white placeholder:text-[#4e6a5c] transition-all focus:border-[#00e87a]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono tracking-widest text-[#4e6a5c] uppercase mb-2">Password</label>
            <div className="relative">
              <input
                type={show ? "text" : "password"} autoComplete="current-password" required
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#141c18] border border-[#1a2620] rounded-xl px-4 py-3 pr-11 text-sm outline-none text-white placeholder:text-[#4e6a5c] transition-all focus:border-[#00e87a]"
              />
              <button type="button" onClick={() => setShow(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4e6a5c] hover:text-white transition-colors">
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ background: "#00e87a", color: "#000", fontFamily: "'Syne', sans-serif" }}>
            <LogIn size={15} />
            {loading ? "Signing in…" : "Sign In"}
          </button>
          {googleEnabled && (
            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-black text-sm border border-[#1a2620] bg-[#141c18] text-white transition-all hover:border-[#2a3830] disabled:opacity-50"
            >
              Sign In with Google
            </button>
          )}
        </form>

        {/* Quick login tiles */}
        <div className="mt-7">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[#1a2620]" />
            <span className="text-[10px] font-mono tracking-widest text-[#4e6a5c]">QUICK LOGIN</span>
            <div className="flex-1 h-px bg-[#1a2620]" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {DEMO_ACCOUNTS.map(acc => (
              <button key={acc.role} onClick={() => quickLogin(acc)} disabled={loading}
                className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-[#1a2620] bg-[#141c18] hover:border-opacity-60 transition-all text-left disabled:opacity-40 group"
                style={{ ["--hover-color" as any]: acc.color }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = acc.color + "55")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#1a2620")}
              >
                <span className="text-xl flex-shrink-0">{acc.badge}</span>
                <div>
                  <div className="text-xs font-bold" style={{ fontFamily: "'Syne', sans-serif", color: acc.color }}>{acc.label}</div>
                  <div className="text-[9px] font-mono text-[#4e6a5c] truncate">{acc.email}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-6 text-[10px] font-mono text-[#4e6a5c] tracking-wider">
        NIKSEN © {new Date().getFullYear()} · KOH SAMUI, THAILAND
      </p>
    </div>
  );
}
