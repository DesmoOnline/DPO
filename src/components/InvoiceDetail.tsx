import React from "react";
import { usePortal } from "../context/PortalContext";
import { Order } from "../types";
import { ArrowLeft, Printer, ShieldCheck, CreditCard, ChevronRight, Truck } from "lucide-react";

interface InvoiceDetailProps {
  orderId: string;
  onBack: () => void;
  onViewPackingSlip: (orderId: string) => void;
}

export const InvoiceDetail: React.FC<InvoiceDetailProps> = ({ orderId, onBack, onViewPackingSlip }) => {
  const { orders, isAdmin, updateOrderStatus } = usePortal();

  const order = orders.find(o => o.id === orderId);

  if (!order) {
    return (
      <div className="text-center py-16 bg-slate-900 rounded-xl border border-slate-800" id="invoice_not_found">
        <p className="text-slate-400 text-xs font-mono">Invoice reference could not be located in the database.</p>
        <button onClick={onBack} className="mt-4 bg-slate-800 text-slate-300 text-xs py-2 px-4 rounded border border-slate-700 hover:bg-slate-700 transition">
          Return
        </button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "paid": return "bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full";
      case "shipped": return "bg-blue-50 text-blue-705 border border-blue-200 rounded-full";
      case "cancelled": return "bg-red-50 text-red-655 border border-red-200 rounded-full";
      default: return "bg-amber-50 text-amber-700 border border-amber-250 rounded-full";
    }
  };

  const getStatusLabel = (status: Order["status"]) => {
    switch (status) {
      case "paid": return "Paid & Settled";
      case "shipped": return "Dispatched / Shipped";
      case "cancelled": return "Cancelled";
      default: return "Awaiting Bank Deposit";
    }
  };

  return (
    <div className="space-y-8" id="invoice_view_container">
      {/* Upper navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button 
          onClick={onBack}
          id="invoice_back_btn"
          className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition rounded-lg shadow-sm inline-flex items-center gap-1.5 font-mono"
        >
          <ArrowLeft className="w-4 h-4 text-slate-550" />
          Back to Invoices
        </button>

        <div className="flex items-center gap-3">
          <button
            id="view_pack_slip_btn"
            onClick={() => onViewPackingSlip(order.id)}
            className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition rounded-lg shadow-sm inline-flex items-center gap-1.5 font-mono"
          >
            <Truck className="w-4 h-4 text-blue-600" />
            View Packing Slip
          </button>
          
          <button
            id="print_invoice_btn"
            onClick={handlePrint}
            className="border border-slate-200 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition rounded-lg shadow-sm inline-flex items-center gap-1.5 font-mono"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            Print Invoice
          </button>
        </div>
      </div>

      {/* Invoice Area */}
      <div className="bg-white border border-slate-200 p-6 md:p-10 rounded-xl shadow-sm space-y-8 print:p-0 print:border-none print:shadow-none" id="printable_invoice_canvas">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">TAX INVOICE</h1>
            <div className="flex flex-wrap gap-2 items-center text-xs text-slate-500 font-mono font-semibold uppercase">
              <span>Invoice No: <strong className="text-slate-800 font-bold">{order.id}</strong></span>
              <span>•</span>
              <span>Issued: <strong className="text-slate-750 font-bold">{new Date(order.createdAt).toLocaleDateString('en-AU')}</strong></span>
            </div>
            <div className={`inline-flex px-3 py-1 font-mono font-semibold uppercase tracking-wider text-[10px] ${getStatusColor(order.status)}`}>
              {getStatusLabel(order.status)}
            </div>
          </div>

          <div className="text-left sm:text-right space-y-1 text-xs font-mono text-slate-600 font-semibold uppercase">
            <h2 className="font-bold text-slate-800 text-sm tracking-tight">Desmo Products Pty Ltd</h2>
            <p className="text-slate-500">ABN: 84 928 102 344</p>
            <p className="text-slate-500">18 Testing Rd, Perth</p>
            <p className="text-slate-500">Perth, WA, 6000</p>
            <p className="text-blue-600 font-bold">lew@desmoproducts.com.au</p>
          </div>
        </div>

        {/* Customer & Billing information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs border-b border-slate-200 pb-8 uppercase font-mono font-semibold">
          <div>
            <h3 className="text-slate-400 font-mono uppercase tracking-widest font-bold mb-2">Billed To (Customer):</h3>
            <div className="space-y-1 text-slate-700">
              <p className="text-sm font-bold text-slate-900">{order.companyName}</p>
              <p className="text-slate-500">Email: {order.customerEmail}</p>
              <p className="text-slate-500">Customer ID: {order.customerId}</p>
            </div>
          </div>

          <div>
            <h3 className="text-slate-400 font-mono uppercase tracking-widest font-bold mb-2">Payment Terms:</h3>
            <div className="space-y-1 text-slate-700">
              <p>Due Date: <strong className="text-slate-900">Net 14 Days</strong> from issue</p>
              <p>Payment Method: <strong className="text-slate-900">Direct Bank Deposit / Transfer</strong></p>
            </div>
          </div>
        </div>

        {/* Invoice Items Table */}
        <div className="space-y-4">
          <h3 className="text-slate-800 font-bold uppercase tracking-widest font-mono text-xs">Order Particulars:</h3>
          <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
            <table className="w-full text-left font-mono">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-mono font-semibold border-b border-slate-200 uppercase text-[10px]">
                  <th className="px-4 py-3">Equipment Details & SKU</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Wholesale Rate</th>
                  <th className="px-4 py-3 text-right">Volume Break</th>
                  <th className="px-4 py-3 text-right">Final Rate</th>
                  <th className="px-4 py-3 text-right font-bold">Total Line AUD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {order.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3.5">
                      <p className="text-slate-900 font-bold uppercase tracking-tight">{item.productName}</p>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase">{item.sku}</p>
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold">{item.qty}</td>
                    <td className="px-4 py-3.5 text-right">${item.originalPrice.toFixed(2)}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-600">
                      {item.appliedDiscountPercent > 0 ? `-${item.appliedDiscountPercent}%` : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold">${item.finalPricePerUnit.toFixed(2)}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-blue-600">${item.totalLineAmount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Box and Payment Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          {/* Bank Instructions */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3 text-xs leading-relaxed font-semibold uppercase">
            <h4 className="font-bold text-slate-800 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-blue-600" />
              Direct Deposit Instructions
            </h4>
            <div className="space-y-1 font-mono text-slate-750">
              <p>Bank: <strong className="text-slate-900 font-bold">National Australia Bank (NAB)</strong></p>
              <p>BSB Code: <strong className="text-slate-900 font-bold">082-124</strong></p>
              <p>Account No: <strong className="text-slate-900 font-bold">842-104-921</strong></p>
              <p>Account Name: <strong className="text-slate-900 font-bold">Desmo Products Wholesale</strong></p>
              <p>Payment Reference: <strong className="text-blue-650 font-bold">{order.id}</strong></p>
            </div>
            <p className="text-[10px] text-slate-400 italic font-mono pt-1 leading-normal font-medium">
              * PAYMENT REQUIRED WITHIN 14 DAYS. PLEASE EMAIL REMITTANCE ADVICE TO LEW@DESMOPRODUCTS.COM.AU.
            </p>
          </div>

          {/* Pricing Totals */}
          <div className="flex flex-col justify-end space-y-3.5 text-xs font-mono text-right md:pl-12 uppercase font-semibold text-slate-600">
            <div className="flex justify-between">
              <span>Wholesale Subtotal (ex. GST):</span>
              <span className="text-slate-900 font-bold">${order.subtotal.toFixed(2)} AUD</span>
            </div>
            <div className="flex justify-between">
              <span>GST (Tax 10%):</span>
              <span className="text-slate-900 font-bold">${order.gstAmount.toFixed(2)} AUD</span>
            </div>
            <div className="border-t border-slate-200 pt-4 flex justify-between items-center text-sm font-sans">
              <span className="text-slate-800 font-semibold tracking-tight">TOTAL INVOICE AMOUNT:</span>
              <span className="text-blue-600 font-bold text-xl font-mono">${order.totalAmount.toFixed(2)} AUD</span>
            </div>
          </div>
        </div>

        {/* Order Shipping instructions if available */}
        {order.notes && (
          <div className="border-t border-slate-200 pt-6 text-xs font-mono font-semibold uppercase">
            <p className="font-bold text-slate-500 tracking-wider text-[10px] mb-1">Customer Shipment Notes:</p>
            <p className="bg-slate-50 p-4 border border-slate-200 rounded-lg text-slate-700 leading-relaxed font-medium">{order.notes}</p>
          </div>
        )}

        {/* Secure seal */}
        <div className="border-t border-slate-200 pt-6 flex justify-between items-center text-[10px] text-slate-400 font-mono font-semibold uppercase">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            AUTHENTICATED WHOLESALE DOCUMENT
          </span>
          <span>Desmo Products Pty Ltd</span>
        </div>
      </div>

      {/* Admin Operations Block */}
      {(isAdmin || order.status === "pending_payment") && (
        <div className="bg-white border border-slate-200 p-6 space-y-4 rounded-xl shadow-sm" id="admin_invoice_operations">
          <h3 className="text-sm font-bold text-slate-800 font-mono uppercase tracking-wider flex items-center gap-1.5">
            <Truck className="w-5 h-5 text-blue-600" />
            {isAdmin ? "Lew's Desk: Update Packing & State" : "Payment Simulator Terminal"}
          </h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            {isAdmin 
              ? "As Lew, update payment and dispatch state. This generates correct tax and GST reporting data instantly."
              : "To test the BAS tax, GST, and accounting ledger, click below to simulate a bank deposit."}
          </p>

          <div className="flex flex-wrap gap-2.5 pt-1">
            {order.status === "pending_payment" && (
              <button
                id="admin_mark_paid_btn"
                onClick={() => updateOrderStatus(order.id, "paid")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold uppercase text-xs tracking-wider border border-emerald-600 rounded-lg py-3 px-4 shadow-sm"
              >
                Mark as Paid (Deposit Settled)
              </button>
            )}

            {order.status === "paid" && isAdmin && (
              <button
                id="admin_mark_shipped_btn"
                onClick={() => updateOrderStatus(order.id, "shipped")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold uppercase text-xs tracking-wider border border-blue-600 rounded-lg py-3 px-4 shadow-sm"
              >
                Dispatch Order (Mark as Shipped)
              </button>
            )}

            {order.status !== "cancelled" && order.status !== "shipped" && isAdmin && (
              <button
                id="admin_mark_cancelled_btn"
                onClick={() => updateOrderStatus(order.id, "cancelled")}
                className="bg-white hover:bg-slate-50 text-red-650 font-semibold uppercase text-xs tracking-wider border border-slate-200 rounded-lg py-3 px-4 shadow-sm"
              >
                Cancel Invoice
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
