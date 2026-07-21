import React, { useState, useEffect } from "react";
import { X, Upload } from "lucide-react";
import { Product } from "../types";
import { usePortal } from "../context/PortalContext";

interface EditProductModalProps {
  product: Product;
  onClose: () => void;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({ product, onClose }) => {
  const { updateProduct } = usePortal();

  const [editProdForm, setEditProdForm] = useState<Omit<Product, "id">>({
    name: product.name,
    sku: product.sku,
    description: product.description,
    imageUrl: product.imageUrl,
    baseWholesalePrice: product.baseWholesalePrice,
    isRestricted: product.isRestricted,
    autoApprove: product.autoApprove ?? false,
    quantityBreaks: product.quantityBreaks ? [...product.quantityBreaks] : [],
    category: product.category || "General",
    stock: product.stock ?? 0,
    allowBackorders: product.allowBackorders ?? true,
    colors: product.colors ? [...product.colors] : [],
    rateBreaks: product.rateBreaks ? [...product.rateBreaks] : [],
    weightKg: product.weightKg,
    lengthCm: product.lengthCm,
    widthCm: product.widthCm,
    heightCm: product.heightCm,
  });

  const [editProdPreviewUrl, setEditProdPreviewUrl] = useState<string | null>(
    product.imageUrl && product.imageUrl !== "placeholder" ? product.imageUrl : null
  );
  
  const [editProdQbQty, setEditProdQbQty] = useState(10);
  const [editProdQbValueType, setEditProdQbValueType] = useState<"percentage" | "fixed">("percentage");
  const [editProdQbValue, setEditProdQbValue] = useState(5);
  const [editProdColorInput, setEditProdColorInput] = useState("");
  const [isSavingEditedProduct, setIsSavingEditedProduct] = useState(false);

  // Rate breaks logic
  const [selectedRateBreakIndex, setSelectedRateBreakIndex] = useState<number | null>(null);
  const [rateBreakName, setRateBreakName] = useState("");
  const [rateBreakQbQty, setRateBreakQbQty] = useState(10);
  const [rateBreakQbValueType, setRateBreakQbValueType] = useState<"percentage" | "fixed">("percentage");
  const [rateBreakQbValue, setRateBreakQbValue] = useState(5);
  const [rateBreakQuantityBreaks, setRateBreakQuantityBreaks] = useState<any[]>([]);

  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setEditProdForm(prev => ({ ...prev, imageUrl: result }));
      setEditProdPreviewUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleAddEditQtyBreak = () => {
    if (editProdQbQty <= 1 || editProdQbValue < 0) return;
    setEditProdForm(prev => ({
      ...prev,
      quantityBreaks: [...(prev.quantityBreaks || []), {
        minQty: editProdQbQty,
        discountType: editProdQbValueType,
        discountValue: editProdQbValue,
      }].sort((a, b) => a.minQty - b.minQty)
    }));
    setEditProdQbQty(10);
    setEditProdQbValue(5);
  };

  const handleRemoveEditQtyBreak = (index: number) => {
    setEditProdForm(prev => ({
      ...prev,
      quantityBreaks: (prev.quantityBreaks || []).filter((_, i) => i !== index)
    }));
  };

  const handleAddEditColor = () => {
    const nextColor = editProdColorInput.trim();
    if (!nextColor) return;
    setEditProdForm(prev => ({
      ...prev,
      colors: Array.from(new Set([...(prev.colors || []), nextColor]))
    }));
    setEditProdColorInput("");
  };

  const handleRemoveEditColor = (color: string) => {
    setEditProdForm(prev => ({
      ...prev,
      colors: (prev.colors || []).filter(existing => existing !== color)
    }));
  };

  const handleAddRateBreakQtyBreak = () => {
    setRateBreakQuantityBreaks(prev => [
      ...prev,
      {
        minQty: rateBreakQbQty,
        discountType: rateBreakQbValueType,
        discountValue: rateBreakQbValue
      }
    ].sort((a, b) => a.minQty - b.minQty));
    setRateBreakQbQty(10);
    setRateBreakQbValue(5);
  };

  const handleRemoveRateBreakQtyBreak = (idx: number) => {
    setRateBreakQuantityBreaks(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveRateBreak = () => {
    if (!rateBreakName.trim()) return;
    const updatedRateBreaks = [...(editProdForm.rateBreaks || [])];
    const newRateBreak = {
      id: selectedRateBreakIndex === -1 ? `prb_${Math.random().toString(36).substr(2, 9)}` : (updatedRateBreaks[selectedRateBreakIndex!]?.id || `prb_${Math.random().toString(36).substr(2, 9)}`),
      name: rateBreakName,
      quantityBreaks: rateBreakQuantityBreaks
    };

    if (selectedRateBreakIndex === -1) {
      updatedRateBreaks.push(newRateBreak);
    } else if (selectedRateBreakIndex !== null) {
      updatedRateBreaks[selectedRateBreakIndex] = newRateBreak;
    }

    setEditProdForm(prev => ({
      ...prev,
      rateBreaks: updatedRateBreaks
    }));
    setSelectedRateBreakIndex(null);
    setRateBreakName("");
    setRateBreakQuantityBreaks([]);
  };

  const handleDeleteRateBreak = (index: number) => {
    setEditProdForm(prev => ({
      ...prev,
      rateBreaks: (prev.rateBreaks || []).filter((_, i) => i !== index)
    }));
  };

  const handleSaveEditedProduct = async () => {
    if (!editProdForm.name.trim() || !editProdForm.sku.trim()) return;

    setIsSavingEditedProduct(true);
    try {
      await updateProduct(product.id, {
        ...editProdForm,
        quantityBreaks: editProdForm.quantityBreaks && editProdForm.quantityBreaks.length > 0 ? [...editProdForm.quantityBreaks] : [],
        colors: editProdForm.colors && editProdForm.colors.length > 0 ? [...editProdForm.colors] : [],
        rateBreaks: editProdForm.rateBreaks && editProdForm.rateBreaks.length > 0 ? [...editProdForm.rateBreaks] : [],
      });
      onClose();
    } finally {
      setIsSavingEditedProduct(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-4 p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Edit Product: {product.name}</h3>
            <p className="text-xs text-slate-500 uppercase font-mono mt-1">Update all product fields in one place</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Product Name</label>
                  <input value={editProdForm.name} onChange={(e) => setEditProdForm(prev => ({ ...prev, name: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">SKU</label>
                  <input value={editProdForm.sku} onChange={(e) => setEditProdForm(prev => ({ ...prev, sku: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Description</label>
                <textarea value={editProdForm.description} onChange={(e) => setEditProdForm(prev => ({ ...prev, description: e.target.value }))} className="w-full min-h-[112px] bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Base Wholesale Price</label>
                  <input type="number" min="0" step="0.01" value={editProdForm.baseWholesalePrice} onChange={(e) => setEditProdForm(prev => ({ ...prev, baseWholesalePrice: Math.max(0, parseFloat(e.target.value) || 0) }))} className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Stock</label>
                  <input type="number" min="0" value={editProdForm.stock ?? 0} onChange={(e) => setEditProdForm(prev => ({ ...prev, stock: Math.max(0, parseInt(e.target.value) || 0) }))} className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Category</label>
                  <input value={editProdForm.category || ""} onChange={(e) => setEditProdForm(prev => ({ ...prev, category: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Weight (kg)</label>
                  <input type="number" min="0" step="0.1" value={editProdForm.weightKg ?? 0} onChange={(e) => setEditProdForm(prev => ({ ...prev, weightKg: Math.max(0, parseFloat(e.target.value) || 0) }))} className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Length (cm)</label>
                  <input type="number" min="0" step="0.1" value={editProdForm.lengthCm ?? 0} onChange={(e) => setEditProdForm(prev => ({ ...prev, lengthCm: Math.max(0, parseFloat(e.target.value) || 0) }))} className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Width (cm)</label>
                  <input type="number" min="0" step="0.1" value={editProdForm.widthCm ?? 0} onChange={(e) => setEditProdForm(prev => ({ ...prev, widthCm: Math.max(0, parseFloat(e.target.value) || 0) }))} className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Height (cm)</label>
                  <input type="number" min="0" step="0.1" value={editProdForm.heightCm ?? 0} onChange={(e) => setEditProdForm(prev => ({ ...prev, heightCm: Math.max(0, parseFloat(e.target.value) || 0) }))} className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Image</label>
                <div className="flex flex-col md:flex-row gap-3 md:items-start">
                  <div className="flex-1 space-y-2">
                    <div className="relative">
                      <input type="file" accept="image/png, image/jpeg, image/webp" onChange={handleEditImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-medium flex items-center justify-center gap-2 hover:bg-slate-100 transition cursor-pointer">
                        <Upload className="w-4 h-4 text-blue-600" />
                        <span className="text-slate-600">Upload image</span>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={editProdForm.imageUrl}
                      onChange={(e) => {
                        setEditProdForm(prev => ({ ...prev, imageUrl: e.target.value }));
                        setEditProdPreviewUrl(e.target.value);
                      }}
                      placeholder="Paste image URL or base64 data"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-[10px] text-slate-800 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="w-28 h-28 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center flex-shrink-0">
                    {editProdPreviewUrl && editProdPreviewUrl !== "placeholder" ? (
                      <img src={editProdPreviewUrl} alt="Product preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono uppercase text-center px-2">No image</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-[10px] font-mono text-slate-500 uppercase font-semibold tracking-wider border-b border-slate-200 pb-2">Switches</p>
                <label className="flex items-center justify-between gap-4 text-xs font-semibold text-slate-700">
                  Restricted
                  <input type="checkbox" checked={editProdForm.isRestricted} onChange={(e) => setEditProdForm(prev => ({ ...prev, isRestricted: e.target.checked }))} className="w-5 h-5 accent-blue-600" />
                </label>
                <label className="flex items-center justify-between gap-4 text-xs font-semibold text-slate-700">
                  Auto Approve
                  <input type="checkbox" checked={editProdForm.autoApprove ?? false} onChange={(e) => setEditProdForm(prev => ({ ...prev, autoApprove: e.target.checked }))} className="w-5 h-5 accent-blue-600" />
                </label>
                <label className="flex items-center justify-between gap-4 text-xs font-semibold text-slate-700">
                  Allow Backorders
                  <input type="checkbox" checked={editProdForm.allowBackorders ?? true} onChange={(e) => setEditProdForm(prev => ({ ...prev, allowBackorders: e.target.checked }))} className="w-5 h-5 accent-blue-600" />
                </label>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-[10px] font-mono text-slate-500 uppercase font-semibold tracking-wider border-b border-slate-200 pb-2">Colors</p>
                <div className="flex gap-2">
                  <input
                    value={editProdColorInput}
                    onChange={(e) => setEditProdColorInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddEditColor();
                      }
                    }}
                    placeholder="Add color"
                    className="flex-1 bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                  <button type="button" onClick={handleAddEditColor} className="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-lg text-xs font-bold uppercase">Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(editProdForm.colors || []).length === 0 ? (
                    <span className="text-[10px] text-slate-400 font-mono uppercase">No colors set</span>
                  ) : (editProdForm.colors || []).map((color) => (
                    <button key={color} type="button" onClick={() => handleRemoveEditColor(color)} className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-semibold text-slate-700 hover:border-red-300 hover:text-red-700">
                      {color} ×
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <p className="text-[10px] font-mono text-slate-500 uppercase font-semibold tracking-wider border-b border-slate-200 pb-2">Quantity Breaks</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input type="number" min="2" value={editProdQbQty} onChange={(e) => setEditProdQbQty(Math.max(2, parseInt(e.target.value) || 2))} className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-blue-500" />
                <select value={editProdQbValueType} onChange={(e) => setEditProdQbValueType(e.target.value as "percentage" | "fixed")} className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-blue-500">
                  <option value="percentage">% Off</option>
                  <option value="fixed">Fixed $</option>
                </select>
                <input type="number" min="0" step="0.01" value={editProdQbValue} onChange={(e) => setEditProdQbValue(Math.max(0, parseFloat(e.target.value) || 0))} className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-blue-500" />
                <button type="button" onClick={handleAddEditQtyBreak} className="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-lg text-xs font-bold uppercase">Add</button>
              </div>
              <div className="space-y-2">
                {(editProdForm.quantityBreaks || []).length === 0 ? (
                  <p className="text-[10px] text-slate-400 font-mono uppercase">No quantity breaks set</p>
                ) : (editProdForm.quantityBreaks || []).map((qb, index) => (
                  <div key={`${qb.minQty}-${index}`} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono">
                    <span>Qty {qb.minQty}+ {qb.discountType === "fixed" ? `$${qb.discountValue}` : `${qb.discountValue}%`} off</span>
                    <button type="button" onClick={() => handleRemoveEditQtyBreak(index)} className="text-red-600 font-bold">✕</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <p className="text-[10px] font-mono text-slate-500 uppercase font-semibold tracking-wider border-b border-slate-200 pb-2">Summary</p>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <p className="text-slate-500 uppercase text-[10px] font-semibold">Category</p>
                  <p className="text-slate-800 font-bold mt-1">{editProdForm.category || "General"}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <p className="text-slate-500 uppercase text-[10px] font-semibold">Image Source</p>
                  <p className="text-slate-800 font-bold mt-1 truncate">{editProdForm.imageUrl ? "Set" : "None"}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <p className="text-slate-500 uppercase text-[10px] font-semibold">Backorders</p>
                  <p className="text-slate-800 font-bold mt-1">{editProdForm.allowBackorders ? "Enabled" : "Disabled"}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <p className="text-slate-500 uppercase text-[10px] font-semibold">Qty Breaks</p>
                  <p className="text-slate-800 font-bold mt-1">{editProdForm.quantityBreaks?.length || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rate Breaks Editor Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <p className="text-[10px] font-mono text-slate-500 uppercase font-semibold tracking-wider">Product-Specific Rate Breaks (Max 6)</p>
              {selectedRateBreakIndex === null && (
                <button
                  type="button"
                  disabled={(editProdForm.rateBreaks || []).length >= 6}
                  onClick={() => {
                    setSelectedRateBreakIndex(-1);
                    setRateBreakName("");
                    setRateBreakQuantityBreaks([]);
                  }}
                  className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                >
                  + Add Rate Break
                </button>
              )}
            </div>

            {selectedRateBreakIndex !== null ? (
              <div className="space-y-3 bg-white p-4 border border-slate-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                    {selectedRateBreakIndex === -1 ? "New Custom Rate Break" : `Editing Rate Break #${selectedRateBreakIndex + 1}`}
                  </h4>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Rate Break Name</label>
                  <input
                    type="text"
                    placeholder="e.g. VIP Tier 1"
                    value={rateBreakName}
                    onChange={(e) => setRateBreakName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Add Quantity Break Tier</label>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input
                      type="number"
                      min="2"
                      value={rateBreakQbQty}
                      onChange={(e) => setRateBreakQbQty(Math.max(2, parseInt(e.target.value) || 2))}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-blue-500"
                      placeholder="Min Qty"
                    />
                    <select
                      value={rateBreakQbValueType}
                      onChange={(e) => setRateBreakQbValueType(e.target.value as "percentage" | "fixed")}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-blue-500"
                    >
                      <option value="percentage">% Off</option>
                      <option value="fixed">Fixed $</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={rateBreakQbValue}
                      onChange={(e) => setRateBreakQbValue(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-blue-500"
                      placeholder="Value"
                    />
                    <button
                      type="button"
                      onClick={handleAddRateBreakQtyBreak}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-lg text-xs font-bold uppercase"
                    >
                      Add Tier
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {rateBreakQuantityBreaks.length === 0 ? (
                    <p className="text-[10px] text-slate-400 font-mono uppercase">No quantity breaks added yet</p>
                  ) : (
                    rateBreakQuantityBreaks.map((qb, index) => (
                      <div key={`${qb.minQty}-${index}`} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono">
                        <span>Qty {qb.minQty}+ {qb.discountType === "fixed" ? `$${qb.discountValue}` : `${qb.discountValue}%`} off</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRateBreakQtyBreak(index)}
                          className="text-red-600 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedRateBreakIndex(null)}
                    className="px-3 py-1.5 rounded border border-slate-200 text-slate-650 hover:bg-slate-50 text-[10px] font-bold uppercase tracking-wider font-mono"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveRateBreak}
                    disabled={!rateBreakName.trim()}
                    className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 font-mono"
                  >
                    Save Rate Break
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(editProdForm.rateBreaks || []).length === 0 ? (
                  <p className="text-[10px] text-slate-400 font-mono uppercase py-2">No product-specific rate breaks configured</p>
                ) : (
                  (editProdForm.rateBreaks || []).map((rb, index) => (
                    <div key={rb.id} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center text-xs font-mono">
                      <div>
                        <p className="font-bold text-slate-800">{rb.name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{rb.quantityBreaks.length} quantity breaks</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRateBreakIndex(index);
                            setRateBreakName(rb.name);
                            setRateBreakQuantityBreaks(rb.quantityBreaks ? [...rb.quantityBreaks] : []);
                          }}
                          className="text-blue-600 font-bold hover:underline"
                        >
                          EDIT
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRateBreak(index)}
                          className="text-red-650 font-bold hover:underline"
                        >
                          DELETE
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold uppercase tracking-wider">
              Cancel
            </button>
            <button type="button" onClick={handleSaveEditedProduct} disabled={isSavingEditedProduct || !editProdForm.name.trim() || !editProdForm.sku.trim()} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold uppercase tracking-wider disabled:opacity-50">
              {isSavingEditedProduct ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
