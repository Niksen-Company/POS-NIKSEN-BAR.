import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/query";
import type { OrderWithItems } from "@shared/schema";

function fmtPrice(n: number) {
  return "฿" + n.toLocaleString("en-US", { minimumFractionDigits: 0 });
}

const PAY_STYLE: Record<string, string> = {
  cash: "bg-primary/10 text-primary",
  card: "bg-blue-500/10 text-blue-400",
  transfer: "bg-orange-500/10 text-orange-400",
  qr: "bg-purple-500/10 text-purple-400",
};

export default function OrdersPage() {
  const { data: orders = [], isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders"],
    queryFn: () => api.get("/api/orders?limit=100"),
  });

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6">
        <h1 className="font-display font-black text-2xl">Order History</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{orders.length} transactions</p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left font-mono text-[10px] tracking-widest uppercase text-muted-foreground px-4 py-3">Order</th>
              <th className="text-left font-mono text-[10px] tracking-widest uppercase text-muted-foreground px-4 py-3">Client</th>
              <th className="text-left font-mono text-[10px] tracking-widest uppercase text-muted-foreground px-4 py-3">Items</th>
              <th className="text-left font-mono text-[10px] tracking-widest uppercase text-muted-foreground px-4 py-3">Payment</th>
              <th className="text-left font-mono text-[10px] tracking-widest uppercase text-muted-foreground px-4 py-3">Date</th>
              <th className="text-right font-mono text-[10px] tracking-widest uppercase text-muted-foreground px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">Loading…</td></tr>
            )}
            {orders.map(o => (
              <tr key={o.id} className="border-b border-border/40 hover:bg-primary/5 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-muted-foreground">#{o.id.toString().padStart(4, "0")}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm">{o.client?.name ?? "Walk-in"}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {o.items.map((item, i) => (
                      <span key={i} className="text-xs bg-secondary border border-border px-2 py-0.5 rounded-full">
                        {item.icon} {item.name} ×{item.qty}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full uppercase ${PAY_STYLE[o.paymentMethod] || "bg-secondary"}`}>
                    {o.paymentMethod}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-muted-foreground">
                    {new Date(o.createdAt!).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-mono text-sm font-bold text-primary">{fmtPrice(parseFloat(o.total))}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && !isLoading && (
          <div className="text-center py-16 text-muted-foreground text-sm">No orders yet</div>
        )}
      </div>
    </div>
  );
}
