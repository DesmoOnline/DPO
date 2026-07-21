import React from "react";
import { usePortal } from "../context/PortalContext";
import { Shield, Check, X, Truck, Eye } from "lucide-react";

export const WarrantyAdminPanel: React.FC = () => {
  const { warranties, updateWarrantyStatus, customers, products } = usePortal();

  const getCustomerName = (id: string) => {
    return customers.find(c => c.id === id)?.companyName || id;
  };

  const getProductName = (id: string) => {
    return products.find(p => p.id === id)?.name || id;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
              <th className="p-4 font-semibold">Date</th>
              <th className="p-4 font-semibold">Customer</th>
              <th className="p-4 font-semibold">Product</th>
              <th className="p-4 font-semibold">Invoice</th>
              <th className="p-4 font-semibold">Photo</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {warranties.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">No warranty claims found.</td>
              </tr>
            ) : (
              warranties.map(warranty => (
                <tr key={warranty.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-slate-600 whitespace-nowrap">
                    {new Date(warranty.submissionDate).toLocaleDateString()}
                  </td>
                  <td className="p-4 font-medium text-slate-900">
                    {getCustomerName(warranty.customerId)}
                  </td>
                  <td className="p-4 text-slate-700">
                    {getProductName(warranty.productId)}
                  </td>
                  <td className="p-4 text-slate-500 font-mono text-xs">
                    {warranty.orderId}
                  </td>
                  <td className="p-4">
                    {warranty.engravingPhotoUrl ? (
                      <a href={warranty.engravingPhotoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline text-xs font-semibold">
                        <Eye className="w-3.5 h-3.5" /> View
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">None</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      warranty.status === 'approved' ? 'bg-green-100 text-green-700' :
                      warranty.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      warranty.status === 'requires_return' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {warranty.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      {warranty.status === 'pending' && (
                        <>
                          <button
                            onClick={() => {
                              const note = prompt("Optional approval note:");
                              updateWarrantyStatus(warranty.id, "approved", note || undefined);
                            }}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const note = prompt("Reason for rejection:");
                              if (note !== null) updateWarrantyStatus(warranty.id, "rejected", note || undefined);
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const note = prompt("Return instructions for customer:");
                              if (note !== null) updateWarrantyStatus(warranty.id, "requires_return", note || undefined);
                            }}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"
                            title="Request Return"
                          >
                            <Truck className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
