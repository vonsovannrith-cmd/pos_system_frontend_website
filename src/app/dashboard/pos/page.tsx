"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { money, round2 } from "@/lib/money";
import Receipt from "@/components/Receipt";
import type { Category, Order, PageResponse, Product } from "@/types";
import { useSettings } from "@/lib/useSettings";

type CartLine = {
  product: Product;
  quantity: number;
};

type Method = "CASH" | "KHQR" | "CARD";

type DiscountType = "PERCENT" | "AMOUNT";

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1 text-sm transition ${
    active
      ? "border-blue-600 bg-blue-600 text-white"
      : "bg-white hover:border-blue-500"
  }`;

const inputClass = "w-full rounded border p-2 text-sm";

export default function PosPage() {
  const settings = useSettings();
  const taxRate = Number(settings?.taxRate ?? 0);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [cart, setCart] = useState<CartLine[]>([]);

  const [discountType, setDiscountType] =
    useState<DiscountType>("PERCENT");
  const [discountValue, setDiscountValue] = useState("");

  const [method, setMethod] = useState<Method>("CASH");
  const [received, setReceived] = useState("");

  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<Order | null>(null);

  // ---------- Search Debounce ----------

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(keyword.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [keyword]);

  // ---------- Load Categories ----------

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      setLoadingCategories(true);

      try {
        const data = await apiFetch<Category[]>("/api/categories");

        if (!cancelled) {
          setCategories(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load categories",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingCategories(false);
        }
      }
    }

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- Load Products ----------

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);

    try {
      const params = new URLSearchParams({
        page: "0",
        size: "60",
        sort: "name,asc",
        activeOnly: "true",
      });

      if (search) {
        params.set("keyword", search);
      }

      if (categoryId) {
        params.set("categoryId", categoryId);
      }

      const result = await apiFetch<PageResponse<Product>>(
        `/api/products?${params.toString()}`,
      );

      setProducts(result.content);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load products",
      );
    } finally {
      setLoadingProducts(false);
    }
  }, [search, categoryId]);

  useEffect(() => {
    let cancelled = false;

    async function fetchProducts() {
      setLoadingProducts(true);

      try {
        const params = new URLSearchParams({
          page: "0",
          size: "60",
          sort: "name,asc",
          activeOnly: "true",
        });

        if (search) params.set("keyword", search);
        if (categoryId) params.set("categoryId", categoryId);

        const result = await apiFetch<PageResponse<Product>>(
          `/api/products?${params.toString()}`,
        );

        if (!cancelled) {
          setProducts(result.content);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load products",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingProducts(false);
        }
      }
    }

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, [search, categoryId]);

  // ---------- Shopping Cart ----------

  function addToCart(product: Product) {
    setError("");

    if (product.stockQuantity < 1) {
      setError("This product is out of stock");
      return;
    }

    setCart((previous) => {
      const existing = previous.find(
        (line) => line.product.id === product.id,
      );

      if (existing) {
        if (existing.quantity >= product.stockQuantity) {
          return previous;
        }

        return previous.map((line) =>
          line.product.id === product.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }

      return [...previous, { product, quantity: 1 }];
    });
  }

  function changeQty(id: number, delta: number) {
    setCart((previous) =>
      previous.flatMap((line) => {
        if (line.product.id !== id) {
          return [line];
        }

        const quantity = line.quantity + delta;

        if (quantity <= 0) {
          return [];
        }

        if (quantity > line.product.stockQuantity) {
          return [line];
        }

        return [{ ...line, quantity }];
      }),
    );
  }

  function clearCart() {
    setCart([]);
    setDiscountValue("");
    setReceived("");
    setError("");
  }

  // ---------- Barcode Search ----------

  async function onSearchKey(
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key !== "Enter" || !keyword.trim()) return;

    e.preventDefault();
    setError("");

    try {
      const params = new URLSearchParams({
        page: "0",
        size: "60",
        activeOnly: "true",
        keyword: keyword.trim(),
      });

      const result = await apiFetch<PageResponse<Product>>(
        `/api/products?${params.toString()}`,
      );

      if (result.content.length === 1) {
        addToCart(result.content[0]);
        setKeyword("");
      } else if (result.content.length === 0) {
        setError("Product not found");
      } else {
        setError("Multiple products found. Please select from the list below.");
        setProducts(result.content);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error searching product",
      );
    }
  }

  // ---------- Calculate Totals ----------

  const dv = discountValue.trim() === "" ? 0 : Number(discountValue);

  const totals = useMemo(() => {
    const subtotal = round2(
      cart.reduce(
        (sum, line) =>
          sum + Number(line.product.price) * line.quantity,
        0,
      ),
    );

    const discount =
      discountType === "PERCENT"
        ? round2((subtotal * dv) / 100)
        : round2(dv);

    const taxable = Math.max(0, round2(subtotal - discount));

    const tax = round2((taxable * taxRate) / 100);

    const total = round2(taxable + tax);

    return {
      subtotal,
      discount,
      taxable,
      tax,
      total,
    };
  }, [cart, discountType, dv, taxRate]);

  const invalidDiscount =
    !Number.isFinite(dv) ||
    dv < 0 ||
    totals.discount > totals.subtotal ||
    (discountType === "PERCENT" && dv > 100);

  const receivedNum =
    received.trim() === "" ? 0 : Number(received);

  const validReceived =
    Number.isFinite(receivedNum) && receivedNum >= 0;

  const change =
    method === "CASH" && validReceived
      ? round2(receivedNum - totals.total)
      : 0;

  const canPay =
    settings !== null &&
    settings !== undefined &&
    Number.isFinite(taxRate) &&
    taxRate >= 0 &&
    taxRate <= 100 &&
    cart.length > 0 &&
    !invalidDiscount &&
    validReceived &&
    (method !== "CASH" || receivedNum >= totals.total);

  // ---------- Payment ----------

  async function pay() {
    if (paying || !canPay) return;

    setPaying(true);
    setError("");

    try {
      const order = await apiFetch<Order>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          items: cart.map((line) => ({
            productId: line.product.id,
            quantity: line.quantity,
          })),

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

      await loadProducts();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Payment was not successful",
      );

      await loadProducts();
    } finally {
      setPaying(false);
    }
  }

  // ---------- UI ----------

  return (
    <main className="grid gap-4 p-4 lg:grid-cols-3">

      {/* LEFT: PRODUCTS */}

      <section className="lg:col-span-2">

        <input
          autoFocus
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={onSearchKey}
          placeholder="Search or scan Barcode (Enter)"
          className="mb-3 w-full rounded border p-3"
        />

        {/* Categories */}

        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoryId("")}
            className={chip(categoryId === "")}
          >
            All Categories
          </button>

          {categories.map((category) => (
            <button
              type="button"
              key={category.id}
              onClick={() => setCategoryId(String(category.id))}
              className={chip(
                categoryId === String(category.id),
              )}
            >
              {category.name}
            </button>
          ))}
        </div>

        {loadingCategories && (
          <p className="mb-3 text-sm text-gray-500">
            Loading categories...
          </p>
        )}

        {/* Product List */}

        {loadingProducts ? (
          <p className="py-8 text-center text-gray-500">
            Loading products...
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const out = product.stockQuantity < 1;

              return (
                <button
                  type="button"
                  key={product.id}
                  disabled={out}
                  onClick={() => addToCart(product)}
                  className="rounded-xl border bg-white p-3 text-left shadow-sm transition hover:border-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <div className="font-semibold">
                    {product.name}
                  </div>

                  <div className="text-blue-600">
                    {money(product.price)}
                  </div>

                  <div
                    className={`text-xs ${
                      product.lowStock
                        ? "text-red-600"
                        : "text-gray-500"
                    }`}
                  >
                    {out
                      ? "Out of Stock"
                      : `Stock: ${product.stockQuantity}`}
                  </div>
                </button>
              );
            })}

            {products.length === 0 && (
              <p className="col-span-full py-6 text-center text-gray-500">
                No products available
              </p>
            )}
          </div>
        )}
      </section>

      {/* RIGHT: SHOPPING CART */}

      <aside className="h-fit rounded-xl bg-white p-4 shadow lg:sticky lg:top-4">

        <h2 className="mb-3 text-lg font-bold">
          Shopping Cart
        </h2>

        {error && (
          <div
            role="alert"
            className="mb-3 rounded bg-red-100 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Cart Items */}

        <ul className="mb-3 max-h-64 divide-y overflow-y-auto">
          {cart.map((line) => (
            <li
              key={line.product.id}
              className="flex items-center gap-2 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">
                  {line.product.name}
                </div>

                <div className="text-gray-500">
                  {money(line.product.price)}
                </div>
              </div>

              <button
                type="button"
                aria-label={`Decrease ${line.product.name}`}
                onClick={() =>
                  changeQty(line.product.id, -1)
                }
                className="h-7 w-7 rounded border"
              >
                −
              </button>

              <span className="w-6 text-center">
                {line.quantity}
              </span>

              <button
                type="button"
                aria-label={`Increase ${line.product.name}`}
                disabled={
                  line.quantity >= line.product.stockQuantity
                }
                onClick={() =>
                  changeQty(line.product.id, 1)
                }
                className="h-7 w-7 rounded border disabled:opacity-40"
              >
                +
              </button>

              <div className="w-20 text-right">
                {money(
                  round2(
                    Number(line.product.price) * line.quantity,
                  ),
                )}
              </div>
            </li>
          ))}

          {cart.length === 0 && (
            <li className="py-6 text-center text-gray-400">
              Shopping Cart is empty
            </li>
          )}
        </ul>

        {/* Discount */}

        <div className="mb-3 flex gap-2">
          <select
            value={discountType}
            onChange={(e) =>
              setDiscountType(e.target.value as DiscountType)
            }
            className="rounded border p-2 text-sm"
          >
            <option value="PERCENT">Discount %</option>
            <option value="AMOUNT">Discount $</option>
          </select>

          <input
            type="number"
            min="0"
            step="0.01"
            value={discountValue}
            onChange={(e) =>
              setDiscountValue(e.target.value)
            }
            placeholder="0"
            className={inputClass}
          />
        </div>

        {invalidDiscount && (
          <p className="mb-2 text-xs text-red-600">
            Invalid discount value. Please check the discount amount.
          </p>
        )}

        {/* Totals */}

        <div className="space-y-2 border-t pt-3 text-sm">

          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{money(totals.subtotal)}</span>
          </div>

          <div className="flex justify-between">
            <span>Discount</span>
            <span>-{money(totals.discount)}</span>
          </div>

          <div className="flex justify-between">
            <span>VAT ({taxRate}%)</span>
            <span>{money(totals.tax)}</span>
          </div>

          <div className="flex justify-between border-t pt-2 text-xl font-bold">
            <span>Total</span>
            <span>{money(totals.total)}</span>
          </div>
        </div>

        {/* Payment Method */}

        <div className="mt-4 grid grid-cols-3 gap-2">
          {(["CASH", "KHQR", "CARD"] as Method[]).map(
            (paymentMethod) => (
              <button
                type="button"
                key={paymentMethod}
                onClick={() => setMethod(paymentMethod)}
                className={`rounded border py-2 text-sm font-semibold ${
                  method === paymentMethod
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "hover:bg-gray-50"
                }`}
              >
                {paymentMethod}
              </button>
            ),
          )}
        </div>

        {/* Cash Payment */}

        {method === "CASH" && (
          <div className="mt-3">
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={received}
                onChange={(e) =>
                  setReceived(e.target.value)
                }
                placeholder="Amount Received ($)"
                className={inputClass}
              />

              <button
                type="button"
                onClick={() =>
                  setReceived(String(totals.total))
                }
                className="whitespace-nowrap rounded border px-3 text-sm"
              >
                Exact
              </button>
            </div>

            {received !== "" && validReceived && (
              <p
                className={`mt-2 text-sm ${
                  change < 0
                    ? "text-red-600"
                    : "text-green-700"
                }`}
              >
                {change < 0
                  ? `Shortage: ${money(-change)}`
                  : `Change: ${money(change)}`}
              </p>
            )}
          </div>
        )}

        {/* Pay Button */}

        <button
          type="button"
          onClick={pay}
          disabled={!canPay || paying}
          className="mt-4 w-full rounded bg-green-600 py-3 text-lg font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {paying
            ? "Processing..."
            : `Pay ${money(totals.total)}`}
        </button>

        {/* Clear Cart */}

        {cart.length > 0 && (
          <button
            type="button"
            disabled={paying}
            onClick={clearCart}
            className="mt-2 w-full py-2 text-sm text-gray-500 hover:text-red-600 disabled:opacity-40"
          >
            Clear Cart
          </button>
        )}
      </aside>

      {/* Receipt */}

      {receipt && (
        <Receipt
          order={receipt}
          onClose={() => setReceipt(null)}
        />
      )}
    </main>
  );
}