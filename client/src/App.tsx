import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ROLE_PERMISSIONS } from "@shared/schema";
import type { Role } from "@shared/schema";
import LoginPage from "@/pages/LoginPage";
import POSPage from "@/pages/pos";
import DashboardPage from "@/pages/dashboard";
import InventoryPage from "@/pages/inventory";
import ClientsPage from "@/pages/clients";
import OrdersPage from "@/pages/orders";
import UsersPage from "@/pages/UsersPage";
import CameraPage from "@/pages/camera"; // ← NEW
import {
  LayoutGrid, ShoppingCart, Package, Users, ClipboardList,
  UserCog, LogOut, ChevronDown, Camera, // ← Camera added
} from "lucide-react";

// Pages visible per role
const ALL_PAGES = [
  { key: "pos",       label: "Sell",      icon: ShoppingCart, perm: "canSell"           as const },
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid,   perm: "canViewDash"       as const },
  { key: "inventory", label: "Inventory", icon: Package,      perm: "canManageStock"    as const },
  { key: "clients",   label: "Clients",   icon: Users,        perm: "canManageClients"  as const },
  { key: "orders",    label: "Orders",    icon: ClipboardList,perm: "canViewReports"    as const },
  { key: "camera",    label: "Camera",    icon: Camera,       perm: "canViewDash"       as const }, // ← NEW
  { key: "users",     label: "Team",      icon: UserCog,      perm: "canManageUsers"    as const },
];

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono text-[11px] tabular-nums" style={{ color: "#4e6a5c" }}>
      {time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </span>
  );
}

function UserMenu({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const role = user.role as Role;
  const rp = ROLE_PERMISSIONS[role];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#1a2620] bg-[#141c18] hover:border-[#2a3830] transition-all"
      >
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black"
          style={{ background: rp.color + "25", color: rp.color }}>
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-[11px] font-bold leading-tight" style={{ fontFamily: "'Syne', sans-serif" }}>{user.name}</div>
          <div className="text-[9px] font-mono" style={{ color: rp.color }}>{rp.badge} {rp.label}</div>
        </div>
        <ChevronDown size={11} style={{ color: "#4e6a5c" }} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-52 bg-[#0f1510] border border-[#1a2620] rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1a2620]">
              <div className="text-xs font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>{user.name}</div>
              <div className="text-[10px] font-mono text-[#4e6a5c] mt-0.5">{user.email}</div>
              <div className="mt-2 inline-flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border"
                style={{ color: rp.color, borderColor: rp.color + "44", background: rp.color + "11" }}>
                {rp.badge} {rp.label}
              </div>
            </div>
            <button onClick={() => { onLogout(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-xs text-red-400 hover:bg-red-400/5 transition-colors">
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function AppShell() {
  const { user, loading, logout, can } = useAuth();
  const [page, setPage] = useState("pos");

  if (loading) return (
    <div className="min-h-screen bg-[#080d0b] flex items-center justify-center">
      <div className="text-[#00e87a] font-mono text-sm animate-pulse">Loading NIKSEN POS…</div>
    </div>
  );

  if (!user) return <LoginPage />;

  const visiblePages = ALL_PAGES.filter(p => can(p.perm));
  const currentPage  = visiblePages.find(p => p.key === page) ? page : visiblePages[0]?.key ?? "pos";

  const PageComponent = {
    pos:       POSPage,
    dashboard: DashboardPage,
    inventory: InventoryPage,
    clients:   ClientsPage,
    orders:    OrdersPage,
    camera:    CameraPage,   // ← NEW
    users:     UsersPage,
  }[currentPage] ?? POSPage;

  const role = user.role as Role;
  const rp   = ROLE_PERMISSIONS[role];

  if (role === "customer") {
    return (
      <div className="min-h-screen bg-[#080d0b] flex flex-col items-center justify-center p-6"
        style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="text-center mb-8">
          <div className="text-4xl font-black mb-1" style={{ fontFamily: "'Syne', sans-serif", color: "#00e87a" }}>NIKSEN</div>
          <p className="text-[11px] font-mono text-[#4e6a5c] tracking-widest">CRAFT BEVERAGES · KOH SAMUI</p>
        </div>
        <div className="w-full max-w-lg bg-[#0f1510] border border-[#1a2620] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-black text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>Our Menu 🍺</h2>
            <button onClick={logout} className="text-[10px] font-mono text-[#4e6a5c] hover:text-red-400 flex items-center gap-1 transition-colors">
              <LogOut size={11}/> Sign out
            </button>
          </div>
          <p className="text-sm text-[#4e6a5c] text-center py-8">
            Welcome, <strong className="text-white">{user.name}</strong>! 👋<br/>
            <span className="text-xs">Ask our staff to place your order.</span>
          </p>
          <div className="text-center mt-4">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-mono px-3 py-1.5 rounded-full border"
              style={{ color: rp.color, borderColor: rp.color + "44", background: rp.color + "11" }}>
              {rp.badge} Customer Account
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#080d0b", color: "#e4ede8" }}>
      {/* Topbar */}
      <header className="flex items-center justify-between px-5 h-[52px] border-b shrink-0 z-40"
        style={{ background: "#0f1510", borderColor: "#1a2620" }}>

        <div className="font-black text-lg tracking-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
          <span style={{ color: "#00e87a" }}>NIKSEN</span>
          <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 300 }}> POS</span>
        </div>

        <nav className="flex items-center gap-1">
          {visiblePages.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setPage(key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all border"
              style={currentPage === key
                ? { background: "rgba(0,232,122,0.08)", borderColor: "rgba(0,232,122,0.35)", color: "#00e87a" }
                : { border: "1px solid transparent", color: "#4e6a5c" }
              }
              onMouseEnter={e => { if (currentPage !== key) (e.target as HTMLElement).style.color = "#e4ede8"; }}
              onMouseLeave={e => { if (currentPage !== key) (e.target as HTMLElement).style.color = "#4e6a5c"; }}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Clock />
          <div className="w-px h-4 bg-[#1a2620]" />
          <UserMenu onLogout={logout} />
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <PageComponent />
      </main>
    </div>
  );
}

export default function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </QueryClientProvider>
  );
}
uery";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ROLE_PERMISSIONS } from "@shared/schema";
import type { Role } from "@shared/schema";
import LoginPage from "@/pages/LoginPage";
import POSPage from "@/pages/pos";
import DashboardPage from "@/pages/dashboard";
import InventoryPage from "@/pages/inventory";
import ClientsPage from "@/pages/clients";
import OrdersPage from "@/pages/orders";
import UsersPage from "@/pages/UsersPage";
import {
  LayoutGrid, ShoppingCart, Package, Users, ClipboardList,
  UserCog, LogOut, ChevronDown,
} from "lucide-react";

// Pages visible per role
const ALL_PAGES = [
  { key: "pos",       label: "Sell",      icon: ShoppingCart, perm: "canSell"        as const },
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid,   perm: "canViewDash"    as const },
  { key: "inventory", label: "Inventory", icon: Package,      perm: "canManageStock" as const },
  { key: "clients",   label: "Clients",   icon: Users,        perm: "canManageClients" as const },
  { key: "orders",    label: "Orders",    icon: ClipboardList,perm: "canViewReports" as const },
  { key: "users",     label: "Team",      icon: UserCog,      perm: "canManageUsers" as const },
];

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono text-[11px] tabular-nums" style={{ color: "#4e6a5c" }}>
      {time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </span>
  );
}

function UserMenu({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const role = user.role as Role;
  const rp = ROLE_PERMISSIONS[role];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#1a2620] bg-[#141c18] hover:border-[#2a3830] transition-all"
      >
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black"
          style={{ background: rp.color + "25", color: rp.color }}>
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-[11px] font-bold leading-tight" style={{ fontFamily: "'Syne', sans-serif" }}>{user.name}</div>
          <div className="text-[9px] font-mono" style={{ color: rp.color }}>{rp.badge} {rp.label}</div>
        </div>
        <ChevronDown size={11} style={{ color: "#4e6a5c" }} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-52 bg-[#0f1510] border border-[#1a2620] rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1a2620]">
              <div className="text-xs font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>{user.name}</div>
              <div className="text-[10px] font-mono text-[#4e6a5c] mt-0.5">{user.email}</div>
              <div className="mt-2 inline-flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border"
                style={{ color: rp.color, borderColor: rp.color + "44", background: rp.color + "11" }}>
                {rp.badge} {rp.label}
              </div>
            </div>
            <button onClick={() => { onLogout(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-xs text-red-400 hover:bg-red-400/5 transition-colors">
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function AppShell() {
  const { user, loading, logout, can } = useAuth();
  const [page, setPage] = useState("pos");

  if (loading) return (
    <div className="min-h-screen bg-[#080d0b] flex items-center justify-center">
      <div className="text-[#00e87a] font-mono text-sm animate-pulse">Loading NIKSEN POS…</div>
    </div>
  );

  if (!user) return <LoginPage />;

  // Pages this user can access
  const visiblePages = ALL_PAGES.filter(p => can(p.perm));

  // If current page not accessible, redirect to first available
  const currentPage = visiblePages.find(p => p.key === page) ? page : visiblePages[0]?.key ?? "pos";

  const PageComponent = {
    pos:       POSPage,
    dashboard: DashboardPage,
    inventory: InventoryPage,
    clients:   ClientsPage,
    orders:    OrdersPage,
    users:     UsersPage,
  }[currentPage] ?? POSPage;

  const role = user.role as Role;
  const rp = ROLE_PERMISSIONS[role];

  // Customer view — just a product browse / menu view
  if (role === "customer") {
    return (
      <div className="min-h-screen bg-[#080d0b] flex flex-col items-center justify-center p-6"
        style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="text-center mb-8">
          <div className="text-4xl font-black mb-1" style={{ fontFamily: "'Syne', sans-serif", color: "#00e87a" }}>NIKSEN</div>
          <p className="text-[11px] font-mono text-[#4e6a5c] tracking-widest">CRAFT BEVERAGES · KOH SAMUI</p>
        </div>
        <div className="w-full max-w-lg bg-[#0f1510] border border-[#1a2620] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-black text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>Our Menu 🍺</h2>
            <button onClick={logout} className="text-[10px] font-mono text-[#4e6a5c] hover:text-red-400 flex items-center gap-1 transition-colors">
              <LogOut size={11}/> Sign out
            </button>
          </div>
          <p className="text-sm text-[#4e6a5c] text-center py-8">
            Welcome, <strong className="text-white">{user.name}</strong>! 👋<br/>
            <span className="text-xs">Ask our staff to place your order.</span>
          </p>
          <div className="text-center mt-4">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-mono px-3 py-1.5 rounded-full border"
              style={{ color: rp.color, borderColor: rp.color + "44", background: rp.color + "11" }}>
              {rp.badge} Customer Account
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#080d0b", color: "#e4ede8" }}>
      {/* Topbar */}
      <header className="flex items-center justify-between px-5 h-[52px] border-b shrink-0 z-40"
        style={{ background: "#0f1510", borderColor: "#1a2620" }}>

        {/* Logo */}
        <div className="font-black text-lg tracking-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
          <span style={{ color: "#00e87a" }}>NIKSEN</span>
          <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 300 }}> POS</span>
        </div>

        {/* Nav tabs */}
        <nav className="flex items-center gap-1">
          {visiblePages.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setPage(key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all border"
              style={currentPage === key
                ? { background: "rgba(0,232,122,0.08)", borderColor: "rgba(0,232,122,0.35)", color: "#00e87a" }
                : { border: "1px solid transparent", color: "#4e6a5c" }
              }
              onMouseEnter={e => { if (currentPage !== key) (e.target as HTMLElement).style.color = "#e4ede8"; }}
              onMouseLeave={e => { if (currentPage !== key) (e.target as HTMLElement).style.color = "#4e6a5c"; }}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Clock />
          <div className="w-px h-4 bg-[#1a2620]" />
          <UserMenu onLogout={logout} />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        <PageComponent />
      </main>
    </div>
  );
}

export default function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </QueryClientProvider>
  );
}
