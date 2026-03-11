import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/query";
import type { Product, Client, CartItem, CheckoutPayload, OrderWithItems } from "@shared/schema";
import { ShoppingCart, X, Plus, Minus, Trash2, Zap, Tag, Camera, Upload, Link } from "lucide-react";

const CATEGORIES = [
  { key: "all",   label: "All" },
  { key: "beer",  label: "🍺 Craft Beer" },
  { key: "soda",  label: "🥤 Craft Soda" },
  { key: "wine",  label: "🍷 Wine" },
];

const PAY_METHODS = [
  { key: "cash",     label: "💵 Cash" },
  { key: "card",     label: "💳 Card" },
  { key: "transfer", label: "📱 Transfer" },
  { key: "qr",       label: "⊡ QR" },
];

function fmtPrice(n: number) {
  return "฿" + Math.round(n).toLocaleString("en-US");
}

// ─── Image Upload Modal ───────────────────────────────────────────────────────
function ImageModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product;
  onClose: () => void;
  onSaved: (p: Product) => void;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(product.imgUrl ?? null);
  const [urlInput, setUrlInput] = useState(
    product.imgUrl?.startsWith("http") ? product.imgUrl : ""
  );
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);

  const readFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => { setPreview(e.target!.result as string); setUrlInput(""); };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.saveImage(product.id, preview);
      qc.invalidateQueries({ queryKey: ["/api/products"] });
      onSaved(updated);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div
        className="bg-[#111815] border border-[#1a2620] rounded-2xl p-6 w-[380px]"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base" style={{ fontFamily: "'Syne', sans-serif" }}>
              Product Image
            </h3>
            <p className="text-xs text-[#4e6a5c] mt-0.5">{product.name}</p>
          </div>
          <button onClick={onClose} className="text-[#4e6a5c] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Preview / Drop Zone */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault(); setIsDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) readFile(f);
          }}
          className={`relative w-full aspect-square rounded-xl border-2 overflow-hidden cursor-pointer transition-all mb-4
            ${isDragging
              ? "border-[#00e87a] bg-[#00e87a]/10"
              : "border-dashed border-[#1a2620] hover:border-[#00e87a]/60"
            }`}
        >
          {preview ? (
            <>
              <img src={preview} className="w-full h-full object-cover" alt="preview" />
              {/* Remove overlay */}
              <div className="absolute inset-0 bg-black/40 flex items-end justify-center pb-3 opacity-0 hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); setPreview(null); setUrlInput(""); }}
                  className="text-xs bg-red-500/80 text-white px-3 py-1.5 rounded-lg font-mono flex items-center gap-1"
                >
                  <X size={11} /> Remove
                </button>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-[#4e6a5c]">
              <Camera size={36} className="opacity-40" />
              <div className="text-center">
                <p className="text-xs font-mono tracking-wider uppercase">Click or Drop Image</p>
                <p className="text-[10px] opacity-60 mt-1">PNG, JPG, WEBP supported</p>
              </div>
            </div>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); }} />

        {/* OR divider */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px bg-[#1a2620]" />
          <span className="text-[10px] font-mono text-[#4e6a5c] tracking-wider">OR PASTE URL</span>
          <div className="flex-1 h-px bg-[#1a2620]" />
        </div>

        {/* URL Input */}
        <div className="relative mb-4">
          <Link size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4e6a5c]" />
          <input
            type="url"
            placeholder="https://example.com/image.jpg"
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value);
              if (e.target.value.startsWith("http")) setPreview(e.target.value);
            }}
            className="w-full bg-[#141c18] border border-[#1a2620] rounded-lg pl-8 pr-3 py-2.5 text-xs font-mono text-white focus:border-[#00e87a] outline-none placeholder:text-[#4e6a5c] transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-[#141c18] border border-[#1a2620] rounded-lg text-sm font-mono text-[#4e6a5c] hover:border-[#00e87a]/40 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-[#00e87a] text-black rounded-lg text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            <Upload size={14} />
            {saving ? "Saving…" : "Save Image"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Receipt Modal ────────────────────────────────────────────────────────────
function ReceiptModal({ order, onClose }: { order: OrderWithItems; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0f1510] border border-[#1a2620] rounded-2xl p-7 w-[370px] max-h-[85vh] overflow-y-auto">
        <div className="text-center mb-5">
          <div className="text-5xl mb-3">✅</div>
          <h2 className="text-xl font-black" style={{ fontFamily: "'Syne', sans-serif" }}>Payment Successful</h2>
          <p className="text-xs font-mono text-[#4e6a5c] mt-1">
            #{order.id} · {new Date(order.createdAt!).toLocaleString()}
          </p>
          {order.client && <p className="text-xs text-[#4e6a5c] mt-0.5">{order.client.name}</p>}
        </div>

        <div className="space-y-1.5 mb-4">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-1.5 border-b border-dashed border-[#1a2620]">
              <span>{item.icon} {item.name} × {item.qty}</span>
              <span className="font-mono">{fmtPrice(parseFloat(item.lineTotal))}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm py-1.5 text-red-400">
            <span>Discount</span>
            <span className="font-mono">-{fmtPrice(parseFloat(order.discountFlat || "0") + parseFloat(order.subtotal) * parseFloat(order.discountPct || "0") / 100)}</span>
          </div>
          <div className="flex justify-between text-sm py-1.5 text-[#4e6a5c]">
            <span>VAT 7%</span>
            <span className="font-mono">{fmtPrice(parseFloat(order.vatAmount || "0"))}</span>
          </div>
          <div className="flex justify-between text-sm py-1.5 text-[#4e6a5c]">
            <span>Payment</span>
            <span className="font-mono uppercase">{order.paymentMethod}</span>
          </div>
        </div>

        <div className="flex justify-between font-black text-xl text-[#00e87a] border-t border-[#1a2620] pt-4 mb-5" style={{ fontFamily: "'Syne', sans-serif" }}>
          <span>TOTAL</span>
          <span>{fmtPrice(parseFloat(order.total))}</span>
        </div>

        <div className="flex gap-3">
          <button onClick={() => window.print()} className="flex-1 py-2.5 bg-[#141c18] border border-[#1a2620] rounded-lg text-sm font-mono hover:border-[#00e87a]/50 transition-colors">
            🖨 Print
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 bg-[#00e87a] text-black rounded-lg text-sm font-black hover:brightness-110 transition-all" style={{ fontFamily: "'Syne', sans-serif" }}>
            ✓ Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Product Modal ────────────────────────────────────────────────────────
function AddProductModal({ onClose, onSave }: { onClose: () => void; onSave: (p: any) => void }) {
  const [form, setForm] = useState({ name: "", price: "", category: "beer", unit: "bottle", stock: "10", icon: "🍺", variablePrice: false });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111815] border border-[#1a2620] rounded-2xl p-6 w-[420px]">
        <h3 className="font-black text-lg mb-5" style={{ fontFamily: "'Syne', sans-serif" }}>Add Item</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-mono text-[#4e6a5c] uppercase tracking-wider mb-1.5">Name *</label>
            <input className="w-full bg-[#141c18] border border-[#1a2620] rounded-lg px-3 py-2 text-sm focus:border-[#00e87a] outline-none" value={form.name} onChange={set("name")} placeholder="Product name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-[#4e6a5c] uppercase tracking-wider mb-1.5">Category</label>
              <select className="w-full bg-[#141c18] border border-[#1a2620] rounded-lg px-3 py-2 text-sm focus:border-[#00e87a] outline-none cursor-pointer" value={form.category} onChange={set("category")}>
                <option value="beer">🍺 Beer</option>
                <option value="soda">🥤 Soda</option>
                <option value="wine">🍷 Wine</option>
                <option value="misc">⚡ Misc</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[#4e6a5c] uppercase tracking-wider mb-1.5">Icon</label>
              <input className="w-full bg-[#141c18] border border-[#1a2620] rounded-lg px-3 py-2 text-sm focus:border-[#00e87a] outline-none" value={form.icon} onChange={set("icon")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-[#4e6a5c] uppercase tracking-wider mb-1.5">Price (฿)</label>
              <input type="number" className="w-full bg-[#141c18] border border-[#1a2620] rounded-lg px-3 py-2 text-sm focus:border-[#00e87a] outline-none" value={form.price} onChange={set("price")} disabled={form.variablePrice} />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[#4e6a5c] uppercase tracking-wider mb-1.5">Unit</label>
              <input className="w-full bg-[#141c18] border border-[#1a2620] rounded-lg px-3 py-2 text-sm focus:border-[#00e87a] outline-none" value={form.unit} onChange={set("unit")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-[#4e6a5c] uppercase tracking-wider mb-1.5">Stock</label>
              <input type="number" className="w-full bg-[#141c18] border border-[#1a2620] rounded-lg px-3 py-2 text-sm focus:border-[#00e87a] outline-none" value={form.stock} onChange={set("stock")} />
            </div>
            <div className="flex items-end pb-2 gap-2">
              <input type="checkbox" id="vp" checked={form.variablePrice} onChange={set("variablePrice")} className="accent-[#00e87a]" />
              <label htmlFor="vp" className="text-xs text-[#4e6a5c]">Variable price</label>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 bg-[#141c18] border border-[#1a2620] rounded-lg text-sm font-mono hover:border-[#00e87a]/40 transition-colors">Cancel</button>
          <button
            onClick={() => {
              if (!form.name) return;
              onSave({ name: form.name, price: form.price || "0", category: form.category, unit: form.unit, stock: parseInt(form.stock) || null, icon: form.icon, variablePrice: form.variablePrice, active: true });
              onClose();
            }}
            className="flex-1 py-2.5 bg-[#00e87a] text-black rounded-lg text-sm font-black hover:brightness-110 transition-all"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Add Item
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main POS Page ────────────────────────────────────────────────────────────
export default function POSPage() {
  const qc = useQueryClient();
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: () => api.get("/api/products"),
  });
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: () => api.get("/api/clients"),
  });

  const [cart, setCart]           = useState<CartItem[]>([]);
  const [category, setCategory]   = useState("all");
  const [search, setSearch]       = useState("");
  const [clientId, setClientId]   = useState<number | null>(null);
  const [discPct, setDiscPct]     = useState(0);
  const [discFlat, setDiscFlat]   = useState(0);
  const [payMethod, setPayMethod] = useState<"cash" | "card" | "transfer" | "qr">("cash");
  const [receipt, setReceipt]     = useState<OrderWithItems | null>(null);
  const [imgModal, setImgModal]   = useState<Product | null>(null);
  const [showAdd, setShowAdd]     = useState(false);
  const [toast, setToast]         = useState("");

  const checkout = useMutation({
    mutationFn: (p: CheckoutPayload) => api.post("/api/checkout", p),
    onSuccess: (order: OrderWithItems) => {
      setReceipt(order);
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
      qc.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });

  const addProduct = useMutation({
    mutationFn: (d: any) => api.post("/api/products", d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/products"] }),
  });

  const filtered = useMemo(() => {
    let list = products;
    if (category !== "all") list = list.filter(p => p.category === category);
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku ?? "").includes(search));
    return list;
  }, [products, category, search]);

  const subtotal     = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt  = Math.min(subtotal, (subtotal * discPct / 100) + discFlat);
  const afterDisc    = subtotal - discountAmt;
  const vat          = afterDisc * 0.07;
  const grand        = afterDisc + vat;
  const itemCount    = cart.reduce((s, i) => s + i.qty, 0);

  function addToCart(p: Product) {
    if (p.variablePrice) { notify("⚠ Variable price — edit manually"); return; }
    const price = parseFloat(p.price as any);
    setCart(c => {
      const ex = c.find(i => i.productId === p.id);
      if (ex) return c.map(i => i.productId === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { productId: p.id, name: p.name, icon: p.icon, imgUrl: p.imgUrl ?? null, price, qty: 1 }];
    });
    notify(`${p.icon} ${p.name} added`);
  }

  function changeQty(productId: number, delta: number) {
    setCart(c => c.flatMap(i => i.productId === productId
      ? (i.qty + delta <= 0 ? [] : [{ ...i, qty: i.qty + delta }])
      : [i]
    ));
  }

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2300);
  }

  function handleCheckout() {
    if (cart.length === 0) return notify("⚠ Cart is empty");
    checkout.mutate({ clientId, items: cart, discountPct: discPct, discountFlat: discFlat, paymentMethod: payMethod });
  }

  const optBadge = (opts: any) => {
    if (!opts || !Array.isArray(opts) || !opts.length) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {opts.slice(0, 3).map((o: any, i: number) => (
          <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/15">
            {o.k}: {o.v}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-full">
      {/* ── Products Panel ── */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-[#1a2620]">
        <div className="flex gap-3 p-3.5 border-b border-[#1a2620]">
          <input
            className="flex-1 bg-[#141c18] border border-[#1a2620] rounded-lg px-3 py-2 text-sm focus:border-[#00e87a] outline-none placeholder:text-[#4e6a5c] text-white"
            placeholder="Search products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-[#00e87a] text-black rounded-lg text-sm font-black hover:brightness-110 transition-all flex items-center gap-1.5" style={{ fontFamily: "'Syne', sans-serif" }}>
            <Plus size={14} /> Add
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 px-3.5 py-2.5 flex-wrap border-b border-[#1a2620]">
          {CATEGORIES.map(c => (
            <button key={c.key} onClick={() => setCategory(c.key)}
              className={`px-3 py-1 rounded-full text-[10.5px] font-mono border transition-all ${
                category === c.key
                  ? "bg-[#00e87a] text-black border-[#00e87a] font-bold"
                  : "border-[#1a2620] text-[#4e6a5c] hover:border-[#00e87a]/50 hover:text-white"
              }`}>{c.label}</button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
            {filtered.map(p => {
              const stock = p.stock ?? null;
              return (
                <div key={p.id} className="group bg-[#141c18] border border-[#1a2620] rounded-xl overflow-hidden cursor-pointer hover:border-[#00e87a]/60 hover:-translate-y-0.5 transition-all"
                  onClick={() => addToCart(p)}>
                  {/* Image Area */}
                  <div className="relative w-full aspect-square bg-[#0f1510] overflow-hidden">
                    {p.imgUrl ? (
                      <img src={p.imgUrl} className="w-full h-full object-cover" alt={p.name} />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-[#4e6a5c]">
                        <span className="text-3xl">{p.icon}</span>
                        <span className="text-[8px] font-mono tracking-wider opacity-60">NO IMAGE</span>
                      </div>
                    )}
                    {/* Camera overlay */}
                    <div
                      onClick={(e) => { e.stopPropagation(); setImgModal(p); }}
                      className="absolute inset-0 bg-black/55 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 bg-[#00e87a] text-black px-2.5 py-1.5 rounded-lg text-[10px] font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>
                        <Camera size={11} /> {p.imgUrl ? "CHANGE" : "ADD IMAGE"}
                      </div>
                    </div>
                    {/* Top accent */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#00e87a] scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                  </div>

                  <div className="p-2.5">
                    <div className="text-[11.5px] font-bold leading-tight mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>{p.name}</div>
                    {p.sku && <div className="text-[9px] font-mono text-[#4e6a5c] mb-1">#{p.sku}</div>}
                    {optBadge(p.options)}
                    {p.variablePrice
                      ? <div className="text-[11px] font-mono text-yellow-500 mt-1.5">variable</div>
                      : <div className="text-[13px] font-mono text-[#00e87a] mt-1.5">฿{parseFloat(p.price as any).toLocaleString()}</div>
                    }
                    {stock !== null && (
                      <div className={`text-[9px] font-mono mt-0.5 ${stock <= (p.lowStock ?? 3) ? "text-yellow-500" : "text-[#4e6a5c]"}`}>
                        {stock <= (p.lowStock ?? 3) ? `⚠ low: ${stock}` : `stock: ${stock}`}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-[#4e6a5c]">
              <div className="text-4xl mb-3 opacity-30">🔍</div>
              <p className="text-sm">No products found</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Cart Panel ── */}
      <div className="w-[355px] flex flex-col bg-[#0f1510]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2620]">
          <div className="flex items-center gap-2">
            <ShoppingCart size={15} className="text-[#00e87a]" />
            <span className="font-bold text-sm" style={{ fontFamily: "'Syne', sans-serif" }}>Current Order</span>
          </div>
          <span className="font-mono text-[10px] bg-[#00e87a] text-black px-2 py-0.5 rounded-full font-bold">{itemCount} items</span>
        </div>

        <div className="px-4 py-2.5 border-b border-[#1a2620]">
          <select
            className="w-full bg-[#141c18] border border-[#1a2620] rounded-lg px-3 py-2 text-sm focus:border-[#00e87a] outline-none text-white cursor-pointer"
            value={clientId ?? ""}
            onChange={e => setClientId(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">— Select Client —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="-1">Walk-in / Guest</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#4e6a5c]">
              <ShoppingCart size={38} className="opacity-15 mb-3" />
              <p className="text-sm">Add items to start</p>
            </div>
          ) : cart.map(item => (
            <div key={item.productId} className="flex items-center gap-2.5 bg-[#141c18] border border-[#1a2620] rounded-xl p-2.5">
              {item.imgUrl
                ? <img src={item.imgUrl} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                : <div className="w-9 h-9 rounded-lg bg-[#0f1510] flex items-center justify-center flex-shrink-0 text-lg">{item.icon}</div>
              }
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{item.name}</div>
                <div className="font-mono text-xs text-[#00e87a]">฿{(item.price * item.qty).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => changeQty(item.productId, -1)} className="w-5 h-5 rounded border border-[#1a2620] flex items-center justify-center hover:border-[#00e87a] hover:text-[#00e87a] transition-colors text-[#4e6a5c]"><Minus size={9} /></button>
                <span className="font-mono text-xs w-5 text-center">{item.qty}</span>
                <button onClick={() => changeQty(item.productId, 1)} className="w-5 h-5 rounded border border-[#1a2620] flex items-center justify-center hover:border-[#00e87a] hover:text-[#00e87a] transition-colors text-[#4e6a5c]"><Plus size={9} /></button>
              </div>
              <button onClick={() => setCart(c => c.filter(i => i.productId !== item.productId))} className="text-[#ff4b6a] opacity-50 hover:opacity-100 transition-opacity p-1">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        <div className="px-4 py-4 border-t border-[#1a2620] space-y-2.5">
          <div className="flex justify-between text-sm text-[#4e6a5c]">
            <span>Subtotal</span>
            <span className="font-mono text-white">{fmtPrice(subtotal)}</span>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#4e6a5c]" />
              <input type="number" min="0" max="100"
                className="w-full bg-[#141c18] border border-[#1a2620] rounded-lg pl-6 pr-2 py-1.5 text-xs font-mono focus:border-[#00e87a] outline-none text-white"
                placeholder="Disc %" value={discPct || ""}
                onChange={e => setDiscPct(Math.min(100, parseFloat(e.target.value) || 0))} />
            </div>
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#4e6a5c] text-xs">฿</span>
              <input type="number" min="0"
                className="w-full bg-[#141c18] border border-[#1a2620] rounded-lg pl-5 pr-2 py-1.5 text-xs font-mono focus:border-[#00e87a] outline-none text-white"
                placeholder="Disc ฿" value={discFlat || ""}
                onChange={e => setDiscFlat(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          {discountAmt > 0 && (
            <div className="flex justify-between text-sm text-red-400">
              <span>Discount</span><span className="font-mono">-{fmtPrice(discountAmt)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-[#4e6a5c]">
            <span>VAT 7%</span><span className="font-mono">{fmtPrice(vat)}</span>
          </div>
          <div className="flex justify-between font-black text-base text-[#00e87a] pt-2 border-t border-[#1a2620]" style={{ fontFamily: "'Syne', sans-serif" }}>
            <span>TOTAL</span><span className="font-mono">{fmtPrice(grand)}</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {PAY_METHODS.map(m => (
              <button key={m.key} onClick={() => setPayMethod(m.key as any)}
                className={`py-2 rounded-lg text-[9.5px] font-mono border transition-all ${
                  payMethod === m.key ? "bg-[#00e87a]/10 border-[#00e87a] text-[#00e87a]" : "border-[#1a2620] text-[#4e6a5c] hover:border-[#00e87a]/40"
                }`}>{m.label}</button>
            ))}
          </div>

          <button onClick={handleCheckout} disabled={checkout.isPending || cart.length === 0}
            className="w-full py-3.5 bg-[#00e87a] text-black rounded-xl font-black text-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ fontFamily: "'Syne', sans-serif" }}>
            <Zap size={15} />
            {checkout.isPending ? "Processing…" : `CHARGE ${fmtPrice(grand)}`}
          </button>

          {cart.length > 0 && (
            <button onClick={() => { setCart([]); setDiscPct(0); setDiscFlat(0); }}
              className="w-full py-2 text-red-400 border border-red-400/20 rounded-lg text-[10.5px] font-mono hover:bg-red-400/5 transition-colors flex items-center justify-center gap-1.5">
              <Trash2 size={11} /> Clear Order
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      {receipt && <ReceiptModal order={receipt} onClose={() => { setReceipt(null); setCart([]); setClientId(null); setDiscPct(0); setDiscFlat(0); }} />}
      {imgModal && (
        <ImageModal
          product={imgModal}
          onClose={() => setImgModal(null)}
          onSaved={() => setImgModal(null)}
        />
      )}
      {showAdd && (
        <AddProductModal
          onClose={() => setShowAdd(false)}
          onSave={(d) => addProduct.mutate(d)}
        />
      )}

      {/* Toast */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#00e87a] text-black px-5 py-2.5 rounded-xl font-black text-sm transition-all duration-300 pointer-events-none z-50 ${toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        style={{ fontFamily: "'Syne', sans-serif" }}>
        {toast}
      </div>
    </div>
  );
}
