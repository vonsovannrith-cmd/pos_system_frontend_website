
"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";

import { money, riel } from "@/lib/money";
import type { Order } from "@/types";
import { useSettings } from "@/lib/useSettings";

type Props = {
  order: Order;
  onClose: () => void;
  closeLabel?: string;
  extra?: ReactNode;
};

export default function Receipt({
  order,
  onClose,
  closeLabel,
  extra,
}: Props) {
  const settings = useSettings();

  const t = useTranslations("receipt");
  const locale = useLocale();

  // ---------- Locale ----------

  const dateLocale = locale === "km" ? "km-KH" : "en-US";

  // ---------- Payment Method Translation ----------

  const paymentMethodLabels: Record<string, string> = {
    CASH: t("paymentMethods.CASH"),
    KHQR: t("paymentMethods.KHQR"),
    CARD: t("paymentMethods.CARD"),
  };

  const paymentMethod =
    paymentMethodLabels[order.paymentMethod] ??
    order.paymentMethod;

  // ---------- Order Status Translation ----------

  const statusLabels: Record<string, string> = {
    COMPLETED: t("statuses.COMPLETED"),
    VOIDED: t("statuses.VOIDED"),
    REFUNDED: t("statuses.REFUNDED"),
  };

  const status =
    statusLabels[order.status] ?? order.status;

  // ---------- Date Formatting ----------

  const orderDate = new Date(order.createdAt).toLocaleString(
    dateLocale
  );

  // ---------- Payment Currency ----------

  const isKhr = order.paymentCurrency === "KHR";

  const formatAmount = (amount: number) =>
    isKhr ? riel(amount) : money(amount);

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">

      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-xl bg-white p-6 shadow-lg">

        {/* ===== Receipt Content ===== */}

        <div id="receipt" className="font-mono text-sm">

          {/* Store Information */}

          <h2 className="text-center text-lg font-bold">
            {settings?.storeName ?? t("storeName")}
          </h2>

          {settings?.address && (
            <p className="text-center text-xs">
              {settings.address}
            </p>
          )}

          {settings?.phone && (
            <p className="text-center text-xs">
              {t("phone")}: {settings.phone}
            </p>
          )}

          <p className="text-center text-xs">
            {t("receiptTitle")}
          </p>

          {/* Order Status */}

          {order.status !== "COMPLETED" && (
            <div className="my-2 border-2 border-red-600 p-1 text-center font-bold text-red-600">

              *** {status} ***

              {order.cancelReason && (
                <div className="text-xs font-normal">
                  {order.cancelReason}
                </div>
              )}

            </div>
          )}

          <hr className="my-2 border-dashed" />

          {/* Order Information */}

          <p>
            {t("number")}: {order.orderNumber}
          </p>

          <p>
            {t("date")}: {orderDate}
          </p>

          <p>
            {t("cashier")}: {order.cashierEmail}
          </p>

          <hr className="my-2 border-dashed" />

          {/* Order Items */}

          {order.items.map((item, index) => (
            <div
              key={`${item.productId}-${index}`}
              className="mb-1"
            >

              <div>
                {item.productName}
              </div>

              <div className="flex justify-between text-gray-600">

                <span>
                  {item.quantity} × {money(item.unitPrice)}
                </span>

                <span>
                  {money(item.lineTotal)}
                </span>

              </div>

            </div>
          ))}

          <hr className="my-2 border-dashed" />

          {/* Subtotal */}

          <Row
            label={t("subtotal")}
            value={money(order.subtotal)}
          />

          {/* Discount */}

          {order.discountAmount > 0 && (
            <Row
              label={t("discount")}
              value={`-${money(order.discountAmount)}`}
            />
          )}

          {/* VAT */}

          <Row
            label={t("vat", {
              rate: String(order.taxRate),
            })}
            value={money(order.taxAmount)}
          />

          {/* Total */}

          <div className="mt-1 flex justify-between text-base font-bold">

            <span>
              {t("total")}
            </span>

            <span>
              {money(order.total)}
            </span>

          </div>

          {/* Approximate KHR */}

          {order.totalKhr !== null &&
            order.exchangeRate !== null && (
              <div className="flex justify-between text-gray-600">

                <span>
                  {t("approxKhr", {
                    rate: order.exchangeRate.toLocaleString(
                      dateLocale
                    ),
                  })}
                </span>

                <span>
                  {riel(order.totalKhr)}
                </span>

              </div>
            )}

          <hr className="my-2 border-dashed" />

          {/* Payment Information */}

          {isKhr ? (
            <>
              <Row
                label={t("paid", {
                  method: paymentMethod,
                  currency: "KHR",
                })}
                value={riel(order.amountPaid)}
              />

              <Row
                label={t("change")}
                value={riel(order.changeAmount)}
              />
            </>
          ) : (
            <>
              <Row
                label={t("paid", {
                  method: paymentMethod,
                  currency: "USD",
                })}
                value={money(order.amountPaid)}
              />

              <Row
                label={t("change")}
                value={money(order.changeAmount)}
              />
            </>
          )}

          <hr className="my-2 border-dashed" />

          {/* Thank You */}

          <p className="mt-4 text-center">
            {t("thankYou")}
          </p>

        </div>

        {/* ===== Buttons ===== */}

        <div className="mt-5 flex gap-2 print:hidden">

          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 rounded bg-blue-600 py-2 font-semibold text-white"
          >
            🖨 {t("print")}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded border py-2"
          >
            {closeLabel ?? t("continueSales")}
          </button>

        </div>

        {/* Extra Content */}

        {extra}

      </div>

    </div>
  );
}

// ---------- Reusable Row Component ----------

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
