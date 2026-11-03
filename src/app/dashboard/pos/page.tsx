"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { money, round2 } from "@/lib/money";
import Receipt from "@/components/Receipt";
import type { Category, Order, PageResponse, Product } from "@/types";

// ប្រាក់ពន្ធ 10%
const TAX_RATE = 10;

type CartLine = { product: Product; quantity: number };
type Method = "CASH" | "KHQR" | "CARD";

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1 text-sm ${active ? "bg-blue-600 text-white" : "bg-white"}`;

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountType, setDiscountType] = useState<"PERCENT" | "AMOUNT">("PERCENT");
  const [discountValue, setDiscountValue] = useState("");
  const [method, setMethod] = useState<Method>("CASH");
  const [received, setReceived] = useState("");

  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<Order | null>(null);

  // ---------- ទាញទំនិញ ----------
  useEffect(() => {
    const t = setTimeout(() => setSearch(keyword), 400);   // Debounce
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

  // ---------- កន្ត្រក ----------
  function addToCart(p: Product) {
    setError("");
    setCart((prev) => {
      const line = prev.find((l) => l.product.id === p.id);
      if (line) {
        if (line.quantity >= p.stockQuantity) return prev;   // មិនឱ្យលើសស្តុក
        return prev.map((l) =>
          l.product.id === p.id ? { ...l, quantity: l.quantity + 1 } : l
        );
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
        if (q <= 0) return [];                       // ចំនួន 0 = លុបចេញ
        if (q > l.product.stockQuantity) return [l]; // មិនឱ្យលើសស្តុក
        return [{ ...l, quantity: q }];
      })
    );
  }

  // ស្កេន Barcode: Scanner វាយលេខ + Enter
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

  // ---------- គណនា (បង្ហាញជាមុន) ----------
  const dv = Number(discountValue) || 0;

  const totals = useMemo(() => {
    const subtotal = round2(cart.reduce((s, l) => s + l.product.price * l.quantity, 0));
    const discount = discountType === "PERCENT" ? round2((subtotal * dv) / 100) : round2(dv);
    const taxable = Math.max(0, round2(subtotal - discount));
    const tax = round2((taxable * TAX_RATE) / 100);
    const total = round2(taxable + tax);
    return { subtotal, discount, tax, total };
  }, [cart, discountType, dv]);

  const invalidDiscount =
    totals.discount > totals.subtotal || (discountType === "PERCENT" && dv > 100);
  const receivedNum = Number(received) || 0;
  const change = method === "CASH" ? round2(receivedNum - totals.total) : 0;
  const canPay =
    cart.length > 0 && !invalidDiscount && (method !== "CASH" || receivedNum >= totals.total);

  // ---------- បង់ប្រាក់ ----------
  async function pay() {
    setPaying(true);
    setError("");
    try {
      const order = await apiFetch<Order>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          // ផ្ញើតែ id និងចំនួន — គ្មានតម្លៃ!
          items: cart.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
          discountType: dv > 0 ? discountType : null,
          discountValue: dv > 0 ? dv : null,
          paymentMethod: method,
          amountPaid: method === "CASH" ? receivedNum : null,
        }),
      });
      setReceipt(order);
      setCart([]);
      setDiscountValue("");
      setReceived("");
      loadProducts();   // ទាញស្តុកថ្មី
    } catch (e) {
      setError(e instanceof Error ? e.message : "មានបញ្ហា");
      loadProducts();   // ស្តុកអាចបានប្តូរ
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
          placeholder="Search or scan Barcode (Enter)"
          className="mb-3 w-full rounded border p-2"
        />

        <div className="mb-3 flex flex-wrap gap-2">
          <button onClick={() => setCategoryId("")} className={chip(categoryId === "")}>
            All Categories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryId(String(c.id))}
              className={chip(categoryId === String(c.id))}
            >
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
                  {out ? "Out of Stock" : `Stock: ${p.stockQuantity}`}
                </div>
              </button>
            );
          })}
          {products.length === 0 && (
            <p className="col-span-full text-gray-500">No products available</p>
          )}
        </div>
      </section>

      {/* ===== ស្តាំ: កន្ត្រក ===== */}
      <aside className="h-fit rounded-xl bg-white p-4 shadow lg:sticky lg:top-4">
        <h2 className="mb-3 text-lg font-bold">Shopping Cart</h2>

        {error && <div className="mb-3 rounded bg-red-100 p-2 text-sm text-red-700">{error}</div>}

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
          {cart.length === 0 && (
            <li className="py-6 text-center text-gray-400">Shopping Cart is empty</li>
          )}
        </ul>

        {/* Discount */}
        <div className="mb-3 flex gap-2">
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as "PERCENT" | "AMOUNT")}
            className="rounded border p-2 text-sm"
          >
            <option value="PERCENT">Discount %</option>
            <option value="AMOUNT">Discount $</option>
          </select>
          <input
            type="number" min="0" step="0.01"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            placeholder="0"
            className="w-full rounded border p-2 text-sm"
          />
        </div>
        {invalidDiscount && (
          <p className="mb-2 text-xs text-red-600">Invalid discount value</p>
        )}

        {/* សរុប */}
        <div className="space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>-{money(totals.discount)}</span></div>
          <div className="flex justify-between"><span>VAT ({TAX_RATE}%)</span><span>{money(totals.tax)}</span></div>
          <div className="flex justify-between text-xl font-bold">
            <span>Total</span><span>{money(totals.total)}</span>
          </div>
        </div>

        {/* វិធីបង់ប្រាក់ */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(["CASH", "KHQR", "CARD"] as Method[]).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
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
            <div className="flex gap-2">
              <input
                type="number" min="0" step="0.01"
                value={received}
                onChange={(e) => setReceived(e.target.value)}
                placeholder="Amount Received ($)"
                className="w-full rounded border p-2"
              />
              <button
                onClick={() => setReceived(String(totals.total))}
                className="whitespace-nowrap rounded border px-3 text-sm"
              >
                All
              </button>
            </div>
            {receivedNum > 0 && (
              <p className={`mt-1 text-sm ${change < 0 ? "text-red-600" : "text-green-700"}`}>
                {change < 0 ? `Shortage: ${money(-change)}` : `Change: ${money(change)}`}
              </p>
            )}
          </div>
        )}

        <button
          onClick={pay}
          disabled={!canPay || paying}
          className="mt-4 w-full rounded bg-green-600 py-3 text-lg font-bold text-white disabled:opacity-40"
        >
          {paying ? "Processing..." : `Pay ${money(totals.total)}`}
        </button>
        {cart.length > 0 && (
          <button
            onClick={() => { setCart([]); setDiscountValue(""); setReceived(""); }}
            className="mt-2 w-full text-sm text-gray-500"
          >
            Clear Cart
          </button>
        )}
      </aside>

      {receipt && <Receipt order={receipt} onClose={() => setReceipt(null)} />}
    </main>
  );
}