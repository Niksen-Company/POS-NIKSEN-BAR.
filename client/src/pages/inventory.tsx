import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/query";
import type { Product } from "@shared/schema";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";

function fmtPrice(n: number) {
  return "฿" + n.toLocaleString("en-US", { minimumFractionDigits: 0 });
}

const STOCK_STATUS = (s: number) =>
  s === 0 ? { label: "Out", cls: "bg-destructive/10 text-destructive" }
  : s <= 3 ? { label: "Low", cls: "bg-orange-500/10 text-orange-400" }
  : { label: "OK", cls: "bg-primary/10 text-primary" };

function ProductModal({ product, onClose, onSave }: {
  product?: Product | null;
  onClose: () => void;
  onSave: (data: Partial<Product>) => void;
}) {
  const [form, setForm] = useState({
    name: product?.name ?? "",
    price: product?.price?.toString() ?? "",
    category: product?.category ?? "service",
    unit: product?.unit ?? "service",
    stock: product?.stock?.toString() ?? "99",
    icon: product?.icon ?? "📦",
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl p-6 w-[440px] animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-lg">{product ? "Edit Item" : "Add Item / Service"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Name *</label>
            <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" value={form.name} onChange={set("name")} placeholder="e.g. Pool cleaning service" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Price (฿) *</label>
              <input type="number" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" value={form.price} onChange={set("price")} placeholder="2500" />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Category</label>
              <select className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none cursor-pointer" value={form.category} onChange={set("category")}>
                <option value="rental">🏠 Rental</option>
                <option value="service">🔧 Service</option>
                <option value="fee">📋 Fee</option>
                <option value="transport">🚗 Transport</option>
                <option value="misc">⚡ Misc</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Unit</label>
              <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" value={form.unit} onChange={set("unit")} placeholder="month" />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Stock</label>
              <input type="number" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" value={form.stock} onChange={set("stock")} />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Icon</label>
              <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" value={form.icon} onChange={set("icon")} placeholder="🏠" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 bg-secondary border border-border rounded-lg text-sm font-mono hover:border-primary/40 transition-colors">Cancel</button>
          <button
            onClick={() => {
              if (!form.name || !form.price) return;
              onSave({ name: form.name, price: form.price as any, category: form.category as any, unit: form.unit, stock: parseInt(form.stock) || 99, icon: form.icon, active: true });
              onClose();
            }}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-display font-bold hover:brightness-110 transition-all"
          >
            {product ? "Save Changes" : "Add Item"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const qc = useQueryClient();
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: () => api.get("/api/products"),
  });

  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  const addMutation = useMutation({
    mutationFn: (data: Partial<Product>) => api.post("/api/products", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/products"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Product> }) => api.patch(`/api/products/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/products"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/products"] }),
  });

  const filtered = products.filter(p => {
    const matchCat = catFilter === "all" || p.category === catFilter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const categories = ["all", "rental", "service", "fee", "transport", "misc"];

  return (
    <div className="p-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-black text-2xl">Product Catalog</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{products.length} items · {products.filter(p => (p.stock ?? 99) <= 3).length} low stock</p>
        </div>
        <button
          onClick={() => setEditing(null)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-display font-bold text-sm hover:brightness-110 transition-all"
        >
          <Plus size={14} /> Add Item
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <input
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none placeholder:text-muted-foreground w-64"
          placeholder="Search items…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex gap-1.5 flex-wrap">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all capitalize ${
                catFilter === c ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left font-mono text-[10px] tracking-widest uppercase text-muted-foreground px-4 py-3">Item</th>
              <th className="text-left font-mono text-[10px] tracking-widest uppercase text-muted-foreground px-4 py-3">Category</th>
              <th className="text-left font-mono text-[10px] tracking-widest uppercase text-muted-foreground px-4 py-3">Price</th>
              <th className="text-left font-mono text-[10px] tracking-widest uppercase text-muted-foreground px-4 py-3">Unit</th>
              <th className="text-left font-mono text-[10px] tracking-widest uppercase text-muted-foreground px-4 py-3">Stock</th>
              <th className="text-left font-mono text-[10px] tracking-widest uppercase text-muted-foreground px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">Loading…</td></tr>
            ) : filtered.map(p => {
              const st = STOCK_STATUS(p.stock ?? 99);
              return (
                <tr key={p.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{p.icon}</span>
                      <span className="font-medium text-sm">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-muted-foreground capitalize">{p.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-primary">{fmtPrice(parseFloat(p.price as any))}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-muted-foreground">/{p.unit}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-xs px-2 py-0.5 rounded-full ${st.cls}`}>
                      {st.label} ({p.stock})
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditing(p)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteMutation.mutate(p.id); }}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && !isLoading && (
          <div className="text-center py-16 text-muted-foreground text-sm">No items found</div>
        )}
      </div>

      {/* Modal */}
      {editing !== undefined && (
        <ProductModal
          product={editing}
          onClose={() => setEditing(undefined)}
          onSave={(data) => {
            if (editing?.id) updateMutation.mutate({ id: editing.id, data });
            else addMutation.mutate(data);
          }}
        />
      )}
    </div>
  );
}
