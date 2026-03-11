import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/query";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, CartesianGrid,
} from "recharts";
import { Camera, Upload, TrendingUp, Users, DollarSign, Clock, AlertCircle } from "lucide-react";
import type { OrderWithItems } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────
interface HourlyRow {
  hour: string;
  customers: number;
  revenue: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtPrice(n: number) {
  if (n >= 1_000_000) return "฿" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return "฿" + (n / 1_000).toFixed(0) + "K";
  return "฿" + n.toLocaleString();
}

function fmtHour(h: string) {
  const [hr] = h.split(":");
  const n = parseInt(hr, 10);
  return n === 0 ? "12AM" : n < 12 ? `${n}AM` : n === 12 ? "12PM" : `${n - 12}PM`;
}

// ─── Build hourly revenue from POS orders ─────────────────────────────────────
function buildRevenueMap(orders: OrderWithItems[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const o of orders) {
    const d = new Date(o.createdAt);
    const hour = d.getHours().toString().padStart(2, "0") + ":00";
    map[hour] = (map[hour] ?? 0) + parseFloat(o.total as any);
  }
  return map;
}

// ─── EZVIZ CSV Parser ─────────────────────────────────────────────────────────
function parseEzvizCSV(text: string): Record<string, number> {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return {};
  const header = lines[0].split(",").map(h => h.trim().toLowerCase());
  const timeIdx  = header.findIndex(h => h.includes("time") || h.includes("date") || h.includes("hour"));
  const countIdx = header.findIndex(h =>
    h.includes("enter") || h.includes(" in") || h === "in" || h.includes("people") || h.includes("count")
  );
  if (timeIdx === -1 || countIdx === -1) return {};
  const map: Record<string, number> = {};
  for (let i = 1; i < lines.length; i++) {
    const cols  = lines[i].split(",").map(c => c.trim());
    const raw   = cols[timeIdx] ?? "";
    const cnt   = parseInt(cols[countIdx] ?? "0", 10) || 0;
    const match = raw.match(/(\d{1,2}):(\d{2})/);
    if (!match) continue;
    const hour = match[1].padStart(2, "0") + ":00";
    map[hour] = (map[hour] ?? 0) + cnt;
  }
  return map;
}

// ─── Merge camera + revenue ───────────────────────────────────────────────────
function mergeData(
  cameraMap: Record<string, number>,
  revenueMap: Record<string, number>,
): HourlyRow[] {
  const allHours = Array.from(new Set([
    ...Object.keys(cameraMap),
    ...Object.keys(revenueMap),
  ])).sort();
  return allHours.map(hour => ({
    hour,
    customers: cameraMap[hour] ?? 0,
    revenue:   revenueMap[hour] ?? 0,
  }));
}

// ─── Demo camera data ─────────────────────────────────────────────────────────
const DEMO_CAMERA: Record<string, number> = {
  "10:00": 4,  "11:00": 9,  "12:00": 18, "13:00": 22,
  "14:00": 15, "15:00": 11, "16:00": 8,  "17:00": 13,
  "18:00": 28, "19:00": 35, "20:00": 42, "21:00": 38,
  "22:00": 29, "23:00": 16,
};

// ─── Heatmap colour ───────────────────────────────────────────────────────────
function heatColor(val: number, max: number) {
  if (max === 0 || val === 0) return "#1a2620";
  const t = val / max;
  if (t < 0.25) return "#1a2620";
  if (t < 0.50) return "#0d3320";
  if (t < 0.75) return "#00b85e55";
  if (t < 0.90) return "#00e87a88";
  return "#00e87a";
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1510] border border-[#1a2620] rounded-xl p-3 shadow-xl"
      style={{ fontFamily: "'DM Mono', monospace" }}>
      <div className="text-[10px] text-[#4e6a5c] mb-2">{fmtHour(label)}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="text-xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          <span className="text-[#a0b8ac]">{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>
            {p.dataKey === "revenue" ? fmtPrice(p.value) : p.value + " pax"}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, accent }: {
  icon: any; label: string; value: string; sub: string; accent: string;
}) {
  return (
    <div className="bg-[#0f1510] border border-[#1a2620] rounded-xl p-5 relative overflow-hidden">
      <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: accent }} />
      <div className="flex items-start justify-between mb-3">
        <span className="font-mono text-[10px] tracking-widest uppercase text-[#4e6a5c]">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: accent + "18" }}>
          <Icon size={14} style={{ color: accent }} />
        </div>
      </div>
      <div className="font-black text-2xl mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>{value}</div>
      <div className="font-mono text-[11px] text-[#4e6a5c]">{sub}</div>
    </div>
  );
}

const DATE_OPTIONS = ["Today", "Yesterday", "Last 7 days", "This month"];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CameraPage() {
  const [cameraMap, setCameraMap] = useState<Record<string, number>>(DEMO_CAMERA);
  const [isDemo,    setIsDemo]    = useState(true);
  const [error,     setError]     = useState("");
  const [dragging,  setDragging]  = useState(false);
  const [csvLabel,  setCsvLabel]  = useState("Demo Camera Data");
  const [dateFilter, setDateFilter] = useState("Today");
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Live POS orders ───────────────────────────────────────────────────────
  const { data: orders = [], isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders"],
    queryFn:  () => api.get("/api/orders?limit=500"),
  });

  // ── Filter by date ────────────────────────────────────────────────────────
  const filteredOrders = orders.filter(o => {
    const d = new Date(o.createdAt);
    const now = new Date();
    if (dateFilter === "Today")     return d.toDateString() === now.toDateString();
    if (dateFilter === "Yesterday") {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return d.toDateString() === y.toDateString();
    }
    if (dateFilter === "Last 7 days") {
      const w = new Date(now); w.setDate(w.getDate() - 7);
      return d >= w;
    }
    if (dateFilter === "This month")
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });

  const revenueMap = buildRevenueMap(filteredOrders);
  const data       = mergeData(cameraMap, revenueMap);

  // ── File handler ──────────────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    setError("");
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a .csv file exported from EZVIZ."); return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const text   = e.target?.result as string;
      const parsed = parseEzvizCSV(text);
      if (Object.keys(parsed).length === 0) {
        setError("Could not parse CSV. Make sure it's an EZVIZ people-counting export."); return;
      }
      setCameraMap(parsed);
      setIsDemo(false);
      setCsvLabel(file.name.replace(".csv", ""));
    };
    reader.readAsText(file);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalCustomers = data.reduce((s, r) => s + r.customers, 0);
  const totalRevenue   = data.reduce((s, r) => s + r.revenue, 0);
  const peakHour       = data.reduce(
    (best, r) => r.customers > best.customers ? r : best,
    { hour: "--", customers: 0, revenue: 0 }
  );
  const avgRevPerPax = totalCustomers > 0 ? Math.round(totalRevenue / totalCustomers) : 0;
  const maxCustomers = Math.max(...data.map(r => r.customers), 1);

  const DAYS       = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const HOURS_HEAT = ["10", "12", "14", "16", "18", "20", "22"];

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6"
      style={{ fontFamily: "'DM Sans', sans-serif", color: "#e4ede8" }}>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Camera size={18} style={{ color: "#00e87a" }} />
            <h1 className="font-black text-3xl" style={{ fontFamily: "'Syne', sans-serif" }}>
              Camera Analytics
            </h1>
          </div>
          <p className="text-[#4e6a5c] text-sm flex items-center gap-2 flex-wrap">
            NIKSEN Bar · Customer Count vs Revenue
            {isDemo && (
              <span className="font-mono text-[10px] text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full">
                DEMO CAMERA
              </span>
            )}
            {!isLoading && (
              <span className="font-mono text-[10px] text-[#00e87a] bg-[#00e87a10] border border-[#00e87a20] px-2 py-0.5 rounded-full">
                ✓ LIVE POS DATA
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Date filter */}
          <div className="flex items-center gap-1 bg-[#0f1510] border border-[#1a2620] rounded-xl p-1">
            {DATE_OPTIONS.map(opt => (
              <button key={opt} onClick={() => setDateFilter(opt)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all"
                style={dateFilter === opt
                  ? { background: "rgba(0,232,122,0.08)", color: "#00e87a", border: "1px solid rgba(0,232,122,0.3)" }
                  : { color: "#4e6a5c", border: "1px solid transparent" }
                }>
                {opt}
              </button>
            ))}
          </div>
          {/* CSV upload */}
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-mono transition-all"
            style={{ background: "rgba(0,232,122,0.06)", borderColor: "rgba(0,232,122,0.3)", color: "#00e87a" }}>
            <Upload size={13} /> Import EZVIZ CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm font-mono">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Drop zone */}
      {isDemo && (
        <div onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all"
          style={{ borderColor: dragging ? "#00e87a" : "#1a2620", background: dragging ? "rgba(0,232,122,0.04)" : "transparent" }}>
          <Upload size={18} className="mx-auto mb-2" style={{ color: "#4e6a5c" }} />
          <p className="font-mono text-xs text-[#4e6a5c]">
            Drag & drop <strong className="text-[#a0b8ac]">EZVIZ people-counting CSV</strong> here
            · Revenue already loaded from POS ✓
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard icon={Users}      accent="#00e87a" label="Total Customers"
          value={isDemo ? "~" + totalCustomers : totalCustomers.toLocaleString()}
          sub={isDemo ? "Upload CSV for real count" : `From ${csvLabel}`} />
        <KpiCard icon={DollarSign} accent="#4dabf7" label="Total Revenue"
          value={fmtPrice(totalRevenue)}
          sub={isLoading ? "Loading…" : `${filteredOrders.length} orders · ${dateFilter}`} />
        <KpiCard icon={TrendingUp} accent="#ffa94d" label="Avg / Customer"
          value={avgRevPerPax > 0 ? fmtPrice(avgRevPerPax) : "—"}
          sub="Revenue per pax" />
        <KpiCard icon={Clock}      accent="#cc5de8" label="Peak Hour"
          value={fmtHour(peakHour.hour)}
          sub={`${peakHour.customers} customers`} />
      </div>

      {/* Main Chart */}
      <div className="bg-[#0f1510] border border-[#1a2620] rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-sm" style={{ fontFamily: "'Syne', sans-serif" }}>
              Customer Count vs Revenue
            </h3>
            <p className="font-mono text-[10px] text-[#4e6a5c] mt-0.5">
              {csvLabel} · POS {dateFilter}
            </p>
          </div>
          <div className="flex items-center gap-4 font-mono text-[10px]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block bg-[#00e87a44]" />
              <span className="text-[#4e6a5c]">Customers (camera)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded-full inline-block bg-[#4dabf7]" />
              <span className="text-[#4e6a5c]">Revenue (POS)</span>
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="h-[220px] flex items-center justify-center font-mono text-sm text-[#4e6a5c] animate-pulse">
            Loading POS data…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={data} barSize={22}>
              <CartesianGrid vertical={false} stroke="#1a2620" strokeDasharray="3 3" />
              <XAxis dataKey="hour" tickFormatter={fmtHour}
                tick={{ fill: "#4e6a5c", fontSize: 10, fontFamily: "monospace" }}
                axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" width={28}
                tick={{ fill: "#4e6a5c", fontSize: 10, fontFamily: "monospace" }}
                axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" width={48}
                tickFormatter={v => fmtPrice(v)}
                tick={{ fill: "#4e6a5c", fontSize: 10, fontFamily: "monospace" }}
                axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar yAxisId="left" dataKey="customers" name="Customers" radius={[3, 3, 0, 0]}>
                {data.map((row, i) => (
                  <Cell key={i} fill={row.hour === peakHour.hour ? "#00e87a" : "#00e87a33"} />
                ))}
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue"
                stroke="#4dabf7" strokeWidth={2} dot={false}
                activeDot={{ r: 4, fill: "#4dabf7" }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Heatmap + Top Hours */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-[#0f1510] border border-[#1a2620] rounded-xl p-5">
          <h3 className="font-bold text-sm mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>Peak Hours Heatmap</h3>
          <p className="font-mono text-[10px] text-[#4e6a5c] mb-4">Weekly estimate · Upload multi-day CSV for real data</p>
          <table className="w-full text-[10px] font-mono">
            <thead>
              <tr>
                <th className="text-left text-[#4e6a5c] pb-2 w-12">Hour</th>
                {DAYS.map(d => <th key={d} className="text-center text-[#4e6a5c] pb-2 px-1">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {HOURS_HEAT.map(h => {
                const row = data.find(r => r.hour.startsWith(h + ":"));
                const val = row?.customers ?? 0;
                return (
                  <tr key={h}>
                    <td className="text-[#4e6a5c] py-1 pr-2">{fmtHour(h + ":00")}</td>
                    {DAYS.map((d, di) => {
                      const v = Math.round(val * [0.7,0.8,0.9,0.75,1.1,1.3,1.0][di]);
                      return (
                        <td key={d} className="px-1 py-1">
                          <div className="w-full h-6 rounded flex items-center justify-center text-[9px]"
                            style={{ background: heatColor(v, maxCustomers * 1.3), color: v > maxCustomers * 0.7 ? "#000" : "#4e6a5c" }}>
                            {v > 0 ? v : ""}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="col-span-2 bg-[#0f1510] border border-[#1a2620] rounded-xl p-5">
          <h3 className="font-bold text-sm mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>Top Hours</h3>
          <div className="space-y-3">
            {[...data].sort((a, b) => b.customers - a.customers).slice(0, 6).map((row, i) => (
              <div key={row.hour} className="flex items-center gap-3">
                <span className="text-base w-6 text-center">{["🥇","🥈","🥉"][i] ?? ""}</span>
                <span className="font-mono text-xs text-[#a0b8ac] w-12 shrink-0">{fmtHour(row.hour)}</span>
                <div className="flex-1 h-1.5 bg-[#1a2620] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: Math.round((row.customers / maxCustomers) * 100) + "%", background: "#00e87a" }} />
                </div>
                <span className="font-mono text-xs text-[#00e87a] w-14 text-right shrink-0">{row.customers} pax</span>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-[#1a2620]">
            <p className="font-mono text-[10px] text-[#4e6a5c] mb-3">฿ / Customer by Hour</p>
            {[...data].filter(r => r.customers > 0 && r.revenue > 0)
              .sort((a, b) => (b.revenue / b.customers) - (a.revenue / a.customers))
              .slice(0, 4).map(row => (
                <div key={row.hour} className="flex items-center justify-between py-1.5 border-b border-[#1a2620]/50 last:border-0">
                  <span className="font-mono text-[11px] text-[#a0b8ac]">{fmtHour(row.hour)}</span>
                  <span className="font-mono text-[11px] text-[#4dabf7]">
                    {fmtPrice(Math.round(row.revenue / row.customers))}/pax
                  </span>
                </div>
              ))}
            {data.filter(r => r.customers > 0 && r.revenue > 0).length === 0 && (
              <p className="font-mono text-[10px] text-[#2a3830]">Select a date with POS orders</p>
            )}
          </div>
        </div>
      </div>

      {/* EZVIZ Guide */}
      {isDemo && (
        <div className="bg-[#0f1510] border border-[#1a2620] rounded-xl p-5">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ fontFamily: "'Syne', sans-serif" }}>
            <Camera size={14} style={{ color: "#00e87a" }} /> How to Export from EZVIZ
          </h3>
          <div className="grid grid-cols-3 gap-4 font-mono text-[11px] text-[#4e6a5c]">
            {[
              { step: "1", title: "Open EZVIZ App",    desc: "Go to entrance camera → Statistics" },
              { step: "2", title: "People Counting",   desc: "Select People Counting → choose date" },
              { step: "3", title: "Export CSV",        desc: "Tap Export → CSV → share to Files or email" },
            ].map(s => (
              <div key={s.step} className="flex gap-3">
                <div className="w-6 h-6 rounded-full border border-[#00e87a44] text-[#00e87a] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  {s.step}
                </div>
                <div>
                  <div className="text-[#a0b8ac] font-bold mb-0.5">{s.title}</div>
                  <div>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
