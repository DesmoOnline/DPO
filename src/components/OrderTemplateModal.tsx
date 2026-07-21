import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useToast } from './ui/ToastContext';
import { OrderItem, Product } from '../types';
import { Bookmark, Play, Trash2 } from 'lucide-react';

export interface OrderTemplate {
  id: string;
  name: string;
  createdAt: string;
  items: OrderItem[];
}

interface OrderTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCartItems: OrderItem[];
  products: Product[];
  onLoadTemplate: (items: OrderItem[]) => void;
}

export const OrderTemplateModal: React.FC<OrderTemplateModalProps> = ({
  isOpen,
  onClose,
  currentCartItems,
  onLoadTemplate,
}) => {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<OrderTemplate[]>([]);
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('desmo_order_templates');
    if (saved) {
      try {
        setTemplates(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse order templates', e);
      }
    }
  }, [isOpen]);

  const saveTemplatesToStorage = (updated: OrderTemplate[]) => {
    setTemplates(updated);
    localStorage.setItem('desmo_order_templates', JSON.stringify(updated));
  };

  const handleSaveCurrentCart = () => {
    if (!templateName.trim()) {
      showToast('Template Name Required', 'Please enter a name for this template.', 'warning');
      return;
    }
    if (currentCartItems.length === 0) {
      showToast('Empty Cart', 'Add items to your cart before saving a template.', 'warning');
      return;
    }

    const newTemplate: OrderTemplate = {
      id: Date.now().toString(),
      name: templateName.trim(),
      createdAt: new Date().toLocaleDateString(),
      items: [...currentCartItems],
    };

    const updated = [newTemplate, ...templates];
    saveTemplatesToStorage(updated);
    setTemplateName('');
    showToast('Template Saved', `"${newTemplate.name}" template saved successfully.`, 'success');
  };

  const handleApplyTemplate = (template: OrderTemplate) => {
    onLoadTemplate(template.items);
    showToast('Template Loaded', `Loaded ${template.items.length} line items into cart.`, 'success');
    onClose();
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    saveTemplatesToStorage(updated);
    showToast('Template Deleted', 'Order template removed.', 'info');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Order Templates & Reorder Lists" maxWidth="xl">
      <div className="space-y-6">
        {/* Create template section */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Save Current Cart As Template</h4>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Weekly Warehouse Restock"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={handleSaveCurrentCart} leftIcon={<Bookmark className="w-4 h-4" />}>
              Save
            </Button>
          </div>
        </div>

        {/* Existing Templates */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Saved Templates</h4>
          {templates.length === 0 ? (
            <p className="text-sm text-slate-500 italic py-4 text-center">No order templates saved yet.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-blue-400 transition-colors"
                >
                  <div>
                    <h5 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{tpl.name}</h5>
                    <p className="text-xs text-slate-500">
                      {tpl.items.length} items • Created {tpl.createdAt}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApplyTemplate(tpl)}
                      leftIcon={<Play className="w-3.5 h-3.5 text-blue-600" />}
                    >
                      Load Cart
                    </Button>
                    <button
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-lg"
                      title="Delete Template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
