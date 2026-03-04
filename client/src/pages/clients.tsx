import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/query";
import type { Client } from "@shared/schema";
import { Plus, X, MessageCircle, Phone, Mail, Globe } from "lucide-react";

const CHANNEL_STYLE: Record<string, { label: string; cls: string; icon: string }> = {
  telegram: { label: "Telegram", cls: "bg-blue-500/10 text-blue-400 border border-blue-500/20", icon: "✈" },
  line: { label: "Line", cls: "bg-primary/10 text-primary border border-primary/20", icon: "◆" },
  facebook: { label: "Facebook", cls: "bg-orange-500/10 text-orange-400 border border-orange-500/20", icon: "⬡" },
  walkin: { label: "Walk-in", cls: "bg-secondary text-muted-foreground border border-border", icon: "👣" },
};

function ClientModal({ client, onClose, onSave }: {
  client?: Client | null;
  onClose: () => void;
  onSave: (data: Partial<Client>) => void;
}) {
  const [form, setForm] = useState({
    name: client?.name ?? "",
    phone: client?.phone ?? "",
    email: client?.email ?? "",
    nationality: client?.nationality ?? "",
    channel: client?.channel ?? "walkin",
    notes: client?.notes ?? "",
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl p-6 w-[460px] animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-lg">{client ? "Edit Client" : "Add Client"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Full Name *</label>
            <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" value={form.name} onChange={set("name")} placeholder="e.g. Dmitry Volkov" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Phone</label>
              <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" value={form.phone} onChange={set("phone")} placeholder="+7 921 123 4567" />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Channel</label>
              <select className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none cursor-pointer" value={form.channel} onChange={set("channel")}>
                <option value="telegram">✈ Telegram</option>
                <option value="line">◆ Line</option>
                <option value="facebook">⬡ Facebook</option>
                <option value="walkin">👣 Walk-in</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" value={form.email} onChange={set("email")} placeholder="client@email.com" />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Nationality</label>
              <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" value={form.nationality} onChange={set("nationality")} placeholder="🇷🇺 Russia" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Notes</label>
            <textarea className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none resize-none" rows={2} value={form.notes} onChange={set("notes")} placeholder="Preferences, property interests…" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 bg-secondary border border-border rounded-lg text-sm font-mono hover:border-primary/40 transition-colors">Cancel</button>
          <button
            onClick={() => {
              if (!form.name) return;
              onSave(form as any);
              onClose();
            }}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-display font-bold hover:brightness-110 transition-all"
          >
            {client ? "Save Changes" : "Add Client"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const qc = useQueryClient();
  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: () => api.get("/api/clients"),
  });

  const [editing, setEditing] = useState<Client | null | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [chanFilter, setChanFilter] = useState("all");

  const addMutation = useMutation({
    mutationFn: (data: Partial<Client>) => api.post("/api/clients", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/clients"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Client> }) => api.patch(`/api/clients/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/clients"] }),
  });

  const filtered = clients.filter(c => {
    const matchChan = chanFilter === "all" || c.channel === chanFilter;
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase());
    return matchChan && matchSearch;
  });

  return (
    <div className="p-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-black text-2xl">Client CRM</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{clients.length} clients · Telegram, Line, Facebook</p>
        </div>
        <button
          onClick={() => setEditing(null)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-display font-bold text-sm hover:brightness-110 transition-all"
        >
          <Plus size={14} /> Add Client
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none placeholder:text-muted-foreground w-60"
          placeholder="Search clients…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {["all", "telegram", "line", "facebook", "walkin"].map(c => (
          <button
            key={c}
            onClick={() => setChanFilter(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all capitalize ${
              chanFilter === c ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {c === "all" ? "All" : CHANNEL_STYLE[c]?.icon + " " + CHANNEL_STYLE[c]?.label}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(c => {
            const ch = CHANNEL_STYLE[c.channel] || CHANNEL_STYLE.walkin;
            return (
              <div
                key={c.id}
                className="card-hover bg-card border border-border rounded-xl p-5 cursor-pointer"
                onClick={() => setEditing(c)}
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-xl mb-3">
                  👤
                </div>

                <div className="font-display font-bold text-sm mb-0.5">{c.name}</div>
                <div className="text-xs text-muted-foreground mb-0.5">{c.nationality || "—"}</div>

                {c.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <Phone size={10} /> {c.phone}
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 truncate">
                    <Mail size={10} /> <span className="truncate">{c.email}</span>
                  </div>
                )}

                <span className={`inline-block font-mono text-[9px] px-2 py-0.5 rounded-full mt-2.5 uppercase tracking-wider ${ch.cls}`}>
                  {ch.icon} {ch.label}
                </span>

                {c.notes && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{c.notes}</p>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-20 text-muted-foreground text-sm">No clients found</div>
          )}
        </div>
      )}

      {/* Modal */}
      {editing !== undefined && (
        <ClientModal
          client={editing}
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
