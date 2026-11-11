"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { money, riel, round2 } from "@/lib/money";
import { useSettings } from "@/lib/useSettings";
import Receipt from "@/components/Receipt";
import type { Category, HeldCart, HeldCartSummary, Order, PageResponse, Product } from "@/types";

type CartLine = { product: Product; quantity: number };
type Method = "CASH" | "KHQR" | "CARD";
type Currency = "USD" | "KHR";

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1 text-sm ${active ? "bg-blue-600 text-white" : "bg-white"}`;

export default function PosPage() {
  const settings = useSettings();
  const taxRate = settings?.taxRate ?? 0;
  const rate = settings?.usdToKhr ?? 0;

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountType, setDiscountType] = useState<"PERCENT" | "AMOUNT">("PERCENT");
  const [discountValue, setDiscountValue] = useState("");
  const [method, setMethod] = useState<Method>("CASH");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [received, setReceived] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<Order | null>(null);

  const [held, setHeld] = useState<HeldCartSummary[]>([]);
  const [showHeld, setShowHeld] = useState(false);

  // ---------- ទាញទំនិញ ----------
  useEffect(() => {
    const t = setTimeout(() => setSearch(keyword), 400);
    return () => clearTimeout(t);
  }, [keyword]);

  useEffect(() => {
    apiFetch<Category[]>("/api/categories").then(setCategories).catch(() => {});
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: "0", size: "60", sort: "name,asc", activeOnly: "true",
      });
      if (search) params.set("keyword", search);
      if (categoryId) params.set("categoryId", categoryId);
      const res = await apiFetch<PageResponse<Product>>(`/api/products?${params}`);
      setProducts(res.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : "មានបញ្ហា");
    }
  }, [search, categoryId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const loadHeld = useCallback(async () => {
    try {
      setHeld(await apiFetch<HeldCartSummary[]>("/api/held-carts"));
    } catch {
      /* មិនបង្ហាញ Error: មុខងារបន្ថែម */
    }
  }, []);

  useEffect(() => {
    loadHeld();
  }, [loadHeld]);

  // ---------- កន្ត្រក ----------
  function addToCart(p: Product) {
    setError("");
    setCart((prev) => {
      const line = prev.find((l) => l.product.id === p.id);
      if (line) {
        if (line.quantity >= p.stockQuantity) return prev;
        return prev.map((l) => (l.product.id === p.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      if (p.stockQuantity < 1) return prev;
      return [...prev, { product: p, quantity: 1 }];
    });
  }

  function changeQty(id: number, delta: number) {
    setCart((prev) =>
      prev.flatMap((l) => {
        if (l.product.id !== id) return [l];
        const q = l.quantity + delta;
        if (q <= 0) return [];
        if (q > l.product.stockQuantity) return [l];
        return [{ ...l, quantity: q }];
      })
    );
  }

  function clearCart() {
    setCart([]);
    setDiscountValue("");
    setReceived("");
    setNotice("");
  }

  async function onSearchKey(e: React.KeyboardEvent) {
    if (e.key !== "Enter" || !keyword.trim()) return;
    try {
      const res = await apiFetch<PageResponse<Product>>(
        `/api/products?activeOnly=true&keyword=${encodeURIComponent(keyword.trim())}`
      );
      if (res.content.length === 1) {
        addToCart(res.content[0]);
        setKeyword("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "មានបញ្ហា");
    }
  }

  // ---------- Hold / Resume ----------
  async function holdCart() {
    if (cart.length === 0) return;
    const label = prompt("ឈ្មោះសម្គាល់ (ស្រេចចិត្ត ឧ. អតិថិជនអាវក្រហម):");
    if (label === null) return; // ចុច Cancel
    try {
      await apiFetch("/api/held-carts", {
        method: "POST",
        body: JSON.stringify({
          label: label.trim() || null,
          items: cart.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
        }),
      });
      clearCart();
      loadHeld();
    } catch (e) {
      setError(e instanceof Error ? e.message : "មានបញ្ហា");
    }
  }

  async function resume(h: HeldCartSummary) {
    try {
      const data = await apiFetch<HeldCart>(`/api/held-carts/${h.id}/resume`, { method: "POST" });

      // ពិនិត្យស្តុក/ស្ថានភាពទំនិញឡើងវិញ ព្រោះ Hold មិនបានរក្សាស្តុកទុក
      const lines: CartLine[] = [];
      const notes: string[] = [];
      for (const it of data.items) {
        const p = it.product;
        if (!p.active) {
          notes.push(`${p.name}: ត្រូវបានបិទលក់`);
          continue;
        }
        if (p.stockQuantity < 1) {
          notes.push(`${p.name}: អស់ស្តុក`);
          continue;
        }
        const q = Math.min(it.quantity, p.stockQuantity);
        if (q < it.quantity) notes.push(`${p.name}: ស្តុកនៅសល់ ${p.stockQuantity} (ពី ${it.quantity})`);
        lines.push({ product: p, quantity: q });
      }

      setCart(lines);
      setNotice(notes.join(" • "));
      setError("");
      setShowHeld(false);
      loadHeld();
    } catch (e) {
      setError(e instanceof Error ? e.message : "មានបញ្ហា");
      loadHeld();
    }
  }

  async function discardHeld(h: HeldCartSummary) {
    if (!confirm(`លុបកន្ត្រកដែលបានផ្អាក "${h.label ?? new Date(h.createdAt).toLocaleTimeString()}" ?`)) return;
    try {
      await apiFetch(`/api/held-carts/${h.id}`, { method: "DELETE" });
      loadHeld();
    } catch (e) {
      setError(e instanceof Error ? e.message : "មានបញ្ហា");
      loadHeld();
    }
  }

  // ---------- គណនា (បង្ហាញជាមុន ។ Server ជាអ្នកកំណត់ចុងក្រោយ) ----------
  const dv = Number(discountValue) || 0;

  const totals = useMemo(() => {
    const subtotal = round2(cart.reduce((s, l) => s + l.product.price * l.quantity, 0));
    const discount = discountType === "PERCENT" ? round2((subtotal * dv) / 100) : round2(dv);
    const taxable = Math.max(0, round2(subtotal - discount));
    const tax = round2((taxable * taxRate) / 100);
    const total = round2(taxable + tax);
    return { subtotal, discount, tax, total };
  }, [cart, discountType, dv, taxRate]);

  // USD → រៀល ជិតបំផុត 100៛ (ត្រូវនឹង Backend: HALF_UP)
  const totalKhr =
    rate > 0 ? Math.round((Math.round(totals.total * 100) * rate) / 10000) * 100 : 0;

  const khrMode = method === "CASH" && currency === "KHR";
  const due = khrMode ? totalKhr : totals.total;
  const fmt = (n: number) => (khrMode ? riel(n) : money(n));

  const invalidDiscount =
    totals.discount > totals.subtotal || (discountType === "PERCENT" && dv > 100);
  const receivedNum = Number(received) || 0;
  const change = method === "CASH" ? round2(receivedNum - due) : 0;
  const canPay =
    settings !== null &&
    cart.length > 0 &&
    !invalidDiscount &&
    (method !== "CASH" || receivedNum >= due);

  function chooseMethod(m: Method) {
    setMethod(m);
    if (m !== "CASH") setCurrency("USD"); // KHR ប្រើបានតែ CASH
    setReceived("");
  }

  function chooseCurrency(c: Currency) {
    setCurrency(c);
    setReceived("");
  }

  // ---------- បង់ប្រាក់ ----------
  async function pay() {
    setPaying(true);
    setError("");
    try {
      const order = await apiFetch<Order>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          items: cart.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
          discountType: dv > 0 ? discountType : null,
          discountValue: dv > 0 ? dv : null,
          paymentMethod: method,
          paymentCurrency: method === "CASH" ? currency : "USD",
          amountPaid: method === "CASH" ? receivedNum : null,
        }),
      });
      setReceipt(order);
      clearCart();
      loadProducts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "មានបញ្ហា");
      loadProducts();
    } finally {
      setPaying(false);
    }
  }

  return (
    <main className="grid gap-4 p-4 lg:grid-cols-3">
      {/* ===== ឆ្វេង: ទំនិញ ===== */}
      <section className="lg:col-span-2">
        <input
          autoFocus
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={onSearchKey}
          placeholder="ស្វែងរក ឬស្កេន Barcode (Enter)"
          className="mb-3 w-full rounded border p-2"
        />

        <div className="mb-3 flex flex-wrap gap-2">
          <button onClick={() => setCategoryId("")} className={chip(categoryId === "")}>ទាំងអស់</button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setCategoryId(String(c.id))} className={chip(categoryId === String(c.id))}>
              {c.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => {
            const out = p.stockQuantity < 1;
            return (
              <button
                key={p.id}
                disabled={out}
                onClick={() => addToCart(p)}
                className="rounded-xl border bg-white p-3 text-left shadow-sm hover:border-blue-500 disabled:opacity-40"
              >
                <div className="font-semibold">{p.name}</div>
                <div className="text-blue-600">{money(p.price)}</div>
                <div className={`text-xs ${p.lowStock ? "text-red-600" : "text-gray-500"}`}>
                  {out ? "អស់ស្តុក" : `ស្តុក: ${p.stockQuantity}`}
                </div>
              </button>
            );
          })}
          {products.length === 0 && <p className="col-span-full text-gray-500">មិនមានទំនិញទេ</p>}
        </div>
      </section>

      {/* ===== ស្តាំ: កន្ត្រក ===== */}
      <aside className="h-fit rounded-xl bg-white p-4 shadow lg:sticky lg:top-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">កន្ត្រក</h2>
          <button onClick={() => setShowHeld(true)} className="rounded border px-3 py-1 text-sm">
            📋 ផ្អាក ({held.length})
          </button>
        </div>

        {error && <div className="mb-3 rounded bg-red-100 p-2 text-sm text-red-700">{error}</div>}
        {notice && (
          <div className="mb-3 rounded bg-yellow-100 p-2 text-sm text-yellow-800">
            ⚠ កែសម្រួលពេលបន្ត៖ {notice}
          </div>
        )}

        <ul className="mb-3 max-h-64 divide-y overflow-y-auto">
          {cart.map((l) => (
            <li key={l.product.id} className="flex items-center gap-2 py-2 text-sm">
              <div className="flex-1">
                <div>{l.product.name}</div>
                <div className="text-gray-500">{money(l.product.price)}</div>
              </div>
              <button onClick={() => changeQty(l.product.id, -1)} className="h-7 w-7 rounded border">−</button>
              <span className="w-6 text-center">{l.quantity}</span>
              <button onClick={() => changeQty(l.product.id, 1)} className="h-7 w-7 rounded border">+</button>
              <div className="w-20 text-right">{money(round2(l.product.price * l.quantity))}</div>
            </li>
          ))}
          {cart.length === 0 && <li className="py-6 text-center text-gray-400">កន្ត្រកទទេ</li>}
        </ul>

        {/* Discount */}
        <div className="mb-3 flex gap-2">
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as "PERCENT" | "AMOUNT")}
            className="rounded border p-2 text-sm"
          >
            <option value="PERCENT">បញ្ចុះ %</option>
            <option value="AMOUNT">បញ្ចុះ $</option>
          </select>
          <input
            type="number" min="0" step="0.01"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            placeholder="0"
            className="w-full rounded border p-2 text-sm"
          />
        </div>
        {invalidDiscount && <p className="mb-2 text-xs text-red-600">ការបញ្ចុះតម្លៃមិនត្រឹមត្រូវ</p>}

        {/* សរុប */}
        <div className="space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>-{money(totals.discount)}</span></div>
          <div className="flex justify-between"><span>VAT ({taxRate}%)</span><span>{money(totals.tax)}</span></div>
          <div className="flex justify-between text-xl font-bold">
            <span>សរុប</span><span>{money(totals.total)}</span>
          </div>
          {rate > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>≈ រៀល (1$ = {rate.toLocaleString()}៛)</span>
              <span>{riel(totalKhr)}</span>
            </div>
          )}
        </div>

        {/* វិធីបង់ប្រាក់ */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(["CASH", "KHQR", "CARD"] as Method[]).map((m) => (
            <button
              key={m}
              onClick={() => chooseMethod(m)}
              className={`rounded border py-2 text-sm font-semibold ${
                method === m ? "border-blue-600 bg-blue-50 text-blue-700" : ""
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {method === "CASH" && (
          <div className="mt-3">
            <div className="mb-2 flex gap-2">
              {(["USD", "KHR"] as Currency[]).map((c) => (
                <button
                  key={c}
                  onClick={() => chooseCurrency(c)}
                  disabled={c === "KHR" && rate <= 0}
                  className={`flex-1 rounded border py-1 text-sm ${
                    currency === c ? "border-green-600 bg-green-50 font-semibold text-green-700" : ""
                  } disabled:opacity-40`}
                >
                  {c === "USD" ? "$ ដុល្លារ" : "៛ រៀល"}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="number" min="0" step={khrMode ? "100" : "0.01"}
                value={received}
                onChange={(e) => setReceived(e.target.value)}
                placeholder={khrMode ? "ប្រាក់ដែលទទួល (៛)" : "ប្រាក់ដែលទទួល ($)"}
                className="w-full rounded border p-2"
              />
              <button
                onClick={() => setReceived(String(due))}
                className="whitespace-nowrap rounded border px-3 text-sm"
              >
                គ្រប់
              </button>
            </div>
            {khrMode && cart.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">ត្រូវបង់: {riel(totalKhr)}</p>
            )}
            {receivedNum > 0 && (
              <p className={`mt-1 text-sm ${change < 0 ? "text-red-600" : "text-green-700"}`}>
                {change < 0 ? `នៅខ្វះ ${fmt(-change)}` : `អាប់: ${fmt(change)}`}
              </p>
            )}
          </div>
        )}

        <button
          onClick={pay}
          disabled={!canPay || paying}
          className="mt-4 w-full rounded bg-green-600 py-3 text-lg font-bold text-white disabled:opacity-40"
        >
          {paying ? "កំពុងដំណើរការ..." : `បង់ប្រាក់ ${khrMode ? riel(totalKhr) : money(totals.total)}`}
        </button>

        {cart.length > 0 && (
          <div className="mt-2 flex gap-2">
            <button onClick={holdCart} className="flex-1 rounded border py-2 text-sm text-orange-700">
              ⏸ ផ្អាកកន្ត្រក
            </button>
            <button onClick={clearCart} className="flex-1 rounded border py-2 text-sm text-gray-500">
              សម្អាត
            </button>
          </div>
        )}
      </aside>

      {/* ===== Modal: កន្ត្រកដែលបានផ្អាក ===== */}
      {showHeld && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
            <h2 className="mb-3 text-lg font-bold">កន្ត្រកដែលបានផ្អាក</h2>

            {cart.length > 0 && (
              <p className="mb-3 rounded bg-yellow-50 p-2 text-sm text-yellow-800">
                កន្ត្រកបច្ចុប្បន្នមិនទទេ។ សូមបង់ប្រាក់ ផ្អាក ឬសម្អាតវាមុនពេលបន្ត
              </p>
            )}

            <ul className="divide-y">
              {held.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <div className="font-semibold">
                      {h.label ?? `ផ្អាកម៉ោង ${new Date(h.createdAt).toLocaleTimeString()}`}
                    </div>
                    <div className="text-gray-500">
                      {h.itemCount} មុខ · {h.totalQuantity} ឯកតា ·{" "}
                      {new Date(h.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => resume(h)}
                      disabled={cart.length > 0}
                      className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-40"
                    >
                      បន្ត
                    </button>
                    <button onClick={() => discardHeld(h)} className="rounded border px-3 py-1 text-red-600">
                      លុប
                    </button>
                  </div>
                </li>
              ))}
              {held.length === 0 && <li className="py-6 text-center text-gray-400">មិនមានកន្ត្រកដែលបានផ្អាកទេ</li>}
            </ul>

            <button onClick={() => setShowHeld(false)} className="mt-4 w-full rounded border py-2">បិទ</button>
          </div>
        </div>
      )}

      {receipt && <Receipt order={receipt} onClose={() => setReceipt(null)} />}
    </main>
  );
}