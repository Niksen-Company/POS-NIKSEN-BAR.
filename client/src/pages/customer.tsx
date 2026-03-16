import { useState, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface MenuItem {
  id:       number;
  name:     string;
  category: string;
  price:    string;
  icon:     string;
  imgUrl:   string | null;
  unit:     string;
  stock:    number | null;
}

interface CartItem {
  productId: number;
  name:      string;
  icon:      string;
  imgUrl:    string | null;
  price:     number;
  qty:       number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const TABLES = ["T1", "T2", "T3", "T4", "T5", "Bar", "Terrace"];
const PAY_METHODS = [
  { key: "cash",     icon: "💵", label: "CASH" },
  { key: "qr",       icon: "📱", label: "QR / PROMPTPAY" },
  { key: "card",     icon: "💳", label: "CARD" },
  { key: "transfer", icon: "📋", label: "OPEN TAB" },
] as const;

const CAT_LABELS: Record<string, string> = {
  all:        "All",
  beer:       "🍺 Beer",
  craft_beer: "🍺 Craft Beer",
  wine:       "🍷 Wine",
  soda:       "🥤 Soft Drinks",
  cocktail:   "🍹 Cocktails",
  food:       "🍽️ Snacks",
  misc:       "Other",
};

function fmtPrice(p: string | number) {
  return "฿" + Number(p).toLocaleString();
}

// ── CSS injected globally once ────────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');
.cust-root{--bg:#0a0d0b;--bg2:#111510;--card:#1a2118;--border:#243020;--green:#00e87a;--muted:#4e6a5c;--text:#e4ede8;--text2:#a8bfb0;--amber:#f5a623;--red:#ff4d4d;background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;min-height:100vh;max-width:480px;margin:0 auto;position:relative}
.cust-root *{box-sizing:border-box}
.cust-header{padding:52px 24px 20px}
.cust-tag{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:4px;color:var(--green);margin-bottom:10px}
.cust-title{font-family:'Playfair Display',serif;font-size:42px;font-weight:900;line-height:1;letter-spacing:-1px;margin-bottom:4px}
.cust-title span{color:var(--green)}
.cust-sub{font-size:13px;color:var(--muted);font-weight:300;letter-spacing:1px}
.cats-row{display:flex;gap:8px;padding:0 24px 20px;overflow-x:auto;scrollbar-width:none}
.cats-row::-webkit-scrollbar{display:none}
.cat-pill{padding:8px 18px;border-radius:50px;font-size:11px;font-family:'DM Mono',monospace;letter-spacing:1px;cursor:pointer;white-space:nowrap;border:1px solid var(--border);color:var(--muted);background:transparent;transition:all .2s}
.cat-pill.on{background:var(--green);color:#0a0d0b;border-color:var(--green)}
.sec-title{padding:0 24px 14px;font-family:'Playfair Display',serif;font-size:20px;font-weight:700;display:flex;align-items:center;gap:10px}
.sec-title::after{content:'';flex:1;height:1px;background:var(--border)}
.menu-grid{display:flex;flex-direction:column;gap:10px;padding:0 24px 24px}
.m-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:14px 16px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:border-color .2s;-webkit-tap-highlight-color:transparent}
.m-card:active{border-color:var(--green);transform:scale(0.99)}
.m-icon{font-size:30px;width:54px;height:54px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:#001a0e;flex-shrink:0}
.m-icon img{width:48px;height:48px;object-fit:cover;border-radius:12px}
.m-info{flex:1;min-width:0}
.m-name{font-family:'Playfair Display',serif;font-size:15px;font-weight:700;margin-bottom:2px}
.m-cat{font-size:11px;color:var(--muted);margin-bottom:6px}
.m-price{font-family:'DM Mono',monospace;font-size:14px;color:var(--text)}
.m-add{width:34px;height:34px;border-radius:50%;background:rgba(0,232,122,0.1);border:1px solid rgba(0,232,122,0.3);color:var(--green);font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
.m-add:active{background:var(--green);color:#0a0d0b;transform:scale(0.9)}
.m-oos{font-size:9px;font-family:'DM Mono',monospace;color:var(--red);letter-spacing:1px;margin-top:3px}
.cart-fab{position:fixed;bottom:28px;right:calc(50% - 215px + 20px);background:var(--green);width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;box-shadow:0 4px 24px rgba(0,232,122,0.35);transition:transform .2s;z-index:99;border:none}
.cart-fab:active{transform:scale(0.92)}
.fab-cnt{position:absolute;top:-4px;right:-4px;background:var(--red);color:#fff;font-size:10px;font-family:'DM Mono',monospace;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center}
.spacer-bot{height:90px}
.cart-panel{position:fixed;inset:0;background:var(--bg);z-index:200;overflow-y:auto;max-width:480px;margin:0 auto}
.cart-hdr{padding:52px 24px 20px;display:flex;align-items:center;gap:14px}
.back-btn{width:40px;height:40px;border-radius:50%;border:1px solid var(--border);background:var(--card);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;flex-shrink:0}
.c-items{display:flex;flex-direction:column;gap:10px;padding:0 24px 20px}
.c-item{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px;display:flex;align-items:center;gap:12px}
.c-info{flex:1;min-width:0}
.c-name{font-family:'Playfair Display',serif;font-size:14px;font-weight:700;margin-bottom:2px}
.c-price{font-family:'DM Mono',monospace;font-size:12px;color:var(--text2)}
.qty-row{display:flex;align-items:center;gap:10px}
.q-btn{width:30px;height:30px;border-radius:50%;border:1px solid var(--border);background:var(--bg2);color:var(--text);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
.q-btn:active{border-color:var(--green)}
.q-num{font-family:'DM Mono',monospace;font-size:14px;min-width:20px;text-align:center}
.rm-btn{width:28px;height:28px;border-radius:50%;border:1px solid rgba(255,77,77,0.25);background:rgba(255,77,77,0.06);color:var(--red);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.sub-section{padding:0 24px 20px}
.sub-label{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:3px;color:var(--muted);margin-bottom:10px}
.tbl-row{display:flex;gap:8px;flex-wrap:wrap}
.tbl-btn{padding:8px 16px;border-radius:50px;font-size:11px;font-family:'DM Mono',monospace;letter-spacing:1px;cursor:pointer;border:1px solid var(--border);color:var(--muted);background:transparent;transition:all .2s}
.tbl-btn.on{background:rgba(0,232,122,0.08);border-color:rgba(0,232,122,0.4);color:var(--green)}
.note-inp{width:100%;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;resize:none;outline:none;transition:border-color .2s}
.note-inp:focus{border-color:var(--green)}
.pay-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.pay-btn{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;transition:all .2s}
.pay-btn.on{border-color:rgba(0,232,122,0.5);background:rgba(0,232,122,0.05)}
.pay-ico{font-size:22px}
.pay-lbl{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:var(--muted)}
.pay-btn.on .pay-lbl{color:var(--green)}
.summary{margin:0 24px 24px;background:var(--card);border:1px solid var(--border);border-radius:20px;padding:20px}
.sum-row{display:flex;justify-content:space-between;margin-bottom:12px;font-size:13px}
.sum-lbl{color:var(--text2)}
.sum-val{font-family:'DM Mono',monospace}
.sum-divider{height:1px;background:var(--border);margin:14px 0}
.tot-lbl{font-family:'Playfair Display',serif;font-size:18px;font-weight:700}
.tot-val{font-family:'DM Mono',monospace;font-size:20px;color:var(--green)}
.co-btn{width:calc(100% - 48px);margin:0 24px 40px;padding:18px;border-radius:18px;background:var(--green);border:none;color:#0a0d0b;font-family:'Playfair Display',serif;font-size:18px;font-weight:700;cursor:pointer;transition:transform .15s;display:block}
.co-btn:active{transform:scale(0.98)}
.co-btn:disabled{opacity:0.4;cursor:not-allowed}
.success{position:fixed;inset:0;background:var(--bg);z-index:300;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center;max-width:480px;margin:0 auto}
.s-ring{width:90px;height:90px;border-radius:50%;border:2px solid var(--green);display:flex;align-items:center;justify-content:center;font-size:40px;margin-bottom:28px}
.s-title{font-family:'Playfair Display',serif;font-size:32px;font-weight:900;margin-bottom:8px}
.s-sub{font-size:14px;color:var(--muted);margin-bottom:6px}
.s-num{font-family:'DM Mono',monospace;font-size:13px;color:var(--green);letter-spacing:2px;margin-bottom:8px}
.s-total{font-family:'DM Mono',monospace;font-size:20px;color:var(--text);margin-bottom:32px}
.s-again{padding:14px 32px;border-radius:50px;border:1px solid var(--border);background:transparent;color:var(--text);font-family:'DM Mono',monospace;font-size:11px;letter-spacing:2px;cursor:pointer}
.err-banner{background:rgba(255,77,77,0.1);border:1px solid rgba(255,77,77,0.3);border-radius:12px;padding:12px 16px;margin:0 24px 16px;font-size:12px;color:var(--red);font-family:'DM Mono',monospace}
.loading{padding:60px 24px;text-align:center;color:var(--muted);font-family:'DM Mono',monospace;font-size:12px;letter-spacing:2px}
`;

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CustomerMenuPage() {
  const [items,       setItems]       = useState<MenuItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [cat,         setCat]         = useState("all");
  const [cart,        setCart]        = useState<CartItem[]>([]);
  const [showCart,    setShowCart]    = useState(false);
  const [table,       setTable]       = useState("T1");
  const [note,        setNote]        = useState("");
  const [pay,         setPay]         = useState<"cash"|"card"|"transfer"|"qr">("cash");
  const [ordering,    setOrdering]    = useState(false);
  const [success,     setSuccess]     = useState<null | { orderNum: string; total: number }>(null);
  const [error,       setError]       = useState<string | null>(null);

  // Inject styles once
  useEffect(() => {
    if (!document.getElementById("cust-styles")) {
      const s = document.createElement("style");
      s.id = "cust-styles";
      s.textContent = STYLES;
      document.head.appendChild(s);
    }
    fetch("/api/customer/menu")
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const categories = ["all", ...Array.from(new Set(items.map(i => i.category)))];
  const filtered   = cat === "all" ? items : items.filter(i => i.category === cat);
  const totalQty   = cart.reduce((s, c) => s + c.qty, 0);
  const subtotal   = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const vat        = Math.round(subtotal * 0.07);
  const total      = subtotal + vat;

  // ── Cart helpers ─────────────────────────────────────────────────────────────
  function addToCart(item: MenuItem) {
    setCart(prev => {
      const idx = prev.findIndex(c => c.productId === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { productId: item.id, name: item.name, icon: item.icon, imgUrl: item.imgUrl, price: Number(item.price), qty: 1 }];
    });
  }

  function changeQty(productId: number, delta: number) {
    setCart(prev => prev
      .map(c => c.productId === productId ? { ...c, qty: c.qty + delta } : c)
      .filter(c => c.qty > 0)
    );
  }

  // ── Place order ──────────────────────────────────────────────────────────────
  async function placeOrder() {
    if (cart.length === 0 || ordering) return;
    setOrdering(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ items: cart, tableNote: table, notes: note, paymentMethod: pay }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order failed");
      setSuccess({ orderNum: data.orderNum, total: data.total });
      setCart([]);
      setShowCart(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setOrdering(false);
    }
  }

  // ── Success screen ───────────────────────────────────────────────────────────
  if (success) return (
    <div className="cust-root">
      <div className="success">
        <div className="s-ring">✓</div>
        <div className="s-title">Order Placed!</div>
        <div className="s-sub">Your drinks are being prepared 🍺</div>
        <div className="s-num">ORDER {success.orderNum}</div>
        <div className="s-total">{fmtPrice(success.total)}</div>
        <button className="s-again" onClick={() => setSuccess(null)}>ORDER AGAIN</button>
      </div>
    </div>
  );

  // ── Cart screen ──────────────────────────────────────────────────────────────
  if (showCart) return (
    <div className="cust-root">
      <div className="cart-panel">
        <div className="cart-hdr">
          <button className="back-btn" onClick={() => setShowCart(false)}>←</button>
          <div>
            <div className="cust-tag">YOUR ORDER</div>
            <div className="cust-title" style={{ fontSize: 28 }}>Cart</div>
          </div>
        </div>

        {error && <div className="err-banner">❌ {error}</div>}

        <div className="c-items">
          {cart.map(c => (
            <div key={c.productId} className="c-item">
              <div className="m-icon" style={{ fontSize: 26, width: 48, height: 48 }}>{c.icon}</div>
              <div className="c-info">
                <div className="c-name">{c.name}</div>
                <div className="c-price">{fmtPrice(c.price)} × {c.qty} = {fmtPrice(c.price * c.qty)}</div>
              </div>
              <div className="qty-row">
                <button className="q-btn" onClick={() => changeQty(c.productId, -1)}>−</button>
                <span className="q-num">{c.qty}</span>
                <button className="q-btn" onClick={() => changeQty(c.productId, +1)}>+</button>
              </div>
              <button className="rm-btn" onClick={() => setCart(prev => prev.filter(x => x.productId !== c.productId))}>✕</button>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="sub-section">
          <div className="sub-label">Table</div>
          <div className="tbl-row">
            {TABLES.map(t => (
              <button key={t} className={`tbl-btn${table === t ? " on" : ""}`} onClick={() => setTable(t)}>{t}</button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="sub-section">
          <div className="sub-label">Special Request</div>
          <textarea className="note-inp" rows={2} placeholder="e.g. No ice, extra cold, allergies..." value={note} onChange={e => setNote(e.target.value)} />
        </div>

        {/* Payment */}
        <div className="sub-section">
          <div className="sub-label">Payment</div>
          <div className="pay-grid">
            {PAY_METHODS.map(m => (
              <button key={m.key} className={`pay-btn${pay === m.key ? " on" : ""}`} onClick={() => setPay(m.key)}>
                <span className="pay-ico">{m.icon}</span>
                <span className="pay-lbl">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="summary">
          <div className="sum-row"><span className="sum-lbl">Subtotal</span><span className="sum-val">{fmtPrice(subtotal)}</span></div>
          <div className="sum-row"><span className="sum-lbl">VAT (7%)</span><span className="sum-val">{fmtPrice(vat)}</span></div>
          <div className="sum-divider" />
          <div className="sum-row"><span className="tot-lbl">Total</span><span className="tot-val">{fmtPrice(total)}</span></div>
        </div>

        <button className="co-btn" disabled={cart.length === 0 || ordering} onClick={placeOrder}>
          {ordering ? "Placing order…" : `Place Order · ${fmtPrice(total)}`}
        </button>
      </div>
    </div>
  );

  // ── Menu screen ───────────────────────────────────────────────────────────────
  return (
    <div className="cust-root">
      <div className="cust-header">
        <div className="cust-tag">KOH SAMUI · NIKSEN BAR</div>
        <div className="cust-title">NIKSEN<br /><span>Bar</span></div>
        <div className="cust-sub">Craft Beer · Natural Wine · Good Vibes</div>
      </div>

      <div className="cats-row">
        {categories.map(c => (
          <button key={c} className={`cat-pill${cat === c ? " on" : ""}`} onClick={() => setCat(c)}>
            {CAT_LABELS[c] || c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">Loading menu…</div>
      ) : filtered.length === 0 ? (
        <div className="loading">No items found</div>
      ) : (
        <>
          <div className="sec-title">{CAT_LABELS[cat] || cat}</div>
          <div className="menu-grid">
            {filtered.map(item => {
              const outOfStock = item.stock !== null && item.stock === 0;
              const inCart = cart.find(c => c.productId === item.id);
              return (
                <div key={item.id} className="m-card" onClick={() => !outOfStock && addToCart(item)}>
                  <div className="m-icon">
                    {item.imgUrl
                      ? <img src={item.imgUrl} alt={item.name} />
                      : <span style={{ fontSize: 28 }}>{item.icon}</span>
                    }
                  </div>
                  <div className="m-info">
                    <div className="m-name">{item.name}</div>
                    <div className="m-cat">{CAT_LABELS[item.category] || item.category}</div>
                    <div className="m-price">{fmtPrice(item.price)} <span style={{ color: "var(--muted)", fontSize: 10 }}>/ {item.unit}</span></div>
                    {outOfStock && <div className="m-oos">OUT OF STOCK</div>}
                  </div>
                  {!outOfStock && (
                    <button className="m-add" onClick={e => { e.stopPropagation(); addToCart(item); }}>
                      {inCart ? `+${inCart.qty}` : "+"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="spacer-bot" />

      {totalQty > 0 && (
        <button className="cart-fab" onClick={() => setShowCart(true)}>
          🛒
          <span className="fab-cnt">{totalQty}</span>
        </button>
      )}
    </div>
  );
}
