import React, { useState } from "react";
import { usePortal } from "../context/PortalContext";
import { Order } from "../types";
import { Search, Eye, FileText, Truck, Calendar, DollarSign, Filter, ShieldAlert } from "lucide-react";

interface OrdersListViewProps {
  onViewInvoice: (orderId: string) => void;
  onViewPackingSlip: (orderId: string) => void;
}

export const OrdersListView: React.FC<OrdersListViewProps> = ({ onViewInvoice, onViewPackingSlip }) => {
  const { orders, isAdmin, currentUser } = usePortal();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredOrders = orders.filter(order => {
    // Search filter
    const matchesSearch = 
      order.id.toLowerCase().includes(search.toLowerCase()) ||
      order.companyName.toLowerCase().includes(search.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(search.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Order["status"]) => {
    switch (status) {
      case "paid":
        return (
          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-mono px-2.5 py-1 uppercase font-bold rounded-full border border-emerald-100">
            Paid
          </span>
        );
      case "shipped":
        return (
          <span className="bg-blue-50 text-blue-705 text-[10px] font-mono px-2.5 py-1 uppercase font-bold rounded-full border border-blue-100">
            Shipped
          </span>
        );
      case "cancelled":
        return (
          <span className="bg-slate-100 text-slate-600 text-[10px] font-mono px-2.5 py-1 uppercase font-bold rounded-full border border-slate-200">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-mono px-2.5 py-1 uppercase font-bold rounded-full animate-pulse">
            Unpaid
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (!currentUser) {
    return (
      <div className="bg-white border border-slate-200 p-10 text-center shadow-sm rounded-xl" id="orders_unauthenticated">
        <ShieldAlert className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h3 className="text-slate-800 font-bold text-xl tracking-tight">Authentication Required</h3>
        <p className="text-slate-500 text-xs mt-2 uppercase font-mono font-semibold tracking-wide">Please login or register to browse invoice records.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8" id="orders_list_container">
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          {isAdmin ? "Master Wholesale Ledger" : "My Dealer Invoices"}
        </h2>
        <p className="text-xs text-slate-500 uppercase font-mono font-semibold tracking-wider">
          {isAdmin 
            ? "Administrative logs of all wholesale transactions, order fulfillments, and tax receipts." 
            : "Review past invoices, check payment state and access corresponding logistics packing slips."}
        </p>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm" id="orders_filters">
        <div className="relative w-full sm:max-w-xs font-mono font-semibold">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input
            id="orders_search_input"
            type="text"
            placeholder={isAdmin ? "Search by invoice, company or email..." : "Search by invoice..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-250 rounded-lg text-slate-800 text-xs placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-medium"
          />
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto font-mono text-xs">
          <Filter className="w-4 h-4 text-slate-450" />
          <select
            id="orders_status_filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white text-xs text-slate-700 border border-slate-250 rounded-lg px-3 py-2 font-mono font-semibold uppercase outline-none focus:border-blue-500 transition shadow-sm"
          >
            <option value="all">All States</option>
            <option value="pending_payment">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="shipped">Shipped</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Grid/Table */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200 shadow-sm rounded-xl" id="no_orders_found">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-500 font-semibold font-mono text-xs uppercase">No matching invoices found in history.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm" id="orders_table_wrapper">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono font-medium">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <th className="px-5 py-3.5">Invoice Reference</th>
                  {isAdmin && <th className="px-5 py-3.5">Customer / Dealer</th>}
                  <th className="px-5 py-3.5"><Calendar className="w-3.5 h-3.5 inline mr-1" strokeWidth={1.5} />Date Issued</th>
                  <th className="px-5 py-3.5"><DollarSign className="w-3.5 h-3.5 inline mr-1" strokeWidth={1.5} />Amount (AUD)</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Document Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredOrders.map((order) => (
                  <tr key={order.id} id={`ledger_row_${order.id}`} className="hover:bg-slate-50/50 transition">
                    <td className="px-5 py-4 font-bold text-slate-900">
                      {order.id}
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-4 font-sans text-slate-700">
                        <p className="font-bold uppercase tracking-tight text-sm text-slate-800">{order.companyName}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-1 font-medium">{order.customerEmail}</p>
                      </td>
                    )}
                    <td className="px-5 py-4 font-mono text-slate-600">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-blue-600">
                      ${order.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          id={`view_inv_${order.id}`}
                          onClick={() => onViewInvoice(order.id)}
                          className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-1.5 px-3 text-xs font-semibold uppercase tracking-wider transition rounded-lg shadow-sm inline-flex items-center gap-1"
                          title="View Tax Invoice"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-550" />
                          Invoice
                        </button>
                        <button
                          id={`view_slip_${order.id}`}
                          onClick={() => onViewPackingSlip(order.id)}
                          className="border border-slate-200 bg-slate-800 hover:bg-slate-900 text-white py-1.5 px-3 text-xs font-semibold uppercase tracking-wider transition rounded-lg shadow-sm inline-flex items-center gap-1"
                          title="View Packing Slip"
                        >
                          <Truck className="w-3.5 h-3.5 text-slate-300" />
                          Slip
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
