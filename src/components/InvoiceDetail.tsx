import React from "react";
import { usePortal } from "../context/PortalContext";
import { Order } from "../types";
import { ArrowLeft, Printer, ShieldCheck, CreditCard, ChevronRight, Truck, FileDown, Mail, Loader2, Check, X, Clock, FileText } from "lucide-react";
import { generateInvoicePDF } from "../utils/pdfGenerator";

interface InvoiceDetailProps {
  orderId: string;
  onBack: () => void;
  onViewPackingSlip: (orderId: string) => void;
}

export const InvoiceDetail: React.FC<InvoiceDetailProps> = ({ orderId, onBack, onViewPackingSlip }) => {
  const { orders, isAdmin, updateOrderStatus, approveOrder, declineOrder, companySettings } = usePortal();
  const [isEmailing, setIsEmailing] = React.useState(false);
  const [emailStatus, setEmailStatus] = React.useState<"idle" | "success" | "error">("idle");
  const [emailError, setEmailError] = React.useState<string | null>(null);

  const order = orders.find(o => o.id === orderId);
  const isQuote = order?.documentType === "QUOTE";

  if (!order) {
    return (
      <div className="text-center py-16 bg-white border border-slate-200 rounded-xl shadow-sm" id="invoice_not_found">
        <p className="text-slate-500 text-xs font-mono">Invoice reference could not be located in the database.</p>
        <button onClick={onBack} className="mt-4 bg-slate-800 text-white text-xs py-2 px-4 rounded-lg font-semibold uppercase hover:bg-slate-900 transition">
          Return
        </button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const pdf = generateInvoicePDF(order, companySettings);
    pdf.save(`${isQuote ? "quote" : "invoice"}_${order.id}.pdf`);
  };

  const handleApproveQuote = () => {
    approveOrder(order.id);
  };

  const handleEmailInvoice = async () => {
    setIsEmailing(true);
    setEmailStatus("idle");
    setEmailError(null);

    try {
      const pdf = generateInvoicePDF(order, companySettings);
      // Generate base64 data URL
      const dataUri = pdf.output("datauristring");
      const pdfBase64 = dataUri.split(",")[1];

      const response = await fetch("/api/send-invoice-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: order.customerEmail,
          subject: `${isQuote ? "Quote" : "Invoice"} from ${companySettings.tradingName} - ${order.id}`,
          body: `Dear customer,\n\nPlease find attached your ${isQuote ? "quote" : "tax invoice"} (${order.id}) for your wholesale order with ${companySettings.tradingName}.\n\nTotal Amount: $${order.totalAmount.toFixed(2)} AUD\n\n${isQuote ? "This quote may be finalized with shipping before approval." : `Please settle payment within ${companySettings.paymentTerms} via bank deposit.`}\n\nThank you,\n${companySettings.companyName}`,
          pdfBase64,
          filename: `${isQuote ? "quote" : "invoice"}_${order.id}.pdf`
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setEmailStatus("success");
      } else {
        throw new Error(result.error || "Failed to send email.");
      }
    } catch (err: any) {
      console.error(err);
      setEmailStatus("error");
      setEmailError(err.message || "An error occurred.");
      // Trigger automatic backup download
      handleDownloadPDF();
    } finally {
      setIsEmailing(false);
    }
  };

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "quote_requested": return "bg-amber-50 text-amber-700 border border-amber-200 rounded-full";
      case "quote_finalized": return "bg-blue-50 text-blue-700 border border-blue-200 rounded-full";
      case "pending_approval": return "bg-amber-50 text-amber-700 border border-amber-200 rounded-full animate-pulse";
      case "approved": return "bg-indigo-50 text-indigo-705 border border-indigo-200 rounded-full";
      case "declined": return "bg-red-50 text-red-655 border border-red-200 rounded-full";
      case "paid": return "bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full";
      case "shipped": return "bg-blue-50 text-blue-705 border border-blue-200 rounded-full";
      case "cancelled": return "bg-slate-100 text-slate-600 border border-slate-200 rounded-full";
      default: return "bg-slate-50 text-slate-700 border border-slate-250 rounded-full";
    }
  };

  const getStatusLabel = (status: Order["status"]) => {
    switch (status) {
      case "quote_requested": return "Quote Requested";
      case "quote_finalized": return "Quote Finalized";
      case "pending_approval": return "Awaiting Review";
      case "approved": return "Approved (Unpaid)";
      case "declined": return "Declined";
      case "paid": return "Paid & Settled";
      case "shipped": return "Dispatched / Shipped";
      case "cancelled": return "Cancelled";
      default: return "Awaiting Action";
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
          Back to Quotes & Invoices
        </button>

        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && order.status !== "pending_approval" && order.status !== "declined" && (
            <button
              id="view_pack_slip_btn"
              onClick={() => onViewPackingSlip(order.id)}
              className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition rounded-lg shadow-sm inline-flex items center gap-1.5 font-mono"
            >
              <Truck className="w-4 h-4 text-blue-600" />
              View Packing Slip
            </button>
          )}

          {isAdmin && order.status !== "pending_approval" && order.status !== "declined" && (
            <button
              id="email_invoice_btn"
              onClick={handleEmailInvoice}
              disabled={isEmailing}
              className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition rounded-lg shadow-sm inline-flex items-center gap-1.5 font-mono disabled:opacity-50"
            >
              {isEmailing ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              ) : (
                <Mail className="w-4 h-4 text-blue-600" />
              )}
              Email Invoice
            </button>
          )}

          <button
            id="download_invoice_pdf_btn"
            onClick={handleDownloadPDF}
            className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition rounded-lg shadow-sm inline-flex items-center gap-1.5 font-mono"
          >
            <FileDown className="w-4 h-4 text-blue-600" />
            Download PDF
          </button>
          
          <button
            id="print_invoice_btn"
            onClick={handlePrint}
            className="border border-slate-200 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition rounded-lg shadow-sm inline-flex items-center gap-1.5 font-mono"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            {isQuote ? "Print Quote" : "Print Invoice"}
          </button>
        </div>
      </div>

      {/* Email Status Feedback banner */}
      {emailStatus === "success" && (
        <div className="bg-emerald-50 border border-emerald-250 p-4 rounded-xl flex items-center gap-3 text-emerald-800 text-xs font-medium uppercase font-mono shadow-sm">
          <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{isQuote ? "Quote PDF" : "Invoice PDF"} has been successfully emailed to <strong>{order.customerEmail}</strong>!</span>
        </div>
      )}

      {emailStatus === "error" && (
        <div className="bg-red-50/50 border border-red-200 p-4 rounded-xl flex flex-col gap-2 text-red-800 text-xs font-mono shadow-sm">
          <div className="flex items-center gap-3 font-medium uppercase">
            <X className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span>Failed to auto-email: {emailError}</span>
          </div>
          <span className="text-[10px] text-red-600/80 pl-8 normal-case font-sans">
            Fallback activated: The document has been downloaded automatically. You can attach it manually to your email client. Add <strong>GMAIL_USER</strong> and <strong>GMAIL_APP_PASSWORD</strong> environment variables in your server to enable automated emailing.
          </span>
        </div>
      )}

      {/* Order Confirmation Banner */}
      {isQuote && order.status === "quote_requested" && (
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 shadow-sm mb-6" id="invoice_pending_banner">
        <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-slate-900 tracking-tight">Quote Request Submitted - Awaiting Shipping Calculation</h4>
          <p className="text-xs text-slate-700 leading-relaxed font-medium mt-1">
            {companySettings.orderPendingMessage}
          </p>
        </div>
      </div>)}

      {isQuote && order.status === "quote_finalized" && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3 shadow-sm mb-6" id="invoice_pending_banner">
          <Truck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">Quote Finalized With Shipping</h4>
            <p className="text-xs text-slate-700 leading-relaxed font-medium mt-1">
              Shipping has been added and the quote is ready for approval.
            </p>
          </div>
        </div>
      )}

      {!isQuote && order.status === "pending_approval" && (
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3 shadow-sm mb-6" id="invoice_pending_banner">
        <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-slate-900 tracking-tight">Order Submitted Successfully & Awaiting Review</h4>
          <p className="text-xs text-slate-700 leading-relaxed font-medium mt-1">
            {companySettings.orderPendingMessage}
          </p>
        </div>
      </div>)}

      {order.status === "approved" && (
        <div className="bg-emerald-50 border border-emerald-250 p-6 rounded-xl space-y-2 text-slate-800 text-xs font-mono shadow-sm print:hidden">
          <div className="flex items-center gap-2.5 font-bold text-emerald-900 uppercase">
            <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>Order Confirmed & Approved</span>
          </div>
          <p className="text-[11px] leading-relaxed font-sans normal-case text-slate-650 pl-7 font-medium">
            This order has been automatically approved and logged as a confirmed transaction. An official tax invoice has been compiled and dispatched to <strong>{order.customerEmail}</strong>. Please find the direct NAB transfer details below to clear your account.
          </p>
        </div>
      )}

      {/* Invoice Area */}
      <div className="bg-white border border-slate-200 p-6 md:p-10 rounded-xl shadow-sm space-y-8 print:p-0 print:border-none print:shadow-none" id="printable_invoice_canvas">
        {/* Invoice Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-6 gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight uppercase">{isQuote ? "QUOTE" : "TAX INVOICE"}</h1>
            <p className="text-slate-500 font-mono text-xs font-semibold">
              REF: <span className="text-slate-800">{order.id}</span>
              {isQuote && (
                <span className="ml-2 inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-full text-[10px] font-bold uppercase">
                  <FileText className="w-3 h-3" />
                  Quote Document
                </span>
              )}
            </p>
          </div>
          
          <div className="text-left md:text-right flex flex-col md:items-end w-full md:w-auto">
            {companySettings.logoBase64 && (
              <img src={companySettings.logoBase64} alt="Company Logo" className="h-12 object-contain mb-2" />
            )}
            <h2 className="font-bold text-slate-800 text-sm tracking-tight">{companySettings.companyName || companySettings.tradingName}</h2>
            <div className="text-xs text-slate-500 space-y-0.5 mt-1">
              <p>ABN: {companySettings.abn}</p>
              <p>{companySettings.address}</p>
              <p>Email: {companySettings.email}</p>
            </div>
          </div>
        </div>

        {/* Customer & Billing information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs border-b border-slate-200 pb-8 uppercase font-mono font-semibold">
          <div>
            <h3 className="text-[10px] font-mono text-slate-400 font-bold tracking-widest uppercase mb-1">Billed To</h3>
            <p className="text-sm font-bold text-slate-800">{order.companyName}</p>
            <p className="text-xs text-slate-600 mt-1">{order.customerEmail}</p>
          </div>

          {(order.deliveryAddress || order.ownTransport) && (
            <div>
              <h3 className="text-[10px] font-mono text-slate-400 font-bold tracking-widest uppercase mb-1">Delivery</h3>
              {order.ownTransport ? (
                <p className="text-xs text-slate-600 mt-1 italic font-medium flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-teal-600" />
                  Own Transport / Pickup
                </p>
              ) : (
                <p className="text-xs text-slate-600 mt-1">{order.deliveryAddress}</p>
              )}
            </div>
          )}
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
          <div className="border border-slate-200 p-4 rounded-xl bg-slate-50 w-full md:w-auto shadow-sm">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono mb-2 border-b border-slate-200 pb-2">EFT Payment Details</h4>
            <div className="space-y-1 text-[11px] font-mono">
              <p>Bank: <strong className="text-slate-900">{companySettings.bankName}</strong></p>
              <p>Account Name: <strong className="text-slate-900 font-bold">{companySettings.accountName}</strong></p>
              <p>BSB: <strong className="text-slate-900">{companySettings.bsb}</strong></p>
              <p>Account Number: <strong className="text-slate-900">{companySettings.accountNo}</strong></p>
            </div>
            <p className="text-[10px] text-slate-400 italic font-mono pt-1 leading-normal font-medium mt-2 border-t border-slate-200">
              * PAYMENT REQUIRED WITHIN {companySettings.paymentTerms.toUpperCase()}. PLEASE EMAIL REMITTANCE ADVICE TO {companySettings.email.toUpperCase()}.
            </p>
          </div>

          {/* Pricing Totals */}
          <div className="flex flex-col justify-end space-y-3.5 text-xs font-mono text-right md:pl-12 uppercase font-semibold text-slate-600">
            <div className="flex justify-between">
              <span>Wholesale Subtotal (ex. GST):</span>
              <span className="text-slate-900 font-bold">${order.subtotal.toFixed(2)} AUD</span>
            </div>
            {order.shippingCharge !== undefined && order.shippingCharge > 0 && (
              <div className="flex justify-between">
                <span>Shipping Charge (ex. GST):</span>
                <span className="text-slate-900 font-bold">${order.shippingCharge.toFixed(2)} AUD</span>
              </div>
            )}
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
        <div className="border-t border-slate-200 pt-6 flex justify-between items-center text-[10px] text-slate-400 font-mono uppercase tracking-widest font-semibold mt-4">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            AUTHENTICATED WHOLESALE DOCUMENT
          </span>
          <span>{companySettings.companyName || companySettings.tradingName}</span>
        </div>
      </div>

      {/* Admin Operations Block */}
      {(isAdmin || order.status === "approved" || (isQuote && order.status === "quote_finalized")) && (
        <div className="bg-white border border-slate-200 p-6 space-y-4 rounded-xl shadow-sm print:hidden" id="admin_invoice_operations">
          <h3 className="text-sm font-bold text-slate-800 font-mono uppercase tracking-wider flex items-center gap-1.5">
            <Truck className="w-5 h-5 text-blue-600" />
            {isAdmin ? "Lew's Desk: Order & Logistics Desk" : "Payment Simulator Terminal"}
          </h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            {isAdmin 
              ? "As Lew, update payment and dispatch state. This generates correct tax and GST reporting data instantly."
              : "Simulate a direct bank deposit payment to settle this approved wholesale invoice."}
          </p>

          <div className="flex flex-wrap gap-2.5 pt-1">
            {order.status === "pending_approval" && isAdmin && (
              <>
                <button
                  id="admin_approve_order_btn"
                  onClick={() => approveOrder(order.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold uppercase text-xs tracking-wider border border-emerald-600 rounded-lg py-3 px-4 shadow-sm transition"
                >
                  Confirm & Approve Order
                </button>
                <button
                  id="admin_decline_order_btn"
                  onClick={() => declineOrder(order.id)}
                  className="bg-white hover:bg-slate-50 text-red-650 font-semibold uppercase text-xs tracking-wider border border-slate-200 rounded-lg py-3 px-4 shadow-sm transition"
                >
                  Decline Order
                </button>
              </>
            )}

            {isQuote && order.status === "quote_finalized" && !isAdmin && (
              <>
                <button
                  id="customer_approve_quote_btn"
                  onClick={handleApproveQuote}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold uppercase text-xs tracking-wider border border-emerald-600 rounded-lg py-3 px-4 shadow-sm transition"
                >
                  Purchase / Order
                </button>
                <button
                  id="customer_decline_quote_btn"
                  onClick={() => declineOrder(order.id)}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-semibold uppercase text-xs tracking-wider border border-slate-200 rounded-lg py-3 px-4 shadow-sm transition"
                >
                  Decline Quote
                </button>
              </>
            )}

            {order.status === "approved" && (
              <button
                id="admin_mark_paid_btn"
                onClick={() => updateOrderStatus(order.id, "paid")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold uppercase text-xs tracking-wider border border-emerald-600 rounded-lg py-3 px-4 shadow-sm transition"
              >
                Mark as Paid (Deposit Settled)
              </button>
            )}

            {order.status === "paid" && isAdmin && (
              <button
                id="admin_mark_shipped_btn"
                onClick={() => updateOrderStatus(order.id, "shipped")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold uppercase text-xs tracking-wider border border-blue-600 rounded-lg py-3 px-4 shadow-sm transition"
              >
                Dispatch Order (Mark as Shipped)
              </button>
            )}

            {order.status !== "cancelled" && order.status !== "declined" && order.status !== "shipped" && isAdmin && (
              <button
                id="admin_mark_cancelled_btn"
                onClick={() => updateOrderStatus(order.id, "cancelled")}
                className="bg-white hover:bg-slate-50 text-slate-505 font-semibold uppercase text-xs tracking-wider border border-slate-200 rounded-lg py-3 px-4 shadow-sm transition"
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
