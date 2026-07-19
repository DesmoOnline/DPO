# Firebase Security Rules Specification

This specification defines the security invariants and threat model for the Desmo Products Wholesale Portal database.

## 1. Data Invariants

1. **Owner Exclusivity on Writes**: A wholesale user can only update or submit their own profile and order data. They cannot write to another customer's files.
2. **Admin Supremacy (Bootstrap Mode)**: The user `lew@desmoproducts.com.au` is designated as the primary administrator. Admins can read and write all documents across collections.
3. **No Self-Approvals**: Registered customers cannot approve themselves. Their status must start as `"pending"` and can only be set to `"approved"` or `"rejected"` by an administrator.
4. **Timestamps & Integrity**: Fields like `createdAt` are immutable after document creation.
5. **No Pricing Leak to Unapproved Users**: Standard or guest users who are not approved see list of products but do not receive custom pricing sheets or order pricing models.

## 2. The "Dirty Dozen" Threat Payloads

Here are 12 specific payloads attempting to violate system rules:

1. **Self-Approval Exploit**: Client attempts to create a user document with `"status": "approved"`. (Denied)
2. **Price Modification Exploit**: Client attempts to write a custom price in their own profile. (Denied)
3. **Impersonation Attack**: User A attempts to write a profile using User B's auth ID. (Denied)
4. **Order Total Hijack**: Client attempts to send an order with `totalAmount: 1.00` for 100 items. (Blocked by schema matching or backend checks)
5. **Illegal Product Listing**: Registered customer attempts to add a new product to `/products`. (Denied)
6. **Restricted Product Access**: Customer A attempts to view `/products/{productId}` where `isRestricted = true` and Customer A is not in `allowedProducts`. (Denied)
7. **Bypassing Price Breaks**: Client attempts to submit order ignoring quantity breaks. (Database records orders, but edit permissions on order pricing are denied)
8. **Admin Role Promotion**: User attempts to create a document in `/admins` to grant themselves admin privileges. (Denied)
9. **Spam Order Bombing**: Client attempts to submit orders with malicious strings as ID. (ID length checks block this)
10. **GST Tax Tampering**: Client attempts to write an order where GST != 10% of subtotal. (Denied or logged)
11. **Order State Modification**: Customer attempts to mark their order as `"paid"` or `"shipped"`. (Denied, only Admins can set terminal statuses like shipped or paid)
12. **Double Register Attack**: Attempting to alter `createdAt` field on a profile update. (Denied)

## 3. Test Runner Design

Below is the design of the rule check test cases. Our final `firestore.rules` will address these constraints.
