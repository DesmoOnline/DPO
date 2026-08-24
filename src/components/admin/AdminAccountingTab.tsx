import React, { useState } from "react";
import { Order } from "../../types";
import { Check, Copy, Shield } from "lucide-react";

interface AdminAccountingTabProps {
  orders: Order[];
  deleteOrder: (id: string) => Promise<void>;
}

export const AdminAccountingTab: React.FC<AdminAccountingTabProps> = ({ orders, deleteOrder }) => {
  const [dateRange, setDateRange] = useState<"30days" | "3months" | "fy">("fy");
  const [reportSortBy, setReportSortBy] = useState<"customer" | "week" | "month" | "quarter" | "fy">("customer");
  
  // Invoice deletion by reference state
  const [deleteInvoiceRef, setDeleteInvoiceRef] = useState("");
  const [deleteInvoiceConfirm, setDeleteInvoiceConfirm] = useState("");
  const [deleteInvoiceSubmitting, setDeleteInvoiceSubmitting] = useState(false);
  const [basCopied, setBasCopied] = useState(false);

  const invoiceToDelete = orders.find(order => order.id.toLowerCase() === deleteInvoiceRef.trim().toLowerCase());

  const getFilteredOrders = (): Order[] => {
    const now = new Date();
    return orders.filter(order => {
      if (
        order.status === "pending_approval" || 
        order.status === "declined" || 
        order.status === "cancelled" ||
        order.status === "quote_requested" ||
        order.status === "quote_finalized"
      ) {
        return false;
      }
      
      const orderDate = new Date(order.approvedAt || order.createdAt);
      if (dateRange === "30days") {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return orderDate >= thirtyDaysAgo;
      } else if (dateRange === "3months") {
        const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        return orderDate >= threeMonthsAgo;
      }
      return true;
    });
  };

  const currentFilteredOrders = getFilteredOrders();

  const calculateGSTReport = () => {
    let totalRevenue = 0;
    let totalGST = 0;
    let totalSubtotal = 0;
    let paidOrderCount = 0;
    let pendingOrderCount = 0;

    const ledger: { [key: string]: { subtotal: number; gst: number; total: number; count: number } } = {};
    const byMonth: { [month: string]: { subtotal: number; gst: number; total: number } } = {};

    currentFilteredOrders.forEach(order => {
      totalRevenue += order.totalAmount;
      totalGST += order.gstAmount;
      totalSubtotal += order.subtotal;

      if (order.status === "paid" || order.status === "shipped") paidOrderCount++;
      else pendingOrderCount++;

      let key = order.companyName; 
      const date = new Date(order.createdAt);
      
      if (reportSortBy === "week") {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = `Week of ${startOfWeek.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      } else if (reportSortBy === "month") {
        key = date.toLocaleString('en-AU', { month: 'long', year: 'numeric' });
      } else if (reportSortBy === "quarter") {
        const q = Math.floor(date.getMonth() / 3) + 1;
        key = `Q${q} ${date.getFullYear()}`;
      } else if (reportSortBy === "fy") {
        const year = date.getFullYear();
        const isSecondHalf = date.getMonth() >= 6;
        key = isSecondHalf ? `FY ${year}/${year + 1}` : `FY ${year - 1}/${year}`;
      }

      if (!ledger[key]) {
        ledger[key] = { subtotal: 0, gst: 0, total: 0, count: 0 };
      }
      ledger[key].subtotal += order.subtotal;
      ledger[key].gst += order.gstAmount;
      ledger[key].total += order.totalAmount;
      ledger[key].count += 1;

      const monthKey = date.toLocaleString('en-AU', { month: 'short', year: 'numeric' });
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = { subtotal: 0, gst: 0, total: 0 };
      }
      byMonth[monthKey].subtotal += order.subtotal;
      byMonth[monthKey].gst += order.gstAmount;
      byMonth[monthKey].total += order.totalAmount;
    });

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalGST: Number(totalGST.toFixed(2)),
      totalSubtotal: Number(totalSubtotal.toFixed(2)),
      orderCount: currentFilteredOrders.length,
      paidOrderCount,
      pendingOrderCount,
      ledger,
      byMonth
    };
  };

  const report = calculateGSTReport();

  const handleCopyBasData = () => {
    let csv = "";
    if (reportSortBy === "customer") {
      csv = "Customer/Company,Orders Count,Subtotal (ex. GST),GST Collected (10%),Gross Total (AUD)\n";
      Object.entries(report.ledger).forEach(([key, val]) => {
        csv += `"${key}",${val.count},${val.subtotal.toFixed(2)},${val.gst.toFixed(2)},${val.total.toFixed(2)}\n`;
      });
    } else {
      csv = "Period,Invoices Count,Subtotal (ex. GST),GST Collected (10%),Gross Total (AUD)\n";
      Object.entries(report.ledger).forEach(([key, val]) => {
        csv += `"${key}",${val.count},${val.subtotal.toFixed(2)},${val.gst.toFixed(2)},${val.total.toFixed(2)}\n`;
      });
    }

    navigator.clipboard.writeText(csv);
    setBasCopied(true);
    setTimeout(() => setBasCopied(false), 2000);
  };

  const handleDeleteInvoiceByReference = async () => {
    if (!invoiceToDelete) return;
    if (deleteInvoiceConfirm.trim().toUpperCase() !== "DELETE") return;

    setDeleteInvoiceSubmitting(true);
    try {
      await deleteOrder(invoiceToDelete.id);
      setDeleteInvoiceRef("");
      setDeleteInvoiceConfirm("");
    } finally {
      setDeleteInvoiceSubmitting(false);
    }
  };

  return (
    <div className="space-y-8" id="accounting_sub_panel">
      {/* Ranges Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono">Reporting Window:</span>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "30days", label: "Last 30 Days" },
              { id: "3months", label: "Last Quarter" },
              { id: "fy", label: "Financial Year" }
            ].map(range => (
              <button
                key={range.id}
                onClick={() => setDateRange(range.id as any)}
                className={`text-xs font-semibold px-4 py-2 border rounded-lg transition ${
                  dateRange === range.id
                    ? "bg-amber-400 border-blue-600 text-white shadow-sm"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono">Ledger Sorting & Grouping:</span>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "customer", label: "By Customer" },
              { id: "week", label: "By Week" },
              { id: "month", label: "By Month" },
              { id: "quarter", label: "By Quarter" },
              { id: "fy", label: "By Fiscal Year" }
            ].map(group => (
              <button
                key={group.id}
                onClick={() => setReportSortBy(group.id as any)}
                className={`text-xs font-semibold px-4 py-2 border rounded-lg transition ${
                  reportSortBy === group.id
                    ? "bg-amber-400 border-blue-600 text-white shadow-sm"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {group.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-2">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">Booked Gross Receipts:</span>
          <span className="text-3xl font-extrabold text-slate-900 block font-sans">${report.totalRevenue.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
          <p className="text-xs text-slate-500 leading-normal">
            Subtotal + GST on {report.orderCount} active wholesale invoices.
          </p>
        </div>

        <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-2">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">Net Base Sales (ex. GST):</span>
          <span className="text-3xl font-extrabold text-slate-900 block font-sans">${report.totalSubtotal.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
          <p className="text-xs text-slate-500 leading-normal">
            Taxable components volume before GST.
          </p>
        </div>

        <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div className="absolute top-3 right-3 bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full">
            BAS ACCRUAL
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">GST Liabilities (10%):</span>
          <span className="text-3xl font-extrabold text-blue-600 block font-sans">${report.totalGST.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
          <p className="text-xs text-slate-500 leading-normal">
            GST collected representing 1/11th of gross wholesale sales.
          </p>
        </div>
      </div>

      {/* Invoice deletion safeguard */}
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4 border-b border-rose-200 pb-4">
          <div>
            <h3 className="text-sm font-bold text-rose-900 uppercase tracking-wider">Delete Invoice / Quote by Number</h3>
            <p className="text-xs text-rose-700 mt-1">Type the exact invoice number to look it up, then confirm with the word DELETE. This removes the document from the Master Wholesale Ledger, including shipped documents.</p>
          </div>
          <Shield className="w-8 h-8 text-rose-700 flex-shrink-0" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-rose-700 uppercase font-semibold">Invoice / Quote Number</label>
            <input
              type="text"
              value={deleteInvoiceRef}
              onChange={(e) => {
                setDeleteInvoiceRef(e.target.value);
                setDeleteInvoiceConfirm("");
              }}
              placeholder="e.g. INV-1003 or QTE-1234"
              className="w-full bg-white border border-rose-200 rounded-lg p-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-rose-700 uppercase font-semibold">Type DELETE to confirm</label>
            <input
              type="text"
              value={deleteInvoiceConfirm}
              onChange={(e) => setDeleteInvoiceConfirm(e.target.value)}
              placeholder="DELETE"
              className="w-full bg-white border border-rose-200 rounded-lg p-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-rose-500"
            />
          </div>

          <button
            onClick={handleDeleteInvoiceByReference}
            disabled={!invoiceToDelete || deleteInvoiceConfirm.trim().toUpperCase() !== "DELETE" || deleteInvoiceSubmitting}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg px-4 py-3 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleteInvoiceSubmitting ? "Deleting..." : "Delete from Ledger"}
          </button>
        </div>

        {deleteInvoiceRef.trim() !== "" && (
          <div className="bg-white border border-rose-200 rounded-lg p-4 text-xs text-slate-700 space-y-2">
            {invoiceToDelete ? (
              <>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="font-bold text-slate-900">{invoiceToDelete.id}</span>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase border ${invoiceToDelete.status === "shipped" ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                    {invoiceToDelete.documentType === "QUOTE" ? "Quote" : "Invoice"}
                  </span>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase border ${invoiceToDelete.status === "shipped" ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                    {invoiceToDelete.status}
                  </span>
                </div>
                <p><strong>Company:</strong> {invoiceToDelete.companyName}</p>
                <p><strong>Total:</strong> ${invoiceToDelete.totalAmount.toFixed(2)}</p>
                <p><strong>Created:</strong> {new Date(invoiceToDelete.createdAt).toLocaleDateString('en-AU')}</p>
                <p className="text-rose-700 font-semibold">This document can be removed once you type DELETE and click the button.</p>
              </>
            ) : (
              <p className="text-slate-500">No matching invoice or quote found in the ledger.</p>
            )}
          </div>
        )}
      </div>

      {/* Table of sales by customer & Month */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Customer breakdowns */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Partner Customer Revenue Ledger
            </h3>
            <button
              id="copy_bas_csv_btn"
              onClick={handleCopyBasData}
              className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold text-xs py-2 px-4 rounded-lg transition shadow-sm flex items-center gap-1.5"
            >
              {basCopied ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  BAS CSV Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Bookkeeping CSV
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto text-xs">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left font-sans">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-550 uppercase text-[9px] font-bold tracking-wider">
                  <th className="py-2.5 px-3">
                    {reportSortBy === "customer" ? "Workshop Company Name" : "Reporting Period"}
                  </th>
                  <th className="py-2.5 px-3 text-center">Invoices</th>
                  <th className="py-2.5 px-3 text-right">Net Sales (ex. GST)</th>
                  <th className="py-2.5 px-3 text-right">GST (10%)</th>
                  <th className="py-2.5 px-3 text-right">Gross Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {Object.keys(report.ledger).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs italic font-medium">No sales recorded within selected window.</td>
                  </tr>
                ) : (
                  Object.entries(report.ledger).map(([name, data], idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-3 font-semibold text-slate-900 uppercase text-xs tracking-tight">{name}</td>
                      <td className="py-3.5 px-3 text-center font-mono">{data.count}</td>
                      <td className="py-3.5 px-3 text-right font-mono">${data.subtotal.toFixed(2)}</td>
                      <td className="py-3.5 px-3 text-right font-mono text-slate-500">${data.gst.toFixed(2)}</td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-blue-600">${data.total.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          </div>
        </div>

        {/* Right: Monthly breakdown chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 flex flex-col justify-between shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-4">
            Monthly Invoicing
          </h3>

          {Object.keys(report.byMonth).length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-12 text-slate-400 text-xs italic font-medium">
              No monthly patterns.
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(report.byMonth).map(([month, data], idx) => {
                const maxVal = Math.max(...Object.values(report.byMonth).map(m => m.total));
                const pct = maxVal > 0 ? (data.total / maxVal) * 100 : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-slate-800 uppercase font-bold">{month}</span>
                      <span className="text-slate-500">Net: <strong className="text-slate-700">${data.subtotal.toFixed(0)}</strong> • GST: <strong className="text-blue-600">${data.gst.toFixed(0)}</strong></span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                      <div 
                        className="bg-amber-400 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 text-[10px] text-slate-400 uppercase leading-normal font-medium">
                * The above graph maps total monthly gross invoicing trends to visually assist in quarterly BAS tracking.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
