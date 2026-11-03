"use client";

import { money } from "@/lib/money";
import type { Order } from "@/types";

export default function Receipt({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
        {/* Receipt Content */}
        <div id="receipt" className="font-mono text-sm">
          <h2 className="text-center text-lg font-bold">POS System</h2>
          <p className="text-center text-xs">វិក្កយបត្រ / Receipt</p>
          <hr className="my-2 border-dashed" />

          <p>No: {order.orderNumber}</p>
          <p>Date: {new Date(order.createdAt).toLocaleString()}</p>
          <p>Cashier: {order.cashierEmail}</p>
          <hr className="my-2 border-dashed" />

          {order.items.map((i) => (
            <div key={i.productId} className="mb-1">
              <div>{i.productName}</div>
              <div className="flex justify-between text-gray-600">
                <span>{i.quantity} × {money(i.unitPrice)}</span>
                <span>{money(i.lineTotal)}</span>
              </div>
            </div>
          ))}
          <hr className="my-2 border-dashed" />

          <Row label="Subtotal" value={money(order.subtotal)} />
          {order.discountAmount > 0 && (
            <Row label="Discount" value={`-${money(order.discountAmount)}`} />
          )}
          <Row label={`VAT (${order.taxRate}%)`} value={money(order.taxAmount)} />
          <div className="mt-1 flex justify-between text-base font-bold">
            <span>TOTAL</span>
            <span>{money(order.total)}</span>
          </div>
          <hr className="my-2 border-dashed" />

          <Row label={`Paid (${order.paymentMethod})`} value={money(order.amountPaid)} />
          <Row label="Change" value={money(order.changeAmount)} />

          <p className="mt-4 text-center">Thank you!</p>
        </div>

        <div className="mt-5 flex gap-2 print:hidden">
          <button onClick={() => window.print()} className="flex-1 rounded bg-blue-600 py-2 font-semibold text-white">
            🖨 Print
          </button>
          <button onClick={onClose} className="flex-1 rounded border py-2">
            Continue Selling
          </button>
        </div>
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