# Rate Break Profiles - Implementation Guide

## Overview

Rate Break Profiles allow you to create reusable pricing templates that can be assigned to customers. This enables you to manage different quantity-based discount structures for different customer segments without duplicating data.

## Changes Made

### 1. **TypeScript Types** (`src/types.ts`)
- ✅ Added `RateBreakProfile` interface with:
  - `id`: Unique profile identifier
  - `name`: Human-readable name (e.g., "Wholesale Partner")
  - `description`: Optional description
  - `productBreaks`: Map of productId → QuantityBreak array
  - `createdAt`/`updatedAt`: Timestamps
  - `createdBy`: Admin user ID

- ✅ Updated `CustomerProfile` to include:
  - `rateBreakProfileId?: string`: Reference to assigned profile

### 2. **Firestore Schema** (`firebase-blueprint.json`)
- ✅ Added `RateBreakProfile` entity definition
- ✅ Added `/rateBreakProfiles/{profileId}` collection path

### 3. **Security Rules** (`firestore.rules`)
- ✅ Added rules for rate break profiles:
  - **Admins**: Full read/write access
  - **Approved Customers**: Can read their assigned profile only
  - **Everyone**: Cannot write (admin-only)

### 4. **Utility Functions** (`src/utils/rateBreakProfileUtils.ts`)
- `createRateBreakProfile()`: Create new profile
- `getRateBreakProfile()`: Fetch single profile
- `getAllRateBreakProfiles()`: List all profiles
- `updateRateBreakProfile()`: Update profile
- `deleteRateBreakProfile()`: Delete profile
- `calculatePriceWithRateBreaks()`: Apply quantity breaks to price
- `getProductRateBreaks()`: Get breaks for specific product

### 5. **Admin Component** (`src/components/RateBreakProfileManager.tsx`)
- Full UI for managing rate break profiles
- Create, read, update, delete profiles
- View products configured per profile

## Integration Steps

### Step 1: Import the Manager Component
In your `AdminDashboard.tsx`:

```tsx
import RateBreakProfileManager from './RateBreakProfileManager';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('orders');

  return (
    <div>
      {/* ... existing tabs ... */}
      {activeTab === 'rateBreaks' && <RateBreakProfileManager />}
    </div>
  );
};
```

### Step 2: Add Tab Navigation
Add a new tab to your admin dashboard for rate break management:

```tsx
<button
  onClick={() => setActiveTab('rateBreaks')}
  className={activeTab === 'rateBreaks' ? 'active-tab' : 'tab'}
>
  Rate Break Profiles
</button>
```

### Step 3: Update Price Calculation in Checkout/Cart
Use the utility functions when calculating line item prices:

```tsx
import { calculatePriceWithRateBreaks, getProductRateBreaks } from '../utils/rateBreakProfileUtils';

// In your price calculation logic:
const profile = await getRateBreakProfile(customer.rateBreakProfileId);
const productBreaks = getProductRateBreaks(profile, productId);
const finalPrice = calculatePriceWithRateBreaks(basePrice, quantity, productBreaks);
```

### Step 4: Assign Profiles to Customers
In the customer management UI, add a dropdown to assign rate break profiles:

```tsx
import { getAllRateBreakProfiles } from '../utils/rateBreakProfileUtils';

const profiles = await getAllRateBreakProfiles();

<select
  value={customer.rateBreakProfileId || ''}
  onChange={(e) => updateCustomer({ rateBreakProfileId: e.target.value })}
>
  <option value="">No Rate Break Profile</option>
  {profiles.map(p => (
    <option key={p.id} value={p.id}>{p.name}</option>
  ))}
</select>
```

## Data Model Example

### Structure in Firestore:
```
/rateBreakProfiles/
├── rbp-wholesale/
│   ├── name: "Wholesale Partner"
│   ├── description: "Standard wholesale pricing"
│   ├── productBreaks: {
│   │   "product-123": [
│   │     { minQty: 1, discountType: "percentage", discountValue: 0 },
│   │     { minQty: 10, discountType: "percentage", discountValue: 10 },
│   │     { minQty: 50, discountType: "percentage", discountValue: 15 }
│   │   ],
│   │   "product-456": [...]
│   │ }
│   ├── createdAt: "2024-07-19T10:00:00Z"
│   ├── updatedAt: "2024-07-19T10:00:00Z"
│   └── createdBy: "admin-user-123"
│
└── rbp-vip/
    ├── name: "VIP Partner"
    ├── description: "Premium wholesale pricing"
    └── ...
```

### Customer Assignment:
```
/users/customer-123/
{
  ...
  rateBreakProfileId: "rbp-wholesale",
  ...
}
```

## Workflow

1. **Admin creates Rate Break Profiles** in the new Rate Break Manager UI
2. **Admin assigns profiles to customers** via the customer management interface
3. **When a customer orders**, the system:
   - Looks up their assigned `rateBreakProfileId`
   - Retrieves the `RateBreakProfile`
   - Applies the product-specific quantity breaks from that profile
   - Calculates final pricing based on order quantity
4. **Result**: Different customers can have different rates for the same products based on their assigned profile

## Benefits

- ✅ **No Data Duplication**: Reuse same profile across multiple customers
- ✅ **Easy Bulk Updates**: Update rates for all customers using a profile at once
- ✅ **Scalable**: Supports hundreds of customers and products
- ✅ **Flexible**: Admins can create unlimited profiles
- ✅ **Secure**: Customers can only see/use their assigned profile

## Next Steps

1. Add the Rate Break Manager tab to your AdminDashboard
2. Add customer profile assignment in the customer edit view
3. Integrate price calculation in your checkout/cart logic
4. Test with sample profiles and customers
5. Deploy and update customers with their profile assignments
