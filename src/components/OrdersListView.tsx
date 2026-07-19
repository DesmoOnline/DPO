import React, { useState } from "react";
import { usePortal } from "../context/PortalContext";
import { Order } from "../types";
import { Search, FileText, Truck, Calendar, DollarSign, Filter, ShieldAlert, CheckCircle, XCircle, Ban, Pencil, Package } from "lucide-react";

interface OrdersListViewProps {
  onViewInvoice: (orderId: string) => void;
  onViewPackingSlip: (orderId: string) => void;
}

export const OrdersListView: React.FC<OrdersListViewProps> = ({ onViewInvoice, onViewPackingSlip }) => {
  const { orders, isAdmin, currentUser, approveOrder, declineOrder, updateOrderStatus, addShippingCharge } = usePortal();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Shipping charge modal state
  const [shippingModalOrderId, setShippingModalOrderId] = useState<string | null>(null);
  const [shippingAmount, setShippingAmount] = useState("");
  const [shippingSubmitting, setShippingSubmitting] = useState(false);

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
      case "pending_approval":
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-mono px-2.5 py-1 uppercase font-bold rounded-full animate-pulse">
            Awaiting Approval
          </span>
        );
      case "approved":
        return (
          <span className="bg-indigo-50 text-indigo-750 text-[10px] font-mono px-2.5 py-1 uppercase font-bold rounded-full border border-indigo-100">
            Approved (Unpaid)
          </span>
        );
      case "declined":
        return (
          <span className="bg-red-55/10 text-red-700 border border-red-200/50 text-[10px] font-mono px-2.5 py-1 uppercase font-bold rounded-full">
            Declined
          </span>
        );
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
          <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-mono px-2.5 py-1 uppercase font-bold rounded-full">
            Unknown
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

  const handleShippingSubmit = async () => {
    if (!shippingModalOrderId || !shippingAmount) return;
    const amount = parseFloat(shippingAmount);
    if (isNaN(amount) || amount < 0) return;
    setShippingSubmitting(true);
    try {
      await addShippingCharge(shippingModalOrderId, amount);
      setShippingModalOrderId(null);
      setShippingAmount("");
    } finally {
      setShippingSubmitting(false);
    }
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
            <option value="pending_approval">Awaiting Approval</option>
            <option value="approved">Approved (Unpaid)</option>
            <option value="declined">Declined</option>
            <option value="paid">Paid</option>
            <option value="shipped">Shipped</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Shipping Charge Modal */}
      {shippingModalOrderId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShippingModalOrderId(null)}>
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl p-6 w-full max-w-sm mx-4 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <Package className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono">Add Shipping Charge</h3>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[10px] font-mono text-slate-600">
              Invoice: <strong>{shippingModalOrderId}</strong>
              {(() => {
                const ord = orders.find(o => o.id === shippingModalOrderId);
                return ord ? (
                  <>
                    <br />Company: <strong>{ord.companyName}</strong>
                    {ord.shippingCharge !== undefined && ord.shippingCharge > 0 && (
                      <><br />Current Shipping: <strong className="text-amber-600">${ord.shippingCharge.toFixed(2)}</strong></>
                    )}
                  </>
                ) : null;
              })()}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider block">
                Shipping Amount (AUD ex. GST):
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">$</span>
                <input
                  id="shipping_charge_input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={shippingAmount}
                  onChange={(e) => setShippingAmount(e.target.value)}
                  className="w-full pl-7 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-mono font-semibold"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShippingModalOrderId(null); setShippingAmount(""); }}
                className="flex-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-2.5 text-xs font-semibold uppercase tracking-wider transition rounded-lg shadow-sm"
              >
                Cancel
              </button>
              <button
                id="shipping_charge_submit_btn"
                onClick={handleShippingSubmit}
                disabled={shippingSubmitting || !shippingAmount || parseFloat(shippingAmount) < 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 text-xs font-semibold uppercase tracking-wider transition rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
              >
                {shippingSubmitting ? (
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <Package className="w-3.5 h-3.5" />
                )}
                Apply Charge
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <th className="px-5 py-3.5 text-right">Documents</th>
                  {isAdmin && <th className="px-5 py-3.5 text-right">Admin Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredOrders.map((order) => (
                  <tr key={order.id} id={`ledger_row_${order.id}`} className="hover:bg-slate-50/50 transition">
                    <td className="px-5 py-4 font-bold text-slate-900">
                      {order.id}
                      {order.ownTransport && (
                        <span className="ml-2 text-[8px] bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded-full font-bold uppercase">Own Transport</span>
                      )}
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
                      {order.shippingCharge !== undefined && order.shippingCharge > 0 && (
                        <span className="block text-[9px] text-slate-500 font-medium mt-0.5">
                          (incl. ${order.shippingCharge.toFixed(2)} shipping)
                        </span>
                      )}
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
                        {isAdmin && (
                          <button
                            id={`view_slip_${order.id}`}
                            onClick={() => onViewPackingSlip(order.id)}
                            className="border border-slate-200 bg-slate-800 hover:bg-slate-900 text-white py-1.5 px-3 text-xs font-semibold uppercase tracking-wider transition rounded-lg shadow-sm inline-flex items-center gap-1"
                            title="View Packing Slip"
                          >
                            <Truck className="w-3.5 h-3.5 text-slate-300" />
                            Slip
                          </button>
                        )}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex flex-wrap items-center gap-1.5 justify-end">
                          {/* Approve - only for pending orders */}
                          {order.status === "pending_approval" && (
                            <button
                              id={`approve_${order.id}`}
                              onClick={() => approveOrder(order.id)}
                              className="border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-1 px-2.5 text-[10px] font-bold uppercase tracking-wider transition rounded-lg inline-flex items-center gap-1"
                              title="Approve Order"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Approve
                            </button>
                          )}

                          {/* Decline - only for pending orders */}
                          {order.status === "pending_approval" && (
                            <button
                              id={`decline_${order.id}`}
                              onClick={() => declineOrder(order.id)}
                              className="border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 py-1 px-2.5 text-[10px] font-bold uppercase tracking-wider transition rounded-lg inline-flex items-center gap-1"
                              title="Decline Order"
                            >
                              <XCircle className="w-3 h-3" />
                              Decline
                            </button>
                          )}

                          {/* Edit - opens the invoice detail for editing */}
                          {order.status !== "cancelled" && order.status !== "shipped" && (
                            <button
                              id={`edit_${order.id}`}
                              onClick={() => onViewInvoice(order.id)}
                              className="border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 py-1 px-2.5 text-[10px] font-bold uppercase tracking-wider transition rounded-lg inline-flex items-center gap-1"
                              title="Edit Order"
                            >
                              <Pencil className="w-3 h-3" />
                              Edit
                            </button>
                          )}

                          {/* Cancel - for any non-terminal order */}
                          {order.status !== "cancelled" && order.status !== "shipped" && order.status !== "declined" && (
                            <button
                              id={`cancel_${order.id}`}
                              onClick={() => updateOrderStatus(order.id, "cancelled")}
                              className="border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-600 py-1 px-2.5 text-[10px] font-bold uppercase tracking-wider transition rounded-lg inline-flex items-center gap-1"
                              title="Cancel Order"
                            >
                              <Ban className="w-3 h-3" />
                              Cancel
                            </button>
                          )}

                          {/* Add Shipping - for non-terminal orders */}
                          {order.status !== "cancelled" && order.status !== "declined" && (
                            <button
                              id={`shipping_${order.id}`}
                              onClick={() => { setShippingModalOrderId(order.id); setShippingAmount(order.shippingCharge?.toString() || ""); }}
                              className="border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 py-1 px-2.5 text-[10px] font-bold uppercase tracking-wider transition rounded-lg inline-flex items-center gap-1"
                              title="Add Shipping Charge"
                            >
                              <Package className="w-3 h-3" />
                              Shipping
                            </button>
                          )}
                        </div>
                      </td>
                    )}
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
