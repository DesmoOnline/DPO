import React, { useState, useEffect } from "react";
import { RateBreakProfile, QuantityBreak } from "../types";
import {
  getAllRateBreakProfiles,
  createRateBreakProfile,
  updateRateBreakProfile,
  deleteRateBreakProfile,
} from "../utils/rateBreakProfileUtils";
import { Plus, Edit2, Trash2, Save, X } from "lucide-react";

interface RateBreakProfileManagerProps {
  onClose?: () => void;
}

export const RateBreakProfileManager: React.FC<RateBreakProfileManagerProps> = ({
  onClose,
}) => {
  const [profiles, setProfiles] = useState<RateBreakProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<
    Omit<RateBreakProfile, "id" | "createdAt" | "updatedAt" | "createdBy">
  >({
    name: "",
    description: "",
    productBreaks: {},
  });

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const data = await getAllRateBreakProfiles();
      setProfiles(data);
    } catch (error) {
      console.error("Failed to load rate break profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setFormData({
      name: "",
      description: "",
      productBreaks: {},
    });
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (profile: RateBreakProfile) => {
    setFormData({
      name: profile.name,
      description: profile.description,
      productBreaks: JSON.parse(JSON.stringify(profile.productBreaks)),
    });
    setEditingId(profile.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.name.trim()) {
        alert("Profile name is required");
        return;
      }

      const now = new Date().toISOString();
      const userId = "admin"; // In real app, get from auth context

      if (editingId) {
        await updateRateBreakProfile(editingId, {
          ...formData,
          updatedAt: now,
        });
      } else {
        await createRateBreakProfile(
          {
            ...formData,
            createdAt: now,
            updatedAt: now,
            createdBy: userId,
          },
          userId
        );
      }

      await loadProfiles();
      setShowForm(false);
      setEditingId(null);
    } catch (error) {
      console.error("Failed to save profile:", error);
      alert("Failed to save profile");
    }
  };

  const handleDelete = async (profileId: string) => {
    if (!window.confirm("Are you sure you want to delete this profile?")) {
      return;
    }

    try {
      await deleteRateBreakProfile(profileId);
      await loadProfiles();
    } catch (error) {
      console.error("Failed to delete profile:", error);
      alert("Failed to delete profile");
    }
  };

  if (loading) {
    return <div className="p-4">Loading rate break profiles...</div>;
  }

  return (
    <div className="p-6 bg-gray-50 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Rate Break Profiles
        </h2>
        <button
          onClick={handleNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} />
          New Profile
        </button>
      </div>

      {showForm && (
        <RateBreakProfileForm
          formData={formData}
          setFormData={setFormData}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingId(null);
          }}
          isEditing={!!editingId}
        />
      )}

      {profiles.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No rate break profiles yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="bg-white p-4 rounded-lg shadow border border-gray-200"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">
                    {profile.name}
                  </h3>
                  {profile.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {profile.description}
                    </p>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    Products configured:{" "}
                    {Object.keys(profile.productBreaks).length}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(profile)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(profile.id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface RateBreakProfileFormProps {
  formData: Omit<
    RateBreakProfile,
    "id" | "createdAt" | "updatedAt" | "createdBy"
  >;
  setFormData: React.Dispatch<
    React.SetStateAction<
      Omit<RateBreakProfile, "id" | "createdAt" | "updatedAt" | "createdBy">
    >
  >;
  onSave: () => void;
  onCancel: () => void;
  isEditing: boolean;
}

const RateBreakProfileForm: React.FC<RateBreakProfileFormProps> = ({
  formData,
  setFormData,
  onSave,
  onCancel,
  isEditing,
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6 border border-gray-200">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        {isEditing ? "Edit Profile" : "New Profile"}
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Profile Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g., Wholesale Partner"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            value={formData.description || ""}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g., Standard wholesale pricing for regular partners"
            rows={3}
          />
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            ℹ️ Note: Product-specific rate breaks can be configured through the
            main product management interface and assigned to this profile.
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 flex items-center gap-2"
          >
            <X size={18} />
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Save size={18} />
            {isEditing ? "Update" : "Create"} Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default RateBreakProfileManager;
