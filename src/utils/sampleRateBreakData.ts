import {
  createRateBreakProfile,
  getRateBreakProfile,
  getAllRateBreakProfiles,
  updateRateBreakProfile,
} from "./rateBreakProfileUtils";

/**
 * Sample Rate Break Profile Data
 * This file demonstrates how to create and test rate break profiles
 * 
 * Run this via Firebase Functions or admin script to seed test data
 */

export async function seedSampleRateBreakProfiles(userId: string = "admin") {
  console.log("Creating sample rate break profiles...");

  try {
    // Profile 1: Wholesale Partner
    const wholesaleProfileId = await createRateBreakProfile(
      {
        name: "Wholesale Partner",
        description: "Standard wholesale pricing for regular partners",
        productBreaks: {
          // These product IDs should match your actual product IDs
          "product-dmm-401": [
            { minQty: 1, discountType: "percentage", discountValue: 0 },
            { minQty: 10, discountType: "percentage", discountValue: 5 },
            { minQty: 25, discountType: "percentage", discountValue: 10 },
            { minQty: 50, discountType: "percentage", discountValue: 12 },
          ],
          "product-scope-201": [
            { minQty: 1, discountType: "percentage", discountValue: 0 },
            { minQty: 5, discountType: "percentage", discountValue: 8 },
            { minQty: 20, discountType: "percentage", discountValue: 15 },
          ],
        },
      },
      userId
    );
    console.log("✅ Created 'Wholesale Partner' profile:", wholesaleProfileId);

    // Profile 2: VIP Partner
    const vipProfileId = await createRateBreakProfile(
      {
        name: "VIP Partner",
        description: "Premium pricing for top-tier partners",
        productBreaks: {
          "product-dmm-401": [
            { minQty: 1, discountType: "percentage", discountValue: 5 },
            { minQty: 10, discountType: "percentage", discountValue: 12 },
            { minQty: 25, discountType: "percentage", discountValue: 18 },
            { minQty: 50, discountType: "percentage", discountValue: 22 },
          ],
          "product-scope-201": [
            { minQty: 1, discountType: "percentage", discountValue: 10 },
            { minQty: 5, discountType: "percentage", discountValue: 18 },
            { minQty: 20, discountType: "percentage", discountValue: 25 },
          ],
        },
      },
      userId
    );
    console.log("✅ Created 'VIP Partner' profile:", vipProfileId);

    // Profile 3: Preferred Distributor
    const distributorProfileId = await createRateBreakProfile(
      {
        name: "Preferred Distributor",
        description: "Special pricing for large distributors with fixed prices",
        productBreaks: {
          "product-dmm-401": [
            { minQty: 1, discountType: "fixed", discountValue: 85 },
            { minQty: 50, discountType: "fixed", discountValue: 79 },
            { minQty: 100, discountType: "fixed", discountValue: 75 },
          ],
          "product-scope-201": [
            { minQty: 1, discountType: "fixed", discountValue: 450 },
            { minQty: 20, discountType: "fixed", discountValue: 420 },
          ],
        },
      },
      userId
    );
    console.log("✅ Created 'Preferred Distributor' profile:", distributorProfileId);

    // Profile 4: Reseller
    const resellerProfileId = await createRateBreakProfile(
      {
        name: "Reseller",
        description: "Flexible pricing for resellers",
        productBreaks: {
          "product-dmm-401": [
            { minQty: 1, discountType: "percentage", discountValue: 0 },
            { minQty: 5, discountType: "percentage", discountValue: 3 },
            { minQty: 15, discountType: "percentage", discountValue: 6 },
          ],
          "product-scope-201": [
            { minQty: 1, discountType: "percentage", discountValue: 2 },
            { minQty: 10, discountType: "percentage", discountValue: 8 },
          ],
        },
      },
      userId
    );
    console.log("✅ Created 'Reseller' profile:", resellerProfileId);

    // Fetch and display all profiles
    const allProfiles = await getAllRateBreakProfiles();
    console.log("\n📊 All Rate Break Profiles:");
    allProfiles.forEach((profile) => {
      console.log(`\n  ${profile.name} (${profile.id})`);
      console.log(`    Description: ${profile.description}`);
      console.log(
        `    Products: ${Object.keys(profile.productBreaks).length}`
      );
    });

    return {
      wholesaleProfileId,
      vipProfileId,
      distributorProfileId,
      resellerProfileId,
    };
  } catch (error) {
    console.error("❌ Error seeding rate break profiles:", error);
    throw error;
  }
}

/**
 * Example usage with calculated prices
 */
export async function examplePriceCalculations() {
  console.log("\n📈 Price Calculation Examples:\n");

  const allProfiles = await getAllRateBreakProfiles();

  // Example: Wholesale Partner pricing
  const wholesaleProfile = allProfiles.find(
    (p) => p.name === "Wholesale Partner"
  );
  if (wholesaleProfile) {
    const dmm401Breaks = wholesaleProfile.productBreaks["product-dmm-401"];
    const basePrice = 100;

    console.log("Wholesale Partner - Digital Multimeter (Base: $100):");
    console.log("  Qty 1: $" + (basePrice * (1 - 0 / 100)).toFixed(2));
    console.log("  Qty 10: $" + (basePrice * (1 - 5 / 100)).toFixed(2));
    console.log("  Qty 25: $" + (basePrice * (1 - 10 / 100)).toFixed(2));
    console.log("  Qty 50: $" + (basePrice * (1 - 12 / 100)).toFixed(2));
  }

  // Example: VIP Partner pricing
  const vipProfile = allProfiles.find((p) => p.name === "VIP Partner");
  if (vipProfile) {
    const dmm401Breaks = vipProfile.productBreaks["product-dmm-401"];
    const basePrice = 100;

    console.log("\nVIP Partner - Digital Multimeter (Base: $100):");
    console.log("  Qty 1: $" + (basePrice * (1 - 5 / 100)).toFixed(2));
    console.log("  Qty 10: $" + (basePrice * (1 - 12 / 100)).toFixed(2));
    console.log("  Qty 25: $" + (basePrice * (1 - 18 / 100)).toFixed(2));
    console.log("  Qty 50: $" + (basePrice * (1 - 22 / 100)).toFixed(2));
  }

  // Example: Preferred Distributor (fixed pricing)
  const distributorProfile = allProfiles.find(
    (p) => p.name === "Preferred Distributor"
  );
  if (distributorProfile) {
    console.log("\nPreferred Distributor - Digital Multimeter (Fixed Prices):");
    console.log("  Qty 1: $85.00");
    console.log("  Qty 50: $79.00");
    console.log("  Qty 100: $75.00");
  }
}

/**
 * Instructions for manual testing:
 *
 * 1. In Firebase Console, go to Firestore
 * 2. Create a new document in /rateBreakProfiles collection
 * 3. Use the sample data structure above
 * 4. Assign a profile ID to a customer via CustomProfile.rateBreakProfileId
 * 5. Add that customer's items to cart
 * 6. Verify prices are calculated using the profile's quantity breaks
 *
 * Or run this script:
 * ```
 * import { seedSampleRateBreakProfiles, examplePriceCalculations } from './sampleRateBreakData';
 * await seedSampleRateBreakProfiles();
 * await examplePriceCalculations();
 * ```
 */
