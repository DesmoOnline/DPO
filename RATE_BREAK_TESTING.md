# Rate Break Profiles - Testing & Integration Guide

## ✅ Completed Setup

All Option 1 (Rate Break Profiles) components have been successfully implemented:

### 1. **Type Definitions** ✓
- Added `RateBreakProfile` interface with full pricing structure
- Updated `CustomerProfile` to include `rateBreakProfileId` field
- File: [src/types.ts](src/types.ts)

### 2. **Database Schema** ✓
- Added `RateBreakProfile` collection definition
- Added `/rateBreakProfiles/{profileId}` collection path
- Files: `firebase-blueprint.json`, `firestore.rules`

### 3. **Admin Dashboard Integration** ✓
- Added "Rate Break Profiles" tab to AdminDashboard
- Added Rate Break Profile Manager component
- Added rate break profile selector in customer edit panel
- File: [src/components/AdminDashboard.tsx](src/components/AdminDashboard.tsx)

### 4. **Price Calculation** ✓
- Updated CartView to load and apply rate break profiles
- Rate break profiles take priority over product quantity breaks
- File: [src/components/CartView.tsx](src/components/CartView.tsx)

### 5. **Utility Functions** ✓
- `createRateBreakProfile()` - Create new profile
- `getRateBreakProfile()` - Fetch profile by ID
- `getAllRateBreakProfiles()` - List all profiles
- `updateRateBreakProfile()` - Edit profile
- `deleteRateBreakProfile()` - Delete profile
- `calculatePriceWithRateBreaks()` - Apply breaks to price
- `getProductRateBreaks()` - Get product-specific breaks
- File: [src/utils/rateBreakProfileUtils.ts](src/utils/rateBreakProfileUtils.ts)

### 6. **UI Components** ✓
- `RateBreakProfileManager` - Full CRUD interface
- File: [src/components/RateBreakProfileManager.tsx](src/components/RateBreakProfileManager.tsx)

---

## 🧪 Testing Guide

### Step 1: Create Sample Rate Break Profiles

#### Option A: Using Admin UI (Easiest)
1. Go to Admin Dashboard → **Rate Break Profiles** tab
2. Click **"New Profile"** button
3. Create profiles:

**Profile 1: "Wholesale Partner"**
- Name: Wholesale Partner
- Description: Standard wholesale pricing for regular partners

**Profile 2: "VIP Partner"**
- Name: VIP Partner
- Description: Premium pricing for top-tier partners

**Profile 3: "Preferred Distributor"**
- Name: Preferred Distributor
- Description: Large volume distributor pricing

#### Option B: Using Sample Data Script
```javascript
// In browser console or create a test file:
import { seedSampleRateBreakProfiles } from './utils/sampleRateBreakData';
await seedSampleRateBreakProfiles("admin-user-id");
```

This creates 4 sample profiles with realistic pricing tiers.

### Step 2: Assign Profiles to Customers

1. Go to Admin Dashboard → **Customers** tab
2. Select a wholesale customer
3. Scroll to **"Rate Break Profile Assignment"** section
4. (Currently shows placeholder - need backend integration to save)

#### Manual Firebase Assignment (For Testing)
In Firestore Console:
```
Collection: users
Document: <customer-id>
Field: rateBreakProfileId = "rbp-wholesale"
```

### Step 3: Configure Product Breaks in Profiles

For now, rate break profiles are created with hardcoded product breaks. To add products:

1. Edit the profile in Rate Break Manager
2. Product breaks can be added programmatically

#### Example Profile Structure:
```json
{
  "id": "rbp-wholesale",
  "name": "Wholesale Partner",
  "description": "Standard wholesale pricing",
  "productBreaks": {
    "product-dmm-401": [
      { "minQty": 1, "discountType": "percentage", "discountValue": 0 },
      { "minQty": 10, "discountType": "percentage", "discountValue": 5 },
      { "minQty": 50, "discountType": "percentage", "discountValue": 12 }
    ],
    "product-scope-201": [
      { "minQty": 1, "discountType": "percentage", "discountValue": 0 },
      { "minQty": 20, "discountType": "percentage", "discountValue": 15 }
    ]
  },
  "createdAt": "2026-07-19T10:00:00Z",
  "updatedAt": "2026-07-19T10:00:00Z",
  "createdBy": "admin-user-123"
}
```

### Step 4: Test Price Calculations

1. **Login as a wholesale customer** with a rate break profile assigned
2. **Add items to cart** (different quantities)
3. **Verify pricing:**
   - ✓ Base price shown
   - ✓ Quantity breaks applied (if product quantity breaks exist)
   - ✓ Rate break profile breaks applied (if profile assigned)
   - ✓ Profile breaks take priority over product breaks

#### Example Test Cases:

**Scenario 1: Wholesale Partner ordering Digital Multimeter**
- Base Price: $100
- Qty 1: $100.00 (no discount)
- Qty 10: $95.00 (5% discount)
- Qty 25: $90.00 (10% discount)
- Qty 50: $88.00 (12% discount)

**Scenario 2: VIP Partner same product**
- Base Price: $100
- Qty 1: $95.00 (5% discount)
- Qty 10: $88.00 (12% discount)
- Qty 25: $82.00 (18% discount)
- Qty 50: $78.00 (22% discount)

**Scenario 3: Fixed Price Profile (Distributor)**
- Qty 1: $85.00 (fixed)
- Qty 50: $79.00 (fixed)
- Qty 100: $75.00 (fixed)

### Step 5: Test Order Placement

1. Add items to cart as approved customer with profile
2. Place order
3. Verify in Orders collection:
   ```
   items[].appliedDiscountPercent = correctly calculated
   items[].finalPricePerUnit = profile-based price
   subtotal = sum of all items with profile discounts
   ```

---

## 📋 Current Status & Next Steps

### ✅ Completed
- Rate Break Profile data model
- Firestore schema & security rules
- Admin UI for managing profiles
- Price calculation logic with profile priority
- Rate break profile selector in customer management

### 🔄 Partially Done
- Profile assignment in customer edit (UI shows placeholder, needs backend save)
- Product break configuration (needs UI for editing per-product breaks)

### ⚠️ Not Yet Implemented
- Backend API endpoint to save profile assignment
- Bulk edit UI for product breaks within profiles
- Profile usage analytics/dashboard
- Migration tools for existing quantity breaks → profiles

---

## 🔧 Backend Integration Checklist

To complete full integration:

- [ ] Add Firestore function to update `customers/{id}.rateBreakProfileId`
- [ ] Add Firestore function to update `rateBreakProfiles/{id}.productBreaks`
- [ ] Add API endpoint: `POST /admin/customers/:customerId/rateBreakProfile/:profileId`
- [ ] Add API endpoint: `PATCH /admin/rateBreakProfiles/:profileId/products`
- [ ] Add Firestore trigger to audit profile changes
- [ ] Add validation to prevent circular references

---

## 📊 Data Model Hierarchy

```
rateBreakProfiles/
├── rbp-wholesale (document)
│   ├── name: "Wholesale Partner"
│   ├── productBreaks: {
│   │   ├── "product-id-1": [QuantityBreak[], ...]
│   │   └── "product-id-2": [QuantityBreak[], ...]
│   └── createdBy: "admin-123"
│
└── rbp-vip (document)
    └── ...

users/
├── customer-123 (document)
│   ├── companyName: "Acme Corp"
│   ├── rateBreakProfileId: "rbp-wholesale"  ← References profile
│   └── customPricing: {...}  ← Optional override
│
└── customer-456 (document)
    └── ...

orders/
└── order-789 (document)
    ├── customerId: "customer-123"
    ├── items: [
    │   ├── productId: "product-id-1"
    │   ├── qty: 25
    │   ├── originalPrice: 100
    │   ├── appliedDiscountPercent: 10  ← From profile break
    │   └── finalPricePerUnit: 90
    │ ]
```

---

## 💡 Priority Hierarchy

When calculating final price, this is the priority order:

1. **Custom Pricing** (customer-specific override)
2. **Rate Break Profile** (quantity breaks from assigned profile)
3. **Product Quantity Breaks** (fallback to product defaults)
4. **Base Wholesale Price** (default)

```typescript
// Current implementation in CartView
if (customPricing) → use custom price
else if (rateBreakProfile) → apply profile breaks
else if (productQuantityBreaks) → apply product breaks
else → use basePrice
```

---

## 🐛 Troubleshooting

### Profiles not loading in customer profile selector
- Check Firestore rules allow read access
- Verify `rateBreakProfileId` field exists in customer doc
- Check browser console for Firestore errors

### Prices not applying from profile
- Verify profile is assigned to customer: `customer.rateBreakProfileId === profile.id`
- Check profile has product breaks: `profile.productBreaks["product-id"]` exists
- Verify quantity meets minimum: `item.qty >= break.minQty`

### Profile assignment not saving
- This is currently a placeholder UI pending backend integration
- To test, manually set in Firestore Console

---

## 📚 Related Files

- Type definitions: [src/types.ts](src/types.ts)
- Utilities: [src/utils/rateBreakProfileUtils.ts](src/utils/rateBreakProfileUtils.ts)
- Admin UI: [src/components/RateBreakProfileManager.tsx](src/components/RateBreakProfileManager.tsx)
- Admin Dashboard: [src/components/AdminDashboard.tsx](src/components/AdminDashboard.tsx)
- Cart: [src/components/CartView.tsx](src/components/CartView.tsx)
- Sample Data: [src/utils/sampleRateBreakData.ts](src/utils/sampleRateBreakData.ts)
- Schema: [firebase-blueprint.json](firebase-blueprint.json)
- Security: [firestore.rules](firestore.rules)

---

## 🎯 Success Criteria

Rate Break Profiles are working when:

1. ✓ Admin can create profiles in Rate Break Manager
2. ✓ Each profile shows in list with product count
3. ✓ Customer has profile selector in edit view
4. ✓ Cart applies profile's quantity breaks to prices
5. ✓ Order shows correct discounts from profile
6. ✓ Multiple customers can have different profiles
7. ✓ Updating profile affects future orders (not historical)
