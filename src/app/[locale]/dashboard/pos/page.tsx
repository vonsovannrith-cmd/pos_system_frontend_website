
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { apiFetch } from "@/lib/api";
import { imageSrc } from "@/lib/image";
import { money, riel, round2 } from "@/lib/money";
import { useSettings } from "@/lib/useSettings";

import ProductThumb from "@/components/ProductThumb";
import Receipt from "@/components/Receipt";

import type {
  Category,
  HeldCart,
  HeldCartSummary,
  Order,
  PageResponse,
  Product,
} from "@/types";

type CartLine = {
  product: Product;
  quantity: number;
};

type Method = "CASH" | "KHQR" | "CARD";
type Currency = "USD" | "KHR";

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1 text-sm ${
    active ? "bg-blue-600 text-white" : "bg-white"
  }`;

export default function PosPage() {
  const t = useTranslations("pos");
  const tc = useTranslations("common");
  const locale = useLocale();

  const settings = useSettings();

  const taxRate = settings?.taxRate ?? 0;
  const rate = settings?.usdToKhr ?? 0;

  // ---------- Payment Method Translation ----------

  const paymentMethodLabels: Record<Method, string> = {
    CASH: t("paymentMethods.CASH"),
    KHQR: t("paymentMethods.KHQR"),
    CARD: t("paymentMethods.CARD"),
  };

  // ---------- Product States ----------

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");

  // ---------- Cart States ----------

  const [cart, setCart] = useState<CartLine[]>([]);

  const [discountType, setDiscountType] = useState<
    "PERCENT" | "AMOUNT"
  >("PERCENT");

  const [discountValue, setDiscountValue] = useState("");

  // ---------- Payment States ----------

  const [method, setMethod] = useState<Method>("CASH");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [received, setReceived] = useState("");

  // ---------- UI States ----------

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<Order | null>(null);

  // ---------- Held Cart States ----------

  const [held, setHeld] = useState<HeldCartSummary[]>([]);
  const [showHeld, setShowHeld] = useState(false);

  // ---------- Debounce Product Search ----------

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(keyword);
    }, 400);

    return () => clearTimeout(timer);
  }, [keyword]);

  // ---------- Load Categories ----------

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const result = await apiFetch<Category[]>("/api/categories");

        if (!cancelled) {
          setCategories(result);
        }
      } catch {
        // Category loading is optional.
      }
    }

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- Load Products ----------

  const loadProducts = useCallback(async () => {
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
        `/api/products?${params.toString()}`
      );

      setProducts(result.content);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t("genericError")
      );
    }
  }, [search, categoryId, t]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // ---------- Load Held Carts ----------

  const loadHeld = useCallback(async () => {
    try {
      const result = await apiFetch<HeldCartSummary[]>(
        "/api/held-carts"
      );

      setHeld(result);
    } catch {
      // Held carts are optional.
    }
  }, []);

  useEffect(() => {
    loadHeld();
  }, [loadHeld]);

  // ---------- Add Product To Cart ----------

  function addToCart(product: Product) {
    setError("");

    setCart((previous) => {
      const line = previous.find(
        (item) => item.product.id === product.id
      );

      if (line) {
        if (line.quantity >= product.stockQuantity) {
          return previous;
        }

        return previous.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      if (product.stockQuantity < 1) {
        return previous;
      }

      return [
        ...previous,
        {
          product,
          quantity: 1,
        },
      ];
    });
  }

  // ---------- Change Cart Quantity ----------

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

        return [
          {
            ...line,
            quantity,
          },
        ];
      })
    );
  }

  // ---------- Clear Cart ----------

  function clearCart() {
    setCart([]);
    setDiscountValue("");
    setReceived("");
    setNotice("");
  }

  // ---------- Search Product By Enter ----------

  async function onSearchKey(
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (e.key !== "Enter" || !keyword.trim()) {
      return;
    }

    try {
      const result = await apiFetch<PageResponse<Product>>(
        `/api/products?activeOnly=true&keyword=${encodeURIComponent(
          keyword.trim()
        )}`
      );

      if (result.content.length === 1) {
        addToCart(result.content[0]);
        setKeyword("");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("genericError")
      );
    }
  }

  // ---------- Hold Cart ----------

  async function holdCart() {
    if (cart.length === 0) {
      return;
    }

    const label = window.prompt(t("holdLabelPrompt"));

    if (label === null) {
      return;
    }

    try {
      await apiFetch("/api/held-carts", {
        method: "POST",
        body: JSON.stringify({
          label: label.trim() || null,
          items: cart.map((line) => ({
            productId: line.product.id,
            quantity: line.quantity,
          })),
        }),
      });

      clearCart();
      loadHeld();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t("genericError")
      );
    }
  }

  // ---------- Resume Held Cart ----------

  async function resume(heldCart: HeldCartSummary) {
    try {
      const data = await apiFetch<HeldCart>(
        `/api/held-carts/${heldCart.id}/resume`,
        {
          method: "POST",
        }
      );

      const lines: CartLine[] = [];
      const notes: string[] = [];

      for (const item of data.items) {
        const product = item.product;

        if (!product.active) {
          notes.push(
            t("noteInactive", {
              name: product.name,
            })
          );

          continue;
        }

        if (product.stockQuantity < 1) {
          notes.push(
            t("noteOutOfStock", {
              name: product.name,
            })
          );

          continue;
        }

        const quantity = Math.min(
          item.quantity,
          product.stockQuantity
        );

        if (quantity < item.quantity) {
          notes.push(
            t("noteReduced", {
              name: product.name,
              stock: String(product.stockQuantity),
              wanted: String(item.quantity),
            })
          );
        }

        lines.push({
          product,
          quantity,
        });
      }

      setCart(lines);
      setNotice(notes.join(" • "));
      setError("");
      setShowHeld(false);

      loadHeld();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t("genericError")
      );

      loadHeld();
    }
  }

  // ---------- Discard Held Cart ----------

  async function discardHeld(heldCart: HeldCartSummary) {
    const time = new Date(
      heldCart.createdAt
    ).toLocaleTimeString(
      locale === "km" ? "km-KH" : "en-US"
    );

    const name = heldCart.label ?? time;

    if (
      !window.confirm(
        t("discardConfirm", {
          name,
        })
      )
    ) {
      return;
    }

    try {
      await apiFetch(`/api/held-carts/${heldCart.id}`, {
        method: "DELETE",
      });

      loadHeld();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t("genericError")
      );

      loadHeld();
    }
  }

  // ---------- Calculate Totals ----------

  const dv = Number(discountValue) || 0;

  const totals = useMemo(() => {
    const subtotal = round2(
      cart.reduce(
        (sum, line) =>
          sum + line.product.price * line.quantity,
        0
      )
    );

    const discount =
      discountType === "PERCENT"
        ? round2((subtotal * dv) / 100)
        : round2(dv);

    const taxable = Math.max(
      0,
      round2(subtotal - discount)
    );

    const tax = round2(
      (taxable * taxRate) / 100
    );

    const total = round2(taxable + tax);

    return {
      subtotal,
      discount,
      tax,
      total,
    };
  }, [cart, discountType, dv, taxRate]);

  // ---------- Calculate KHR Total ----------

  const totalKhr =
    rate > 0
      ? Math.round(
          (Math.round(totals.total * 100) * rate) /
            10000
        ) * 100
      : 0;

  const khrMode =
    method === "CASH" && currency === "KHR";

  const due = khrMode
    ? totalKhr
    : totals.total;

  const fmt = (number: number) =>
    khrMode ? riel(number) : money(number);

  // ---------- Validate Discount ----------

  const invalidDiscount =
    totals.discount > totals.subtotal ||
    (discountType === "PERCENT" && dv > 100);

  // ---------- Calculate Received / Change ----------

  const receivedNum = Number(received) || 0;

  const change =
    method === "CASH"
      ? round2(receivedNum - due)
      : 0;

  // ---------- Can Pay ----------

  const canPay =
    settings !== null &&
    cart.length > 0 &&
    !invalidDiscount &&
    (method !== "CASH" || receivedNum >= due);

  // ---------- Choose Payment Method ----------

  function chooseMethod(paymentMethod: Method) {
    setMethod(paymentMethod);

    if (paymentMethod !== "CASH") {
      setCurrency("USD");
    }

    setReceived("");
  }

  // ---------- Choose Currency ----------

  function chooseCurrency(selectedCurrency: Currency) {
    setCurrency(selectedCurrency);
    setReceived("");
  }

  // ---------- Checkout / Payment ----------

  async function pay() {
    if (!canPay || paying) {
      return;
    }

    setPaying(true);
    setError("");

    try {
      const order = await apiFetch<Order>(
        "/api/orders",
        {
          method: "POST",
          body: JSON.stringify({
            items: cart.map((line) => ({
              productId: line.product.id,
              quantity: line.quantity,
            })),

            discountType:
              dv > 0 ? discountType : null,

            discountValue:
              dv > 0 ? dv : null,

            paymentMethod: method,

            paymentCurrency:
              method === "CASH"
                ? currency
                : "USD",

            amountPaid:
              method === "CASH"
                ? receivedNum
                : null,
          }),
        }
      );

      setReceipt(order);

      clearCart();

      loadProducts();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t("genericError")
      );

      loadProducts();
    } finally {
      setPaying(false);
    }
  }

  // ---------- UI ----------

  return (
    <main className="grid gap-4 p-4 lg:grid-cols-3">

      {/* ===== Left: Products ===== */}

      <section className="lg:col-span-2">

        <input
          autoFocus
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={onSearchKey}
          placeholder={t("searchPlaceholder")}
          className="mb-3 w-full rounded border p-2"
        />

        {/* Categories */}

        <div className="mb-3 flex flex-wrap gap-2">

          <button
            type="button"
            onClick={() => setCategoryId("")}
            className={chip(categoryId === "")}
          >
            {tc("all")}
          </button>

          {categories.map((category) => (
            <button
              type="button"
              key={category.id}
              onClick={() =>
                setCategoryId(String(category.id))
              }
              className={chip(
                categoryId === String(category.id)
              )}
            >
              {category.name}
            </button>
          ))}

        </div>

        {/* Products */}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">

          {products.map((product) => {
            const out = product.stockQuantity < 1;

            return (
              <button
                type="button"
                key={product.id}
                disabled={out}
                onClick={() => addToCart(product)}
                className="overflow-hidden rounded-xl border bg-white text-left shadow-sm hover:border-blue-500 disabled:opacity-40"
              >
                <ProductThumb
                  src={imageSrc(product.imageUrl)}
                  alt={product.name}
                  className="h-24 w-full"
                />

                <div className="p-3">

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
                      ? t("outOfStock")
                      : t("stock", {
                          count: String(
                            product.stockQuantity
                          ),
                        })}
                  </div>

                </div>
              </button>
            );
          })}

          {products.length === 0 && (
            <p className="col-span-full text-gray-500">
              {t("noProducts")}
            </p>
          )}

        </div>
      </section>

      {/* ===== Right: Cart ===== */}

      <aside className="h-fit rounded-xl bg-white p-4 shadow lg:sticky lg:top-4">

        <div className="mb-3 flex items-center justify-between">

          <h2 className="text-lg font-bold">
            {t("cart")}
          </h2>

          <button
            type="button"
            onClick={() => setShowHeld(true)}
            className="rounded border px-3 py-1 text-sm"
          >
            {t("heldButton", {
              count: String(held.length),
            })}
          </button>

        </div>

        {/* Error */}

        {error && (
          <div className="mb-3 rounded bg-red-100 p-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Resume Notice */}

        {notice && (
          <div className="mb-3 rounded bg-yellow-100 p-2 text-sm text-yellow-800">
            {t("resumeNotice", {
              notes: notice,
            })}
          </div>
        )}

        {/* Cart Items */}

        <ul className="mb-3 max-h-64 divide-y overflow-y-auto">

          {cart.map((line) => (
            <li
              key={line.product.id}
              className="flex items-center gap-2 py-2 text-sm"
            >

              <div className="flex-1">

                <div>
                  {line.product.name}
                </div>

                <div className="text-gray-500">
                  {money(line.product.price)}
                </div>

              </div>

              <button
                type="button"
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
                onClick={() =>
                  changeQty(line.product.id, 1)
                }
                className="h-7 w-7 rounded border"
              >
                +
              </button>

              <div className="w-20 text-right">
                {money(
                  round2(
                    line.product.price * line.quantity
                  )
                )}
              </div>

            </li>
          ))}

          {cart.length === 0 && (
            <li className="py-6 text-center text-gray-400">
              {t("emptyCart")}
            </li>
          )}

        </ul>

        {/* Discount */}

        <div className="mb-3 flex gap-2">

          <select
            value={discountType}
            onChange={(e) =>
              setDiscountType(
                e.target.value as "PERCENT" | "AMOUNT"
              )
            }
            className="rounded border p-2 text-sm"
          >
            <option value="PERCENT">
              {t("discountPercent")}
            </option>

            <option value="AMOUNT">
              {t("discountAmount")}
            </option>
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
            className="w-full rounded border p-2 text-sm"
          />

        </div>

        {invalidDiscount && (
          <p className="mb-2 text-xs text-red-600">
            {t("invalidDiscount")}
          </p>
        )}

        {/* Totals */}

        <div className="space-y-1 border-t pt-3 text-sm">

          <div className="flex justify-between">
            <span>{t("subtotal")}</span>
            <span>{money(totals.subtotal)}</span>
          </div>

          <div className="flex justify-between">
            <span>{t("discount")}</span>
            <span>-{money(totals.discount)}</span>
          </div>

          <div className="flex justify-between">
            <span>
              {t("vat", {
                rate: String(taxRate),
              })}
            </span>
            <span>{money(totals.tax)}</span>
          </div>

          <div className="flex justify-between text-xl font-bold">
            <span>{t("total")}</span>
            <span>{money(totals.total)}</span>
          </div>

          {rate > 0 && (
            <div className="flex justify-between text-gray-500">

              <span>
                {t("approxKhr", {
                  rate: rate.toLocaleString("en-US"),
                })}
              </span>

              <span>{riel(totalKhr)}</span>

            </div>
          )}

        </div>

        {/* Payment Methods */}

        <div className="mt-4 grid grid-cols-3 gap-2">

          {(["CASH", "KHQR", "CARD"] as Method[]).map(
            (paymentMethod) => (
              <button
                type="button"
                key={paymentMethod}
                onClick={() =>
                  chooseMethod(paymentMethod)
                }
                className={`rounded border py-2 text-sm font-semibold ${
                  method === paymentMethod
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : ""
                }`}
              >
                {paymentMethodLabels[paymentMethod]}
              </button>
            )
          )}

        </div>

        {/* Cash Payment */}

        {method === "CASH" && (
          <div className="mt-3">

            {/* Currency */}

            <div className="mb-2 flex gap-2">

              {(["USD", "KHR"] as Currency[]).map(
                (selectedCurrency) => (
                  <button
                    type="button"
                    key={selectedCurrency}
                    onClick={() =>
                      chooseCurrency(selectedCurrency)
                    }
                    disabled={
                      selectedCurrency === "KHR" &&
                      rate <= 0
                    }
                    className={`flex-1 rounded border py-1 text-sm ${
                      currency === selectedCurrency
                        ? "border-green-600 bg-green-50 font-semibold text-green-700"
                        : ""
                    } disabled:opacity-40`}
                  >
                    {selectedCurrency === "USD"
                      ? t("currencyUsd")
                      : t("currencyKhr")}
                  </button>
                )
              )}

            </div>

            {/* Received Amount */}

            <div className="flex gap-2">

              <input
                type="number"
                min="0"
                step={khrMode ? "100" : "0.01"}
                value={received}
                onChange={(e) =>
                  setReceived(e.target.value)
                }
                placeholder={
                  khrMode
                    ? t("receivedKhr")
                    : t("receivedUsd")
                }
                className="w-full rounded border p-2"
              />

              <button
                type="button"
                onClick={() =>
                  setReceived(String(due))
                }
                className="whitespace-nowrap rounded border px-3 text-sm"
              >
                {t("exact")}
              </button>

            </div>

            {/* KHR Payment Note */}

            {khrMode && cart.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                {t("mustPay", {
                  amount: riel(totalKhr),
                })}
              </p>
            )}

            {/* Change */}

            {receivedNum > 0 && (
              <p
                className={`mt-1 text-sm ${
                  change < 0
                    ? "text-red-600"
                    : "text-green-700"
                }`}
              >
                {change < 0
                  ? t("shortBy", {
                      amount: fmt(-change),
                    })
                  : t("changeDue", {
                      amount: fmt(change),
                    })}
              </p>
            )}

          </div>
        )}

        {/* Pay Button */}

        <button
          type="button"
          onClick={pay}
          disabled={!canPay || paying}
          className="mt-4 w-full rounded bg-green-600 py-3 text-lg font-bold text-white disabled:opacity-40"
        >
          {paying
            ? t("processing")
            : t("pay", {
                amount: khrMode
                  ? riel(totalKhr)
                  : money(totals.total),
              })}
        </button>

        {/* Hold / Clear Buttons */}

        {cart.length > 0 && (
          <div className="mt-2 flex gap-2">

            <button
              type="button"
              onClick={holdCart}
              className="flex-1 rounded border py-2 text-sm text-orange-700"
            >
              {t("hold")}
            </button>

            <button
              type="button"
              onClick={clearCart}
              className="flex-1 rounded border py-2 text-sm text-gray-500"
            >
              {t("clear")}
            </button>

          </div>
        )}

      </aside>

      {/* ===== Held Cart Modal ===== */}

      {showHeld && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">

          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-lg">

            <h2 className="mb-3 text-lg font-bold">
              {t("heldTitle")}
            </h2>

            {cart.length > 0 && (
              <p className="mb-3 rounded bg-yellow-50 p-2 text-sm text-yellow-800">
                {t("heldCartNotEmpty")}
              </p>
            )}

            <ul className="divide-y">

              {held.map((heldCart) => {
                const time = new Date(
                  heldCart.createdAt
                ).toLocaleTimeString(
                  locale === "km" ? "km-KH" : "en-US"
                );

                return (
                  <li
                    key={heldCart.id}
                    className="flex items-center justify-between gap-2 py-3 text-sm"
                  >

                    <div>

                      <div className="font-semibold">
                        {heldCart.label ??
                          t("heldDefaultLabel", {
                            time,
                          })}
                      </div>

                      <div className="text-gray-500">
                        {t("heldMeta", {
                          items: String(heldCart.itemCount),
                          units: String(heldCart.totalQuantity),
                          time,
                        })}
                      </div>

                    </div>

                    <div className="flex gap-2">

                      <button
                        type="button"
                        onClick={() => resume(heldCart)}
                        disabled={cart.length > 0}
                        className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-40"
                      >
                        {t("resume")}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          discardHeld(heldCart)
                        }
                        className="rounded border px-3 py-1 text-red-600"
                      >
                        {t("discard")}
                      </button>

                    </div>

                  </li>
                );
              })}

              {held.length === 0 && (
                <li className="py-6 text-center text-gray-400">
                  {t("noHeld")}
                </li>
              )}

            </ul>

            <button
              type="button"
              onClick={() => setShowHeld(false)}
              className="mt-4 w-full rounded border py-2"
            >
              {tc("close")}
            </button>

          </div>

        </div>
      )}

      {/* ===== Receipt Modal ===== */}

      {receipt && (
        <Receipt
          order={receipt}
          onClose={() => setReceipt(null)}
        />
      )}

    </main>
  );
}
