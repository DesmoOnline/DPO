import React, { useState, useEffect } from "react";
import { WeightBreakTemplate, QuantityBreak } from "../types";
import {
  getAllWeightBreakTemplates,
  createWeightBreakTemplate,
  updateWeightBreakTemplate,
  deleteWeightBreakTemplate,
} from "../utils/weightBreakUtils";
import { Plus, Edit2, Trash2, Save, X } from "lucide-react";

interface WeightBreakManagerProps {
  onClose?: () => void;
}

export const WeightBreakManager: React.FC<WeightBreakManagerProps> = ({ onClose }) => {
  const [templates, setTemplates] = useState<WeightBreakTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<
    Omit<WeightBreakTemplate, "id" | "createdAt" | "updatedAt" | "createdBy">
  >({
    name: "",
    description: "",
    quantityBreaks: [],
  });
  const [newBreakQty, setNewBreakQty] = useState(1);
  const [newBreakType, setNewBreakType] = useState<"percentage" | "fixed">("percentage");
  const [newBreakValue, setNewBreakValue] = useState(0);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await getAllWeightBreakTemplates();
      setTemplates(data);
    } catch (error) {
      console.error("Failed to load weight break templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setFormData({
      name: "",
      description: "",
      quantityBreaks: [],
    });
    setNewBreakQty(1);
    setNewBreakValue(0);
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (template: WeightBreakTemplate) => {
    setFormData({
      name: template.name,
      description: template.description,
      quantityBreaks: JSON.parse(JSON.stringify(template.quantityBreaks)),
    });
    setEditingId(template.id);
    setShowForm(true);
  };

  const handleAddBreak = () => {
    if (newBreakQty < 1 || newBreakValue < 0) return;
    
    const newBreak: QuantityBreak = {
      minQty: newBreakQty,
      discountType: newBreakType,
      discountValue: newBreakValue,
    };

    setFormData(prev => ({
      ...prev,
      quantityBreaks: [...prev.quantityBreaks, newBreak].sort((a, b) => a.minQty - b.minQty),
    }));

    setNewBreakQty(1);
    setNewBreakValue(0);
  };

  const handleRemoveBreak = (index: number) => {
    setFormData(prev => ({
      ...prev,
      quantityBreaks: prev.quantityBreaks.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    try {
      if (!formData.name.trim()) {
        alert("Template name is required");
        return;
      }
      if (formData.quantityBreaks.length === 0) {
        alert("At least one quantity break is required");
        return;
      }

      const userId = "admin"; // In real app, get from auth context

      if (editingId) {
        await updateWeightBreakTemplate(editingId, {
          ...formData,
        });
      } else {
        if (templates.length >= 10) {
          alert("Maximum 10 rate break templates allowed");
          return;
        }
        await createWeightBreakTemplate(formData, userId);
      }

      await loadTemplates();
      setShowForm(false);
      setEditingId(null);
    } catch (error) {
      console.error("Failed to save template:", error);
      alert("Failed to save template");
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!window.confirm("Are you sure? This will be removed from all customers.")) {
      return;
    }

    try {
      await deleteWeightBreakTemplate(templateId);
      await loadTemplates();
    } catch (error) {
      console.error("Failed to delete template:", error);
      alert("Failed to delete template");
    }
  };

  if (loading) {
    return <div className="p-4">Loading rate break templates...</div>;
  }

  return (
    <div className="p-6 bg-gray-50 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Rate Break Templates</h2>
          <p className="text-sm text-gray-500 mt-1">Create up to 10 quantity-based pricing tiers</p>
        </div>
        <button
          onClick={handleNew}
          disabled={templates.length >= 10}
          className={`${templates.length >= 10 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-2 rounded-lg flex items-center gap-2 transition`}
          title={templates.length >= 10 ? "Maximum 10 templates reached" : ""}
        >
          <Plus size={20} />
          New Template ({templates.length}/10)
        </button>
      </div>

      {showForm && (
        <WeightBreakForm
          formData={formData}
          setFormData={setFormData}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingId(null);
          }}
          isEditing={!!editingId}
          newBreakQty={newBreakQty}
          setNewBreakQty={setNewBreakQty}
          newBreakType={newBreakType}
          setNewBreakType={setNewBreakType}
          newBreakValue={newBreakValue}
          setNewBreakValue={setNewBreakValue}
          onAddBreak={handleAddBreak}
          onRemoveBreak={handleRemoveBreak}
        />
      )}

      {templates.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No rate break templates yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white p-4 rounded-lg shadow border border-gray-200"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(template)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">Quantity Breaks:</p>
                <div className="space-y-1">
                  {template.quantityBreaks.map((qb, i) => (
                    <p key={i} className="text-xs text-gray-600 font-mono">
                      Qty {qb.minQty}+: {qb.discountType === "fixed" ? `$${qb.discountValue}` : `${qb.discountValue}%`} off
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface WeightBreakFormProps {
  formData: Omit<WeightBreakTemplate, "id" | "createdAt" | "updatedAt" | "createdBy">;
  setFormData: React.Dispatch<
    React.SetStateAction<Omit<WeightBreakTemplate, "id" | "createdAt" | "updatedAt" | "createdBy">>
  >;
  onSave: () => void;
  onCancel: () => void;
  isEditing: boolean;
  newBreakQty: number;
  setNewBreakQty: (qty: number) => void;
  newBreakType: "percentage" | "fixed";
  setNewBreakType: (type: "percentage" | "fixed") => void;
  newBreakValue: number;
  setNewBreakValue: (value: number) => void;
  onAddBreak: () => void;
  onRemoveBreak: (index: number) => void;
}

const WeightBreakForm: React.FC<WeightBreakFormProps> = ({
  formData,
  setFormData,
  onSave,
  onCancel,
  isEditing,
  newBreakQty,
  setNewBreakQty,
  newBreakType,
  setNewBreakType,
  newBreakValue,
  setNewBreakValue,
  onAddBreak,
  onRemoveBreak,
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6 border border-gray-200">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        {isEditing ? "Edit Template" : "New Template"}
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Template Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g., Tier 1 - Starter"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            value={formData.description || ""}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g., Small volume orders with standard pricing"
            rows={2}
          />
        </div>

        {/* Quantity Breaks Editor */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm font-semibold text-gray-700 mb-3">Add Quantity Break</p>
          
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Min Qty</label>
              <input
                type="number"
                min="1"
                value={newBreakQty}
                onChange={(e) => setNewBreakQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={newBreakType}
                onChange={(e) => setNewBreakType(e.target.value as "percentage" | "fixed")}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="percentage">% Off</option>
                <option value="fixed">Fixed $</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Value</label>
              <input
                type="number"
                min="0"
                value={newBreakValue}
                onChange={(e) => setNewBreakValue(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={onAddBreak}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-semibold transition"
              >
                Add
              </button>
            </div>
          </div>

          {formData.quantityBreaks.length > 0 && (
            <div className="space-y-2 border-t border-blue-200 pt-3">
              {formData.quantityBreaks.map((qb, i) => (
                <div key={i} className="flex justify-between items-center bg-white p-2 rounded text-sm">
                  <span className="font-mono text-gray-700">
                    Qty {qb.minQty}+: {qb.discountType === "fixed" ? `$${qb.discountValue}` : `${qb.discountValue}%`} off
                  </span>
                  <button
                    onClick={() => onRemoveBreak(i)}
                    className="text-red-600 hover:text-red-800 font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 flex items-center gap-2 transition"
          >
            <X size={18} />
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition"
          >
            <Save size={18} />
            {isEditing ? "Update" : "Create"} Template
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeightBreakManager;
