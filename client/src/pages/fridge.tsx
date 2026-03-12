import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/query";
import {
  Camera, Upload, RefreshCw, AlertTriangle, CheckCircle,
  Wine, Beer, Package, Clock, Zap, Eye,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface FridgeProduct {
  name:       string;
  category:   "craft_beer" | "wine" | "other";
  count:      number;
  confidence: number;
  lowStock:   boolean;
}

interface FridgeScan {
  id:          string;
  scannedAt:   string;
  products:    FridgeProduct[];
  rawAnalysis: string;
  imageSource: string;
  alerts:      string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function confidenceColor(c: number) {
  if (c >= 0.85) return "#00e87a";
  if (c >= 0.60) return "#ffa94d";
  return "#ff6b6b";
}

function categoryIcon(cat: string) {
  if (cat === "craft_beer") return "🍺";
  if (cat === "wine")       return "🍷";
  return "🥤";
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Stock Bar ─────────────────────────────────────────────────────────────────
function StockBar({ count, max = 12 }: { count: number; max?: number }) {
  const pct = Math.min((count / max) * 100, 100);
  const color = count <= 2 ? "#ff6b6b" : count <= 4 ? "#ffa94d" : "#00e87a";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#1a2620] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: pct + "%", background: color }} />
      </div>
      <span className="font-mono text-xs w-6 text-right" style={{ color }}>{count}</span>
    </div>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({ product }: { product: FridgeProduct }) {
  return (
    <div className="bg-[#0a120e] border rounded-xl p-4 transition-all"
      style={{ borderColor: product.lowStock ? "#ff6b6b44" : "#1a2620" }}>
      {product.lowStock && (
        <div className="flex items-center gap-1 mb-2 text-[10px] font-mono text-red-400">
          <AlertTriangle size={10} /> LOW STOCK
        </div>
      )}
      <div className="flex items-start justify-between mb-3">
        <span className="text-xl">{categoryIcon(product.category)}</span>
        <span className="font-mono text-[10px] px-2 py-0.5 rounded-full border"
          style={{
            color: confidenceColor(product.confidence),
            borderColor: confidenceColor(product.confidence) + "33",
            background: confidenceColor(product.confidence) + "11",
          }}>
          {Math.round(product.confidence * 100)}%
        </span>
      </div>
      <div className="font-bold text-sm mb-1 leading-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
        {product.name}
      </div>
      <div className="font-mono text-[10px] text-[#4e6a5c] mb-3 capitalize">
        {product.category.replace("_", " ")}
      </div>
      <StockBar count={product.count} />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FridgePage() {
  const [previewUrl,   setPreviewUrl]   = useState<string | null>(null);
  const [imageBase64,  setImageBase64]  = useState<string | null>(null);
  const [mimeType,     setMimeType]     = useState("image/jpeg");
  const [dragging,     setDragging]     = useState(false);
  const [filterCat,    setFilterCat]    = useState<"all" | "craft_beer" | "wine">("all");
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  // ── Fetch latest scan ────────────────────────────────────────────────────
  const { data: latest, isLoading: loadingLatest } = useQuery<FridgeScan | null>({
    queryKey: ["/api/fridge/latest"],
    queryFn:  () => api.get("/api/fridge/latest"),
    refetchInterval: 60_000,
  });

  // ── Fetch history ─────────────────────────────────────────────────────────
  const { data: history = [] } = useQuery<FridgeScan[]>({
    queryKey: ["/api/fridge/history"],
    queryFn:  () => api.get("/api/fridge/history"),
  });

  // ── Scan mutation ─────────────────────────────────────────────────────────
  const { mutate: runScan, isPending: scanning } = useMutation({
    mutationFn: (payload: { imageBase64: string; mimeType: string }) =>
      api.post("/api/fridge/scan", { ...payload, source: "upload" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/fridge/latest"] });
      qc.invalidateQueries({ queryKey: ["/api/fridge/history"] });
    },
  });

  // ── File handler ──────────────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setMimeType(file.type);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    const reader = new FileReader();
    reader.onload = e => {
      const result = e.target?.result as string;
      const base64 = result.split(",")[1];
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const scan        = latest;
  const allProducts = scan?.products ?? [];
  const filtered    = filterCat === "all" ? allProducts : allProducts.filter(p => p.category === filterCat);
  const totalBeers  = allProducts.filter(p => p.category === "craft_beer").reduce((s, p) => s + p.count, 0);
  const totalWines  = allProducts.filter(p => p.category === "wine").reduce((s, p) => s + p.count, 0);
  const totalAlerts = scan?.alerts?.length ?? 0;
  const lowItems    = allProducts.filter(p => p.lowStock);

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6"
      style={{ fontFamily: "'DM Sans', sans-serif", color: "#e4ede8" }}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Camera size={18} style={{ color: "#00e87a" }} />
            <h1 className="font-black text-3xl" style={{ fontFamily: "'Syne', sans-serif" }}>
              Smart Fridge
            </h1>
          </div>
          <p className="text-[#4e6a5c] text-sm flex items-center gap-2">
            NIKSEN Bar · AI Fridge Detection · Craft Beer & Wine
            {scan && (
              <span className="font-mono text-[10px] text-[#00e87a] bg-[#00e87a10] border border-[#00e87a20] px-2 py-0.5 rounded-full">
                ✓ Last scan {timeAgo(scan.scannedAt)}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-mono transition-all"
          style={{ background: "rgba(0,232,122,0.06)", borderColor: "rgba(0,232,122,0.3)", color: "#00e87a" }}>
          <Upload size={13} /> Upload Fridge Photo
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>

      {/* ── Alerts ── */}
      {totalAlerts > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-red-400 font-mono text-xs font-bold mb-2">
            <AlertTriangle size={13} /> {totalAlerts} ALERT{totalAlerts > 1 ? "S" : ""}
          </div>
          {scan!.alerts.map((a, i) => (
            <div key={i} className="font-mono text-xs text-red-300">{a}</div>
          ))}
        </div>
      )}

      {/* ── Upload + Scan ── */}
      <div className="grid grid-cols-5 gap-4">
        {/* Drop zone */}
        <div className="col-span-2">
          <div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onClick={() => !previewUrl && fileRef.current?.click()}
            className="border-2 border-dashed rounded-xl overflow-hidden transition-all cursor-pointer"
            style={{
              borderColor: dragging ? "#00e87a" : "#1a2620",
              background: dragging ? "rgba(0,232,122,0.04)" : "#0f1510",
              minHeight: 200,
            }}>
            {previewUrl ? (
              <div className="relative">
                <img src={previewUrl} alt="Fridge" className="w-full object-cover rounded-xl" style={{ maxHeight: 280 }} />
                <button
                  onClick={e => { e.stopPropagation(); setPreviewUrl(null); setImageBase64(null); }}
                  className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-mono px-2 py-1 rounded-lg">
                  ✕ Clear
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center" style={{ minHeight: 200 }}>
                <Camera size={28} className="mb-3" style={{ color: "#4e6a5c" }} />
                <p className="font-mono text-xs text-[#4e6a5c]">
                  Drop fridge photo here<br />
                  <span className="text-[10px]">or click to browse</span>
                </p>
              </div>
            )}
          </div>

          {/* Scan button */}
          {imageBase64 && (
            <button
              onClick={() => runScan({ imageBase64, mimeType })}
              disabled={scanning}
              className="w-full mt-3 py-3 rounded-xl font-mono text-sm font-bold transition-all flex items-center justify-center gap-2"
              style={{
                background: scanning ? "#1a2620" : "rgba(0,232,122,0.12)",
                borderColor: scanning ? "#1a2620" : "rgba(0,232,122,0.4)",
                border: "1px solid",
                color: scanning ? "#4e6a5c" : "#00e87a",
              }}>
              {scanning ? (
                <><RefreshCw size={14} className="animate-spin" /> Analyzing with Claude AI…</>
              ) : (
                <><Zap size={14} /> Analyze Fridge</>
              )}
            </button>
          )}

          {/* How it works */}
          {!imageBase64 && (
            <div className="mt-3 bg-[#0f1510] border border-[#1a2620] rounded-xl p-4">
              <p className="font-mono text-[10px] text-[#4e6a5c] mb-3 font-bold">HOW IT WORKS</p>
              {[
                { icon: "📸", text: "Take photo of fridge" },
                { icon: "🤖", text: "Claude AI counts bottles/cans" },
                { icon: "📊", text: "Syncs with POS inventory" },
                { icon: "🔔", text: "Alerts when stock is low" },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2 mb-2 font-mono text-[11px] text-[#4e6a5c]">
                  <span>{s.icon}</span> {s.text}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* KPIs + products */}
        <div className="col-span-3 space-y-4">
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Beer,         label: "Craft Beer",   value: totalBeers, color: "#ffa94d", sub: `${allProducts.filter(p=>p.category==="craft_beer").length} SKUs` },
              { icon: Wine,         label: "Wine",         value: totalWines, color: "#cc5de8", sub: `${allProducts.filter(p=>p.category==="wine").length} SKUs` },
              { icon: AlertTriangle,label: "Low Stock",    value: lowItems.length, color: lowItems.length > 0 ? "#ff6b6b" : "#00e87a", sub: lowItems.length > 0 ? "Need restock" : "All good ✓" },
            ].map(({ icon: Icon, label, value, color, sub }) => (
              <div key={label} className="bg-[#0f1510] border border-[#1a2620] rounded-xl p-4 relative overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: color }} />
                <div className="flex items-start justify-between mb-2">
                  <span className="font-mono text-[10px] tracking-widest uppercase text-[#4e6a5c]">{label}</span>
                  <Icon size={13} style={{ color }} />
                </div>
                <div className="font-black text-2xl mb-0.5" style={{ fontFamily: "'Syne', sans-serif" }}>{value}</div>
                <div className="font-mono text-[10px] text-[#4e6a5c]">{sub}</div>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          {allProducts.length > 0 && (
            <div className="flex items-center gap-1 bg-[#0f1510] border border-[#1a2620] rounded-xl p-1 w-fit">
              {(["all", "craft_beer", "wine"] as const).map(cat => (
                <button key={cat} onClick={() => setFilterCat(cat)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all"
                  style={filterCat === cat
                    ? { background: "rgba(0,232,122,0.08)", color: "#00e87a", border: "1px solid rgba(0,232,122,0.3)" }
                    : { color: "#4e6a5c", border: "1px solid transparent" }
                  }>
                  {cat === "all" ? "All" : cat === "craft_beer" ? "🍺 Craft Beer" : "🍷 Wine"}
                </button>
              ))}
            </div>
          )}

          {/* Products grid */}
          {loadingLatest ? (
            <div className="h-32 flex items-center justify-center font-mono text-sm text-[#4e6a5c] animate-pulse">
              Loading…
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
              {filtered.map((p, i) => <ProductCard key={i} product={p} />)}
            </div>
          ) : (
            <div className="bg-[#0f1510] border border-[#1a2620] rounded-xl p-8 text-center">
              <Eye size={24} className="mx-auto mb-3" style={{ color: "#4e6a5c" }} />
              <p className="font-mono text-xs text-[#4e6a5c]">
                {allProducts.length === 0
                  ? "Upload a fridge photo to start detection"
                  : "No products in this category"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Raw AI Analysis ── */}
      {scan?.rawAnalysis && (
        <div className="bg-[#0f1510] border border-[#1a2620] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={13} style={{ color: "#00e87a" }} />
            <h3 className="font-bold text-sm" style={{ fontFamily: "'Syne', sans-serif" }}>AI Analysis</h3>
            <span className="font-mono text-[10px] text-[#4e6a5c]">
              {scan.products.reduce((s, p) => s + p.count, 0)} total items detected
            </span>
          </div>
          <p className="font-mono text-xs text-[#4e6a5c] leading-relaxed">{scan.rawAnalysis}</p>
        </div>
      )}

      {/* ── Scan History ── */}
      {history.length > 1 && (
        <div className="bg-[#0f1510] border border-[#1a2620] rounded-xl p-5">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ fontFamily: "'Syne', sans-serif" }}>
            <Clock size={13} style={{ color: "#00e87a" }} /> Scan History
          </h3>
          <div className="space-y-2">
            {history.slice(0, 8).map((s, i) => {
              const total = s.products.reduce((sum, p) => sum + p.count, 0);
              const alerts = s.alerts.length;
              return (
                <div key={s.id} className="flex items-center gap-4 py-2.5 border-b border-[#1a2620]/50 last:border-0">
                  <span className="font-mono text-[10px] text-[#4e6a5c] w-20 shrink-0">
                    {timeAgo(s.scannedAt)}
                  </span>
                  <span className="font-mono text-xs text-[#a0b8ac] flex-1">
                    {total} items · {s.products.length} SKUs
                  </span>
                  {alerts > 0 ? (
                    <span className="font-mono text-[10px] text-red-400 flex items-center gap-1">
                      <AlertTriangle size={10} /> {alerts} alert{alerts > 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] text-[#00e87a] flex items-center gap-1">
                      <CheckCircle size={10} /> OK
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Camera Setup Guide ── */}
      <div className="bg-[#0f1510] border border-[#1a2620] rounded-xl p-5">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ fontFamily: "'Syne', sans-serif" }}>
          <Camera size={14} style={{ color: "#00e87a" }} /> Camera Setup for Auto-Scan
        </h3>
        <div className="grid grid-cols-4 gap-4 font-mono text-[11px] text-[#4e6a5c]">
          {[
            { step: "1", title: "ติดตั้ง Camera",  desc: "ติด Xiaomi/EZVIZ บนผนังหรือชั้นวางของตู้แช่ มองเห็นสินค้าทั้งหมด" },
            { step: "2", title: "ตั้งค่า Angle",   desc: "ควรมองเห็น label ของสินค้าทุกขวด/กระป๋อง จากมุมด้านหน้า" },
            { step: "3", title: "Export Snapshot", desc: "ใช้ EZVIZ/Mi Home snapshot แล้ว upload มาที่นี่ หรือถ่ายรูปโดยตรง" },
            { step: "4", title: "Auto Alert",      desc: "ระบบจะแจ้งเตือนเมื่อสินค้าเหลือน้อยกว่า 3 ชิ้น ผ่าน POS" },
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
    </div>
  );
}
