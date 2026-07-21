import React, { useState } from "react";
import { usePortal } from "../context/PortalContext";
import { OrderItem, Order } from "../types";
import { Shield, Upload, AlertCircle, CheckCircle, Clock } from "lucide-react";

export const WarrantyView: React.FC = () => {
  const { warranties, submitWarrantyClaim, orders, currentUser } = usePortal();
  
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [photoBase64, setPhotoBase64] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  if (!currentUser) return null;

  // Filter to only paid/shipped orders within the last 3 months
  const eligibleOrders = orders.filter(o => {
    if (o.status !== "paid" && o.status !== "shipped") return false;
    const orderDate = new Date(o.createdAt);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return orderDate >= threeMonthsAgo;
  });

  const selectedOrder = eligibleOrders.find(o => o.id === selectedOrderId);
  
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Photo must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoBase64(reader.result as string);
        setError("");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || !selectedProductId || !photoBase64) {
      setError("Please fill out all fields and upload a photo.");
      return;
    }

    const item = selectedOrder?.items.find(i => i.productId === selectedProductId);
    if (!item) return;

    setIsSubmitting(true);
    try {
      await submitWarrantyClaim({
        orderId: selectedOrderId,
        customerId: currentUser.id,
        productId: selectedProductId,
        productName: item.productName,
        engravingPhotoUrl: photoBase64
      });
      setSelectedOrderId("");
      setSelectedProductId("");
      setPhotoBase64("");
      setError("");
      alert("Warranty claim submitted successfully!");
    } catch (err) {
      setError("Failed to submit claim. Please try again.");
    }
    setIsSubmitting(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "rejected": return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "requires_return": return <AlertCircle className="w-5 h-5 text-amber-500" />;
      default: return <Clock className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Warranty Management</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Submit New Claim</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Warranties are valid for 3 months from the date of purchase. For Load Testers, an engraved date photo is required.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-800">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Invoice</label>
              <select 
                value={selectedOrderId}
                onChange={(e) => { setSelectedOrderId(e.target.value); setSelectedProductId(""); }}
                className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              >
                <option value="">-- Choose an eligible invoice --</option>
                {eligibleOrders.map(o => (
                  <option key={o.id} value={o.id}>{o.id} ({new Date(o.createdAt).toLocaleDateString()})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Product</label>
              <select 
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                disabled={!selectedOrderId}
                className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm disabled:opacity-50"
              >
                <option value="">-- Choose a product --</option>
                {selectedOrder?.items.map(item => (
                  <option key={item.productId} value={item.productId}>{item.productName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Upload Photo of Engraving</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-lg hover:border-blue-500 transition-colors">
                <div className="space-y-1 text-center">
                  {photoBase64 ? (
                    <div className="relative">
                      <img src={photoBase64} alt="Preview" className="mx-auto h-32 object-contain rounded" />
                      <button type="button" onClick={() => setPhotoBase64("")} className="mt-2 text-xs text-red-500 font-semibold hover:underline">Remove</button>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-12 w-12 text-slate-400" />
                      <div className="flex text-sm text-slate-600 dark:text-slate-400 justify-center">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-slate-800 rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                          <span>Upload a file</span>
                          <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handlePhotoUpload} />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-slate-500">PNG, JPG up to 5MB</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !selectedOrderId || !selectedProductId || !photoBase64}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? "Submitting..." : "Submit Claim"}
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Your Claims</h2>
          <div className="flex-1 overflow-y-auto space-y-3">
            {warranties.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">No warranty claims found.</p>
            ) : (
              warranties.map(w => (
                <div key={w.id} className="p-4 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">{w.productName}</h3>
                      <p className="text-xs text-slate-500">Invoice: {w.orderId} • Submitted: {new Date(w.submissionDate).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-700 px-2 py-1 rounded-full shadow-sm border border-slate-200 dark:border-slate-600">
                      {getStatusIcon(w.status)}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        {w.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  {w.adminNotes && (
                    <div className="mt-3 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800/50">
                      <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">Admin Note:</p>
                      <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">{w.adminNotes}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
