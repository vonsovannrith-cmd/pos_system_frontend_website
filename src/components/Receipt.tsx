"use client";

import type { ReactNode } from "react";
import { money } from "@/lib/money";
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
  closeLabel = "Continue Sales",
  extra,
}: Props) {
  const settings = useSettings();
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
        <div id="receipt" className="font-mono text-sm">
          <h2 className="text-center text-lg font-bold">
            {settings?.storeName ?? "POS System"}
          </h2>
          {settings?.address && (
            <p className="text-center text-xs">{settings.address}</p>
          )}
          {settings?.phone && (
            <p className="text-center text-xs">Tel: {settings.phone}</p>
          )}
          <p className="text-center text-xs">Receipt</p>

          {order.status !== "COMPLETED" && (
            <div className="my-2 border-2 border-red-600 p-1 text-center font-bold text-red-600">
              *** {order.status} ***
              {order.cancelReason && (
                <div className="text-xs font-normal">{order.cancelReason}</div>
              )}
            </div>
          )}

          <hr className="my-2 border-dashed" />

          <p>No: {order.orderNumber}</p>
          <p>Date: {new Date(order.createdAt).toLocaleString()}</p>
          <p>Cashier: {order.cashierEmail}</p>
          <hr className="my-2 border-dashed" />

          {order.items.map((i) => (
            <div key={i.productId} className="mb-1">
              <div>{i.productName}</div>
              <div className="flex justify-between text-gray-600">
                <span>
                  {i.quantity} × {money(i.unitPrice)}
                </span>
                <span>{money(i.lineTotal)}</span>
              </div>
            </div>
          ))}
          <hr className="my-2 border-dashed" />

          <Row label="Subtotal" value={money(order.subtotal)} />
          {order.discountAmount > 0 && (
            <Row label="Discount" value={`-${money(order.discountAmount)}`} />
          )}
          <Row
            label={`VAT (${order.taxRate}%)`}
            value={money(order.taxAmount)}
          />
          <div className="mt-1 flex justify-between text-base font-bold">
            <span>TOTAL</span>
            <span>{money(order.total)}</span>
          </div>
          <hr className="my-2 border-dashed" />

          <Row
            label={`Paid (${order.paymentMethod})`}
            value={money(order.amountPaid)}
          />
          <Row label="Change" value={money(order.changeAmount)} />

          <p className="mt-4 text-center">Thank you!</p>
        </div>

        <div className="mt-5 flex gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex-1 rounded bg-blue-600 py-2 font-semibold text-white"
          >
            🖨 Print
          </button>
          <button onClick={onClose} className="flex-1 rounded border py-2">
            {closeLabel}
          </button>
        </div>

        {extra}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}