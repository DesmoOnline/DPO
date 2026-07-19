# Weight Break Templates - Implementation Guide

## Overview

Weight Break Templates allow you to create **up to 10 quantity-based pricing tiers** that can be **assigned to specific customers for specific products**. Multiple weight breaks can be assigned to a single customer/product combination, and the **best price wins**.

## Data Structure

### WeightBreakTemplate (New Collection)
```
/weightBreakTemplates/
├── wbt-1/
│   ├── name: "Tier 1 - Starter"
│   ├── description: "Small volume orders"
│   ├── quantityBreaks: [
│   │   { minQty: 1, discountType: "percentage", discountValue: 0 },
│   │   { minQty: 10, discountType: "percentage", discountValue: 5 },
│   │   { minQty: 50, discountType: "percentage", discountValue: 10 }
│   │ ]
│   ├── createdAt: "2026-07-19T10:00:00Z"
│   ├── updatedAt: "2026-07-19T10:00:00Z"
│   └── createdBy: "admin-123"
│
├── wbt-2/ (Professional tier)
├── wbt-3/ (Enterprise tier)
└── ... (up to 10 total)
```

### CustomerProfile (Updated)
```
/users/customer-123/
{
  ...
  weightBreakAssignments: {
    "product-id-1": ["wbt-1", "wbt-3"],  // Multiple tiers for this product
    "product-id-2": ["wbt-2"],
    "product-id-5": ["wbt-1"]
  }
}
```

## Price Calculation Priority

When calculating final price, the system uses this priority order:

1. **Custom Pricing** (customer-specific flat price override)
2. **Weight Breaks** (if assigned to this customer for this product)
3. **Rate Break Profile** (if assigned to this customer globally)
4. **Product Quantity Breaks** (product default breaks)
5. **Base Wholesale Price**

### Example Scenario

Customer "Acme Corp" assigned to weight break templates:
- Product A: wbt-1 (Tier 1) AND wbt-2 (Tier 2)
- Product B: wbt-3 (Enterprise) only

**Order: 25 units of Product A**
- Tier 1 at qty 25: $95 per unit
- Tier 2 at qty 25: $88 per unit ← **Best price wins** ($88)
- Final price: $88 × 25 = $2,200

## Files Modified/Created

### New Files
- [src/utils/weightBreakUtils.ts](src/utils/weightBreakUtils.ts) - Utility functions
- [src/components/WeightBreakManager.tsx](src/components/WeightBreakManager.tsx) - UI for CRUD
- [src/utils/sampleWeightBreakData.ts](src/utils/sampleWeightBreakData.ts) - Sample data

### Modified Files
- [src/types.ts](src/types.ts) - Added WeightBreakTemplate interface, updated CustomerProfile
- [src/components/AdminDashboard.tsx](src/components/AdminDashboard.tsx) - Added Weight Breaks tab, customer assignment UI
- [src/components/CartView.tsx](src/components/CartView.tsx) - Integrated weight break price calculations
- [firebase-blueprint.json](firebase-blueprint.json) - Added schema and collection path
- [firestore.rules](firestore.rules) - Added security rules

## Implementation Details

### 1. Create Weight Break Templates

**In Admin Dashboard** → **Weight Breaks** tab:
1. Click **"New Template"** (max 10)
2. Enter template name: "Tier 1 - Starter"
3. Add quantity breaks:
   - Qty 1+: 0% discount
   - Qty 10+: 5% discount
   - Qty 50+: 10% discount
4. Save template

### 2. Assign Weight Breaks to Customers

**In Admin Dashboard** → **Customers** tab → Select customer → **"Weight Break Assignments"**:

For each product:
- Show 10 tier buttons (1-10)
- Customer has 3 assigned: buttons highlighted in blue
- Click to toggle on/off
- Multiple tiers can be assigned per product
- Best price wins when calculating

### 3. Price Calculation in Checkout

In CartView, for each item:
```
1. Get customer's weight break assignments for this product
2. If assigned, load those weight break templates
3. Apply each template to the quantity
4. Pick the lowest price
5. If no weight breaks assigned, fall back to rate profile → product breaks
```

### 4. Order Processing

When order is placed:
- Order records the final price (which was calculated with weight breaks)
- Invoice/Packing slip shows applied discount
- No need to recalculate at fulfillment time

## API Functions

### weightBreakUtils.ts

```typescript
// Create new template (max 10)
createWeightBreakTemplate(
  templateData: { name, description, quantityBreaks },
  userId: string
): Promise<string>

// Get all templates
getAllWeightBreakTemplates(): Promise<WeightBreakTemplate[]>

// Get single template
getWeightBreakTemplate(templateId: string): Promise<WeightBreakTemplate | null>

// Update template
updateWeightBreakTemplate(
  templateId: string,
  updates: Partial<WeightBreakTemplate>
): Promise<void>

// Delete template
deleteWeightBreakTemplate(templateId: string): Promise<void>

// Load customer's weight breaks for a product
getCustomerWeightBreaksForProduct(
  templateIds: string[],
  productId: string
): Promise<WeightBreakTemplate[]>

// Calculate price with weight breaks (uses best price)
calculatePriceWithWeightBreaks(
  basePrice: number,
  quantity: number,
  weightTemplates: WeightBreakTemplate[]
): { finalPrice, appliedTemplate, discountPercent }
```

## Usage Examples

### Example 1: Create 3 Weight Break Tiers

```javascript
// Tier 1: Starter pricing
const tier1 = await createWeightBreakTemplate({
  name: "Tier 1 - Starter",
  description: "Standard wholesale",
  quantityBreaks: [
    { minQty: 1, discountType: "percentage", discountValue: 0 },
    { minQty: 10, discountType: "percentage", discountValue: 5 },
    { minQty: 50, discountType: "percentage", discountValue: 10 },
  ]
}, "admin");

// Tier 2: Professional pricing
const tier2 = await createWeightBreakTemplate({
  name: "Tier 2 - Professional",
  description: "Mid-volume partner",
  quantityBreaks: [
    { minQty: 1, discountType: "percentage", discountValue: 2 },
    { minQty: 10, discountType: "percentage", discountValue: 10 },
    { minQty: 50, discountType: "percentage", discountValue: 15 },
  ]
}, "admin");

// Tier 3: Enterprise pricing
const tier3 = await createWeightBreakTemplate({
  name: "Tier 3 - Enterprise",
  description: "High-volume distributor",
  quantityBreaks: [
    { minQty: 1, discountType: "fixed", discountValue: 85 },
    { minQty: 50, discountType: "fixed", discountValue: 80 },
  ]
}, "admin");
```

### Example 2: Assign Multiple Tiers to Customer

```javascript
// Customer "Acme Corp" gets Tier 1 and Tier 2 for Product A
// (best price wins when ordering)
customer.weightBreakAssignments = {
  "product-dmm-401": [tier1, tier2],  // Can choose between two
  "product-scope-201": [tier3]         // Only Enterprise tier
}
```

### Example 3: Price Calculation

```javascript
// Base price: $100
// Customer assigned to tier1 and tier2
// Ordering 25 units

// Tier 1 at qty 25: 10% off = $90
// Tier 2 at qty 25: 15% off = $85 ← Best price!

// Result: finalPrice = $85, appliedTemplate = tier2, discount = 15%
```

## Testing

### Manual Testing Steps

1. **Create weight break templates**:
   - Go to Admin Dashboard → Weight Breaks tab
   - Create templates with varied discounts
   - Verify they appear in list (max 10)

2. **Assign to customers**:
   - Go to Customers tab
   - Select an approved customer
   - In "Weight Break Assignments" section
   - Assign tier 1 and tier 2 to a product
   - (Note: Backend integration needed to persist)

3. **Test pricing in cart**:
   - Login as customer with weight breaks assigned
   - Add items with quantities
   - Verify cart shows best price from assigned tiers
   - Verify discount % shows correctly

4. **Test priority order**:
   - Customer with weight breaks + rate profile + product breaks
   - Verify weight break price is used (highest priority)

### Test Scenarios

| Scenario | Setup | Expected Result |
|----------|-------|-----------------|
| Single tier assigned | Customer A → Tier 1 for Product X | Uses Tier 1 pricing |
| Multiple tiers assigned | Customer A → Tier 1 + Tier 2 for Product X | Best price from both |
| No tiers assigned | Customer A → no assignment | Uses rate profile or product breaks |
| Fixed price tier | Tier 3 = fixed $85 | Uses $85 regardless of quantity |
| Mixed tiers | Tier 1 (%) + Tier 2 (fixed) | Best price wins |

## Security

- **Admins only** can create/update/delete weight break templates
- **Approved customers** can read templates (to see options)
- **Firestore Rules** enforce these permissions
- Weight break assignments stored in customer doc (encrypted in Firestore)

## Limitations & Notes

- **Max 10 templates** per system (design limitation)
- Each customer can have multiple tiers per product
- No UI yet for "best price" visualization during assignment
- Assignment currently shows 10 tier buttons (placeholders until backend wires it up)
- Backend API needed to persist weight break assignments to Firestore

## Next Steps for Backend Integration

1. Add Firestore function to save `weightBreakAssignments` to customer doc
2. Add API endpoint: `PATCH /admin/customers/:customerId/products/:productId/weightBreaks`
3. Add validation to prevent assigning >10 tiers (or same tier twice)
4. Add audit logging for weight break changes
5. Add migration tool if converting existing discount structure

## Priority Recap

```
Original Price
    ↓
Custom Pricing Override? → Use custom price
    ↓ NO
Weight Breaks Assigned? → Calculate with all assigned tiers, use best price
    ↓ NO
Rate Break Profile? → Use profile's product breaks
    ↓ NO
Product Quantity Breaks? → Use product default breaks
    ↓ NO
Base Wholesale Price ← Use this
```
