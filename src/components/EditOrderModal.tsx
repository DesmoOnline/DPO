import React, { useState, useEffect } from "react";
import { usePortal } from "../context/PortalContext";
import { Order, CartItem, Product } from "../types";
import { X, Plus, Trash2, Save, ShoppingCart, Truck } from "lucide-react";

interface EditOrderModalProps {
  orderId: string;
  onClose: () => void;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({ orderId, onClose }) => {
  const { orders, products, editOrder, customers } = usePortal();
  const order = orders.find(o => o.id === orderId);
  const customer = order ? customers.find(c => c.id === order.customerId) : null;

  const [items, setItems] = useState<CartItem[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [ownTransport, setOwnTransport] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [newQty, setNewQty] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (order) {
      setItems(JSON.parse(JSON.stringify(order.items)));
      setDeliveryAddress(order.deliveryAddress || "");
      setOwnTransport(!!order.ownTransport);
    }
  }, [order]);

  if (!order) return null;

  const handleRemoveItem = (sku: string) => {
    setItems(prev => prev.filter(item => item.sku !== sku));
  };

  const handleAddItem = () => {
    if (!selectedProductId || newQty < 1) return;
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    setItems(prev => {
      const existing = prev.find(item => item.sku === prod.sku);
      if (existing) {
        return prev.map(item => 
          item.sku === prod.sku ? { ...item, qty: item.qty + newQty } : item
        );
      }
      return [...prev, {
        productId: prod.id,
        sku: prod.sku,
        productName: prod.name,
        price: prod.price,
        qty: newQty,
        category: prod.category
      }];
    });
    
    setSelectedProductId("");
    setNewQty(1);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await editOrder(order.id, {
        items,
        deliveryAddress,
        ownTransport
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
          <h2 className="font-bold tracking-tight uppercase flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Edit Order: {order.id}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          {/* Address Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase font-mono border-b border-slate-100 pb-2">Delivery Details</h3>
            
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
              <input
                id="edit_own_transport"
                type="checkbox"
                checked={ownTransport}
                onChange={(e) => {
                  setOwnTransport(e.target.checked);
                  if (e.target.checked) setDeliveryAddress("");
                }}
                className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="edit_own_transport" className="flex items-center gap-2 cursor-pointer select-none">
                <Truck className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">Own Transport</span>
              </label>
            </div>

            {!ownTransport && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase font-mono">Delivery Address</label>
                {customer?.deliveryAddresses && customer.deliveryAddresses.length > 0 && (
                  <select
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-lg p-2.5 text-xs text-slate-800 focus:border-blue-500 outline-none"
                  >
                    <option value="">Select an address or type below...</option>
                    {customer.deliveryAddresses.map((addr: string, i: number) => (
                      <option key={i} value={addr}>{addr}</option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Or enter new delivery address manually..."
                  className="w-full bg-white border border-slate-250 rounded-lg p-2.5 text-xs text-slate-800 focus:border-blue-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* Products Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase font-mono border-b border-slate-100 pb-2">Order Line Items</h3>
            
            {/* Current Items */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">SKU</th>
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold text-right">Price</th>
                    <th className="px-4 py-3 font-semibold text-center">Qty</th>
                    <th className="px-4 py-3 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((item) => (
                    <tr key={item.sku} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-800">{item.sku}</td>
                      <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]" title={item.productName}>{item.productName}</td>
                      <td className="px-4 py-3 text-right text-slate-700">${item.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => {
                            const q = parseInt(e.target.value, 10);
                            if (!isNaN(q) && q > 0) {
                              setItems(prev => prev.map(i => i.sku === item.sku ? { ...i, qty: q } : i));
                            }
                          }}
                          className="w-16 text-center border border-slate-200 rounded p-1 text-xs"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleRemoveItem(item.sku)}
                          className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500 italic">No items in order.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Add Item */}
            <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">Add Product</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full border border-slate-250 rounded p-2 text-xs"
                >
                  <option value="">Select a product to add...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.sku} - {p.name} (${p.price.toFixed(2)})</option>
                  ))}
                </select>
              </div>
              <div className="w-24 space-y-1.5">
                <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">Qty</label>
                <input
                  type="number"
                  min="1"
                  value={newQty}
                  onChange={(e) => setNewQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full border border-slate-250 rounded p-2 text-xs"
                />
              </div>
              <button
                onClick={handleAddItem}
                disabled={!selectedProductId || newQty < 1}
                className="bg-blue-600 disabled:bg-blue-300 text-white p-2 rounded hover:bg-blue-700 transition"
                title="Add Item"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 uppercase"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting || items.length === 0 || (!ownTransport && !deliveryAddress.trim())}
            className="px-6 py-2 text-xs font-bold text-white bg-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-700 uppercase flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
};
