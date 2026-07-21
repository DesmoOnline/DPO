import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useToast } from './ui/ToastContext';
import { Product } from '../types';
import { Zap, Plus, Trash2, Upload } from 'lucide-react';

interface QuickOrderItem {
  sku: string;
  qty: number;
}

interface QuickOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onAddToCart: (product: Product, qty: number) => void;
}

export const QuickOrderModal: React.FC<QuickOrderModalProps> = ({
  isOpen,
  onClose,
  products,
  onAddToCart,
}) => {
  const { showToast } = useToast();
  const [items, setItems] = useState<QuickOrderItem[]>([
    { sku: '', qty: 1 },
    { sku: '', qty: 1 },
    { sku: '', qty: 1 },
  ]);
  const [csvText, setCsvText] = useState('');
  const [mode, setMode] = useState<'form' | 'csv'>('form');

  const handleRowChange = (index: number, field: 'sku' | 'qty', value: string | number) => {
    const next = [...items];
    if (field === 'sku') next[index].sku = value as string;
    if (field === 'qty') next[index].qty = Math.max(1, Number(value) || 1);
    setItems(next);
  };

  const handleAddRow = () => {
    setItems([...items, { sku: '', qty: 1 }]);
  };

  const handleRemoveRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleProcessForm = () => {
    let addedCount = 0;
    let notFoundSKUs: string[] = [];

    items.forEach((item) => {
      const trimmed = item.sku.trim().toUpperCase();
      if (!trimmed) return;

      const found = products.find((p) => p.sku.toUpperCase() === trimmed || p.name.toUpperCase().includes(trimmed));
      if (found) {
        onAddToCart(found, item.qty);
        addedCount++;
      } else {
        notFoundSKUs.push(item.sku);
      }
    });

    if (addedCount > 0) {
      showToast('Quick Order Complete', `Added ${addedCount} items to cart.`, 'success');
      onClose();
    }

    if (notFoundSKUs.length > 0) {
      showToast('SKU Warning', `Could not find products for SKUs: ${notFoundSKUs.join(', ')}`, 'warning');
    }
  };

  const handleProcessCSV = () => {
    const lines = csvText.split('\n');
    let addedCount = 0;

    lines.forEach((line) => {
      const parts = line.split(/[,;\t]/).map((p) => p.trim());
      if (parts.length >= 2) {
        const sku = parts[0].toUpperCase();
        const qty = parseInt(parts[1], 10) || 1;
        const found = products.find((p) => p.sku.toUpperCase() === sku);
        if (found) {
          onAddToCart(found, qty);
          addedCount++;
        }
      }
    });

    if (addedCount > 0) {
      showToast('CSV Imported', `Added ${addedCount} line items from CSV to cart.`, 'success');
      onClose();
    } else {
      showToast('Import Failed', 'No matching SKUs found in CSV input.', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quick Order (Bulk SKU Entry)" maxWidth="2xl">
      <div className="space-y-4">
        {/* Toggle Mode */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 pb-3 gap-4">
          <button
            onClick={() => setMode('form')}
            className={`text-sm font-semibold pb-1 transition-colors border-b-2 ${
              mode === 'form'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Manual SKU List
          </button>
          <button
            onClick={() => setMode('csv')}
            className={`text-sm font-semibold pb-1 transition-colors border-b-2 ${
              mode === 'csv'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Paste CSV / Excel
          </button>
        </div>

        {mode === 'form' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-3 text-xs font-bold text-slate-500 uppercase">
              <div className="col-span-7">SKU / Item Code</div>
              <div className="col-span-4">Quantity</div>
              <div className="col-span-1"></div>
            </div>

            {items.map((row, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                <input
                  type="text"
                  placeholder="e.g. DES-1002"
                  value={row.sku}
                  onChange={(e) => handleRowChange(idx, 'sku', e.target.value)}
                  className="col-span-7 px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white uppercase font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                  type="number"
                  min="1"
                  value={row.qty}
                  onChange={(e) => handleRowChange(idx, 'qty', e.target.value)}
                  className="col-span-4 px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={() => handleRemoveRow(idx)}
                  className="col-span-1 p-2 text-slate-400 hover:text-rose-600 rounded-lg"
                  disabled={items.length <= 1}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            <div className="pt-2 flex justify-between">
              <Button variant="outline" size="sm" onClick={handleAddRow} leftIcon={<Plus className="w-4 h-4" />}>
                Add Line Item
              </Button>
              <Button onClick={handleProcessForm} leftIcon={<Zap className="w-4 h-4" />}>
                Add All To Cart
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Paste lines formatted as <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">SKU, QUANTITY</code> (one item per line).
            </p>
            <textarea
              rows={6}
              placeholder="DES-1001, 10&#10;DES-1002, 50&#10;DES-1003, 5"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full p-3 font-mono text-sm border border-slate-300 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <div className="flex justify-end">
              <Button onClick={handleProcessCSV} leftIcon={<Upload className="w-4 h-4" />}>
                Import CSV Lines
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
