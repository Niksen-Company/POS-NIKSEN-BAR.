import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/query";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { OrderWithItems } from "@shared/schema";
import { Download, Database, CheckCircle, Loader } from "lucide-react";

function fmtPrice(n: number) {
  if (n >= 1000000) return "฿" + (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return "฿" + (n / 1000).toFixed(0) + "K";
  return "฿" + n.toLocaleString();
}

function KpiCard({ label, value, delta, deltaPos, color }: { label: string; value: string; delta: string; deltaPos: boolean; color: string }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-5 relative overflow-hidden`}>
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${color}`} />
      <div className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground mb-3">{label}</div>
      <div className="font-display font-black text-3xl mb-1.5">{value}</div>
      <div className={`font-mono text-xs ${deltaPos ? "text-primary" : "text-destructive"}`}>{delta}</div>
    </div>
  );
}

const payBadge: Record<string, string> = {
  cash: "bg-primary/10 text-primary",
  card: "bg-blue-500/10 text-blue-400",
  transfer: "bg-orange-500/10 text-orange-400",
  qr: "bg-purple-500/10 text-purple-400",
};

const BAR_DATA = [
  { name: "Rental", value: 260500, color: "#00e87a" },
  { name: "Services", value: 28000, color: "#4dabf7" },
  { name: "Transport", value: 18500, color: "#ffa94d" },
  { name: "Fees", value: 11000, color: "#ffd43b" },
  { name: "Misc", value: 6000, color: "#cc5de8" },
];

const WEEKLY_DATA = [
  { day: "Mon", revenue: 42000 },
  { day: "Tue", revenue: 38500 },
  { day: "Wed", revenue: 55000 },
  { day: "Thu", revenue: 29000 },
  { day: "Fri", revenue: 67500 },
  { day: "Sat", revenue: 48500 },
  { day: "Sun", revenue: 35000 },
];

export default function DashboardPage() {
  const [gcsMsg, setGcsMsg] = useState<string | null>(null);

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: () => api.get("/api/stats"),
  });

  const { mutate: exportCSV, isPending: exportingCSV } = useMutation({
    mutationFn: () => api.post("/api/gcs/export-csv", { days: 30 }),
    onSuccess: (d: any) => setGcsMsg(`✅ CSV exported — ${d.rows} rows → ${d.key}`),
    onError:   (e: any) => setGcsMsg(`❌ ${e.message}`),
  });

  const { mutate: runBackup, isPending: backingUp } = useMutation({
    mutationFn: () => api.post("/api/gcs/backup", {}),
    onSuccess: (d: any) => setGcsMsg(`✅ Backup done — ${d.products} products, ${d.orders} orders → ${d.key}`),
    onError:   (e: any) => setGcsMsg(`❌ ${e.message}`),
  });

  const daily = stats?.daily ?? 48500;
  const monthly = stats?.monthly ?? 318000;
  const recentOrders: OrderWithItems[] = stats?.recentOrders ?? [];

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display font-black text-3xl">CHOWTO Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">Koh Samui Property Management · {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Revenue Today" value={fmtPrice(daily)} delta="↑ 12% vs yesterday" deltaPos={true} color="bg-primary" />
        <KpiCard label="Active Rentals" value="7" delta="↑ 2 new this week" deltaPos={true} color="bg-blue-400" />
        <KpiCard label="Pending Payments" value="฿92,000" delta="3 overdue clients" deltaPos={false} color="bg-orange-400" />
        <KpiCard label="Monthly Revenue" value={fmtPrice(monthly)} delta="↑ 8% vs last month" deltaPos={true} color="bg-yellow-400" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-5 gap-4">
        {/* Weekly Revenue Bar */}
        <div className="col-span-3 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold text-sm">Weekly Revenue</h3>
            <span className="font-mono text-[10px] text-muted-foreground bg-secondary border border-border px-2 py-1 rounded-full">This Week</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={WEEKLY_DATA} barSize={28}>
              <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 12 }}
                formatter={(v: number) => ["฿" + v.toLocaleString(), "Revenue"]}
                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
              />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {WEEKLY_DATA.map((_, i) => (
                  <Cell key={i} fill={i === 4 ? "hsl(var(--primary))" : "hsl(var(--secondary))"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Category */}
        <div className="col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold text-sm">By Category</h3>
            <span className="font-mono text-[10px] text-muted-foreground bg-secondary border border-border px-2 py-1 rounded-full">March</span>
          </div>
          <div className="space-y-3">
            {BAR_DATA.map(d => {
              const pct = Math.round((d.value / BAR_DATA[0].value) * 100);
              return (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">{d.name}</span>
                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: pct + "%", background: d.color }} />
                  </div>
                  <span className="font-mono text-xs text-right w-14 shrink-0">{fmtPrice(d.value)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Properties + Recent Orders */}
      <div className="grid grid-cols-2 gap-4">
        {/* Properties Overview */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-display font-bold text-sm mb-4">Properties</h3>
          <div className="space-y-2">
            {[
              { name: "Sea View Villa Lamai", status: "Occupied", rent: "฿75,000/mo", tenant: "Dmitry V." },
              { name: "Mae Nam Beach House", status: "Occupied", rent: "฿35,000/mo", tenant: "Elena S." },
              { name: "Chaweng Hilltop Villa", status: "Available", rent: "฿55,000/mo", tenant: "—" },
              { name: "Bophut Pool Villa", status: "Occupied", rent: "฿45,000/mo", tenant: "James W." },
              { name: "Thaledi Commercial", status: "Occupied", rent: "฿55,000/mo", tenant: "Somchai P." },
              { name: "Lamai Garden House", status: "Maintenance", rent: "฿22,000/mo", tenant: "—" },
            ].map(p => (
              <div key={p.name} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.status === "Occupied" ? "bg-primary" : p.status === "Available" ? "bg-blue-400" : "bg-orange-400"}`} />
                <span className="text-sm flex-1 font-medium">{p.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{p.tenant}</span>
                <span className="font-mono text-xs text-primary">{p.rent}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-display font-bold text-sm mb-4">Recent Transactions</h3>
          <div className="space-y-2">
            {(recentOrders.length > 0 ? recentOrders : [
              { id: 99, items: [{ icon: "🏠", name: "Monthly Rental" }], total: "37450", paymentMethod: "transfer", createdAt: new Date(Date.now() - 7200000), client: { name: "Dmitry V." } },
              { id: 98, items: [{ icon: "🏊", name: "Pool Cleaning" }], total: "2675", paymentMethod: "cash", createdAt: new Date(Date.now() - 14400000), client: null },
              { id: 97, items: [{ icon: "🚗", name: "Car Rental" }], total: "5136", paymentMethod: "card", createdAt: new Date(Date.now() - 93600000), client: { name: "James W." } },
              { id: 96, items: [{ icon: "📋", name: "Contract Fee" }], total: "1605", paymentMethod: "cash", createdAt: new Date(Date.now() - 100800000), client: null },
              { id: 95, items: [{ icon: "🏢", name: "Commercial Rent" }], total: "58850", paymentMethod: "transfer", createdAt: new Date(Date.now() - 259200000), client: { name: "Somchai P." } },
            ] as any).slice(0, 5).map((o: any) => (
              <div key={o.id} className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
                <span className="text-xl">{o.items?.[0]?.icon ?? "📦"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{o.items?.[0]?.name ?? "Order"}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {o.client?.name ?? "Walk-in"} · {new Date(o.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-bold text-primary">+{fmtPrice(parseFloat(o.total))}</div>
                  <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-full uppercase ${payBadge[o.paymentMethod] || "bg-secondary text-muted-foreground"}`}>
                    {o.paymentMethod}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Google Cloud Storage ── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database size={14} className="text-primary" />
          <h3 className="font-display font-bold text-sm">Cloud Storage</h3>
          <span className="font-mono text-[10px] text-muted-foreground ml-auto">niksen-bar-storage · asia-southeast1</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setGcsMsg(null); exportCSV(); }}
            disabled={exportingCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-mono transition-all"
            style={{ background: "rgba(0,232,122,0.06)", borderColor: "rgba(0,232,122,0.3)", color: "#00e87a" }}>
            {exportingCSV ? <Loader size={12} className="animate-spin" /> : <Download size={12} />}
            Export Sales CSV (30 days)
          </button>
          <button
            onClick={() => { setGcsMsg(null); runBackup(); }}
            disabled={backingUp}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-mono transition-all"
            style={{ background: "rgba(78,106,92,0.1)", borderColor: "#1a2620", color: "#a0b8ac" }}>
            {backingUp ? <Loader size={12} className="animate-spin" /> : <Database size={12} />}
            Backup to GCS
          </button>
        </div>
        {gcsMsg && (
          <div className="mt-3 flex items-start gap-2 font-mono text-[11px] text-[#a0b8ac] bg-[#0a120e] border border-[#1a2620] rounded-lg px-3 py-2">
            <CheckCircle size={12} className="text-primary mt-0.5 shrink-0" />
            {gcsMsg}
          </div>
        )}
      </div>
    </div>
  );
}
